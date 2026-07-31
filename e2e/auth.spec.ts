import { expect, test } from "@playwright/test";
import { onboardRole, registerTestAccount } from "./helpers";

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

test("account API persists profile and career state behind an HttpOnly session", async ({ request, baseURL }) => {
  const apiBase = `${baseURL}/api`;
  const email = `student-${Date.now()}@ynu.edu.cn`;
  const register = await request.post(`${apiBase}/auth/register`, {
    data: { email, password: "career-plan-2026", displayName: "云同学" },
  });
  expect(register.status()).toBe(201);
  expect((await register.json()).user).toMatchObject({ email, displayName: "云同学" });
  expect(register.headers()["set-cookie"]).toContain("HttpOnly");

  const session = await request.get(`${apiBase}/auth/session`);
  expect(session.status()).toBe(200);
  expect((await session.json()).user.email).toBe(email);

  const profile = await request.patch(`${apiBase}/me/profile`, {
    data: { university: "云南大学", college: "软件学院", major: "软件工程", grade: 3, bio: "关注数据产品与人工智能" },
  });
  expect(profile.status()).toBe(200);
  expect((await profile.json()).profile).toMatchObject({ university: "云南大学", major: "软件工程", grade: 3 });

  const saveState = await request.put(`${apiBase}/me/career-state`, {
    data: { state: { hasOnboarded: true, selectedJobId: "data-analyst" } },
  });
  expect(saveState.status()).toBe(200);
  const state = await request.get(`${apiBase}/me/career-state`);
  expect(await state.json()).toMatchObject({ state: { hasOnboarded: true, selectedJobId: "data-analyst" } });

  const logout = await request.post(`${apiBase}/auth/logout`, { data: {} });
  expect(logout.status()).toBe(200);
  expect((await request.get(`${apiBase}/auth/session`)).status()).toBe(401);
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
  await page.getByRole("button", { name: "保存并继续" }).click();
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

test("a new account never inherits another account's local career plan", async ({ page }) => {
  await onboardRole(page, "高年级学生");
  await expect(page).toHaveURL(/\/student\/home$/);

  const secondEmail = `second-${Date.now()}@ynu.edu.cn`;
  const registerSecond = await page.context().request.post("/api/auth/register", {
    data: { email: secondEmail, password: "career-plan-2026", displayName: "第二位同学" },
  });
  expect(registerSecond.status()).toBe(201);

  await page.reload();
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { name: /用两分钟/ })).toBeVisible();
});

test("failed cloud sync keeps the account's local plan for the next login", async ({ page }) => {
  const email = `offline-${Date.now()}@ynu.edu.cn`;
  const password = "career-plan-2026";
  await page.goto("/register");
  await page.getByLabel("昵称").fill("离线同学");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "创建账号" }).click();
  await page.getByRole("radio", { name: "高年级学生" }).check();
  await page.getByRole("button", { name: "继续" }).click();
  await page.getByRole("button", { name: "保存并继续" }).click();
  await expect(page).toHaveURL(/\/student\/home$/);

  await page.route("**/api/me/career-state", async (route) => {
    if (route.request().method() === "PUT") {
      await route.fulfill({ status: 503, json: { message: "暂时无法同步" } });
      return;
    }
    await route.continue();
  });
  await page.goto("/student/ai-planning");
  await page.getByLabel("已有经历或优势证据").fill("断网也不能丢的规划上下文");
  await expect(page.getByRole("button", { name: /已保存在本机/ })).toBeEnabled();
  const localPlanBeforeLogout = await page.evaluate(() => Object.entries(localStorage)
    .filter(([key]) => key.startsWith("career-navigation-account-v1:"))
    .map(([, value]) => JSON.parse(value)));
  expect(localPlanBeforeLogout).toEqual(expect.arrayContaining([
    expect.objectContaining({
      dirty: true,
      state: expect.objectContaining({
        aiPlanning: expect.objectContaining({ strengthEvidence: "断网也不能丢的规划上下文" }),
      }),
    }),
  ]));

  await page.getByRole("link", { name: "个人资料" }).click();
  await page.getByRole("button", { name: "退出登录" }).click();
  const localPlanAfterLogout = await page.evaluate(() => Object.entries(localStorage)
    .filter(([key]) => key.startsWith("career-navigation-account-v1:"))
    .map(([, value]) => JSON.parse(value)));
  expect(localPlanAfterLogout).toEqual(expect.arrayContaining([
    expect.objectContaining({
      dirty: true,
      state: expect.objectContaining({
        aiPlanning: expect.objectContaining({ strengthEvidence: "断网也不能丢的规划上下文" }),
      }),
    }),
  ]));
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/student\/home$/);
  await page.goto("/student/ai-planning");
  await expect(page.getByLabel("已有经历或优势证据")).toHaveValue("断网也不能丢的规划上下文");
});

test("a generated learning path restores in a fresh browser context", async ({ browser, baseURL }) => {
  const email = `cross-device-${Date.now()}@ynu.edu.cn`;
  const password = "career-plan-2026";
  const firstContext = await browser.newContext({ baseURL });
  const firstPage = await firstContext.newPage();
  await firstPage.goto("/register");
  await firstPage.getByLabel("昵称").fill("跨设备同学");
  await firstPage.getByLabel("邮箱").fill(email);
  await firstPage.getByLabel("密码").fill(password);
  await firstPage.getByRole("button", { name: "创建账号" }).click();
  await firstPage.getByRole("radio", { name: "高年级学生" }).check();
  await firstPage.getByRole("button", { name: "继续" }).click();
  await firstPage.getByRole("button", { name: "保存并继续" }).click();
  await firstPage.goto("/student/learning-path");
  await firstPage.getByRole("button", { name: "载入示例并立即生成" }).click();
  await firstPage.getByRole("button", { name: "生成针对性学习路径" }).click();
  await expect(firstPage.getByRole("heading", { name: "双线并行" })).toBeVisible();
  await expect(firstPage.getByRole("button", { name: /已自动保存/ })).toBeVisible();
  await firstContext.close();

  const secondContext = await browser.newContext({ baseURL });
  const secondPage = await secondContext.newPage();
  await secondPage.goto("/login");
  await secondPage.getByLabel("邮箱").fill(email);
  await secondPage.getByLabel("密码").fill(password);
  await secondPage.getByRole("button", { name: "登录" }).click();
  await expect(secondPage).toHaveURL(/\/student\/home$/);
  await secondPage.goto("/student/learning-path");
  await expect(secondPage.getByRole("heading", { name: "双线并行" })).toBeVisible();
  await expect(secondPage.getByText(/导入 16 门课/)).toBeVisible();
  await secondContext.close();
});

test("blocked browser storage falls back to account sync without breaking the workspace", async ({ page }) => {
  await registerTestAccount(page);
  await page.addInitScript(() => {
    Object.defineProperties(Storage.prototype, {
      getItem: { configurable: true, value: () => { throw new Error("storage blocked"); } },
      setItem: { configurable: true, value: () => { throw new Error("storage blocked"); } },
      removeItem: { configurable: true, value: () => { throw new Error("storage blocked"); } },
    });
  });
  await page.goto("/onboarding");
  await expect(page.getByRole("alert")).toContainText("暂时无法自动保存");
  await expect(page.getByRole("heading", { name: /用两分钟/ })).toBeVisible();
  await page.getByRole("radio", { name: "高年级学生" }).check();
  await page.getByRole("button", { name: "继续" }).click();
  await page.getByRole("button", { name: "保存并继续" }).click();
  await expect(page).toHaveURL(/\/student\/home$/);
});
