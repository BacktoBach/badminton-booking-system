import { defineConfig, devices } from "@playwright/test";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";

try {
  loadEnvFile(resolve("backend/.env"));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const frontendUrl = "http://127.0.0.1:5173";
const backendUrl = "http://127.0.0.1:4000";
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL?.trim();
const e2eDatabaseUrl =
  process.env.E2E_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/badminton_booking_e2e";
const includeFirefox =
  Boolean(process.env.CI) || process.env.PLAYWRIGHT_ENABLE_FIREFOX === "true";

const backendEnvironment = {
  ...process.env,
  NODE_ENV: "test",
  PORT: "4000",
  DATABASE_URL: e2eDatabaseUrl,
  E2E_DATABASE_URL: e2eDatabaseUrl,
  DATABASE_SSL: process.env.DATABASE_SSL ?? "false",
  JWT_SECRET:
    process.env.JWT_SECRET ?? "e2e-only-secret-with-at-least-32-characters",
  JWT_EXPIRES_IN: "1d",
  CLIENT_ORIGINS: frontendUrl,
  TRUST_PROXY: "false",
  SEPAY_ENABLED: "true",
  SEPAY_WEBHOOK_SECRET: "e2e-only-sepay-webhook-secret-32-characters",
  SEPAY_BANK_CODE: "TEST",
  SEPAY_ACCOUNT_NUMBER: "0000000000",
  SEPAY_ACCOUNT_NAME: "E2E PAYMENT RECEIVER",
};

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: frontendUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testDir: "./e2e/setup",
      testMatch: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      testDir: "./e2e/specs",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        ...(browserChannel ? { channel: browserChannel } : {}),
      },
    },
    ...(includeFirefox
      ? [
          {
            name: "firefox-smoke",
            testDir: "./e2e/specs",
            testMatch: /cross-browser\.smoke\.spec\.ts/,
            dependencies: ["setup"],
            use: { ...devices["Desktop Firefox"] },
          },
        ]
      : []),
  ],
  webServer: [
    {
      command:
        "npm run db:reset:e2e --workspace backend && npm run start:e2e --workspace backend",
      url: `${backendUrl}/api/health`,
      env: backendEnvironment,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        "npm run build --workspace frontend && npm run preview --workspace frontend -- --host 127.0.0.1",
      url: frontendUrl,
      env: { ...process.env, VITE_API_BASE_URL: "/api" },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
