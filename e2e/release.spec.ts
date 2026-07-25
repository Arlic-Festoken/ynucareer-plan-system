import { expect, test } from "@playwright/test";
import { clearLocalCareerData, onboardRole, registerTestAccount } from "./helpers";

async function onboardHigherGrade(page: import("@playwright/test").Page) {
  await onboardRole(page, "高年级学生");
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
  await page.getByLabel("这周想推进的一件事").fill("完成一次行业岗位分析");
  await page.getByRole("button", { name: "加入计划" }).click();
  await expect(page.getByText("完成一次行业岗位分析")).toBeVisible();
  await page.reload();
  await expect(page.getByText("完成一次行业岗位分析")).toBeVisible();
});

test("route guards, 404 and AI fallback behave safely", async ({ page, request }) => {
  await clearLocalCareerData(page);
  await page.goto("/student/matching");
  await expect(page).toHaveURL(/\/login\?next=%2Fstudent%2Fmatching$/);
  await page.goto("/a-page-that-does-not-exist");
  await expect(page.getByRole("heading", { name: "这里没有你要找的页面。" })).toBeVisible();

  const health = await request.get("http://127.0.0.1:8787/healthz");
  expect(health.ok()).toBeTruthy();
  expect(await health.json()).toMatchObject({ status: "ok", provider: "deepseek" });
  const coach = await request.post("http://127.0.0.1:8787/coach", { data: { profile: {} } });
  expect([200, 503]).toContain(coach.status());
  const directions = await request.post("http://127.0.0.1:8787/planning/directions", { data: { profile: {} } });
  expect([200, 503]).toContain(directions.status());
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
        risks: ["只学习工具，没有形成问题结论"],
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
  await page.getByRole("button", { name: "保存到行动计划" }).click();
  await page.getByRole("link", { name: /已保存，查看行动计划/ }).click();
  await expect(page.getByText("定义一个学习产品问题")).toBeVisible();
  await page.reload();
  await expect(page.getByText("定义一个学习产品问题")).toBeVisible();
});

test("core workspaces avoid horizontal overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await onboardHigherGrade(page);
  for (const path of ["/student/home", "/student/matching", "/student/ai-planning", "/student/roadmap", "/teacher/dashboard"]) {
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
  await expect(page.getByText("教师演示")).toBeVisible();
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
  await expect(page.getByRole("heading", { name: /你好/ })).toBeVisible();
  await expect(page.getByText(/通信工程/).first()).toBeVisible();
  await page.getByRole("link", { name: "目标诊断" }).click();
  await expect(page.getByRole("heading", { name: "选择一个想靠近的岗位" })).toBeVisible();
});
