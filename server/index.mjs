import http from "node:http";
import { resolve } from "node:path";
import { createAccountService } from "./account-service.mjs";
import { handleAccountRequest } from "./account-http.mjs";
import { buildCoachRequest, parseCoachResponse, sanitizeCoachInput } from "./coach.mjs";
import { createDatabase } from "./database.mjs";
import { handleOpportunityRequest, isOpportunityPath } from "./opportunity-http.mjs";
import { createOpportunityService } from "./opportunity-service.mjs";
import { handlePilotRequest, isPilotPath } from "./pilot-http.mjs";
import { createPilotService } from "./pilot-service.mjs";
import { createRateLimiter } from "./rate-limit.mjs";
import {
  buildActionPlanRequest,
  buildDirectionRequest,
  parseActionPlanResponse,
  parseDirectionResponse,
  sanitizeDirectionInput,
  sanitizePlanInput,
} from "./planner.mjs";

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "0.0.0.0";
const apiKey = process.env.DEEPSEEK_API_KEY?.trim() || "";
const model = ["deepseek-v4-flash", "deepseek-v4-pro"].includes(process.env.DEEPSEEK_MODEL) ? process.env.DEEPSEEK_MODEL : "deepseek-v4-flash";
const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
const databasePath = process.env.DATABASE_PATH || resolve("data", "career.db");
const database = createDatabase(databasePath);
const pilotService = createPilotService(database);
const accountService = createAccountService(database, {
  teacherEmails: process.env.CAREER_TEACHER_EMAILS || "",
  invitedEmails: process.env.CAREER_INVITED_EMAILS || "",
  registrationMode: process.env.REGISTRATION_MODE || (process.env.NODE_ENV === "production" ? "invite" : "open"),
  permissionResolver: pilotService.permissionsFor,
});
const opportunityService = createOpportunityService(database, { pilotService });
const aiRateLimiter = createRateLimiter({ limit: 12, windowMs: 60_000 });
const authRateLimiter = createRateLimiter({ limit: 30, windowMs: 10 * 60_000 });

function sendJson(response, status, body, extraHeaders = {}) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extraHeaders });
  response.end(JSON.stringify(body));
}

function sendRaw(response, status, body, contentType, extraHeaders = {}) {
  response.writeHead(status, { "Content-Type": contentType, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extraHeaders });
  response.end(body);
}

function clientAddress(request) {
  const forwarded = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || request.socket.remoteAddress || "unknown";
}

function rateLimited(response, result) {
  return sendJson(
    response,
    429,
    { error: "rate_limited", message: "尝试次数过多，请稍后再试。" },
    { "Retry-After": String(result.retryAfterSeconds) },
  );
}

function readJson(request, maxSize = 32_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let raw = "";
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxSize) {
        reject(new Error("body_too_large"));
        request.destroy();
        return;
      }
      raw += chunk;
    });
    request.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error("invalid_json")); }
    });
    request.on("error", reject);
  });
}

async function requestDeepSeek(providerRequest, parser) {
  if (!apiKey) {
    const error = new Error("ai_not_configured");
    error.status = 503;
    throw error;
  }
  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(providerRequest),
    signal: AbortSignal.timeout(40_000),
  });
  if (!upstream.ok) {
    const error = new Error(upstream.status === 401 ? "provider_credential_error" : "provider_unavailable");
    error.status = upstream.status === 401 ? 502 : 503;
    throw error;
  }
  const response = await upstream.json();
  return parser(response?.choices?.[0]?.message?.content);
}

async function getAdvice(payload) {
  return requestDeepSeek(buildCoachRequest(sanitizeCoachInput(payload), model), parseCoachResponse);
}

async function getDirections(payload) {
  return requestDeepSeek(buildDirectionRequest(sanitizeDirectionInput(payload), model), parseDirectionResponse);
}

async function getActionPlan(payload) {
  return requestDeepSeek(buildActionPlanRequest(sanitizePlanInput(payload), model), parseActionPlanResponse);
}

function errorResponse(error) {
  const code = error instanceof Error ? error.message : "provider_unavailable";
  const badRequest = ["body_too_large", "invalid_json", "direction_required"].includes(code);
  const status = typeof error?.status === "number" ? error.status : badRequest ? 400 : 503;
  const message = code === "ai_not_configured"
    ? "AI 服务尚未配置；本地规则建议仍可使用。"
    : code === "direction_required"
      ? "请先选择一个方向候选。"
      : "AI 服务暂时不可用，请稍后重试。";
  return { status, body: { error: code, message } };
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://localhost");
  if (request.method === "GET" && url.pathname === "/healthz") {
    return sendJson(response, 200, {
      status: "ok",
      provider: "deepseek",
      model,
      ai: apiKey ? "ready" : "not_configured",
      database: "ready",
      schemaVersion: database.schemaVersion,
      identityProvider: process.env.IDENTITY_PROVIDER || "local",
      registrationMode: process.env.REGISTRATION_MODE || (process.env.NODE_ENV === "production" ? "invite" : "open"),
      capabilities: ["accounts", "profiles", "career-state-sync", "seven-dimension-ability-profile", "authoritative-actions", "official-resource-governance", "participation-evidence-review", "notifications", "anonymous-cohort-insights", "coach", "direction-candidates", "personalized-action-plan"],
    });
  }
  if (url.pathname.startsWith("/auth/") || ["/me/profile", "/me/career-state"].includes(url.pathname)) {
    try {
      if (request.method === "POST" && ["/auth/register", "/auth/login"].includes(url.pathname)) {
        const limitResult = authRateLimiter.consume(clientAddress(request));
        if (!limitResult.allowed) return rateLimited(response, limitResult);
      }
      const hasBody = ["POST", "PUT", "PATCH"].includes(request.method || "");
      const body = hasBody ? await readJson(request, 160_000) : undefined;
      const forwardedProto = String(request.headers["x-forwarded-proto"] || "").split(",")[0].trim();
      const result = await handleAccountRequest({
        method: request.method || "GET",
        path: url.pathname,
        headers: request.headers,
        body,
        secure: process.env.COOKIE_SECURE === "true" || forwardedProto === "https",
      }, accountService);
      if (result.handled) return sendJson(response, result.status, result.body, result.headers);
    } catch (error) {
      const code = error instanceof Error ? error.message : "invalid_request";
      const status = ["body_too_large", "invalid_json"].includes(code) ? 400 : 500;
      return sendJson(response, status, { error: code, message: status === 400 ? "请求数据格式不正确。" : "服务暂时不可用。" });
    }
  }
  if (isOpportunityPath(url.pathname)) {
    try {
      const hasBody = ["POST", "PATCH"].includes(request.method || "");
      const body = hasBody ? await readJson(request, 32_000) : undefined;
      const result = handleOpportunityRequest({ method: request.method || "GET", path: url.pathname, headers: request.headers, body }, accountService, opportunityService);
      if (result.handled) return sendJson(response, result.status, result.body, result.headers);
    } catch (error) {
      const code = error instanceof Error ? error.message : "invalid_request";
      return sendJson(response, ["body_too_large", "invalid_json"].includes(code) ? 400 : 500, { error: code, message: "请求数据格式不正确。" });
    }
  }
  if (isPilotPath(url.pathname)) {
    try {
      const hasBody = ["POST", "PATCH"].includes(request.method || "");
      const body = hasBody ? await readJson(request, 64_000) : undefined;
      const result = handlePilotRequest({ method: request.method || "GET", path: url.pathname, headers: request.headers, body }, accountService, pilotService);
      if (result.handled) return result.raw
        ? sendRaw(response, result.status, result.body, result.contentType, result.headers)
        : sendJson(response, result.status, result.body, result.headers);
    } catch (error) {
      const code = error instanceof Error ? error.message : "invalid_request";
      return sendJson(response, ["body_too_large", "invalid_json"].includes(code) ? 400 : 500, { error: code, message: "请求数据格式不正确。" });
    }
  }
  // Public callers use /api/*. Both the Vite dev proxy and Nginx strip
  // that public prefix before forwarding to this internal-only service.
  const handlers = {
    "/coach": { key: "advice", run: getAdvice, promptVersion: "coach-v1" },
    "/planning/directions": { key: "result", run: getDirections, promptVersion: "direction-candidates-v2" },
    "/planning/actions": { key: "result", run: getActionPlan, promptVersion: "action-plan-v2" },
  };
  const handler = handlers[url.pathname];
  if (request.method === "POST" && handler) {
    const limitResult = aiRateLimiter.consume(clientAddress(request));
    if (!limitResult.allowed) return rateLimited(response, limitResult);
    if (!String(request.headers["content-type"] || "").includes("application/json")) return sendJson(response, 415, { error: "json_required" });
    try {
      const result = await handler.run(await readJson(request));
      return sendJson(response, 200, {
        [handler.key]: result,
        meta: {
          provider: "deepseek",
          model,
          generatedAt: new Date().toISOString(),
          promptVersion: handler.promptVersion,
          ruleVersion: "career-rules-0.7.0",
          resourceIds: [],
        },
      });
    } catch (error) {
      const failure = errorResponse(error);
      return sendJson(response, failure.status, failure.body);
    }
  }
  return sendJson(response, 404, { error: "not_found" });
});

server.listen(port, host);
