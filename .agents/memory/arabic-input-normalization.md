---
name: Arabic input normalization
description: Shared Arabic/Persian digit, phone, and person-name normalization contract across Mobile and the backend.
---

Mobile numeric identifiers and the backend canonical schemas must use the same digit and phone normalization before validation. Person-name validation should trim/collapse whitespace, allow Unicode letters and Arabic marks, reject control characters and values with no letters. Passwords remain untouched; administrative usernames use a separate shared policy that preserves Arabic/Persian digits.

**Why:** Client-only normalization caused Arabic-Indic and Persian phone inputs to fail at later validation layers, while ASCII-only username assumptions made the accepted input contract inconsistent between admin UI, account creation, and login.

**How to apply:** Reuse the shared normalization helpers for phone, date, and other numeric fields; preserve existing phone length/business rules after normalization. Apply the person-name policy to person-name fields only. For administrative usernames, allow Arabic/English letters, English/Arabic/Persian digits, `_`, `-`, and the legacy `.`, while applying the same trim/lowercase policy at creation and login; do not normalize digits or passwords.