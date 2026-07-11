import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: "postgresql://localhost:5432/postgres",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
