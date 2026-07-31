import { expect, test } from "@playwright/test";
import { onboardRole, registerAndOpenOnboarding } from "./helpers";

test("landing previews a verified campus action instead of a research interview", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("加入一项校内数据实践")).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/岗位访谈|准备 3 个访谈问题|联系 1 位相关从业者/);
});

test("low-grade student calibrates once, then uses AI planning as the only planning entry", async ({ page }) => {
  await onboardRole(page, "低年级学生");
  await expect(page).toHaveURL(/\/student\/awakening$/);
  await expect(page.getByRole("heading", { name: "用一次校准，建立规划起点。" })).toBeVisible();
  await page.getByRole("button", { name: "方向设计" }).click();
  await page.getByRole("button", { name: /AI 应用开发/ }).click();
  await page.getByRole("button", { name: "保存方向并进入 AI 规划" }).click();
  await expect(page).toHaveURL(/\/student\/ai-planning$/);
  await expect(page.locator(".direction-context-card")).toContainText("AI 应用开发");
  await expect(page.getByRole("navigation", { name: "工作区导航" }).getByRole("link", { name: "探索方向" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "工作区导航" }).getByRole("link", { name: "AI 规划" })).toHaveCount(1);

  await page.getByRole("link", { name: "重新校准方向" }).click();
  await expect(page).toHaveURL(/\/student\/awakening$/);
  await expect(page.getByRole("heading", { name: "重新校准方向画像。" })).toBeVisible();
  await page.getByRole("button", { name: "方向设计" }).click();
  await page.getByRole("button", { name: /数据分析与决策支持/ }).click();
  await page.getByRole("button", { name: "保存调整并返回 AI 规划" }).click();
  await expect(page.getByRole("status").filter({ hasText: "方向画像已更新" })).toBeVisible();

  await page.getByRole("link", { name: "个人资料" }).click();
  await expect(page.getByRole("link", { name: "重新校准方向" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "重新校准方向" })).toBeVisible();
});

test("mobile direction calibration keeps its save action above the tab bar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await onboardRole(page, "低年级学生");
  await page.getByRole("button", { name: "方向设计" }).click();
  await page.getByRole("button", { name: /AI 应用开发/ }).click();
  await page.getByRole("button", { name: "确认画像" }).click();
  const save = page.getByRole("button", { name: "保存方向并进入 AI 规划" });
  await expect(save).toBeInViewport();
  await save.click();
  await expect(page).toHaveURL(/\/student\/ai-planning$/);
});

test("higher-grade student advances a server-authoritative action and keeps it after reload", async ({ page }) => {
  await onboardRole(page, "高年级学生");
  await page.getByRole("link", { name: "目标诊断", exact: true }).click();
  await expect(page.getByRole("heading", { name: "选择一个想靠近的岗位" })).toBeVisible();
  await page.getByPlaceholder("搜索岗位、行业或工作内容").fill("教育");
  await expect(page.getByRole("button", { name: /教育科技产品经理/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /AI 应用开发工程师/ })).toHaveCount(0);
  await page.getByLabel("清空岗位搜索").click();
  await page.getByRole("button", { name: "生成成长路线图" }).click();
  await page.getByRole("link", { name: "查看已生成计划" }).click();
  const firstAction = page.locator(".action-item").first();
  const firstTitle = await firstAction.locator(".action-item-title").textContent();
  const firstToggle = firstAction.locator(".task-toggle");
  await firstToggle.click();
  await expect(firstAction).toHaveClass(/is-in_progress/);
  await firstToggle.click();
  await expect(firstAction).toHaveClass(/is-completed/);
  await page.reload();
  const persistedAction = page.locator(".action-item").filter({ hasText: firstTitle || "" });
  await expect(persistedAction).toHaveClass(/is-completed/);
  await page.getByRole("link", { name: "目标诊断", exact: true }).click();
  await page.getByRole("button", { name: "生成成长路线图" }).click();
  await page.getByRole("link", { name: "查看已生成计划" }).click();
  await expect(page.locator(".action-item").filter({ hasText: firstTitle || "" })).toHaveClass(/is-completed/);
});

test("graduate can build dual-lane planning", async ({ page }) => {
  await onboardRole(page, "研究生");
  await page.getByRole("button", { name: "生成我的双线计划" }).click();
  await expect(page.getByRole("alert")).toContainText("请先填写研究方向和希望靠近的产业或场景");
  await page.getByLabel("研究方向").fill("学习分析");
  await page.getByLabel("希望靠近的产业或场景").fill("教育科技");
  await page.getByRole("button", { name: "生成我的双线计划" }).click();
  await expect(page.getByText("研究线")).toBeVisible();
  await expect(page.getByText("职业线")).toBeVisible();
});

test("teacher resource workspace requires a configured staff account", async ({ page }) => {
  await page.goto("/teacher/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fteacher%2Fdashboard$/);
});

test("mobile landing and onboarding have no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /找到方向/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await registerAndOpenOnboarding(page);
  await expect(page.getByRole("heading", { name: /用两分钟/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
