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
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });

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

async function resetAndOnboard(roleName) {
  await page.goto(`${baseURL}/onboarding`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("radio", { name: roleName }).check();
  await page.getByRole("button", { name: "继续" }).click();
  await page.getByRole("button", { name: "生成我的行动计划" }).click();
}

await capture("01-landing-desktop", "/");
await page.goto(`${baseURL}/onboarding`, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.screenshot({ path: resolve(outputDir, "02-onboarding-desktop.png"), fullPage: true });
results.push({ name: "02-onboarding-desktop", path: "/onboarding", width: 1440, scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth), title: await page.title(), overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth) });

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
await capture("14-matching-mobile", "/student/matching");
await capture("15-teacher-mobile", "/teacher/dashboard");

await browser.close();
apiProcess?.kill();
webProcess?.kill();
const failed = errors.length > 0 || results.some((item) => item.overflow);
process.stdout.write(`${JSON.stringify({ baseURL, failed, errors, results }, null, 2)}\n`);
if (failed) process.exitCode = 1;
