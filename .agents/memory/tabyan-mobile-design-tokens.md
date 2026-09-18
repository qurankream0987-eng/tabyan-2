---
name: Tabyan Mobile design tokens
description: Expo Metro cannot bundle the shared root design-token JSON from outside the mobile artifact.
---

Keep a byte-identical copy of the shared design-token JSON inside the Mobile artifact when Native theme code consumes it.

**Why:** TypeScript resolves the workspace-relative import, but Expo Metro fails during iOS/Web export because the JSON is outside the Mobile bundler root.

**How to apply:** When updating design tokens, synchronize the Mobile copy before running Expo exports; do not alter Web tokens independently.