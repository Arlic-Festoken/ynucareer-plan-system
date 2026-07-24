// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  hashPassword,
  hashSessionToken,
  normalizeEmail,
  validateRegistration,
  verifyPassword,
} from "./auth-core.mjs";

describe("authentication core", () => {
  it("normalizes email and rejects invalid registration input", () => {
    expect(normalizeEmail("  Student@YNU.EDU.CN ")).toBe("student@ynu.edu.cn");
    expect(validateRegistration({ email: "bad", password: "short", displayName: "" })).toMatchObject({
      ok: false,
      error: "invalid_email",
    });
    expect(validateRegistration({ email: "student@ynu.edu.cn", password: "1234567890", displayName: "小云" })).toEqual({
      ok: true,
      value: { email: "student@ynu.edu.cn", password: "1234567890", displayName: "小云" },
    });
  });

  it("hashes passwords with a unique salt and verifies without storing plaintext", async () => {
    const first = await hashPassword("correct horse battery staple");
    const second = await hashPassword("correct horse battery staple");
    expect(first).not.toBe(second);
    expect(first).not.toContain("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", first)).toBe(true);
    expect(await verifyPassword("wrong password", first)).toBe(false);
  });

  it("hashes session tokens deterministically before database storage", () => {
    expect(hashSessionToken("session-token")).toBe(hashSessionToken("session-token"));
    expect(hashSessionToken("session-token")).not.toBe("session-token");
    expect(hashSessionToken("other-token")).not.toBe(hashSessionToken("session-token"));
  });
});
