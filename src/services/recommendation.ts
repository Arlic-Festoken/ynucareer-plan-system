import { abilityKeys, type AbilityKey, type AbilityScores, type ActionTask, type CareerProfile, type Direction, type JobProfile, type MatchDiagnosis, type ResearchOutcome } from "../domain";
import { abilityLabels, directions, pathwayGuidance } from "../data/catalog";

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export function preserveTaskProgress(nextTasks: ActionTask[], previousTasks: ActionTask[]): ActionTask[] {
  return nextTasks.map((task) => {
    const previous = previousTasks.find((item) => item.title === task.title && item.semester === task.semester);
    return previous ? { ...task, completed: previous.completed, reflection: previous.reflection, evidence: previous.evidence, estimatedHours: previous.estimatedHours } : task;
  });
}

export function recommendDirections(profile: CareerProfile): Direction[] {
  return [...directions]
    .map((direction) => {
      const interestScore = direction.interests.filter((item) => profile.interests.includes(item)).length * 2;
      const valueScore = direction.values.filter((item) => profile.values.includes(item)).length;
      return { direction, score: interestScore + valueScore };
    })
    .sort((left, right) => right.score - left.score || left.direction.title.localeCompare(right.direction.title))
    .map(({ direction }) => direction);
}

export function calculateMatch(profile: CareerProfile, job: JobProfile): MatchDiagnosis {
  const weightedGap = abilityKeys.reduce((total, ability) => {
    const gap = Math.max(0, job.requiredAbilities[ability] - profile.abilityScores[ability]);
    return total + gap * (job.weights[ability] ?? 1);
  }, 0);
  const maxWeightedGap = abilityKeys.reduce((total, ability) => total + 100 * (job.weights[ability] ?? 1), 0);
  const score = Math.max(0, Math.min(100, Math.round((1 - weightedGap / maxWeightedGap) * 100)));
  const gaps = abilityKeys
    .map((ability) => {
      const current = profile.abilityScores[ability];
      const required = job.requiredAbilities[ability];
      const gap = Math.max(0, required - current);
      const impact: "high" | "medium" | "low" = gap >= 18 ? "high" : gap >= 9 ? "medium" : "low";
      return {
        ability,
        current,
        required,
        gap,
        impact,
        explanation:
          gap === 0
            ? `${abilityLabels[ability]}已达到当前岗位画像要求，可继续沉淀为作品或经历证据。`
            : `${job.title}对${abilityLabels[ability]}要求较高，建议优先用课程、项目或实践补齐${gap}分的可展示证据。`,
      };
    })
    .sort((left, right) => right.gap - left.gap);

  const benchmark = score >= 85 ? "优势明显" : score >= 72 ? "准备度较高" : score >= 58 ? "成长" : "起步";
  const priorityGaps = gaps.filter((gap) => gap.gap > 0).slice(0, 2).map((gap) => abilityLabels[gap.ability]);

  return {
    job,
    score,
    benchmark,
    gaps,
    explanation: priorityGaps.length
      ? `当前与${job.title}的规则匹配结果为${score}分，建议先补齐${priorityGaps.join("、")}，并把学习结果沉淀为可验证的作品或经历。`
      : `当前能力画像已覆盖${job.title}的主要要求，下一步应聚焦高质量项目、实习或面试表达。`,
  };
}

export function buildRoadmap(profile: CareerProfile, diagnosis: MatchDiagnosis): ActionTask[] {
  const primaryGaps = diagnosis.gaps.filter((gap) => gap.gap > 0).slice(0, 3);
  const startSemester = profile.grade <= 2 ? "本学期" : "大三上";
  const followSemester = profile.grade <= 2 ? "下学期" : "大三下";
  const finishSemester = profile.grade <= 2 ? "下一学年" : "大四上";

  const gapTasks = primaryGaps.map((gap, index) => ({
    id: makeId("roadmap"),
    title: `补齐${abilityLabels[gap.ability]}`,
    detail: `围绕${diagnosis.job.title}完成一项能够证明${abilityLabels[gap.ability]}的课程或项目产出。`,
    category: index === 0 ? "course" : "project",
    priority: index === 0 ? "high" : "medium",
    semester: index === 0 ? startSemester : followSemester,
    completed: false,
  })) as ActionTask[];

  return [
    ...gapTasks,
    {
      id: makeId("roadmap"),
      title: "形成一份作品或成果说明",
      detail: "使用问题、方法、结果和反思四段式沉淀学习与项目成果。",
      category: "project",
      priority: "high",
      semester: followSemester,
      completed: false,
    },
    {
      id: makeId("roadmap"),
      title: "完成一次求职情境演练",
      detail: "围绕目标路径进行模拟面试、材料修改或阶段复盘。",
      category: "career",
      priority: "medium",
      semester: finishSemester,
      completed: false,
    },
  ];
}

export function buildPathwayTasks(pathway: CareerProfile["targetPath"]): ActionTask[] {
  const guidance = pathwayGuidance[pathway];
  return guidance.tasks.map((title, index) => ({
    id: makeId("path"),
    title,
    detail: guidance.description,
    category: index === 0 ? "career" : "practice",
    priority: index === 0 ? "high" : "medium",
    semester: index === 0 ? "本学期" : "下学期",
    completed: false,
  }));
}

export function buildExplorationTasks(direction: Direction | undefined): ActionTask[] {
  if (!direction) return [];
  return direction.starterTasks.map((task) => ({
    ...task,
    id: makeId("explore"),
    semester: "本学期",
    completed: false,
  }));
}

export function mapResearchEvidence(outcomes: ResearchOutcome[]): { scores: AbilityScores; evidence: string[] } {
  const scores: AbilityScores = {
    communicationCollaboration: 55,
    innovativeThinking: 58,
    professionalSkills: 62,
    digitalLiteracy: 58,
    responsibility: 58,
    continuousLearning: 60,
    resilience: 55,
  };
  const evidence: string[] = [];
  const boosts: Record<ResearchOutcome["type"], Partial<Record<AbilityKey, number>>> = {
    paper: { professionalSkills: 12, innovativeThinking: 8, continuousLearning: 7 },
    patent: { innovativeThinking: 12, professionalSkills: 8, responsibility: 6 },
    project: { communicationCollaboration: 8, professionalSkills: 8, responsibility: 10 },
    competition: { communicationCollaboration: 6, digitalLiteracy: 6, resilience: 8, responsibility: 5 },
  };

  outcomes.forEach((outcome) => {
    Object.entries(boosts[outcome.type]).forEach(([key, boost]) => {
      const ability = key as AbilityKey;
      scores[ability] = Math.min(100, scores[ability] + (boost ?? 0));
    });
    evidence.push(`“${outcome.title}”可作为${outcome.type === "paper" ? "研究深度与数据分析" : outcome.type === "patent" ? "创新转化与工程实践" : outcome.type === "project" ? "项目协作与问题解决" : "综合应用与表达"}的能力证据。`);
  });

  return { scores, evidence: evidence.length ? evidence : ["尚未录入科研成果。添加论文、专利、项目或竞赛后即可生成能力证据链。"] };
}

export function buildGraduateTimeline(focus: string, industry: string, outcomes: ResearchOutcome[]): { researchTasks: ActionTask[]; careerTasks: ActionTask[] } {
  const focusLabel = focus.trim() || "当前研究方向";
  const industryLabel = industry.trim() || "目标产业";
  const outcomeHint = outcomes.length ? "整理已完成成果并提炼能力证据" : "补充一项可公开说明的科研或项目成果";
  return {
    researchTasks: [
      { id: makeId("research"), title: `明确${focusLabel}阶段问题`, detail: "用研究问题、方法、数据与预期产出形成一页研究卡片。", category: "research", priority: "high", semester: "本月", completed: false },
      { id: makeId("research"), title: outcomeHint, detail: "将成果转写为可复用的能力证据和案例材料。", category: "research", priority: "high", semester: "本学期", completed: false },
      { id: makeId("research"), title: "完成一次导师复盘", detail: "同步研究节奏、风险和下一阶段资源需求。", category: "reflection", priority: "medium", semester: "本学期", completed: false },
    ],
    careerTasks: [
      { id: makeId("career"), title: `调研${industryLabel}岗位与场景`, detail: "收集三类目标岗位的职责、能力要求与代表企业。", category: "career", priority: "high", semester: "本月", completed: false },
      { id: makeId("career"), title: "生成科研成果简历证据链", detail: "用问题、贡献、方法、结果和影响五段式描述研究成果。", category: "career", priority: "medium", semester: "本学期", completed: false },
      { id: makeId("career"), title: "完成一次技术交流演练", detail: "面向非本研究方向听众讲清研究价值与产业关联。", category: "practice", priority: "medium", semester: "下学期", completed: false },
    ],
  };
}
