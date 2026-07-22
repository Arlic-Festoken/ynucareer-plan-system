const MAX_TEXT = 800;
const MAX_LIST_ITEMS = 6;

function text(value, limit = MAX_TEXT) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function list(value) {
  return Array.isArray(value) ? value.map((item) => text(item, 80)).filter(Boolean).slice(0, MAX_LIST_ITEMS) : [];
}

function number(value, min = 0, max = 100) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : 0;
}

export function sanitizeCoachInput(input) {
  const profile = input && typeof input === "object" && input.profile && typeof input.profile === "object" ? input.profile : {};
  const nextAction = input && typeof input === "object" && input.nextAction && typeof input.nextAction === "object" ? input.nextAction : {};
  const abilityScores = profile.abilityScores && typeof profile.abilityScores === "object" ? profile.abilityScores : {};

  return {
    profile: {
      role: ["freshman", "junior", "graduate"].includes(profile.role) ? profile.role : "freshman",
      grade: number(profile.grade, 1, 7),
      major: text(profile.major, 80),
      targetPath: text(profile.targetPath, 40),
      interests: list(profile.interests),
      values: list(profile.values),
      abilityScores: Object.fromEntries(Object.entries(abilityScores).slice(0, 7).map(([key, value]) => [text(key, 40), number(value)])),
    },
    nextAction: { title: text(nextAction.title, 120), detail: text(nextAction.detail, 300) },
    question: text(input?.question, MAX_TEXT),
  };
}

export function buildCoachRequest(input, model) {
  const clean = sanitizeCoachInput(input);
  const profile = clean.profile;
  const userContext = [
    `阶段：${profile.role}，年级：${profile.grade || "未提供"}，专业：${profile.major || "未提供"}`,
    `优先路径：${profile.targetPath || "未提供"}`,
    `兴趣：${profile.interests.join("、") || "未提供"}`,
    `价值偏好：${profile.values.join("、") || "未提供"}`,
    `能力自评：${Object.entries(profile.abilityScores).map(([key, value]) => `${key}=${value}`).join("；") || "未提供"}`,
    `当前建议行动：${clean.nextAction.title || "未提供"}${clean.nextAction.detail ? `（${clean.nextAction.detail}）` : ""}`,
    clean.question ? `学生的问题：${clean.question}` : "学生希望理解当前下一步。",
  ].join("\n");

  return {
    model,
    stream: false,
    temperature: 0.35,
    max_tokens: 900,
    thinking: { type: "disabled" },
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "你是一位谨慎、务实的大学生生涯教练。只根据给定的自评信息给出教育与探索建议；不承诺录取、就业或收入结果，不做心理诊断，不要求身份、联系方式、成绩、家庭或其他敏感信息。输出必须是 JSON：{\"headline\":string,\"summary\":string,\"nextActions\":[{\"title\":string,\"why\":string}],\"caution\":string}。nextActions 给出 2 至 3 项本周能执行的小行动，中文、具体、简洁。",
      },
      { role: "user", content: userContext },
    ],
  };
}

export function parseCoachResponse(content) {
  const raw = typeof content === "string" ? content.trim() : "";
  if (!raw) throw new Error("empty_model_response");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("invalid_model_json");
  }
  const nextActions = Array.isArray(parsed.nextActions) ? parsed.nextActions.map((item) => ({ title: text(item?.title, 100), why: text(item?.why, 220) })).filter((item) => item.title && item.why).slice(0, 3) : [];
  if (!text(parsed.headline, 100) || !text(parsed.summary, 500) || nextActions.length < 2) throw new Error("invalid_model_shape");
  return { headline: text(parsed.headline, 100), summary: text(parsed.summary, 500), nextActions, caution: text(parsed.caution, 220) || "把建议当作下一次尝试的起点，并根据真实体验继续调整。" };
}
