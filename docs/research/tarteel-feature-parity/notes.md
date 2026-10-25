# Research Notes: Tabyan–Tarteel Quran Feature Parity

**Status:** complete
**Depth:** Deep

## Plan

- **Question:** Which current, publicly documented Tarteel Quran features are present, partial, missing, blocked, or not applicable in Tabyan?
- **Scope:** Official Tarteel Help Center, website, and store listings; audit the supplied 68 feature groups against current Tabyan code/docs. No implementation.
- **Audience:** Tabyan product and engineering.
- **Deliverables:** Current feature matrix and dependency-ordered parity master plan, with verified evidence and exact status totals.

## Focus Areas

| # | Area | Status | Sources |
|---|---|---|---|
| 1 | Recitation, follow-along, mistakes, memorization and tests | complete | 10 listed URLs |
| 2 | Quran reading, navigation, search and study tools | complete | 12 listed URLs |
| 3 | Audio, reciters, translations and tafsir | complete | 5 listed URLs |
| 4 | Goals, progress, review and social features | complete | 11 listed URLs, including gap fill |
| 5 | Current app listings, privacy, offline behavior and product-wide features | complete | 5 listed URLs |

## Coverage Checklist

- [x] Verify current Tarteel product behavior from first-party pages, not only old Tabyan notes.
- [x] Map all 68 supplied feature groups to source-backed Tarteel behavior and current Tabyan implementation; thin areas are called out per row.
- [x] Distinguish implemented code from live-device/provider proof, and preserve the GENERAL/EDUCATIONAL contract.
- [x] Identify which apparent gaps are deliberately blocked, legally constrained, or not applicable to Tabyan.
- [x] Establish safe dependencies, implementation layers, and priorities without authorizing or making changes.
- [x] Verify every final citation against saved evidence and calculate status totals from the completed matrix.

## Findings Log

_[@key] markers identify source-registry keys._

### Research collection

- Tarteel's current free-tier article lists follow-along, voice search, limited Testing, hidden ayahs, translations/tafsir, reciters/downloads, Tajweed colors, layouts, mutashabihat lists, streaks, bookmarks, goals and sync [@tarteel-free-access].
- Store descriptions corroborate several recitation/search claims, but also put hidden-verse/peek features in Premium copy; the plan boundary is unresolved across public sources [@tarteel-apple-store] [@tarteel-google-play].
- Fetched support material establishes controls for hide ayahs, audio playback/deletion, goals, layouts, translations, reciters, voice search and Tajweed colors [@tarteel-hide-ayahs] [@tarteel-recording-playback] [@tarteel-layout-options] [@tarteel-translations] [@tarteel-tajweed-colors].
- Goal pages distinguish user-created goals and Dashboard shortcuts; snippets describe manual off-platform sessions, group leaderboards, badges and goal scope but do not establish full workflow rules [@tarteel-goals] [@tarteel-todays-goals] [@tarteel-groups-leaderboards] [@tarteel-badges] [@tarteel-off-platform-session] [@tarteel-goal-scope-troubleshooting].
- Testing help snippets establish a Testing Mode help section and a starter range; exact timing, pause/recovery, controls and scoring are not fully established by the collected evidence [@tarteel-testing-getting-started] [@tarteel-testing-mode-index].
- Tarteel recording deletion is described as deleting all recordings; the separate privacy page is dated 2023-05-26, so it is stale for current retention or processing claims [@tarteel-recording-deletion] [@tarteel-privacy-policy-2023].
- Tabyan's current source has an in-reader QCF Web Mushaf, word reveal/tracking, voice search/follow, listening from EveryAyah, page bookmarks, last-read/listen state, local recitation history, mistake dismissal, explainable review suggestions and a configurable temporary memorization test (`MushafReader.tsx`, `RecitationHistorySheet.tsx`, `weaknessEngine.ts`, `useAudioPlayer.ts`). These are source-level findings, not live-device acceptance.
- The existing audit confirms EDUCATIONAL recitation is fail-closed without an authoritative assignment source; GENERAL remains open-ended. Preserve this distinction.
- The official Tarteel API answer says no public API on 2025-09-27; a current-week news sweep found no clear later product/API announcement. Treat API availability as unconfirmed, not as a current guarantee of non-existence [@tarteel-public-api-answer-2025].
- The scoped source registry is `research/tarteel-feature-parity/sources.json`; it keeps this product-parity source set separate from the pre-existing ASR provider registry.
- Completed deliverables: `docs/TABYAN_TARTEEL_CURRENT_FEATURE_MATRIX.md` (68 groups; 11 PARITY, 34 PARTIAL, 18 MISSING, 1 BETTER_IN_TABYAN, 0 NOT_APPLICABLE, 4 BLOCKED) and `docs/TABYAN_TARTEEL_FULL_PARITY_MASTER_PLAN.md`.

## Conflicts & Open Questions

- The Help Center says Hide ayahs is free; current Apple/Google listing copy includes “Peeking & Hidden Verses Mode” under Premium. Do not claim a single plan rule until Tarteel clarifies platform/rollout differences [@tarteel-free-access] [@tarteel-apple-store] [@tarteel-google-play].
- The privacy page is last updated 2023-05-26 and states broad retention language; it cannot settle current retention, regional processing, or recording controls [@tarteel-privacy-policy-2023].
- Every external source is Tier 3 under the general independence rubric. They are first-party primary evidence of published Tarteel behavior, not independent confirmation of recognition quality, availability, or safety.
- Store listings may not expose every feature to every plan, platform, locale, or rollout cohort.
- Web implementation evidence does not establish Native parity or real-device audio accuracy.
- An absent Tabyan implementation is not enough to label a feature BLOCKED; state the concrete dependency or evidence limitation.
- A current-week Tarteel news search returned no clearly relevant new feature or API announcement; no search result was promoted to a current product fact.

## Gaps

- Filled: targeted official searches added first-party pages on Today's Goals, groups/leaderboards, Tajweed colors, recording deletion, and snippets on off-platform sessions, badges and testing controls.
- Limitation: exact testing controls/scoring, typed-text search, heatmaps/analytics semantics, bookmark persistence, and full off-platform workflow remain undocumented or snippet-only; classify Tabyan gaps from its own implementation evidence without inventing Tarteel behavior.
- Limitation: account/device and hardware validation, Native reader parity, audio accuracy, and subscription availability by locale/rollout were not tested.
- Completed: 68 sequential matrix rows, 34 distinct source URLs/evidence paths, all source citations resolve, and status totals sum to 68. Remaining items above are explicit source/device/product limitations, not unfinished research steps.
