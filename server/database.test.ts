// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createDatabase } from "./database.mjs";

describe("SQLite account database", () => {
  it("creates users and enforces normalized email uniqueness", () => {
    const database = createDatabase(":memory:");
    const user = database.createUser({ id: "user-1", email: "student@ynu.edu.cn", passwordHash: "hash", displayName: "小云", createdAt: "2026-07-24T00:00:00.000Z" });
    expect(user).toMatchObject({ id: "user-1", email: "student@ynu.edu.cn", displayName: "小云" });
    expect(() => database.createUser({ id: "user-2", email: "student@ynu.edu.cn", passwordHash: "other", displayName: "重复", createdAt: "2026-07-24T00:00:00.000Z" })).toThrow("email_exists");
    expect(database.findUserByEmail("student@ynu.edu.cn")?.passwordHash).toBe("hash");
    database.close();
  });

  it("resolves only active sessions and deletes them on logout", () => {
    const database = createDatabase(":memory:");
    database.createUser({ id: "user-1", email: "student@ynu.edu.cn", passwordHash: "hash", displayName: "小云", createdAt: "2026-07-24T00:00:00.000Z" });
    database.createSession({ tokenHash: "token-hash", userId: "user-1", createdAt: "2026-07-24T00:00:00.000Z", expiresAt: "2026-08-24T00:00:00.000Z" });
    expect(database.findSessionUser("token-hash", "2026-07-25T00:00:00.000Z")).toMatchObject({ id: "user-1", email: "student@ynu.edu.cn" });
    expect(database.findSessionUser("token-hash", "2026-09-01T00:00:00.000Z")).toBeNull();
    database.deleteSession("token-hash");
    expect(database.findSessionUser("token-hash", "2026-07-25T00:00:00.000Z")).toBeNull();
    database.close();
  });

  it("stores profile and career state separately for each user", () => {
    const database = createDatabase(":memory:");
    for (const id of ["user-1", "user-2"]) {
      database.createUser({ id, email: `${id}@ynu.edu.cn`, passwordHash: "hash", displayName: id, createdAt: "2026-07-24T00:00:00.000Z" });
    }
    database.upsertProfile("user-1", { university: "云南大学", college: "软件学院", major: "软件工程", grade: 3, bio: "喜欢数据产品" }, "2026-07-24T01:00:00.000Z");
    database.saveCareerState("user-1", { hasOnboarded: true, selectedJobId: "data-analyst" }, "2026-07-24T01:00:00.000Z");
    expect(database.getProfile("user-1")).toMatchObject({ university: "云南大学", major: "软件工程", grade: 3 });
    expect(database.getCareerState("user-1")).toMatchObject({ hasOnboarded: true, selectedJobId: "data-analyst" });
    expect(database.getProfile("user-2")).toBeNull();
    expect(database.getCareerState("user-2")).toBeNull();
    database.close();
  });
});
