import { expect, test } from "@playwright/test";
import { clearLocalCareerData, onboardRole, registerTestAccount } from "./helpers";

async function onboardHigherGrade(page: import("@playwright/test").Page) {
  await onboardRole(page, "高年级学生");
}

async function expectTextContrast(
  page: import("@playwright/test").Page,
  foregroundSelector: string,
  backgroundSelector: string,
  minimum = 4.5,
) {
  const result = await page.evaluate(({ foregroundSelector: foreground, backgroundSelector: background }) => {
    const foregroundElement = document.querySelector(foreground);
    const backgroundElement = document.querySelector(background);
    if (!foregroundElement || !backgroundElement) return null;
    const parseRgb = (value: string) => {
      const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
      return channels?.length === 3 ? channels : null;
    };
    const foregroundRgb = parseRgb(getComputedStyle(foregroundElement).color);
    const backgroundRgb = parseRgb(getComputedStyle(backgroundElement).backgroundColor);
    if (!foregroundRgb || !backgroundRgb) return null;
    const luminance = (channels: number[]) => channels
      .map((channel) => channel / 255)
      .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const foregroundLuminance = luminance(foregroundRgb);
    const backgroundLuminance = luminance(backgroundRgb);
    const ratio = (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
      / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
    return {
      ratio,
      foreground: getComputedStyle(foregroundElement).color,
      background: getComputedStyle(backgroundElement).backgroundColor,
    };
  }, { foregroundSelector, backgroundSelector });
  expect(result, `${foregroundSelector} and ${backgroundSelector} should be rendered`).not.toBeNull();
  expect(result?.ratio, `${foregroundSelector}: ${result?.foreground} on ${result?.background}`).toBeGreaterThanOrEqual(minimum);
}

test("all four higher-grade pathways generate executable plans", async ({ page }) => {
  await onboardHigherGrade(page);
  await page.getByRole("link", { name: "目标诊断", exact: true }).click();

  for (const pathway of ["推免", "考研", "考公"] as const) {
    await page.getByRole("button", { name: new RegExp(`^${pathway}`) }).click();
    await page.getByRole("button", { name: `生成${pathway}行动计划` }).click();
    await expect(page.getByRole("link", { name: "查看已生成计划" })).toBeVisible();
  }

  await page.getByRole("button", { name: /^就业/ }).click();
  await page.getByRole("button", { name: "生成成长路线图" }).click();
  await page.getByRole("link", { name: "查看已生成计划" }).click();
  await expect(page.locator(".action-item")).not.toHaveCount(0);
});

test("roadmap supports custom actions and persists them", async ({ page }) => {
  await onboardHigherGrade(page);
  await page.getByRole("link", { name: "目标诊断", exact: true }).click();
  await page.getByRole("button", { name: "生成成长路线图" }).click();
  await page.getByRole("link", { name: "查看已生成计划" }).click();
  await page.getByLabel("行动名称").fill("完成一次行业岗位分析");
  await page.getByLabel("具体说明").fill("对照三个公开岗位描述，整理共同能力要求和当前差距。");
  await page.getByRole("button", { name: "加入行动" }).click();
  const customAction = page.locator(".action-item").filter({ hasText: "完成一次行业岗位分析" });
  await expect(customAction.locator(".action-item-title")).toHaveText("完成一次行业岗位分析");
  await page.reload();
  await expect(customAction.locator(".action-item-title")).toHaveText("完成一次行业岗位分析");
});

test("curriculum import generates a detailed algorithm topology and saves near-term actions", async ({ page }) => {
  await onboardHigherGrade(page);
  await page.goto("/student/learning-path");
  await page.getByRole("button", { name: "载入示例并立即生成" }).click();
  await expect(page.getByText(/已载入 16 门计算机类示例课程/)).toBeVisible();
  await page.getByLabel("专业排名前 %").fill("12");
  await page.getByRole("button", { name: "生成针对性学习路径" }).click();
  await expect(page.getByRole("heading", { name: "保研主线，考研保底" })).toBeVisible();
  await expect(page.getByRole("region", { name: "算法工程师学习路径拓扑图" })).toBeVisible();
  await page.getByRole("button", { name: /吴恩达神经网络课程/ }).click();
  await expect(page.getByRole("heading", { name: "吴恩达神经网络课程 → PyTorch" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Deep Learning Specialization/ }).first()).toHaveAttribute("href", /^https:\/\//);
  await page.getByRole("button", { name: "加入行动中心" }).click();
  await expect(page.getByText(/已把当前和下一阶段的/)).toBeVisible();
  await page.getByRole("link", { name: "查看行动计划" }).click();
  await expect(page.locator(".action-item").filter({ hasText: "把高数线代迁移到机器学习" })).toBeVisible();
});

test("route guards, 404 and AI fallback behave safely", async ({ page, request, baseURL }) => {
  await clearLocalCareerData(page);
  await page.goto("/student/matching");
  await expect(page).toHaveURL(/\/login\?next=%2Fstudent%2Fmatching$/);
  await page.goto("/a-page-that-does-not-exist");
  await expect(page.getByRole("heading", { name: "这里没有你要找的页面。" })).toBeVisible();

  const apiBase = `${baseURL}/api`;
  const health = await request.get(`${apiBase}/healthz`);
  expect(health.ok()).toBeTruthy();
  expect(await health.json()).toMatchObject({
    status: "ok",
    provider: "deepseek",
    schemaVersion: 8,
    registrationMode: "open",
    capabilities: expect.arrayContaining(["seven-dimension-ability-profile", "participation-evidence-review", "anonymous-cohort-insights"]),
  });
  const coach = await request.post(`${apiBase}/coach`, { data: { profile: {} } });
  expect([200, 503]).toContain(coach.status());
  const directions = await request.post(`${apiBase}/planning/directions`, { data: { profile: {} } });
  expect([200, 503]).toContain(directions.status());
});

test("low-year AI planning keeps calibration separate from the only authoritative plan", async ({ page }) => {
  await page.route("**/api/healthz", async (route) => route.fulfill({ json: { status: "ok", provider: "deepseek", model: "deepseek-v4-flash", ai: "ready" } }));
  await page.route("**/api/planning/directions", async (route) => route.fulfill({
    json: {
      result: {
        overview: "先用一个校园 AI 小作品验证方向，再决定是否继续投入。",
        candidates: [{
          id: "ai-campus-builder",
          title: "校园 AI 应用开发",
          specialization: "围绕真实校园问题完成可测试的小应用",
          fit: "优先验证",
          rationale: "与当前兴趣和已选择的 AI 应用方向一致。",
          problemExamples: ["校园问答", "学习辅助"],
          evidenceNeeded: ["可运行作品", "一次用户反馈"],
          tradeoffs: "需要控制范围，先完成最小版本。",
          firstExperiment: { title: "完成 API 调用小作品", detail: "实现最小闭环。", successSignal: "一名同学可以完成试用。" },
        }],
        reflectionQuestion: "完成作品后，你是否愿意继续解决同类问题？",
      },
      meta: { provider: "deepseek", model: "deepseek-v4-flash", generatedAt: "2026-07-31T00:00:00.000Z" },
    },
  }));
  await page.route("**/api/planning/actions", async (route) => route.fulfill({
    json: {
      result: {
        directionTitle: "校园 AI 应用开发",
        objective: "四周内完成一次校园 AI 应用方向验证。",
        strategy: "以 AI 计划为主线，并复用已经完成的探索证据。",
        tasks: [{
          title: "完成一个 AI API 调用小作品",
          detail: "选择校园问答场景，实现输入、调用和结果展示。",
          week: "第 1–2 周",
          evidence: "可运行链接和一页说明",
          priority: "high",
          category: "project",
        }, {
          title: "完成一次用户测试并整理结论",
          detail: "邀请一名同学试用，记录问题并完成一次修正。",
          week: "第 3–4 周",
          evidence: "测试记录和改进清单",
          priority: "medium",
          category: "practice",
        }],
        checkpoints: [{ week: "第 2 周", question: "是否已经形成可运行闭环？" }],
        risks: ["范围过大，迟迟没有可测试版本"],
      },
      meta: { provider: "deepseek", model: "deepseek-v4-flash", generatedAt: "2026-07-31T00:00:00.000Z" },
    },
  }));

  await onboardRole(page, "低年级学生");
  await page.getByRole("button", { name: /方向设计/ }).click();
  await page.getByRole("button", { name: /AI 应用开发/ }).click();
  await page.getByRole("button", { name: "保存方向并进入 AI 规划" }).click();

  await page.goto("/student/ai-planning");
  await page.getByText("教育科技", { exact: true }).click();
  await page.getByRole("button", { name: "生成 3 个细分方向" }).click();
  await page.getByRole("button", { name: /校园 AI 应用开发/ }).click();
  await page.getByRole("button", { name: "生成个性化行动计划" }).click();
  await page.getByRole("button", { name: "保存并融合行动计划" }).click();
  await expect(page.locator(".direction-context-card")).toContainText("AI 应用开发");
  await expect(page.getByText("已融合为一份行动计划")).toBeVisible();
  await expect(page.getByText("AI 主线 2 项")).toBeVisible();
  await expect(page.getByText("替换重复 0 项")).toBeVisible();
  await page.getByRole("link", { name: /已保存，查看行动计划/ }).click();

  await expect(page.getByText("AI 主线", { exact: true })).toBeVisible();
  await expect(page.locator(".action-item").filter({ hasText: "完成一个 AI API 调用小作品" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("AI 主线", { exact: true })).toBeVisible();
  await expect(page.locator(".action-item").filter({ hasText: "完成一个 AI API 调用小作品" })).toHaveCount(1);

  await page.goto("/student/ai-planning");
  await page.getByRole("link", { name: "重新校准方向" }).click();
  await page.getByRole("button", { name: "方向设计" }).click();
  await page.getByRole("button", { name: /数据分析与决策支持/ }).click();
  await page.getByRole("button", { name: "保存调整并返回 AI 规划" }).click();
  await expect(page.getByText("现有计划基于旧方向画像")).toBeVisible();
  await expect(page.getByRole("heading", { name: "四周内完成一次校园 AI 应用方向验证。" })).toBeVisible();
  await page.goto("/student/roadmap");
  await expect(page.locator(".action-item").filter({ hasText: "完成一个 AI API 调用小作品" })).toHaveCount(1);
});

test("DeepSeek planning flow creates candidates and saves a personalized plan", async ({ page }) => {
  await page.route("**/api/healthz", async (route) => route.fulfill({ json: { status: "ok", provider: "deepseek", model: "deepseek-v4-flash", ai: "ready" } }));
  await page.route("**/api/planning/directions", async (route) => route.fulfill({
    json: {
      result: {
        overview: "根据当前画像，先比较教育数据、AI 产品实验和数据治理三个细分方向。",
        candidates: ["学习产品数据分析", "教育 AI 产品实验", "数据质量与治理"].map((title, index) => ({
          id: `ai-direction-${index + 1}`,
          title,
          specialization: index === 0 ? "聚焦学习行为、留存与产品改进" : "用小型项目验证问题场景",
          fit: index === 0 ? "优先验证" : index === 1 ? "值得比较" : "探索备选",
          rationale: "兴趣、价值偏好和已有项目均支持先做一次低成本验证。",
          problemExamples: ["识别学习流失节点", "评估功能效果"],
          evidenceNeeded: ["一页分析报告", "一次真实反馈"],
          tradeoffs: "需要同时补充业务理解和数据表达。",
          firstExperiment: { title: "完成公开数据小实验", detail: "定义问题、分析数据并形成三项发现。", successSignal: "形成一页可复核的分析结论。" },
        })),
        reflectionQuestion: "你最愿意连续两周处理哪类问题？",
      },
      meta: { provider: "deepseek", model: "deepseek-v4-flash", generatedAt: "2026-07-23T00:00:00.000Z" },
    },
  }));
  await page.route("**/api/planning/actions", async (route) => route.fulfill({
    json: {
      result: {
        directionTitle: "学习产品数据分析",
        objective: "八周内完成一次学习产品数据分析方向验证。",
        strategy: "先用公开数据完成小实验，再通过真实反馈决定是否继续投入。",
        tasks: Array.from({ length: 5 }, (_, index) => ({
          title: ["定义一个学习产品问题", "完成公开数据清洗", "形成三项分析发现", "完成一页能力对照", "整理方向复盘"][index],
          detail: "完成一个有明确产出的步骤，并保留过程记录。",
          week: `第 ${index + 1} 周`,
          evidence: "一页成果记录",
          priority: index < 2 ? "high" : "medium",
          category: index === 3 ? "career" : index === 4 ? "reflection" : "project",
        })),
        checkpoints: [{ week: "第 2 周", question: "是否愿意继续处理这个问题？" }, { week: "第 5 周", question: "真实反馈是否支持继续投入？" }],
        risks: [
          "代码版本或数据集问题失败时，先预留时间调试或简化模型。",
          "时间预算不足时，优先保证复现和复盘两项核心任务。",
          "社区讨论无人回复时，改为阅读并总结一篇高质量讨论帖。",
        ],
      },
      meta: { provider: "deepseek", model: "deepseek-v4-flash", generatedAt: "2026-07-23T00:00:00.000Z" },
    },
  }));

  await onboardHigherGrade(page);
  await page.goto("/student/ai-planning");
  await expect(page.getByText("DeepSeek 已连接")).toBeVisible();
  await page.getByText("教育科技", { exact: true }).click();
  await page.getByLabel("已有经历或优势证据").fill("做过校园数据可视化项目，负责需求梳理与数据清洗。");
  await page.getByRole("button", { name: "生成 3 个细分方向" }).click();
  await expect(page.getByRole("button", { name: /学习产品数据分析/ })).toBeVisible();
  await page.getByRole("button", { name: /学习产品数据分析/ }).click();
  await page.getByRole("button", { name: "生成个性化行动计划" }).click();
  await expect(page.getByRole("heading", { name: "八周内完成一次学习产品数据分析方向验证。" })).toBeVisible();
  const checkpointQuestion = page.getByText("是否愿意继续处理这个问题？");
  const riskItem = page.getByText("代码版本或数据集问题失败时，先预留时间调试或简化模型。");
  await expect(checkpointQuestion).toBeVisible();
  await expect(riskItem).toBeVisible();
  expect((await checkpointQuestion.boundingBox())?.width).toBeGreaterThan(180);
  expect((await riskItem.boundingBox())?.width).toBeGreaterThan(250);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  expect((await checkpointQuestion.boundingBox())?.width).toBeGreaterThan(180);
  expect((await riskItem.boundingBox())?.width).toBeGreaterThan(240);
  await page.getByRole("button", { name: "保存并融合行动计划" }).click();
  await page.getByRole("link", { name: /已保存，查看行动计划/ }).click();
  const savedAction = page.locator(".action-item").filter({ hasText: "定义一个学习产品问题" });
  await expect(savedAction.locator(".action-item-title")).toHaveText("定义一个学习产品问题");
  await page.reload();
  await expect(savedAction.locator(".action-item-title")).toHaveText("定义一个学习产品问题");
});

test("core workspaces avoid horizontal overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await onboardHigherGrade(page);
  for (const path of ["/student/home", "/student/matching", "/student/opportunities", "/student/abilities", "/student/ai-planning", "/student/roadmap", "/student/learning-path"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), path).toBeTruthy();
  }
});

test("dark theme keeps student workspace text readable", async ({ page }) => {
  await onboardHigherGrade(page);
  await page.evaluate(() => localStorage.setItem("career-theme", "dark"));
  await page.goto("/student/home");
  await expect(page.locator(".ai-coach-card")).toBeVisible();
  await expectTextContrast(page, ".ai-coach-heading h2", ".ai-coach-card");
  await expectTextContrast(page, ".ai-coach-heading p", ".ai-coach-card");
  await expectTextContrast(page, ".ai-coach-card .section-kicker", ".ai-coach-card");

  await page.goto("/student/abilities");
  await expect(page.locator(".ability-next-step")).toBeVisible();
  await expectTextContrast(page, ".ability-next-step h2", ".ability-next-step");
  await expectTextContrast(page, ".ability-next-step p", ".ability-next-step");

  await page.goto("/student/matching");
  await expect(page.locator(".ai-planning-entry")).toBeVisible();
  await expectTextContrast(page, ".ai-planning-entry strong", ".ai-planning-entry");
  await expectTextContrast(page, ".ai-planning-entry p", ".ai-planning-entry");
  await expectTextContrast(page, ".job-options button:not(.is-selected) strong", ".job-options button:not(.is-selected)");
  await expectTextContrast(page, ".diagnosis-explainer > div > p", ".diagnosis-explainer");

  await page.goto("/student/opportunities");
  await expect(page.locator(".resource-context")).toBeVisible();
  await expectTextContrast(page, ".resource-context p", ".resource-context");
  await expectTextContrast(page, ".resource-filters button.is-active", ".resource-filters button.is-active");

  await page.goto("/student/ai-planning");
  await expect(page.locator(".ai-fallback")).toBeVisible();
  await expectTextContrast(page, ".ai-fallback strong", ".ai-fallback");
  await expectTextContrast(page, ".ai-fallback p", ".ai-fallback");

  await page.goto("/student/roadmap");
  await expect(page.locator(".quick-add")).toBeVisible();
  await expectTextContrast(page, ".quick-add label", ".quick-add");
});

test("mobile navigation exposes secondary features and learning paths use a readable step list", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await onboardHigherGrade(page);

  await page.getByRole("button", { name: "更多" }).click();
  const allFeatures = page.getByRole("dialog", { name: "全部功能" });
  await expect(allFeatures).toBeVisible();
  await expect(allFeatures.getByRole("link", { name: "学习路径图" })).toBeVisible();
  await expect(allFeatures.getByRole("link", { name: "能力与证据" })).toBeVisible();
  await expect(allFeatures.getByRole("link", { name: "AI 规划" })).toBeVisible();
  await expect(allFeatures.getByRole("link", { name: "个人资料" })).toBeVisible();

  await allFeatures.getByRole("link", { name: "学习路径图" }).click();
  await page.getByRole("button", { name: "载入示例并立即生成" }).click();
  await expect(page.getByLabel("算法工程师学习路径步骤")).toBeVisible();
  await expect(page.getByRole("region", { name: "算法工程师学习路径拓扑图" })).toBeHidden();
  await expect(page.locator(".learning-path-mobile-list button")).toHaveCount(11);
  await page.locator(".learning-path-mobile-list button").nth(1).click();
  await expect(page.locator(".learning-path-mobile-list button").nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".path-resource-grid a").nth(7)).toBeHidden();
  await page.getByRole("button", { name: "查看全部 8 个资源" }).click();
  await expect(page.locator(".path-resource-grid a").nth(7)).toBeVisible();

  const mobileNavigation = page.getByRole("navigation", { name: "移动端主导航" });
  await page.evaluate(() => window.scrollTo(0, 900));
  await expect(mobileNavigation).toHaveClass(/is-hidden/);
  await page.evaluate(() => window.scrollBy(0, -120));
  await expect(mobileNavigation).not.toHaveClass(/is-hidden/);
});

test("job search exposes a clear empty state", async ({ page }) => {
  await onboardHigherGrade(page);
  await page.getByRole("link", { name: "目标诊断", exact: true }).click();
  await page.getByLabel("行业场景").selectOption("教育科技");
  await expect(page.getByRole("button", { name: /教育科技产品经理/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /AI 应用开发工程师/ })).toHaveCount(0);
  await page.getByPlaceholder("搜索岗位、行业或工作内容").fill("不存在的岗位关键字");
  await expect(page.getByText("没有找到匹配岗位")).toBeVisible();
  await page.getByRole("button", { name: "清除筛选" }).click();
  await expect(page.getByText("3 个结果")).toBeVisible();
});

test("student onboarding never grants teacher resource permissions", async ({ page }) => {
  await onboardHigherGrade(page);
  await page.goto("/teacher/dashboard");
  await expect(page).toHaveURL(/\/student\/home$/);
  await expect(page.getByRole("link", { name: "试点工作台" })).toHaveCount(0);
});

test("partial legacy browser data migrates into a usable profile", async ({ page }) => {
  await registerTestAccount(page);
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
  await expect(page.getByRole("heading", { name: /今天，先推进/ })).toBeVisible();
  await expect(page.getByText(/通信工程/).first()).toBeVisible();
  await page.getByRole("link", { name: "目标诊断", exact: true }).click();
  await expect(page.getByRole("heading", { name: "选择一个想靠近的岗位" })).toBeVisible();
});
