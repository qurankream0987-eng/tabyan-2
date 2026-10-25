# Tabyan Smart Mushaf RC1 — Import and Baseline Report

**Date:** 16 October 2026  
**Release:** `TABYAN_SMART_MUSHAF_RC1`  
**Status:** Tanzil corpus and canonical verse boundaries are verified from the approved official static source; the Web route is integrated and preview-verified. Live Nabr remains disabled and the project has not been published.

## Required handoff report

```text
IMPORT_STATUS:
IMPORTED_UNCHANGED to artifacts/tabyan/smart-mushaf-v3

FILES_COMPLETE:
YES — all 93 files in the uploaded archive were extracted and matched the archive contents.

HANDOFF_DOCS_READ:
YES — all Markdown files under docs/, the handoff manifest, README, test plan, source/rights decisions, and acceptance reports were read.

TEST_BASELINE_EXPECTED:
The current handoff status says 62 tests across 12 suites. Older bundled reports give different counts (24/4, 41/9, and 54/11).

TEST_RESULT:
PASS — 62 tests across 12 suites.

TYPECHECK:
PASS — npm run lint (tsc --noEmit).

BUILD_RESULT:
PASS — npm run build; Vite 8.3.4 built the client bundle. It emitted a non-fatal warning about __dirname in vite.config.ts.

OLD_MUSHAF_DEPENDENCY:
NO — the imported runtime source has no imports or references to the old Mushaf renderer.

NABR_PROVIDER_BOUNDARY_UNDERSTOOD:
YES — App defaults to MockNabrProvider; NabrQrcProvider is constructed with enableLiveConnection=false. The standalone server can open an upstream connection if it receives a session-start message while a server key is configured.

SERVER_SIDE_NABR_PLAN:
Do not start or connect this standalone gateway yet. After the isolated source and route are safe, review how to host the server-side-only key through Tabyan's existing backend, with live traffic remaining disabled until explicit approval.

READY_TO_BEGIN_REAL_NABR_INTEGRATION:
NO — the route uses MockNabrProvider by default and NabrQrcProvider remains disabled. No live Nabr request was made.
```

## Approved corpus completion and route integration

The owner approved completing the existing provider with the official static Tanzil text. The exact downloaded Uthmani file is bundled at `artifacts/tabyan/smart-mushaf-v3/src/quran/data/tanzil-uthmani.txt`, unchanged. Its SHA-256 is `6933e133dd56db778c801bf738848454e43648105a151e8d84d86a7cae39ec5f`. Runtime parsing verifies all 114 surahs and 6,236 sequential ayahs against the existing metadata, and fails closed on incomplete data.

The original whitespace tokenizer and annotation-mark handling were preserved. The raw file has 77,881 tokens and remains byte-for-byte unchanged. At runtime, the exact Basmala prefix is separated from the first-ayah payload in 110 rows where Tanzil includes it; the existing Basmala header renders it separately. Al-Fatihah 1:1 and At-Tawbah 9 are not changed, and surahs 95 and 97 have no embedded prefix in this file. The resulting canonical model has 77,441 words with 1-based WordKeys. The source hash and all 6,236 rows pass the corpus-integrity test. The required Tanzil license notice is included in the bundled docs, and the reader settings display the source, license, and Tanzil links.

The route is wired at `/student/smart-mushaf-v3`, is not linked from normal student navigation, and uses the existing mock recitation provider. No production provider, standalone gateway, or paid/live service was enabled.

### Integrated verification

- Web workspace tests: **339 passed across 44 files**, with Nabr/provider credentials unset for the run.
- Nested Smart Mushaf suite: **63 passed across 13 files**; `happy-dom@21.0.1` is installed as a development-only test dependency so the functional closure gate runs.
- TypeScript check: **passed**.
- Production Vite build: **passed** with `PORT=25124 BASE_PATH=/`.
- The lazy Smart Mushaf route chunk is 1,522.68 kB minified (332.24 kB gzip), which triggers Vite's chunk-size warning. It is loaded only when this route is opened.
- The data audit verifies 114 surahs, 6,236 ayahs, and 77,441 unique WordKeys. Representative passages include Al-Baqarah 2:1 as `الٓمٓ` and Al-Ikhlas 112:1 as four words.
- Desktop and 402×874 mobile previews load the route without browser errors. The screenshot confirms the Fatiha reader layout; the 114-surah content and boundaries are covered by the corpus tests.

## Import and baseline method

- Archive integrity passed (`unzip -t`); the archive contained no absolute or parent-traversal paths. It was extracted to `artifacts/tabyan/smart-mushaf-v3/` and compared with a fresh extraction; the contents are identical.
- The archive was initially imported unchanged. Following the approved source decision, the canonical text provider, reader attribution, isolated route, and route cleanup were updated. Auth, database, Native, and the old Mushaf renderer were not changed.
- Baseline install and checks ran in a temporary extraction, not the imported workspace folder. The shipped `bun.lock` uses a format rejected by workspace Bun 1.3.6. `npm ci` could not consume that file, and regular `npm install` failed on Vite 8.3 / esbuild 0.25 peer resolution. `npm install --legacy-peer-deps` succeeded without changing the imported package manifest.
- The isolated baseline test, typecheck, and build ran with `NABR_QRC_API_KEY` and `GEMINI_API_KEY` unset. The standalone server was not started; no Nabr, Gemini, QF, production database, or deployment calls were made.

## Resolved release-critical source finding

The original source and bundled claims did not match:

- `src/quran/data/surahTextData.ts` has 50 explicit ayah-text entries across seven surahs.
- For the other **6,186 of 6,236 ayahs**, `getCanonicalSurah()` generates generic placeholder prose (`ءَايَةٌ كَرِيمَةٌ ...`) instead of Quran text.
- The runtime source and `index.html` contain no Tanzil source or license attribution, although the rights documents say attribution is present in the application.
- `quranDataIntegrity.test.ts` passes because it builds a structurally complete 6,236-ayah model using those placeholders. It does not verify every ayah against the Tanzil source, and its total-word assertion compares the count with the set built from the same generated data rather than asserting a verified corpus total.

This issue is resolved for the isolated reader: the provider now consumes the complete bundled Tanzil source, checks its integrity and metadata, and no longer synthesizes missing ayahs. Runtime source attribution is visible in settings. This does not verify printed-page layout, font rights, or audio rights.

## Other handoff inconsistencies

- The original RC1 acceptance reports cite 43,874 WordKeys. That figure is superseded: the pinned Tanzil source, separated Basmala prefixes, and preserved tokenizer produce 77,441 canonical WordKeys. The raw file's pre-separation tokenizer count is 77,881.
- Bundled historical test reports conflict: older reports say 24/4, 41/9, and 54/11. The imported bundle baseline passed 62/12; the integrated RC1 tests pass 63/13, and the primary Tabyan suite passes 339/44.
- `package.json` includes `@google/genai`, and `metadata.json` mentions Gemini, although no Gemini imports were found in the runtime source. This was not used.
- The rights registry correctly marks the EveryAyah audio license unverified and not approved for production; audio playback was not tested.

## Route integration and remaining boundaries

The official static Tanzil option was approved and implemented. `QuranContentProvider`, `WordKey`, the original tokenizer, and the recitation pipeline remain in place. The route is isolated from normal navigation. Keep live Nabr/QRC disabled unless the owner separately approves a live integration. Page-layout, font, and audio rights remain independent and unverified.

## Cost and external-service record

- No Replit AI credits, paid APIs, GPU, deployment, or new paid service were intentionally used.
- `happy-dom@21.0.1` was added only as a development dependency to run the imported functional closure test in the integrated workspace. No new runtime service or paid API was added.
- No live ASR, Nabr/QRC, Gemini, Quran Foundation, or production service was used.
