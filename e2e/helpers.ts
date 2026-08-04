import { expect, type Page } from "@playwright/test";

let accountSequence = 0;

export async function registerTestAccount(page: Page, displayName = "测试同学") {
  accountSequence += 1;
  const email = `e2e-${Date.now()}-${accountSequence}@example.edu.cn`;
  const password = "career-plan-2026";
  const response = await page.context().request.post("/api/auth/register", {
    data: { email, password, displayName },
  });
  expect(response.status()).toBe(201);
  return { email, password };
}

export async function clearLocalCareerData(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
}

export async function registerAndOpenOnboarding(page: Page, displayName?: string) {
  await clearLocalCareerData(page);
  const account = await registerTestAccount(page, displayName);
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: /用两分钟/ })).toBeVisible();
  return account;
}

export async function onboardRole(page: Page, roleName: "低年级学生" | "高年级学生" | "研究生") {
  await registerAndOpenOnboarding(page);
  await page.getByRole("radio", { name: roleName }).check();
  await page.getByRole("button", { name: "继续" }).click();
  await page.getByRole("button", { name: "保存并更新计划" }).click();
}
