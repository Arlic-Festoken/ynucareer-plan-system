import { describe, expect, it } from "vitest";
import type { ActionItem } from "../domain";
import {
  composeActionDetail,
  mergeActionDetail,
  normalizeActionHours,
  parseActionDetail,
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

  it("round-trips the editable time and completion fields", () => {
    const detail = composeActionDetail("先完成数据清洗，再记录三个发现。", 3.25, "提交一份可复核的分析报告。");
    expect(detail).toContain("投入时间：3.5 小时");
    expect(parseActionDetail(detail)).toEqual({
      description: "先完成数据清洗，再记录三个发现。",
      investedHours: 3.5,
      completionStandard: "提交一份可复核的分析报告。",
    });
    expect(presentAction(action({ detail })).timebox).toBe("3.5 小时");
    expect(presentAction(action({ detail })).completionStandard).toBe("提交一份可复核的分析报告。");
  });

  it("keeps legacy AI detail markers readable and rejects invalid time", () => {
    const legacy = "先完成数据清洗。\n\n投入时间：4 小时\n完成标准：提交一份报告。";
    expect(parseActionDetail(legacy)).toEqual({
      description: "先完成数据清洗。",
      investedHours: 4,
      completionStandard: "提交一份报告。",
    });
    expect(normalizeActionHours(0)).toBeNull();
    expect(normalizeActionHours(0.1)).toBeNull();
    expect(normalizeActionHours("not-a-number")).toBeNull();
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
});
