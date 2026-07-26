export const PILOT_SCHEMA_VERSION = 8;

function hasColumn(database, table, column) {
  return database.prepare(`PRAGMA table_info(${table})`).all().some((item) => item.name === column);
}

function addColumn(database, table, definition) {
  const column = definition.trim().split(/\s+/)[0];
  if (!hasColumn(database, table, column)) database.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
}

export function applyPilotSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    ) STRICT;
  `);
  const applied = database.prepare("SELECT 1 FROM schema_migrations WHERE version = ?").get(PILOT_SCHEMA_VERSION);
  if (applied) return PILOT_SCHEMA_VERSION;

  database.transaction(() => {
    addColumn(database, "campus_opportunities", "workflow_status TEXT NOT NULL DEFAULT 'published'");
    addColumn(database, "campus_opportunities", "organization_id TEXT NOT NULL DEFAULT 'ynu'");
    addColumn(database, "campus_opportunities", "organization_name TEXT NOT NULL DEFAULT '云南大学'");
    addColumn(database, "campus_opportunities", "location TEXT NOT NULL DEFAULT ''");
    addColumn(database, "campus_opportunities", "delivery_mode TEXT NOT NULL DEFAULT 'offline'");
    addColumn(database, "campus_opportunities", "capacity INTEGER");
    addColumn(database, "campus_opportunities", "evidence_requirement TEXT NOT NULL DEFAULT ''");
    addColumn(database, "campus_opportunities", "ability_dimensions_json TEXT NOT NULL DEFAULT '[]'");
    addColumn(database, "campus_opportunities", "review_note TEXT NOT NULL DEFAULT ''");
    database.exec(`
      UPDATE campus_opportunities
      SET workflow_status = CASE status WHEN 'closed' THEN 'closed' ELSE 'published' END
      WHERE workflow_status = '' OR workflow_status = 'published';
    `);

    addColumn(database, "opportunity_participations", "workflow_status TEXT NOT NULL DEFAULT 'saved'");
    addColumn(database, "opportunity_participations", "evidence_url TEXT NOT NULL DEFAULT ''");
    addColumn(database, "opportunity_participations", "reflection TEXT NOT NULL DEFAULT ''");
    addColumn(database, "opportunity_participations", "reviewer_feedback TEXT NOT NULL DEFAULT ''");
    database.exec(`
      UPDATE opportunity_participations
      SET workflow_status = CASE status WHEN 'completed' THEN 'verified' WHEN 'applied' THEN 'applied' ELSE 'saved' END
      WHERE workflow_status = '' OR workflow_status = 'saved';
    `);

    database.exec(`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        created_at TEXT NOT NULL
      ) STRICT;
      INSERT OR IGNORE INTO organizations (id, name, parent_id, created_at)
      VALUES ('ynu', '云南大学', NULL, datetime('now'));

      CREATE TABLE IF NOT EXISTS organization_memberships (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('student', 'publisher', 'reviewer', 'career_admin')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, organization_id, role)
      ) STRICT;
      CREATE INDEX IF NOT EXISTS memberships_user_idx ON organization_memberships(user_id);

      CREATE TABLE IF NOT EXISTS ability_profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        self_ratings_json TEXT NOT NULL,
        legacy_needs_review INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE IF NOT EXISTS action_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        detail TEXT NOT NULL,
        category TEXT NOT NULL,
        lane TEXT NOT NULL,
        source TEXT NOT NULL,
        source_id TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'planned',
        due_date TEXT NOT NULL DEFAULT '',
        reflection TEXT NOT NULL DEFAULT '',
        trace_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, source, source_id)
      ) STRICT;
      CREATE INDEX IF NOT EXISTS action_items_user_status_idx ON action_items(user_id, status, due_date);

      CREATE TABLE IF NOT EXISTS evidence_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action_item_id TEXT NOT NULL DEFAULT '',
        opportunity_id TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        evidence_url TEXT NOT NULL DEFAULT '',
        reflection TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL CHECK(status IN ('submitted', 'changes_requested', 'verified')),
        rubric_json TEXT NOT NULL DEFAULT '{}',
        reviewer_feedback TEXT NOT NULL DEFAULT '',
        anonymous_code TEXT NOT NULL,
        submitted_at TEXT NOT NULL,
        reviewed_at TEXT NOT NULL DEFAULT '',
        reviewed_by TEXT NOT NULL DEFAULT ''
      ) STRICT;
      CREATE INDEX IF NOT EXISTS evidence_user_status_idx ON evidence_records(user_id, status);
      CREATE INDEX IF NOT EXISTS evidence_review_queue_idx ON evidence_records(status, submitted_at);

      CREATE TABLE IF NOT EXISTS opportunity_reviews (
        opportunity_id TEXT PRIMARY KEY REFERENCES campus_opportunities(id) ON DELETE CASCADE,
        submitted_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        reviewed_by TEXT NOT NULL DEFAULT '',
        decision TEXT NOT NULL DEFAULT 'pending',
        note TEXT NOT NULL DEFAULT '',
        submitted_at TEXT NOT NULL,
        reviewed_at TEXT NOT NULL DEFAULT ''
      ) STRICT;

      CREATE TABLE IF NOT EXISTS participation_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        opportunity_id TEXT NOT NULL REFERENCES campus_opportunities(id) ON DELETE CASCADE,
        from_status TEXT NOT NULL,
        to_status TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS participation_events_opportunity_idx ON participation_events(opportunity_id, to_status);

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        dedupe_key TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        href TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        UNIQUE(user_id, dedupe_key)
      ) STRICT;
      CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, is_read, created_at);

      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        actor_id TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS audit_events_entity_idx ON audit_events(entity_type, entity_id, created_at);
    `);
    addColumn(database, "action_items", "trace_json TEXT NOT NULL DEFAULT '{}'");

    database.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)").run(
      PILOT_SCHEMA_VERSION,
      "school_pilot_workflow",
      new Date().toISOString(),
    );
  })();
  return PILOT_SCHEMA_VERSION;
}
