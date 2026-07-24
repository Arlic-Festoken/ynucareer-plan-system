import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createDatabase(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const database = new Database(path, { timeout: 5000 });
  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = WAL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      university TEXT NOT NULL DEFAULT '',
      college TEXT NOT NULL DEFAULT '',
      major TEXT NOT NULL DEFAULT '',
      grade INTEGER NOT NULL DEFAULT 1,
      bio TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS career_states (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT;
  `);

  const statements = {
    insertUser: database.prepare("INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"),
    userByEmail: database.prepare("SELECT * FROM users WHERE email = ?"),
    userById: database.prepare("SELECT * FROM users WHERE id = ?"),
    insertSession: database.prepare("INSERT OR REPLACE INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"),
    sessionUser: database.prepare("SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?"),
    deleteSession: database.prepare("DELETE FROM sessions WHERE token_hash = ?"),
    upsertProfile: database.prepare(`
      INSERT INTO user_profiles (user_id, university, college, major, grade, bio, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        university = excluded.university,
        college = excluded.college,
        major = excluded.major,
        grade = excluded.grade,
        bio = excluded.bio,
        updated_at = excluded.updated_at
    `),
    profileByUser: database.prepare("SELECT university, college, major, grade, bio, updated_at FROM user_profiles WHERE user_id = ?"),
    saveState: database.prepare(`
      INSERT INTO career_states (user_id, data_json, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
    `),
    stateByUser: database.prepare("SELECT data_json, updated_at FROM career_states WHERE user_id = ?"),
  };

  return {
    createUser({ id, email, passwordHash, displayName, createdAt }) {
      try {
        statements.insertUser.run(id, email, passwordHash, displayName, createdAt, createdAt);
      } catch (error) {
        if (String(error?.message).includes("UNIQUE constraint failed: users.email")) throw new Error("email_exists");
        throw error;
      }
      return publicUser(statements.userById.get(id));
    },
    findUserByEmail(email) {
      const row = statements.userByEmail.get(email);
      return row ? { ...publicUser(row), passwordHash: row.password_hash } : null;
    },
    createSession({ tokenHash, userId, createdAt, expiresAt }) {
      statements.insertSession.run(tokenHash, userId, createdAt, expiresAt);
    },
    findSessionUser(tokenHash, now) {
      return publicUser(statements.sessionUser.get(tokenHash, now));
    },
    deleteSession(tokenHash) {
      statements.deleteSession.run(tokenHash);
    },
    upsertProfile(userId, profile, updatedAt) {
      statements.upsertProfile.run(userId, profile.university ?? "", profile.college ?? "", profile.major ?? "", profile.grade ?? 1, profile.bio ?? "", updatedAt);
      return this.getProfile(userId);
    },
    getProfile(userId) {
      const row = statements.profileByUser.get(userId);
      return row ? {
        university: row.university,
        college: row.college,
        major: row.major,
        grade: row.grade,
        bio: row.bio,
        updatedAt: row.updated_at,
      } : null;
    },
    saveCareerState(userId, state, updatedAt) {
      statements.saveState.run(userId, JSON.stringify(state), updatedAt);
    },
    getCareerState(userId) {
      const row = statements.stateByUser.get(userId);
      return row ? safeJson(row.data_json) : null;
    },
    close() {
      database.close();
    },
  };
}
