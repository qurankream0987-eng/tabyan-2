---
name: Stage 5 screen parity
description: Cross-platform screen parity checks and intentional Native adaptations.
---

Parity inventories should compare product behavior and API sources rather than route names. Query screens need loading/error/empty evidence, while mutation-only forms need pending/error/form evidence; intentional platform gaps must remain explicitly PARTIAL instead of being hidden.

**Why:** Web and Native use different navigation primitives, and treating every screen as a query caused false failures for forms while missing routes could otherwise be silently reported as complete.

**How to apply:** Keep one auditable inventory for the Stage 5 screens, allow grouped files for one product screen, and record any missing counterpart as a visible follow-up rather than changing API contracts or adding out-of-scope features.