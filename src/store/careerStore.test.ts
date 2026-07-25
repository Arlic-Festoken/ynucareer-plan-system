import { describe, expect, it } from "vitest";
import { blankAbilities } from "../data/catalog";
import { careerStateSnapshot, migrateCareerState, useCareerStore } from "./careerStore";

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
    expect(migrated.profile.abilityScores.programming).toBe(81);
    expect(migrated.profile.abilityScores.communication).toBe(blankAbilities.communication);
    expect(migrated.awakening.motivation.curiosity).toBe(3);
    expect(migrated.research.careerTasks).toEqual([]);
    expect(migrated.aiPlanning).toMatchObject({ timeBudgetHours: 6, horizonWeeks: 8, directionResult: null });
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
      profile: { id: "remote", role: "junior", grade: 3, major: "软件工程", targetPath: "employment", interests: ["人工智能"], values: ["技术精进"], abilityScores: { programming: 88 } },
    });
    const snapshot = careerStateSnapshot(useCareerStore.getState());
    expect(snapshot.profile).toMatchObject({ id: "remote", major: "软件工程", abilityScores: { programming: 88 } });
    expect(snapshot.profile.abilityScores.communication).toBe(blankAbilities.communication);
    expect(snapshot).not.toHaveProperty("resetDemo");
    expect(snapshot).not.toHaveProperty("replaceCareerData");
  });
});
