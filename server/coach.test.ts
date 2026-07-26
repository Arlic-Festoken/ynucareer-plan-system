import { describe, expect, it } from "vitest";
import { buildCoachRequest, parseCoachResponse, sanitizeCoachInput } from "./coach.mjs";

describe("DeepSeek coach boundary", () => {
  it("bounds untrusted browser input before it reaches the provider", () => {
    const input = sanitizeCoachInput({ profile: { role: "junior", grade: 3, major: "数据科学", interests: ["数据与商业"], values: ["创造价值"], abilityScores: { professionalSkills: 72 } }, nextAction: { title: "完成一个项目", detail: "做一个真实作品" }, question: "请帮我安排本周" });
    expect(input.profile.role).toBe("junior");
    expect(input.profile.abilityScores.professionalSkills).toBe(72);
    expect(buildCoachRequest(input, "deepseek-v4-flash").response_format).toEqual({ type: "json_object" });
  });

  it("only accepts a complete structured model response", () => {
    const advice = parseCoachResponse(JSON.stringify({ headline: "先完成一份能力对照", summary: "用岗位要求和已有证据明确下一步。", nextActions: [{ title: "整理三条岗位要求", why: "明确需要补齐的能力" }, { title: "写下一项已有成果", why: "把经历转成下一次选择的证据" }], caution: "先完成一个小步骤，再决定是否继续投入。" }));
    expect(advice.nextActions).toHaveLength(2);
    expect(() => parseCoachResponse("not-json")).toThrow("invalid_model_json");
  });

  it("rejects interview-based actions from the model", () => {
    expect(() => parseCoachResponse(JSON.stringify({ headline: "方向验证", summary: "先做小行动。", nextActions: [{ title: "约访一位学长", why: "获得岗位信息" }, { title: "整理三条岗位要求", why: "明确能力差距" }], caution: "持续复盘。" }))).toThrow("invalid_model_shape");
  });
});
