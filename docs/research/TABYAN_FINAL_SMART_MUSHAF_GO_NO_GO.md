# TABYAN — Final Smart Mushaf Go / No-Go

**Assessment date:** 2026-10-15  
**Scope:** Evidence-based product and engineering decision using the prior research plus a targeted review of the current Tabyan Nabr/QRC implementation and the captured `quran_audio` sources.  
**Status:** Report only. No application or old Mushaf changes.  
**Commercial status:** `TO_BE_DECLARED_BY_TABYAN_OWNER`  
**Important distinction:** “Not proven” is not “prohibited.” It is also not permission to copy, bundle, test with, or distribute a resource.

## Executive decision

| Decision | Result |
|---|---|
| Can Tabyan reuse open-source code? | **Yes, selectively.** `quran_library` and `quran_audio` code are MIT; `quran-muaalem` code is MIT according to its reviewed repository evidence. Preserve notices and keep assets/models separate. The `alquranalkareem` parent app has no detected repository license. |
| Is the full `quran_library` renderer cleared for Tabyan? | **No.** The exact Quran text, page layout, QPC/QCF font files, word maps, and several supporting assets lack verified file-level grants for the requested distribution. This is an evidence gap, not a prohibition. |
| Is there an explicit prohibition? | **Yes, but narrowly:** Quran-Lab NPL-1.2 bars charging for its model or a feature it powers, including paid access and advertising. This does not prohibit using the MIT renderer code or establish a prohibition on the separately sourced Quran resources. |
| Can the current QRC integration be used as a technical base? | **Yes, with further gates.** Tabyan has a server-side MessagePack transport, WAV framing, authenticated-session start-coordinate derivation, and an observation-only adapter. No live Nabr request or real-audio acceptance test has been made. |
| Is `quran_audio` a ready QRC integration to reuse? | **No.** Its captured client sends JSON and assumes a different method/response contract from the current QRC guide. Its audio-playback code is a separate feature from live recitation recognition. |
| Can only the uncertain assets be swapped cleanly inside `quran_library`? | **Not as a drop-in.** The renderer and Tasmee word state are coupled to QPC V4 IDs, font files, page/line records, and package models. Reuse is possible with a compatible data adapter and renderer/UI rewiring; it is not a plug-in asset substitution. |
| Do we need to rebuild everything? | **No.** Reuse the MIT-licensed renderer/UI logic where separable, use a rights-cleared or specifically licensed asset set, preserve Tabyan’s account/backend contracts, and put provider observations behind canonical word identity and a small state layer. |

**Recommended path:** adopt `quran_library` code selectively, but do not use its uncertain Quran assets in a public prototype or release. Obtain exact written asset permissions or replace those assets as a coordinated, encoding-compatible set. Do not use the NPL Zipformer for any paid or ad-supported feature. Keep Nabr/QRC behind Tabyan’s existing provider boundary; enable it only after commercial/privacy terms, level semantics, canonical mapping, and real-device acceptance are resolved.

## Evidence boundaries and prior work

This report consolidates the project’s dated research rather than repeating the broad market scan:

- [Ready Smart Mushaf market scan](TABYAN_READY_SMART_MUSHAF_MARKET_SCAN.md) — package candidates, Quran Foundation comparison, provider and model rights.
- [Ready Smart Mushaf candidate matrix](TABYAN_READY_SMART_MUSHAF_CANDIDATE_MATRIX.md) — renderer/platform gaps and B+C pairings.
- [Rights-clear renderer selection](TABYAN_RIGHTS_CLEAR_MUSHAF_RENDERER_SELECTION.md) — strict cross-platform renderer gate; no candidate passed.
- [Authoritative rights review](TABYAN_SMART_MUSHAF_AUTHORITATIVE_RIGHTS.md) and [license matrix](TABYAN_SMART_MUSHAF_LICENSE_MATRIX.md) — asset-by-asset rights evidence and NPL-1.2 restriction.
- [Quran library asset acquisition dossier](TABYAN_QURAN_LIBRARY_RIGHTS_ACQUISITION_DOSSIER.md) — exact renderer resource paths, owners/leads, questions, and unsent requests.
- [Web-ready Mushaf correction](TABYAN_WEB_READY_MUSHAF_CORRECTION.md) and [replacement report](TABYAN_SMART_MUSHAF_REPLACEMENT_REPORT.md) — source map and rejected QCF v2 experiment status.
- The current Tabyan implementation was inspected in `artifacts/api-server/src/recitation-providers/` (especially `NabrQrcTransport.ts`, `NabrProviderAdapter.ts`, `NabrQrcSpeechProvider.ts`, `nabr-qrc-audio.ts`, `nabr-qrc-session.ts`, and `nabr-qrc-config.ts`).
- The captured upstream `quran_audio` implementation and current QRC guide were compared in `research/smart-mushaf/sources/`; the upstream review is pinned to `alheekmahlib/quran_audio` commit `41411a597b9d7613127220c911e8f2f642947c58`. Captured files are a 2026-10-15 public-source snapshot, not a fresh live-provider test.

The `quran_library` inventory is from repository commit `230b4b7218d1fc56e51e7f165830c15e9ce4efe2`, whose manifest declares 5.0.2. The published pub.dev package was reported as 5.0.1. No byte-for-byte published-archive comparison was done; do not assume the 5.0.2 source inventory is the 5.0.1 package inventory.

---

## Question 1 — Can Tabyan use the ready code?

“Yes” below applies to code under the named repository license only. It does not clear Quran data, fonts, audio, models, or trademarks.

| Repository | Code license | Can copy? | Can modify? | Can rebrand? | Can distribute? | Commercial use | Practical boundary and evidence |
|---|---|---:|---:|---:|---:|---|---|
| [`alheekmahlib/alquranalkareem`](https://github.com/alheekmahlib/alquranalkareem) | No recognized repository license/root `LICENSE` was found in the reviewed snapshot. | **NO**, absent separate permission. | **NO**, absent permission. | **NO**, absent permission for its code/assets/marks. | **NO**, absent permission. | **REQUIRES_PERMISSION** | Its README and dependency on `quran_library` do not grant rights to the parent application. Lack of a detected license is not proof that a private grant does not exist; none was found in this review. |
| [`alheekmahlib/quran_library`](https://github.com/alheekmahlib/quran_library) | MIT for code. | **YES** for covered code, retaining copyright and permission notice. | **YES** for covered code. | **YES** for the code/UI presentation, using Tabyan’s own brand and not implying Al-Heekmah endorsement. | **YES** for covered code, retaining the MIT notice. | **YES** for covered code. | The package `NOTICE` says the MIT grant does not cover QCF fonts or QUL/KFGQPC resources. Renderer assets and model terms are separate. Full package use is not cleared by the code license. |
| [`alheekmahlib/quran_audio`](https://github.com/alheekmahlib/quran_audio) | MIT for code. | **YES** for covered code, retaining notice. | **YES** for covered code. | **YES** for covered code and Tabyan UI; not for upstream marks/assets. | **YES** for covered code, retaining notice. | **YES** for covered code. | MIT does not license the external recitation recordings/URLs or prove QRC compatibility. The captured QRC client is not a ready replacement for Tabyan’s current transport. |
| [`obadx/quran-muaalem`](https://github.com/obadx/quran-muaalem) | MIT for repository code, per reviewed project evidence. | **YES** for covered code, retaining notice. | **YES** for covered code. | **YES** for covered code and Tabyan UI; no upstream brand transfer. | **YES** for covered code, retaining notice. | **YES** for covered code. | The model and dataset are separate. The reviewed model card does not establish a usable license/training-data chain, and the project is Python/server-oriented with a large model; do not infer model-use or redistribution rights from the code MIT license. |

**Answer:** The practical reusable code is `quran_library`, `quran_audio`, and potentially `quran-muaalem` code. The full `alquranalkareem` app is not a copyable ready stack on the evidence reviewed. No code license in this table grants a right to Quran assets or reciter recordings.

## Question 2 — What exactly is not covered by `quran_library` MIT?

`MIT` applies to the source code. The package `NOTICE` expressly separates QCF/QUL/KFGQPC resources. `SOURCE_NOT_IDENTIFIED` means the exact file-to-owner or license chain was not established; it does **not** mean that the resource is prohibited. `PERMISSION_NEEDED` means an identifiable source/rights lead exists, but the reviewed evidence does not grant the requested use.

Replacement-cost scale: **LOW** = ordinary metadata/art can be replaced without changing Quran page geometry; **MEDIUM** = a compatible mapping or supporting glyph set is needed; **HIGH** = coordinated data/font/layout/rendering work and validation. “Breaks 604-page layout” assesses the risk of replacement with a different resource, not a guaranteed outcome.

| PATH / resource | Exact upstream source / owner evidence | Required for rendering? | Rights | Exact missing permission | Replaceable? | Replacement cost | Would replacement break 604-page layout? |
|---|---|---|---|---|---|---|---|
| `assets/jsons/qpc-v4.json.gz` — QPC V4 word/glyph text records | Package README names KFGQPC for Quran text; QUL V4 glyph resource 47 is a possible match. Exact export, file identity, transformations, and licensor authority are unverified. | **YES** for the inspected QPC V4 page renderer. | `SOURCE_NOT_IDENTIFIED` | Written authority to reproduce, bundle, host/serve, cache, redistribute, use commercially if applicable, and map word IDs in Web/iOS/Android. Confirm attribution and any restrictions. | **YES**, only with rights-cleared text/glyph data compatible with page fonts and layout. | **HIGH** | **YES** if glyph IDs, word segmentation, or glyph metrics differ; **NO** only if the replacement is proven encoding- and layout-compatible. |
| `assets/jsons/qpc_v4_ayah_info.json.gz` — 604-page/line/word-range layout | QUL resource 19 documents a KFGQPC 1441H 604-page/15-line layout; exact package-file match, authorship, and license chain are not verified. | **YES** for the inspected QPC V4 page renderer. | `PERMISSION_NEEDED` | Permission to copy, bundle, display, redistribute, cache, and use the exact page/line/word-position compilation in Tabyan’s target platforms. Require the actual grantor and file hash. | **YES**, with a compatible, rights-cleared 604-page mapping. | **HIGH** | **YES** for a different page/line scheme; **UNKNOWN** until the substitute is mapped against all 604 pages. |
| `assets/fonts/quran_fonts_qfc4/QCF4001_COLOR-Regular.ttf.gz` … `QCF4604_COLOR-Regular.ttf.gz` — 604 page fonts | QUL resource 240 is a technical candidate; KFGQPC is the apparent upstream origin. The exact resource ID/release-to-file mapping and party authorized to license commercial bundling are unverified. | **YES** for this fixed-page QPC V4 glyph presentation. | `PERMISSION_NEEDED` | Written font embedding/bundling, redistribution, Web hosting, app-store distribution, caching, and any conversion or runtime palette/opacity transformation. Confirm permission for the exact 604 hashes and modification limits. | **YES**, but only as a complete compatible font/script/layout set. | **HIGH** | **YES** if replacement metrics, glyph order, or glyph IDs differ; preserve only with a proven matching set and 604-page visual/integrity verification. |
| `assets/jsons/qpc-hafs-word-by-word.json.gz` — Hafs word map | Exact creator/source and file-level license were not identified in the reviewed package pages; it may overlap but cannot be assumed identical to the QPC V4 text records. | **NO** for static page painting; **YES** for word-level identity/interaction paths that consume this mapping. | `SOURCE_NOT_IDENTIFIED` | Source/owner, copy and redistribution authority, word-ID semantics, and permission to associate IDs with an external provider’s positions. | **YES**, with a rights-cleared mapping that preserves canonical word identity. | **MEDIUM** | **NO** to static layout if the page dataset stays unchanged; **YES** to word-state/highlighting correctness if IDs or segmentation change. |
| `assets/jsons/surahs_name.json.gz` — surah names and metadata | README broadly names KFGQPC for metadata; exact field provenance and file-level grant were not mapped. | **NO** for page glyphs; **YES** for the package’s full surah/index UI. | `SOURCE_NOT_IDENTIFIED` | Permission/provenance for exact fields and downstream display/redistribution; determine whether fields are facts or a protected compilation under the applicable law. | **YES**, using compatible, rights-cleared metadata. | **LOW** | **NO** for page layout; may affect navigation/labels if field mapping differs. |
| `assets/jsons/quranV4.json.gz` — alternate Quran text/font-mode data | General package attribution points to KFGQPC; exact edition, transformations, and rights holder remain unknown. | **NO** for the inspected fixed QPC V4 page renderer; **YES** for the alternate `getQuranDataV3()`/downloaded-font mode. | `SOURCE_NOT_IDENTIFIED` | Exact source/edition and permission for reproduction, transformation, bundling, and distribution in the alternate reading path. | **YES**, by omitting that mode or replacing it with a compatible, cleared dataset. | **HIGH** if retaining alternate page/font mode; **LOW** if the mode is excluded. | **YES/UNKNOWN** if the alternate mode is retained with a different script or font; **NO** to QPC V4 pages if the mode is omitted. |
| `assets/jsons/quran_hafs.json.gz` — referenced by `QuranRepository.getQuran()`, absent from inspected `main` tree | The path is referenced but no file was present in the inspected tree; whether stale, supplied externally, or present only in another package release is unknown. | **UNKNOWN**; the observed QPC V4 page loader did not require it. | `SOURCE_NOT_IDENTIFIED` | Al-Heekmah must identify the release-specific file, hash, origin, runtime path, and grant—or confirm dead code. | **UNKNOWN** | **MEDIUM** until release path is explained. | **UNKNOWN**; not shown necessary for QPC V4 pages. |
| `assets/fonts/UthmanicHafs_V20.ttf` — Unicode Hafs font | QUL’s reviewed resource is V22, not this package’s V20 file; exact V20 origin and grant were not verified. | **NO** for the fixed QPC V4 page fonts; **YES** for modes using this Unicode Hafs font. | `SOURCE_NOT_IDENTIFIED` | Exact V20 file identity, owner, commercial embedding, modification, caching, and distribution permission. | **YES**, if the Unicode mode is omitted or uses a verified compatible licensed font. | **MEDIUM** | **NO** to QPC V4 page layout; may change shaping/line flow in Unicode text mode. |
| `assets/fonts/Uthmanic_NeoCOLORD-Regular.ttf` — ayah-number/alternate color font | Exact source/version/license of this binary was not identified. | **NO** for QPC V4 page glyphs; mode-dependent for verse markers/alternate reader views. | `SOURCE_NOT_IDENTIFIED` | Source, redistribution, commercial use, and any palette/conversion permission. | **YES** with a cleared marker/font or by omitting the dependent mode. | **LOW–MEDIUM** | **NO** to QPC V4 pages; may change the alternate mode’s marker appearance/metrics. |
| `assets/fonts/NotoNaskhArabic-VariableFont_wght.ttf` — Arabic text/UI font | Family name indicates Noto Naskh Arabic, whose upstream family uses OFL; the bundled binary’s exact version and notice were not matched. No Quran-resource grant is inferred. | **NO** for QPC V4 page glyphs; supporting/alternate text presentation only. | `PERMISSION_NEEDED` | Verify exact binary/version and retain the applicable OFL notices/conditions before redistribution. | **YES** | **LOW** | **NO** to fixed QPC V4 layout; may change ordinary text wrapping in other views. |
| `assets/fonts/surah-name-v4.ttf`, `assets/fonts/surah_name_naskh.ttf` — surah headings | QUL resource 457 is a candidate technical match for the V4 font; no authoritative owner/license for the Naskh file was established. | **NO** for the Quran page glyph body; **YES** for the package’s dedicated surah-heading presentation. | `SOURCE_NOT_IDENTIFIED` | File-to-resource hashes, owner/licensor, embedding and redistribution, commercial use, and glyph-map permission. | **YES**, if the package’s special header art is omitted or replaced with a cleared heading treatment. | **MEDIUM** | **NO** to page body geometry; **YES** to exact header presentation/ligature layout if mappings differ. |
| `assets/fonts/vertopal.com_QCF_Bismillah-Regular.ttf` — Basmala glyph font | Filename is not provenance. No original owner or license was identified. | **NO** for the QPC V4 page body if the chosen page font already renders it; **YES** for the dedicated Basmala widget/path. | `SOURCE_NOT_IDENTIFIED` | Original source/owner and explicit font embedding, redistribution, and use permission. | **YES**, if a cleared compatible Basmala resource or authorized page rendering is available. | **MEDIUM** | **NO** to ordinary page body if omitted; **YES** to exact Basmala line fidelity if glyph encoding differs. |
| `assets/svg/surahSvgBanner.svg`, `surahSvgBannerDark.svg`, `suraNum.svg` — decorative surah headers | Al-Heekmah packages them; exact designer/source/rights holder was not found. | **NO** for Quran text or QPC V4 page body; supporting package header UI only. | `SOURCE_NOT_IDENTIFIED` | Permission for copying, rebranding/adapting, and redistribution—or omit them. | **YES** | **LOW** | **NO** to 604-page Quran layout; only header styling changes. |
| `assets/svg/` and `assets/images/` directory assets not individually mapped to the QPC V4 reader | The package manifest includes broad asset directories; not every file was proven necessary to the QPC V4 page path or traced to an owner. | **NO** for the inspected QPC V4 page body; **CONDITIONAL** for package-wide controls/examples/branding. | `SOURCE_NOT_IDENTIFIED` | Release-specific used-asset manifest, hashes, source/license, and permission for any file included in Tabyan. | **YES** for unused assets; replace or omit used ones individually. | **LOW–MEDIUM** | **NO** to page geometry unless a selected file is actually a renderer input; that association must be confirmed. |
| `assets/fonts/Cairo-*.ttf`, `Kufam-Regular.ttf`, and other general Arabic UI fonts | Cairo/Kufam upstream families indicate OFL, but package binaries were not hash-matched; package manifest also declares UI fonts. | **NO** for QPC V4 page glyphs; supporting application typography. | `PERMISSION_NEEDED` | Confirm the exact font binaries and notices/conditions before distribution; do not rely only on family names. | **YES** | **LOW** | **NO** to the page grid; interface text wrapping can change. |
| Quran-Lab Zipformer model/work and model-download artifacts (optional Tasmee runtime) | The package includes NPL-1.2 terms and a model service that retrieves model resources; the license defines the Work to include model weights and related artifacts. | **NO** for rendering; **YES** for the package’s default local Zipformer recognition path. | `EXPLICITLY_BLOCKED` for charging for the model or a feature it powers under the reviewed NPL-1.2; otherwise conditional on that license. | Do not monetize a feature powered by this Work under the reviewed text. Any alternate commercial grant must be authoritative; otherwise replace/disable the model path. Review share-alike/hosting conditions too. | **YES**: omit it and use a separately cleared provider/model. | **MEDIUM–HIGH** | **NO** to the 604-page printed layout; it blocks/changes Tasmee behavior, not page rendering. |
| Quran phoneme/reference artifacts used by Tasmee (`quran_units`, aligner, reference-store inputs) | Code/source references were reviewed; the exact provenance and per-file license boundary of every runtime reference artifact were not mapped. Some may be included in or derived from the NPL Work. | **NO** for rendering; **CONDITIONAL** for built-in phoneme/Tasmee feedback. | `SOURCE_NOT_IDENTIFIED` | File-by-file source/hash and license, including whether each artifact is part of the NPL Work and what share-alike/redistribution terms apply. | **YES**, with a separately cleared reference/phoneme set or by disabling the feature. | **HIGH** | **NO** to page layout; may change or remove phoneme feedback. |

**Inventory caveat:** This is the complete list of identified Quran-script, QPC V4 renderer, alternate Quran-font, decorative, and Tasmee runtime resource groups in the inspected sources—not a signed manifest for the entire published 5.0.1 archive. The package’s broad asset-directory declarations and the 5.0.1/5.0.2 version difference mean a final release audit still requires Al-Heekmah’s exact manifest and hashes. No unlisted package asset is implicitly cleared.

### Asset replacement answer

Technically, yes, the uncertain text/fonts/layout can be replaced, but **not as a clean file-only swap today**. The pinned source uses a concrete QPC V4 renderer and package-local assets. Tasmee word state is coupled to `QpcV4WordSegment` identifiers and `QuranCtrl`/`AyahModel`; no generic renderer plug-in contract was found.

Integration points that would have to be kept compatible or adapted:

1. The JSON repository/loaders for Quran word/glyph records, page/line data, and word positions.
2. `lib/src/quran/data/qpc_v4/qpc_v4_page_renderer.dart` and the page-font service/path construction.
3. The page-view and navigation flow (`quran_pages_screen.dart`, `page_view_build.dart`, and `jumping_between_pages_widget.dart`).
4. The word-span/state layer (`custom_span.dart`, `rich_text_build.dart`, word tap/long-press recognizer, and `QpcV4WordSegment`).
5. Tasmee controller/state/UI references to the package’s page/word models.

If a replacement preserves the exact 604-page layout, script encoding, glyph IDs, word segmentation, and coordinates, the page geometry can remain. That equivalence has not been demonstrated for any rights-cleared replacement. If a different text/font/layout is introduced, expect high-cost adaptation and Quran-integrity checks across all 604 pages; do not claim page fidelity until it passes. Quran Foundation’s permitted content path is a rights-oriented building-block lead, not a proven drop-in replacement for this QPC V4 Mushaf.

## Question 3 — Is there actually a prohibition?

**No explicit prohibition was found in the reviewed evidence against Tabyan using the `quran_library` MIT renderer code or the named Quran text, QCF/QPC fonts, page layout, and word maps in a branded Quran-learning app.** The review instead found that the exact asset grants and file provenance have not been established. That is **not clear**, not **prohibited**.

The explicit prohibition found is narrower:

> Quran-Lab NPL-1.2 prohibits charging for the Work, access to the Work, or a feature that relies on the Work; the reviewed text also addresses advertising revenue and share-alike obligations.

This applies to the Zipformer model-powered feature under the reviewed license. It is not a prohibition on the separate MIT renderer code or proof that KFGQPC/QUL prohibit the Quran resources. `alquranalkareem`’s missing license also means **no grant found**, not an explicit prohibition.

**Finding:** `NO_EXPLICIT_PROHIBITION_FOUND` for use of the identified Quran content/font/layout resources or renderer code in a Tabyan-branded learning app; **permission remains unproven and is still a release blocker**. `EXPLICITLY_BLOCKED` applies to monetizing the NPL-covered model feature under the terms reviewed.

## Question 4 — Can we prototype safely at each stage?

These statuses answer whether the **current bundled Quran renderer resources** are cleared for that stage. MIT code-only use is separately clear. `NOT_CLEAR` means no affirmative permission was found; it does not assert a legal ban.

| Stage | Current `quran_library` assets | Decision and practical boundary |
|---|---|---|
| A. Internal / development use | **NOT_CLEAR** | No resource-specific grant for local copies or use was verified. MIT permits code-only work. Use synthetic positions/fixtures or a separately cleared resource set; do not run or bundle the current Quran assets merely because the repository is public. |
| B. Public Web preview | **NOT_CLEAR** | A public preview serves the files to visitors and is not made private by calling it a prototype. Do not publish the current resource set without permission. |
| C. Production Web | **REQUIRES_PERMISSION** | Obtain the exact rights for display, hosting/CDN, caching, redistribution, commercial status if applicable, attribution, and updates. |
| D. TestFlight | **REQUIRES_PERMISSION** | TestFlight distribution still copies/distributes app assets to external testers. Obtain permission covering iOS package distribution and caching. |
| E. App Store | **REQUIRES_PERMISSION** | Obtain explicit iOS app-store bundling and end-user distribution rights for every included resource. |
| F. Google Play | **REQUIRES_PERMISSION** | Obtain explicit Android package and end-user distribution rights for every included resource. |

None of these Quran-resource stages is marked `PROHIBITED` on the reviewed evidence. The NPL Zipformer restriction is an independent blocker for monetized recognition features. Code-only development and synthetic UI tests are possible under the code licenses; they do not prove a real-Quran prototype is cleared.

## Question 5 — Can we use code now and delay resource clearance?

**FEASIBLE: YES — at the code/architecture level, not as a runnable real-Quran reader using the current resource bundle.**

| Module | Reuse now? | Boundary |
|---|---|---|
| `quran_library` MIT reader/navigation/Tasmee source code | **YES, selectively** | Preserve MIT notices. Do not include or execute the unclear asset bundle as an accidental dependency. Package compilation/runtime may require isolating resource-dependent code. |
| Reader UI structure, navigation logic, word interaction logic, Tasmee state/UI source | **YES, conditionally** | Keep only code covered by MIT; trace any source/data/model dependency. The actual word-state component currently consumes QPC V4-specific segments. |
| Quran text, page maps, word maps, fonts, header assets | **NO, not yet** | Require exact permission or replace with a rights-cleared, encoding-compatible set. Code reuse does not carry these rights. |
| Zipformer model-powered Tasmee | **NO for a paid/ad-supported feature under the reviewed NPL terms** | Keep disabled/omit unless an authoritative compatible grant is obtained; otherwise use a separately cleared provider/model. |
| Tabyan provider interface and existing account/session/backend contracts | **YES** | Keep provider-independent. QRC observations must pass canonical resolution and the existing confirmation/stabilization boundary before affecting learner state. |
| Synthetic provider fixtures | **YES** | Useful for local interface/state tests only; they are not real Quran data or live-recitation acceptance. |

This route lets Tabyan reuse code and preserve its backend/provider architecture while clearance is delayed. It does **not** produce the requested real-page prototype until the renderer has a rights-cleared text/font/layout set. The current `quran_library` package is not a ready “code only, no assets” dependency without an isolation/adaptation step.

## Question 6 — Can we replace only the unclear assets?

**FEASIBLE: YES, but not cleanly as a drop-in package configuration.** The renderer implementation and Tasmee state are QPC V4-shaped rather than renderer-neutral.

| Replacement scope | Engineering assessment |
|---|---|
| Replace only the 604 QCF4 fonts while retaining current QPC V4 JSON/layout | Possible only if the substitute font set uses the same glyph IDs, metrics, color tables, and script encoding. No compatible cleared set has been verified. Otherwise pages can render with missing/wrong glyphs or changed line geometry. |
| Replace Quran text/glyph JSON | Requires preserving exact Quran content, order, word segmentation, and renderer glyph IDs. A different orthography/encoding may require new word segments and renderer mappings. |
| Replace page/line layout JSON | Requires a complete compatible 604-page/line dataset. A different edition/layout cannot be assumed to preserve QPC page appearance. |
| Replace word-by-word mapping | Can be isolated if it maps back to the same canonical `(surah, ayah, word)` identity; otherwise word highlights, skip/repeat evidence, and hide/reveal can target the wrong word. |
| Replace all critical assets as a coordinated set | Most defensible route if rights cannot be obtained. It requires an adapter, UI/state rewiring, and 604-page Quran-integrity/visual acceptance. |

**Answer:** Do not plan a filename swap. First get the exact manifest/hashes and permission chain. If the owner elects asset replacement, treat text, page layout, fonts, and word mapping as one versioned renderer-data set and validate it together. The 604-page layout survives only if the replacement is proved compatible; otherwise page fidelity is a reimplementation/adaptation problem.

## Question 7 — Tarteel-quality technical gap

Assumption: rights are cleared for the selected assets and providers. Scores are **engineering-fit estimates from documented features**, not measured benchmarks or a claim of parity with Tarteel. The ready stack has not been integrated or tested on real phones; the Web Tasmee path is specifically limited in the inspected package.

| Capability | Score / 10 | Gap to Tarteel-quality product |
|---|---:|---|
| MUSHAF_RENDERING | **8** | Strongest part of the candidate: complete QPC V4 page/word rendering and navigation are documented. Still needs Tabyan integration, asset identity/rights, Quran-integrity proof, and acceptance across 604 pages. |
| MOBILE_SMOOTHNESS | **6** | Flutter support is declared, but no Tabyan integration or real iPhone/Android performance, memory, font-load, or long-session test was completed. |
| WORD_TRACKING | **7** | Renderer word identity/interactions exist. Provider position-to-renderer alignment, canonical identity, and stabilized live state are not proven end-to-end. |
| HIDE_REVEAL | **7** | Built-in Tasmee/state hooks exist in source, but the ready candidate has not exercised progressive reveal with the complete Quran renderer or tested accessibility and edge cases. |
| MEMORIZATION_MODE | **7** | A Tasmee UI/state-machine foundation is available. Assignment/teacher policy, learner progress semantics, and integration with Tabyan’s educational contracts remain to be wired and tested. |
| LIVE_RECITATION | **6** | The package’s local Zipformer path is model/rights constrained and unavailable in Web per inspected sources. Nabr is structured feedback, not a transcript stream; real gateway operation is unverified. |
| PRONUNCIATION_FEEDBACK | **5** | QRC exposes `letter_mistakes` and Quran Muaalem advertises phoneme/sifat output, but interpretation, letter-index base, error calibration, and student-level accuracy are not validated. |
| TAJWEED_FEEDBACK | **6** | QRC documents Tajweed mistakes and quran_library has its own recognition path, but severity/level semantics and accuracy across reciters are unproven. |
| TEACHER_MODE | **2** | No complete teacher assignment/review workflow is supplied by the selected renderer stack; Tabyan already has teacher product paths, but their connection to a new Mushaf/Tasmee flow is not part of the ready package. |
| OFFLINE_CAPABILITY | **6** | Bundled page data and local recognition suggest offline potential, but external Nabr is online-only; offline model terms, model availability, cache lifecycle, and actual device performance are unresolved. |
| NABR_INTEGRATION | **6** | Tabyan has a substantial server-side adapter/transport and safe observation boundary. No real provider session has proved session startup, audio acceptance, returned timing, canonical mapping, or production terms. |
| WEB | **5** | The renderer package declares Web support, but its built-in browser microphone/Zipformer Tasmee path is disabled. A real Web reading experience is possible; live recitation needs a different validated provider path. |
| IOS | **7** | Package target is declared and an iOS distribution path is plausible, but no real iPhone candidate, TestFlight rights, audio routing, performance, or app-store validation exists. |
| ANDROID | **7** | Package target is declared, but no real Android acceptance, audio/camera lifecycle proof, performance, or store distribution test exists. |

No score asserts that Tabyan currently has the scored feature in production. The highest-confidence reuse is the page-reader code; the largest gaps are provider-to-word evidence, real-device performance, teacher workflow, and validated pronunciation/Tajweed feedback.

## Question 8 — Provider strategy

Scores are **relative engineering fit, 0–10, higher is better**. “Cost” means affordability/predictability for Tabyan, not a quoted price. “Integration complexity” is scored as ease (10 = easiest). Accuracy and latency are evidence-confidence-aware estimates, not benchmark results. The reviewed provider/model comparisons did not include a live Nabr call or run/download a model.

| Strategy | Accuracy | Latency | Offline | Cost | Integration ease | Tajweed depth | Word tracking | Letter/phoneme feedback |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A. Local Zipformer only | 5 | 5 | 9 | 2 | 6 | 5 | 6 | 6 |
| B. Nabr/QRC only | 6 | 7 | 0 | 3 | 7 | 7 | 7 | 6 |
| C. Hybrid local Zipformer + Nabr/QRC | 6 | 5 | 8 | 2 | 3 | 7 | 7 | 7 |
| D. Quran Muaalem + renderer | 5 | 3 | 2 | 2 | 2 | 8 | 5 | 8 |
| E. Nabr + Quran Muaalem | 6 | 4 | 1 | 2 | 2 | 8 | 7 | 8 |

**Interpretation**

- **A — Local Zipformer:** on-device/offline capability is attractive, but Tabyan has no accepted model benchmark and the reviewed NPL-1.2 blocks charging for the model-powered feature; do not select it for monetized Tasmee.
- **B — Nabr/QRC:** best initial live-recitation default because it is purpose-built for Quran assessment and the current Tabyan backend already has a protocol adapter. The guide describes first feedback after roughly three seconds and later results about every 500 ms; that is vendor documentation, not Tabyan latency evidence. It requires subscription/commercial/privacy terms and real audio acceptance.
- **C — Hybrid:** could offer online richness plus offline mode, but model restrictions, duplicate feedback reconciliation, privacy, latency, cost, and state arbitration are not justified before either provider is accepted alone.
- **D — Quran Muaalem:** promising phoneme/sifat reference engine, but the reviewed project is batch/Python/server-oriented, model is large, and model/dataset rights and production serving are unclear. It is not a ready mobile/Web live provider.
- **E — Nabr + Quran Muaalem:** potentially broad feedback, but no evidence validates combined accuracy or conflict resolution. It compounds commercial, infrastructure, privacy, and integration unknowns.

**Recommended default architecture:** **B, Nabr/QRC only as the first live provider**, behind Tabyan’s existing provider abstraction, with the live switch still disabled until the separate commercial/privacy and acceptance gates pass. Keep the interface provider-neutral so a separately licensed local engine can be added later. Do not combine model claims or QRC observations into learner progress without canonical mapping and confirmation.

## Question 9 — Is `quran_audio` a ready Nabr integration?

The answer is **NO**. The package is useful as a code/protocol-history reference and as a distinct Quran-audio playback package, but its captured QRC path is not the current documented QRC contract and should not replace Tabyan’s current server-side transport.

| QRC responsibility | `quran_audio` status | Comparison with current Tabyan implementation |
|---|---|---|
| Microphone format | **USE_AS_REFERENCE** | Its captured session source records WAV/PCM16 at 16 kHz and its history contains conflicting Opus/WAV assumptions. Tabyan accepts the existing gateway’s mono 24 kHz PCM16 and converts it to complete 16 kHz mono WAV frames. Unit fixtures validate framing; live provider acceptance is still unverified. |
| WebSocket connection | **INCOMPLETE** | The captured `QrcClient` opens a WebSocket, but parses text JSON and sends JSON controls. Current QRC docs specify binary MessagePack request/response envelopes. Tabyan’s transport uses `@msgpack/msgpack` and rejects non-binary responses. |
| Authentication | **USE_AS_REFERENCE** | QRC documents an API key in the WebSocket URL. `quran_audio` initializes with a client-visible key; Tabyan reads the credential server-side only when explicitly enabled and keeps the URL out of logs. Do not move the secret into a Web/mobile client. |
| Session start | **INCOMPLETE** | Package code has a start payload, but its captured method spelling/schema history is inconsistent with the current guide. Tabyan emits the documented uppercase `START_TILAWA_SESSION` payload only after server-owned session coordinates and levels pass validation. |
| QRC configuration | **USE_AS_REFERENCE** | Both carry chapter/verse/word and Hafz/Tajweed level fields. The package’s captured config documents Tajweed 1–3; current QRC docs specify 1–5. Current semantics of the levels remain unknown, so Tabyan’s explicit levels are not yet approved as product policy. |
| Feedback stream | **INCOMPLETE** | `quran_audio` exposes a stream, but its captured feedback model parses JSON and treats `correct_words`/`skipped_words` as strings. Current QRC docs show binary MessagePack and arrays of coordinate objects, plus `letter_mistakes`. Tabyan emits normalized provider observations, not a direct learner grade. |
| Message parsing | **INCOMPLETE** | Package parser uses `jsonDecode` on text frames. Current guide and Tabyan transport use MessagePack binary frames. |
| Close lifecycle | **INCOMPLETE** | Captured package session sends `EndTilawaSession`/older spelling variants. Current QRC guide says `RESET_TILAWA_SESSION` flushes and ends the session. Tabyan sends a bounded reset and handles acknowledgement/timeout without reconnecting automatically. |
| Disconnect handling | **INCOMPLETE** | Package has basic stream logging/error state but the captured sources do not prove the robust lifecycle needed for Tabyan’s authenticated gateway. Tabyan has connection/start/heartbeat/stop timeouts, explicit close attribution, and no automatic retry; live failure behavior remains untested. |
| Result normalization | **INCOMPLETE** | Package exposes permissive raw/typed feedback rather than Tabyan’s canonical, observation-only contract. Tabyan’s `NabrProviderAdapter` validates coordinates and preserves correct/skip/mistake values as provider claims; it does not convert them into confirmed learner state. |

**Current Tabyan status:** code exists for MessagePack transport, 24 kHz→16 kHz mono WAV chunking, session start derived from authenticated server-owned context, QRC observation normalization, and bounded lifecycle. Tests use local fixtures/fake sockets. There has been **no** live Nabr call, audio upload, real-reciter validation, or provider-commercial approval.

## Question 10 — What should Tabyan actually build?

Recommended architecture:

```text
TABYAN
|
+-- READY MUSHAF CORE
|   +-- quran_library MIT reader/navigation/Tasmee source, selectively reused
|   +-- exact Quran data/layout/fonts: written clearance OR coordinated rights-cleared replacement
|
+-- CANONICAL QURAN WORD IDENTITY
|   +-- stable (surah, ayah, word) identity
|   +-- explicit adapter from renderer word segments and provider coordinates
|
+-- SMART WORD-STATE LAYER
|   +-- hide/reveal and current/candidate/confirmed/incorrect visual states
|   +-- provider claims stay observations until alignment and stabilization confirm them
|
+-- RECITATION PROVIDER
|   +-- Nabr/QRC as the initial provider after terms and real acceptance
|   +-- provider-neutral Tabyan interface; no NPL Zipformer monetized feature
|
+-- TABYAN BRANDING
|   +-- Tabyan UI/chrome only; no copied Al-Heekmah app identity or implied endorsement
|
+-- EXISTING TABYAN AUTH / BACKEND
    +-- retain account isolation, assignment authority, and general/educational contracts
```

| Part | Action | Reason |
|---|---|---|
| `quran_library` renderer/navigation/Tasmee code | **REUSE** selectively | MIT code is reusable; it is the closest documented complete page/word/Tasmee foundation. Package runtime assets remain separate. |
| Quran text, page layout, QPC/QCF fonts, word maps | **REPLACE** or **obtain written permission** | No exact cross-platform redistribution grant was verified. Replace as a coordinated set if permission is not obtained. |
| Tasmee presentation/state logic | **ADAPT** | Reuse code where independent; remap state to canonical word IDs and Tabyan’s educational/general session semantics. |
| Canonical word identity | **BUILD_SMALL** | Define and test a stable identity adapter; do not equate QPC V4 IDs, QCF v2 glyph IDs, and QRC coordinates without a validated mapping. |
| QRC/provider bridge | **REUSE** the existing Tabyan server-side boundary, then **ADAPT** | Current transport is structurally aligned to the current docs, but no real service acceptance/contract exists. Keep observations from directly becoming grades. |
| Tabyan branding | **ADAPT** | Apply Tabyan branding to its own wrapper and controls; preserve upstream code notices and do not ship upstream marks without rights. |
| Existing Tabyan auth/backend | **REUSE** | Retain the existing session authority, account isolation, and assignment controls. No authentication change is needed for a report-only decision. |
| `alquranalkareem` parent app | **DO_NOT_USE** as copied app | No repository license grant was found. Use it as a behavior reference only unless separate permission is obtained. |
| `quran_audio` QRC implementation | **DO_NOT_USE** as the live QRC client | Captured protocol/parsing conflicts with current QRC documentation. Its playback functionality is separate and can be evaluated independently. |
| Quran-Lab Zipformer | **DO_NOT_USE** for paid/ad-supported feature under reviewed NPL-1.2 | Explicit commercial restriction; a cleared replacement or authoritative compatible grant is required. |
| Quran Muaalem model/dataset | **DO_NOT_USE** in production now | Model/dataset rights and operational readiness are unproven; keep only as a technical reference pending separate clearance. |

## Question 11 — What survives from the old Tabyan Mushaf?

These labels describe **reuse in the new Smart Mushaf**, not permission to delete or alter the current product. The current reader and routes remain unchanged; the old experiment remains rejected and unpromoted.

| Old component | Classification | Decision |
|---|---|---|
| Old renderer | **ARCHIVE_ONLY** | Do not patch it as the path to Tarteel-like behavior. Keep current source/route intact until an accepted replacement and cutover decision exist. |
| Old QCF v2 page rendering | **ARCHIVE_ONLY** | Do not use it as the new renderer, a fallback, a fixture-derived substitute, or a manual recreation. |
| Old QCF v2 word/glyph mapping | **ARCHIVE_ONLY** | Do not carry over renderer-specific glyph/segment IDs. A renderer-neutral canonical `(surah, ayah, word)` contract may be retained only if independently validated. |
| Old recitation UI | **ARCHIVE_ONLY** | Do not manually reproduce it as the new Smart Mushaf. Prefer the ready Tasmee UI/state source after rights and integration gates. |
| Old matcher | **KEEP_IF_RENDERER_INDEPENDENT** | Reuse only its provider-neutral matching contracts and verified canonical position handling; remove any dependency on old QCF v2 glyph/word order. |
| Old provider abstraction | **KEEP_IF_RENDERER_INDEPENDENT** | Preserve the existing backend/provider boundary. Nabr/QRC must remain a provider implementation behind it, not a renderer-specific state authority. |
| Old backend contracts | **KEEP_IF_RENDERER_INDEPENDENT** | Preserve account isolation, assignment ownership, and GENERAL vs EDUCATIONAL session rules. Do not derive educational completion from a local Mushaf display range. |

## Question 12 — Fastest real Web prototype

**A real-Quran prototype is not ready to show immediately.** The requested prototype must use actual Quran pages, actual word identity, and real renderer hide/reveal; the current QPC V4 resources are not cleared even for a public preview. A synthetic shell can test navigation/state wiring but would not satisfy the stated acceptance requirement and must not be presented as the real prototype.

### Files/modules likely involved after the rights gate

**Renderer candidate (Flutter Web source, not yet integrated):**

- `lib/src/pages/quran_library_screen.dart`
- `lib/src/pages/quran_pages_screen.dart`
- `lib/src/quran/data/qpc_v4/qpc_v4_page_renderer.dart`
- `lib/src/quran/presentation/widgets/page_view_build.dart`
- `lib/src/quran/presentation/widgets/jumping_between_pages_widget.dart`
- `lib/src/quran/presentation/widgets/download_fonts_page/custom_span.dart`
- `lib/src/quran/presentation/widgets/download_fonts_page/rich_text_build.dart`
- `lib/src/quran/presentation/widgets/word_info/tap_long_press_recognizer.dart`
- `lib/src/tasmee/presentation/widgets/tasmee_control_widget.dart`
- `lib/src/tasmee/controller/tasmee_ctrl.dart` and `tasmee_state.dart`
- Relevant JSON repository and font service/loaders, subject to the exact release manifest.

**Tabyan integration boundaries:**

- `artifacts/api-server/src/recitation-providers/NabrQrcTransport.ts`
- `artifacts/api-server/src/recitation-providers/NabrProviderAdapter.ts`
- `artifacts/api-server/src/recitation-providers/NabrQrcSpeechProvider.ts`
- `artifacts/api-server/src/recitation-providers/nabr-qrc-audio.ts`
- `artifacts/api-server/src/recitation-providers/nabr-qrc-session.ts`
- The shared canonical Quran-position and normalized recitation-event contract; exact UI integration must remain behind the selected renderer adapter.

The current Tabyan Web artifact is React/Vite while `quran_library` is Flutter. An isolated Flutter Web build/route or an explicitly designed bridge is needed; importing the Flutter renderer as if it were a React component is not a valid integration assumption. Do not build that bridge in this report-only phase.

### Main blockers

1. Exact, release-specific asset manifest and hashes for the package version selected (5.0.1 archive vs. 5.0.2 repository commit).
2. Written rights for each included text, layout, font, word map, and supporting asset—or a coordinated cleared replacement.
3. NPL-1.2 restriction on monetized Zipformer-powered features; use a cleared provider/model instead.
4. A renderer/data adapter preserving canonical word identity across Quran pages, QRC coordinates, and Tabyan’s word-state layer.
5. Flutter Web-to-current-Tabyan-Web integration approach and Quran-integrity verification.
6. Real Web and physical iPhone/Android tests. None were completed for a new ready-stack candidate.
7. For live Nabr: commercial/privacy terms, retention/region/subprocessor answers, documented level semantics, and a real session test. No live call is authorized by this report.

### What can be shown immediately

- A code-only architecture/protocol walkthrough and local synthetic-event tests using the already-existing Tabyan interfaces.
- No real Quran pages or bundled uncertain fonts/data in a public preview.
- No live provider result, learner grade, or Tarteel-quality claim.

**Result:** `REAL_WEB_PROTOTYPE_NOW = BLOCKED` if “real” requires actual Quran pages and word assets. Once the owner obtains written internal/public preview rights or selects a fully rights-cleared equivalent, the existing source map and Tabyan provider boundary support a focused Web-first candidate without patching the old Mushaf.

## Final rights decision matrix

“Technically usable” does not imply “rights clear.” `RIGHTS CLEAR` refers to the exact intended Tabyan use, not merely a repository’s code license.

| Component | Technically usable | Rights clear | Replaceable | Final action |
|---|---|---|---|---|
| `quran_library` code | **YES** | **YES — MIT code only** | N/A | Reuse selectively; retain MIT notice. |
| Quran text | **YES** in current renderer | **NO / permission unverified** | **YES**, but canonical spelling and glyph mapping must be preserved | Obtain exact grant or use a cleared compatible dataset. |
| QPC/QCF fonts | **YES** in current page renderer | **NO / permission unverified** | **YES**, only as compatible font/script set | Obtain exact grant or replace as a complete compatible set; verify 604 pages. |
| Page/layout data | **YES** | **NO / permission unverified** | **YES**, but not drop-in | Obtain exact grant or replace and adapt page/line renderer. |
| Word mapping | **YES** | **NO / source/grant unverified** | **YES** if canonical identity is retained | Map to canonical `(surah, ayah, word)`; test every interaction. |
| Tasmee UI/state code | **YES** | **YES for MIT code only** | **YES** | Reuse/adapt, tracing all assets/model dependencies. |
| Zipformer integration/model | **YES technically** | **NO for paid/ad-supported feature under reviewed NPL-1.2** | **YES** | Do not use for monetized Tasmee; select a separately cleared provider/model. |
| Quran-Lab model/data artifacts | **YES technically** | **NO for charging/features powered; other uses conditional on NPL** | **YES** | Omit/replace unless authoritative compatible terms are obtained. |
| `quran_audio` playback code | **YES** | **YES — MIT code only** | N/A | Optional playback reference; separately clear each audio source/recording. |
| `quran_audio` QRC client | **NO as a ready current client** | **MIT code only; protocol correctness is separate** | **YES** | Do not adopt its captured QRC transport/parser; use Tabyan’s server adapter after validation. |
| Nabr/QRC | **YES as documented provider/API candidate; Tabyan adapter exists** | **NO for Tabyan commercial/privacy approval yet** | **YES** via provider interface | Keep disabled until agreement, policy semantics, and real acceptance. |
| Quran Muaalem code | **YES as Python reference/engine code** | **YES for MIT code only** | **YES** | Reference only; do not run or ship model/dataset until rights and serving feasibility are established. |
| Quran Muaalem model/dataset | **NOT READY** | **NO / not established** | **YES** by selecting another engine | Exclude from production now. |
| `alquranalkareem` parent app | **Technically usable as reference** | **NO license grant found** | N/A | Do not copy or ship without separate permission. |
| Quran Foundation content path | **YES as a building-block path** | **CONDITIONAL under its own terms** | N/A | Evaluate only as its own content/rendering route; it does not clear QUL/KFGQPC assets or make a ready Smart Mushaf. |

## Exact blockers and owner decisions

1. **Asset rights and provenance:** ask Al-Heekmah for the exact version/archive manifest and hashes, source edition/export, and per-file rights chain. Ask QUL/KFGQPC only for resources they confirm they can license. The existing Arabic/English request drafts remain unsent.
2. **Commercial status:** the Tabyan owner must declare `COMMERCIAL_STATUS`; this report does not decide it.
3. **Model:** disable/replace the NPL Zipformer path for a monetized feature. Do not silently assume “free to download” permits paid app functionality.
4. **Renderer strategy:** choose written clearance for the existing exact asset set or approve a coordinated asset replacement route. A font-only replacement is insufficient if text/layout/word IDs are incompatible.
5. **Provider:** keep current Nabr adapter disabled until contractual/privacy terms and real acceptance are separately approved. Keep QRC positions/mistake claims as observations until the canonical mapping/stabilization policy confirms them.
6. **Prototype:** no real Quran Web preview until the selected asset set has permission covering that preview stage.

## Strict safety record

```text
APP_CODE_CHANGES: 0
OLD_MUSHAF_CHANGES: 0
AUTH: NO
NABR_LIVE_CALLS: 0
MODEL_DOWNLOADS: 0
QURAN_ASSET_DOWNLOADS: 0
DB_MUTATIONS: 0
DEPLOYMENT: NO
PURCHASES: 0
VENDOR_CONTACT: 0
```

## Final verdicts

### Final legal/rights verdict — choose one

`READY_STACK_USABLE_IF_SPECIFIC_ASSETS_REPLACED`

The MIT code can be reused. For the ready stack to move forward without assuming permission, the exact unverified renderer resources must be replaced with a rights-cleared compatible set. If the rights holders instead provide exact written grants, the specific rows may be re-evaluated; this verdict does not say the current resources are prohibited.

### Final technical verdict — choose one

`ADOPT_QURAN_LIBRARY_CODE_REPLACE_RENDERER_ASSETS`

Reuse the code foundation, replace or explicitly clear the resource layer, adapt the renderer/word-state boundary, and use Tabyan’s existing server-side provider abstraction. This is not a drop-in asset swap and is not implemented.

### Final product verdict

**“Can Tabyan realistically reach a Tarteel-like Mushaf without rebuilding everything from scratch?”**

**YES.**

1. Reuse `quran_library`’s MIT reader/navigation/Tasmee code where it is separable.
2. Replace or clear exact Quran assets as one compatible data/font/layout set.
3. Keep Tabyan auth, backend, teacher product, and provider boundary.
4. Add a small canonical word-identity and visual-state adapter.
5. Use Nabr/QRC only after written service/privacy terms and live acceptance.
6. Do not use the NPL Zipformer for a paid/ad-supported feature.
7. Do not copy the unlicensed parent app or resume the rejected QCF v2 experiment.
8. The direction is feasible; a real-Quran Web prototype is **not cleared to show today**.
