import { describe, expect, it } from "vitest";
import { buildCoachRequest, parseCoachResponse, sanitizeCoachInput } from "./coach.mjs";

describe("DeepSeek coach boundary", () => {
  it("bounds untrusted browser input before it reaches the provider", () => {
    const input = sanitizeCoachInput({ profile: { role: "junior", grade: 3, major: "数据科学", interests: ["数据与商业"], values: ["创造价值"], abilityScores: { programming: 72 } }, nextAction: { title: "完成一个项目", detail: "做一个真实作品" }, question: "请帮我安排本周" });
    expect(input.profile.role).toBe("junior");
    expect(input.profile.abilityScores.programming).toBe(72);
    expect(buildCoachRequest(input, "deepseek-v4-flash").response_format).toEqual({ type: "json_object" });
  });

  it("only accepts a complete structured model response", () => {
    const advice = parseCoachResponse(JSON.stringify({ headline: "先完成一次真实访谈", summary: "访谈能帮助你验证方向。", nextActions: [{ title: "约访一位学长", why: "获得真实岗位信息" }, { title: "写下三条发现", why: "把体验转成下一次选择的证据" }], caution: "不要把一次访谈当作最终结论。" }));
    expect(advice.nextActions).toHaveLength(2);
    expect(() => parseCoachResponse("not-json")).toThrow("invalid_model_json");
  });
});
