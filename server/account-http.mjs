import { clearSessionCookie, readSessionCookie, serializeSessionCookie } from "./http-auth.mjs";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function header(headers, name) {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? "" : typeof value === "string" ? value : "";
}

function response(status, body, headers) {
  return { handled: true, status, body, ...(headers ? { headers } : {}) };
}

function failure(error) {
  const code = error instanceof Error ? error.message : "account_error";
  const status = code === "email_exists" ? 409 : code === "invalid_credentials" ? 401 : 400;
  const messages = {
    invalid_email: "请输入有效邮箱地址。",
    invalid_password: "密码需为 10–128 个字符。",
    display_name_required: "请输入昵称。",
    email_exists: "该邮箱已注册，请直接登录。",
    invalid_credentials: "邮箱或密码不正确。",
    registration_invite_required: "当前为校内邀请制试点，请使用已获邀请的邮箱注册。",
    invalid_career_state: "生涯数据格式不正确。",
    career_state_too_large: "生涯数据超过同步上限。",
  };
  return response(status, { error: code, message: messages[code] ?? "请求无法完成，请稍后重试。" });
}

export async function handleAccountRequest(request, accountService) {
  const { method, path, body, secure } = request;
  const sessionToken = readSessionCookie(header(request.headers, "cookie"));
  const user = accountService.authenticate(sessionToken);
  const requiresJson = ["POST", "PUT", "PATCH"].includes(method);
  if (requiresJson && !header(request.headers, "content-type").includes("application/json")) {
    return response(415, { error: "json_required", message: "请求必须使用 JSON。" });
  }

  try {
    if (method === "POST" && path === "/auth/register") {
      const result = await accountService.register(body);
      return response(201, { user: result.user }, { "Set-Cookie": serializeSessionCookie(result.sessionToken, { secure, maxAgeSeconds: SESSION_MAX_AGE_SECONDS }) });
    }
    if (method === "POST" && path === "/auth/login") {
      const result = await accountService.login(body);
      return response(200, { user: result.user }, { "Set-Cookie": serializeSessionCookie(result.sessionToken, { secure, maxAgeSeconds: SESSION_MAX_AGE_SECONDS }) });
    }
    if (method === "GET" && path === "/auth/session") {
      return user ? response(200, { user }) : response(401, { error: "authentication_required" });
    }
    if (method === "POST" && path === "/auth/logout") {
      accountService.logout(sessionToken);
      return response(200, { ok: true }, { "Set-Cookie": clearSessionCookie({ secure }) });
    }

    const isAccountPath = path === "/me/profile" || path === "/me/career-state";
    if (isAccountPath && !user) return response(401, { error: "authentication_required" });
    if (method === "GET" && path === "/me/profile") return response(200, { profile: accountService.getProfile(user.id) });
    if (method === "PATCH" && path === "/me/profile") return response(200, { profile: accountService.updateProfile(user.id, body) });
    if (method === "GET" && path === "/me/career-state") return response(200, { state: accountService.getCareerState(user.id) });
    if (method === "PUT" && path === "/me/career-state") return response(200, accountService.saveCareerState(user.id, body?.state));
    return { handled: false };
  } catch (error) {
    return failure(error);
  }
}
