# Research Notes: Tabyan Smart Mushaf Ecosystem

**Status:** complete
**Depth:** Deep

## Plan

- **Question:** Can the alheekmahlib Quran ecosystem be reused as an isolated Tabyan Smart Mushaf v2, and which integration path best fits Tabyan’s Expo app and backend?
- **Scope:** Trace the three supplied repositories as one ecosystem; verify feature, QRC, model, Quran-data, font, resource, and audio boundaries; compare Flutter/Expo options. The user later clarified that the implementation should replace the active student Mushaf only after a new Flutter/Web candidate is ready, while preserving the old implementation for rollback.
- **Audience:** Tabyan product and engineering.
- **Deliverable:** Five requested reports: ecosystem audit, license matrix, architecture options, QRC comparison, and Smart Mushaf v2 plan.
- **Existing notes:** `research/notes.md` belongs to a completed Quran-ASR provider review and is preserved; this run uses a separate notes/source area.

## Focus Areas

| # | Area | Status | Sources |
|---|---|---|---|
| 1 | Repository ecosystem, app/core boundary, health, and feature trace | complete | 9 |
| 2 | Quran Library rendering, Tasmee engine, Zipformer, and tracking flow | complete | 12 |
| 3 | Quran Audio QRC lifecycle compared with Tabyan | complete | 10 |
| 4 | Component-by-component licensing and distribution rights | complete | 12 |
| 5 | Flutter/Expo integration options and isolated v2 recommendation | complete | 8 |

## Coverage Checklist

- [x] What is the dependency and responsibility relationship among all three repositories?
- [x] Which requested Mushaf, Tasmee, tracking, correction, and teacher capabilities are present in source versus merely claimed?
- [x] How exactly does local audio reach Zipformer/phoneme alignment/word tracking, and what remains unverified?
- [x] How does `quran_audio` create, authenticate, stream to, finalize, and close QRC compared with Tabyan?
- [x] What rights apply separately to code, model weights, phoneme/text data, QCF fonts, QUL/KFGQPC resources, and recordings?
- [x] Which Flutter/Expo architecture best meets reuse, iPhone experience, performance, Android, and maintenance priorities?
- [x] What work can be safely isolated as `SMART_MUSHAF_V2` without altering the current Mushaf, QCF data, routes, auth, or backend?
- [x] What must remain blocked until rights, hardware tests, or provider terms are confirmed?

## Findings Log

_[@key] markers reference this run’s source registry at `research/smart-mushaf/sources.json`._

### Repository and feature trace

- The three repositories share an owner, but the app is not evidence that every package is integrated: its pubspec depends on `quran_library` and does not list `quran_audio`. The app repository has no GitHub-detected license, so it is reference-only for reuse. [@alquranalkareem-repository] [@alquranalkareem-pubspec] [@alquranalkareem-github-api]
- The inspected `quran_library` main branch provides the Quran page surface and Tasmee components; branch version 5.0.2 differs from the fetched pub.dev latest metadata 5.0.1, so the audited branch must not be treated as the exact released package. [@quran-library-readme] [@quran-library-pubspec] [@quran-library-pubdev-api]
- Source code establishes live word-state rendering, local phoneme recognition, range tracking, and final reconciliation. No source establishes teacher mode or real-device performance. [@quran-pages-screen] [@quran-rich-text-reveal] [@quran-sherpa-engine] [@quran-range-tracker] [@tasmee-final-reconciliation]

### Quran Library and local engine

- The microphone session requests mono 16 kHz PCM, converts PCM16 samples to Float32, and feeds a sherpa_onnx Zipformer2 CTC recognizer. The code consumes token output through Quran phoneme/reference alignment and a range tracker; this verifies implementation presence, not successful inference or accuracy on a real phone. [@quran-recitation-session] [@quran-sherpa-engine] [@quran-phoneme-units] [@quran-phoneme-aligner] [@tasmee-reference-store] [@quran-range-tracker]
- Hide/reveal and current-word styling are implemented in the QPC V4 word renderer. Madd timing is a heuristic over emitted timestamps; no benchmark, latency, or false-positive rate was found. [@quran-rich-text-reveal] [@tasmee-madd-timing] [@tasmee-error-detector]
- The model is downloaded at runtime by source code and not bundled as an app asset. The repository’s NPL-1.2 file separately covers model/data/token artifacts and prohibits charging for the Work or features it powers; exact model hash and successful device download were not checked. [@tasmee-model-service] [@quranlab-zipformer-card] [@quranlab-npl-1-2]

### Quran Audio / QRC

- Current `quran_audio` code uses a JSON control/feedback channel and raw binary audio frames. Its session records a complete 16 kHz mono WAV file and sends it in 4 KiB pieces only after stop. Its default URL does not set `audio_format=wav`; the provider guide says Opus is the default. Default auth puts the key in the URL and the client logs that URI. [@quran-audio-qrc-client] [@quran-audio-qrc-session] [@quran-audio-qrc-constants] [@qrc-official-guide]
- Qurani.ai’s current guide requires MessagePack envelopes, uppercase methods, and each WAV message to contain a complete WAV file; its documented 200 ms WAV frame is exactly the current Tabyan server chunk size. Tabyan’s transport uses MessagePack, 16 kHz mono WAV frames, and streams while recording. The package QRC implementation is worse aligned with the current guide; no live provider call was made. [@qrc-official-guide] [@quran-audio-qrc-config] [@quran-audio-qrc-method] [@quran-audio-qrc-feedback]
- The package’s `tajweed_level` maximum is 3 while the current provider guide documents 1–5. The package’s QRC config and event names also conflict with its own wire-method strings, so do not port it without an explicit protocol rework. [@quran-audio-qrc-config] [@quran-audio-qrc-method] [@quran-audio-qrc-constants] [@qrc-official-guide]

### Licenses

- Both packages’ code licenses are MIT, but `quran_library` explicitly excludes QCF fonts and QUL/KFGQPC content from that grant. [@quran-library-mit-license] [@quran-library-asset-notice] [@quran-audio-mit-license]
- Quran-Lab NPL-1.2 permits local use and limited free/cost-recovery hosted use, requires share-alike for derivatives, and prohibits charging for the model or features it powers. QUL/KFGQPC asset terms and per-recording audio rights were not established; full-stack commercial clearance is therefore partial/blocked. [@quranlab-npl-1-2] [@qul-font-docs] [@kfgqpc-rights-discovery] [@quran-audio-provider-discovery]
- Quran Foundation API terms are a separate rights regime from QUL downloads; they cannot be used to infer permissions for QUL/KFGQPC files. [@quran-foundation-developer-terms] [@quran-library-asset-notice]
- Recent-source check: the fetched Pub.dev package page confirms `quran_library` 5.0.1 uploaded 2026-09-23 and `quran_audio` 1.0.0 uploaded 2026-07-11; the `quran_library` repository main branch remains 5.0.2. QUL’s 2026-10-05 changelog fixes a QPC V1 font glyph on page 98 but does not change or state reuse terms. [@quran-library-pubdev-page-current] [@quran-audio-pubdev-page-current] [@qul-changelog-october-2026]

### Architecture options

- Flutter officially supports native add-to-app on iOS and Android, but Expo documentation covers custom native code/development builds, not a turnkey Flutter-module integration. A dedicated Flutter candidate minimizes changes to the current app but requires a secure Tabyan auth handoff and a separate mobile artifact/project boundary. [@flutter-add-to-app] [@expo-custom-native] [@expo-development-builds] [@apple-universal-links] [@apple-keychain-groups]
- This workspace already contains its sole mobile artifact and has no Flutter/Dart SDK installed; no additional native artifact was created. A dedicated external project is the lowest-impact evaluation route; a web-only prototype would not satisfy real-iPhone acceptance. [Local workspace inspection; project’s saved mobile-artifact constraint]

## Conflicts & Open Questions

- The quran_library source branch is version 5.0.2 while pub.dev API metadata reports latest 5.0.1; pin and audit an exact release before adopting.
- The quran_audio README/commit history and live source do not match Qurani.ai’s current protocol guide; treat the repository implementation as stale/incompatible unless maintainers demonstrate a compatible released version.
- The QRC numeric level ranges are published, but the semantics and mapping to Tabyan policy are unresolved.
- QUL and KFGQPC resource terms were not captured; a different Quran Foundation API terms page does not grant QUL asset rights.
- Main app authentication and app-level systems are outside the reusable package boundary; no real iPhone/Android acceptance evidence exists.
- The QUL website extraction did not expose the footer’s Terms of Use destination. The official QUL update log confirms a recent font correction, not licensing permission. [@qul-homepage-terms-link] [@qul-changelog-october-2026]
- The user’s implementation brief includes `quran-muaalem` as an optional engine reference. Its current README describes a Python/server-oriented model, lists MIT for code but separate model/dataset sources, and reports a 660M model with GPU requirements; no model or service was run.
- `quran_library` declares Web support, but the inspected Tasmee controller explicitly disables microphone/sherpa on Web. A Web target would need a remote provider adapter; the existing Tabyan server QRC transport is closer to the current provider guide than `quran_audio`’s client, but has not been live-tested.
- Current repository HEADs were recorded on 2026-10-15: `alquranalkareem` `61a9a69a65e5bbabb63f71602a2dd278dd8e3fa2`; `quran_library` `230b4b7218d1fc56e51e7f165830c15e9ce4efe2`; `quran_audio` `41411a597b9d7613127220c911e8f2f642947c58`; optional `quran-muaalem` `a0a9e43e71063c8e8367b8cbbb88f6e45d7a65f1`.

## Gaps

- No model was downloaded or run, no real iPhone/Android test was performed, no external QRC call was made, no database was changed, and no deployment occurred.
- The project workspace currently has one mobile artifact and no Flutter/Dart SDK. No separate Flutter project URL/host was supplied. The new candidate is therefore not instantiated; the old Mushaf remains live until the replacement is ready.
- Unknown rights or untested device behavior remain blocked/unknown rather than inferred from MIT source-code licenses.

## Completion

- Five reports are ready: ecosystem audit, license matrix, architecture options, QRC comparison, and isolated `SMART_MUSHAF_V2` plan.
- 52 cited sources are registered in `research/smart-mushaf/sources.json`; all fetched/snippet evidence paths are present.
- Recommendation: `ADOPT_WITH_ADAPTER` for an isolated Flutter candidate only; full commercial clearance and real-device acceptance remain open gates.
- No application code, current Mushaf/QCF data, routes, backend, database, or deployment was changed in this audit.
- The new replacement brief is documented in `research/TABYAN_SMART_MUSHAF_REPLACEMENT_REPORT.md`; its verdict is `BLOCKED_WITH_EXACT_REASON` until a project host and content-rights path are provided.
