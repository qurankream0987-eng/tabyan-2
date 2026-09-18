---
name: Tabyan Web test runner
description: Current local Vitest link issue affecting the Web package test command.
---

The Web package's local Vitest symlink can point at a pnpm variant whose package directory does not contain `vitest.mjs`; the Web test command then fails before test discovery, while the shared tRPC Vitest suite still runs normally.

**Why:** The Arabic-input audit verified Web TypeScript and production build independently, but a missing local Vitest entrypoint must not be reported as a product test failure.

**How to apply:** If Web tests are needed, inspect the package-manager links first and repair dependencies through the normal package-management workflow rather than changing application code or silently treating the command as passed.