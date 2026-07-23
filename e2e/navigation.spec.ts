import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => { await page.goto("/"); await page.evaluate(() => window.localStorage.clear()); });

test("low-grade student completes an exploration action", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByRole("radio", { name: "低年级学生" }).check();
  await page.getByRole("button", { name: "继续" }).click();
  await page.getByRole("button", { name: "生成我的行动计划" }).click();
  await expect(page.getByRole("heading", { name: /你好/ })).toBeVisible();
  await expect(page.getByText("AI 未配置，规则计划可用。")).toBeVisible();
  await page.getByRole("link", { name: "开始生成建议" }).click();
  await expect(page.getByRole("heading", { name: "先回答一个真实的问题，再决定是否走远。" })).toBeVisible();
  await page.getByRole("button", { name: "方向设计" }).click();
  await page.getByRole("button", { name: /AI 应用开发/ }).click();
  await page.getByRole("button", { name: "行动创造" }).click();
  await page.getByRole("button", { name: "生成探索行动计划" }).click();
  await expect(page.getByText("完成一个 API 调用小作品")).toBeVisible();
  await page.getByRole("link", { name: "工作台" }).click();
  await page.getByRole("link", { name: "继续我的行动" }).click();
  await expect(page).toHaveURL(/\/student\/awakening$/);
  await expect(page.getByText("完成一个 API 调用小作品")).toBeVisible();
  await page.getByRole("link", { name: "行动计划" }).click();
  await expect(page.getByRole("heading", { name: "让计划进入真实的时间里。" })).toBeVisible();
  await expect(page.getByText("完成一个 API 调用小作品")).toBeVisible();
  await page.getByLabel("这周想推进的一件事").fill("参观一次实验室开放日");
  await page.getByRole("button", { name: "加入计划" }).click();
  await page.reload();
  await expect(page.getByText("参观一次实验室开放日")).toBeVisible();
});

test("higher-grade student completes and reflects on a persisted action", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByRole("radio", { name: "高年级学生" }).check();
  await page.getByRole("button", { name: "继续" }).click();
  await page.getByRole("button", { name: "生成我的行动计划" }).click();
  await page.getByRole("link", { name: "开始生成建议" }).click();
  await expect(page.getByRole("heading", { name: "选择一个想靠近的岗位" })).toBeVisible();
  await page.getByPlaceholder("搜索岗位、行业或工作内容").fill("教育");
  await expect(page.getByRole("button", { name: /教育科技产品经理/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /AI 应用开发工程师/ })).toHaveCount(0);
  await page.getByLabel("清空岗位搜索").click();
  await page.getByRole("button", { name: "生成成长路线图" }).click();
  await page.getByRole("link", { name: "查看已生成计划" }).click();
  const firstToggle = page.locator(".task-row .task-toggle").first();
  await firstToggle.click();
  await expect(page.locator(".task-row").first()).toHaveClass(/is-complete/);
  await page.getByRole("button", { name: "记录复盘" }).click();
  await page.getByLabel("这一步让你确认或改变了什么？").fill("我已经知道下一步要补齐项目经验。");
  await page.getByRole("button", { name: "保存复盘" }).click();
  await expect(page.getByText("我已经知道下一步要补齐项目经验。")).toBeVisible();
  await page.reload();
  await expect(page.locator(".task-row").first()).toHaveClass(/is-complete/);
  await expect(page.getByText("我已经知道下一步要补齐项目经验。")).toBeVisible();
  await page.getByRole("link", { name: "目标诊断" }).click();
  await page.getByRole("button", { name: "生成成长路线图" }).click();
  await page.getByRole("link", { name: "查看已生成计划" }).click();
  await expect(page.locator(".task-row").first()).toHaveClass(/is-complete/);
  await expect(page.getByText("我已经知道下一步要补齐项目经验。")).toBeVisible();
});

test("graduate can build dual-lane planning", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByRole("radio", { name: "研究生" }).check();
  await page.getByRole("button", { name: "继续" }).click();
  await page.getByRole("button", { name: "生成我的行动计划" }).click();
  await page.getByRole("button", { name: "生成我的双线计划" }).click();
  await expect(page.getByRole("alert")).toContainText("请先填写研究方向和希望靠近的产业或场景");
  await page.getByLabel("研究方向").fill("学习分析");
  await page.getByLabel("希望靠近的产业或场景").fill("教育科技");
  await page.getByRole("button", { name: "生成我的双线计划" }).click();
  await expect(page.getByText("研究线")).toBeVisible();
  await expect(page.getByText("职业线")).toBeVisible();
});

test("teacher can filter the anonymized cohort sample", async ({ page }) => {
  await page.goto("/teacher/dashboard");
  await expect(page.getByText("不读取个人画像，不展示可识别记录。")).toBeVisible();
  await page.getByLabel("阶段").selectOption("研究生");
  await expect(page.getByText("模拟样本", { exact: true })).toBeVisible();
});

test("mobile landing and onboarding have no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /不急着决定未来/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: /用两分钟/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
