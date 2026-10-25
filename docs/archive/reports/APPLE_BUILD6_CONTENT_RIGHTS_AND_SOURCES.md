# Tabyan Build 6 — Content Rights and Sources Audit

**Audit date:** 2026-09-04  
**Method:** source/configuration inspection only; no rights are inferred from
the existence of a file.

## Decision

```text
TASK_142: BLOCKED
CONTENT_RIGHTS_GATE: FAIL
```

The repository identifies technical sources for some content, but it does not
contain sufficient permission or licence evidence for all protected Quranic,
QCF, book, lesson, or third-party content used by the app. No permission claim
is made below.

## Source inventory

| Content | Actual source found | Owner | Licence | Public reference | Used in app | Permission required | Permission available | Apple documentation |
|---|---|---|---|---|---|---|---|---|
| Quran page JSON and word geometry | QDC/Quran.com API v4, fetched by `download-mushaf.mjs` and stored locally | QDC/Quran.com or underlying rights holder | UNKNOWN in repository | `https://api.qurancdn.com/api/qdc/verses/by_page/{page}` | Yes — Mushaf and recitation matching | YES / VERIFY | UNKNOWN | Required before submission |
| QCF v2 page fonts | Qurancdn Hafs v2 WOFF2 URL, converted/copied to native TTF | Qurancdn/Quran.com or underlying rights holder | UNKNOWN in repository | `https://static.qurancdn.com/fonts/quran/hafs/v2/woff2/p{n}.woff2` | Yes — native and web Mushaf rendering | YES / VERIFY | UNKNOWN | Required before submission |
| Native QCF page JSON | Deterministic copy from Web `public/mushaf/pages` | Same as upstream QDC source | UNKNOWN | See source rows above | Yes | YES / VERIFY | UNKNOWN | Required |
| Native canonical word JSON | Deterministic copy from Web `public/mushaf/quran-words/pages` | Source ownership not separately documented | UNKNOWN | No separate public reference found in repository | Yes — live reveal/matching | YES / VERIFY | UNKNOWN | Required |
| Web/native fonts and application fonts | QCF fonts from Qurancdn; IBM Plex Sans Arabic and Amiri package fonts | QCF owner unknown; font package owners for app fonts | QCF UNKNOWN; app font terms not recorded here | Package registries/upstream package references | Yes | QCF YES; app fonts VERIFY | QCF UNKNOWN | QCF documentation required |
| Sharia lessons | Database seeds and generated/demo content paths | Tabyan/content author not identified in repository | UNKNOWN | No authoritative public reference found | Yes — Sharia learning screens | YES / VERIFY | UNKNOWN | Required |
| Library books | Database/library content and book metadata paths | Tabyan/content owner not identified in repository | UNKNOWN | No authoritative public reference found | Yes — library screens | YES / VERIFY | UNKNOWN | Required |
| Tafsir | No separate authoritative tafsir source identified in this audit | UNKNOWN | UNKNOWN | Not established | Not confirmed as a distinct feature | UNKNOWN | UNKNOWN | Required if present |
| Hadith | No separate authoritative hadith source identified in this audit | UNKNOWN | UNKNOWN | Not established | Not confirmed as a distinct feature | UNKNOWN | UNKNOWN | Required if present |
| Daily verse Quran content | `alquran.cloud` server fallback/source path | alquran.cloud / underlying content owner | UNKNOWN in repository | `https://api.alquran.cloud/v1` | Yes for daily-verse server behavior | YES / VERIFY | UNKNOWN | Required if enabled in production |
| Prayer data | Aladhan API | Aladhan and its upstream data sources | Provider terms not recorded | `https://api.aladhan.com/v1` | Yes — prayer times | Provider terms VERIFY | UNKNOWN | Document active provider |
| App icon | `artifacts/mobile/assets/images/icon.png` | Tabyan project owner or source artist | UNKNOWN | No source/author record found | Yes | YES if third-party | UNKNOWN | Required if not original |
| Other image/media assets | No separate third-party media inventory found in inspected asset paths | UNKNOWN where applicable | UNKNOWN where applicable | Not established | Must be checked against final screenshots/build | Depends on asset | UNKNOWN | Required for third-party assets |

## Technical preservation evidence

- Native Mushaf contains 604 page JSON files, 604 canonical word files, and 604
  page TTF fonts.
- The native sync script documents that these assets are copied from the Web
  QCF v2 source.
- The verifier passed the page count and golden-page structural checks.
- Technical integrity does not establish copyright ownership or permission.

## Required owner action

Before App Store submission, the owner must provide and retain:

1. The licence/permission for QDC/Quran.com page data and QCF fonts, or a
   verified statement from the source that covers this use.
2. The source and rights for library books and Sharia lessons.
3. The rights for any third-party icon, image, audio, or video.
4. A final Apple-facing content-rights statement that makes no unsupported
   claim.

Until these are attached or otherwise verified outside the repository,
`CONTENT_RIGHTS_GATE` remains `FAIL`.