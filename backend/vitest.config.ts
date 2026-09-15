import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    restoreMocks: true,
    clearMocks: true,
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
