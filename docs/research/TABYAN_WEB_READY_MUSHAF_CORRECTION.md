# Tabyan Web Ready Mushaf Correction

**Assessment date:** 2026-10-15  
**Status:** `READY_STACK_BLOCKED_BY_LICENSE`

## Required result fields

```text
CURRENT_QCF_V2_CANDIDATE:
REJECTED

NEW_READY_STACK_CANDIDATE:
BLOCKED

READY_RENDERER_USED:
NO

TABYAN_QCF_V2_USED:
NO (in a new ready-stack candidate; the rejected experiment did use it)

QURAN_LIBRARY_NATIVE_RENDERER:
NO

BUILT_IN_TASMEE_USED:
NO

BUILT_IN_HIDE_REVEAL:
NO

WORD_STATE_FROM_READY_STACK:
NO

TABYAN_BRANDING_APPLIED:
NO

AUTH_CONNECTED:
NO

NABR_CALLED:
NO

MODEL_DOWNLOADED:
NO

DB_MUTATIONS:
0

DEPLOYMENT:
NO

NEXT_STEP:
AUTH_ONLY_IF_ALL_CORE_GATES_PASS

OLD_MUSHAF_RENDERER_USED:
NO (in a new ready-stack candidate; no candidate was built)

READY_TASMEE_STRUCTURE_USED:
NO (no candidate was built)

MANUAL_RECREATION:
NO (no new candidate was built; the rejected QCF-v2 experiment did use manual behavior)

WEB_BUILD:
NOT_RUN (blocked before implementation by the license gate)
```

## Why the new candidate is blocked

The pinned source candidate is `alheekmahlib/quran_library` at commit
`230b4b7218d1fc56e51e7f165830c15e9ce4efe2`. Its code `LICENSE` is MIT, but its
`NOTICE` explicitly says that grant does not cover QCF fonts or QUL/KFGQPC
resources and that those assets are subject to separate terms. The package
declares Quran fonts, page assets, JSON, and images in `pubspec.yaml`. No
authoritative distribution grant for the exact renderer resources, Quran
text/layout, or fonts was provided, and the referenced KFGQPC terms were not
verified. Therefore the ready renderer cannot be run or bundled yet:

```text
READY_STACK_BLOCKED_BY_LICENSE
```

The bundled Quran-Lab Zipformer resources are a separate gate. The saved
NPL-1.2 text bars charging for the model or features it powers and requires
share-alike for derivatives. No model was downloaded or run. Do not enable it
in a paid or ad-supported Tabyan feature without a compatible grant or a
cleared replacement.

## Ready-stack source map — references only, not integrated

These are the inspected source paths for the requested ready implementation.
They were **not** used in a candidate. Source snapshots were fetched from the
repository's `main` branch on 2026-10-15; verify each path against the pinned
commit above before any implementation.

| Function to prove | Repository / commit | Source path | Candidate status |
|---|---|---|---|
| Ready Quran screen and QPC V4 page renderer | `alheekmahlib/quran_library` / `230b4b7218d1fc56e51e7f165830c15e9ce4efe2` | `lib/src/pages/quran_library_screen.dart`; `lib/src/quran/data/qpc_v4/qpc_v4_page_renderer.dart` | Not used; license gate |
| Surah and page navigation | Same | `lib/src/pages/quran_pages_screen.dart`; `lib/src/quran/presentation/widgets/page_view_build.dart`; `lib/src/quran/presentation/widgets/jumping_between_pages_widget.dart` | Not used; license gate |
| Word interaction and QPC text spans | Same | `lib/src/quran/presentation/widgets/download_fonts_page/custom_span.dart`; `lib/src/quran/presentation/widgets/download_fonts_page/rich_text_build.dart`; `lib/src/quran/presentation/widgets/word_info/tap_long_press_recognizer.dart` | Not used; license gate |
| Built-in hide/reveal and word-state rendering | Same | `lib/src/quran/presentation/widgets/download_fonts_page/rich_text_build.dart`; `lib/src/quran/presentation/widgets/download_fonts_page/custom_span.dart`; `lib/src/tasmee/controller/tasmee_ctrl.dart`; `lib/src/tasmee/controller/tasmee_state.dart` | Not used; license gate |
| Built-in Tasmee UI and state machine | Same | `lib/src/tasmee/presentation/widgets/tasmee_control_widget.dart`; `lib/src/tasmee/controller/tasmee_ctrl.dart`; `lib/src/tasmee/controller/tasmee_state.dart` | Not used; license gate |
| Recognition, word state, and live range tracking | Same | `lib/src/tasmee/engine/recitation.dart`; `lib/src/tasmee/engine/recitation_session.dart`; `lib/src/tasmee/engine/range_tracker.dart` | Not used; license gate |
| Model readiness/download path | Same | `lib/src/tasmee/core/services/tasmee_model_service.dart`; `lib/src/tasmee/engine/zipformer_model.dart` | Not used; model/license gate |

The source map is not implementation proof. A future candidate must point to
these ready-stack sources for every visible Mushaf/Tasmee feature and must not
substitute Tabyan QCF v2 or manually recreate the same behavior.

## Candidate and legacy status

- `projects/smart-mushaf-flutter` is retained as
  `REJECTED_ARCHITECTURE_EXPERIMENT`. It renders Tabyan QCF v2 fixtures and
  includes manually written page and hide/reveal behavior; its successful
  tests/build are not product acceptance. Do not extend, promote, connect, or
  delete it in this phase.
- No new `/student/smart-mushaf-ready` route or ready-stack Web candidate was
  created.
- The existing reader at `/student/mushaf-fahd`, its source, QCF v2 data,
  fonts, navigation, and rollback route remain unchanged and active.
- Authentication is deferred until all core renderer/Tasmee gates pass.

## Safety record

- Nabr/QRC calls: **0**.
- Model downloads/runs: **0**.
- Database mutations: **0**.
- Deployment/publishing: **NO**.
