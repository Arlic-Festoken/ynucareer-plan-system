const COOKIE_NAME = "career_session";

export function serializeSessionCookie(token, { secure, maxAgeSeconds }) {
  return [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
    `Max-Age=${Math.max(0, Math.round(maxAgeSeconds))}`,
  ].filter(Boolean).join("; ");
}

export function clearSessionCookie({ secure }) {
  return serializeSessionCookie("", { secure, maxAgeSeconds: 0 });
}

export function readSessionCookie(header) {
  const cookies = typeof header === "string" ? header.split(";") : [];
  for (const cookie of cookies) {
    const [name, ...parts] = cookie.trim().split("=");
    if (name !== COOKIE_NAME) continue;
    try {
      return decodeURIComponent(parts.join("="));
    } catch {
      return "";
    }
  }
  return "";
}
