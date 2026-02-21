import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "src/core"),
      "@views": path.resolve(__dirname, "src/views"),
      "@components": path.resolve(__dirname, "src/views/components"),
    },
  },
});
