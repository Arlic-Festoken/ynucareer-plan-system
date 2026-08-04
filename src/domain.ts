export const abilityKeys = [
  "communicationCollaboration",
  "innovativeThinking",
  "professionalSkills",
  "digitalLiteracy",
  "responsibility",
  "continuousLearning",
  "resilience",
] as const;

export type AbilityKey = (typeof abilityKeys)[number];
export type AbilityDimension = AbilityKey;
export type AbilityScores = Record<AbilityKey, number>;
export type AbilityConfidence = "low" | "medium" | "high";

export type AbilityProfile = {
  selfRating: AbilityScores;
  verifiedScore: AbilityScores;
  combinedScore: AbilityScores;
  evidenceCounts: Record<AbilityKey, number>;
  confidence: AbilityConfidence;
  legacyNeedsReview: boolean;
  updatedAt: string;
};

export type UserRole = "freshman" | "junior" | "graduate" | "teacher";
export type Pathway = "employment" | "recommendation" | "postgraduate" | "civil-service";
export type StudyStage = "exploration" | "decision" | "research";
export type Permission = "publish_opportunity" | "review_opportunity" | "review_evidence" | "view_insights" | "manage_members";

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
  estimatedHours?: number;
  reflection?: string;
  evidence?: string[];
  opportunityId?: string;
  opportunityTitle?: string;
  sourceUrl?: string;
  dueDate?: string;
  provenance?: GenerationTrace;
};

export type ActionItemStatus = "planned" | "in_progress" | "submitted" | "completed" | "changes_requested";
export type ActionItemSource = "manual" | "rule" | "ai" | "opportunity" | "research";
export type GenerationTrace = {
  generator: "rule" | "ai" | "opportunity" | "manual" | "research";
  promptVersion: string;
  ruleVersion: string;
  model: string;
  generatedAt: string;
  resourceIds: string[];
  autonomous: boolean;
  taskPriority?: ActionTask["priority"];
};

export type ActionItem = {
  id: string;
  title: string;
  detail: string;
  category: ActionTask["category"];
  priority: ActionTask["priority"];
  lane: "exploration" | "growth" | "research" | "career";
  source: ActionItemSource;
  sourceId: string;
  status: ActionItemStatus;
  dueDate: string;
  reflection: string;
  trace: GenerationTrace;
  createdAt: string;
  updatedAt: string;
};

export type OpportunityType = "course" | "project" | "competition" | "internship" | "consultation" | "research" | "event";
export type OpportunityWorkflowStatus = "draft" | "pending_review" | "published" | "closed" | "archived" | "expired";
export type ParticipationStatus = "saved" | "applied" | "in_progress" | "submitted" | "changes_requested" | "verified" | "withdrawn";
export type OpportunityParticipationStatus = ParticipationStatus;

export type OpportunityEligibility = {
  stages: Array<Exclude<UserRole, "teacher">>;
  pathways: Pathway[];
  majors: string[];
};

export type OpportunityParticipation = {
  status: ParticipationStatus;
  evidenceNote: string;
  evidenceUrl: string;
  reflection: string;
  reviewerFeedback: string;
  updatedAt: string;
};

export type CampusOpportunity = {
  id: string;
  title: string;
  summary: string;
  type: OpportunityType;
  provider: string;
  organizationId: string;
  organizationName: string;
  sourceUrl: string;
  applicationUrl: string;
  deadline: string;
  location: string;
  deliveryMode: "online" | "offline" | "hybrid";
  capacity: number | null;
  evidenceRequirement: string;
  abilityDimensions: AbilityDimension[];
  eligibility: OpportunityEligibility;
  tags: string[];
  status: OpportunityWorkflowStatus;
  reviewNote: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  participation?: OpportunityParticipation | null;
};

export type EvidenceStatus = "submitted" | "changes_requested" | "verified";

export type EvidenceRecord = {
  id: string;
  actionItemId: string;
  opportunityId: string;
  title: string;
  description: string;
  evidenceUrl: string;
  reflection: string;
  status: EvidenceStatus;
  rubric: Partial<Record<AbilityDimension, { score: number; weight: number }>>;
  reviewerFeedback: string;
  anonymousStudentCode: string;
  submittedAt: string;
  reviewedAt: string;
};

export type NotificationItem = {
  id: string;
  type: "deadline" | "changes_requested" | "evidence_verified";
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
};

export type DashboardAction = {
  id: string;
  title: string;
  detail: string;
  reason: string;
  href: string;
  dueDate: string;
  priority: number;
  status: ActionItemStatus | ParticipationStatus;
};

export type CohortInsights = {
  suppressed: boolean;
  sampleSize: number;
  threshold: number;
  funnel: { saved: number; applied: number; submitted: number; verified: number };
  commonAbilityGaps: Array<{ ability: AbilityDimension; average: number }>;
  resourceDemand: Array<{ type: OpportunityType; count: number }>;
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
    estimatedHours?: number;
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
  generationTrace: GenerationTrace | null;
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
