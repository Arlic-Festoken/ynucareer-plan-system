export type UserRole = "freshman" | "junior" | "teacher";

export type StudentProfile = {
  id: string;
  name: string;
  grade: number;
  major: string;
  stage: "exploration" | "decision" | "employment";
  careerAwakeningScore: number;
  targetDirections: string[];
  abilityScores: AbilityScores;
};

export type AbilityScores = {
  professionalFoundation: number;
  programming: number;
  dataAnalysis: number;
  projectExperience: number;
  communication: number;
  industryKnowledge: number;
  careerPlanning: number;
};

export type JobProfile = {
  id: string;
  title: string;
  industry: string;
  description: string;
  requiredAbilities: AbilityScores;
  weight: Partial<Record<keyof AbilityScores, number>>;
  recommendedCourses: string[];
  recommendedProjects: string[];
};

export type MatchGap = {
  ability: string;
  current: number;
  required: number;
  gap: number;
  impact: "低" | "中" | "高";
  explanation: string;
};

export type MatchResult = {
  studentId: string;
  jobId: string;
  matchScore: number;
  readinessLevel: "低" | "中" | "中高" | "高";
  percentile: number;
  projectedPercentile: number;
  gaps: MatchGap[];
  summary: string;
};

export type GrowthRoadmap = {
  targetJob: string;
  semesters: {
    name: string;
    goal: string;
    tasks: {
      type: "课程" | "项目" | "竞赛" | "实践" | "求职";
      title: string;
      priority: "高" | "中" | "低";
      expectedOutcome: string;
    }[];
  }[];
};

export type AwakeningStep = {
  step: number;
  title: string;
  subtitle: string;
  description: string;
  interactionType:
    | "card"
    | "graph"
    | "assessment"
    | "vision-board"
    | "direction-generator"
    | "action-plan";
  output: string;
};

export type AdminOverview = {
  pilotStudents: number;
  awakeningAverage: number;
  matchAverage: number;
  commonWeaknesses: string[];
  recommendedCourses: string[];
  interestDistribution: { name: string; value: number }[];
  matchDistribution: { name: string; value: number }[];
  heatmap: { major: string; ability: string; score: number }[];
  suggestions: string[];
};
