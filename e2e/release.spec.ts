import { expect, test } from "@playwright/test";

async function onboardHigherGrade(page: import("@playwright/test").Page) {
  await page.goto("/onboarding");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByRole("radio", { name: "高年级学生" }).check();
  await page.getByRole("button", { name: "继续" }).click();
  await page.getByRole("button", { name: "生成我的行动计划" }).click();
}

test("all four higher-grade pathways generate executable plans", async ({ page }) => {
  await onboardHigherGrade(page);
  await page.getByRole("link", { name: "目标诊断" }).click();

  for (const pathway of ["推免", "考研", "考公"] as const) {
    await page.getByRole("button", { name: new RegExp(`^${pathway}`) }).click();
    await page.getByRole("button", { name: `生成${pathway}行动计划` }).click();
    await expect(page.getByRole("link", { name: "查看已生成计划" })).toBeVisible();
  }

  await page.getByRole("button", { name: /^就业/ }).click();
  await page.getByRole("button", { name: "生成成长路线图" }).click();
  await page.getByRole("link", { name: "查看已生成计划" }).click();
  await expect(page.locator(".task-row")).not.toHaveCount(0);
});

test("roadmap supports custom actions and persists them", async ({ page }) => {
  await onboardHigherGrade(page);
  await page.getByRole("link", { name: "目标诊断" }).click();
  await page.getByRole("button", { name: "生成成长路线图" }).click();
  await page.getByRole("link", { name: "查看已生成计划" }).click();
  await page.getByLabel("这周想推进的一件事").fill("完成一次行业访谈");
  await page.getByRole("button", { name: "加入计划" }).click();
  await expect(page.getByText("完成一次行业访谈")).toBeVisible();
  await page.reload();
  await expect(page.getByText("完成一次行业访谈")).toBeVisible();
});

test("route guards, 404 and AI fallback behave safely", async ({ page, request }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.goto("/student/matching");
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.goto("/a-page-that-does-not-exist");
  await expect(page.getByRole("heading", { name: "这里没有你要找的页面。" })).toBeVisible();

  const health = await request.get("http://127.0.0.1:8787/healthz");
  expect(health.ok()).toBeTruthy();
  expect(await health.json()).toMatchObject({ status: "ok", provider: "deepseek" });
  const coach = await request.post("http://127.0.0.1:8787/coach", { data: { profile: {} } });
  expect([200, 503]).toContain(coach.status());
});

test("core workspaces avoid horizontal overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await onboardHigherGrade(page);
  for (const path of ["/student/home", "/student/matching", "/student/roadmap", "/teacher/dashboard"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), path).toBeTruthy();
  }
});

test("job search exposes a clear empty state", async ({ page }) => {
  await onboardHigherGrade(page);
  await page.getByRole("link", { name: "目标诊断" }).click();
  await page.getByLabel("行业场景").selectOption("教育科技");
  await expect(page.getByRole("button", { name: /教育科技产品经理/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /AI 应用开发工程师/ })).toHaveCount(0);
  await page.getByPlaceholder("搜索岗位、行业或工作内容").fill("不存在的岗位关键字");
  await expect(page.getByText("没有找到匹配岗位")).toBeVisible();
  await page.getByRole("button", { name: "清除筛选" }).click();
  await expect(page.getByText("3 个结果")).toBeVisible();
});

test("teacher workspace keeps teacher navigation after student onboarding", async ({ page }) => {
  await onboardHigherGrade(page);
  await page.goto("/teacher/dashboard");
  await expect(page.getByRole("link", { name: "模拟洞察" })).toBeVisible();
  await expect(page.getByText("教师端 · 脱敏模拟数据")).toBeVisible();
  await expect(page.getByRole("link", { name: "工作台" })).toHaveCount(0);
});

test("teacher empty filters recover without generating fake advice", async ({ page }) => {
  await page.goto("/teacher/dashboard");
  await page.getByLabel("阶段").selectOption("低年级");
  await page.getByLabel("专业").selectOption("数据科学与大数据技术");
  await expect(page.getByText("没有符合筛选条件的模拟记录。")).toBeVisible();
  await expect(page.getByText(/围绕“暂无”/)).toHaveCount(0);
  await page.getByRole("button", { name: "清除筛选" }).click();
  await expect(page.getByText("9", { exact: true })).toBeVisible();
});

test("partial legacy browser data migrates into a usable profile", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("career-navigation-v1", JSON.stringify({
      version: 0,
      state: {
        hasOnboarded: true,
        profile: { role: "junior", grade: 3, major: "通信工程", abilityScores: { programming: 72 } },
        awakening: { activeStep: 3 },
      },
    }));
  });
  await page.goto("/student/home");
  await expect(page.getByRole("heading", { name: /你好/ })).toBeVisible();
  await expect(page.getByText(/通信工程/).first()).toBeVisible();
  await page.getByRole("link", { name: "目标诊断" }).click();
  await expect(page.getByRole("heading", { name: "选择一个想靠近的岗位" })).toBeVisible();
});
