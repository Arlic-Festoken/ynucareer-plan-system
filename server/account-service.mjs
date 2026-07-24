import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword, hashSessionToken, normalizeEmail, validateRegistration, verifyPassword } from "./auth-core.mjs";

const SESSION_DAYS = 30;

function text(value, limit) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function safeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function sanitizeProfile(input) {
  const grade = Number(input?.grade);
  return {
    university: text(input?.university, 80),
    college: text(input?.college, 80),
    major: text(input?.major, 80),
    grade: Number.isFinite(grade) ? Math.max(1, Math.min(7, Math.round(grade))) : 1,
    bio: text(input?.bio, 300),
  };
}

export function createAccountService(database, options = {}) {
  const now = options.now ?? (() => new Date());
  const randomId = options.randomId ?? (() => randomUUID());
  const randomToken = options.randomToken ?? (() => randomBytes(32).toString("base64url"));

  function createSession(userId) {
    const createdAt = now();
    const expiresAt = new Date(createdAt.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    const sessionToken = randomToken();
    database.createSession({
      tokenHash: hashSessionToken(sessionToken),
      userId,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
    return { sessionToken, expiresAt: expiresAt.toISOString() };
  }

  return {
    async register(input) {
      const validation = validateRegistration(input);
      if (!validation.ok) throw new Error(validation.error);
      const createdAt = now().toISOString();
      const user = database.createUser({
        id: randomId(),
        email: validation.value.email,
        passwordHash: await hashPassword(validation.value.password),
        displayName: validation.value.displayName,
        createdAt,
      });
      return { user: safeUser(user), ...createSession(user.id) };
    },
    async login(input) {
      const email = normalizeEmail(input?.email);
      const password = typeof input?.password === "string" ? input.password : "";
      const user = database.findUserByEmail(email);
      if (!user || !(await verifyPassword(password, user.passwordHash))) throw new Error("invalid_credentials");
      return { user: safeUser(user), ...createSession(user.id) };
    },
    authenticate(sessionToken) {
      if (!sessionToken) return null;
      return safeUser(database.findSessionUser(hashSessionToken(sessionToken), now().toISOString()));
    },
    logout(sessionToken) {
      if (sessionToken) database.deleteSession(hashSessionToken(sessionToken));
    },
    getProfile(userId) {
      return database.getProfile(userId);
    },
    updateProfile(userId, input) {
      return database.upsertProfile(userId, sanitizeProfile(input), now().toISOString());
    },
    getCareerState(userId) {
      return database.getCareerState(userId);
    },
    saveCareerState(userId, state) {
      if (!state || typeof state !== "object" || Array.isArray(state)) throw new Error("invalid_career_state");
      const serialized = JSON.stringify(state);
      if (serialized.length > 128_000) throw new Error("career_state_too_large");
      database.saveCareerState(userId, state, now().toISOString());
      return { updatedAt: now().toISOString() };
    },
  };
}
