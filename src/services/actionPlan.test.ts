import { describe, expect, it } from "vitest";
import type { ActionItem } from "../domain";
import {
  groupActionsForPlan,
  mergeActionDetail,
  presentAction,
  selectFocusAction,
  summarizeActions,
} from "./actionPlan";

function action(overrides: Partial<ActionItem> = {}): ActionItem {
  return {
    id: "action-1",
    title: "完成岗位能力对照",
    detail: "对照三个公开岗位描述，整理共同能力要求。",
    category: "career",
    priority: "medium",
    lane: "career",
    source: "rule",
    sourceId: "rule-1",
    status: "planned",
    dueDate: "",
    reflection: "",
    trace: {
      generator: "rule",
      promptVersion: "",
      ruleVersion: "career-rules-0.7.0",
      model: "",
      generatedAt: "",
      resourceIds: [],
      autonomous: true,
    },
    createdAt: "2026-07-28T00:00:00.000Z",
    updatedAt: "2026-07-28T00:00:00.000Z",
    ...overrides,
  };
}

describe("action plan presentation", () => {
  it("selects returned work before active and planned work", () => {
    const focus = selectFocusAction([
      action({ id: "planned", status: "planned" }),
      action({ id: "active", status: "in_progress" }),
      action({ id: "returned", status: "changes_requested" }),
    ], new Date("2026-07-28T00:00:00.000Z"));
    expect(focus?.id).toBe("returned");
  });

  it("uses a near due date before an undated planned action", () => {
    const focus = selectFocusAction([
      action({ id: "undated" }),
      action({ id: "dated", dueDate: "2026-07-30" }),
    ], new Date("2026-07-28T00:00:00.000Z"));
    expect(focus?.id).toBe("dated");
  });

  it("creates three explicit steps and a non-fictional schedule label", () => {
    const result = presentAction(
      action({ category: "project", dueDate: "2026-08-15" }),
      new Date("2026-07-28T00:00:00.000Z"),
    );
    expect(result.steps).toHaveLength(3);
    expect(result.scheduleLabel).toBe("8月15日截止");
    expect(result.timebox).toBe("2–3 次深度工作");
    expect(result.sourceLabel).toBe("规则计划");
  });

  it("extracts an AI completion standard from the existing detail field", () => {
    const result = presentAction(action({
      source: "ai",
      detail: "先整理数据，再完成分析。\n完成标准：提交一页含三项发现的报告。",
    }));
    expect(result.description).toBe("先整理数据，再完成分析。");
    expect(result.completionStandard).toBe("提交一页含三项发现的报告。");
  });

  it("summarizes action states without treating review as complete", () => {
    expect(summarizeActions([
      action({ id: "one", status: "in_progress" }),
      action({ id: "two", status: "submitted" }),
      action({ id: "three", status: "completed" }),
    ])).toEqual({ total: 3, active: 1, submitted: 1, completed: 1 });
  });

  it("merges AI evidence into a server-safe detail string", () => {
    const result = mergeActionDetail("准备材料；完成分析；整理结论。", "提交一页成果记录");
    expect(result).toContain("\n完成标准：提交一页成果记录");
    expect(result.length).toBeLessThanOrEqual(500);
  });

  it("presents a low-year fused plan as AI main line, retained support and history", () => {
    const groups = groupActionsForPlan([
      action({ id: "rule-active", lane: "exploration", source: "rule", status: "planned" }),
      action({ id: "rule-done", lane: "exploration", source: "rule", status: "completed" }),
      action({ id: "ai-main", lane: "exploration", source: "ai", status: "planned" }),
    ], true);

    expect(groups.map(([label]) => label)).toEqual(["AI 主线", "保留补充", "历史成果"]);
    expect(groups[0][1].map((item) => item.id)).toEqual(["ai-main"]);
    expect(groups[2][1].map((item) => item.id)).toEqual(["rule-done"]);
  });
});
