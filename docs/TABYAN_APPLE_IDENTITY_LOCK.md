# Tabyan Apple Identity Lock

This file is part of the external build handoff. It is a guardrail, not a
credential store.

## Locked application identity

| Field | Required value |
| --- | --- |
| Existing App Store application | `تبيان القرآني` |
| iOS Bundle ID | `app.replit.tbyan` |
| Version | `1.0.0` |
| Next iOS build | `6` |
| Android package | `com.tabyan.app` |

## Rules for a new environment

1. Reuse the existing App Store application `تبيان القرآني` for
   `app.replit.tbyan`.
2. Do not register a second App Store application.
3. Do not change the Bundle ID, version, or build number during handoff.
4. Do not create, revoke, or rotate Apple distribution credentials as part of
   source preparation.
5. Any credential or App Store action must be reviewed explicitly before it is
   performed.

The canonical app configuration is `artifacts/mobile/app.json`. The EAS
profiles are in `artifacts/mobile/eas.json`.