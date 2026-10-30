import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // All API suites share one real database; run files one at a time so tests that
    // temporarily change shared rows (e.g. API-66 admin demotion race) cannot collide.
    fileParallelism: false,
  },
});
