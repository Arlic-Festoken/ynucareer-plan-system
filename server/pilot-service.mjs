import { createHash, randomUUID } from "node:crypto";

export const abilityDimensions = [
  "communicationCollaboration",
  "innovativeThinking",
  "professionalSkills",
  "digitalLiteracy",
  "responsibility",
  "continuousLearning",
  "resilience",
];

const defaultScores = {
  communicationCollaboration: 55,
  innovativeThinking: 50,
  professionalSkills: 55,
  digitalLiteracy: 55,
  responsibility: 55,
  continuousLearning: 55,
  resilience: 50,
};
const opportunityTypes = new Set(["course", "project", "competition", "internship", "consultation", "research", "event"]);
const stages = new Set(["freshman", "junior", "graduate"]);
const pathways = new Set(["employment", "recommendation", "postgraduate", "civil-service"]);
const deliveryModes = new Set(["online", "offline", "hybrid"]);
const permissionByRole = {
  student: [],
  publisher: ["publish_opportunity"],
  reviewer: ["review_opportunity", "review_evidence"],
  career_admin: ["publish_opportunity", "review_opportunity", "review_evidence", "view_insights", "manage_members"],
};

function parseJson(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function text(value, limit = 500) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function boundedNumber(value, min, max, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : fallback;
}

function stringList(value, limit, allowed) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => text(item, 100)).filter((item) => item && (!allowed || allowed.has(item))))].slice(0, limit);
}

function safeUrl(value, required = false) {
  const raw = text(value, 500);
  if (!raw && !required) return "";
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol)) throw new Error("invalid_url");
    return url.toString();
  } catch {
    throw new Error(required ? "official_source_required" : "invalid_url");
  }
}

function safeEvidenceUrl(value) {
  const raw = text(value, 500);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") throw new Error("invalid_evidence_url");
    return url.toString();
  } catch {
    throw new Error("invalid_evidence_url");
  }
}

function validDate(value) {
  const result = text(value, 10);
  if (!result) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) throw new Error("invalid_deadline");
  return result;
}

function cleanScores(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(abilityDimensions.map((key) => [key, boundedNumber(source[key], 0, 100, defaultScores[key])]));
}

function cleanTrace(value, fallbackGenerator = "manual", sourceId = "") {
  const source = value && typeof value === "object" ? value : {};
  const generator = ["rule", "ai", "opportunity", "manual", "research"].includes(source.generator)
    ? source.generator
    : fallbackGenerator;
  return {
    generator,
    promptVersion: text(source.promptVersion, 80),
    ruleVersion: text(source.ruleVersion, 80) || "career-rules-0.7.0",
    model: text(source.model, 120),
    generatedAt: text(source.generatedAt, 40),
    resourceIds: stringList(source.resourceIds, 20),
    autonomous: generator === "ai" ? source.autonomous !== false : Boolean(source.autonomous),
    taskPriority: ["high", "medium", "low"].includes(source.taskPriority) ? source.taskPriority : "medium",
    sourceId: text(sourceId, 120),
  };
}

function migrateLegacyScores(value) {
  const source = value && typeof value === "object" ? value : {};
  if (abilityDimensions.some((key) => Number.isFinite(Number(source[key])))) {
    return { scores: cleanScores(source), needsReview: false };
  }
  const oldKeys = ["communication", "dataAnalysis", "projectExperience", "professionalFoundation", "programming", "careerPlanning"];
  if (!oldKeys.some((key) => Number.isFinite(Number(source[key])))) return { scores: defaultScores, needsReview: false };
  const old = (key, fallback = 55) => boundedNumber(source[key], 0, 100, fallback);
  const mean = (...values) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  return {
    scores: {
      communicationCollaboration: old("communication"),
      innovativeThinking: mean(old("dataAnalysis"), old("projectExperience")),
      professionalSkills: mean(old("professionalFoundation"), old("programming")),
      digitalLiteracy: mean(old("programming"), old("dataAnalysis")),
      responsibility: old("projectExperience"),
      continuousLearning: old("careerPlanning"),
      resilience: 50,
    },
    needsReview: true,
  };
}

function anonymousCode(userId) {
  return `学生 ${createHash("sha256").update(userId).digest("hex").slice(0, 6).toUpperCase()}`;
}

function effectiveOpportunityStatus(opportunity, today) {
  if (opportunity.status === "published" && opportunity.deadline && opportunity.deadline < today) return "expired";
  return opportunity.status;
}

function sanitizeOpportunity(input) {
  const type = text(input?.type, 32);
  const title = text(input?.title, 120);
  const summary = text(input?.summary, 800);
  const provider = text(input?.provider, 120);
  if (!title || !summary || !provider || !opportunityTypes.has(type)) throw new Error("invalid_opportunity");
  const capacity = input?.capacity === "" || input?.capacity == null ? null : boundedNumber(input.capacity, 1, 100_000, 1);
  return {
    title,
    summary,
    provider,
    type,
    sourceUrl: safeUrl(input?.sourceUrl, true),
    applicationUrl: safeUrl(input?.applicationUrl),
    deadline: validDate(input?.deadline),
    organizationId: text(input?.organizationId, 80) || "ynu",
    organizationName: text(input?.organizationName, 120) || "云南大学",
    location: text(input?.location, 160),
    deliveryMode: deliveryModes.has(input?.deliveryMode) ? input.deliveryMode : "offline",
    capacity,
    evidenceRequirement: text(input?.evidenceRequirement, 500),
    abilityDimensions: stringList(input?.abilityDimensions, 7, new Set(abilityDimensions)),
    eligibility: {
      stages: stringList(input?.eligibility?.stages, 3, stages),
      pathways: stringList(input?.eligibility?.pathways, 4, pathways),
      majors: stringList(input?.eligibility?.majors, 30),
    },
    tags: stringList(input?.tags, 8),
  };
}

function mapAction(row) {
  const rawTrace = parseJson(row.trace_json, {});
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    category: row.category,
    lane: row.lane,
    source: row.source,
    sourceId: row.source_id,
    priority: ["high", "medium", "low"].includes(rawTrace.taskPriority) ? rawTrace.taskPriority : "medium",
    status: row.status,
    dueDate: row.due_date,
    reflection: row.reflection,
    trace: cleanTrace(rawTrace, row.source, row.source_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEvidence(row) {
  return {
    id: row.id,
    actionItemId: row.action_item_id,
    opportunityId: row.opportunity_id,
    title: row.title,
    description: row.description,
    evidenceUrl: row.evidence_url,
    reflection: row.reflection,
    status: row.status,
    rubric: parseJson(row.rubric_json, {}),
    reviewerFeedback: row.reviewer_feedback,
    anonymousStudentCode: row.anonymous_code,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
  };
}

export function createPilotService(database, options = {}) {
  const sql = database.sql;
  const now = options.now ?? (() => new Date());
  const randomId = options.randomId ?? (() => randomUUID());
  const today = () => now().toISOString().slice(0, 10);

  const audit = (actorId, action, entityType, entityId, metadata = {}) => {
    sql.prepare("INSERT INTO audit_events (id, actor_id, action, entity_type, entity_id, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(randomId(), actorId, action, entityType, entityId, JSON.stringify(metadata), now().toISOString());
  };

  function ensureMemberships(user) {
    if (!user) return;
    const timestamp = now().toISOString();
    const roles = user.role === "teacher" ? ["publisher", "reviewer", "career_admin"] : ["student"];
    const statement = sql.prepare(`
      INSERT OR IGNORE INTO organization_memberships (user_id, organization_id, role, created_at, updated_at)
      VALUES (?, 'ynu', ?, ?, ?)
    `);
    roles.forEach((role) => statement.run(user.id, role, timestamp, timestamp));
  }

  function permissionsFor(user) {
    if (!user) return [];
    ensureMemberships(user);
    const roles = sql.prepare("SELECT role FROM organization_memberships WHERE user_id = ?").all(user.id).map((item) => item.role);
    return [...new Set(roles.flatMap((role) => permissionByRole[role] || []))];
  }

  function requirePermission(user, permission) {
    if (!permissionsFor(user).includes(permission)) throw new Error("staff_permission_required");
  }

  function membershipsFor(user) {
    if (!user) return [];
    ensureMemberships(user);
    return sql.prepare("SELECT organization_id, role FROM organization_memberships WHERE user_id = ?").all(user.id);
  }

  function hasOrganizationPermission(user, organizationId, permission) {
    const memberships = membershipsFor(user);
    return memberships.some((membership) =>
      permissionByRole[membership.role]?.includes(permission) &&
      (membership.organization_id === organizationId || (membership.organization_id === "ynu" && membership.role === "career_admin")));
  }

  function requireOrganizationPermission(user, organizationId, permission) {
    if (!hasOrganizationPermission(user, organizationId, permission)) throw new Error("organization_scope_required");
  }

  function insightScope(user) {
    const memberships = membershipsFor(user).filter((membership) => permissionByRole[membership.role]?.includes("view_insights"));
    if (memberships.some((membership) => membership.organization_id === "ynu" && membership.role === "career_admin")) return null;
    return memberships[0]?.organization_id || "";
  }

  function getAbilityProfile(user) {
    if (!user) throw new Error("authentication_required");
    let row = sql.prepare("SELECT * FROM ability_profiles WHERE user_id = ?").get(user.id);
    if (!row) {
      const careerState = database.getCareerState(user.id);
      const legacy = migrateLegacyScores(careerState?.profile?.abilityScores);
      if (careerState?.profile?.abilityScores) {
        const timestamp = now().toISOString();
        sql.prepare(`
          INSERT INTO ability_profiles (user_id, self_ratings_json, legacy_needs_review, updated_at)
          VALUES (?, ?, ?, ?)
        `).run(user.id, JSON.stringify(legacy.scores), legacy.needsReview ? 1 : 0, timestamp);
        row = sql.prepare("SELECT * FROM ability_profiles WHERE user_id = ?").get(user.id);
        audit(user.id, "ability_profile.migrated", "ability_profile", user.id, { needsReview: legacy.needsReview });
      }
    }
    const selfRating = cleanScores(row ? parseJson(row.self_ratings_json, {}) : defaultScores);
    const verifiedRows = sql.prepare("SELECT rubric_json, submitted_at, opportunity_id, action_item_id FROM evidence_records WHERE user_id = ? AND status = 'verified'").all(user.id);
    const totals = Object.fromEntries(abilityDimensions.map((key) => [key, { score: 0, weight: 0, count: 0 }]));
    const evidenceTypes = new Set();
    let recent = false;
    verifiedRows.forEach((evidence) => {
      const rubric = parseJson(evidence.rubric_json, {});
      Object.entries(rubric).forEach(([key, value]) => {
        if (!abilityDimensions.includes(key) || !value || typeof value !== "object") return;
        const weight = boundedNumber(value.weight, 1, 3, 1);
        const score = boundedNumber(value.score, 0, 4, 0) * 25;
        totals[key].score += score * weight;
        totals[key].weight += weight;
        totals[key].count += 1;
      });
      evidenceTypes.add(evidence.opportunity_id ? "opportunity" : evidence.action_item_id ? "action" : "other");
      recent ||= now().getTime() - Date.parse(evidence.submitted_at) <= 180 * 24 * 60 * 60 * 1000;
    });
    const verifiedScore = Object.fromEntries(abilityDimensions.map((key) => [
      key,
      totals[key].weight ? Math.round(totals[key].score / totals[key].weight) : selfRating[key],
    ]));
    const combinedScore = Object.fromEntries(abilityDimensions.map((key) => [
      key,
      totals[key].count ? Math.round(selfRating[key] * 0.35 + verifiedScore[key] * 0.65) : selfRating[key],
    ]));
    const evidenceCounts = Object.fromEntries(abilityDimensions.map((key) => [key, totals[key].count]));
    const count = verifiedRows.length;
    const confidence = count >= 5 && evidenceTypes.size >= 2 && recent ? "high" : count >= 2 ? "medium" : "low";
    return {
      selfRating,
      verifiedScore,
      combinedScore,
      evidenceCounts,
      confidence,
      legacyNeedsReview: Boolean(row?.legacy_needs_review),
      updatedAt: row?.updated_at || "",
    };
  }

  function updateAbilityProfile(user, input) {
    if (!user) throw new Error("authentication_required");
    const selfRating = cleanScores(input?.selfRating ?? input);
    const timestamp = now().toISOString();
    sql.prepare(`
      INSERT INTO ability_profiles (user_id, self_ratings_json, legacy_needs_review, updated_at)
      VALUES (?, ?, 0, ?)
      ON CONFLICT(user_id) DO UPDATE SET self_ratings_json = excluded.self_ratings_json, legacy_needs_review = 0, updated_at = excluded.updated_at
    `).run(user.id, JSON.stringify(selfRating), timestamp);
    audit(user.id, "ability_profile.updated", "ability_profile", user.id);
    return getAbilityProfile(user);
  }

  function listActions(user) {
    if (!user) throw new Error("authentication_required");
    return sql.prepare("SELECT * FROM action_items WHERE user_id = ? ORDER BY CASE status WHEN 'changes_requested' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, CASE WHEN due_date = '' THEN 1 ELSE 0 END, due_date, created_at DESC")
      .all(user.id).map(mapAction);
  }

  function createAction(user, input) {
    if (!user) throw new Error("authentication_required");
    const title = text(input?.title, 120);
    const detail = text(input?.detail, 500);
    if (!title || !detail) throw new Error("invalid_action");
    const timestamp = now().toISOString();
    const id = randomId();
    const category = ["course", "project", "practice", "reflection", "research", "career"].includes(input?.category) ? input.category : "practice";
    const lane = ["exploration", "growth", "research", "career"].includes(input?.lane) ? input.lane : "growth";
    const source = ["manual", "rule", "ai", "research"].includes(input?.source) ? input.source : "manual";
    const sourceId = text(input?.sourceId, 120) || id;
    const priority = ["high", "medium", "low"].includes(input?.priority) ? input.priority : "medium";
    const trace = cleanTrace({ ...(input?.trace || {}), taskPriority: priority }, source, sourceId);
    sql.prepare(`
      INSERT INTO action_items (id, user_id, title, detail, category, lane, source, source_id, status, due_date, reflection, trace_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned', ?, '', ?, ?, ?)
      ON CONFLICT(user_id, source, source_id) DO UPDATE SET
        title = excluded.title,
        detail = excluded.detail,
        category = excluded.category,
        lane = excluded.lane,
        trace_json = excluded.trace_json,
        due_date = CASE WHEN excluded.due_date = '' THEN action_items.due_date ELSE excluded.due_date END,
        updated_at = excluded.updated_at
    `).run(id, user.id, title, detail, category, lane, source, sourceId, validDate(input?.dueDate), JSON.stringify(trace), timestamp, timestamp);
    const saved = sql.prepare("SELECT * FROM action_items WHERE user_id = ? AND source = ? AND source_id = ?").get(user.id, source, sourceId);
    audit(user.id, saved.id === id ? "action.created" : "action.deduplicated", "action", saved.id, { source, priority });
    return mapAction(saved);
  }

  function updateAction(user, actionId, input) {
    if (!user) throw new Error("authentication_required");
    const row = sql.prepare("SELECT * FROM action_items WHERE id = ? AND user_id = ?").get(actionId, user.id);
    if (!row) throw new Error("action_not_found");
    const status = ["planned", "in_progress", "submitted", "completed", "changes_requested"].includes(input?.status) ? input.status : row.status;
    const title = input?.title == null ? row.title : text(input.title, 120);
    const detail = input?.detail == null ? row.detail : text(input.detail, 500);
    if (!title || !detail) throw new Error("invalid_action");
    const rawTrace = parseJson(row.trace_json, {});
    const priority = ["high", "medium", "low"].includes(input?.priority) ? input.priority : rawTrace.taskPriority || "medium";
    const trace = cleanTrace({ ...rawTrace, taskPriority: priority }, row.source, row.source_id);
    const reflection = input?.reflection == null ? row.reflection : text(input.reflection, 600);
    const timestamp = now().toISOString();
    sql.prepare("UPDATE action_items SET title = ?, detail = ?, status = ?, reflection = ?, trace_json = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .run(title, detail, status, reflection, JSON.stringify(trace), timestamp, actionId, user.id);
    audit(user.id, `action.${status}`, "action", actionId, { priority });
    return mapAction(sql.prepare("SELECT * FROM action_items WHERE id = ?").get(actionId));
  }

  function deleteAction(user, actionId) {
    if (!user) throw new Error("authentication_required");
    const row = sql.prepare("SELECT * FROM action_items WHERE id = ? AND user_id = ?").get(actionId, user.id);
    if (!row) throw new Error("action_not_found");
    const evidence = sql.prepare("SELECT 1 FROM evidence_records WHERE action_item_id = ? LIMIT 1").get(actionId);
    if (row.source === "opportunity" || evidence || ["submitted", "completed"].includes(row.status)) throw new Error("action_not_deletable");
    sql.prepare("DELETE FROM action_items WHERE id = ? AND user_id = ?").run(actionId, user.id);
    audit(user.id, "action.deleted", "action", actionId);
    return true;
  }

  function submitEvidence(user, input) {
    if (!user) throw new Error("authentication_required");
    const actionId = text(input?.actionItemId, 120);
    const action = sql.prepare("SELECT * FROM action_items WHERE id = ? AND user_id = ?").get(actionId, user.id);
    if (!action) throw new Error("action_not_found");
    if (["submitted", "completed"].includes(action.status)) throw new Error("evidence_already_submitted");
    const description = text(input?.description, 600);
    const reflection = text(input?.reflection, 600);
    if (!description || !reflection) throw new Error("evidence_required");
    const timestamp = now().toISOString();
    const id = randomId();
    sql.prepare(`
      INSERT INTO evidence_records (id, user_id, action_item_id, opportunity_id, title, description, evidence_url, reflection, status, rubric_json, reviewer_feedback, anonymous_code, submitted_at)
      VALUES (?, ?, ?, '', ?, ?, ?, ?, 'submitted', '{}', '', ?, ?)
    `).run(id, user.id, actionId, text(input?.title, 120) || action.title, description, safeEvidenceUrl(input?.evidenceUrl), reflection, anonymousCode(user.id), timestamp);
    sql.prepare("UPDATE action_items SET status = 'submitted', updated_at = ? WHERE id = ?").run(timestamp, actionId);
    audit(user.id, "evidence.submitted", "evidence", id, { actionId });
    return mapEvidence(sql.prepare("SELECT * FROM evidence_records WHERE id = ?").get(id));
  }

  function upsertOpportunityAction(user, opportunity, status) {
    const timestamp = now().toISOString();
    const actionStatus = status === "verified" ? "completed" : status === "submitted" ? "submitted" : status === "changes_requested" ? "changes_requested" : ["applied", "in_progress"].includes(status) ? "in_progress" : "planned";
    sql.prepare(`
      INSERT INTO action_items (id, user_id, title, detail, category, lane, source, source_id, status, due_date, reflection, trace_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'growth', 'opportunity', ?, ?, ?, '', ?, ?, ?)
      ON CONFLICT(user_id, source, source_id) DO UPDATE SET
        title = excluded.title, detail = excluded.detail, status = excluded.status, due_date = excluded.due_date,
        trace_json = excluded.trace_json, updated_at = excluded.updated_at
    `).run(
      randomId(),
      user.id,
      `参与：${opportunity.title}`,
      opportunity.evidenceRequirement || `完成后记录来自${opportunity.provider}的产出与反馈。`,
      opportunity.type === "course" ? "course" : opportunity.type === "research" ? "research" : ["project", "competition"].includes(opportunity.type) ? "project" : "practice",
      opportunity.id,
      actionStatus,
      opportunity.deadline,
      JSON.stringify(cleanTrace({
        generator: "opportunity",
        ruleVersion: "career-rules-0.7.0",
        resourceIds: [opportunity.id],
        autonomous: false,
      }, "opportunity", opportunity.id)),
      timestamp,
      timestamp,
    );
    return sql.prepare("SELECT * FROM action_items WHERE user_id = ? AND source = 'opportunity' AND source_id = ?").get(user.id, opportunity.id);
  }

  function listForStudent(user) {
    if (!user) throw new Error("authentication_required");
    const participations = new Map(database.getParticipationsForUser(user.id).map((item) => [item.opportunityId, item]));
    return database.listOpportunities()
      .map((opportunity) => ({ ...opportunity, status: effectiveOpportunityStatus(opportunity, today()), participation: participations.get(opportunity.id) ?? null }))
      .filter((opportunity) => opportunity.status === "published" || (opportunity.participation && ["expired", "closed"].includes(opportunity.status)));
  }

  function saveParticipation(user, opportunityId, input) {
    if (!user) throw new Error("authentication_required");
    const opportunity = database.getOpportunity(opportunityId);
    if (!opportunity) throw new Error("opportunity_not_found");
    const effectiveStatus = effectiveOpportunityStatus(opportunity, today());
    const existing = database.getParticipation(user.id, opportunityId);
    const nextStatus = text(input?.status, 30);
    const transitions = {
      none: ["saved"],
      saved: ["saved", "applied", "withdrawn"],
      applied: ["applied", "in_progress", "submitted", "withdrawn"],
      in_progress: ["in_progress", "submitted", "withdrawn"],
      submitted: ["submitted"],
      changes_requested: ["submitted", "withdrawn"],
      verified: ["verified"],
      withdrawn: ["saved"],
    };
    if (!(transitions[existing?.status || "none"] || []).includes(nextStatus)) throw new Error("invalid_participation_transition");
    if (!existing && effectiveStatus !== "published") throw new Error("opportunity_closed");
    if (nextStatus === "saved" && (!existing || existing.status === "withdrawn") && opportunity.capacity != null) {
      const occupied = Number(sql.prepare(`
        SELECT COUNT(*) AS count FROM opportunity_participations
        WHERE opportunity_id = ? AND workflow_status != 'withdrawn'
      `).get(opportunityId).count || 0);
      if (occupied >= opportunity.capacity) throw new Error("opportunity_full");
    }

    const evidenceNote = text(input?.evidenceNote, 600);
    const evidenceUrl = safeEvidenceUrl(input?.evidenceUrl);
    const reflection = text(input?.reflection, 600);
    if (nextStatus === "submitted" && (!evidenceNote || !reflection)) throw new Error("evidence_required");
    const timestamp = now().toISOString();
    const participation = database.saveParticipation(user.id, opportunityId, {
      status: nextStatus,
      evidenceNote,
      evidenceUrl,
      reflection,
      reviewerFeedback: existing?.reviewerFeedback || "",
      updatedAt: timestamp,
    });
    const action = upsertOpportunityAction(user, opportunity, nextStatus);
    sql.prepare("INSERT INTO participation_events (id, user_id, opportunity_id, from_status, to_status, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(randomId(), user.id, opportunityId, existing?.status || "none", nextStatus, timestamp);
    if (nextStatus === "submitted") {
      const currentEvidence = sql.prepare("SELECT id FROM evidence_records WHERE user_id = ? AND opportunity_id = ? ORDER BY submitted_at DESC LIMIT 1").get(user.id, opportunityId);
      if (currentEvidence) {
        sql.prepare(`
          UPDATE evidence_records SET action_item_id = ?, title = ?, description = ?, evidence_url = ?, reflection = ?,
            status = 'submitted', rubric_json = '{}', reviewer_feedback = '', submitted_at = ?, reviewed_at = '', reviewed_by = ''
          WHERE id = ?
        `).run(action.id, opportunity.title, evidenceNote, evidenceUrl, reflection, timestamp, currentEvidence.id);
      } else {
        sql.prepare(`
          INSERT INTO evidence_records (id, user_id, action_item_id, opportunity_id, title, description, evidence_url, reflection, status, rubric_json, reviewer_feedback, anonymous_code, submitted_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted', '{}', '', ?, ?)
        `).run(randomId(), user.id, action.id, opportunityId, opportunity.title, evidenceNote, evidenceUrl, reflection, anonymousCode(user.id), timestamp);
      }
    }
    audit(user.id, `participation.${nextStatus}`, "opportunity", opportunityId);
    return { opportunity: { ...opportunity, status: effectiveStatus }, participation };
  }

  function createDraft(user, input, publishImmediately = false) {
    const clean = sanitizeOpportunity(input);
    requireOrganizationPermission(user, clean.organizationId, "publish_opportunity");
    const duplicate = sql.prepare(`
      SELECT id FROM campus_opportunities
      WHERE created_by = ? AND title = ? AND source_url = ? AND workflow_status IN ('draft', 'pending_review')
      ORDER BY created_at DESC LIMIT 1
    `).get(user.id, clean.title, clean.sourceUrl);
    if (duplicate) {
      audit(user.id, "opportunity.draft_deduplicated", "opportunity", duplicate.id);
      return database.getOpportunity(duplicate.id);
    }
    const timestamp = now().toISOString();
    const id = randomId();
    const workflowStatus = publishImmediately ? "published" : "draft";
    sql.prepare(`
      INSERT INTO campus_opportunities (
        id, title, summary, type, provider, source_url, application_url, deadline,
        stages_json, pathways_json, majors_json, tags_json, status, workflow_status,
        created_by, organization_id, organization_name, location, delivery_mode, capacity,
        evidence_requirement, ability_dimensions_json, review_note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)
    `).run(
      id,
      clean.title,
      clean.summary,
      clean.type,
      clean.provider,
      clean.sourceUrl,
      clean.applicationUrl,
      clean.deadline,
      JSON.stringify(clean.eligibility.stages),
      JSON.stringify(clean.eligibility.pathways),
      JSON.stringify(clean.eligibility.majors),
      JSON.stringify(clean.tags),
      workflowStatus,
      user.id,
      clean.organizationId,
      clean.organizationName,
      clean.location,
      clean.deliveryMode,
      clean.capacity,
      clean.evidenceRequirement,
      JSON.stringify(clean.abilityDimensions),
      timestamp,
      timestamp,
    );
    audit(user.id, publishImmediately ? "opportunity.compat_published" : "opportunity.draft_created", "opportunity", id);
    return database.getOpportunity(id);
  }

  function updateDraft(user, opportunityId, input) {
    const existing = database.getOpportunity(opportunityId);
    if (!existing) throw new Error("opportunity_not_found");
    requireOrganizationPermission(user, existing.organizationId, "publish_opportunity");
    if (existing.createdBy !== user.id && !permissionsFor(user).includes("manage_members")) throw new Error("opportunity_owner_required");
    if (!["draft", "pending_review"].includes(existing.status)) throw new Error("opportunity_not_editable");
    const clean = sanitizeOpportunity(input);
    const timestamp = now().toISOString();
    sql.prepare(`
      UPDATE campus_opportunities SET title = ?, summary = ?, type = ?, provider = ?, source_url = ?, application_url = ?, deadline = ?,
        stages_json = ?, pathways_json = ?, majors_json = ?, tags_json = ?, organization_id = ?, organization_name = ?,
        location = ?, delivery_mode = ?, capacity = ?, evidence_requirement = ?, ability_dimensions_json = ?,
        workflow_status = 'draft', review_note = '', updated_at = ? WHERE id = ?
    `).run(
      clean.title, clean.summary, clean.type, clean.provider, clean.sourceUrl, clean.applicationUrl, clean.deadline,
      JSON.stringify(clean.eligibility.stages), JSON.stringify(clean.eligibility.pathways), JSON.stringify(clean.eligibility.majors),
      JSON.stringify(clean.tags), clean.organizationId, clean.organizationName, clean.location, clean.deliveryMode,
      clean.capacity, clean.evidenceRequirement, JSON.stringify(clean.abilityDimensions), timestamp, opportunityId,
    );
    audit(user.id, "opportunity.draft_updated", "opportunity", opportunityId);
    return database.getOpportunity(opportunityId);
  }

  function submitOpportunity(user, opportunityId) {
    const opportunity = database.getOpportunity(opportunityId);
    if (!opportunity) throw new Error("opportunity_not_found");
    requireOrganizationPermission(user, opportunity.organizationId, "publish_opportunity");
    if (opportunity.createdBy !== user.id && !permissionsFor(user).includes("manage_members")) throw new Error("opportunity_owner_required");
    if (opportunity.status !== "draft") throw new Error("opportunity_not_submittable");
    const timestamp = now().toISOString();
    database.updateOpportunityStatus(opportunityId, "pending_review", timestamp);
    sql.prepare(`
      INSERT INTO opportunity_reviews (opportunity_id, submitted_by, decision, submitted_at)
      VALUES (?, ?, 'pending', ?)
      ON CONFLICT(opportunity_id) DO UPDATE SET submitted_by = excluded.submitted_by, reviewed_by = '', decision = 'pending', note = '', submitted_at = excluded.submitted_at, reviewed_at = ''
    `).run(opportunityId, user.id, timestamp);
    audit(user.id, "opportunity.submitted", "opportunity", opportunityId);
    return database.getOpportunity(opportunityId);
  }

  function reviewOpportunity(user, opportunityId, input) {
    const opportunity = database.getOpportunity(opportunityId);
    if (!opportunity) throw new Error("opportunity_not_found");
    requireOrganizationPermission(user, opportunity.organizationId, "review_opportunity");
    if (opportunity.status !== "pending_review") throw new Error("opportunity_not_pending_review");
    const decision = input?.decision === "approved" ? "approved" : input?.decision === "changes_requested" ? "changes_requested" : "";
    if (!decision) throw new Error("invalid_review_decision");
    const note = text(input?.note, 500);
    if (decision === "changes_requested" && !note) throw new Error("review_note_required");
    const timestamp = now().toISOString();
    database.updateOpportunityStatus(opportunityId, decision === "approved" ? "published" : "draft", timestamp);
    sql.prepare("UPDATE campus_opportunities SET review_note = ? WHERE id = ?").run(note, opportunityId);
    sql.prepare("UPDATE opportunity_reviews SET reviewed_by = ?, decision = ?, note = ?, reviewed_at = ? WHERE opportunity_id = ?")
      .run(user.id, decision, note, timestamp, opportunityId);
    audit(user.id, `opportunity.${decision}`, "opportunity", opportunityId);
    return database.getOpportunity(opportunityId);
  }

  function listForStaff(user) {
    if (!permissionsFor(user).some((permission) => ["publish_opportunity", "review_opportunity", "view_insights"].includes(permission))) {
      throw new Error("staff_permission_required");
    }
    const stats = new Map(database.getOpportunityStats().map((item) => [item.opportunityId, item]));
    return database.listOpportunities().filter((opportunity) =>
      hasOrganizationPermission(user, opportunity.organizationId, "publish_opportunity") ||
      hasOrganizationPermission(user, opportunity.organizationId, "review_opportunity") ||
      hasOrganizationPermission(user, opportunity.organizationId, "view_insights"))
      .map((opportunity) => ({
      ...opportunity,
      status: effectiveOpportunityStatus(opportunity, today()),
      participation: undefined,
      participationSummary: stats.get(opportunity.id) ?? { opportunityId: opportunity.id, saved: 0, applied: 0, submitted: 0, verified: 0, completed: 0 },
    }));
  }

  function setOpportunityStatus(user, opportunityId, input) {
    const opportunity = database.getOpportunity(opportunityId);
    if (!opportunity) throw new Error("opportunity_not_found");
    requireOrganizationPermission(user, opportunity.organizationId, "publish_opportunity");
    const status = input?.status;
    if (!["published", "closed", "archived"].includes(status)) throw new Error("invalid_opportunity_status");
    const updated = database.updateOpportunityStatus(opportunityId, status, now().toISOString());
    audit(user.id, `opportunity.${status}`, "opportunity", opportunityId);
    return updated;
  }

  function listEvidenceQueue(user) {
    requirePermission(user, "review_evidence");
    return sql.prepare(`
      SELECT evidence_records.*, campus_opportunities.provider, campus_opportunities.evidence_requirement, campus_opportunities.organization_id
      FROM evidence_records
      LEFT JOIN campus_opportunities ON campus_opportunities.id = evidence_records.opportunity_id
      ORDER BY CASE evidence_records.status WHEN 'submitted' THEN 0 WHEN 'changes_requested' THEN 1 ELSE 2 END, submitted_at
    `).all()
      .filter((row) => row.organization_id
        ? hasOrganizationPermission(user, row.organization_id, "review_evidence")
        : hasOrganizationPermission(user, "ynu", "review_evidence"))
      .map((row) => ({ ...mapEvidence(row), provider: row.provider || "", evidenceRequirement: row.evidence_requirement || "" }));
  }

  function reviewEvidence(user, evidenceId, input) {
    requirePermission(user, "review_evidence");
    const record = sql.prepare("SELECT * FROM evidence_records WHERE id = ?").get(evidenceId);
    if (!record) throw new Error("evidence_not_found");
    const opportunity = record.opportunity_id ? database.getOpportunity(record.opportunity_id) : null;
    requireOrganizationPermission(user, opportunity?.organizationId || "ynu", "review_evidence");
    if (record.status !== "submitted") throw new Error("evidence_not_pending");
    const decision = input?.decision === "verified" ? "verified" : input?.decision === "changes_requested" ? "changes_requested" : "";
    if (!decision) throw new Error("invalid_review_decision");
    const feedback = text(input?.feedback, 600);
    if (decision === "changes_requested" && !feedback) throw new Error("review_note_required");
    const rubricSource = input?.rubric && typeof input.rubric === "object" ? input.rubric : {};
    const rubric = Object.fromEntries(Object.entries(rubricSource)
      .filter(([key]) => abilityDimensions.includes(key))
      .map(([key, value]) => [key, {
        score: boundedNumber(value?.score, 0, 4, 0),
        weight: boundedNumber(value?.weight, 1, 3, 1),
      }]));
    if (decision === "verified" && !Object.keys(rubric).length) throw new Error("rubric_required");
    const timestamp = now().toISOString();
    sql.prepare("UPDATE evidence_records SET status = ?, rubric_json = ?, reviewer_feedback = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?")
      .run(decision, JSON.stringify(rubric), feedback, timestamp, user.id, evidenceId);
    const existing = database.getParticipation(record.user_id, record.opportunity_id);
    if (existing) database.saveParticipation(record.user_id, record.opportunity_id, {
      ...existing,
      status: decision,
      reviewerFeedback: feedback,
      updatedAt: timestamp,
    });
    sql.prepare("UPDATE action_items SET status = ?, updated_at = ? WHERE id = ?")
      .run(decision === "verified" ? "completed" : "changes_requested", timestamp, record.action_item_id);
    const notificationType = decision === "verified" ? "evidence_verified" : "changes_requested";
    sql.prepare(`
      INSERT OR IGNORE INTO notifications (id, user_id, type, dedupe_key, title, body, href, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      randomId(),
      record.user_id,
      notificationType,
      `evidence:${evidenceId}:${decision}:${timestamp}`,
      decision === "verified" ? "成果记录已核验" : "成果记录需要补充",
      feedback || "你的成果已被核验，并更新到能力画像。",
      record.opportunity_id ? "/student/opportunities" : "/student/roadmap",
      timestamp,
    );
    audit(user.id, `evidence.${decision}`, "evidence", evidenceId, { dimensions: Object.keys(rubric) });
    return mapEvidence(sql.prepare("SELECT * FROM evidence_records WHERE id = ?").get(evidenceId));
  }

  function generateDeadlineNotifications(user) {
    if (!user) return;
    const rows = sql.prepare(`
      SELECT campus_opportunities.id, campus_opportunities.title, campus_opportunities.deadline
      FROM opportunity_participations
      JOIN campus_opportunities ON campus_opportunities.id = opportunity_participations.opportunity_id
      WHERE opportunity_participations.user_id = ?
        AND opportunity_participations.workflow_status IN ('saved', 'applied', 'in_progress', 'changes_requested')
        AND campus_opportunities.workflow_status = 'published'
        AND campus_opportunities.deadline != ''
    `).all(user.id);
    const todayTime = Date.parse(`${today()}T00:00:00Z`);
    rows.forEach((row) => {
      const days = Math.round((Date.parse(`${row.deadline}T00:00:00Z`) - todayTime) / (24 * 60 * 60 * 1000));
      if (![7, 3, 1].includes(days)) return;
      sql.prepare(`
        INSERT OR IGNORE INTO notifications (id, user_id, type, dedupe_key, title, body, href, is_read, created_at)
        VALUES (?, ?, 'deadline', ?, ?, ?, '/student/opportunities', 0, ?)
      `).run(randomId(), user.id, `deadline:${row.id}:${row.deadline}:${days}`, `${row.title} 即将截止`, `距离截止还有 ${days} 天，请确认报名或成果提交状态。`, now().toISOString());
    });
  }

  function listNotifications(user) {
    if (!user) throw new Error("authentication_required");
    generateDeadlineNotifications(user);
    return sql.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY is_read, created_at DESC LIMIT 50").all(user.id).map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      href: row.href,
      read: Boolean(row.is_read),
      createdAt: row.created_at,
    }));
  }

  function markNotification(user, id, read = true) {
    if (!user) throw new Error("authentication_required");
    const result = sql.prepare("UPDATE notifications SET is_read = ? WHERE id = ? AND user_id = ?").run(read ? 1 : 0, id, user.id);
    if (!result.changes) throw new Error("notification_not_found");
    return { ok: true };
  }

  function dashboard(user) {
    if (!user) throw new Error("authentication_required");
    const actions = listActions(user);
    const allOpportunities = listForStudent(user);
    const opportunities = allOpportunities.filter((item) => item.participation && !["verified", "withdrawn"].includes(item.participation.status));
    const abilityProfile = getAbilityProfile(user);
    const weakestAbility = abilityDimensions.reduce((lowest, key) =>
      abilityProfile.combinedScore[key] < abilityProfile.combinedScore[lowest] ? key : lowest, abilityDimensions[0]);
    const todayTime = Date.parse(`${today()}T00:00:00Z`);
    const ranked = [
      ...opportunities.map((item) => {
        const days = item.deadline ? Math.round((Date.parse(`${item.deadline}T00:00:00Z`) - todayTime) / (24 * 60 * 60 * 1000)) : null;
        const priority = item.participation.status === "changes_requested" ? 100 : days != null && days >= 0 && days <= 7 ? 90 - days : ["applied", "in_progress", "submitted"].includes(item.participation.status) ? 75 : 60;
        return {
          id: `opportunity-${item.id}`,
          title: item.title,
          detail: item.evidenceRequirement || item.summary,
          reason: item.participation.status === "changes_requested" ? "教师反馈后待补充" : days != null && days >= 0 && days <= 7 ? `${days} 天后截止` : "已加入你的行动",
          href: "/student/opportunities",
          dueDate: item.deadline,
          priority,
          status: item.participation.status,
        };
      }),
      ...actions.filter((action) => action.source !== "opportunity" && action.status !== "completed").map((action) => ({
        id: action.id,
        title: action.title,
        detail: action.detail,
        reason: action.status === "changes_requested" ? "需要补充" : "行动计划",
        href: "/student/roadmap",
        dueDate: action.dueDate,
        priority: action.status === "changes_requested" ? 95 : action.status === "in_progress" ? 70 : 40,
        status: action.status,
      })),
      ...allOpportunities
        .filter((item) => !item.participation && item.status === "published" && item.abilityDimensions.includes(weakestAbility))
        .slice(0, 1)
        .map((item) => ({
          id: `ability-resource-${item.id}`,
          title: item.title,
          detail: item.summary,
          reason: "对应当前能力积累重点",
          href: "/student/opportunities",
          dueDate: item.deadline,
          priority: 55,
          status: "recommended",
        })),
    ].sort((left, right) => right.priority - left.priority || left.dueDate.localeCompare(right.dueDate)).slice(0, 3);
    const notifications = listNotifications(user);
    return { actions: ranked, abilityProfile, unreadNotifications: notifications.filter((item) => !item.read).length };
  }

  function cohortInsights(user) {
    requirePermission(user, "view_insights");
    const scope = insightScope(user);
    if (scope === "") throw new Error("organization_scope_required");
    const organization = scope ? sql.prepare("SELECT name FROM organizations WHERE id = ?").get(scope) : null;
    const sampleSize = Number(scope
      ? sql.prepare("SELECT COUNT(*) AS count FROM user_profiles WHERE college = ?").get(organization?.name || "").count || 0
      : sql.prepare("SELECT COUNT(*) AS count FROM user_profiles").get().count || 0);
    const threshold = 10;
    const totals = scope ? sql.prepare(`
      SELECT
        COUNT(*) AS saved,
        SUM(CASE WHEN opportunity_participations.workflow_status IN ('applied', 'in_progress', 'submitted', 'changes_requested', 'verified') THEN 1 ELSE 0 END) AS applied,
        SUM(CASE WHEN opportunity_participations.workflow_status IN ('submitted', 'changes_requested', 'verified') THEN 1 ELSE 0 END) AS submitted,
        SUM(CASE WHEN opportunity_participations.workflow_status = 'verified' THEN 1 ELSE 0 END) AS verified
      FROM opportunity_participations
      JOIN campus_opportunities ON campus_opportunities.id = opportunity_participations.opportunity_id
      WHERE campus_opportunities.organization_id = ?
    `).get(scope) : sql.prepare(`
      SELECT
        COUNT(*) AS saved,
        SUM(CASE WHEN workflow_status IN ('applied', 'in_progress', 'submitted', 'changes_requested', 'verified') THEN 1 ELSE 0 END) AS applied,
        SUM(CASE WHEN workflow_status IN ('submitted', 'changes_requested', 'verified') THEN 1 ELSE 0 END) AS submitted,
        SUM(CASE WHEN workflow_status = 'verified' THEN 1 ELSE 0 END) AS verified
      FROM opportunity_participations
    `).get();
    if (sampleSize < threshold) return {
      suppressed: true,
      sampleSize,
      threshold,
      funnel: { saved: Number(totals.saved || 0), applied: Number(totals.applied || 0), submitted: Number(totals.submitted || 0), verified: Number(totals.verified || 0) },
      commonAbilityGaps: [],
      resourceDemand: [],
    };
    const profiles = (scope
      ? sql.prepare(`
        SELECT ability_profiles.self_ratings_json FROM ability_profiles
        JOIN user_profiles ON user_profiles.user_id = ability_profiles.user_id
        WHERE user_profiles.college = ?
      `).all(organization?.name || "")
      : sql.prepare("SELECT self_ratings_json FROM ability_profiles").all())
      .map((row) => cleanScores(parseJson(row.self_ratings_json, {})));
    const commonAbilityGaps = abilityDimensions.map((ability) => ({
      ability,
      average: profiles.length ? Math.round(profiles.reduce((sum, profile) => sum + profile[ability], 0) / profiles.length) : 0,
    })).sort((left, right) => left.average - right.average).slice(0, 3);
    const resourceDemand = (scope ? sql.prepare(`
      SELECT campus_opportunities.type, COUNT(*) AS count
      FROM opportunity_participations
      JOIN campus_opportunities ON campus_opportunities.id = opportunity_participations.opportunity_id
      WHERE campus_opportunities.organization_id = ?
      GROUP BY campus_opportunities.type ORDER BY count DESC
    `).all(scope) : sql.prepare(`
      SELECT campus_opportunities.type, COUNT(*) AS count
      FROM opportunity_participations
      JOIN campus_opportunities ON campus_opportunities.id = opportunity_participations.opportunity_id
      GROUP BY campus_opportunities.type ORDER BY count DESC
    `).all()).map((row) => ({ type: row.type, count: Number(row.count) }));
    return {
      suppressed: false,
      sampleSize,
      threshold,
      funnel: { saved: Number(totals.saved || 0), applied: Number(totals.applied || 0), submitted: Number(totals.submitted || 0), verified: Number(totals.verified || 0) },
      commonAbilityGaps,
      resourceDemand,
    };
  }

  function calendar(user) {
    if (!user) throw new Error("authentication_required");
    const rows = sql.prepare(`
      SELECT campus_opportunities.id, campus_opportunities.title, campus_opportunities.deadline
      FROM opportunity_participations
      JOIN campus_opportunities ON campus_opportunities.id = opportunity_participations.opportunity_id
      WHERE opportunity_participations.user_id = ? AND campus_opportunities.deadline != ''
        AND opportunity_participations.workflow_status NOT IN ('withdrawn', 'verified')
    `).all(user.id);
    const escape = (value) => String(value).replace(/[\\,;]/g, (match) => `\\${match}`).replace(/\n/g, "\\n");
    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Yunnan University//Career Navigation//CN",
      "CALSCALE:GREGORIAN",
      ...rows.flatMap((row) => {
        const nextDate = new Date(`${row.deadline}T00:00:00Z`);
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        return [
          "BEGIN:VEVENT",
          `UID:${row.id}@career.ynu`,
          `DTSTART;VALUE=DATE:${row.deadline.replaceAll("-", "")}`,
          `DTEND;VALUE=DATE:${nextDate.toISOString().slice(0, 10).replaceAll("-", "")}`,
          `SUMMARY:${escape(`${row.title} 截止`)}`,
          "END:VEVENT",
        ];
      }),
      "END:VCALENDAR",
      "",
    ].join("\r\n");
  }

  return {
    permissionsFor,
    getAbilityProfile,
    updateAbilityProfile,
    listActions,
    createAction,
    updateAction,
    deleteAction,
    submitEvidence,
    listForStudent,
    saveParticipation,
    createDraft,
    createLegacyPublished: (user, input) => createDraft(user, input, true),
    updateDraft,
    submitOpportunity,
    reviewOpportunity,
    listForStaff,
    setOpportunityStatus,
    listEvidenceQueue,
    reviewEvidence,
    listNotifications,
    markNotification,
    dashboard,
    cohortInsights,
    calendar,
  };
}
