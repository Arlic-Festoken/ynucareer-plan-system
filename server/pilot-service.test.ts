// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createAccountService } from "./account-service.mjs";
import { createDatabase } from "./database.mjs";
import { createPilotService } from "./pilot-service.mjs";

function setup(date = "2026-07-26T08:00:00.000Z") {
  const database = createDatabase(":memory:");
  let id = 0;
  const now = () => new Date(date);
  const pilot = createPilotService(database, { now, randomId: () => `pilot-${++id}` });
  const accounts = createAccountService(database, {
    now,
    randomId: () => `user-${++id}`,
    randomToken: () => `token-${id}`,
    teacherEmails: "teacher@ynu.edu.cn",
    permissionResolver: pilot.permissionsFor,
  });
  return { database, pilot, accounts };
}

const draft = {
  title: "校园数据实践项目",
  summary: "完成一次公开数据分析并提交成果说明。",
  provider: "信息学院实践中心",
  type: "project",
  sourceUrl: "https://example.edu.cn/data-project",
  applicationUrl: "https://example.edu.cn/data-project/apply",
  deadline: "2026-08-02",
  location: "呈贡校区",
  deliveryMode: "hybrid",
  capacity: 30,
  evidenceRequirement: "提交公开成果链接、方法说明和复盘。",
  abilityDimensions: ["digitalLiteracy", "responsibility"],
  eligibility: { stages: ["junior"], pathways: ["employment"], majors: [] },
  tags: ["数据分析", "作品集"],
};

describe("school pilot workflow", () => {
  it("reviews an official resource and turns verified evidence into a confidence-aware ability profile", async () => {
    const { database, pilot, accounts } = setup();
    const teacher = (await accounts.register({ email: "teacher@ynu.edu.cn", password: "1234567890", displayName: "资源老师" })).user;
    const student = (await accounts.register({ email: "student@ynu.edu.cn", password: "1234567890", displayName: "云同学" })).user;
    expect(teacher.permissions).toEqual(expect.arrayContaining(["publish_opportunity", "review_evidence", "view_insights"]));
    expect(student.permissions).toEqual([]);

    const resourceDraft = pilot.createDraft(teacher, draft);
    expect(resourceDraft.status).toBe("draft");
    expect(pilot.listForStudent(student)).toEqual([]);
    expect(pilot.submitOpportunity(teacher, resourceDraft.id).status).toBe("pending_review");
    expect(pilot.reviewOpportunity(teacher, resourceDraft.id, { decision: "approved" }).status).toBe("published");

    pilot.updateAbilityProfile(student, { selfRating: { digitalLiteracy: 60, responsibility: 58 } });
    pilot.saveParticipation(student, resourceDraft.id, { status: "saved" });
    pilot.saveParticipation(student, resourceDraft.id, { status: "applied" });
    const submitted = pilot.saveParticipation(student, resourceDraft.id, {
      status: "submitted",
      evidenceNote: "完成公开数据清洗、分析和可视化。",
      evidenceUrl: "https://portfolio.example.edu.cn/data",
      reflection: "需要继续提升指标解释的清晰度。",
    });
    expect(submitted.participation.status).toBe("submitted");

    const queue = pilot.listEvidenceQueue(teacher);
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ anonymousStudentCode: expect.stringMatching(/^学生 /), status: "submitted" });
    expect(JSON.stringify(queue)).not.toContain("student@ynu.edu.cn");
    pilot.reviewEvidence(teacher, queue[0].id, {
      decision: "verified",
      feedback: "成果结构完整，能够说明数据处理过程。",
      rubric: {
        digitalLiteracy: { score: 4, weight: 3 },
        responsibility: { score: 3, weight: 2 },
      },
    });

    const ability = pilot.getAbilityProfile(student);
    expect(ability.combinedScore.digitalLiteracy).toBeGreaterThan(ability.selfRating.digitalLiteracy);
    expect(ability.evidenceCounts.digitalLiteracy).toBe(1);
    expect(ability.confidence).toBe("low");
    expect(pilot.listNotifications(student)[0]).toMatchObject({ type: "evidence_verified", read: false });
    expect(pilot.listActions(student)[0]).toMatchObject({ source: "opportunity", status: "completed" });
    database.close();
  });

  it("enforces transitions, creates deadline reminders and exports a calendar", async () => {
    const { database, pilot, accounts } = setup();
    const teacher = (await accounts.register({ email: "teacher@ynu.edu.cn", password: "1234567890", displayName: "资源老师" })).user;
    const student = (await accounts.register({ email: "student@ynu.edu.cn", password: "1234567890", displayName: "云同学" })).user;
    const opportunity = pilot.createLegacyPublished(teacher, draft);
    expect(() => pilot.saveParticipation(student, opportunity.id, { status: "applied" })).toThrow("invalid_participation_transition");
    pilot.saveParticipation(student, opportunity.id, { status: "saved" });
    expect(pilot.listNotifications(student)[0]).toMatchObject({ type: "deadline", title: expect.stringContaining("即将截止") });
    expect(pilot.calendar(student)).toContain("BEGIN:VCALENDAR");
    expect(pilot.calendar(student)).toContain("20260802");
    expect(database.getOpportunityStats()[0]).toMatchObject({ saved: 1, applied: 0, submitted: 0, verified: 0 });
    database.close();
  });

  it("suppresses cohort details below the privacy threshold", async () => {
    const { database, pilot, accounts } = setup();
    const teacher = (await accounts.register({ email: "teacher@ynu.edu.cn", password: "1234567890", displayName: "资源老师" })).user;
    const student = (await accounts.register({ email: "student@ynu.edu.cn", password: "1234567890", displayName: "云同学" })).user;
    accounts.updateProfile(student.id, { university: "云南大学", college: "信息学院", major: "通信工程", grade: 3 });
    expect(pilot.cohortInsights(teacher)).toMatchObject({ suppressed: true, sampleSize: 1, threshold: 10, commonAbilityGaps: [] });
    database.close();
  });

  it("migrates legacy technical scores as reviewable self-ratings and deduplicates imported actions", async () => {
    const { database, pilot, accounts } = setup();
    const student = (await accounts.register({ email: "legacy@ynu.edu.cn", password: "1234567890", displayName: "旧版同学" })).user;
    accounts.saveCareerState(student.id, {
      profile: {
        abilityScores: {
          communication: 64,
          dataAnalysis: 72,
          projectExperience: 80,
          professionalFoundation: 68,
          programming: 76,
          careerPlanning: 61,
        },
      },
    });

    expect(pilot.getAbilityProfile(student)).toMatchObject({
      legacyNeedsReview: true,
      confidence: "low",
      selfRating: {
        communicationCollaboration: 64,
        innovativeThinking: 76,
        professionalSkills: 72,
        digitalLiteracy: 74,
        responsibility: 80,
        continuousLearning: 61,
        resilience: 50,
      },
    });

    const imported = {
      title: "完成一份可复用的数据作品",
      detail: "保留旧任务来源和完成信息。",
      source: "rule",
      sourceId: "stable-fingerprint",
      category: "project",
      lane: "growth",
      trace: {
        generator: "ai",
        promptVersion: "action-plan-v2",
        ruleVersion: "career-rules-0.7.0",
        model: "test-model",
        generatedAt: "2026-07-26T08:00:00.000Z",
        resourceIds: [],
        autonomous: true,
        internalReasoning: "must-not-persist",
      },
    };
    const first = pilot.createAction(student, imported);
    pilot.updateAction(student, first.id, { status: "completed", reflection: "已经完成复盘。" });
    const second = pilot.createAction(student, { ...imported, title: "完成一份数据作品并公开说明" });
    expect(second.id).toBe(first.id);
    expect(second).toMatchObject({ status: "completed", reflection: "已经完成复盘。", title: "完成一份数据作品并公开说明" });
    expect(second.trace).toMatchObject({ promptVersion: "action-plan-v2", autonomous: true, resourceIds: [] });
    expect(second.trace).not.toHaveProperty("internalReasoning");
    expect(pilot.listActions(student)).toHaveLength(1);
    database.close();
  });

  it("accepts only HTTPS evidence links and rejects duplicate pending submissions", async () => {
    const { database, pilot, accounts } = setup();
    const student = (await accounts.register({ email: "proof@ynu.edu.cn", password: "1234567890", displayName: "成果同学" })).user;
    const action = pilot.createAction(student, {
      title: "完成公开作品",
      detail: "提交公开链接和行动复盘。",
      source: "manual",
      category: "project",
      lane: "growth",
    });
    expect(() => pilot.submitEvidence(student, {
      actionItemId: action.id,
      description: "完成作品",
      reflection: "完成复盘",
      evidenceUrl: "http://example.com/result",
    })).toThrow("invalid_evidence_url");
    pilot.submitEvidence(student, {
      actionItemId: action.id,
      description: "完成作品",
      reflection: "完成复盘",
      evidenceUrl: "https://example.com/result",
    });
    expect(() => pilot.submitEvidence(student, {
      actionItemId: action.id,
      description: "重复提交",
      reflection: "重复复盘",
    })).toThrow("evidence_already_submitted");
    database.close();
  });

  it("keeps publisher and reviewer access inside their organization scope", async () => {
    const { database, pilot, accounts } = setup();
    const publisher = (await accounts.register({ email: "publisher@ynu.edu.cn", password: "1234567890", displayName: "甲学院发布人" })).user;
    const reviewerA = (await accounts.register({ email: "reviewer-a@ynu.edu.cn", password: "1234567890", displayName: "甲学院审核人" })).user;
    const reviewerB = (await accounts.register({ email: "reviewer-b@ynu.edu.cn", password: "1234567890", displayName: "乙学院审核人" })).user;
    const sql = database.sql;
    sql.prepare("INSERT INTO organizations (id, name, parent_id, created_at) VALUES (?, ?, 'ynu', ?)").run("college-a", "甲学院", "2026-07-26T08:00:00.000Z");
    sql.prepare("INSERT INTO organizations (id, name, parent_id, created_at) VALUES (?, ?, 'ynu', ?)").run("college-b", "乙学院", "2026-07-26T08:00:00.000Z");
    sql.prepare("INSERT INTO organization_memberships (user_id, organization_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run(publisher.id, "college-a", "publisher", "2026-07-26T08:00:00.000Z", "2026-07-26T08:00:00.000Z");
    sql.prepare("INSERT INTO organization_memberships (user_id, organization_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run(reviewerA.id, "college-a", "reviewer", "2026-07-26T08:00:00.000Z", "2026-07-26T08:00:00.000Z");
    sql.prepare("INSERT INTO organization_memberships (user_id, organization_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run(reviewerB.id, "college-b", "reviewer", "2026-07-26T08:00:00.000Z", "2026-07-26T08:00:00.000Z");

    const scopedDraft = pilot.createDraft(publisher, { ...draft, organizationId: "college-a", organizationName: "甲学院" });
    pilot.submitOpportunity(publisher, scopedDraft.id);
    expect(() => pilot.reviewOpportunity(reviewerB, scopedDraft.id, { decision: "approved" })).toThrow("organization_scope_required");
    expect(pilot.listForStaff(reviewerB)).toEqual([]);
    expect(pilot.reviewOpportunity(reviewerA, scopedDraft.id, { decision: "approved" })).toMatchObject({ status: "published" });
    database.close();
  });

  it("enforces capacity for new and withdrawn participants", async () => {
    const { database, pilot, accounts } = setup();
    const teacher = (await accounts.register({ email: "teacher@ynu.edu.cn", password: "1234567890", displayName: "资源老师" })).user;
    const first = (await accounts.register({ email: "first@ynu.edu.cn", password: "1234567890", displayName: "第一位" })).user;
    const second = (await accounts.register({ email: "second@ynu.edu.cn", password: "1234567890", displayName: "第二位" })).user;
    const opportunity = pilot.createLegacyPublished(teacher, { ...draft, title: "一对一咨询", capacity: 1 });
    pilot.saveParticipation(first, opportunity.id, { status: "saved" });
    expect(() => pilot.saveParticipation(second, opportunity.id, { status: "saved" })).toThrow("opportunity_full");
    pilot.saveParticipation(first, opportunity.id, { status: "withdrawn" });
    expect(pilot.saveParticipation(second, opportunity.id, { status: "saved" }).participation.status).toBe("saved");
    expect(() => pilot.saveParticipation(first, opportunity.id, { status: "saved" })).toThrow("opportunity_full");
    database.close();
  });

  it("requires five recent verified records across two source types for high confidence", async () => {
    const { database, pilot, accounts } = setup();
    const teacher = (await accounts.register({ email: "teacher@ynu.edu.cn", password: "1234567890", displayName: "资源老师" })).user;
    const student = (await accounts.register({ email: "confidence@ynu.edu.cn", password: "1234567890", displayName: "证据同学" })).user;
    for (let index = 1; index <= 4; index += 1) {
      const action = pilot.createAction(student, {
        title: `自主成果 ${index}`,
        detail: "完成并复盘一项自主实践。",
        source: "manual",
        category: "project",
        lane: "growth",
      });
      pilot.submitEvidence(student, {
        actionItemId: action.id,
        description: `自主成果说明 ${index}`,
        reflection: `自主行动复盘 ${index}`,
      });
    }
    const opportunity = pilot.createLegacyPublished(teacher, { ...draft, title: "第五项校内实践" });
    pilot.saveParticipation(student, opportunity.id, { status: "saved" });
    pilot.saveParticipation(student, opportunity.id, { status: "applied" });
    pilot.saveParticipation(student, opportunity.id, {
      status: "submitted",
      evidenceNote: "完成校内实践成果",
      reflection: "完成一次校内来源的行动复盘",
    });
    const queue = pilot.listEvidenceQueue(teacher).filter((item) => item.status === "submitted");
    expect(queue).toHaveLength(5);
    queue.forEach((item) => pilot.reviewEvidence(teacher, item.id, {
      decision: "verified",
      feedback: "成果已核验。",
      rubric: { continuousLearning: { score: 3, weight: 1 } },
    }));
    expect(pilot.getAbilityProfile(student)).toMatchObject({
      confidence: "high",
      evidenceCounts: { continuousLearning: 5 },
    });
    database.close();
  });
});
