import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['e2e/nabrQrcGateway.e2e.test.ts'],
  },
});
