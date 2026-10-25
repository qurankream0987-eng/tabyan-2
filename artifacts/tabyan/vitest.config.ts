import { defineConfig } from "vitest/config";
import path from "node:path";

// إعداد مستقل عن vite.config.ts — ذلك يتطلب متغيرات بيئة (PORT/BASE_PATH)
// لا صلة لها بالاختبارات الوحدوية.
export default defineConfig({
  // The app uses automatic JSX via the React plugin; tests must match it.
  // Keep both transforms aligned across the Vite versions resolved by Vitest.
  esbuild: { jsx: "automatic" },
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
  },
});
