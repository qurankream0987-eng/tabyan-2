# Tabyan Smart Mushaf — Web Prototype Implementation

> **Source decision update (16 October 2026):** The current direction is `TANZIL_LOCAL_PATH_IS_SUFFICIENT`; see [the Tanzil source assessment](TABYAN_SMART_MUSHAF_TANZIL_SOURCE_ASSESSMENT.md). This file records the earlier isolated Quran Foundation Web prototype path, not the incoming Smart Mushaf project. QF remains disabled and is classified as an optional future provider pending permission.

**Status date:** 15 October 2026  
**Route:** `/student/smart-mushaf`  
**Overall acceptance:** `PARTIAL — live Quran content is blocked`

## Acceptance record

```text
QURAN_LIBRARY_CORE_REUSED: NO
OLD_MUSHAF_REUSED: NO
OLD_QCF_V2_RENDERER_USED: NO
BLOCKED_ASSETS_REPLACED: PARTIAL
REPLACEMENT_RESOURCE_LIST: Quran Foundation Content API v4 (hosted chapter metadata and page/verse/word payloads); no local Quran text, QPC/QCF fonts, page maps, or renderer assets
REAL_QURAN_RENDERING: BLOCKED — no live content request or source response was verified
WORD_IDENTITY: PARTIAL — canonical (surah, ayah, wordIndex) state and normalization tests pass; live QF identity mapping remains unverified
SURAH_NAVIGATION: BLOCKED — the live chapter list is not configured
PAGE_NAVIGATION: BLOCKED — the live page response is not configured
HIDE_REVEAL: PASS — UI/state implementation and reducer behavior are covered; not exercised against live Quran content
WORD_STATES: PASS — current, confirmed, incorrect, skipped, repeated, and unknown-position behavior is covered by local tests/mock events
TABYAN_BRANDING: PASS — branded Arabic route verified at desktop and phone viewport sizes
PROVIDER_NEUTRAL_LAYER: PASS — renderer-neutral event contract and development-only MOCK_UI source are implemented
WEB_ACCEPTANCE: PARTIAL
AUTH: NO
NABR_LIVE_CALLS: 0
QF_API_CALLS: 0
DB_MUTATIONS: 0
NATIVE_WORK: NO
DEPLOYMENT: NO
```

`BLOCKED_ASSETS_REPLACED: PARTIAL` means the code now has a hosted-content adapter, but it has not fetched or rendered a real Quran response. This prototype uses flowing text and explicitly does **not** claim the QPC 604-page layout.

## What is implemented

- A public Web-only page is mounted at `/student/smart-mushaf`, outside the signed-in student shell. Opening it directly also bypasses the welcome splash.
- A server-side Quran Foundation client requests chapter metadata and page verses/words. OAuth client credentials remain server-only; access tokens are cached in process memory. Quran text is not persisted in the database.
- `QF_CONTENT_ENABLED` is an explicit opt-in, default-off gate. The page does not request chapters or page content while the source is disabled or unconfigured.
- Pre-live is limited to Surahs 1–2. Production is labeled as a production environment, not as guaranteed full-corpus access; actual availability still depends on Quran Foundation approval and returned content.
- Word observations use canonical `{ surah, ayah, wordIndex }` keys. Unknown or invalid positions do not change a word. Non-current outcomes require stabilization.
- A development-only `MOCK_UI` event source demonstrates Tasmee word states without microphone access or recognition. No Nabr adapter or live provider call was added.
- Quran Foundation attribution, Arabic Tabyan branding, responsive layout, a no-fallback empty/setup state, and screen-reader placeholders for hidden words are included.

## Why live content remains blocked

The project has no `QF_CLIENT_ID` / `QF_CLIENT_SECRET`, and the content gate is not enabled. No request was made to Quran Foundation. The route therefore shows its unconfigured state rather than invented or manually typed Quran text.

There is also a product-policy conflict to resolve before enabling the API. Quran Foundation’s current [Developer Privacy Policy Packet](https://api-docs.quran.foundation/legal/developer-privacy/) includes under-13 restrictions and signup blocking. Tabyan’s current terms describe student registration for ages 4–100 and no separate guardian-consent step; the public privacy policy remains marked **مسودة غير معتمدة**. No policy or audience changes were made, and no legal compliance is claimed. The owner must resolve this mismatch or obtain applicable Quran Foundation approval before setting `QF_CONTENT_ENABLED=true`.

Pre-live is documented as limited to two chapters. Full-corpus acceptance requires approved production access and a successful live response; changing `QF_ENV` alone does not establish that access.

## Verification

- `pnpm run typecheck:libs` — passed.
- `pnpm --filter @workspace/tabyan run typecheck` — passed.
- `pnpm --filter @workspace/tabyan run test` — passed: 44 test files, 339 tests.
- `pnpm --filter @workspace/tabyan-trpc run test` — passed: 15 test files, 141 tests, including QF client request/mapping/gate tests.
- `pnpm --filter @workspace/api-server run test` — passed: 100 tests.
- `pnpm --filter @workspace/api-server run build` — passed.
- `PORT=25124 BASE_PATH=/ pnpm --filter @workspace/tabyan run build` — passed.
- API server TypeScript check remains blocked by two errors outside this feature: `src/recitationRealtime.ts` reports possibly undefined `message.timing` at lines 703 and 706.
- The route loaded at 1365×900 and 402×874. Browser logs showed no runtime errors. The visible state was “source not configured,” as expected; no live Quran rendering or navigation could be verified.
- Workflows restarted and the API configuration query returned HTTP 200. No Quran Foundation content request appeared in the workflow log.

## Scope record

No QCF-v2 or old Mushaf renderer/files were changed or used. No Quran assets were downloaded or bundled. Authentication, database writes, Native code, Nabr, and deployment were not touched.
