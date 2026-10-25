# TABYAN — Nabr/QRC Structured Quran Authority Adapter

**Review date:** 2026-10-14  
**Status:** This document preserves the pre-live review as a historical snapshot. One authorized development-only Nabr/QRC shadow session subsequently ran; see [the live acceptance report](TABYAN_NABR_QRC_FIRST_LIVE_SHADOW.md). Nabr is disabled again. Two accepted `recitation.start` mutations created operational session records; after the read-only check found both `listening`, the user authorized changing only their status to `cancelled`. No schema migration or learner-progress write was made.

## 1. QRC levels and coordinate evidence

Sources reviewed:

- [Current Qurani.ai QRC guide](https://qurani.ai/en/docs/2-advanced-tools/qrc), fetched 2026-10-14.
- [Nabr developer API page](https://nabrquran.ai/en/api), used only as corroborating product documentation; it does not define the QRC start-level mapping for Tabyan.
- Stored QRC guide capture at `research/sources/qurani-ai-qrc-technical-docs.md`, fetched 2026-10-10.

| Question | Finding |
|---|---|
| `hafz_level` allowed numeric values | `1–3` in the current QRC guide. The guide does not explain what each value means. |
| `tajweed_level` allowed numeric values | `1–5` in the current QRC guide. The stored 2026-10-10 capture says `1–3`, so this field has conflicting saved documentation and should be reconfirmed with the provider before live use. |
| Recommended local/mock values | `hafz_level=1`, `tajweed_level=1`, copied from the current guide's own start example. This is a fixture recommendation only; neither value was added to runtime configuration. |
| Meaning of levels in Tabyan policy | **UNKNOWN.** No mapping from Tabyan's session or learner policy to the provider levels is documented. |
| `chapter_index`, `verse_index`, `word_index` base | The current guide's start example uses `1` for the Surah number, starting verse, and starting word, and its result examples use matching chapter/verse/word numbers. The adapter preserves these values directly as one-based numbers and performs no offset arithmetic. This is example-based evidence; the guide does not contain a separate normative statement that names the index base. |
| `letter` base and orthographic meaning | **UNKNOWN.** The guide documents an optional numeric letter value but not its base or how it relates to Unicode, Uthmani orthography, QCF glyphs, or phonemes. It is retained only as `providerLetterIndex`; it is never mapped to a canonical character. |

**Decision:** Numeric level ranges are visible in the current guide, but their meanings are not; `tajweed_level` also conflicts with the saved capture. Index examples support one-based word coordinates, but the protocol lacks a normative index-base statement and the letter base remains unknown. Keep live QRC disabled until the provider clarifies these open contract points and Tabyan approves a separate live test.

## 2. Structured observation path

The server converts documented QRC position, word, letter-mistake, and tajweed-mistake observations into a separate `QrcStructuredObservation` contract. It does not create or synthesize transcript text. A separate gateway message and subscription API carry only sanitized structured observations; the transcript matcher bridge continues to accept only partial/final transcript events.

The Mushaf-side `CanonicalQuranResolver` uses the existing canonical word-page corpus (`qdc-uthmani-hafs-word-text-v1`) supplied by its caller. It:

- validates the Quran coordinate against the canonical corpus;
- requires a session coordinate scope and rejects coordinates outside its start/end bounds;
- returns canonical identity and display text only from Tabyan data, never from provider-supplied text; and
- marks every result `authority: provider_observation` and `confirmation: unconfirmed`.

The resolver is a prepared library contract; the Mushaf UI does not subscribe to or render these observations in this phase. `WORD_CONFIRMED` is not emitted by the QRC adapter. Only the existing Tabyan state-engine projector can produce `ConfirmedTabyanRecitationEvent`.

## 3. Conservative confirmation and mapping policy

- Invalid, out-of-corpus, or out-of-session coordinates are rejected.
- `correct_words` and `skipped_words` remain provider claims, not Tabyan progress or mistake verdicts.
- QRC documents no confidence field and no stable result-event ID. No confidence threshold, exactly-once guarantee, or cross-packet repetition inference is invented. Duplicate observations remain unconfirmed and have no learner-state effect.
- A raw QRC letter coordinate stays attached to the same resolved word as provider metadata. It cannot select another word and is not mapped to a character.
- Tajweed and pronunciation messages remain observations. Their provider descriptions and error codes do not bypass Tabyan confirmation or become learner-state mutations.

## 4. Shadow mode and safeguards

- `NABR_QRC_SHADOW_MODE=true` is explicitly configured in the shared environment.
- Provider selection requires development mode, provider name `nabr`, `NABR_QRC_ENABLED=true`, shadow mode explicitly true, and `NABR_QRC_ONE_SHOT_TEST=true`.
- The one-shot acceptance gate accepts only a GENERAL session starting at Al-Fatiha `1:1`, word 1, and burns the attempt before reading the credential or opening a socket. It is process-local; restore the safe flags immediately after the one attempt and do not restart while armed.
- Development diagnostics log a whitelist of QRC event fields, coordinates, letter/tajweed structures, and timing samples. API-key query values and audio are not included.
- The safe shared values were restored after the live session: `NABR_QRC_ENABLED=false`, `NABR_QRC_DRY_RUN=true`, and `NABR_QRC_SHADOW_MODE=true`.
- `NABR_QRC_ONE_SHOT_TEST` is unset after exactly one Nabr provider session; no additional Nabr session is armed.
- Shadow observations are sent through a separate gateway message only in development. The client exposes a separate typed listener; it does not call the transcript matcher or `RecitationStateEngine`.
- QRC observations are not persisted and no learner progress was written. However, the ordinary `recitation.start` mutation inserts a session row; two such requests returned successfully during the UI run. A scoped read-only query against the verified Development database found both rows `listening` with `ended_at` unset. After user authorization, only those two rows' `status` values were changed to `cancelled`; `ended_at` remains unset and neither row was deleted. See the live report.
- The credential value was never viewed or logged; it was used for the one authorized Nabr connection. The restored flags prevent another connection.
- Production provider selection remains OpenAI. The development provider was restored to its prior Tarteel setting.

## 5. Focused verification

The tests below and the final-results table preserve the **pre-live** state. They are not the live acceptance result; use the separate live report for that outcome.

Local/mock tests cover:

- first Surah/ayah/word coordinates using the official example;
- the last word of an ayah and the next ayah's first word;
- a real Surah boundary from canonical page 604;
- invalid Surah, ayah, word, and out-of-session coordinates;
- raw letter index `0` retained without mapping to a glyph or another word;
- repeated observations remaining unconfirmed;
- unknown events rejected from the structured contract; and
- structured observations remaining outside the transcript matcher.

No live socket, Nabr API request, audio upload, or paid request was made.

## 6. Final report

| Field | Result |
|---|---|
| QRC level values verified | **PARTIAL** — numeric ranges are in the current guide; meanings are undocumented and the saved Tajweed range conflicts. |
| `HAFZ_LEVEL` | `1–3`; individual meanings and Tabyan mapping **UNKNOWN**. |
| `TAJWEED_LEVEL` | `1–5` in the current guide; stored capture says `1–3`; individual meanings and Tabyan mapping **UNKNOWN**. |
| Recommended local test values | `1 / 1`, from the QRC example only; not configured for runtime use. |
| Index bases verified | **PARTIAL** — chapter/verse/word are supported as one-based by the guide's examples; letter base is **UNKNOWN**, and no normative base statement was found. |
| Structured adapter | **PASS** — separate typed path, no fake transcript. |
| Canonical Quran resolver | **PASS** — maps only against Tabyan's existing word corpus and required session scope. |
| Fake transcript required | **NO**. |
| Word-position mapping | **PASS** for the documented one-based example coordinates and canonical corpus tests. |
| Letter mapping | **NOT YET PROVABLE**. |
| Tajweed mapping | **NOT YET PROVABLE**. |
| Matcher bypassed unsafely | **NO**. |
| Tabyan authority preserved | **YES**. |
| Shadow mode ready | **YES**; no Mushaf UI or learner-state integration. |
| `NABR_QRC_ENABLED` | `false`. |
| `NABR_QRC_DRY_RUN` | `true`. |
| `NABR_QRC_SHADOW_MODE` | `true`. |
| `NABR_QRC_ONE_SHOT_TEST` | Unset; required before the development-only single-session gate can select Nabr. |
| External Nabr connections | `0`. |
| Audio sent | **NO**. |
| Production provider | **OPENAI**. |
| Deployment | **NO**. |
| Database changes | **NONE**. |
