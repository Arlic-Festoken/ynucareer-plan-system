import { readSessionCookie } from "./http-auth.mjs";

function header(headers, name) {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? "" : typeof value === "string" ? value : "";
}

function response(status, body) {
  return { handled: true, status, body };
}

function failure(error) {
  const code = error instanceof Error ? error.message : "opportunity_error";
  const status = code === "authentication_required" ? 401
    : code === "teacher_access_required" ? 403
      : code === "opportunity_not_found" ? 404
        : ["opportunity_closed", "opportunity_full", "participation_not_started", "invalid_participation_transition", "invalid_opportunity", "official_source_required", "invalid_url", "invalid_deadline", "invalid_participation_status", "invalid_opportunity_status"].includes(code) ? 400
          : 500;
  const messages = {
    authentication_required: "请先登录后使用校内资源。",
    teacher_access_required: "该功能仅对经学校配置的教师账号开放。",
    opportunity_not_found: "该资源不存在或已被移除。",
    opportunity_closed: "该资源已结束，不能再加入。",
    opportunity_full: "该资源名额已满，暂时无法加入。",
    participation_not_started: "请先将资源加入行动计划，再更新参与状态。",
    invalid_participation_transition: "请按加入计划、报名/预约、完成记录的顺序更新。",
    invalid_opportunity: "请完整填写资源名称、提供单位、类型和说明。",
    official_source_required: "请填写可访问的官方来源链接。",
    invalid_url: "链接必须是有效的 HTTP 或 HTTPS 地址。",
    invalid_deadline: "截止日期格式不正确。",
    invalid_participation_status: "参与状态不正确。",
    invalid_opportunity_status: "资源状态不正确。",
  };
  return response(status, { error: code, message: messages[code] ?? "请求无法完成，请稍后再试。" });
}

export function isOpportunityPath(path) {
  return path === "/opportunities" || /^\/opportunities\/[^/]+\/participation$/.test(path) || path === "/teacher/opportunities" || /^\/teacher\/opportunities\/[^/]+$/.test(path);
}

export function handleOpportunityRequest(request, accountService, opportunityService) {
  const sessionToken = readSessionCookie(header(request.headers, "cookie"));
  const user = accountService.authenticate(sessionToken);
  if (!user) return response(401, { error: "authentication_required", message: "请先登录后使用校内资源。" });
  const { method, path, body } = request;
  try {
    if (method === "GET" && path === "/opportunities") return response(200, { opportunities: opportunityService.listForStudent(user) });
    const participation = path.match(/^\/opportunities\/([^/]+)\/participation$/);
    if (method === "POST" && participation) return response(200, opportunityService.saveParticipation(user, decodeURIComponent(participation[1]), body));
    if (method === "GET" && path === "/teacher/opportunities") return response(200, { opportunities: opportunityService.listForTeacher(user) });
    if (method === "POST" && path === "/teacher/opportunities") return response(201, { opportunity: opportunityService.create(user, body) });
    const teacherOpportunity = path.match(/^\/teacher\/opportunities\/([^/]+)$/);
    if (method === "PATCH" && teacherOpportunity) return response(200, { opportunity: opportunityService.setStatus(user, decodeURIComponent(teacherOpportunity[1]), body) });
    return { handled: false };
  } catch (error) {
    return failure(error);
  }
}
