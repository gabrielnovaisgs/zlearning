import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./client/src/test-setup.ts"],
  },
  resolve: {
    alias: {
      "@app": path.resolve(__dirname, "client/src/app"),
      "@features": path.resolve(__dirname, "client/src/features"),
      "@shared": path.resolve(__dirname, "client/src/shared"),
    },
  },
});
