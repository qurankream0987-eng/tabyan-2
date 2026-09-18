import { defineConfig } from "vitest/config";
import path from "node:path";

// إعداد مستقل عن vite.config.ts — ذلك يتطلب متغيرات بيئة (PORT/BASE_PATH)
// لا صلة لها بالاختبارات الوحدوية.
export default defineConfig({
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
