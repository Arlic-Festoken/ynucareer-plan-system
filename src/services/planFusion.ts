import type { ActionTask } from "../domain";

export type PlanFusionSummary = {
  aiCount: number;
  retainedExplorationCount: number;
  replacedCount: number;
  preservedHistoryCount: number;
  progressMigratedCount: number;
};

export type PlanFusionResult = {
  tasks: ActionTask[];
  summary: PlanFusionSummary;
};

const intentTerms = {
  ai: ["ai", "api", "大模型", "模型", "智能"],
  data: ["数据", "sql", "查询", "清洗", "指标", "可视化", "分析"],
  product: ["产品", "原型", "交互", "功能"],
  scene: ["场景", "观察", "用户", "需求", "问题"],
  learning: ["学习", "课程", "基础", "练习"],
  artifact: ["作品", "项目", "实验", "成果", "报告", "图表"],
  reflection: ["案例", "拆解", "复盘", "反思", "对照"],
} as const;

function normalized(task: ActionTask) {
  return `${task.title}${task.detail}`.toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function intents(task: ActionTask) {
  const text = normalized(task);
  return new Set(Object.entries(intentTerms)
    .filter(([, terms]) => terms.some((term) => text.includes(term)))
    .map(([intent]) => intent));
}

function bigrams(value: string) {
  const result = new Set<string>();
  for (let index = 0; index < value.length - 1; index += 1) result.add(value.slice(index, index + 2));
  return result;
}

function lexicalSimilarity(left: ActionTask, right: ActionTask) {
  const leftPairs = bigrams(normalized(left));
  const rightPairs = bigrams(normalized(right));
  if (!leftPairs.size || !rightPairs.size) return 0;
  const shared = [...leftPairs].filter((pair) => rightPairs.has(pair)).length;
  return shared / Math.min(leftPairs.size, rightPairs.size);
}

function categoriesCompatible(left: ActionTask, right: ActionTask) {
  if (left.category === right.category) return true;
  return ["project", "practice"].includes(left.category) && ["project", "practice"].includes(right.category);
}

function matchStrength(left: ActionTask, right: ActionTask) {
  const leftText = normalized(left);
  const rightText = normalized(right);
  if (left.id === right.id) return 2;
  if (leftText.includes(rightText) || rightText.includes(leftText)) return 1;
  if (!categoriesCompatible(left, right)) return 0;

  const leftIntents = intents(left);
  const rightIntents = intents(right);
  const shared = [...leftIntents].filter((intent) => rightIntents.has(intent));
  const intentScore = shared.reduce((score, intent) => Math.max(score,
    intent === "ai" || intent === "data" ? 0.74
      : intent === "product" ? 0.68
        : intent === "scene" ? 0.58
          : 0), 0);
  return Math.max(intentScore, lexicalSimilarity(left, right));
}

export function tasksCoverSameGoal(left: ActionTask, right: ActionTask) {
  return matchStrength(left, right) >= 0.56;
}

function isAiTask(task: ActionTask) {
  return task.id.startsWith("ai-plan-");
}

function hasHistory(task: ActionTask, includeEvidence = true) {
  return task.completed
    || Boolean(task.reflection?.trim())
    || (includeEvidence && Boolean(task.evidence?.length));
}

function mergeProgress(task: ActionTask, previous: ActionTask[]) {
  const progressed = previous.filter((item) => hasHistory(item, !isAiTask(item)));
  if (!progressed.length) return { task, migrated: false };
  const evidence = [...new Set([
    ...(task.evidence || []),
    ...progressed.flatMap((item) => item.evidence || []),
  ])];
  const reflection = progressed.map((item) => item.reflection?.trim()).find(Boolean);
  return {
    task: {
      ...task,
      completed: task.completed || progressed.some((item) => item.completed),
      reflection: reflection || task.reflection,
      evidence: evidence.length ? evidence : task.evidence,
    },
    migrated: true,
  };
}

export function mergeAiPrimaryPlan(aiTasks: ActionTask[], existingTasks: ActionTask[]): PlanFusionResult {
  const previousAi = existingTasks.filter(isAiTask);
  const exploration = existingTasks.filter((task) => !isAiTask(task));
  let progressMigratedCount = 0;
  const assignedPrevious = new Map<number, ActionTask[]>();
  [...previousAi, ...exploration].forEach((existing) => {
    const best = aiTasks
      .map((task, index) => ({ index, score: matchStrength(task, existing) }))
      .filter((candidate) => candidate.score >= 0.56)
      .sort((left, right) => right.score - left.score || left.index - right.index)[0];
    if (best) assignedPrevious.set(best.index, [...(assignedPrevious.get(best.index) || []), existing]);
  });

  const primary = aiTasks.map((task, index) => {
    const merged = mergeProgress(task, assignedPrevious.get(index) || []);
    if (merged.migrated) progressMigratedCount += 1;
    return merged.task;
  });

  const matchedAiIds = new Set(previousAi
    .filter((item) => aiTasks.some((task) =>
      item.id === task.id || normalized(item) === normalized(task) || tasksCoverSameGoal(task, item)))
    .map((item) => item.id));
  const replacedExplorationIds = new Set(exploration
    .filter((item) => aiTasks.some((task) => tasksCoverSameGoal(task, item)))
    .map((item) => item.id));
  const retainedExploration = exploration.filter((item) =>
    !replacedExplorationIds.has(item.id) || hasHistory(item));
  const unmatchedAiHistory = previousAi.filter((item) => !matchedAiIds.has(item.id) && hasHistory(item, false));
  const historyIds = new Set([
    ...retainedExploration.filter((item) => replacedExplorationIds.has(item.id) && hasHistory(item)).map((item) => item.id),
    ...unmatchedAiHistory.map((item) => item.id),
  ]);

  return {
    tasks: [...primary, ...retainedExploration, ...unmatchedAiHistory],
    summary: {
      aiCount: primary.length,
      retainedExplorationCount: retainedExploration.length,
      replacedCount: replacedExplorationIds.size,
      preservedHistoryCount: historyIds.size,
      progressMigratedCount,
    },
  };
}
