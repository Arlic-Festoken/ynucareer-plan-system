import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { applyPilotSchema, PILOT_SCHEMA_VERSION } from "./pilot-schema.mjs";

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role === "teacher" ? "teacher" : "student",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function stringArray(value) {
  const parsed = safeJson(value);
  return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
}

function publicOpportunity(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    type: row.type,
    provider: row.provider,
    organizationId: row.organization_id || "ynu",
    organizationName: row.organization_name || "云南大学",
    sourceUrl: row.source_url,
    applicationUrl: row.application_url,
    deadline: row.deadline,
    location: row.location || "",
    deliveryMode: row.delivery_mode || "offline",
    capacity: Number.isFinite(row.capacity) ? row.capacity : null,
    evidenceRequirement: row.evidence_requirement || "",
    abilityDimensions: stringArray(row.ability_dimensions_json),
    eligibility: {
      stages: stringArray(row.stages_json),
      pathways: stringArray(row.pathways_json),
      majors: stringArray(row.majors_json),
    },
    tags: stringArray(row.tags_json),
    status: row.workflow_status || (row.status === "closed" ? "closed" : "published"),
    reviewNote: row.review_note || "",
    createdBy: row.created_by || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createDatabase(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const existingDatabase = path !== ":memory:" && existsSync(path) && statSync(path).size > 0;
  const database = new Database(path, { timeout: 5000 });
  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");
  const hasMigrationTable = Boolean(database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'").get());
  const currentSchemaVersion = hasMigrationTable
    ? Number(database.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations").get().version)
    : 0;
  if (existingDatabase && currentSchemaVersion < PILOT_SCHEMA_VERSION) {
    const backupPath = `${path}.pre-schema-${PILOT_SCHEMA_VERSION}.bak`;
    if (!existsSync(backupPath)) {
      database.pragma("wal_checkpoint(FULL)");
      database.prepare("VACUUM INTO ?").run(backupPath);
    }
    const backup = new Database(backupPath, { readonly: true });
    const integrity = backup.pragma("integrity_check", { simple: true });
    backup.close();
    if (integrity !== "ok") {
      database.close();
      throw new Error("database_backup_verification_failed");
    }
  }
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student', 'teacher')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      university TEXT NOT NULL DEFAULT '',
      college TEXT NOT NULL DEFAULT '',
      major TEXT NOT NULL DEFAULT '',
      grade INTEGER NOT NULL DEFAULT 1,
      bio TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS career_states (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS campus_opportunities (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('course', 'project', 'competition', 'internship', 'consultation', 'research', 'event')),
      provider TEXT NOT NULL,
      source_url TEXT NOT NULL,
      application_url TEXT NOT NULL DEFAULT '',
      deadline TEXT NOT NULL DEFAULT '',
      stages_json TEXT NOT NULL DEFAULT '[]',
      pathways_json TEXT NOT NULL DEFAULT '[]',
      majors_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed')),
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS campus_opportunities_status_idx ON campus_opportunities(status, deadline);
    CREATE TABLE IF NOT EXISTS opportunity_participations (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      opportunity_id TEXT NOT NULL REFERENCES campus_opportunities(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('saved', 'applied', 'completed')),
      evidence_note TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, opportunity_id)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS opportunity_participations_opportunity_idx ON opportunity_participations(opportunity_id, status);
  `);
  const schemaVersion = applyPilotSchema(database);
  const userColumns = database.prepare("PRAGMA table_info(users)").all();
  if (!userColumns.some((column) => column.name === "role")) {
    database.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student', 'teacher'))");
  }

  const statements = {
    insertUser: database.prepare("INSERT INTO users (id, email, password_hash, display_name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"),
    userByEmail: database.prepare("SELECT * FROM users WHERE email = ?"),
    userById: database.prepare("SELECT * FROM users WHERE id = ?"),
    setUserRole: database.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?"),
    insertSession: database.prepare("INSERT OR REPLACE INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"),
    sessionUser: database.prepare("SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?"),
    deleteSession: database.prepare("DELETE FROM sessions WHERE token_hash = ?"),
    upsertProfile: database.prepare(`
      INSERT INTO user_profiles (user_id, university, college, major, grade, bio, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        university = excluded.university,
        college = excluded.college,
        major = excluded.major,
        grade = excluded.grade,
        bio = excluded.bio,
        updated_at = excluded.updated_at
    `),
    profileByUser: database.prepare("SELECT university, college, major, grade, bio, updated_at FROM user_profiles WHERE user_id = ?"),
    saveState: database.prepare(`
      INSERT INTO career_states (user_id, data_json, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
    `),
    stateByUser: database.prepare("SELECT data_json, updated_at FROM career_states WHERE user_id = ?"),
    insertOpportunity: database.prepare(`
      INSERT INTO campus_opportunities (id, title, summary, type, provider, source_url, application_url, deadline, stages_json, pathways_json, majors_json, tags_json, status, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    opportunities: database.prepare("SELECT * FROM campus_opportunities ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, CASE WHEN deadline = '' THEN 1 ELSE 0 END, deadline ASC, created_at DESC"),
    opportunityById: database.prepare("SELECT * FROM campus_opportunities WHERE id = ?"),
    setOpportunityStatus: database.prepare("UPDATE campus_opportunities SET status = ?, workflow_status = ?, updated_at = ? WHERE id = ?"),
    participationByUser: database.prepare("SELECT opportunity_id, workflow_status AS status, evidence_note, evidence_url, reflection, reviewer_feedback, updated_at FROM opportunity_participations WHERE user_id = ?"),
    participation: database.prepare("SELECT user_id, opportunity_id, workflow_status AS status, evidence_note, evidence_url, reflection, reviewer_feedback, updated_at FROM opportunity_participations WHERE user_id = ? AND opportunity_id = ?"),
    upsertParticipation: database.prepare(`
      INSERT INTO opportunity_participations (user_id, opportunity_id, status, workflow_status, evidence_note, evidence_url, reflection, reviewer_feedback, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, opportunity_id) DO UPDATE SET
        status = excluded.status,
        workflow_status = excluded.workflow_status,
        evidence_note = excluded.evidence_note,
        evidence_url = excluded.evidence_url,
        reflection = excluded.reflection,
        reviewer_feedback = excluded.reviewer_feedback,
        updated_at = excluded.updated_at
    `),
    opportunityStats: database.prepare(`
      SELECT opportunity_id,
        COUNT(*) AS saved_count,
        SUM(CASE WHEN workflow_status IN ('applied', 'in_progress', 'submitted', 'changes_requested', 'verified') THEN 1 ELSE 0 END) AS applied_count,
        SUM(CASE WHEN workflow_status IN ('submitted', 'changes_requested', 'verified') THEN 1 ELSE 0 END) AS submitted_count,
        SUM(CASE WHEN workflow_status = 'verified' THEN 1 ELSE 0 END) AS verified_count
      FROM opportunity_participations GROUP BY opportunity_id
    `),
  };

  return {
    sql: database,
    schemaVersion,
    createUser({ id, email, passwordHash, displayName, role = "student", createdAt }) {
      try {
        statements.insertUser.run(id, email, passwordHash, displayName, role === "teacher" ? "teacher" : "student", createdAt, createdAt);
      } catch (error) {
        if (String(error?.message).includes("UNIQUE constraint failed: users.email")) throw new Error("email_exists");
        throw error;
      }
      return publicUser(statements.userById.get(id));
    },
    findUserByEmail(email) {
      const row = statements.userByEmail.get(email);
      return row ? { ...publicUser(row), passwordHash: row.password_hash } : null;
    },
    updateUserRole(userId, role, updatedAt) {
      statements.setUserRole.run(role === "teacher" ? "teacher" : "student", updatedAt, userId);
      return publicUser(statements.userById.get(userId));
    },
    createSession({ tokenHash, userId, createdAt, expiresAt }) {
      statements.insertSession.run(tokenHash, userId, createdAt, expiresAt);
    },
    findSessionUser(tokenHash, now) {
      return publicUser(statements.sessionUser.get(tokenHash, now));
    },
    deleteSession(tokenHash) {
      statements.deleteSession.run(tokenHash);
    },
    upsertProfile(userId, profile, updatedAt) {
      statements.upsertProfile.run(userId, profile.university ?? "", profile.college ?? "", profile.major ?? "", profile.grade ?? 1, profile.bio ?? "", updatedAt);
      return this.getProfile(userId);
    },
    getProfile(userId) {
      const row = statements.profileByUser.get(userId);
      return row ? {
        university: row.university,
        college: row.college,
        major: row.major,
        grade: row.grade,
        bio: row.bio,
        updatedAt: row.updated_at,
      } : null;
    },
    saveCareerState(userId, state, updatedAt) {
      statements.saveState.run(userId, JSON.stringify(state), updatedAt);
    },
    getCareerState(userId) {
      const row = statements.stateByUser.get(userId);
      return row ? safeJson(row.data_json) : null;
    },
    createOpportunity(opportunity) {
      statements.insertOpportunity.run(
        opportunity.id,
        opportunity.title,
        opportunity.summary,
        opportunity.type,
        opportunity.provider,
        opportunity.sourceUrl,
        opportunity.applicationUrl,
        opportunity.deadline,
        JSON.stringify(opportunity.eligibility.stages),
        JSON.stringify(opportunity.eligibility.pathways),
        JSON.stringify(opportunity.eligibility.majors),
        JSON.stringify(opportunity.tags),
        opportunity.status,
        opportunity.createdBy,
        opportunity.createdAt,
        opportunity.updatedAt,
      );
      return publicOpportunity(statements.opportunityById.get(opportunity.id));
    },
    listOpportunities() {
      return statements.opportunities.all().map(publicOpportunity);
    },
    getOpportunity(id) {
      return publicOpportunity(statements.opportunityById.get(id));
    },
    updateOpportunityStatus(id, status, updatedAt) {
      const workflowStatus = ["draft", "pending_review", "published", "closed", "archived"].includes(status) ? status : "published";
      const legacyStatus = ["closed", "archived"].includes(workflowStatus) ? "closed" : "open";
      statements.setOpportunityStatus.run(legacyStatus, workflowStatus, updatedAt, id);
      return publicOpportunity(statements.opportunityById.get(id));
    },
    getParticipationsForUser(userId) {
      return statements.participationByUser.all(userId).map((row) => ({
        opportunityId: row.opportunity_id,
        status: row.status,
        evidenceNote: row.evidence_note,
        evidenceUrl: row.evidence_url,
        reflection: row.reflection,
        reviewerFeedback: row.reviewer_feedback,
        updatedAt: row.updated_at,
      }));
    },
    getParticipation(userId, opportunityId) {
      const row = statements.participation.get(userId, opportunityId);
      return row ? {
        opportunityId: row.opportunity_id,
        status: row.status,
        evidenceNote: row.evidence_note,
        evidenceUrl: row.evidence_url,
        reflection: row.reflection,
        reviewerFeedback: row.reviewer_feedback,
        updatedAt: row.updated_at,
      } : null;
    },
    saveParticipation(userId, opportunityId, participation) {
      const workflowStatus = participation.status;
      const legacyStatus = workflowStatus === "verified" ? "completed" : workflowStatus === "saved" ? "saved" : "applied";
      statements.upsertParticipation.run(
        userId,
        opportunityId,
        legacyStatus,
        workflowStatus,
        participation.evidenceNote || "",
        participation.evidenceUrl || "",
        participation.reflection || "",
        participation.reviewerFeedback || "",
        participation.updatedAt,
      );
      return this.getParticipation(userId, opportunityId);
    },
    getOpportunityStats() {
      return statements.opportunityStats.all().map((row) => ({
        opportunityId: row.opportunity_id,
        saved: Number(row.saved_count || 0),
        applied: Number(row.applied_count || 0),
        submitted: Number(row.submitted_count || 0),
        verified: Number(row.verified_count || 0),
        completed: Number(row.verified_count || 0),
      }));
    },
    close() {
      database.close();
    },
  };
}
