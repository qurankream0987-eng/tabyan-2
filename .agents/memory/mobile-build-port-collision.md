---
name: Mobile static build port collision
description: Expo static builds can fail before compilation when the mockup sandbox owns Metro's default port.
---

The mobile static build may fail with an interactive “use another port?” prompt when `artifacts/mockup-sandbox` is already occupying Metro port 8081; this is an environment/workflow collision, not an application compile error.

**Why:** The build script launches Expo in non-interactive mode and cannot answer the port prompt.

**How to apply:** Stop or temporarily move the mockup-sandbox workflow before running the mobile static build, then restart it afterward if needed.