import { expect, test, type Locator, type Page } from "@playwright/test";

async function submitStudentEvidence(resourceCard: Locator) {
  await resourceCard.getByRole("button", { name: /提交成果|补充成果/ }).click();
  await resourceCard.getByLabel("成果说明").fill("完成校园公开数据清洗、分析和可视化，并保留方法说明。");
  await resourceCard.getByLabel("公开成果链接（可选）").fill("https://portfolio.example.edu.cn/campus-data");
  await resourceCard.getByLabel("行动反思").fill("指标解释仍需更清晰，但已经能够独立完成从问题到结论的过程。");
  await resourceCard.getByRole("button", { name: "提交核验" }).click();
}

async function openEvidenceReview(page: Page, title: string) {
  await page.reload();
  await page.getByRole("button", { name: /成果审核/ }).click();
  const evidenceCard = page.locator(".evidence-review-list article").filter({ hasText: title });
  await expect(evidenceCard).toBeVisible();
  await evidenceCard.getByRole("button", { name: "开始核验" }).click();
}

test("student and staff complete the reviewed resource and evidence feedback loop", async ({ browser, baseURL }) => {
  test.setTimeout(90_000);
  const suffix = Date.now();
  const title = `数据分析实践项目 ${suffix}`;

  const teacher = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const teacherPage = await teacher.newPage();
  const teacherEmail = "teacher-resource-e2e@ynu.edu.cn";
  let teacherSession = await teacher.request.post(`${baseURL}/api/auth/register`, {
    data: { email: teacherEmail, password: "career-plan-2026", displayName: "资源老师" },
  });
  if (teacherSession.status() === 409) {
    teacherSession = await teacher.request.post(`${baseURL}/api/auth/login`, {
      data: { email: teacherEmail, password: "career-plan-2026" },
    });
  }
  expect(teacherSession.status()).toBeLessThan(300);
  expect((await teacherSession.json()).user).toMatchObject({
    role: "teacher",
    permissions: expect.arrayContaining(["publish_opportunity", "review_evidence"]),
  });

  await teacherPage.goto(`${baseURL}/teacher/dashboard`);
  await expect(teacherPage.getByRole("heading", { name: "把资源、反馈和培养改进连成一条线。" })).toBeVisible();
  await teacherPage.getByRole("button", { name: "新建资源" }).first().click();
  const composer = teacherPage.getByRole("form", { name: "新建校内资源" });
  await composer.getByLabel("资源名称").fill(title);
  await composer.getByLabel("提供单位").fill("学院实践中心");
  await composer.getByLabel("资源说明").fill("完成一份校园公开数据分析，并获得一次教师反馈。");
  await composer.getByLabel("官方来源链接").fill("https://example.edu.cn/projects/data");
  await composer.getByLabel("报名 / 预约链接（可选）").fill("https://example.edu.cn/projects/data/apply");
  await composer.getByRole("button", { name: /继续/ }).click();
  await composer.getByLabel("学生应提交的成果").fill("提交 HTTPS 公开成果链接、方法说明和行动复盘。");
  await composer.getByText("数字素养", { exact: true }).click();
  await composer.getByText("责任担当", { exact: true }).click();
  await composer.getByRole("button", { name: /继续/ }).click();
  await expect(composer.getByText(title, { exact: true })).toBeVisible();
  await composer.getByRole("button", { name: "保存草稿并提交审核" }).click();
  await expect(teacherPage.getByRole("status")).toContainText("资源已提交审核");

  const resourceCard = teacherPage.locator(".staff-resource-grid article").filter({ hasText: title });
  await expect(resourceCard).toHaveCount(1);
  await expect(resourceCard.getByText("待审核", { exact: true })).toBeVisible();
  await resourceCard.getByRole("button", { name: "通过" }).click();
  await expect(resourceCard.getByText("已发布", { exact: true })).toBeVisible();
  await expect.poll(() => teacherPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const student = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const studentPage = await student.newPage();
  const studentRegistration = await student.request.post(`${baseURL}/api/auth/register`, {
    data: { email: `student-resource-${suffix}@ynu.edu.cn`, password: "career-plan-2026", displayName: "云同学" },
  });
  expect(studentRegistration.status()).toBe(201);
  await studentPage.goto(`${baseURL}/onboarding`);
  await studentPage.getByRole("radio", { name: "高年级学生" }).check();
  await studentPage.getByRole("button", { name: "继续" }).click();
  await studentPage.getByRole("button", { name: "保存并继续" }).click();
  await studentPage.goto(`${baseURL}/student/opportunities`);

  const studentCard = studentPage.locator(".opportunity-card").filter({ hasText: title });
  await expect(studentCard).toBeVisible();
  await studentCard.getByRole("button", { name: "加入行动" }).click();
  await expect(studentCard.getByText("已加入", { exact: true })).toBeVisible();
  await expect(studentCard.getByRole("link", { name: "前往报名" })).toBeVisible();
  await expect(studentCard.getByText("已报名", { exact: true })).toHaveCount(0);
  await studentCard.getByRole("button", { name: "我已完成报名" }).click();
  await studentCard.getByRole("button", { name: "开始参与" }).click();
  await submitStudentEvidence(studentCard);
  await expect(studentCard.getByText("成果已提交，等待教师核验。")).toBeVisible();

  await openEvidenceReview(teacherPage, title);
  const reviewDialog = teacherPage.getByRole("region", { name: "核验学生成果" });
  await expect(reviewDialog).toContainText(/学生 [A-F0-9]{6}/);
  await expect(reviewDialog).not.toContainText(`student-resource-${suffix}@ynu.edu.cn`);
  await reviewDialog.getByLabel("反馈").fill("请补充指标口径和一条针对结论的真实反馈。");
  await reviewDialog.getByRole("button", { name: "退回补充" }).click();

  await studentPage.reload();
  const returnedCard = studentPage.locator(".opportunity-card").filter({ hasText: title });
  await expect(returnedCard.getByText("请补充指标口径和一条针对结论的真实反馈。")).toBeVisible();
  await submitStudentEvidence(returnedCard);

  await openEvidenceReview(teacherPage, title);
  const verifyDialog = teacherPage.getByRole("region", { name: "核验学生成果" });
  await verifyDialog.getByText("数字素养", { exact: true }).click();
  await verifyDialog.getByLabel("数字素养评分").selectOption("4");
  await verifyDialog.getByLabel("数字素养权重").selectOption("3");
  await verifyDialog.getByLabel("反馈").fill("方法和指标说明完整，能够清晰呈现数据处理过程。");
  await verifyDialog.getByRole("button", { name: "核验并计入能力画像" }).click();

  await studentPage.reload();
  const verifiedCard = studentPage.locator(".opportunity-card").filter({ hasText: title });
  await expect(verifiedCard.getByText("已核验", { exact: true }).first()).toBeVisible();
  await studentPage.goto(`${baseURL}/student/abilities`);
  await expect(studentPage.getByText("1 条已核验证据")).toBeVisible();
  await studentPage.goto(`${baseURL}/student/home`);
  await studentPage.getByRole("link", { name: /条新反馈/ }).click();
  await expect(studentPage).toHaveURL(/\/student\/notifications$/);
  await expect(studentPage.locator(".notification-center article")).toHaveCount(2);
  await studentPage.getByRole("button", { name: "标记已读" }).first().click();
  await expect(studentPage.getByText("已读", { exact: true }).first()).toBeVisible();

  await studentPage.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/student/home", "/student/opportunities", "/student/abilities"]) {
    await studentPage.goto(`${baseURL}${path}`);
    await expect.poll(() => studentPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await teacherPage.setViewportSize({ width: 390, height: 844 });
  await teacherPage.goto(`${baseURL}/teacher/dashboard`);
  await expect.poll(() => teacherPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await Promise.all([teacher.close(), student.close()]);
});
