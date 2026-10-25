import { defineConfig } from "vitest/config";

// Cross-app checks: web/mobile parity and shared domain rules. App-specific
// tests stay next to their app (apps/*/src, apps/mobile/tests).
export default defineConfig({
  test: {
    include: ["tests/parity/**/*.test.ts"],
    environment: "node",
  },
});
