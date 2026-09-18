---
name: Mobile Stage 8 gates
description: Stage 8 Native device features and the boundary between code verification and real-device proof
---

Native camera, location, compass, and live audio can be code-verified but must remain `NEEDS_DEVICE_TEST` until exercised on real hardware. Push delivery is a separate feature and must not be simulated without an approved provider and backend device-token contract.

**Why:** The mobile app currently has in-app notification records/settings but no native push provider or token-sync API; claiming delivery would create a false release signal.

**How to apply:** Keep deterministic tests and explicit permission/error states in the app, classify push delivery as unavailable, and preserve the device gate until hardware and provider validation are complete.