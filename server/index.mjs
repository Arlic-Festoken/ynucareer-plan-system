import http from "node:http";
import { buildCoachRequest, parseCoachResponse, sanitizeCoachInput } from "./coach.mjs";

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "0.0.0.0";
const apiKey = process.env.DEEPSEEK_API_KEY?.trim() || "";
const model = ["deepseek-v4-flash", "deepseek-v4-pro"].includes(process.env.DEEPSEEK_MODEL) ? process.env.DEEPSEEK_MODEL : "deepseek-v4-flash";
const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
const requests = new Map();
const windowMs = 60_000;
const limitPerWindow = 12;

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  response.end(JSON.stringify(body));
}

function allowed(clientIp) {
  const now = Date.now();
  const current = (requests.get(clientIp) || []).filter((time) => now - time < windowMs);
  if (current.length >= limitPerWindow) return false;
  current.push(now);
  requests.set(clientIp, current);
  return true;
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let raw = "";
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 32_000) {
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

async function getAdvice(payload) {
  if (!apiKey) {
    const error = new Error("ai_not_configured");
    error.status = 503;
    throw error;
  }
  const request = buildCoachRequest(sanitizeCoachInput(payload), model);
  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(25_000),
  });
  if (!upstream.ok) {
    const error = new Error(upstream.status === 401 ? "provider_credential_error" : "provider_unavailable");
    error.status = upstream.status === 401 ? 502 : 503;
    throw error;
  }
  const response = await upstream.json();
  return parseCoachResponse(response?.choices?.[0]?.message?.content);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://localhost");
  if (request.method === "GET" && url.pathname === "/healthz") {
    return sendJson(response, 200, { status: "ok", provider: "deepseek", model, ai: apiKey ? "ready" : "not_configured" });
  }
  // Public callers use /api/coach. Both the Vite dev proxy and Nginx strip
  // that public prefix before forwarding to this internal-only service.
  if (request.method === "POST" && url.pathname === "/coach") {
    const forwarded = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();
    const clientIp = forwarded || request.socket.remoteAddress || "unknown";
    if (!allowed(clientIp)) return sendJson(response, 429, { error: "rate_limited", message: "请稍后再试。" });
    if (!String(request.headers["content-type"] || "").includes("application/json")) return sendJson(response, 415, { error: "json_required" });
    try {
      const advice = await getAdvice(await readJson(request));
      return sendJson(response, 200, { advice });
    } catch (error) {
      const code = error instanceof Error ? error.message : "provider_unavailable";
      const status = typeof error?.status === "number" ? error.status : code === "body_too_large" || code === "invalid_json" ? 400 : 503;
      return sendJson(response, status, { error: code, message: code === "ai_not_configured" ? "AI 服务尚未配置；本地规则建议仍可使用。" : "AI 服务暂时不可用，请稍后重试。" });
    }
  }
  return sendJson(response, 404, { error: "not_found" });
});

server.listen(port, host);
