// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createAccountService } from "./account-service.mjs";
import { createDatabase } from "./database.mjs";
import { createOpportunityService } from "./opportunity-service.mjs";

function setup() {
  const database = createDatabase(":memory:");
  let id = 0;
  const now = () => new Date("2026-07-25T08:00:00.000Z");
  const accounts = createAccountService(database, {
    now,
    randomId: () => `user-${++id}`,
    randomToken: () => `session-${id}`,
    teacherEmails: "teacher@ynu.edu.cn",
  });
  const opportunities = createOpportunityService(database, { now, randomId: () => `opportunity-${++id}` });
  return { database, accounts, opportunities };
}

describe("official campus opportunity loop", () => {
  it("limits publishing to configured teachers and lets students save evidence without exposing identities", async () => {
    const { database, accounts, opportunities } = setup();
    const teacher = (await accounts.register({ email: "teacher@ynu.edu.cn", password: "1234567890", displayName: "张老师" })).user;
    const student = (await accounts.register({ email: "student@ynu.edu.cn", password: "1234567890", displayName: "小云" })).user;
    expect(teacher.role).toBe("teacher");
    expect(student.role).toBe("student");

    const opportunity = opportunities.create(teacher, {
      title: "数据分析实践项目招募",
      summary: "完成一份基于校园公开数据的问题分析和可视化成果。",
      provider: "学院实践中心",
      type: "project",
      sourceUrl: "https://example.edu.cn/projects/data",
      applicationUrl: "https://example.edu.cn/projects/data/apply",
      deadline: "2026-08-31",
      eligibility: { stages: ["junior"], pathways: ["employment"], majors: ["数据科学与大数据技术"] },
      tags: ["数据分析", "作品集"],
    });
    expect(opportunity).toMatchObject({ status: "published", provider: "学院实践中心", eligibility: { stages: ["junior"] } });
    expect(() => opportunities.create(student, { ...opportunity, sourceUrl: "https://example.edu.cn/other" })).toThrow("teacher_access_required");

    const initial = opportunities.listForStudent(student);
    expect(initial[0]).toMatchObject({ id: opportunity.id, participation: null });
    const saved = opportunities.saveParticipation(student, opportunity.id, { status: "saved" });
    expect(saved.participation).toMatchObject({ status: "saved", evidenceNote: "" });
    opportunities.saveParticipation(student, opportunity.id, { status: "applied" });
    const submitted = opportunities.saveParticipation(student, opportunity.id, { status: "completed", evidenceNote: "完成校园公开数据看板，并收到一次同伴反馈。" });
    expect(submitted.participation).toMatchObject({ status: "submitted", evidenceNote: "完成校园公开数据看板，并收到一次同伴反馈。" });

    const teacherList = opportunities.listForTeacher(teacher);
    expect(teacherList[0].participationSummary).toEqual({
      opportunityId: opportunity.id,
      saved: 1,
      applied: 1,
      submitted: 1,
      verified: 0,
      completed: 0,
    });
    expect(JSON.stringify(teacherList)).not.toContain("student@ynu.edu.cn");
    expect(() => opportunities.listForTeacher(student)).toThrow("teacher_access_required");
    database.close();
  });

  it("requires an official source and prevents new participation after a resource closes", async () => {
    const { database, accounts, opportunities } = setup();
    const teacher = (await accounts.register({ email: "teacher@ynu.edu.cn", password: "1234567890", displayName: "张老师" })).user;
    const student = (await accounts.register({ email: "student@ynu.edu.cn", password: "1234567890", displayName: "小云" })).user;
    expect(() => opportunities.create(teacher, {
      title: "无来源资源", summary: "说明", provider: "学院", type: "event", sourceUrl: "", applicationUrl: "", deadline: "", eligibility: { stages: [], pathways: [], majors: [] }, tags: [],
    })).toThrow("official_source_required");
    const resource = opportunities.create(teacher, {
      title: "生涯咨询预约", summary: "预约一次针对简历或方向的咨询。", provider: "生涯发展中心", type: "consultation", sourceUrl: "https://example.edu.cn/career", applicationUrl: "", deadline: "", eligibility: { stages: [], pathways: [], majors: [] }, tags: [],
    });
    expect(() => opportunities.saveParticipation(student, resource.id, { status: "completed", evidenceNote: "不应跳过参与步骤" })).toThrow("invalid_participation_transition");
    opportunities.setStatus(teacher, resource.id, { status: "closed" });
    expect(() => opportunities.saveParticipation(student, resource.id, { status: "saved" })).toThrow("opportunity_closed");
    database.close();
  });
});
