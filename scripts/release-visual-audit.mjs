import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const runOffset = process.pid % 1000;
const frontendPort = Number(process.env.AUDIT_FRONTEND_PORT || 20_000 + runOffset);
const apiPort = Number(process.env.AUDIT_API_PORT || 21_000 + runOffset);
const baseURL = process.env.AUDIT_BASE_URL || `http://127.0.0.1:${frontendPort}`;
const apiBaseURL = process.env.AUDIT_API_BASE || `${baseURL}/api`;
const apiHealthURL = `http://127.0.0.1:${apiPort}/healthz`;
const outputDir = resolve("test-results/release-audit");
mkdirSync(outputDir, { recursive: true });

async function endpointAvailable(url) {
  try { return (await fetch(url)).ok; }
  catch { return false; }
}

let apiProcess;
if (!process.env.AUDIT_BASE_URL) {
  apiProcess = spawn(process.execPath, [resolve("server/index.mjs")], {
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(apiPort),
      DATABASE_PATH: resolve("test-results", `visual-audit-${process.pid}.db`),
      REGISTRATION_MODE: "open",
      CAREER_TEACHER_EMAILS: "visual-teacher@ynu.edu.cn",
    },
    stdio: "ignore",
  });
  for (let attempt = 0; attempt < 50 && !(await endpointAvailable(apiHealthURL)); attempt += 1) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  if (!(await endpointAvailable(apiHealthURL))) throw new Error("Isolated visual-audit API did not start");
}

let webProcess;
if (!(await endpointAvailable(baseURL))) {
  if (process.env.AUDIT_BASE_URL) throw new Error(`Audit target is unavailable: ${baseURL}`);
  webProcess = spawn(process.execPath, [resolve("node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(frontendPort), "--strictPort"], {
    env: { ...process.env, VITE_DEV_API_TARGET: `http://127.0.0.1:${apiPort}` },
    stdio: "ignore",
  });
  for (let attempt = 0; attempt < 50 && !(await endpointAvailable(baseURL)); attempt += 1) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  if (!(await endpointAvailable(baseURL))) throw new Error("Isolated visual-audit frontend did not start");
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
  const expectedGuestSession = message.text().includes("401 (Unauthorized)") && sourceUrl.includes("/auth/session");
  if (!expectedGuestSession) errors.push(`console: ${message.text()}${sourceUrl ? ` @ ${sourceUrl}` : ""}`);
});

async function capture(name, path, options = {}) {
  await page.goto(`${baseURL}${path}`, { waitUntil: "networkidle" });
  if (options.zoom) await page.evaluate((zoom) => { document.body.style.zoom = String(zoom); }, options.zoom);
  if (options.openFirstBlueprint) await page.locator(".action-blueprint").first().evaluate((details) => { details.open = true; });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  const metrics = await page.evaluate(() => ({
    path: location.pathname,
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    title: document.title,
  }));
  await page.screenshot({ path: resolve(outputDir, `${name}.png`), fullPage: true });
  results.push({ name, ...metrics, overflow: metrics.scrollWidth > metrics.width });
}

async function registerAuditAccount(email) {
  accountSequence += 1;
  const response = await page.context().request.post(`${apiBaseURL}/auth/register`, {
    data: {
      email: email || `visual-${Date.now()}-${accountSequence}@example.edu.cn`,
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
await page.setViewportSize({ width: 360, height: 800 });
await capture("01c-landing-mobile-360", "/");
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
await capture("05-explorer-roadmap-desktop", "/student/roadmap", { openFirstBlueprint: true });
await page.setViewportSize({ width: 390, height: 844 });
await capture("06-awakening-mobile", "/student/awakening");
await capture("07-explorer-roadmap-mobile", "/student/roadmap", { openFirstBlueprint: true });
await page.evaluate(() => localStorage.setItem("career-theme", "dark"));
await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
await capture("07a-explorer-roadmap-dark-reduced-motion", "/student/roadmap", { openFirstBlueprint: true });
await page.evaluate(() => localStorage.setItem("career-theme", "light"));
await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
await page.setViewportSize({ width: 1440, height: 1000 });
await capture("07b-explorer-roadmap-200-percent-zoom", "/student/roadmap", { zoom: 2, openFirstBlueprint: true });
await page.evaluate(() => { document.body.style.zoom = "1"; });

await resetAndOnboard("高年级学生");
await capture("08-student-home-desktop", "/student/home");
await capture("08a-profile-desktop", "/account/profile");
await capture("08a-ai-planning-desktop", "/student/ai-planning");
await capture("09-matching-desktop", "/student/matching");
await capture("10-resource-board-desktop", "/student/opportunities");
await capture("10a-ability-profile-desktop", "/student/abilities");

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
await capture("15-resource-board-mobile", "/student/opportunities");
await capture("15a-ability-profile-mobile", "/student/abilities");

await registerAuditAccount("visual-teacher@ynu.edu.cn");
await page.setViewportSize({ width: 1440, height: 1000 });
await capture("16-staff-workspace-desktop", "/teacher/dashboard");
await page.evaluate(() => localStorage.setItem("career-theme", "dark"));
await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
await capture("17-staff-workspace-dark-reduced-motion", "/teacher/dashboard");
await page.setViewportSize({ width: 390, height: 844 });
await capture("18-staff-workspace-mobile-dark", "/teacher/dashboard");
await page.setViewportSize({ width: 1440, height: 1000 });
await capture("19-staff-workspace-200-percent-zoom", "/teacher/dashboard", { zoom: 2 });

await browser.close();
apiProcess?.kill();
webProcess?.kill();
const failed = errors.length > 0 || results.some((item) => item.overflow);
process.stdout.write(`${JSON.stringify({ baseURL, failed, errors, results }, null, 2)}\n`);
if (failed) process.exitCode = 1;
