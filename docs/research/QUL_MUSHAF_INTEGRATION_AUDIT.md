# QUL Mushaf integration audit

**Date:** 2026-10-12, Asia/Riyadh.  
**Scope:** Remote research and eligibility check for one development-only sample, pages **1, 2, 106, 207**.  
**Result:** Research completed; sample integration **BLOCKED_BY_RESOURCE_LICENSE**, additionally blocked by download access and resource-specific approval verification. **No application code changed.**

## 1. Public API and consumption model

**QUL Public API: NO. QUL Resource Consumption: DOWNLOADABLE DATASETS.**

- [Resources](https://qul.tarteel.ai/resources) explicitly says resources are intended to be downloaded and packaged with the consumer's project; “no API is available.”
- [FAQ](https://qul.tarteel.ai/faq), “Does QUL have an API?”, confirms no current API. The documentation home calls the API “Coming soon / Currently in design.”
- Internal `/api/v1/...` examples and selector endpoints visible in resource pages **are not evidence of a supported public API**. Do not connect Tabyan to them, invent credentials or request `QUL_API_KEY` / `TARTEEL_API_KEY`.
- [Downloading and Using Data](https://qul.tarteel.ai/docs/downloading-data) recommends JSON for simple integration/prototypes and SQLite for large/query-heavy data.
- No QUL Rails installation, Ruby, Redis, Sidekiq, CMS or project database is needed.
- Download buttons for the inspected resource details point to a **QUL sign-in modal**, not an anonymously exposed export. No sign-in, account creation, credential request or download-access bypass was attempted.

## 2. Published inventory and approval limits

Observed on the live site:

| Category | Overview count | Public category listing | Published formats observed |
|---|---:|---:|---|
| Mushaf layouts | **20 Approved + 8 WIP = 28** | **12** public entries | SQLite, DOCX; JSON/images for some other layouts; ZIP for the SVG candidate |
| Quran fonts | 24 | 22 | TTF, WOFF, WOFF2, OTF for variable fonts; font pack for some; JSON/ligature mappings for decorative fonts |
| Quran script | 30 | 30 | JSON, SQLite; text/glyph and image-resource categories |
| Quran metadata | 8 | 8 | JSON, SQLite |

**These numbers are not interchangeable.** The overview advertises 20 approved layouts, but a public resource card does not disclose the approval flag of its underlying Mushaf record.

Selective remote source inspection confirms:

- Public detail/listing access uses `DownloadableResource.published`.
- `Mushaf.approved` means `enabled: true`; these are separate model attributes.
- Therefore **published ≠ independently proved APPROVED**. None of the three Madani detail pages inspected exposes a resource-specific approval flag. Do not fabricate one.
- **Approved layouts advertised by QUL: 20. Resource-specific approval proved for this shortlist: 0.**

Public layout names observed: Ligature Basd SVG Mushaf; Indopak 9 lines (Gaba); Indopak 16 lines (Taj company); Mushaf Qatar; KFGQPC Nastaleeq 15 lines; KFGQPC V1; KFGQPC V2; Digital Khatt KFGQPC V2; Indopak 13 lines (Qudratullah); KFGQPC V4; Indopak 13 lines (Taj company); Indopak 15 lines (Qudratullah).

No WIP layout has been selected for integration.

## 3. Madani candidates — technical ranking, not approved import list

The requested “up to 3 approved layouts” cannot yet be certified. Below are the three relevant published Madani resources and the explicit gates, not three approved/cleared choices.

| Rank / eligibility | Name / source | Status | Pages / lines | Script / font | Export format | License / size |
|---|---|---|---|---|---|---|
| **1 — best technical candidate, conditional** | [KFGQPC V2, 1421H, resource 10](https://qul.tarteel.ai/resources/mushaf-layout/10) | PUBLISHED; per-resource approval UNVERIFIED | **604 / 15** advertised; opening pages must be handled using actual rows | [QPC V2 Glyph word-by-word, 61](https://qul.tarteel.ai/resources/quran-script/61) + [QPC V2 Font, 249](https://qul.tarteel.ai/resources/font/249), explicitly linked as related resources | **SQLite, DOCX**; no JSON download advertised for this exact layout | BLOCKED; byte size not exposed anonymously |
| **2 — reserve, conditional** | [KFGQPC V1, 1405H, resource 15](https://qul.tarteel.ai/resources/mushaf-layout/15) | PUBLISHED; per-resource approval UNVERIFIED | **604 / 15** advertised | Page explicitly links QPC V1 Font **238** and QPC V1 Glyph word-by-word **57** | **SQLite, DOCX** | BLOCKED; byte size not exposed anonymously |
| **Excluded; not a third eligible choice** | [KFGQPC V4, 1441H, resource 19](https://qul.tarteel.ai/resources/mushaf-layout/19) | PUBLISHED; page warns **V4 Tajweed fonts disabled and being proofread** | **604 / 15** advertised | Page describes V4 Tajweed, page-specific glyph rendering | **SQLite, DOCX** | BLOCKED; size unknown; proofreading warning prevents adoption now |

**Best technical candidate: KFGQPC V2 (1421H).** It has an explicitly associated layout/script/font trio and is closest to Tabyan's existing QCF v2 rendering model. This reduces adaptation risk; it **does not establish identical glyph payloads, layouts, approval or asset permissions**.

Mobile/desktop and traditional appearance suitability are architectural assessments, **not visual acceptance**. No candidate is certified to have “beautiful headers” from technical metadata alone.

## 4. Correct resource combinations

For the first sample, only this explicitly documented body combination is eligible for further verification:

```text
layout: KFGQPC V2 (1421H), resource 10
script: QPC V2 Glyph – Word by Word, resource 61
font:   QPC V2 Font, resource 249
pages:  1, 2, 106, 207 only
```

Do not substitute existing QDC snapshot words or fonts and describe the result as imported QUL data. Compare them later, but preserve provenance separately.

The body font detail states:

- King Fahd Complex / Usman Taha handwritten Uthmani source.
- **Glyph-based:** each glyph represents a whole word, not ordinary Arabic-letter shaping.
- **604 page-specific fonts**, not a universal font.
- Advertised **TTF / WOFF / WOFF2**.
- Correct script is required; generic Arabic fallback cannot render its glyphs safely.
- Font alone does not establish chapter-header, basmala or marker identity.

### Headers, basmala and markers

- [Surah name font v2, 455](https://qul.tarteel.ai/resources/font/455): preview family `surah-name-v2-icon`; website ligature table shows **`surah001` through `surah114`**; TTF/WOFF/WOFF2 plus JSON/ligatures are advertised. These tokens are **not** the earlier Quran.com `001` mapping. They must not be interchanged.
- [Surah header font, 458](https://qul.tarteel.ai/resources/font/458): preview family `surah-header`; `QCF_SurahHeader_COLOR-Regular.ttf`; mapping is explicit and non-contiguous. Its first chapter token is `ﱅ`. Do not infer consecutive codepoints.
- Both resources are discoverable, but neither is explicitly linked as the compatible header asset for layout 10 in its related-resource pair. **Header compatibility, colors and rights require separate proof.** No external header font imported.
- Layout rows distinguish **`surah_name`, `basmallah`, `ayah`**. Render those rows as provided rather than inferring title/basmala rows from screenshots.
- [Surah metadata, 70](https://qul.tarteel.ai/resources/quran-metadata/70) exposes `bismillah_pre`; preview omits the separate pre-chapter basmala for Al-Fatihah and At-Tawbah. This does not mean Al-Fatihah's canonical verse basmala is removed.
- The live layout-10 page-1 HTML distinguishes `.char-word` and `.char-end`, and carries `data-location`, `data-ayah`, `data-position`. An ayah-end token has a source position but is not a recited word.
- Final classification must come from the actual downloaded export/verified mapping, not scraped DOM classes alone.

## 5. Layout and word contract

The [Mushaf Layout tutorial](https://qul.tarteel.ai/docs/tutorial-mushaf-layout-end-to-end) and resource Help define:

| Layout `pages` field | Purpose |
|---|---|
| `page_number`, `line_number` | Page/line order |
| `line_type` | `ayah`, `surah_name`, `basmallah` |
| `is_centered` | Centred versus justified line |
| `first_word_id`, `last_word_id` | Inclusive range into the associated word dataset |
| `surah_number` | Structural chapter-header identity |

Associated script documentation describes `word_index`, `word_key`, `surah`, `ayah`, `text`. [Data Model](https://qul.tarteel.ai/docs/data-model) specifies shared canonical `surah_id/surah`, `ayah_number/ayah`, `word_position/position`.

**Do not assume those explanatory schemas exactly match the export.** The script-61 page includes an inconsistent illustrative example: verse/page `1:1`/1 paired with `font_family: p574-v2` and ordinary Unicode text. That sample is not a verified QCF payload and is not copied into Tabyan.

The layout HTML also carries different identifiers: source layout word IDs, CMS record IDs, canonical `surah:ayah:position`. These must remain distinct.

### Planned `QulMushafRepository` boundary — not implemented

Responsibilities after gates clear:

1. Load one audited local package/manifest, not live QUL endpoints.
2. Query only a supported page and return ordered structural lines.
3. Resolve exact layout word ranges against the paired script export.
4. Expose canonical `{surah, ayah, word_position}`, token type and immutable glyph text separately from layout/source IDs.
5. Expose font/version/page/header/alignment/provenance metadata.
6. Reject missing ranges, duplicate lines, incompatible resources, unsupported pages and unproved canonical identities. **No silent fallback to current data.**

UI receives a normalized contract; it does not parse raw resource datasets in multiple components.

No stub repository or fake “QUL Preview” selector was added because there is no eligible downloaded input.

## 6. Format and download decision

**Preferred acquisition format for layout 10: SQLite**, because its actual buttons offer SQLite/DOCX, not JSON, and its tables directly express page-to-word joins. DOCX is not an appropriate runtime dataset.

If access and rights are established:

- Acquire **one** layout SQLite export; do not fetch a second equivalent format.
- Acquire the paired script in the smallest suitable advertised format, after inspecting actual size/schema.
- Extract just pages **1/2/106/207** and their referenced words offline into small checked JSON for the Web preview. No runtime browser SQLite dependency or Tabyan database migration is necessary.
- Acquire only four matching page fonts in one Web format, normally WOFF2, plus a separately cleared header asset if needed.
- Record resource identifiers, exact versions, original URLs, approval evidence, SHA-256 and license notices.
- No full 604-font pack, whole-library import, translations, tafsir, audio or morphology.

**Actual resource download size this turn: 0 bytes.** Only public HTML/documentation and small remote source excerpts were fetched for research. Exact sample-export/font byte sizes remain **UNKNOWN**, not zero or a fabricated estimate; authenticated exports were not available to inspect.

## 7. Resource-specific licensing — explicit blocker

QUL FAQ permits commercial usage **subject to each resource's own rights**. It explicitly warns that some resources have restrictions or attribution requirements.

The public copyright route was verified in the QUL source routing/controller, then checked for every resource below. Each returned:

> “We don’t have copyright information for this resource.”

| Resource / source | License evidence | Commercial use | Attribution | Redistribution | Decision |
|---|---|---|---|---|---|
| [V2 layout 10](https://qul.tarteel.ai/resources/10/copyright) | No resource-specific information | UNVERIFIED | UNVERIFIED | UNVERIFIED | **BLOCKED** |
| [V1 layout 15](https://qul.tarteel.ai/resources/15/copyright) | Same | UNVERIFIED | UNVERIFIED | UNVERIFIED | **BLOCKED** |
| [V4 layout 19](https://qul.tarteel.ai/resources/19/copyright) | Same | UNVERIFIED | UNVERIFIED | UNVERIFIED | **BLOCKED**, plus proofreading gate |
| [V2 body font 249](https://qul.tarteel.ai/resources/249/copyright) | Same; creator attribution is not a license | UNVERIFIED | UNVERIFIED | UNVERIFIED | **BLOCKED** |
| [V2 script 61](https://qul.tarteel.ai/resources/61/copyright) | No resource-specific information | UNVERIFIED | UNVERIFIED | UNVERIFIED | **BLOCKED** |
| [Surah name v2 font 455](https://qul.tarteel.ai/resources/455/copyright) | Same | UNVERIFIED | UNVERIFIED | UNVERIFIED | **BLOCKED** |
| [Surah header font 458](https://qul.tarteel.ai/resources/458/copyright) | Same | UNVERIFIED | UNVERIFIED | UNVERIFIED | **BLOCKED** |
| [Surah metadata 70](https://qul.tarteel.ai/resources/70/copyright) | Same | UNVERIFIED | UNVERIFIED | UNVERIFIED | **BLOCKED** |

Other metadata categories were surveyed, not selected for download. Their individual rights have not been cleared.

This is **not a claim that reuse is forbidden**. It means the evidence required by the owner's “If unclear: BLOCKED; do not ship it” instruction is missing. Generic QUL availability, QF's separate terms or the QUL application's code license cannot substitute for permission for these exact files.

## 8. Implementation and acceptance status

**Sample Renderer: FAIL — NOT IMPLEMENTED (blocked), not a failed rendering test.**

Not performed:

- Resource import/download or `QulMushafRepository` implementation.
- Development selector “Current Tabyan Mushaf” / “QUL Preview”.
- Four-page renderer.
- Authenticated route screenshots or 390/430/1440 acceptance.

After access, resource-specific approval and rights are proved, acceptance must use the real **`/student/mushaf-fahd`** route at **390/430/1440**, all four requested pages, and verify text, headers, basmala, markers, clipping, overflow and traditional page structure. No disconnected component preview counts.

Current QCF v2 renderer, canonical dataset and AI remain untouched. No OpenAI, Speechmatics, NVIDIA, Local Quran Whisper, QuranNormalizer, QuranLiveMatcher, RecitationStateEngine or WebSocket protocol change. No Native, database or production change.

## 9. Minimum unblock package

Provide the following **files or public permission documentation**, not account credentials:

- Resource-specific APPROVED/enabled evidence for layout 10.
- Applicable permission/license covering its layout, paired script, four page fonts and any selected header asset, including commercial application display, attribution and bundled redistribution.
- The actual layout-10 export and paired script export, or an official smaller four-page export.
- Only page fonts **1, 2, 106, 207** in one format; separately approved header/mapping if used.

A download account alone does not resolve the license/approval gates.

## 10. Final summary / cost accounting

| Requested field | Result |
|---|---|
| QUL Public API | **NO** |
| QUL Resource Consumption | **DOWNLOADABLE DATASETS** |
| Approved Mushaf Layouts Found | **20 advertised overall; 0 individually verified for shortlist** |
| Top 3 | V2 conditional first; V1 conditional reserve; V4 excluded, not an eligible third |
| Best Candidate | **KFGQPC V2, 1421H, conditional** |
| Format | **SQLite acquisition; four-page JSON extraction after clearance** |
| Font | QPC V2, resource 249; four page-specific Web fonts only |
| Sample Download Size | **0 bytes actual resource files; proposed package size UNKNOWN** |
| License | **BLOCKED** |
| Sample Renderer | **FAIL — blocked/not implemented, no runtime test** |
| Current Tabyan Mushaf Preserved | **YES** |
| Tabyan AI Changed | **NO** |
| Paid API / GPU / new paid service | **NO** |
| Deployment | **NO** |
| Full builds / full test suites / installs / workflow restarts | **NONE** |
| Assistants / browser testers | **NONE** |
| Replit credit accounting | No separately paid service/build/AI API intentionally invoked; actual conversation billing is not available and zero billed credits is not asserted |

## 11. Source audit links

- [Resources](https://qul.tarteel.ai/resources), [layouts](https://qul.tarteel.ai/resources/mushaf-layout), [fonts](https://qul.tarteel.ai/resources/font), [scripts](https://qul.tarteel.ai/resources/quran-script), [metadata](https://qul.tarteel.ai/resources/quran-metadata).
- [FAQ: API and individual rights](https://qul.tarteel.ai/faq).
- [Download overview](https://qul.tarteel.ai/docs/download-resources), [format/consumption guide](https://qul.tarteel.ai/docs/downloading-data), [Mushaf tutorial](https://qul.tarteel.ai/docs/tutorial-mushaf-layout-end-to-end), [canonical identifiers](https://qul.tarteel.ai/docs/data-model).
- Exact candidate/resource/copyright links are included above.
- [Public-resource controller](https://github.com/TarteelAI/quranic-universal-library/blob/main/app/controllers/resources_controller.rb), [approval scope](https://github.com/TarteelAI/quranic-universal-library/blob/main/app/models/mushaf.rb), [copyright route](https://github.com/TarteelAI/quranic-universal-library/blob/main/config/routes.rb).

Live branches/pages may change. This is dated evidence, not continuing permission.
