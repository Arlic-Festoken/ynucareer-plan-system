// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createAccountService } from "./account-service.mjs";
import { handleAccountRequest } from "./account-http.mjs";
import { createDatabase } from "./database.mjs";

function setup() {
  const database = createDatabase(":memory:");
  let id = 0;
  const service = createAccountService(database, {
    now: () => new Date("2026-07-24T08:00:00.000Z"),
    randomId: () => `user-${++id}`,
    randomToken: () => `session-${id}`,
  });
  return { database, service };
}

describe("account HTTP contract", () => {
  it("registers, returns HttpOnly cookie and exposes the current session", async () => {
    const { database, service } = setup();
    const registered = await handleAccountRequest({
      method: "POST",
      path: "/auth/register",
      headers: { "content-type": "application/json" },
      body: { email: "student@ynu.edu.cn", password: "1234567890", displayName: "小云" },
      secure: false,
    }, service);
    expect(registered).toMatchObject({ handled: true, status: 201, body: { user: { email: "student@ynu.edu.cn" } } });
    expect(registered.headers?.["Set-Cookie"]).toContain("HttpOnly");

    const cookie = registered.headers?.["Set-Cookie"].split(";")[0];
    const session = await handleAccountRequest({ method: "GET", path: "/auth/session", headers: { cookie }, secure: false }, service);
    expect(session).toMatchObject({ status: 200, body: { user: { displayName: "小云" } } });
    database.close();
  });

  it("protects profile and career state, then persists both for the session user", async () => {
    const { database, service } = setup();
    const unauthorized = await handleAccountRequest({ method: "GET", path: "/me/profile", headers: {}, secure: false }, service);
    expect(unauthorized).toMatchObject({ handled: true, status: 401, body: { error: "authentication_required" } });

    const registered = await handleAccountRequest({
      method: "POST",
      path: "/auth/register",
      headers: { "content-type": "application/json" },
      body: { email: "student@ynu.edu.cn", password: "1234567890", displayName: "小云" },
      secure: true,
    }, service);
    const cookie = registered.headers?.["Set-Cookie"].split(";")[0];

    const profile = await handleAccountRequest({
      method: "PATCH",
      path: "/me/profile",
      headers: { cookie, "content-type": "application/json" },
      body: { university: "云南大学", college: "软件学院", major: "软件工程", grade: 3, bio: "关注数据产品" },
      secure: true,
    }, service);
    expect(profile).toMatchObject({ status: 200, body: { profile: { major: "软件工程", grade: 3 } } });

    const saved = await handleAccountRequest({
      method: "PUT",
      path: "/me/career-state",
      headers: { cookie, "content-type": "application/json" },
      body: { state: { hasOnboarded: true, selectedJobId: "data-analyst" } },
      secure: true,
    }, service);
    expect(saved.status).toBe(200);
    const loaded = await handleAccountRequest({ method: "GET", path: "/me/career-state", headers: { cookie }, secure: true }, service);
    expect(loaded).toMatchObject({
      status: 200,
      body: {
        state: { hasOnboarded: true, selectedJobId: "data-analyst" },
        updatedAt: "2026-07-24T08:00:00.000Z",
      },
    });
    database.close();
  });

  it("clears the session cookie on logout and keeps unknown routes unhandled", async () => {
    const { database, service } = setup();
    const registered = await handleAccountRequest({
      method: "POST",
      path: "/auth/register",
      headers: { "content-type": "application/json" },
      body: { email: "student@ynu.edu.cn", password: "1234567890", displayName: "小云" },
      secure: false,
    }, service);
    const cookie = registered.headers?.["Set-Cookie"].split(";")[0];
    const logout = await handleAccountRequest({ method: "POST", path: "/auth/logout", headers: { cookie, "content-type": "application/json" }, body: {}, secure: false }, service);
    expect(logout.headers?.["Set-Cookie"]).toContain("Max-Age=0");
    expect((await handleAccountRequest({ method: "GET", path: "/auth/session", headers: { cookie }, secure: false }, service)).status).toBe(401);
    expect(await handleAccountRequest({ method: "GET", path: "/not-account", headers: {}, secure: false }, service)).toEqual({ handled: false });
    database.close();
  });
});
