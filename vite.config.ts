import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: path.resolve(__dirname, "client"),
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "client/src/core"),
      "@views": path.resolve(__dirname, "client/src/views"),
      "@components": path.resolve(__dirname, "client/src/views/components"),
    },
  },
});
