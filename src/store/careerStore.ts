import { create } from "zustand";
import { persist } from "zustand/middleware";
import { blankAbilities } from "../data/catalog";
import type { AbilityScores, ActionTask, CareerProfile, CareerStateData, ResearchOutcome, UserRole } from "../domain";

const defaultProfile: CareerProfile = {
  id: "local-demo-profile",
  role: "freshman",
  grade: 1,
  major: "计算机科学与技术",
  targetPath: "employment",
  interests: ["人工智能"],
  values: ["技术精进"],
  abilityScores: blankAbilities,
};

const defaultData: CareerStateData = {
  hasOnboarded: false,
  profile: defaultProfile,
  awakening: { activeStep: 1, motivation: { curiosity: 3, contribution: 3, achievement: 3, collaboration: 3 }, visionText: "", visionTags: [], selectedDirectionId: null, actionTasks: [], reflection: "" },
  selectedJobId: "data-analyst",
  roadmapTasks: [],
  research: { focus: "", industry: "", outcomes: [], researchTasks: [], careerTasks: [] },
  aiPlanning: {
    preferredScenes: [],
    strengthEvidence: "",
    constraints: "",
    timeBudgetHours: 6,
    horizonWeeks: 8,
    directionResult: null,
    selectedCandidateId: null,
    actionPlan: null,
    generatedAt: null,
    generationTrace: null,
  },
};

type CareerStore = CareerStateData & {
  completeOnboarding: (profile: CareerProfile) => void;
  updateProfile: (patch: Partial<CareerProfile>) => void;
  setAwakening: (patch: Partial<CareerStateData["awakening"]>) => void;
  setSelectedJobId: (id: string) => void;
  setRoadmapTasks: (tasks: ActionTask[]) => void;
  updateRoadmapTask: (id: string, patch: Partial<ActionTask>) => void;
  addRoadmapTask: (task: ActionTask) => void;
  setResearch: (patch: Partial<CareerStateData["research"]>) => void;
  setAiPlanning: (patch: Partial<CareerStateData["aiPlanning"]>) => void;
  addResearchOutcome: (outcome: ResearchOutcome) => void;
  removeResearchOutcome: (id: string) => void;
  updateResearchTask: (lane: "researchTasks" | "careerTasks", id: string, patch: Partial<ActionTask>) => void;
  replaceCareerData: (data: unknown) => void;
  resetDemo: () => void;
};

const updateTask = (tasks: ActionTask[], id: string, patch: Partial<ActionTask>) => tasks.map((task) => (task.id === id ? { ...task, ...patch } : task));

type LegacyAbilityScores = Partial<Record<
  "professionalFoundation" | "programming" | "dataAnalysis" | "projectExperience" | "communication" | "industryKnowledge" | "careerPlanning",
  number
>>;

const boundedScore = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : fallback;
};

export function migrateAbilityScores(input: unknown): AbilityScores {
  const source = input && typeof input === "object" ? input as Partial<AbilityScores> & LegacyAbilityScores : {};
  const hasCurrentModel = ["communicationCollaboration", "innovativeThinking", "professionalSkills", "digitalLiteracy", "responsibility", "continuousLearning", "resilience"]
    .some((key) => key in source);
  if (hasCurrentModel) {
    return Object.fromEntries(Object.entries(blankAbilities).map(([key, fallback]) => [
      key,
      boundedScore(source[key as keyof AbilityScores], fallback),
    ])) as AbilityScores;
  }
  const average = (...values: Array<number | undefined>) => {
    const valid = values.filter((value): value is number => Number.isFinite(value));
    return valid.length ? Math.round(valid.reduce((total, value) => total + value, 0) / valid.length) : 50;
  };
  return {
    communicationCollaboration: boundedScore(source.communication, blankAbilities.communicationCollaboration),
    innovativeThinking: boundedScore(average(source.dataAnalysis, source.projectExperience), blankAbilities.innovativeThinking),
    professionalSkills: boundedScore(average(source.professionalFoundation, source.programming), blankAbilities.professionalSkills),
    digitalLiteracy: boundedScore(average(source.programming, source.dataAnalysis), blankAbilities.digitalLiteracy),
    responsibility: boundedScore(source.projectExperience, blankAbilities.responsibility),
    continuousLearning: boundedScore(source.careerPlanning, blankAbilities.continuousLearning),
    resilience: blankAbilities.resilience,
  };
}

export function migrateCareerState(persistedState: unknown): CareerStateData {
  const persisted = persistedState && typeof persistedState === "object" ? persistedState as Partial<CareerStateData> : {};
  const persistedProfile: Partial<CareerProfile> = persisted.profile ?? {};
  const persistedAwakening: Partial<CareerStateData["awakening"]> = persisted.awakening ?? {};
  const persistedResearch: Partial<CareerStateData["research"]> = persisted.research ?? {};
  const persistedAiPlanning: Partial<CareerStateData["aiPlanning"]> = persisted.aiPlanning ?? {};
  return {
    ...defaultData,
    ...persisted,
    profile: {
      ...defaultProfile,
      ...persistedProfile,
      interests: Array.isArray(persistedProfile.interests) ? persistedProfile.interests : [...defaultProfile.interests],
      values: Array.isArray(persistedProfile.values) ? persistedProfile.values : [...defaultProfile.values],
      abilityScores: migrateAbilityScores(persistedProfile.abilityScores),
    },
    awakening: {
      ...defaultData.awakening,
      ...persistedAwakening,
      motivation: { ...defaultData.awakening.motivation, ...persistedAwakening.motivation },
      visionTags: Array.isArray(persistedAwakening.visionTags) ? persistedAwakening.visionTags : [],
      actionTasks: Array.isArray(persistedAwakening.actionTasks) ? persistedAwakening.actionTasks : [],
    },
    roadmapTasks: Array.isArray(persisted.roadmapTasks) ? persisted.roadmapTasks : [],
    research: {
      ...defaultData.research,
      ...persistedResearch,
      outcomes: Array.isArray(persistedResearch.outcomes) ? persistedResearch.outcomes : [],
      researchTasks: Array.isArray(persistedResearch.researchTasks) ? persistedResearch.researchTasks : [],
      careerTasks: Array.isArray(persistedResearch.careerTasks) ? persistedResearch.careerTasks : [],
    },
    aiPlanning: {
      ...defaultData.aiPlanning,
      ...persistedAiPlanning,
      preferredScenes: Array.isArray(persistedAiPlanning.preferredScenes) ? persistedAiPlanning.preferredScenes : [],
      directionResult: persistedAiPlanning.directionResult && Array.isArray(persistedAiPlanning.directionResult.candidates)
        ? persistedAiPlanning.directionResult
        : null,
      actionPlan: persistedAiPlanning.actionPlan && Array.isArray(persistedAiPlanning.actionPlan.tasks)
        ? persistedAiPlanning.actionPlan
        : null,
    },
  };
}

export function careerStateSnapshot(state: CareerStateData): CareerStateData {
  return {
    hasOnboarded: state.hasOnboarded,
    profile: state.profile,
    awakening: state.awakening,
    selectedJobId: state.selectedJobId,
    roadmapTasks: state.roadmapTasks,
    research: state.research,
    aiPlanning: state.aiPlanning,
  };
}

export const useCareerStore = create<CareerStore>()(
  persist(
    (set) => ({
      ...defaultData,
      completeOnboarding: (profile) => set({ hasOnboarded: true, profile }),
      updateProfile: (patch) => set((state) => ({ profile: { ...state.profile, ...patch, abilityScores: { ...state.profile.abilityScores, ...patch.abilityScores } } })),
      setAwakening: (patch) => set((state) => ({ awakening: { ...state.awakening, ...patch } })),
      setSelectedJobId: (selectedJobId) => set({ selectedJobId }),
      setRoadmapTasks: (roadmapTasks) => set({ roadmapTasks }),
      updateRoadmapTask: (id, patch) => set((state) => ({ roadmapTasks: updateTask(state.roadmapTasks, id, patch) })),
      addRoadmapTask: (task) => set((state) => ({ roadmapTasks: [...state.roadmapTasks, task] })),
      setResearch: (patch) => set((state) => ({ research: { ...state.research, ...patch } })),
      setAiPlanning: (patch) => set((state) => ({ aiPlanning: { ...state.aiPlanning, ...patch } })),
      addResearchOutcome: (outcome) => set((state) => ({ research: { ...state.research, outcomes: [...state.research.outcomes, outcome] } })),
      removeResearchOutcome: (id) => set((state) => ({ research: { ...state.research, outcomes: state.research.outcomes.filter((outcome) => outcome.id !== id) } })),
      updateResearchTask: (lane, id, patch) => set((state) => ({ research: { ...state.research, [lane]: updateTask(state.research[lane], id, patch) } })),
      replaceCareerData: (data) => set(migrateCareerState(data)),
      resetDemo: () => set({ ...defaultData, profile: { ...defaultProfile, abilityScores: { ...blankAbilities }, interests: [...defaultProfile.interests], values: [...defaultProfile.values] } }),
    }),
    {
      name: "career-navigation-v1",
      version: 3,
      migrate: (persistedState) => migrateCareerState(persistedState),
    },
  ),
);

export function resolveHome(role: UserRole, _grade: number) {
  void _grade;
  if (role === "teacher") return "/teacher/dashboard";
  if (role === "graduate") return "/graduate/navigation";
  return "/student/home";
}
