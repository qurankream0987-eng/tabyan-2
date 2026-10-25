# TABYAN BASMALA + CANONICAL WORDKEY AUDIT

## Result

- `BASMALA_MAPPING: PASS`
- `WORDKEY_BOUNDARIES: PASS`
- `NABR_INDEX_CONVERSION: READY`
- `CORPUS_INTEGRITY: PASS`
- `READY_FOR_NABR_GATEWAY_IMPLEMENTATION: YES`
- `LIVE_NABR: DISABLED`
- `PRODUCTION_PROVIDER_CALLS: 0`
- `DEPLOYMENT: NO`

This audit establishes canonical text and index readiness only. It does not prove real-time microphone alignment or pause behavior with a live Nabr session.

## Tanzil source integrity

- SHA-256: `6933e133dd56db778c801bf738848454e43648105a151e8d84d86a7cae39ec5f`
- Source size: 1,396,087 bytes
- `SOURCE_BYTES_CHANGED: NO`

The original `tanzil-uthmani.txt` is still the source of truth. Prefix separation is derived presentation/token metadata; the bundled Tanzil bytes are not edited.

## Basmala derivation

The runtime separates the exact Basmala prefix from the first ayah row in 112 surahs before generating `Ayah.words` and WordKeys:

- Standard source spelling in 110 surahs: 2–8, 10–94, 96, and 98–114.
- Source-spelled variant in 2 surahs: 95 and 97. These rows begin `بِّسْمِ` rather than `بِسْمِ`; the prior exact matcher therefore missed them. The variant is now extracted and retained verbatim as presentation metadata for the existing header.
- Not separated: Al-Fatihah (1), because its Basmala is part of ayah 1; At-Tawbah (9), because its source row has no Basmala and its metadata marks it absent.

The source spelling is retained in `Surah.bismillahText` for the separate header. The header layout and styling are unchanged.

### WordKeys, Tasmee, and progress

- A separate Basmala header is display-only: it is not an `Ayah`, `QuranWord`, or WordKey. It is excluded from Tasmee scope and progress totals.
- Al-Fatihah's Basmala remains in ayah 1. Its words have ordinary 1-based WordKeys and participate in Tasmee and progress like the rest of that ayah.
- At-Tawbah has no Basmala header or Basmala words.
- For Surahs 95 and 97, the extracted Basmala no longer shifts the first recitable WordKey; the first words are `وَٱلتِّينِ` and `إِنَّآ`, respectively.

The Tasmee scope is assembled from the selected ayahs' `words`, so presentation-only header text cannot enter the progress denominator.

## Canonical and Nabr indices

Canonical Tabyan WordKeys are 1-based:

```text
WordKey = { surah, ayah, wordIndex }
```

Nabr QRC coordinates are 0-based:

```text
chapter_index = surah - 1
verse_index   = ayah - 1
word_index    = wordIndex - 1
```

Both directions, session-start coordinates, and `correct_words` / `skipped_words` arrays use the shared `src/providers/nabr/nabrIndexConversion.ts` boundary module. Nabr coordinates are normalized before canonical resolution and never enter `SmartMushafState` directly. The normalized raw provider index is retained only for diagnostics; the reducer receives canonical `ConfirmedRecitationEvent` values.

For a session starting at the first recitable word of ayah 1:

| Surah | Separate Basmala header | First recitable word | Canonical start | Nabr start |
|---|---|---|---|---|
| Al-Fatihah (1) | No; Basmala is in ayah 1 | `بِسْمِ` | `1:1:1` | `{ chapter_index: 0, verse_index: 0, word_index: 0 }` |
| Al-Baqarah (2) | Yes | `الٓمٓ` | `2:1:1` | `{ chapter_index: 1, verse_index: 0, word_index: 0 }` |
| At-Tawbah (9) | No | `بَرَآءَةٌ` | `9:1:1` | `{ chapter_index: 8, verse_index: 0, word_index: 0 }` |
| At-Tin (95) | Yes; source-spelled variant | `وَٱلتِّينِ` | `95:1:1` | `{ chapter_index: 94, verse_index: 0, word_index: 0 }` |
| Al-Qadr (97) | Yes; source-spelled variant | `إِنَّآ` | `97:1:1` | `{ chapter_index: 96, verse_index: 0, word_index: 0 }` |

Thus provider `word_index: 0` maps to canonical `wordIndex: 1`; a separate header never consumes a provider word index.

## WordKey and corpus checks

- 114 surahs and 6,236 ayahs.
- 77,433 canonical Quran words after separating 112 four-word Basmala prefixes from the 77,881 source tokens.
- Every ayah's runtime text matches the source row after the exact standalone prefix is separated.
- Word indices are positive and sequential from 1 within each ayah; each key retains its source surah and ayah; duplicate keys: 0.
- Independent provider instances produce identical WordKeys; full-corpus conversion round-trips preserve each canonical key.
- Missing WordKeys: 0; duplicate WordKeys: 0; nondeterministic WordKeys: 0.

## Verification and boundary

The five-surah mapping tests check first WordKey, ayah and word numbers, header presence, session-start indices, and round-trip conversion.

- `SMART_MUSHAF_TESTS: 70 / 70 PASS`
- `TABYAN_CORE_TESTS: 339 / 339 PASS`
- `TYPESCRIPT: PASS`
- `PRODUCTION_BUILD: PASS`
- `PREVIEW: loaded /student/smart-mushaf-v3`

The existing Smart Mushaf bundle-size warning remains non-blocking (~1.52 MB minified, ~332.55 KB gzip); no optimization was attempted.

No live Nabr request, production auth/DB change, or deployment was made. The next implementation phase must keep the Nabr credential server-side and separately qualify word-by-word live alignment and stopping during silence before claiming Tarteel-like real-time behavior.
