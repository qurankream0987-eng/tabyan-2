# TABYAN SMART_MUSHAF_V2 — Isolated Candidate Plan

**Status:** plan only; no candidate app or code was created.  
**Recommendation:** a separate Flutter evaluation project, backed by Tabyan’s existing API.  
**Final architecture label:** **ADOPT_WITH_ADAPTER**.

Citation numbers use the shared ecosystem-audit registry. Existing Tabyan UI, Quran data, routes, auth, and backend were not modified.

## Why this is a plan rather than a build

The `quran_library` source has a substantial Flutter Mushaf and Tasmee surface, but the model and asset rights are not fully cleared. The current app repository is not licensed for reuse, the local Zipformer license prohibits charging for the feature it powers, and QUL/KFGQPC fonts/text plus third-party recitations remain unverified. The audited repository branch also differs from the published package version. Building a visually complete candidate with copied Quran assets now would imply permissions that have not been established. [[3]](https://api.github.com/repos/alheekmahlib/alquranalkareem) [[5]](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/pubspec.yaml) [[9]](https://pub.dev/packages/quran_library) [[14]](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/assets/quran_lab/LICENSE-QuranLab-NPL-1.2.txt) [[8]](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/NOTICE) [[15]](https://qul.tarteel.ai/docs/font) [[16]](https://qurancomplex.gov.sa/quran-dev) [[17]](https://github.com/alheekmahlib/quran_audio)

There is also a host constraint: this Repl already uses its single mobile artifact for the student Expo application, and Flutter/Dart are not installed. A second native artifact cannot be added here without changing the platform boundary. The Web Mushaf remains untouched, and a web mock would not meet the required real-iPhone acceptance gate. [Local workspace inspection; `.agents/memory/tabyan-expo-artifact-limit.md`]

## Candidate purpose

`SMART_MUSHAF_V2` is a parallel evaluation surface to test whether the reusable Flutter display and Tasmee code can deliver a better Tabyan-branded reader on iPhone. It is not a replacement, migration, route switch, or production release. The current Web Mushaf stays the user-facing reader until the candidate passes rights, integrity, device, and product-approval gates.

## Non-negotiable boundaries

| Area | Candidate rule |
|---|---|
| Current Mushaf | Do not edit the Web reader, QCF v2 files, layout data, route, storage keys, or default. Keep Native reader absent unless separately approved. |
| Quran integrity | Never rewrite Quran text, glyph strings, line order, or reference data to hide a rendering mismatch. Isolate candidate assets and verify exact encoding/version before use. |
| Authentication | Tabyan remains the identity authority. Do not copy the upstream app’s auth/accounts or create a second account system. Use a reviewed, short-lived Tabyan token handoff only after its contract is designed. |
| Backend/data | Existing Tabyan API and authorization remain authoritative. Do not create a second database or change ownership of student/session records. |
| Recognition | Do not transform an uncertain model/provider signal into a certain error or success. Preserve evidence and let uncertainty remain unknown/silent. |
| Provider keys | Never ship the QRC API key in the Flutter/Expo client. Keep provider credentials and protocol handling on the Tabyan server. |
| Rights | Do not bundle QUL/KFGQPC fonts, Quran text/layouts, recordings, model weights, or derived datasets until exact rights are documented. |
| Branding | Apply Tabyan’s own visual identity. Do not use upstream app name, logo, or endorsement. |
| Release | No publish, production route, or default change in the evaluation phase. |

## Functional contract for the isolated candidate

The UI may render a licensed, version-pinned Quran resource and a local or server-recognition session, but display and recognition must remain distinct. Each recognition update should retain the source/provider, session ID, Quran location, timestamp, and event type. The minimum observation vocabulary is `confirmed`, `skipped`, `mismatch`, and `uncertain`; `uncertain` is not a failure. The viewer may show hidden/current/revealed words only when the selected mode and evidence justify it. Never claim “teacher mode” until the supervising workflow is designed and tested.

For an educational task, the server continues to assign and validate the session scope. For an open-ended general session, the display’s local range must not silently become an authorization boundary. The candidate should use the same Tabyan rules already enforced by the backend rather than trust a Flutter-only learning range. Recognition results are suggestions unless the Tabyan task contract explicitly confirms them.

The package code includes local phoneme alignment and live range-tracking components, while `quran_audio`’s QRC client does not match the current provider guide. For the candidate, reuse only the approved library engine/UI surface; route any external QRC session through Tabyan’s existing server-side provider adapter after a separate live acceptance test. [[11]](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/lib/src/tasmee/engine/sherpa_zipformer_engine.dart) [[12]](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/lib/src/tasmee/engine/phoneme_aligner.dart) [[13]](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/lib/src/tasmee/engine/range_tracker.dart) [[32]](https://raw.githubusercontent.com/alheekmahlib/quran_audio/main/lib/src/recitation/qrc_client.dart) [[38]](https://qurani.ai/en/docs/2-advanced-tools/qrc)

## Phased implementation gates

### Gate 0 — Rights and source pin

- Obtain a written decision for the exact `quran_library` release/commit to audit.
- Separate MIT package code from NPL-1.2 model/data/token files.
- Clear every selected QCF/QUL/KFGQPC text/font/layout asset and each recording for the intended commercial and offline behavior.
- If the Zipformer license is incompatible with Tabyan’s paid product, replace it with a commercially cleared model or keep that feature disabled.
- Record resource version, URL, checksum, license, attribution, caching, modification, and redistribution terms.

**Exit rule:** no copied asset or model is included while any required right is unknown. [[6]](https://pub.dev/api/packages/quran_library) [[5]](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/pubspec.yaml) [[14]](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/assets/quran_lab/LICENSE-QuranLab-NPL-1.2.txt) [[8]](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/NOTICE) [[41]](https://qul.tarteel.ai/docs/download-resources) [[16]](https://qurancomplex.gov.sa/quran-dev)

### Gate 1 — Hosting and auth decision

- Select a separate Flutter project/repl or another approved native host.
- Keep the student Expo artifact and Web Mushaf unchanged.
- Design a narrow Tabyan session handoff; prefer a server-minted, short-lived, purpose-bound credential. Never share long-lived secrets or copy identity data into local candidate storage.
- Confirm that API requests, session ownership, and persisted results still use the authenticated Tabyan account.

**Exit rule:** host and token contract approved before adding native Flutter code. [[46]](https://docs.flutter.dev/add-to-app) [[48]](https://docs.expo.dev/workflow/customizing/) [[49]](https://docs.expo.dev/develop/development-builds/faq/) [[50]](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app) [[51]](https://developer.apple.com/documentation/bundleresources/entitlements/keychain-access-groups)

### Gate 2 — Minimal parallel implementation

- Pin an exact library release/commit and import only the approved package code.
- Build a candidate route/app shell with Tabyan branding and explicit “evaluation” status.
- Keep Quran assets in a separate package and load only rights-cleared files.
- Add the Tabyan API/provider adapter; do not copy the upstream app’s authentication, persistence, or analytics.
- Keep external QRC server-side; the package’s JSON/raw-binary QRC client is not the accepted integration pattern.

**Exit rule:** static checks pass, no current reader/default changes, and the app can demonstrate safe empty/error/offline states before device tests.

### Gate 3 — Functional verification

- Verify page navigation, font lifecycle, glyph rendering, bookmarks/session display, permissions, microphone interruption, stop/cancel, background/foreground transitions, and account changes.
- Verify that one account cannot receive another account’s private reading or recitation state.
- Verify cleanup after app termination and reconnection; never replay or silently duplicate a recitation session.
- Compare recognition display state against reference passages, but do not use fabricated examples as proof of accuracy.

**Exit rule:** no Quran text/layout differences and no cross-account/session leakage.

### Gate 4 — iPhone first, Android later

Run the first real-device gate on a small supported iPhone and a current iPhone. Measure cold start, screen readiness, installed size, memory, audio latency, recognition update delay, battery drain, model-download recovery, and crash/restart behavior under a documented test script. Define acceptable thresholds before the measurements are interpreted; this audit provides no benchmark. Test Android after the iPhone gate is accepted, including platform-specific foreground-service/audio behavior if it is required. [[47]](https://docs.flutter.dev/add-to-app/performance) [[52]](https://developer.android.com/develop/background-work/services)

**Exit rule:** user-reviewed iPhone results pass, Quran integrity remains intact, and account/session cleanup is correct. “The package declares iOS support” is not a substitute for this gate. [[4]](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/README.md) [[9]](https://pub.dev/packages/quran_library)

### Gate 5 — Product decision

Compare the isolated candidate to the unchanged Web Mushaf. The user explicitly decides whether to continue, keep the reader Web-only, or later propose a replacement. No automatic migration, default change, production publish, or database operation is part of this plan.

## Open decisions before implementation

1. Which separate project/host should own the Flutter candidate, given the one-mobile-artifact limit in this Repl?
2. Will Tabyan obtain rights for the NPL-covered model/derivatives, or use a commercially cleared replacement?
3. Which exact Quran text, QCF/QUL/KFGQPC font/layout, and reciter recordings are approved for the candidate?
4. What is the reviewed Tabyan-authentication handoff contract for a separate Flutter client?
5. What measurable iPhone acceptance thresholds should apply to startup, recognition latency, memory, and battery?

## Current completion status

The audit and plan are complete. The candidate itself is **not created** because the Flutter toolchain and artifact boundary are unavailable here, and required model/asset rights remain unresolved. No placeholder reader or copied Quran asset was added. The existing Web Mushaf, QCF v2 data, routes, backend, database, and deployment remain unchanged.

## Sources

3. [GitHub repository metadata for alquranalkareem](https://api.github.com/repos/alheekmahlib/alquranalkareem) — Fetched 2026-10-15; last push 2026-10-12; Tier 1; saved evidence: research/smart-mushaf/sources/app-api.md
4. [quran_library README](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/README.md) — Fetched 2026-10-15; Tier 1; saved evidence: research/smart-mushaf/sources/quran-library-readme.md
5. [quran_library pubspec.yaml on main](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/pubspec.yaml) — Fetched 2026-10-15; source branch version 5.0.2; Tier 1; saved evidence: research/smart-mushaf/sources/quran-library-pubspec-current.md
6. [quran_library pub.dev package API](https://pub.dev/api/packages/quran_library) — Fetched 2026-10-15; latest metadata reports 5.0.1 uploaded 2026-09-23; Tier 1; saved evidence: research/smart-mushaf/sources/quran-library-pubdev-api-current.md
8. [quran_library NOTICE: QCF fonts and QUL/KFGQPC resources](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/NOTICE) — Fetched 2026-10-15; Tier 1; saved evidence: research/smart-mushaf/sources/quran-library-notice-source.md
9. [quran_library pub.dev package page](https://pub.dev/packages/quran_library) — Fetched 2026-10-15; page reports 5.0.1 uploaded 2026-09-23; Tier 1; saved evidence: research/smart-mushaf/sources/quran-library-pubdev-page-late-2026.md
11. [Sherpa Zipformer engine](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/lib/src/tasmee/engine/sherpa_zipformer_engine.dart) — Fetched 2026-10-15; Tier 1; saved evidence: research/smart-mushaf/sources/sherpa-zipformer-engine-source.md
12. [Quran phoneme aligner](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/lib/src/tasmee/engine/phoneme_aligner.dart) — Fetched 2026-10-15; Tier 1; saved evidence: research/smart-mushaf/sources/phoneme-aligner-source.md
13. [RangeLiveTracker](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/lib/src/tasmee/engine/range_tracker.dart) — Fetched 2026-10-15; Tier 1; saved evidence: research/smart-mushaf/sources/range-tracker-source.md
14. [Quran-Lab No-Profit License NPL-1.2](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/assets/quran_lab/LICENSE-QuranLab-NPL-1.2.txt) — Fetched 2026-10-15; version 1.2; Tier 1; saved evidence: research/smart-mushaf/sources/quran-lab-license-source.md
15. [QUL font resource documentation](https://qul.tarteel.ai/docs/font) — Fetched 2026-10-15; no license statement shown on listing page; Tier 1; saved evidence: research/smart-mushaf/sources/qul-font-documentation.md
16. [KFGQPC developer-resource discovery snippets](https://qurancomplex.gov.sa/quran-dev) — Search snippets captured 2026-10-15; terms page fetch failed; Tier 1; saved evidence: research/smart-mushaf/sources/gapfill-rights-snippets.md
17. [Audio providers listed by quran_audio](https://github.com/alheekmahlib/quran_audio) — Fetched 2026-10-15; Tier 1; saved evidence: research/smart-mushaf/sources/alheekmahlib-quran-audio.md
32. [quran_audio QrcClient](https://raw.githubusercontent.com/alheekmahlib/quran_audio/main/lib/src/recitation/qrc_client.dart) — Fetched 2026-10-15; Tier 1; saved evidence: research/smart-mushaf/sources/qrc-client-source.md
38. [Qurani.ai Nabr real-time recitation correction API guide](https://qurani.ai/en/docs/2-advanced-tools/qrc) — Fetched 2026-10-15; publication/version date not shown; Tier 1; saved evidence: research/smart-mushaf/sources/qurani-ai-qrc-guide.md
41. [QUL resource and terms discovery snippets](https://qul.tarteel.ai/docs/download-resources) — Search snippets captured 2026-10-15; terms page not fetched; Tier 1; saved evidence: research/smart-mushaf/sources/gapfill-rights-snippets.md
46. [Flutter add-to-app guide](https://docs.flutter.dev/add-to-app) — Fetched 2026-10-15; publication date not stated; Tier 1; saved evidence: research/smart-mushaf/sources/flutter-add-to-app.md
47. [Flutter add-to-app performance, load sequence, and memory](https://docs.flutter.dev/add-to-app/performance) — Fetched 2026-10-15; publication date not stated; Tier 1; saved evidence: research/smart-mushaf/sources/flutter-add-to-app-performance.md
48. [Expo: add custom native code](https://docs.expo.dev/workflow/customizing/) — Fetched 2026-10-15; publication date not stated; Tier 1; saved evidence: research/smart-mushaf/sources/expo-custom-native.md
49. [Expo development builds FAQ](https://docs.expo.dev/develop/development-builds/faq/) — Search snippet captured 2026-10-15; Tier 1; saved evidence: research/smart-mushaf/sources/expo-development-builds-snippets.md
50. [Apple: supporting universal links](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app) — Search snippet captured 2026-10-15; Tier 1; saved evidence: research/smart-mushaf/sources/apple-universal-links-snippets.md
51. [Apple Keychain Access Groups entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/keychain-access-groups) — Search snippet captured 2026-10-15; Tier 1; saved evidence: research/smart-mushaf/sources/apple-keychain-groups-snippets.md
52. [Android background services overview](https://developer.android.com/develop/background-work/services) — Search snippet captured 2026-10-15; Tier 1; saved evidence: research/smart-mushaf/sources/android-services-snippets.md
