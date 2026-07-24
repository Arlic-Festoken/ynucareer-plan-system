import { expect, test } from "@playwright/test";
import { registerTestAccount } from "./helpers";

test("account screens keep technical policy copy out of the primary experience", async ({ page }) => {
  const technicalCopy = /不采集|独立盐值|数据隔离|规划所需字段|身份证号|HttpOnly|SQLite|服务端数据库|数据边界/;

  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "建立自己的行动节奏。" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(technicalCopy);

  await registerTestAccount(page);
  await page.goto("/account/profile");
  await expect(page.locator("body")).not.toContainText(technicalCopy);
  await expect(page.getByRole("heading", { name: "完善学习背景" })).toBeVisible();
});

test("account API persists profile and career state behind an HttpOnly session", async ({ request }) => {
  const email = `student-${Date.now()}@ynu.edu.cn`;
  const register = await request.post("http://127.0.0.1:8787/auth/register", {
    data: { email, password: "career-plan-2026", displayName: "云同学" },
  });
  expect(register.status()).toBe(201);
  expect((await register.json()).user).toMatchObject({ email, displayName: "云同学" });
  expect(register.headers()["set-cookie"]).toContain("HttpOnly");

  const session = await request.get("http://127.0.0.1:8787/auth/session");
  expect(session.status()).toBe(200);
  expect((await session.json()).user.email).toBe(email);

  const profile = await request.patch("http://127.0.0.1:8787/me/profile", {
    data: { university: "云南大学", college: "软件学院", major: "软件工程", grade: 3, bio: "关注数据产品与人工智能" },
  });
  expect(profile.status()).toBe(200);
  expect((await profile.json()).profile).toMatchObject({ university: "云南大学", major: "软件工程", grade: 3 });

  const saveState = await request.put("http://127.0.0.1:8787/me/career-state", {
    data: { state: { hasOnboarded: true, selectedJobId: "data-analyst" } },
  });
  expect(saveState.status()).toBe(200);
  const state = await request.get("http://127.0.0.1:8787/me/career-state");
  expect(await state.json()).toMatchObject({ state: { hasOnboarded: true, selectedJobId: "data-analyst" } });

  const logout = await request.post("http://127.0.0.1:8787/auth/logout", { data: {} });
  expect(logout.status()).toBe(200);
  expect((await request.get("http://127.0.0.1:8787/auth/session")).status()).toBe(401);
});

test("student registers, completes onboarding, edits profile and returns after login", async ({ page }) => {
  const email = `ui-${Date.now()}@ynu.edu.cn`;
  await page.goto("/student/home");
  await expect(page).toHaveURL(/\/login\?next=%2Fstudent%2Fhome$/);

  await page.getByRole("link", { name: "创建账号" }).click();
  await page.getByLabel("昵称").fill("云同学");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("career-plan-2026");
  await page.getByRole("button", { name: "创建账号" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByRole("radio", { name: "高年级学生" }).check();
  await page.getByRole("button", { name: "继续" }).click();
  await page.getByRole("button", { name: "生成我的行动计划" }).click();
  await expect(page).toHaveURL(/\/student\/home$/);

  await page.getByRole("link", { name: "个人资料" }).click();
  await page.getByLabel("学校").fill("云南大学");
  await page.getByLabel("学院").fill("软件学院");
  await page.getByLabel("个人简介").fill("关注数据产品与人工智能");
  await page.getByRole("button", { name: "保存个人资料" }).click();
  await expect(page.getByRole("status")).toContainText("已保存");

  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("career-plan-2026");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/student\/home$/);
  await page.goto("/account/profile");
  await expect(page.getByLabel("学校")).toHaveValue("云南大学");
  await expect(page.getByLabel("学院")).toHaveValue("软件学院");
  await expect(page.getByLabel("个人简介")).toHaveValue("关注数据产品与人工智能");
});
