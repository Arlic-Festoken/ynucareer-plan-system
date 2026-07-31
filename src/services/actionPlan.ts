import type { ActionItem, ActionTask } from "../domain";

export type ActionPlanPresentation = {
  description: string;
  steps: [string, string, string];
  completionStandard: string;
  timebox: string;
  scheduleLabel: string;
  sourceLabel: string;
  isOverdue: boolean;
};

export type ActionPlanSummary = {
  total: number;
  active: number;
  submitted: number;
  completed: number;
};

const categoryGuides: Record<ActionTask["category"], Pick<ActionPlanPresentation, "steps" | "completionStandard" | "timebox">> = {
  course: {
    steps: ["圈定一个要掌握的知识点和参考材料", "完成学习并把关键方法整理成自己的话", "用练习、讲解或一页笔记检验理解"],
    completionStandard: "留下可回看的学习笔记、练习结果或知识卡。",
    timebox: "2 × 45 分钟",
  },
  project: {
    steps: ["写清问题、使用者和本次最小范围", "完成一个可运行或可展示的版本", "整理说明，并根据一次反馈修正"],
    completionStandard: "形成可展示的版本、链接或项目说明。",
    timebox: "2–3 次深度工作",
  },
  practice: {
    steps: ["确认场景、规则和本次观察重点", "完成一次真实操作并记录过程", "整理结果、问题和下一次改进"],
    completionStandard: "留下过程记录和一项可复用的结论。",
    timebox: "60–90 分钟",
  },
  reflection: {
    steps: ["回看本次行动的目标和实际过程", "写下证据、偏差与仍不确定的地方", "确定下一项继续、调整或停止的动作"],
    completionStandard: "形成一段有证据、有判断、有下一步的复盘。",
    timebox: "30 分钟",
  },
  research: {
    steps: ["明确研究问题和本次资料边界", "完成检索、分析或实验记录", "整理发现、限制与下一轮假设"],
    completionStandard: "留下可追溯的资料、数据或实验记录。",
    timebox: "2–4 小时",
  },
  career: {
    steps: ["选定一个公开目标作为参照", "对照要求与现有证据，标出关键差距", "把最大差距改写成下一项可执行行动"],
    completionStandard: "形成一份有来源的能力对照或决策记录。",
    timebox: "60–120 分钟",
  },
};

const sourceLabels: Record<ActionItem["source"], string> = {
  manual: "自主添加",
  rule: "规则计划",
  ai: "AI 规划",
  opportunity: "校内资源",
  research: "研究计划",
};

function dateValue(value: string) {
  return value ? Date.parse(`${value}T00:00:00Z`) : Number.POSITIVE_INFINITY;
}

function schedule(dueDate: string, today: Date) {
  if (!dueDate) return { label: "待安排", overdue: false };
  const [, month, day] = dueDate.split("-").map(Number);
  const overdue = dateValue(dueDate) < Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return { label: `${month}月${day}日${overdue ? "已到期" : "截止"}`, overdue };
}

export function mergeActionDetail(detail: string, evidence: string) {
  const suffix = evidence.trim() ? `\n完成标准：${evidence.trim()}` : "";
  return `${detail.trim().slice(0, Math.max(0, 500 - suffix.length))}${suffix}`.slice(0, 500);
}

export function presentAction(action: ActionItem, today = new Date()): ActionPlanPresentation {
  const [description, explicitStandard] = action.detail.split(/\n完成标准：/, 2);
  const guide = categoryGuides[action.category] || categoryGuides.practice;
  const due = schedule(action.dueDate, today);
  return {
    description: description.trim() || action.detail,
    steps: guide.steps,
    completionStandard: explicitStandard?.trim() || guide.completionStandard,
    timebox: guide.timebox,
    scheduleLabel: due.label,
    sourceLabel: sourceLabels[action.source] || "行动计划",
    isOverdue: due.overdue,
  };
}

export function selectFocusAction(actions: ActionItem[], today = new Date()) {
  const todayValue = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const statusRank: Record<ActionItem["status"], number> = {
    changes_requested: 0,
    in_progress: 1,
    planned: 2,
    submitted: 3,
    completed: 4,
  };
  return [...actions]
    .filter((action) => !["submitted", "completed"].includes(action.status))
    .sort((left, right) =>
      statusRank[left.status] - statusRank[right.status]
      || (dateValue(left.dueDate) - todayValue) - (dateValue(right.dueDate) - todayValue)
      || left.createdAt.localeCompare(right.createdAt))[0] ?? null;
}

export function summarizeActions(actions: ActionItem[]): ActionPlanSummary {
  return {
    total: actions.length,
    active: actions.filter((action) => ["in_progress", "changes_requested"].includes(action.status)).length,
    submitted: actions.filter((action) => action.status === "submitted").length,
    completed: actions.filter((action) => action.status === "completed").length,
  };
}

export function groupActionsForPlan(actions: ActionItem[], explorer: boolean): Array<[string, ActionItem[]]> {
  const preferredOrder = ["AI 主线", "保留补充", "历史成果", "自主行动", "校内资源", "成长行动", "科研推进", "职业准备"];
  const groups = new Map<string, ActionItem[]>();
  actions.forEach((action) => {
    const label = action.source === "ai" ? "AI 主线"
      : explorer && action.source === "rule" && action.status === "completed" ? "历史成果"
        : explorer && action.source === "rule" ? "保留补充"
          : action.source === "manual" ? "自主行动"
            : action.source === "opportunity" ? "校内资源"
              : action.lane === "research" ? "科研推进"
                : action.lane === "career" ? "职业准备"
                  : "成长行动";
    groups.set(label, [...(groups.get(label) || []), action]);
  });
  return [...groups.entries()].sort((left, right) =>
    preferredOrder.indexOf(left[0]) - preferredOrder.indexOf(right[0]));
}
