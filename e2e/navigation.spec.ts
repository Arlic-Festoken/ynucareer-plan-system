import { expect, test } from "@playwright/test";
import { onboardRole, registerAndOpenOnboarding } from "./helpers";

test("landing previews a verified campus action instead of a research interview", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("加入一项校内数据实践")).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/岗位访谈|准备 3 个访谈问题|联系 1 位相关从业者/);
});

test("low-grade student completes an exploration action", async ({ page }) => {
  await onboardRole(page, "低年级学生");
  await expect(page.getByRole("heading", { name: /今天，先推进/ })).toBeVisible();
  await expect(page.getByText("AI 未配置，规则计划可用。")).toBeVisible();
  await page.getByRole("link", { name: "探索方向" }).click();
  await expect(page.getByRole("heading", { name: "先回答一个真实的问题，再决定是否走远。" })).toBeVisible();
  await page.getByRole("button", { name: "方向设计" }).click();
  await page.getByRole("button", { name: /AI 应用开发/ }).click();
  await page.getByRole("button", { name: "行动创造" }).click();
  await page.getByRole("button", { name: "生成探索行动计划" }).click();
  await expect(page.getByText("完成一个 API 调用小作品")).toBeVisible();
  await page.getByRole("link", { name: "工作台" }).click();
  await page.getByRole("link", { name: "探索方向" }).click();
  await expect(page).toHaveURL(/\/student\/awakening$/);
  await expect(page.getByText("完成一个 API 调用小作品")).toBeVisible();
  await page.getByRole("link", { name: "行动计划" }).click();
  await expect(page.getByRole("heading", { name: "让计划进入真实的时间。" })).toBeVisible();
  const generatedAction = page.locator(".action-item").filter({ hasText: "完成一个 API 调用小作品" });
  await expect(generatedAction.locator(".action-item-title")).toHaveText("完成一个 API 调用小作品");
  await expect(page.getByText("服务端行动档案")).toBeVisible();
  await expect(page.getByText("你的行动正在积累证据")).toBeVisible();
  await generatedAction.getByText("查看执行蓝图").click();
  await expect(generatedAction.getByText("建议执行")).toBeVisible();
  await expect(generatedAction.locator(".action-blueprint-steps li")).toHaveCount(3);

  await page.getByLabel("行动名称").fill("完成一次实验室开放日观察记录");
  await page.getByLabel("怎么开始").fill("观察开放日中的三个真实问题，整理成一页场景记录。");
  await page.getByLabel("分类").selectOption("practice");
  await page.getByLabel("截止日期").fill("2026-08-15");
  await page.getByRole("button", { name: "加入行动" }).click();
  await page.reload();
  const manualAction = page.locator(".action-item").filter({ hasText: "完成一次实验室开放日观察记录" });
  await expect(manualAction).toContainText("观察开放日中的三个真实问题");
  await expect(manualAction).toContainText("8月15日截止");
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
