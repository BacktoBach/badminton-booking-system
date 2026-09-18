import { defineConfig } from "vitest/config";
import { config } from "dotenv";

config();

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is required to run tests");
}

process.env.DEVELOPMENT_DATABASE_URL_FOR_GUARD = process.env.DATABASE_URL;
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = "test";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    restoreMocks: true,
    clearMocks: true,
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 15_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts", "scripts/**/*.ts", "database/seeds/**/*.ts"],
      exclude: ["src/server.ts", "src/types/**/*.ts", "src/**/*.d.ts"],
      thresholds: {
        statements: 85,
        branches: 65,
        functions: 85,
        lines: 85,
      },
    },
  },
});
