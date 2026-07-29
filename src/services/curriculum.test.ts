import { describe, expect, it } from "vitest";
import { buildSampleCurriculum, parseCurriculum } from "./curriculum";

describe("curriculum import", () => {
  it("parses a quoted CSV and infers progress from the current grade", () => {
    const plan = parseCurriculum(`课程名称,学期,学分,课程性质,状态,成绩
"高等数学 A1",第 1 学期,5,专业基础,,88
"机器学习",第 6 学期,3,专业方向,,`, {
      fileName: "培养方案.csv",
      major: "计算机科学与技术",
      currentGrade: 2,
      now: "2026-07-29T00:00:00.000Z",
    });
    expect(plan.courses).toHaveLength(2);
    expect(plan.courses[0]).toMatchObject({ name: "高等数学 A1", status: "completed", score: 88 });
    expect(plan.courses[1]).toMatchObject({ name: "机器学习", status: "planned" });
  });

  it("accepts Chinese JSON field names", () => {
    const plan = parseCurriculum(JSON.stringify([{ 课程名称: "线性代数", 学期: "第 2 学期", 学分: 3, 状态: "已修" }]), {
      fileName: "plan.json",
      major: "软件工程",
      currentGrade: 2,
    });
    expect(plan.courses[0]).toMatchObject({ name: "线性代数", credits: 3, status: "completed" });
  });

  it("provides a complete computer-science sample for one-click exploration", () => {
    const plan = buildSampleCurriculum("计算机科学与技术", 2, "2026-07-29T00:00:00.000Z");
    expect(plan.courses.length).toBeGreaterThan(12);
    expect(plan.courses.some((course) => course.name === "深度学习")).toBe(true);
  });

  it("rejects a delimited file without a course-name column", () => {
    expect(() => parseCurriculum("编号,学分\n1,3", { fileName: "bad.csv", major: "计算机科学与技术", currentGrade: 2 }))
      .toThrow("课程名称");
  });
});
