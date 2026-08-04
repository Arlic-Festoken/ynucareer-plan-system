import { describe, expect, it } from "vitest";
import type { LearningPathInputs } from "../domain";
import { buildSampleCurriculum } from "./curriculum";
import { buildAlgorithmLearningPath, diagnoseGraduateRoute, learningPathToTasks } from "./learningPath";

const baseInputs: LearningPathInputs = {
  targetRole: "算法工程师",
  gpa: 3.7,
  gpaScale: 4,
  rankPercentile: 12,
  routePreference: "dual",
  weeklyHours: 10,
  researchExperience: "none",
  englishLevel: "cet4",
};

describe("curriculum-aware algorithm path", () => {
  it("uses GPA and rank to recommend a recommendation-first route without promising eligibility", () => {
    expect(diagnoseGraduateRoute(baseInputs)).toMatchObject({
      route: "recommendation_first",
      label: "保研主线，考研保底",
      confidence: "medium",
    });
  });

  it("moves to postgraduate-first when the current evidence is weaker", () => {
    expect(diagnoseGraduateRoute({ ...baseInputs, gpa: 2.8, rankPercentile: 45 })).toMatchObject({
      route: "postgraduate_first",
    });
  });

  it("does not claim a recommendation-first route when professional rank is missing", () => {
    expect(diagnoseGraduateRoute({ ...baseInputs, routePreference: "recommendation", rankPercentile: null }).route)
      .toBe("dual_track");
  });

  it("matches completed math courses and builds prerequisite edges", () => {
    const plan = buildAlgorithmLearningPath({
      inputs: baseInputs,
      curriculum: buildSampleCurriculum("计算机科学与技术", 2, "2026-07-29T00:00:00.000Z"),
      grade: 2,
      major: "计算机科学与技术",
      now: "2026-07-29T00:00:00.000Z",
    });
    const math = plan.nodes.find((node) => node.id === "math-bridge");
    expect(math?.title).toContain("迁移到机器学习");
    expect(math?.courseMatches).toEqual(expect.arrayContaining(["高等数学 A1", "线性代数"]));
    expect(plan.edges).toContainEqual({ from: "ml-foundation", to: "deep-learning" });
    expect(plan.resources.find((resource) => resource.id === "dls")?.url).toMatch(/^https:\/\//);
    expect(plan.assumptions.join("")).toContain("不代表获得资格");
  });

  it("turns near-term graph nodes into evidence-oriented action tasks", () => {
    const plan = buildAlgorithmLearningPath({ inputs: baseInputs, curriculum: null, grade: 2, major: "计算机科学与技术" });
    const tasks = learningPathToTasks(plan);
    expect(tasks.length).toBeGreaterThan(3);
    expect(tasks[0].detail).toContain("完成标准");
    expect(tasks[0].provenance).toMatchObject({ ruleVersion: "algorithm-path-v1", autonomous: true });
  });
});
