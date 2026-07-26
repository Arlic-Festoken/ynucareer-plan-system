import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const frontendPort = Number(process.env.E2E_FRONTEND_PORT || 24_183);
const apiPort = Number(process.env.E2E_API_PORT || 28_797);
const baseURL = `http://127.0.0.1:${frontendPort}`;
const teacherEmails = process.env.CAREER_TEACHER_EMAILS || "teacher-resource-e2e@ynu.edu.cn";
const databasePath = process.env.E2E_DATABASE_PATH || resolve("test-results", `e2e-${Date.now()}-${process.pid}.db`);
const serverEnvironment = {
  ...process.env,
  PORT: String(apiPort),
  DATABASE_PATH: databasePath,
  REGISTRATION_MODE: "open",
  CAREER_TEACHER_EMAILS: teacherEmails,
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run dev:api",
      env: serverEnvironment,
      url: `http://127.0.0.1:${apiPort}/healthz`,
      reuseExistingServer: false,
    },
    {
      command: `npm run dev -- --port ${frontendPort}`,
      env: { ...process.env, VITE_DEV_API_TARGET: `http://127.0.0.1:${apiPort}` },
      url: baseURL,
      reuseExistingServer: false,
    },
  ],
});
