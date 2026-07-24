// @vitest-environment node
import { describe, expect, it } from "vitest";
import { clearSessionCookie, readSessionCookie, serializeSessionCookie } from "./http-auth.mjs";

describe("session cookies", () => {
  it("uses HttpOnly, SameSite and optional Secure attributes", () => {
    const cookie = serializeSessionCookie("secret-token", { secure: true, maxAgeSeconds: 3600 });
    expect(cookie).toContain("career_session=secret-token");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("Path=/");
  });

  it("reads only the named session cookie and clears it safely", () => {
    expect(readSessionCookie("theme=dark; career_session=abc%20123; other=value")).toBe("abc 123");
    expect(readSessionCookie("theme=dark")).toBe("");
    expect(clearSessionCookie({ secure: false })).toContain("Max-Age=0");
  });
});
