import { readSessionCookie } from "./http-auth.mjs";

function header(headers, name) {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? "" : typeof value === "string" ? value : "";
}

function response(status, body, options = {}) {
  return { handled: true, status, body, ...options };
}

function failure(error) {
  const code = error instanceof Error ? error.message : "pilot_error";
  const status = code === "authentication_required" ? 401
    : ["staff_permission_required", "opportunity_owner_required", "organization_scope_required"].includes(code) ? 403
      : code.endsWith("_not_found") ? 404
        : ["opportunity_not_editable", "opportunity_not_submittable", "opportunity_not_pending_review", "evidence_not_pending", "evidence_already_submitted"].includes(code) ? 409
          : 400;
  const messages = {
    authentication_required: "请先登录。",
    staff_permission_required: "当前账号没有执行此操作的权限。",
    organization_scope_required: "当前账号无权访问该学院或单位的数据。",
    opportunity_owner_required: "只能修改自己负责的资源。",
    opportunity_not_found: "资源不存在或已被移除。",
    evidence_not_found: "成果记录不存在。",
    action_not_found: "行动不存在。",
    action_not_deletable: "已有成果记录、已完成或来自校内资源的行动不能删除。",
    notification_not_found: "通知不存在。",
    invalid_action: "请完整填写行动名称和说明。",
    invalid_opportunity: "请完整填写资源信息。",
    official_source_required: "请提供可访问的官方来源链接。",
    invalid_url: "链接格式不正确。",
    invalid_evidence_url: "成果链接必须使用 HTTPS；也可以留空，仅提交文字说明。",
    invalid_deadline: "日期格式不正确。",
    invalid_participation_transition: "当前参与状态不能执行这一步。",
    opportunity_closed: "该资源已结束，无法新加入。",
    opportunity_full: "该资源名额已满，暂时无法加入。",
    evidence_required: "请填写成果说明和行动反思。",
    evidence_already_submitted: "该成果正在核验或已经完成，请勿重复提交。",
    rubric_required: "核验成果时至少评价一个能力维度。",
    review_note_required: "退回修改时请填写具体反馈。",
    invalid_review_decision: "审核决定不正确。",
  };
  return response(status, { error: code, message: messages[code] ?? "请求无法完成，请稍后再试。" });
}

export function isPilotPath(path) {
  return path === "/me/dashboard"
    || path === "/me/ability-profile"
    || path === "/me/actions"
    || /^\/me\/actions\/[^/]+$/.test(path)
    || path === "/me/evidence"
    || path === "/me/notifications"
    || /^\/me\/notifications\/[^/]+$/.test(path)
    || path === "/me/calendar.ics"
    || path === "/staff/opportunities"
    || /^\/staff\/opportunities\/[^/]+$/.test(path)
    || /^\/staff\/opportunities\/[^/]+\/(submit|review|status)$/.test(path)
    || path === "/staff/evidence"
    || /^\/staff\/evidence\/[^/]+\/review$/.test(path)
    || path === "/staff/insights";
}

export function handlePilotRequest(request, accountService, pilotService) {
  const sessionToken = readSessionCookie(header(request.headers, "cookie"));
  const user = accountService.authenticate(sessionToken);
  if (!user) return response(401, { error: "authentication_required", message: "请先登录。" });
  const { method, path, body } = request;
  try {
    if (method === "GET" && path === "/me/dashboard") return response(200, pilotService.dashboard(user));
    if (method === "GET" && path === "/me/ability-profile") return response(200, { profile: pilotService.getAbilityProfile(user) });
    if (method === "PATCH" && path === "/me/ability-profile") return response(200, { profile: pilotService.updateAbilityProfile(user, body) });
    if (method === "GET" && path === "/me/actions") return response(200, { actions: pilotService.listActions(user) });
    if (method === "POST" && path === "/me/actions") return response(201, { action: pilotService.createAction(user, body) });
    const action = path.match(/^\/me\/actions\/([^/]+)$/);
    if (method === "DELETE" && action) return response(200, { ok: pilotService.deleteAction(user, decodeURIComponent(action[1])) });
    if (method === "PATCH" && action) return response(200, { action: pilotService.updateAction(user, decodeURIComponent(action[1]), body) });
    if (method === "POST" && path === "/me/evidence") return response(201, { evidence: pilotService.submitEvidence(user, body) });
    if (method === "GET" && path === "/me/notifications") return response(200, { notifications: pilotService.listNotifications(user) });
    const notification = path.match(/^\/me\/notifications\/([^/]+)$/);
    if (method === "PATCH" && notification) return response(200, pilotService.markNotification(user, decodeURIComponent(notification[1]), body?.read));
    if (method === "GET" && path === "/me/calendar.ics") {
      return response(200, pilotService.calendar(user), {
        raw: true,
        contentType: "text/calendar; charset=utf-8",
        headers: { "Content-Disposition": "attachment; filename=career-deadlines.ics" },
      });
    }

    if (method === "GET" && path === "/staff/opportunities") return response(200, { opportunities: pilotService.listForStaff(user) });
    if (method === "POST" && path === "/staff/opportunities") return response(201, { opportunity: pilotService.createDraft(user, body) });
    const staffOpportunity = path.match(/^\/staff\/opportunities\/([^/]+)$/);
    if (method === "PATCH" && staffOpportunity) return response(200, { opportunity: pilotService.updateDraft(user, decodeURIComponent(staffOpportunity[1]), body) });
    const submit = path.match(/^\/staff\/opportunities\/([^/]+)\/submit$/);
    if (method === "POST" && submit) return response(200, { opportunity: pilotService.submitOpportunity(user, decodeURIComponent(submit[1])) });
    const review = path.match(/^\/staff\/opportunities\/([^/]+)\/review$/);
    if (method === "POST" && review) return response(200, { opportunity: pilotService.reviewOpportunity(user, decodeURIComponent(review[1]), body) });
    const status = path.match(/^\/staff\/opportunities\/([^/]+)\/status$/);
    if (method === "POST" && status) return response(200, { opportunity: pilotService.setOpportunityStatus(user, decodeURIComponent(status[1]), body) });
    if (method === "GET" && path === "/staff/evidence") return response(200, { evidence: pilotService.listEvidenceQueue(user) });
    const evidence = path.match(/^\/staff\/evidence\/([^/]+)\/review$/);
    if (method === "POST" && evidence) return response(200, { evidence: pilotService.reviewEvidence(user, decodeURIComponent(evidence[1]), body) });
    if (method === "GET" && path === "/staff/insights") return response(200, { insights: pilotService.cohortInsights(user) });
    return { handled: false };
  } catch (error) {
    return failure(error);
  }
}
