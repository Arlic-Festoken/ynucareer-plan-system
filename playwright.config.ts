import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run dev:api",
      url: "http://127.0.0.1:8787/healthz",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev -- --port 4173",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
