import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    include: [
      "server/**/*.spec.ts",
      "client/src/**/*.spec.ts",
      "client/src/**/*.test.ts",
      "client/src/**/*.test.tsx",
    ],
    environmentMatchGlobs: [
      ["server/**", "node"],
      ["client/**", "happy-dom"],
    ],
    setupFiles: ["client/src/test-setup.ts"],
  },
  resolve: {
    alias: {
      "@app": path.resolve(__dirname, "client/src/app"),
      "@features": path.resolve(__dirname, "client/src/features"),
      "@shared": path.resolve(__dirname, "client/src/shared"),
    },
  },
});
