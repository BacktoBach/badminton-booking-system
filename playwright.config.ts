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
const e2eDatabaseUrl =
  process.env.E2E_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/badminton_booking_e2e";

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
};

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: false,
  workers: 1,
  retries: 0,
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
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.CI ? "chromium" : "chrome",
      },
    },
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
      command: "npm run dev --workspace frontend -- --host 127.0.0.1",
      url: frontendUrl,
      env: { ...process.env, VITE_API_BASE_URL: "/api" },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
