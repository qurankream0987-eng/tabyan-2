# TABYAN Smart Mushaf Replacement — Implementation Status

**Assessment date:** 2026-10-15  
**Status:** `REJECTED_ARCHITECTURE_EXPERIMENT; READY_STACK_BLOCKED_BY_LICENSE`
**Scope:** The user clarified that the old Mushaf should leave normal student navigation only after the replacement is ready. Its code, Quran data, fonts, and rollback path must remain; the student must not see both as normal choices.

## Source revision pins

The following branch heads were recorded with `git ls-remote HEAD` on 2026-10-15. The earlier code review used mutable `main` URLs; any implementation must use these pins or a separately audited published archive.

| Repository | Commit | Role |
|---|---|---|
| [alheekmahlib/alquranalkareem](https://github.com/alheekmahlib/alquranalkareem/tree/61a9a69a65e5bbabb63f71602a2dd278dd8e3fa2) | `61a9a69a65e5bbabb63f71602a2dd278dd8e3fa2` | Reference app only; repository has no detected license grant. |
| [alheekmahlib/quran_library](https://github.com/alheekmahlib/quran_library/tree/230b4b7218d1fc56e51e7f165830c15e9ce4efe2) | `230b4b7218d1fc56e51e7f165830c15e9ce4efe2` | Candidate Flutter Mushaf/Tasmee code; published package 5.0.1 differs from current `main` 5.0.2. |
| [alheekmahlib/quran_audio](https://github.com/alheekmahlib/quran_audio/tree/41411a597b9d7613127220c911e8f2f642947c58) | `41411a597b9d7613127220c911e8f2f642947c58` | Audio package and QRC reference; its inspected QRC wire contract does not match the current provider guide. |
| [obadx/quran-muaalem](https://github.com/obadx/quran-muaalem/tree/a0a9e43e71063c8e8367b8cbbb88f6e45d7a65f1) | `a0a9e43e71063c8e8367b8cbbb88f6e45d7a65f1` | Optional reference only; README advertises MIT code, but points to separate model/dataset sources and describes a Python/server-oriented 660M model with GPU requirements. No model or service was run. |

## Recommended target architecture

**Required target, not implemented:** an isolated Web candidate using `quran_library`'s own QPC V4 renderer, page/Surah navigation, word interaction, and built-in Tasmee UI/state. The current `projects/smart-mushaf-flutter` QCF v2 port is **rejected**, not a product candidate. The ready stack is blocked because the Quran text/font/resource grants are unresolved. The current React Mushaf remains active and unchanged.

The inspected `quran_library` metadata declares Web support, but its Tasmee controller disables browser microphone/Zipformer behavior. If a licensed Web candidate is built later, its recognition may be marked `MOCK`; do not add Nabr, a remote provider adapter, or backend integration before the Quran core gates pass.

## Required implementation report fields

| Field | Current result |
|---|---|
| `CHOSEN_ARCHITECTURE` | A new ready-stack Web candidate using `quran_library`'s own renderer and built-in Tasmee structure; not implemented because the resource license gate is blocked. |
| `NEW_SMART_MUSHAF` | **REJECTED EXPERIMENT** — the Flutter QCF v2 port used the explicitly rejected Quran core; it is retained only as evidence and is not product acceptance. |
| `OLD_MUSHAF_SOURCE` | **PRESERVED** — current source and QCF v2 assets remain in the Tabyan Web artifact. |
| `OLD_MUSHAF_ACTIVE` | **YES** — intentionally remains active until the replacement is ready. |
| `OLD_MUSHAF_VISIBLE_TO_STUDENTS` | **YES** — existing live entry points remain unchanged for now. |
| `OLD_MUSHAF_DELETED` | **NO**. |
| `NEW_SMART_MUSHAF_ACTIVE` | **NO**. |
| `FULL_MUSHAF` | **NOT_TESTED** in a ready-stack candidate. The rejected experiment's QCF v2 page-3 preview is not acceptance evidence. |
| `HIDE_REVEAL` | **NOT_USED** from the ready stack. Manual hiding in the rejected experiment is not accepted. |
| `LIVE_WORD_TRACKING` | **NOT_IMPLEMENTED** in a ready-stack candidate. |
| `LOCAL_ZIPFORMER` | **BLOCKED** for a paid/ad-supported feature under the NPL-1.2 terms reviewed; no weights downloaded or run. |
| `NABR_QRC` | **NOT CALLED OR INTEGRATED** in this candidate; do not add it before the Quran core gates pass. |
| `RECITATION_CORRECTOR` | **NOT_USED** from the ready stack. |
| `QURAN_TEACHER` | **NOT_USED**; do not recreate it manually. |
| `TABYAN_AUTH` | **DEFERRED** until ready renderer and Tasmee structure pass; no handoff was requested or connected. |
| `TABYAN_VISUAL_IDENTITY` | **NOT_APPLIED** to a ready-stack candidate. |
| `QURAN_INTEGRITY` | **NOT_TESTED** in a ready-stack candidate. The old reader and its data remain unchanged. |
| `LICENSE` | **BLOCKED** — package MIT applies to code, not QCF/QUL/KFGQPC assets; exact text/font/resource grants are not established. |
| `REAL_IPHONE` | **NOT_TESTED**. |
| `DB_DESTRUCTIVE_MUTATIONS` | `0`. |
| `DEPLOYMENT` | `NO`. |
| `FINAL_VERDICT` | `READY_STACK_BLOCKED_BY_LICENSE`. |

## Exact blockers before an active replacement

1. **License gate:** the `quran_library` MIT license does not grant rights to its bundled QCF/QUL/KFGQPC fonts, Quran text/layout, or other resources. No complete grant was provided, so do not run or bundle the ready renderer yet.
2. **Tasmee/model gate:** the built-in Tasmee structure must be used rather than rewritten. The Zipformer NPL-1.2 terms prohibit charging for the model or features it powers and require share-alike for derivatives; no model was downloaded or run.
3. **Web candidate:** no ready-stack Web route was created. After rights are cleared, it must use the actual `quran_library` renderer/Tasmee UI/state, with recognition marked mock on Web if live mic/model is unavailable.
4. **Authentication:** deferred until `READY_RENDERER` and `READY_TASMEE_STRUCTURE` pass and `TABYAN_QCF_V2_DEPENDENCY = 0`.
5. **Cutover:** the current Mushaf must remain active until the ready-stack candidate passes rights, Quran-integrity, and device acceptance gates.

The current reader remains at `/student/mushaf-fahd` in `artifacts/tabyan`; its entry points and runtime behavior have not been changed. The Flutter QCF v2 experiment remains at `projects/smart-mushaf-flutter` but is rejected and must not be extended or promoted. The correction report at `research/TABYAN_WEB_READY_MUSHAF_CORRECTION.md` records the license block and the ready-stack source map. The old code, Quran data, fonts, and rollback route must remain.

## Safety and cost record

- Nabr/QRC calls initiated for this candidate: **0**.
- Model weights downloaded or run: **0**.
- GPU use: **0**.
- Database destructive mutations: **0**.
- Deployment or TestFlight/Android publishing: **NO**.
- The rejected QCF v2 experiment had a clean Flutter analysis, **7 passing tests**, and a successful Web build; these are not product acceptance.
- The current Mushaf source, data, routes, authentication, and backend were not changed.
