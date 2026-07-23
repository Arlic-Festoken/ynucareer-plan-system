import { create } from "zustand";
import { persist } from "zustand/middleware";
import { blankAbilities } from "../data/catalog";
import type { ActionTask, CareerProfile, CareerStateData, ResearchOutcome, UserRole } from "../domain";

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
  addResearchOutcome: (outcome: ResearchOutcome) => void;
  removeResearchOutcome: (id: string) => void;
  updateResearchTask: (lane: "researchTasks" | "careerTasks", id: string, patch: Partial<ActionTask>) => void;
  resetDemo: () => void;
};

const updateTask = (tasks: ActionTask[], id: string, patch: Partial<ActionTask>) => tasks.map((task) => (task.id === id ? { ...task, ...patch } : task));

export function migrateCareerState(persistedState: unknown): CareerStateData {
  const persisted = persistedState && typeof persistedState === "object" ? persistedState as Partial<CareerStateData> : {};
  const persistedProfile: Partial<CareerProfile> = persisted.profile ?? {};
  const persistedAwakening: Partial<CareerStateData["awakening"]> = persisted.awakening ?? {};
  const persistedResearch: Partial<CareerStateData["research"]> = persisted.research ?? {};
  return {
    ...defaultData,
    ...persisted,
    profile: {
      ...defaultProfile,
      ...persistedProfile,
      interests: Array.isArray(persistedProfile.interests) ? persistedProfile.interests : [...defaultProfile.interests],
      values: Array.isArray(persistedProfile.values) ? persistedProfile.values : [...defaultProfile.values],
      abilityScores: { ...blankAbilities, ...persistedProfile.abilityScores },
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
      addResearchOutcome: (outcome) => set((state) => ({ research: { ...state.research, outcomes: [...state.research.outcomes, outcome] } })),
      removeResearchOutcome: (id) => set((state) => ({ research: { ...state.research, outcomes: state.research.outcomes.filter((outcome) => outcome.id !== id) } })),
      updateResearchTask: (lane, id, patch) => set((state) => ({ research: { ...state.research, [lane]: updateTask(state.research[lane], id, patch) } })),
      resetDemo: () => set({ ...defaultData, profile: { ...defaultProfile, abilityScores: { ...blankAbilities }, interests: [...defaultProfile.interests], values: [...defaultProfile.values] } }),
    }),
    {
      name: "career-navigation-v1",
      version: 1,
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
