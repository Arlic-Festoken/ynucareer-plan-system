import { describe, expect, it } from "vitest";
import {
  buildActionPlanRequest,
  buildDirectionRequest,
  parseActionPlanResponse,
  parseDirectionResponse,
  sanitizeDirectionInput,
} from "./planner.mjs";

const profile = {
  role: "junior",
  grade: 3,
  major: "数据科学与大数据技术",
  targetPath: "employment",
  interests: ["人工智能", "数据与商业"],
  values: ["创造价值", "技术精进"],
  abilityScores: { professionalSkills: 72, digitalLiteracy: 68 },
};

describe("DeepSeek planning boundary", () => {
  it("minimizes and bounds the student context", () => {
    const clean = sanitizeDirectionInput({
      profile,
      preferredScenes: ["教育科技"],
      strengthEvidence: "完成过一个课程项目".repeat(100),
      constraints: "每周只能投入六小时",
      timeBudgetHours: 99,
    });
    expect(clean.strengthEvidence.length).toBe(600);
    expect(clean.timeBudgetHours).toBe(30);
    expect(clean.profile.abilityScores.professionalSkills).toBe(72);
    expect(buildDirectionRequest(clean, "deepseek-v4-flash")).toMatchObject({
      model: "deepseek-v4-flash",
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
    });
  });

  it("accepts exactly three complete direction candidates", () => {
    const candidate = {
      title: "学习产品数据分析",
      specialization: "聚焦教育产品中的学习行为与留存问题",
      fit: "优先验证",
      rationale: "兴趣和已有项目均指向数据驱动的问题解决。",
      problemExamples: ["识别学习流失节点", "评估功能对学习效果的影响"],
      evidenceNeeded: ["一份分析报告", "一页能力对照"],
      tradeoffs: "需要同时补充业务理解和数据表达。",
      firstExperiment: { title: "分析一份公开学习数据", detail: "完成问题定义、清洗和三项发现。", successSignal: "能向同学讲清一项可行动的结论。" },
    };
    const result = parseDirectionResponse(JSON.stringify({
      overview: "先比较三个可验证方向。",
      candidates: [
        candidate,
        { ...candidate, title: "教育 AI 产品实验", fit: "值得比较" },
        { ...candidate, title: "数据治理与质量", fit: "探索备选" },
      ],
      reflectionQuestion: "你愿意先验证哪类问题？",
    }));
    expect(result.candidates).toHaveLength(3);
    expect(result.candidates[0].id).toBe("ai-direction-1");
    expect(() => parseDirectionResponse(JSON.stringify({ overview: "不足", candidates: [candidate] }))).toThrow("invalid_model_shape");
    expect(() => parseDirectionResponse(JSON.stringify({ overview: "先比较三个可验证方向。", candidates: [
      { ...candidate, firstExperiment: { ...candidate.firstExperiment, title: "完成一次企业访谈" } },
      { ...candidate, title: "教育 AI 产品实验" },
      { ...candidate, title: "数据治理与质量" },
    ] }))).toThrow("invalid_model_shape");
  });

  it("turns a selected direction into validated executable tasks", () => {
    const request = buildActionPlanRequest({
      profile,
      selectedDirection: {
        title: "学习产品数据分析",
        specialization: "学习行为与留存",
        rationale: "适合当前画像",
        firstExperiment: { title: "公开数据分析", detail: "完成一份报告", successSignal: "获得一次反馈" },
      },
      timeBudgetHours: 6,
      horizonWeeks: 8,
    }, "deepseek-v4-pro");
    expect(request.max_tokens).toBe(2200);

    const tasks = Array.from({ length: 5 }, (_, index) => ({
      title: `任务 ${index + 1}`,
      detail: "完成一个有明确产出的步骤。",
      week: `第 ${index + 1} 周`,
      evidence: "提交一页成果记录",
      priority: index === 0 ? "high" : "medium",
      category: index === 0 ? "practice" : "project",
    }));
    const result = parseActionPlanResponse(JSON.stringify({
      directionTitle: "学习产品数据分析",
      objective: "八周内完成一次方向验证。",
      strategy: "先做小实验，再根据反馈补能力。",
      tasks,
      checkpoints: [{ week: "第 2 周", question: "是否愿意继续？" }, { week: "第 6 周", question: "证据是否足够？" }],
      risks: ["把工具学习当成最终产出"],
    }));
    expect(result.tasks).toHaveLength(5);
    expect(result.tasks[0]).toMatchObject({ priority: "high", category: "practice" });
    expect(() => parseActionPlanResponse(JSON.stringify({
      directionTitle: "学习产品数据分析",
      objective: "八周内完成一次方向验证。",
      strategy: "先做小实验，再根据反馈补能力。",
      tasks: [{ ...tasks[0], title: "约访企业从业者" }, ...tasks.slice(1)],
      checkpoints: [{ week: "第 2 周", question: "是否愿意继续？" }, { week: "第 6 周", question: "证据是否足够？" }],
      risks: ["把工具学习当成最终产出"],
    }))).toThrow("invalid_model_shape");
  });
});
