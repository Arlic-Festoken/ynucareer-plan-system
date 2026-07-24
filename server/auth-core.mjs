import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 160) : "";
}

export function validateRegistration(input) {
  const email = normalizeEmail(input?.email);
  const password = typeof input?.password === "string" ? input.password : "";
  const displayName = typeof input?.displayName === "string" ? input.displayName.trim().slice(0, 40) : "";
  if (!EMAIL_PATTERN.test(email)) return { ok: false, error: "invalid_email" };
  if (password.length < 10 || password.length > 128) return { ok: false, error: "invalid_password" };
  if (!displayName) return { ok: false, error: "display_name_required" };
  return { ok: true, value: { email, password, displayName } };
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${Buffer.from(derived).toString("base64url")}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, saltText, hashText] = typeof encoded === "string" ? encoded.split("$") : [];
  if (algorithm !== "scrypt" || !saltText || !hashText) return false;
  try {
    const expected = Buffer.from(hashText, "base64url");
    const actual = Buffer.from(await scrypt(password, Buffer.from(saltText, "base64url"), expected.length));
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("base64url");
}
