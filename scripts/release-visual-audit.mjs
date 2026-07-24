import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const baseURL = process.env.AUDIT_BASE_URL || "http://127.0.0.1:5173";
const outputDir = resolve("test-results/release-audit");
mkdirSync(outputDir, { recursive: true });

async function endpointAvailable(url) {
  try { return (await fetch(url)).ok; }
  catch { return false; }
}

let webProcess;
if (!(await endpointAvailable(baseURL))) {
  if (baseURL !== "http://127.0.0.1:5173") throw new Error(`Audit target is unavailable: ${baseURL}`);
  webProcess = spawn(process.execPath, [resolve("node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", "5173", "--strictPort"], { stdio: "ignore" });
  for (let attempt = 0; attempt < 50 && !(await endpointAvailable(baseURL)); attempt += 1) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  if (!(await endpointAvailable(baseURL))) throw new Error("Vite audit server did not start");
}

let apiProcess;
if (!(await endpointAvailable("http://127.0.0.1:8787/healthz"))) {
  apiProcess = spawn(process.execPath, [resolve("server/index.mjs")], {
    env: { ...process.env, HOST: "127.0.0.1", PORT: "8787" },
    stdio: "ignore",
  });
  for (let attempt = 0; attempt < 30 && !(await endpointAvailable("http://127.0.0.1:8787/healthz")); attempt += 1) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  if (!(await endpointAvailable("http://127.0.0.1:8787/healthz"))) throw new Error("AI proxy health endpoint did not start");
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
const results = [];
let accountSequence = 0;
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() !== "error") return;
  const sourceUrl = message.location().url || "";
  const expectedGuestSession = message.text().includes("401 (Unauthorized)") && sourceUrl.includes("/api/auth/session");
  if (!expectedGuestSession) errors.push(`console: ${message.text()}${sourceUrl ? ` @ ${sourceUrl}` : ""}`);
});

async function capture(name, path) {
  await page.goto(`${baseURL}${path}`, { waitUntil: "networkidle" });
  const metrics = await page.evaluate(() => ({
    path: location.pathname,
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    title: document.title,
  }));
  await page.screenshot({ path: resolve(outputDir, `${name}.png`), fullPage: true });
  results.push({ name, ...metrics, overflow: metrics.scrollWidth > metrics.width });
}

async function registerAuditAccount() {
  accountSequence += 1;
  const response = await page.context().request.post(`${baseURL}/api/auth/register`, {
    data: {
      email: `visual-${Date.now()}-${accountSequence}@example.edu.cn`,
      password: "career-plan-2026",
      displayName: "视觉验收同学",
    },
  });
  if (response.status() !== 201) throw new Error(`Audit account registration failed: ${response.status()}`);
}

async function resetAndOnboard(roleName) {
  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await registerAuditAccount();
  await page.goto(`${baseURL}/onboarding`, { waitUntil: "networkidle" });
  await page.getByRole("radio", { name: roleName }).check();
  await page.getByRole("button", { name: "继续" }).click();
  await page.getByRole("button", { name: "生成我的行动计划" }).click();
}

await capture("01-landing-desktop", "/");
await page.setViewportSize({ width: 1024, height: 900 });
await capture("01a-landing-compact-desktop", "/");
await page.setViewportSize({ width: 390, height: 844 });
await capture("01b-landing-mobile", "/");
await capture("02-register-mobile", "/register");
await page.setViewportSize({ width: 1440, height: 1000 });
await capture("02a-login-desktop", "/login");
await page.goto(baseURL, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await registerAuditAccount();
await capture("02b-onboarding-desktop", "/onboarding");

await resetAndOnboard("低年级学生");
await capture("03-explorer-home-desktop", "/student/home");
await capture("04-awakening-desktop", "/student/awakening");
await page.getByRole("button", { name: "方向设计" }).click();
await page.locator(".direction-option").first().click();
await page.getByRole("button", { name: "行动创造" }).click();
await page.getByRole("button", { name: "生成探索行动计划" }).click();
await capture("05-explorer-roadmap-desktop", "/student/roadmap");
await page.setViewportSize({ width: 390, height: 844 });
await capture("06-awakening-mobile", "/student/awakening");
await capture("07-explorer-roadmap-mobile", "/student/roadmap");
await page.setViewportSize({ width: 1440, height: 1000 });

await resetAndOnboard("高年级学生");
await capture("08-student-home-desktop", "/student/home");
await capture("08a-profile-desktop", "/account/profile");
await capture("08a-ai-planning-desktop", "/student/ai-planning");
await capture("09-matching-desktop", "/student/matching");
await capture("10-teacher-desktop", "/teacher/dashboard");

await resetAndOnboard("研究生");
await page.getByLabel("研究方向").fill("学习分析与生成式人工智能");
await page.getByLabel("希望靠近的产业或场景").fill("教育科技");
await page.getByRole("button", { name: "生成我的双线计划" }).click();
await capture("11-graduate-desktop", "/graduate/navigation");
await page.setViewportSize({ width: 390, height: 844 });
await capture("12-graduate-mobile", "/graduate/navigation");

await resetAndOnboard("高年级学生");
await capture("13-student-home-mobile", "/student/home");
await capture("13a-profile-mobile", "/account/profile");
await capture("14-matching-mobile", "/student/matching");
await capture("14a-ai-planning-mobile", "/student/ai-planning");
await capture("15-teacher-mobile", "/teacher/dashboard");

await browser.close();
apiProcess?.kill();
webProcess?.kill();
const failed = errors.length > 0 || results.some((item) => item.overflow);
process.stdout.write(`${JSON.stringify({ baseURL, failed, errors, results }, null, 2)}\n`);
if (failed) process.exitCode = 1;
