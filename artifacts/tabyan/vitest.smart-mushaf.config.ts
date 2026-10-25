import { defineConfig } from "vitest/config";
import path from "node:path";

// Smart Mushaf v3 suites live outside src/ and run separately from the main
// app suite: `npm run test:smart-mushaf --workspace @workspace/tabyan`.
export default defineConfig({
  esbuild: { jsx: "automatic" },
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    include: ["smart-mushaf-v3/src/**/*.test.ts", "smart-mushaf-v3/src/**/*.test.tsx"],
    environment: "node",
  },
});
