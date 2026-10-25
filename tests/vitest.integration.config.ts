import { defineConfig } from "vitest/config";

// End-to-end flows that run web client code against API server code in one process.
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
  },
});
