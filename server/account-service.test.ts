// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createAccountService } from "./account-service.mjs";
import { createDatabase } from "./database.mjs";

function createService() {
  const database = createDatabase(":memory:");
  let id = 0;
  const service = createAccountService(database, {
    now: () => new Date("2026-07-24T08:00:00.000Z"),
    randomId: () => `id-${++id}`,
    randomToken: () => `token-${id}`,
  });
  return { database, service };
}

describe("account service", () => {
  it("registers a user, creates a session and returns a safe account", async () => {
    const { database, service } = createService();
    const result = await service.register({ email: "Student@YNU.EDU.CN", password: "1234567890", displayName: "小云" });
    expect(result.user).toMatchObject({ id: "id-1", email: "student@ynu.edu.cn", displayName: "小云" });
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(result.sessionToken).toBe("token-1");
    expect(service.authenticate("token-1")).toMatchObject({ email: "student@ynu.edu.cn" });
    database.close();
  });

  it("rejects duplicate registration and invalid login without revealing which field failed", async () => {
    const { database, service } = createService();
    await service.register({ email: "student@ynu.edu.cn", password: "1234567890", displayName: "小云" });
    await expect(service.register({ email: "student@ynu.edu.cn", password: "abcdefghij", displayName: "重复" })).rejects.toThrow("email_exists");
    await expect(service.login({ email: "missing@ynu.edu.cn", password: "1234567890" })).rejects.toThrow("invalid_credentials");
    await expect(service.login({ email: "student@ynu.edu.cn", password: "wrong-password" })).rejects.toThrow("invalid_credentials");
    database.close();
  });

  it("logs in, updates profile and synchronizes career state per account", async () => {
    const { database, service } = createService();
    await service.register({ email: "student@ynu.edu.cn", password: "1234567890", displayName: "小云" });
    const login = await service.login({ email: "student@ynu.edu.cn", password: "1234567890" });
    const user = service.authenticate(login.sessionToken);
    expect(user).not.toBeNull();
    const profile = service.updateProfile(user!.id, { university: "云南大学", college: "软件学院", major: "软件工程", grade: 3, bio: "想探索数据产品", ignored: "drop-me" });
    expect(profile).toMatchObject({ university: "云南大学", college: "软件学院", major: "软件工程", grade: 3, bio: "想探索数据产品" });
    expect(profile).not.toHaveProperty("ignored");
    service.saveCareerState(user!.id, { hasOnboarded: true, selectedJobId: "data-analyst" });
    expect(service.getCareerState(user!.id)).toMatchObject({ hasOnboarded: true, selectedJobId: "data-analyst" });
    service.logout(login.sessionToken);
    expect(service.authenticate(login.sessionToken)).toBeNull();
    database.close();
  });

  it("supports invite-only pilot registration without inventing university SSO", async () => {
    const database = createDatabase(":memory:");
    const service = createAccountService(database, {
      registrationMode: "invite",
      invitedEmails: "invited@ynu.edu.cn",
      teacherEmails: "teacher@ynu.edu.cn",
      randomId: () => crypto.randomUUID(),
      randomToken: () => crypto.randomUUID(),
    });
    await expect(service.register({ email: "public@ynu.edu.cn", password: "1234567890", displayName: "未邀请" }))
      .rejects.toThrow("registration_invite_required");
    await expect(service.register({ email: "invited@ynu.edu.cn", password: "1234567890", displayName: "试点学生" }))
      .resolves.toMatchObject({ user: { role: "student" } });
    await expect(service.register({ email: "teacher@ynu.edu.cn", password: "1234567890", displayName: "试点教师" }))
      .resolves.toMatchObject({ user: { role: "teacher" } });
    database.close();
  });
});
