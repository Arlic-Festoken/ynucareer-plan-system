export const abilityKeys = [
  "professionalFoundation",
  "programming",
  "dataAnalysis",
  "projectExperience",
  "communication",
  "industryKnowledge",
  "careerPlanning",
] as const;

export type AbilityKey = (typeof abilityKeys)[number];
export type AbilityScores = Record<AbilityKey, number>;

export type UserRole = "freshman" | "junior" | "graduate" | "teacher";
export type Pathway = "employment" | "recommendation" | "postgraduate" | "civil-service";
export type StudyStage = "exploration" | "decision" | "research";

export type CareerProfile = {
  id: string;
  role: UserRole;
  grade: number;
  major: string;
  targetPath: Pathway;
  interests: string[];
  values: string[];
  abilityScores: AbilityScores;
};

export type ActionTask = {
  id: string;
  title: string;
  detail: string;
  category: "course" | "project" | "practice" | "reflection" | "research" | "career";
  priority: "high" | "medium" | "low";
  semester: string;
  completed: boolean;
  reflection?: string;
  evidence?: string[];
};

export type Direction = {
  id: string;
  title: string;
  summary: string;
  interests: string[];
  values: string[];
  starterTasks: Omit<ActionTask, "id" | "completed" | "semester">[];
};

export type JobProfile = {
  id: string;
  title: string;
  industry: string;
  description: string;
  requiredAbilities: AbilityScores;
  weights: Partial<Record<AbilityKey, number>>;
  resources: string[];
};

export type AbilityGap = {
  ability: AbilityKey;
  current: number;
  required: number;
  gap: number;
  impact: "high" | "medium" | "low";
  explanation: string;
};

export type MatchDiagnosis = {
  job: JobProfile;
  score: number;
  benchmark: "起步" | "成长" | "准备度较高" | "优势明显";
  gaps: AbilityGap[];
  explanation: string;
};

export type ResearchOutcome = {
  id: string;
  type: "paper" | "patent" | "project" | "competition";
  title: string;
};

export type ResearchState = {
  focus: string;
  industry: string;
  outcomes: ResearchOutcome[];
  researchTasks: ActionTask[];
  careerTasks: ActionTask[];
};

export type AwakeningState = {
  activeStep: number;
  motivation: Record<string, number>;
  visionText: string;
  visionTags: string[];
  selectedDirectionId: string | null;
  actionTasks: ActionTask[];
  reflection: string;
};

export type AiDirectionCandidate = {
  id: string;
  title: string;
  specialization: string;
  fit: "优先验证" | "值得比较" | "探索备选";
  rationale: string;
  problemExamples: string[];
  evidenceNeeded: string[];
  tradeoffs: string;
  firstExperiment: {
    title: string;
    detail: string;
    successSignal: string;
  };
};

export type AiDirectionResult = {
  overview: string;
  candidates: AiDirectionCandidate[];
  reflectionQuestion: string;
};

export type AiActionPlan = {
  directionTitle: string;
  objective: string;
  strategy: string;
  tasks: Array<{
    title: string;
    detail: string;
    week: string;
    evidence: string;
    priority: ActionTask["priority"];
    category: ActionTask["category"];
  }>;
  checkpoints: Array<{ week: string; question: string }>;
  risks: string[];
};

export type AiPlanningState = {
  preferredScenes: string[];
  strengthEvidence: string;
  constraints: string;
  timeBudgetHours: number;
  horizonWeeks: number;
  directionResult: AiDirectionResult | null;
  selectedCandidateId: string | null;
  actionPlan: AiActionPlan | null;
  generatedAt: string | null;
};

export type CareerStateData = {
  hasOnboarded: boolean;
  profile: CareerProfile;
  awakening: AwakeningState;
  selectedJobId: string;
  roadmapTasks: ActionTask[];
  research: ResearchState;
  aiPlanning: AiPlanningState;
};
