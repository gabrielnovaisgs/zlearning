import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    url: "postgresql://localhost/zlearning",
  },
});
