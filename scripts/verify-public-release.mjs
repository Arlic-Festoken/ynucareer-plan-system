import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const baseURL = (process.env.PUBLIC_BASE_URL || "https://139.199.69.46/career/").replace(/\/?$/, "/");
const outputDir = resolve("test-results/public-release");
mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: process.env.PUBLIC_STRICT_TLS !== "true",
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror:${error.message}`));
page.on("console", (message) => {
  if (message.type() !== "error") return;
  const text = message.text();
  if (!text.includes("401 (Unauthorized)")) errors.push(`console:${text}`);
});

const response = await page.goto(baseURL, { waitUntil: "networkidle" });
const assetURLs = await page.locator("script[src],link[rel=stylesheet]")
  .evaluateAll((nodes) => nodes.map((node) => node.src || node.href));
const desktop = {
  status: response?.status(),
  title: await page.title(),
  heading: await page.getByRole("heading", { level: 1 }).first().textContent(),
  mainVisible: await page.locator("main").isVisible(),
  assetsUnderCareer: assetURLs.every((url) => new URL(url).pathname.startsWith("/career/assets/")),
  overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
};
await page.screenshot({ path: resolve(outputDir, "home-desktop.png"), fullPage: true });

await page.goto(new URL("student/roadmap", baseURL).href, { waitUntil: "networkidle" });
const deepLink = {
  url: page.url(),
  loginVisible: await page.getByRole("heading", { name: "继续你的计划" }).isVisible(),
};

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(baseURL, { waitUntil: "networkidle" });
const mobile = {
  overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
  mainVisible: await page.locator("main").isVisible(),
};
await page.screenshot({ path: resolve(outputDir, "home-mobile.png"), fullPage: true });
await browser.close();

const result = { baseURL, desktop, deepLink, mobile, errors };
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (desktop.status !== 200
  || !desktop.mainVisible
  || !desktop.assetsUnderCareer
  || desktop.overflow
  || !deepLink.loginVisible
  || mobile.overflow
  || errors.length) {
  process.exitCode = 1;
}
