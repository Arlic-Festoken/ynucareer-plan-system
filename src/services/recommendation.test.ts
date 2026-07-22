import { describe, expect, it } from "vitest";
import { blankAbilities, jobs } from "../data/catalog";
import type { CareerProfile } from "../domain";
import { buildGraduateTimeline, buildPathwayTasks, buildRoadmap, calculateMatch, mapResearchEvidence, recommendDirections } from "./recommendation";

const profile: CareerProfile = {
  id: "test",
  role: "junior",
  grade: 3,
  major: "计算机科学与技术",
  targetPath: "employment",
  interests: ["人工智能", "数据与商业"],
  values: ["技术精进", "创造价值"],
  abilityScores: { ...blankAbilities, programming: 78, projectExperience: 52 },
};

describe("recommendation service", () => {
  it("ranks directions from stated interests and values", () => {
    expect(recommendDirections(profile)[0]?.id).toBe("ai-builder");
  });

  it("returns a bounded and explainable job diagnosis", () => {
    const result = calculateMatch(profile, jobs[1]);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.gaps[0]?.gap).toBeGreaterThanOrEqual(result.gaps[1]?.gap ?? 0);
    expect(result.explanation).toContain("AI 应用开发工程师");
  });

  it("turns a diagnosis into executable semester tasks", () => {
    const diagnosis = calculateMatch(profile, jobs[0]);
    const tasks = buildRoadmap(profile, diagnosis);
    expect(tasks.length).toBeGreaterThanOrEqual(4);
    expect(tasks.every((task) => task.id && task.semester && !task.completed)).toBe(true);
  });

  it("produces concrete guidance for non-employment paths", () => {
    expect(buildPathwayTasks("postgraduate").map((task) => task.title)).toContain("确定目标院校与参考书");
  });

  it("maps research outcomes into seven-dimensional evidence", () => {
    const result = mapResearchEvidence([{ id: "paper-1", type: "paper", title: "学习行为预测研究" }]);
    expect(result.scores.professionalFoundation).toBeGreaterThan(62);
    expect(result.evidence[0]).toContain("学习行为预测研究");
  });

  it("builds both research and career lanes", () => {
    const timeline = buildGraduateTimeline("学习分析", "教育科技", []);
    expect(timeline.researchTasks).toHaveLength(3);
    expect(timeline.careerTasks).toHaveLength(3);
  });
});
