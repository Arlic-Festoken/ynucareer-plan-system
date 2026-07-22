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

await capture("01-landing-desktop", "/");
await page.goto(`${baseURL}/onboarding`);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.getByRole("radio", { name: "高年级学生" }).check();
await page.getByRole("button", { name: "继续" }).click();
await page.getByRole("button", { name: "生成我的行动计划" }).click();
await capture("02-student-home-desktop", "/student/home");
await capture("03-matching-desktop", "/student/matching");
await capture("04-teacher-desktop", "/teacher/dashboard");
await page.setViewportSize({ width: 390, height: 844 });
await capture("05-student-home-mobile", "/student/home");
await capture("06-matching-mobile", "/student/matching");

await browser.close();
apiProcess?.kill();
webProcess?.kill();
const failed = errors.length > 0 || results.some((item) => item.overflow);
process.stdout.write(`${JSON.stringify({ baseURL, failed, errors, results }, null, 2)}\n`);
if (failed) process.exitCode = 1;
