# TABYAN — Smart Mushaf Authoritative Rights Review

**Review date:** 2026-10-15  
**Scope:** Rights investigation only. No application, authentication, database, provider, model, or deployment changes.  
**Candidate:** `alheekmahlib/quran_library`, source commit [`230b4b7218d1fc56e51e7f165830c15e9ce4efe2`](https://github.com/alheekmahlib/quran_library/tree/230b4b7218d1fc56e51e7f165830c15e9ce4efe2).  
**Result:** `READY_RENDERER_RIGHTS_UNKNOWN`

## Decision

The package's code is MIT-licensed. That does not clear the Quran text, word/glyph data, page layout, QPC/QCF fonts, or the separately bundled header and basmala fonts.

QUL's official resource pages provide technical descriptions and say resources are intended to be downloaded and packaged with projects. QUL's FAQ also directs users to each repository's and dataset's own license. No resource-specific grant was found that establishes the exact bundled files' commercial use, modification/conversion, redistribution, attribution, or app-store terms. The exact correspondence between the package's files and the QUL records is not verified by a manifest or digest. KFGQPC's official rights pages could not be fetched.

Therefore no critical renderer resource is marked `CLEAR`. This is **not** a finding that use is prohibited; it is a finding that authoritative, resource-specific rights evidence is incomplete. Do not bundle or ship the ready renderer on the strength of its MIT code license, a public download, or a secondary source.

## Source and resource boundary

The source inventory follows the pinned Git commit, not a mutable branch. Its `pubspec.yaml` declares version `5.0.2`; the separately published `pub.dev` archive is not assumed byte-identical to that Git tree. The repository's [`LICENSE`](https://raw.githubusercontent.com/alheekmahlib/quran_library/230b4b7218d1fc56e51e7f165830c15e9ce4efe2/LICENSE) applies to the code. Its [`NOTICE`](https://raw.githubusercontent.com/alheekmahlib/quran_library/230b4b7218d1fc56e51e7f165830c15e9ce4/NOTICE) expressly excludes QCF fonts and QUL/KFGQPC resources from that grant.

The pinned source uses the QPC V4 renderer and bundled resources, including:

- `assets/jsons/qpc-v4.json.gz` — QPC V4 word/glyph script data.
- `assets/jsons/qpc_v4_ayah_info.json.gz` — ayah/page/line/word-position information used by the V4 path.
- `assets/jsons/qpc-hafs-word-by-word.json.gz` — companion Hafs word-by-word data.
- `assets/fonts/quran_fonts_qfc4/QCF4###_COLOR-Regular.ttf.gz` — page-specific QCF4 font files; the font service constructs this local asset path by page number.
- `assets/fonts/surah-name-v4.ttf`, `assets/fonts/surah_name_naskh.ttf`, `assets/fonts/vertopal.com_QCF_Bismillah-Regular.ttf`, and `assets/fonts/Uthmanic_NeoCOLORD-Regular.ttf` — surah-name, basmala, and ayah-number presentation fonts.
- `assets/fonts/UthmanicHafs_V20.ttf` — the package's Unicode Hafs font.

The renderer path loads these from package assets; this investigation did not find a runtime download requirement for the QPC V4 page data or page fonts. Downloading or compressing an asset does not itself establish rights to use or redistribute it. Optional Tasmee model downloads are outside this renderer inventory and were not initiated.

`pubspec.yaml` also bundles general Arabic UI font families and broad `assets/svg/` and `assets/images/` directories. The QPC V4 page-rendering path identified here is based on its font and JSON resources, not page-image files. The general UI font binaries were not compared byte-for-byte with upstream releases; the extra SVG/image files were not established as required QPC V4 page resources. Neither group is treated as cleared for any use that later includes it.

## Resource inventory

For each resource below, `UNKNOWN` is the exact status for a rights dimension where the applicable owner terms were not established. QUL's general packaging statement is relevant evidence, but it does not replace a dataset-specific grant or settle the upstream rights.

### 1. Quran text and QPC V4 word/glyph script

- **RESOURCE:** QPC V4 word/glyph data and Hafs word-by-word data.
- **OWNER:** QUL is the identified distributor for the corresponding published resources; the underlying rights holder and the exact origin of the package copies are not established by a file-level provenance record.
- **SOURCE URL:** [QUL V4 Glyphs (With Tajweed) — Word by word, resource 47](https://qul.tarteel.ai/resources/quran-script/47); [QUL QPC Hafs script, resource 86](https://qul.tarteel.ai/resources/quran-script/86). These are candidate source matches, not verified file identities.
- **LOCAL FILE/PATH:** `assets/jsons/qpc-v4.json.gz`; `assets/jsons/qpc-hafs-word-by-word.json.gz`.
- **PURPOSE:** Quranic script/glyphs and word-level text used by the Mushaf and its word-state UI.
- **BUNDLED OR DOWNLOADED:** Bundled in the package; no renderer-time download identified.
- **LICENSE:** QUL says to check the repository and dataset-specific license. No license text or exact package-file digest was found for these two files. The package MIT license does not cover them.
- **COMMERCIAL USE:** `UNKNOWN`.
- **MODIFICATION:** `UNKNOWN`. Tabyan's stated scope does not modify Quran text; permitted transformations of the bundled data are still not established.
- **CONVERSION/SUBSETTING:** `UNKNOWN`.
- **REDISTRIBUTION:** `UNKNOWN`; QUL's general packaging language does not establish all downstream or commercial redistribution rights for these exact files and their upstream material.
- **ATTRIBUTION REQUIRED:** `UNKNOWN`.
- **APP STORE DISTRIBUTION:** `UNKNOWN`.
- **PLAY STORE DISTRIBUTION:** `UNKNOWN`.
- **STATUS:** `UNKNOWN`.

### 2. Quran page layout and word-position data

- **RESOURCE:** QPC V4 page, line, ayah, and word-position information.
- **OWNER:** QUL publishes the matching KFGQPC V4 layout record; the record identifies the printed layout as KFGQPC. Exact ownership and file-to-record correspondence for the package copy are not proven.
- **SOURCE URL:** [QUL KFGQPC V4 layout (1441H print), resource 19](https://qul.tarteel.ai/resources/mushaf-layout/19).
- **LOCAL FILE/PATH:** `assets/jsons/qpc_v4_ayah_info.json.gz`.
- **PURPOSE:** Page/line placement and word positioning for the 604-page page renderer.
- **BUNDLED OR DOWNLOADED:** Bundled in the package.
- **LICENSE:** The QUL record is technical documentation/download access, not a resource-specific rights grant. It describes 604 pages and 15 lines and says the V4 Tajweed fonts were disabled while proofreading; no exact mapping or license for the bundled file was found.
- **COMMERCIAL USE:** `UNKNOWN`.
- **MODIFICATION:** `UNKNOWN`.
- **CONVERSION/SUBSETTING:** `UNKNOWN`.
- **REDISTRIBUTION:** `UNKNOWN`.
- **ATTRIBUTION REQUIRED:** `UNKNOWN`.
- **APP STORE DISTRIBUTION:** `UNKNOWN`.
- **PLAY STORE DISTRIBUTION:** `UNKNOWN`.
- **STATUS:** `UNKNOWN`.

### 3. QPC/QCF V4 page fonts

- **RESOURCE:** QCF4 page-specific `COLOR-Regular` fonts, identified by the package's QFC4 folder and page-number filename pattern.
- **OWNER:** QUL lists the corresponding QPC V4/Tajweed font resource; the upstream owner and exact source/version of the package files are not verified at file level. QUL's layout record attributes the printed V4 layout to KFGQPC, but that alone is not a license.
- **SOURCE URL:** [QUL QPC V4 Tajweed font, resource 240](https://qul.tarteel.ai/resources/font/240); [QUL KFGQPC V4 layout, resource 19](https://qul.tarteel.ai/resources/mushaf-layout/19); [KFGQPC official developer portal](https://qurancomplex.gov.sa/quran-dev/).
- **LOCAL FILE/PATH:** `assets/fonts/quran_fonts_qfc4/QCF4###_COLOR-Regular.ttf.gz`; the pinned font service builds a package-asset path for the requested page.
- **PURPOSE:** Render each printed page's QPC V4 glyphs in the intended page layout.
- **BUNDLED OR DOWNLOADED:** Bundled compressed font files; the page renderer does not need to download them at runtime.
- **LICENSE:** The package notice says QCF fonts are outside MIT and subject to upstream terms. QUL's font page gives use instructions, including bundling fonts on mobile, but no resource-specific license was found. QUL's layout page reports that the V4 Tajweed fonts were disabled during proofreading; the exact bundled version was not matched to the current QUL record.
- **COMMERCIAL USE:** `UNKNOWN`.
- **MODIFICATION:** `UNKNOWN`.
- **CONVERSION/SUBSETTING:** `UNKNOWN`; runtime decompression is not treated as permission to convert or subset the font.
- **REDISTRIBUTION:** `UNKNOWN`.
- **ATTRIBUTION REQUIRED:** `UNKNOWN`.
- **APP STORE DISTRIBUTION:** `UNKNOWN`.
- **PLAY STORE DISTRIBUTION:** `UNKNOWN`.
- **STATUS:** `UNKNOWN`.

### 4. Companion Unicode Hafs font

- **RESOURCE:** `UthmanicHafs_V20.ttf`.
- **OWNER:** QUL identifies a QPC Hafs font as released by Quran Complex, but the currently documented QUL font URL is V22, not the package's V20 file. The exact V20 source and owner terms were not verified.
- **SOURCE URL:** [QUL QPC Hafs font, resource 245](https://qul.tarteel.ai/resources/font/245); [KFGQPC official font site](https://fonts.qurancomplex.gov.sa/).
- **LOCAL FILE/PATH:** `assets/fonts/UthmanicHafs_V20.ttf`.
- **PURPOSE:** Unicode Hafs presentation in package reader modes and related Quran text views.
- **BUNDLED OR DOWNLOADED:** Bundled.
- **LICENSE:** No owner-provided V20 license was obtained. The V22 page is not treated as the V20 license.
- **COMMERCIAL USE:** `UNKNOWN`.
- **MODIFICATION:** `UNKNOWN`.
- **CONVERSION/SUBSETTING:** `UNKNOWN`.
- **REDISTRIBUTION:** `UNKNOWN`.
- **ATTRIBUTION REQUIRED:** `UNKNOWN`.
- **APP STORE DISTRIBUTION:** `UNKNOWN`.
- **PLAY STORE DISTRIBUTION:** `UNKNOWN`.
- **STATUS:** `UNKNOWN`.

### 5. Surah-name fonts and headers

- **RESOURCE:** V4 ligature font and the package's Naskh surah-name font.
- **OWNER:** QUL publishes the V4 surah-name font record; no authoritative source or license was identified for the package's `surah_name_naskh.ttf` copy.
- **SOURCE URL:** [QUL V4 Surah Name Font, resource 457](https://qul.tarteel.ai/resources/font/457); QUL's [font resource index](https://qul.tarteel.ai/resources/font).
- **LOCAL FILE/PATH:** `assets/fonts/surah-name-v4.ttf`; `assets/fonts/surah_name_naskh.ttf`.
- **PURPOSE:** Render surah labels and decorative surah headers.
- **BUNDLED OR DOWNLOADED:** Bundled.
- **LICENSE:** The QUL V4 page gives font-use instructions and a CDN URL, but no resource-specific rights grant. No owner license was found for the Naskh file.
- **COMMERCIAL USE:** `UNKNOWN`.
- **MODIFICATION:** `UNKNOWN`.
- **CONVERSION/SUBSETTING:** `UNKNOWN`.
- **REDISTRIBUTION:** `UNKNOWN`.
- **ATTRIBUTION REQUIRED:** `UNKNOWN`.
- **APP STORE DISTRIBUTION:** `UNKNOWN`.
- **PLAY STORE DISTRIBUTION:** `UNKNOWN`.
- **STATUS:** `UNKNOWN`.

### 6. Basmala and ayah-number fonts

- **RESOURCE:** Basmala font and Uthmanic Neo color ayah-number font.
- **OWNER:** Not established from an authoritative source.
- **SOURCE URL:** No original-owner license or authoritative resource record identified.
- **LOCAL FILE/PATH:** `assets/fonts/vertopal.com_QCF_Bismillah-Regular.ttf`; `assets/fonts/Uthmanic_NeoCOLORD-Regular.ttf`.
- **PURPOSE:** Basmala/header and ayah-number glyph presentation.
- **BUNDLED OR DOWNLOADED:** Bundled.
- **LICENSE:** Not found. A filename or a third-party font mirror is not evidence of a grant.
- **COMMERCIAL USE:** `UNKNOWN`.
- **MODIFICATION:** `UNKNOWN`.
- **CONVERSION/SUBSETTING:** `UNKNOWN`.
- **REDISTRIBUTION:** `UNKNOWN`.
- **ATTRIBUTION REQUIRED:** `UNKNOWN`.
- **APP STORE DISTRIBUTION:** `UNKNOWN`.
- **PLAY STORE DISTRIBUTION:** `UNKNOWN`.
- **STATUS:** `UNKNOWN`.

### 7. Supporting Arabic UI fonts

- **RESOURCE:** Cairo, Kufam, and Noto Naskh Arabic font files.
- **OWNER:** Their upstream family projects.
- **SOURCE URL:** [Cairo OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/OFL.txt); [Kufam OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/kufam/OFL.txt); [Noto Naskh Arabic OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/notonaskharabic/OFL.txt).
- **LOCAL FILE/PATH:** `assets/fonts/Cairo-*.ttf`; `assets/fonts/Kufam-Regular.ttf`; `assets/fonts/NotoNaskhArabic-VariableFont_wght.ttf`.
- **PURPOSE:** Supporting Arabic interface typography, not the QPC V4 page glyph/layout data.
- **BUNDLED OR DOWNLOADED:** Bundled.
- **LICENSE:** The upstream family pages state SIL Open Font License 1.1. The package binaries were not compared with those upstream releases, so the family license is not used to mark these exact bundled files clear.
- **COMMERCIAL USE:** `UNKNOWN` for the exact bundled files; upstream OFL permits commercial use of covered font software.
- **MODIFICATION:** `UNKNOWN` for the exact bundled files; the upstream OFL governs only if file identity is established.
- **CONVERSION/SUBSETTING:** `UNKNOWN` for the exact bundled files.
- **REDISTRIBUTION:** `UNKNOWN` for the exact bundled files.
- **ATTRIBUTION REQUIRED:** `UNKNOWN` for the exact bundled files; OFL notices would apply to covered files.
- **APP STORE DISTRIBUTION:** `UNKNOWN` for the exact bundled files.
- **PLAY STORE DISTRIBUTION:** `UNKNOWN` for the exact bundled files.
- **STATUS:** `UNKNOWN`.

### 8. `quran_library` code (separate from renderer resources)

- **RESOURCE:** Package source code only.
- **OWNER:** `alheekmahlib`.
- **SOURCE URL:** [Pinned MIT license](https://raw.githubusercontent.com/alheekmahlib/quran_library/230b4b7218d1fc56e51e7f165830c15e9ce4efe2/LICENSE).
- **LOCAL FILE/PATH:** The pinned repository source, excluding QCF/QUL/KFGQPC assets and other separately licensed files.
- **PURPOSE:** Reader, page-rendering, navigation, and Tasmee implementation code.
- **BUNDLED OR DOWNLOADED:** Source code is distributed in the repository/package.
- **LICENSE:** MIT; retain the copyright and permission notice.
- **COMMERCIAL USE:** `CLEAR` for the code under MIT.
- **MODIFICATION:** `CLEAR` for the code under MIT.
- **CONVERSION/SUBSETTING:** Not applicable to source code.
- **REDISTRIBUTION:** `CLEAR` for the code under MIT with required notices.
- **ATTRIBUTION REQUIRED:** Preserve the MIT copyright and permission notice.
- **APP STORE DISTRIBUTION:** `CLEAR` for code under MIT, subject to the separate asset rights.
- **PLAY STORE DISTRIBUTION:** `CLEAR` for code under MIT, subject to the separate asset rights.
- **STATUS:** `CLEAR` — code only.

## QUL and KFGQPC evidence

1. QUL's [resource index](https://qul.tarteel.ai/resources) says its resources are intended to be downloaded and packaged with a project. The same page warns that resource information comes from external sources and may contain errors. QUL's [FAQ](https://qul.tarteel.ai/docs/faq) directs users to repository and dataset-specific license terms. The general packaging statement therefore does not establish the exact permissions required here.
2. QUL's resource pages identify technical formats and intended use, but the inspected records do not provide license text for the exact bundled QPC V4 script, layout, and font files. Page 19 describes the KFGQPC V4 layout and says the V4 Tajweed fonts were disabled during proofreading.
3. `quran_library`'s `NOTICE` is a package-maintainer summary, not the original QUL or KFGQPC license. Its no-distracting-ads condition was not found in the inspected QUL resource records, so it is not treated here as either an authoritative restriction or a rights grant.
4. KFGQPC's official [developer portal](https://qurancomplex.gov.sa/quran-dev/), [Quran Hafs page](https://qurancomplex.gov.sa/quran-hafs/), and [font site](https://fonts.qurancomplex.gov.sa/) could not be fetched in this investigation. Search snippets establish availability only, not permission. No official terms text applicable to the exact package files was captured.
5. Tarteel's general [Terms of Use](https://www.tarteel.ai/terms) do not provide a resource-specific license for QUL datasets or prove that Tarteel can sublicense every upstream KFGQPC asset.
6. A `quran.ws` repository reproduces a KFGQPC usage statement and its own renderer docs identify KFGQPC page data. That repository is not the resource owner and is not used as primary rights evidence. Non-owner mirrors and license aggregators that repeat a font-specific EULA were also excluded from the status decision.

## Platform distribution and Tabyan branding

| Question | Result | Basis |
|---|---|---|
| Web distribution | `UNKNOWN` | QUL technical font instructions discuss web delivery, but no complete resource-specific commercial or redistribution grant was found. |
| iOS/App Store distribution | `UNKNOWN` | QUL says mobile apps bundle fonts technically; this is not an app-store rights grant for the exact files. |
| Android/Play Store distribution | `UNKNOWN` | Same limitation as iOS; no exact resource-level grant was found. |
| Commercial use | `UNKNOWN` | No complete grant for the critical QUL/KFGQPC resources was found. |
| Changing surrounding application chrome, colors, controls, and navigation | `UNKNOWN` for the combined renderer/resource use | MIT permits changes to package code, but does not resolve asset conditions, attribution, or permitted presentation. |
| Changing Quran text | Not proposed | Tabyan's stated scope leaves Quran text unchanged. |

The outer Tabyan UI is not itself the unresolved source of rights. The combined `ready engine + original Quran resources + Tabyan UI` cannot be marked clear while the resources remain unknown.

## Renderer substitution and alternative-stack search

**Clean substitution in the current ready architecture: not established.** The pinned package uses a concrete QPC V4 renderer and local QPC V4 asset store. Tasmee display state is mapped through `QpcV4WordSegment` identifiers (`ayahUq:wordNumber`) and the package's `QuranCtrl`/`AyahModel` state. The source review found no generic renderer plug-in contract. The reference-range logic is separable in principle, but replacing the ready renderer would require a new renderer/data adapter and re-wiring word-state UI; that is not a drop-in resource swap and was not built.

The closest alternative found was [quran-ws/quran-engine](https://quran.ws/docs/reference/quran-engine/). Its own documentation describes cross-platform word hit-testing, masking, and highlighting. It is not a ready Smart Mushaf replacement: its engine is not published as an npm, Maven, or pub.dev package; its page data is release `0.1.0`/Beta; and it has no built-in live-recitation/Tasmee controller. Its page data also derives from KFGQPC and remains subject to KFGQPC terms, so the code license alone does not clear the assets. It is not recommended as a drop-in alternative.

Other search results were reader-only, text/metadata packages, or recitation components without a complete licensed renderer and integrated word-state UI. No alternative was found that satisfies the required feature set and has proven commercial rights for every Quran resource. No substitution was implemented.

## Exact final report

```text
QURAN_LIBRARY_CODE:
CLEAR

QURAN_TEXT:
UNKNOWN

QURAN_LAYOUT:
UNKNOWN

QPC_QCF_FONTS:
UNKNOWN

QUL_RESOURCES:
UNKNOWN

KFGQPC_RESOURCES:
UNKNOWN

WEB_DISTRIBUTION:
UNKNOWN

IOS_DISTRIBUTION:
UNKNOWN

ANDROID_DISTRIBUTION:
UNKNOWN

TABYAN_REBRANDING:
UNKNOWN

READY_RENDERER_FINAL_RIGHTS:
READY_RENDERER_RIGHTS_UNKNOWN

AUTH_CONNECTED:
NO

OLD_MUSHAF_PATCHED:
NO

QCF_V2_ADAPTER_BUILT:
NO

NABR_CALLS:
0

MODEL_DOWNLOADS:
0

DB_MUTATIONS:
0

DEPLOYMENT:
NO
```

No code, old Mushaf, authentication, student data, Nabr/QRC, model weights, database, or deployment was changed or used. This is a technical evidence review, not legal advice. Do not return to QCF v2 or implement a replacement until resource owners provide authoritative terms for the exact files and target distributions.
