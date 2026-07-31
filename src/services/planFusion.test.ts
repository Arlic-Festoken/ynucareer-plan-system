import { describe, expect, it } from "vitest";
import type { ActionTask } from "../domain";
import { mergeAiPrimaryPlan } from "./planFusion";

function task(overrides: Partial<ActionTask> & Pick<ActionTask, "id" | "title">): ActionTask {
  return {
    detail: "",
    category: "project",
    priority: "medium",
    semester: "本学期",
    completed: false,
    ...overrides,
  };
}

describe("AI-primary plan fusion", () => {
  it("replaces an unfinished exploration task when the AI plan covers the same goal", () => {
    const ai = task({
      id: "ai-plan-data-1",
      title: "完成公开数据清洗与分析",
      detail: "清洗一份公开数据并形成三项分析发现。",
    });
    const exploration = task({
      id: "explore-data",
      title: "完成校园数据可视化",
      detail: "从公开数据中提出一个问题并制作可复用图表。",
    });

    const result = mergeAiPrimaryPlan([ai], [exploration]);

    expect(result.tasks).toEqual([ai]);
    expect(result.summary).toMatchObject({
      aiCount: 1,
      retainedExplorationCount: 0,
      replacedCount: 1,
    });
  });

  it("keeps a non-overlapping exploration validation after the AI main line", () => {
    const ai = task({
      id: "ai-plan-data-1",
      title: "完成公开数据清洗与分析",
      detail: "清洗一份公开数据并形成三项分析发现。",
    });
    const exploration = task({
      id: "explore-prototype",
      title: "制作低保真原型",
      detail: "将一个学习场景绘制为三页可讲述的交互原型。",
    });

    const result = mergeAiPrimaryPlan([ai], [exploration]);

    expect(result.tasks.map((item) => item.id)).toEqual(["ai-plan-data-1", "explore-prototype"]);
    expect(result.summary.retainedExplorationCount).toBe(1);
    expect(result.summary.replacedCount).toBe(0);
  });

  it("preserves completed exploration history even when the AI plan supersedes its goal", () => {
    const ai = task({
      id: "ai-plan-data-1",
      title: "完成公开数据清洗与分析",
      detail: "清洗一份公开数据并形成三项分析发现。",
    });
    const exploration = task({
      id: "explore-data",
      title: "完成校园数据可视化",
      detail: "从公开数据中提出一个问题并制作可复用图表。",
      completed: true,
      reflection: "我更喜欢解释真实问题，而不是只画图。",
      evidence: ["校园数据图表"],
    });

    const result = mergeAiPrimaryPlan([ai], [exploration]);

    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0]).toMatchObject({
      id: "ai-plan-data-1",
      completed: true,
      reflection: "我更喜欢解释真实问题，而不是只画图。",
      evidence: expect.arrayContaining(["校园数据图表"]),
    });
    expect(result.tasks[1]).toEqual(exploration);
    expect(result.summary).toMatchObject({
      replacedCount: 1,
      preservedHistoryCount: 1,
      progressMigratedCount: 1,
    });
  });

  it("preserves progress across repeated saves without duplicating AI tasks", () => {
    const ai = task({
      id: "ai-plan-data-1",
      title: "完成公开数据清洗与分析",
      detail: "更新后的执行说明。",
    });
    const saved = task({
      id: "ai-plan-data-1",
      title: "完成公开数据清洗与分析",
      detail: "旧说明。",
      completed: true,
      reflection: "已完成第一轮。",
      evidence: ["分析报告"],
    });

    const result = mergeAiPrimaryPlan([ai], [saved]);

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]).toMatchObject({
      id: "ai-plan-data-1",
      detail: "更新后的执行说明。",
      completed: true,
      reflection: "已完成第一轮。",
      evidence: ["分析报告"],
    });
    expect(result.summary.progressMigratedCount).toBe(1);
  });

  it("migrates one completed exploration record to only its best matching AI task", () => {
    const aiProject = task({
      id: "ai-plan-api-1",
      title: "完成一个 AI API 调用小作品",
      detail: "实现输入、模型调用和结果展示。",
    });
    const aiTest = task({
      id: "ai-plan-api-2",
      title: "完成一次用户测试并整理结论",
      detail: "邀请一名同学试用并完成一次修正。",
      category: "practice",
    });
    const exploration = task({
      id: "explore-api",
      title: "完成一个 API 调用小作品",
      detail: "选择校园问答或学习辅助场景，记录问题、方案和结果。",
      completed: true,
    });

    const result = mergeAiPrimaryPlan([aiProject, aiTest], [exploration]);

    expect(result.tasks.find((item) => item.id === "ai-plan-api-1")?.completed).toBe(true);
    expect(result.tasks.find((item) => item.id === "ai-plan-api-2")?.completed).toBe(false);
    expect(result.summary.progressMigratedCount).toBe(1);
  });
});
