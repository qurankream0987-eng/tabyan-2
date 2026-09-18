---
name: EAS project linking in pnpm monorepos
description: EAS CLI project linking can fail while invoking Expo config directly in this pnpm workspace.
---

When an existing EAS project is independently verified, its `extra.eas.projectId` is the link configuration; Expo GraphQL can verify the project and GitHub association without running a build.

**Why:** EAS CLI 23.2.0 failed to execute the local Expo CLI directly in this pnpm monorepo even though `pnpm exec expo config` passed. The failure happened before any project mutation.

**How to apply:** Never create a new project to work around this. Verify the existing project ID and owner through Expo, then use the exact project ID link configuration and verify the resolved config and remote source.