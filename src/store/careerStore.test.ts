import { describe, expect, it } from "vitest";
import { blankAbilities } from "../data/catalog";
import {
  aiPlanNeedsRefresh,
  careerStateSnapshot,
  migrateAbilityScores,
  migrateCareerState,
  resolveOnboardingDestination,
  useCareerStore,
} from "./careerStore";

describe("career store", () => {
  it("persists onboarding data in the active state and can reset it", () => {
    const store = useCareerStore.getState();
    store.resetDemo();
    store.completeOnboarding({ id: "test-profile", role: "junior", grade: 3, major: "数据科学与大数据技术", targetPath: "employment", interests: ["数据与商业"], values: ["创造价值"], abilityScores: { ...blankAbilities } });
    expect(useCareerStore.getState().hasOnboarded).toBe(true);
    expect(useCareerStore.getState().profile.major).toBe("数据科学与大数据技术");
    useCareerStore.getState().resetDemo();
    expect(useCareerStore.getState().hasOnboarded).toBe(false);
    expect(useCareerStore.getState().roadmapTasks).toHaveLength(0);
  });

  it("keeps an action reflection alongside its completed task", () => {
    const store = useCareerStore.getState();
    store.resetDemo();
    store.setRoadmapTasks([{ id: "reflection-task", title: "完成能力对照", detail: "整理岗位要求与已有证据", category: "career", priority: "high", semester: "本学期", completed: false }]);
    store.updateRoadmapTask("reflection-task", { completed: true, reflection: "我确认自己更想解决真实业务问题。" });
    expect(useCareerStore.getState().roadmapTasks[0]).toMatchObject({ completed: true, reflection: "我确认自己更想解决真实业务问题。" });
  });

  it("deeply migrates partial local data without losing required defaults", () => {
    const migrated = migrateCareerState({ hasOnboarded: true, profile: { major: "通信工程", abilityScores: { programming: 81 } }, awakening: { activeStep: 4 }, research: { focus: "边缘智能" } });
    expect(migrated.profile.major).toBe("通信工程");
    expect(migrated.profile.abilityScores.professionalSkills).toBeGreaterThan(blankAbilities.professionalSkills);
    expect(migrated.profile.abilityScores.resilience).toBe(blankAbilities.resilience);
    expect(migrated.awakening.motivation.curiosity).toBe(3);
    expect(migrated.awakening).toMatchObject({ calibratedAt: null, revision: 0 });
    expect(migrated.research.careerTasks).toEqual([]);
    expect(migrated.aiPlanning).toMatchObject({ timeBudgetHours: 6, horizonWeeks: 8, directionResult: null, generatedFromCalibrationRevision: null });
    expect(migrated.learningPath).toMatchObject({ curriculum: null, plan: null, inputs: { targetRole: "算法工程师", weeklyHours: 10 } });
  });

  it("routes a new low-grade student through one calibration before the workspace", () => {
    expect(resolveOnboardingDestination({ role: "freshman", grade: 2 }, false)).toBe("/student/awakening");
    expect(resolveOnboardingDestination({ role: "freshman", grade: 2 }, true)).toBe("/student/home");
    expect(resolveOnboardingDestination({ role: "junior", grade: 3 }, false)).toBe("/student/home");
    expect(resolveOnboardingDestination({ role: "graduate", grade: 5 }, false)).toBe("/graduate/navigation");
  });

  it("recalibrates direction without deleting an existing AI plan or action history", () => {
    useCareerStore.getState().resetDemo();
    useCareerStore.getState().setAwakening({
      actionTasks: [{
        id: "completed-history",
        title: "已完成的历史行动",
        detail: "保留证据和反思",
        category: "project",
        priority: "high",
        semester: "第 1 周",
        completed: true,
        reflection: "这条方向值得继续。",
        evidence: ["作品链接"],
      }],
    });
    useCareerStore.getState().setAiPlanning({
      actionPlan: {
        directionTitle: "教育 AI 产品实验",
        objective: "验证方向",
        strategy: "先做后评估",
        tasks: [],
        checkpoints: [],
        risks: [],
      },
      generatedFromCalibrationRevision: 1,
    });

    useCareerStore.getState().completeDirectionCalibration({
      selectedDirectionId: "ai-application",
      visionText: "用 AI 改善真实学习问题",
      visionTags: ["技术创造", "真实产品"],
      motivation: { curiosity: 5, contribution: 4, achievement: 3, collaboration: 3 },
    });
    useCareerStore.getState().completeDirectionCalibration({
      selectedDirectionId: "data-intelligence",
      visionText: "用数据帮助公共服务决策",
      visionTags: ["社会服务"],
      motivation: { curiosity: 4, contribution: 5, achievement: 3, collaboration: 4 },
    });

    const state = useCareerStore.getState();
    expect(state.awakening).toMatchObject({
      selectedDirectionId: "data-intelligence",
      visionText: "用数据帮助公共服务决策",
      revision: 2,
    });
    expect(state.awakening.calibratedAt).toEqual(expect.any(String));
    expect(state.awakening.actionTasks[0]).toMatchObject({
      id: "completed-history",
      completed: true,
      reflection: "这条方向值得继续。",
      evidence: ["作品链接"],
    });
    expect(state.aiPlanning.actionPlan?.directionTitle).toBe("教育 AI 产品实验");
    expect(aiPlanNeedsRefresh(state.aiPlanning, state.awakening.revision)).toBe(true);
  });

  it("persists AI planning choices and clears them with demo reset", () => {
    useCareerStore.getState().setAiPlanning({ preferredScenes: ["教育科技"], selectedCandidateId: "ai-direction-1", timeBudgetHours: 8 });
    expect(useCareerStore.getState().aiPlanning).toMatchObject({ preferredScenes: ["教育科技"], selectedCandidateId: "ai-direction-1", timeBudgetHours: 8 });
    useCareerStore.getState().resetDemo();
    expect(useCareerStore.getState().aiPlanning).toMatchObject({ preferredScenes: [], selectedCandidateId: null, timeBudgetHours: 6 });
  });

  it("replaces local data with a migrated account snapshot and exposes data without actions", () => {
    useCareerStore.getState().replaceCareerData({
      hasOnboarded: true,
      profile: { id: "remote", role: "junior", grade: 3, major: "软件工程", targetPath: "employment", interests: ["人工智能"], values: ["技术精进"], abilityScores: { professionalSkills: 88 } },
    });
    const snapshot = careerStateSnapshot(useCareerStore.getState());
    expect(snapshot.profile).toMatchObject({ id: "remote", major: "软件工程", abilityScores: { professionalSkills: 88 } });
    expect(snapshot.profile.abilityScores.communicationCollaboration).toBe(blankAbilities.communicationCollaboration);
    expect(snapshot).not.toHaveProperty("resetDemo");
    expect(snapshot).not.toHaveProperty("replaceCareerData");
  });

  it("maps legacy technical scores into reviewable seven-dimensional self ratings", () => {
    expect(migrateAbilityScores({
      professionalFoundation: 70,
      programming: 80,
      dataAnalysis: 60,
      projectExperience: 50,
      communication: 90,
      careerPlanning: 40,
    })).toEqual({
      communicationCollaboration: 90,
      innovativeThinking: 55,
      professionalSkills: 75,
      digitalLiteracy: 70,
      responsibility: 50,
      continuousLearning: 40,
      resilience: 50,
    });
  });

  it("persists imported curriculum and generated learning-path state in account snapshots", () => {
    useCareerStore.getState().resetDemo();
    useCareerStore.getState().setCurriculumPlan({
      title: "计算机科学与技术培养方案",
      major: "计算机科学与技术",
      entryYear: 2025,
      sourceName: "培养方案.csv",
      importedAt: "2026-07-29T00:00:00.000Z",
      courses: [{ id: "math", name: "高等数学", semester: "第 1 学期", credits: 5, category: "基础", status: "completed", score: 88 }],
    });
    const snapshot = careerStateSnapshot(useCareerStore.getState());
    expect(snapshot.learningPath.curriculum?.courses[0]).toMatchObject({ name: "高等数学", score: 88 });
  });
});
