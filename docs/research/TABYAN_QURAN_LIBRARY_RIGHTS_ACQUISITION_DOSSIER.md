# Tabyan — `quran_library` Rights Acquisition Dossier

**Prepared:** 2026-10-15  
**Purpose:** Identify the exact renderer resources and prepare permission requests.  
**Status:** Research only; no requests have been sent. This is not legal advice.

## Decision scope

This dossier covers the renderer-only path: a Tabyan Quran-learning application displaying an interactive Mushaf on Web, iOS App Store, and Android Play Store, with an external recitation provider. Tabyan will not alter Quran text, ayah numbering, word spelling, or Quran order. It may change application colors, surrounding UI, navigation, controls, highlighting state, and hide/reveal presentation.

**COMMERCIAL_STATUS:** `TO_BE_DECLARED_BY_TABYAN_OWNER`

The candidate is **`alheekmahlib/quran_library`**. On 2026-10-15, pub.dev’s package API reported 5.0.1 as its latest published version, while the repository’s current `main` branch `pubspec.yaml` reports 5.0.2 (tree commit `230b4b7218d1fc56e51e7f165830c15e9ce4efe2`). The paths below are inventoried from that current repository tree and manifest; they have **not** been confirmed byte-for-byte against the published 5.0.1 archive. Do not treat the 5.0.2 branch inventory as proof of the 5.0.1 package contents. Al-Heekmah must provide the exact version/commit, asset manifest, and hashes covered by any permission.

`quran_library`’s MIT license covers its code, not the separately identified Quran text, layout, or fonts. Its README attributes Quran text and metadata to KFGQPC and fonts to QUL; its NOTICE says the code grant does not apply to QCF fonts or other QUL/KFGQPC resources. Those statements identify leads, not the exact legal rights holder or a Tabyan grant. The related Al-Heekmah application uses `quran_library` and describes a King Fahd Complex edition, but its repository has no recognized license or root `LICENSE` file; that application is not a resource license.

## `CRITICAL_RESOURCES`

`BUNDLED` and `DOWNLOADED_AT_RUNTIME` below describe the inspected `main` branch, not a verified 5.0.1 archive. “Replaceable” means technically replaceable only by an authorized, encoding-compatible resource set; it is not permission to substitute or rebuild the Mushaf.

| RESOURCE_ID | FILE/PATH | RESOURCE_TYPE | USED_FOR | SOURCE_REPOSITORY | UPSTREAM_SOURCE / UPSTREAM_OWNER | BUNDLED | DOWNLOADED_AT_RUNTIME | REQUIRED_FOR_RENDERER | CAN_BE_REPLACED | CURRENT_RIGHTS_STATUS |
|---|---|---|---|---|---|---|---|---|---|---|
| QL-TEXT-01 | `assets/jsons/qpc-v4.json.gz` | Quran text / glyph-word records | The QPC V4 loader reads `id`, `surah`, `ayah`, `word`, and `text`; renderer resolves displayed words and their identities from these records. | `alheekmahlib/quran_library` | README says Quran text is from KFGQPC. Exact edition/export, file-level provenance, and grantor are not independently established; QUL may be an intermediary. | Yes, declared under `assets/jsons/` in current `pubspec.yaml`. | No external fetch found for this renderer data; read from Flutter asset bundle. | Yes for the inspected QPC V4 renderer. | Only with a rights-cleared dataset matching the exact QPC glyph IDs, page layout, and word identities. | **UNKNOWN.** MIT does not cover this data; no exact text/export license or Tabyan redistribution permission found. |
| QL-LAYOUT-02 | `assets/jsons/qpc_v4_ayah_info.json.gz` | Page and line layout; line types; surah/word ranges | Supplies page number, line number, line type (`surah_name`, `basmallah`, `ayah`), centering, surah number, and first/last word IDs. | `alheekmahlib/quran_library` | README broadly attributes Quran metadata to KFGQPC; it does not identify who authored or controls this exact page/line mapping. Could be KFGQPC, QUL, Al-Heekmah, or another source. | Yes. | No external fetch found; read from asset bundle. | Yes for the inspected QPC V4 page renderer. | Only with a compatible, rights-cleared 604-page mapping. | **UNKNOWN.** Exact provenance, ownership, and permission to copy/redistribute this layout data are unproven. |
| QL-FONT-03 | `assets/fonts/quran_fonts_qfc4/QCF4001_COLOR-Regular.ttf.gz` through `QCF4604_COLOR-Regular.ttf.gz` (604 page files, pages 001–604) | QPC V4 per-page COLR/Tajweed fonts and glyph maps | Encodes the glyphs used to render fixed Mushaf pages; the service loads each page font from the asset bundle as needed. | `alheekmahlib/quran_library` | README says fonts come from QUL; QUL resource 240 identifies a QPC V4 Tajweed font and QUL describes KFGQPC/Quran Complex tagging. The exact QUL resource ID/version-to-file mapping and legal licensor are **not verified**. | Yes, 604 `.ttf.gz` files in current tree and asset manifest. | No network download found in the inspected QPC font service. It decompresses package assets and writes local font-cache copies. | Yes for this fixed-page QPC V4 presentation. | Only by replacing the complete compatible font/script set and confirming glyph mapping, layout, and rights together. | **UNKNOWN.** `quran_library` NOTICE expressly excludes these fonts from its MIT grant; neither QUL’s general FAQ nor the captured font page grants this exact commercial, bundled, cross-platform use. |
| QL-WBW-04 | `assets/jsons/qpc-hafs-word-by-word.json.gz` | Word text / word-index mapping | Loader maps `(surah, ayah, word)` to word text; supports word-level interaction or other word text consumers. The inspected loader proves its shape, but not that every display mode requires it. | `alheekmahlib/quran_library` | Exact data creator and upstream source are not identified in the examined package pages. It may overlap with QPC text records but must not be assumed identical. | Yes. | No external fetch found for this file; the loader reads the asset bundle. | Supporting for word-level identity/text; not established as necessary to paint a static page. | Only with a compatible, rights-cleared mapping that preserves the intended word identity and spelling. | **UNKNOWN.** No file-specific license, provenance, or redistribution grant found. |
| QL-SURA-05 | `assets/jsons/surahs_name.json.gz` | Surah names and metadata | Supplies Arabic/English names and other surah fields for the reader’s index and surah UI. | `alheekmahlib/quran_library` | README broadly attributes Quran metadata to KFGQPC; the exact fields, source publications, and rights holder are not mapped. | Yes. | No external fetch found; loaded from asset bundle. | Supporting for the full reader/index and surah UI; not the page glyph source itself. | Replaceable with an authorized, compatible metadata source. | **UNKNOWN.** No exact source attribution or redistribution grant for this file was found. |
| QL-ALT-06 | `assets/jsons/quranV4.json.gz` | Quran text and page/font-mode dataset | `QuranRepository.getQuranDataV3()` reads it and the controller builds downloaded-font Quran models. It appears to support an alternate/flowing font display path in addition to the QPC V4 line renderer. | `alheekmahlib/quran_library` | README’s general Quran-text/metadata attribution points to KFGQPC; exact dataset provenance and whether Al-Heekmah transformed it are unknown. | Yes. | No external fetch found for this asset; read from bundle. | Required by the full inspected package path that invokes `getQuranDataV3`; not proven necessary if only a separately isolated QPC V4 surface is used. | Only with rights-cleared text/data having the exact needed layout/font encoding. | **UNKNOWN.** The exact edition, transformations, and grant are unverified. |
| QL-REF-07 | `assets/jsons/quran_hafs.json.gz` (referenced by `QuranRepository.getQuran()`; **not present** in the inspected current `main` tree) | Quran text / legacy repository path | A method references this asset, but the inspected tree does not contain it. It may be stale, supplied elsewhere, or reached by a different package version. | Referenced by `alheekmahlib/quran_library`; no matching current-tree file. | **Unknown** until Al-Heekmah explains whether it is dead code or identifies the actual source. | Not present in inspected tree. | No download path established. | Unknown; not needed by the observed QPC V4 loader itself. | Unknown. | **UNKNOWN / VERSION GAP.** Require a release-specific manifest and an explanation before relying on this path. |
| QL-FONT-08 | `assets/fonts/UthmanicHafs_V20.ttf`; `assets/fonts/Uthmanic_NeoCOLORD-Regular.ttf`; `assets/fonts/NotoNaskhArabic-VariableFont_wght.ttf` | Quran script fonts / alternate text and ayah-marker rendering | Registered as `hafs`, `ayahNumber`, and `naskh` families; package documentation describes Hafs/Naskh styles. These are not the 604 page-specific QPC font files. | `alheekmahlib/quran_library` | Exact author, release, source, and file-specific license are not established by the examined package README/NOTICE. | Yes. | No external fetch found for the registered font files; package-bundled. | Mode-dependent. Hafs/Naskh or verse-marker displays may depend on them; not established as necessary for the QPC V4 page glyphs. | Technically replaceable only with a cleared font and matching encoding/marks. | **UNKNOWN.** No per-font redistribution or commercial permission verified. |
| QL-ORN-09 | `assets/fonts/vertopal.com_QCF_Bismillah-Regular.ttf`; `assets/fonts/surah_name_naskh.ttf`; `assets/fonts/surah-name-v4.ttf` | Basmala and surah-heading glyph fonts | `pubspec.yaml` registers Bismillah and surah-name families; Basmala and surah headings are rendered by dedicated widgets. The current widget references `surahName`; the exact active family/file mapping for each renderer mode needs confirmation. | `alheekmahlib/quran_library` | Exact creators and upstream sources are not identified. Their filenames do not prove ownership or licensing. | Yes. | No external fetch found for these registered files. | Mode-dependent supporting assets for Basmala/surah heading presentation. | Replaceable only if rights-cleared and compatible with the package’s glyph mapping and page design. | **UNKNOWN.** No file-specific grant or provenance found. |
| QL-ORN-10 | `assets/svg/surahSvgBanner.svg`, `assets/svg/surahSvgBannerDark.svg`, `assets/svg/suraNum.svg` | Surah banner and number presentation assets | Referenced by the package’s surah header/banners; decorative rather than Quran text. | `alheekmahlib/quran_library` | Exact designer, source, and rights holder are unknown. | Yes, in the asset tree. | No external fetch found for these package SVGs. | Supporting for the default banner/header UI; could be omitted if Tabyan uses its own surrounding UI. | Yes, if Tabyan does not use these graphics and the replacement contains no uncleared material. | **UNKNOWN.** No asset-specific license was found. |

### Inventory boundaries and technical observations

- The current package manifest also bundles ordinary interface fonts and non-renderer materials. This table includes Quran script, QPC glyph/layout, word identity, and Mushaf heading resources; it does not treat generic interface fonts as critical Mushaf content.
- The inspected QPC V4 loader reads `qpc_v4_ayah_info.json.gz` and `qpc-v4.json.gz`; the latter supplies word IDs/text and the former groups page lines and word ranges. The 604 page fonts are read from the asset bundle and cached locally after decompression. This is not evidence that any resource may legally be copied, cached, hosted, or redistributed.
- `QuranFontsService` creates alternate in-memory font variants by rewriting COLR/CPAL palette values (including dark, no-Tajweed, red, and transparent variants). The permission request must explicitly cover this rendering-time color/opacity treatment, or the rights holder must confirm it is not a restricted font modification. No Quran text, glyph outline, word order, or ayah numbering is to be changed by Tabyan.
- The package offers optional font-selection/download UI. The inspected QPC page-font service uses bundled fonts and local cache; the exact scope of every other font option and whether any package version retrieves a separate remote font set remains to be confirmed by Al-Heekmah.
- The package includes separate recitation/Tasmee code and references external model/phoneme materials. They are outside this renderer-only dossier. The contemplated recitation engine is external; no built-in Tasmee engine, model, or provider is approved or assessed here. Ask Al-Heekmah whether the renderer can be adopted without those optional components and their assets/dependencies.

## `RIGHTS_HOLDERS`

| Resource group | Identifiable party or parties | What is and is not established |
|---|---|---|
| Quran text and KFGQPC edition | King Fahd Glorious Quran Printing Complex (KFGQPC), as the source named by the package README; Al-Heekmah is the package publisher; QUL may distribute or catalogue related resources. | The package does not map each JSON file to a specific KFGQPC export, nor prove who controls permission for the digital transcription/compilation or the exact grant. Ask KFGQPC and require Al-Heekmah to identify the file’s provenance. |
| 604 QPC V4 font files | QUL/Tarteel is the source named by the package README; KFGQPC is the apparent upstream font origin indicated by QUL resource classification and the package’s own NOTICE. | The exact resource IDs, release, ownership chain, and party authorized to license commercial Web/App Store/Play Store bundling remain unverified. Ask both QUL and KFGQPC; do not assume QUL can sublicense an upstream font. |
| QPC page/line/word layout and word mappings | Al-Heekmah hosts and packages the files; KFGQPC is broadly named for Quran metadata. | The exact authorship and transformation chain are unknown. Al-Heekmah must identify whether these are KFGQPC exports, QUL exports, Al-Heekmah-created data, or another dataset, and produce the applicable permission chain. |
| Surah names, Basmala/surah fonts, SVG header art, and alternate Uthmanic fonts | Al-Heekmah packages the assets. | Their individual upstream sources and owners were not identified. The package’s MIT code license does not settle these files. Require a file-level asset manifest with licenses and upstream owners. |
| Renderer source code | Al-Heekmah Library; repository LICENSE states MIT. | **Code only.** Preserve the MIT notice for code copies/substantial portions. This does not authorize the Quran data/fonts above. |
| Related application `alquranalkareem` | Al-Heekmah Library, as repository publisher. | The README describes a KFGQPC edition and the app uses `quran_library`; no recognized repository license or root LICENSE was found. The app is not evidence of a downstream grant to Tabyan. |

**Rights-holder conclusion:** Named upstream parties can be approached, but the exact licensor for the critical page/line data, word mappings, and several bundled fonts/ornaments is not yet proven. Written confirmation from Al-Heekmah must identify the holder and chain for each file; written permission must come from a party with authority over that exact resource.

## `UNKNOWN_ITEMS`

1. Whether the published `quran_library` 5.0.1 package contains the exact files and code paths found in current `main` (5.0.2); no archive/assets were downloaded for this review.
2. The exact text edition, source export, and file-level provenance for `qpc-v4.json.gz`, `quranV4.json.gz`, and any other Quran text embedded in the package.
3. The creator and source/license for `qpc_v4_ayah_info.json.gz`, `qpc-hafs-word-by-word.json.gz`, and the specific metadata in `surahs_name.json.gz`.
4. The exact QUL resource ID and release corresponding to every `QCF4…` font file, whether the package’s fonts are modified from the original QUL/KFGQPC files, and which organization can license each file.
5. The provenance and license for `UthmanicHafs_V20.ttf`, `Uthmanic_NeoCOLORD-Regular.ttf`, `NotoNaskhArabic-VariableFont_wght.ttf`, `vertopal.com_QCF_Bismillah-Regular.ttf`, `surah_name_naskh.ttf`, `surah-name-v4.ttf`, and the three surah SVGs.
6. Whether commercial use, Web/CDN hosting, Apple/Google store distribution, copying, bundling, cache retention, runtime downloads, redistribution, and application rebranding are authorized for each exact resource.
7. Whether QUL/KFGQPC terms permit page-word highlighting, masking/hide-reveal, color-state overlays, and in-memory COLR/CPAL palette/opacity transformation while the underlying text, glyph outlines, spelling, order, and numbering remain unchanged.
8. Whether there are attribution, source-notice, no-ad, attribution-placement, version-update, revocation, territory, or other conditions for each resource. The package NOTICE summarizes a no-distracting-ads condition for bundled QUL/KFGQPC resources; its scope and authority for this exact use need confirmation.
9. Whether the optional font-selection UI downloads any font resources outside the bundled 604 page-font set, and which terms govern that path.
10. Why `getQuran()` references `assets/jsons/quran_hafs.json.gz` although that path is absent from the inspected current repository tree; confirm whether it is stale, supplied elsewhere, or present only in a specific published package.
11. Whether the package can be used as a renderer-only component without including or activating its built-in Tasmee/model-related components. Those components are outside this rights review.
12. Tabyan’s commercial status remains **`TO_BE_DECLARED_BY_TABYAN_OWNER`**. No commercial status is assumed in this dossier.

## `PERMISSIONS_REQUIRED`

Status for each row: **UNKNOWN — obtain an explicit written answer or license covering the exact resource IDs/files and release.** The repository documents an MIT code license; it does not grant rights to any Quran resource in this matrix.

| Permission | Needed from the authorized rights holder |
|---|---|
| DISPLAY | Render the exact Quran text, 604 QPC page fonts, page/line layout, word map, and necessary metadata inside Tabyan. |
| COPY | Make working copies needed to build and operate the Web and native applications. |
| BUNDLE | Include the exact font/data files in Web delivery and iOS/Android application packages. |
| REDISTRIBUTE | Distribute those bundled copies to Tabyan users through the website, Apple App Store, and Google Play Store; state any attribution or notice conditions. |
| WEB HOST | Host the Web-delivered resource files on Tabyan infrastructure or CDN, and serve them to users. |
| IOS DISTRIBUTE | Include and distribute permitted resources within Tabyan through the iOS App Store. |
| ANDROID DISTRIBUTE | Include and distribute permitted resources within Tabyan through Google Play Store. |
| CACHE | Store necessary copies in browser/app caches, local storage, or the device’s local font cache, with a stated retention/deletion rule. |
| DOWNLOAD AT RUNTIME | Download the exact identified resources directly or via Tabyan infrastructure, if this distribution method is used; clarify whether a separate QUL account, attribution, synchronization, or access process is required. |
| USE IN COMMERCIAL PRODUCT | If applicable after the owner declares Tabyan’s status, permit use in the relevant commercial product model. Do not infer that status here. |
| USE WITH MODIFIED SURROUNDING UI | Permit Tabyan’s colors, branding, navigation, controls, responsive layout, and surrounding interface while preserving the licensed Quran assets. |
| WORD-LEVEL HIGHLIGHTING | Permit temporary visual emphasis for current, confirmed, and incorrect words driven by Tabyan’s external recitation integration. |
| HIDE/REVEAL PRESENTATION | Permit temporarily masking a word and progressively revealing it for memorization, without deleting or editing underlying Quran text. |
| FONT COLOR/OPACITY TREATMENT | Confirm permission for the renderer’s runtime COLR/CPAL palette and opacity variants used for theme and display states, or specify a permitted alternative. No transformed font file would be redistributed unless expressly licensed. |
| EXTERNAL RECITATION INTEROP | Permit Tabyan to associate an external provider’s word/ayah results with the licensed word IDs and show the permitted visual states. The provider’s own data, API, and audio rights are outside this dossier. |

## Integrity versus visual state

Tabyan’s proposed use does **not** alter Arabic Quran text, spelling, Quran order, ayah numbering, or the stored word identity. Highlighting, incorrect/current-word colors, and hide/reveal are transient display states around unchanged Quran data. The QUL FAQ says resource terms vary and commercial use depends on each resource’s own license; the inspected materials do not explicitly decide whether these specific visual states or font-palette changes are allowed. Therefore each remains **UNKNOWN**, and the requests below seek explicit confirmation.

## `ALHEEKMAH_QUESTIONS`

Send these only after a human chooses to contact Al-Heekmah:

1. **Which Quran text source is used by `quran_library`?** For each release, identify the edition, upstream project/owner, exact source/export, resource IDs, transformations, and files containing Quran text.
2. **Which exact QPC/QCF font release is used?** Map every `QCF4001…QCF4604` file to its QUL resource ID/version, source URL, upstream owner, and any modifications made by Al-Heekmah.
3. **Where did the page-layout data originate?** Identify the author and source for `qpc_v4_ayah_info.json.gz`, including rights for page/line assignments, surah-name and Basmala line types, and word-ID ranges.
4. **Which resources does Al-Heekmah itself have redistribution rights for?** Please provide the actual license/grant, permitted platforms, term, territory, and any attribution/no-ad conditions.
5. **Which resources require downstream users to obtain independent permission?** Name the correct rights holder and contact/request process for each file.
6. **Can `quran_library` be used in a commercial branded application?** Answer separately for code, Quran text, layout, every font, word mapping, surah metadata, and header assets; distinguish the 5.0.1 pub.dev release from current `main`/5.0.2.
7. **Can its Smart Mushaf UI be rebranded?** Confirm Tabyan may change surrounding colors, navigation, controls, and visual word states without changing Quran content; address hide/reveal and COLR/CPAL palette/opacity variants specifically.
8. **Are there additional permissions or conditions not present in the repository?** Include unbundled/runtime-downloaded files, attribution, QUL account or sync conditions, no-ad restrictions, updates/revocation, and App Store/Play Store redistribution.
9. Please provide the exact asset manifest and hashes for the published 5.0.1 package and identify whether the inspected 5.0.2 `main` branch changes any Quran-related assets or their sources.
10. Please explain the `quran_hafs.json.gz` path referenced by `QuranRepository.getQuran()` but absent from the inspected current tree.
11. Can Tabyan adopt only the renderer and omit the optional built-in Tasmee/model components and their resources/dependencies? This request does not ask to license or assess those components.

## Draft requests — unsent

The following drafts deliberately state the commercial status as `TO_BE_DECLARED_BY_TABYAN_OWNER`. Before any human sends them, the owner must fill in the applicant’s legal identity and declare the commercial status. The drafts request permission; they do not assert that any recipient owns every resource.

### `KFGQPC_PERMISSION_REQUEST_AR`

**الموضوع: طلب تحديد مصدر وإذن استخدام موارد مصحف QPC V4 داخل تطبيق تبيان**

السادة/مجمع الملك فهد لطباعة المصحف الشريف،

نُعدّ ملفًا داخليًا للتحقق من حقوق استخدام موارد محددة ضمن حزمة `alheekmahlib/quran_library`، ولا نطلب في هذه الرسالة الحالية أي اعتماد تقني ولا نرفق أو نوزّع أي مورد. نرجو تأكيد ما إذا كان المجمع هو صاحب الحق أو الجهة المخوّلة بمنح الإذن لكل مورد أدناه، أو إحالتنا إلى صاحب الحق الصحيح:

- ملفات الخطوط ذات المسارات `assets/fonts/quran_fonts_qfc4/QCF4001_COLOR-Regular.ttf.gz` إلى `QCF4604_COLOR-Regular.ttf.gz` (604 ملفًا لصفحات المصحف)، مع تحديد إصدار QPC/QCF ورقم/معرّف المورد المقابل لكل ملف.
- بيانات النص والكلمات `assets/jsons/qpc-v4.json.gz` و`assets/jsons/quranV4.json.gz`.
- بيانات تخطيط الصفحات والأسطر `assets/jsons/qpc_v4_ayah_info.json.gz`، بما فيها أرقام الصفحات والأسطر وأنواع الأسطر ونطاقات معرّفات الكلمات.
- بيانات الكلمات `assets/jsons/qpc-hafs-word-by-word.json.gz` وبيانات أسماء السور `assets/jsons/surahs_name.json.gz`، إذا كانت من موارد المجمع أو تقع ضمن صلاحية ترخيصه.
- أي ملفات خطوط أو عناوين للسور والبسملة يثبت أن المجمع يملك أو يرخّص حقوقها؛ نحتاج من الناشر مطابقة هذه الملفات بمصادرها الدقيقة قبل أن ننسبها للمجمع.

الاستخدام المقترح: عرض المصحف كتجربة تفاعلية داخل تطبيق تعلّم القرآن **تبيان** على الويب، وiOS عبر App Store، وAndroid عبر Google Play. نطلب، لكل مورد يثبت أن لديكم صلاحية ترخيصه، إذنًا صريحًا بالعرض والنسخ والاستضافة على الويب والتضمين والتوزيع ضمن التطبيقات وإعادة التوزيع والتخزين المؤقت على الجهاز، وبالتنزيل وقت التشغيل إذا وافقتم على هذا الأسلوب. نحتاج كذلك إلى تأكيد إذن الاستخدام التجاري إذا كان ذلك منطبقًا؛ الحالة التجارية لتبيان: **`TO_BE_DECLARED_BY_TABYAN_OWNER`**، ولن نفترضها قبل أن يصرّح بها مالك تبيان.

لن نغيّر نص القرآن العربي أو تهجئة الكلمات أو ترتيبها أو أرقام الآيات. نطلب تحديدًا بيان ما إذا كان يجوز عرض تمييز مؤقت للكلمة الحالية أو المؤكدة أو غير المطابقة، وإخفاء الكلمة وإظهارها تدريجيًا للحفظ، وتطبيق ألوان واجهة تبيان أو تغيير لوحة ألوان الخط/شفافيته وقت العرض دون تعديل النص أو شكل الحروف. كما نطلب تأكيد جواز استخدام واجهة وهوية بصرية خاصة بتبيان وربط معرّفات الكلمات بنتائج مزوّد تسميع خارجي.

يرجى تزويدنا بنص الإذن أو الترخيص الفعلي، وبشروط النسبة للمصدر والإعلانات والاحتفاظ بالنسخ والتحديثات والمدة والنطاق الجغرافي، وتحديد ما إذا كان يلزم إذن منفصل من QUL أو جهة أخرى لكل ملف. لا نعدّ هذه الرسالة مرسلة؛ لا يوجد تواصل أو استخدام أو توزيع حتى الآن.

مع الشكر،  
`[اسم/صفة مقدم الطلب — يملؤها مالك تبيان]`  
`[بيانات التواصل — يملؤها مالك تبيان]`

### `KFGQPC_PERMISSION_REQUEST_EN`

**Subject: Request to identify and license exact QPC V4 resources for the Tabyan application**

Dear King Fahd Glorious Quran Printing Complex,

We are preparing an internal rights review for exact resources contained in `alheekmahlib/quran_library`. This draft is not a technical approval request, and no resource is being distributed or incorporated by this inquiry. Please confirm whether KFGQPC owns or is authorized to license each item below, or direct us to the correct rights holder:

- The 604 page-font files at `assets/fonts/quran_fonts_qfc4/QCF4001_COLOR-Regular.ttf.gz` through `QCF4604_COLOR-Regular.ttf.gz`; please identify the exact QPC/QCF edition, release, and corresponding resource IDs.
- Quran text/word records at `assets/jsons/qpc-v4.json.gz` and `assets/jsons/quranV4.json.gz`.
- Page and line layout records at `assets/jsons/qpc_v4_ayah_info.json.gz`, including page/line assignments, line types, and word-ID ranges.
- Word mapping at `assets/jsons/qpc-hafs-word-by-word.json.gz` and surah metadata at `assets/jsons/surahs_name.json.gz`, if these are KFGQPC resources or within your licensing authority.
- Any surah-heading or Basmala fonts/assets that you confirm are within your rights. We will not attribute those files to KFGQPC without a verified file-to-source mapping.

Proposed use: display the Mushaf as an interactive reader in the Tabyan Quran-learning application on Web, iOS through the App Store, and Android through Google Play. For each resource you are authorized to license, please state whether you grant permission to display, copy, Web-host, bundle, distribute in app packages, redistribute to end users, cache on user devices, and download at runtime if that method is approved. Please also state whether the grant covers commercial use if applicable. Tabyan’s commercial status is **`TO_BE_DECLARED_BY_TABYAN_OWNER`**; we will not assume or declare it on the owner’s behalf.

We will not change Quran Arabic text, word spelling, Quran order, or ayah numbering. Please specifically address whether permission includes transient highlighting of current, confirmed, or incorrect words; hiding and progressively revealing words for memorization; Tabyan’s own surrounding colors, navigation, controls, and branding; runtime font-palette/opacity changes for display states without changing glyph outlines or text; and associating word IDs with results from an external recitation provider.

Please provide the operative written license or permission, attribution and advertising requirements, cache/retention and update conditions, term and territorial scope, and identify any resource requiring separate permission from QUL or another party. This draft has not been sent; no contact, use, or distribution has occurred.

Sincerely,  
`[Applicant name/title — to be completed by the Tabyan owner]`  
`[Contact details — to be completed by the Tabyan owner]`

### `QUL_PERMISSION_REQUEST_AR`

**الموضوع: طلب مطابقة موارد QUL المحددة وترخيص توزيعها مع مصحف تبيان**

السادة/فريق مكتبة القرآن الكريم العالمية QUL — ترتيل،

نرجو تحديد موارد QUL الدقيقة التي تقابل ملفات `quran_library` التالية، وعدم الاكتفاء بإفادة عامة عن خطوط QCF:

- مجموعة الخطوط الـ604: `assets/fonts/quran_fonts_qfc4/QCF4001_COLOR-Regular.ttf.gz` إلى `QCF4604_COLOR-Regular.ttf.gz`، مع رقم المورد وإصدار الخط والملف/التنسيق المقابل لكل صفحة، وبيان هل هي نسخة QPC V4 Tajweed، وهل تطابق مورد QUL ذي المعرّف 240 أم موردًا آخر.
- بيانات النص/الكلمات `assets/jsons/qpc-v4.json.gz` و`assets/jsons/quranV4.json.gz`.
- تخطيط الأسطر والصفحات `assets/jsons/qpc_v4_ayah_info.json.gz`.
- ربط الكلمات `assets/jsons/qpc-hafs-word-by-word.json.gz` وبيانات السور `assets/jsons/surahs_name.json.gz` إن كانت موارد QUL.
- مصدر وشروط الملفات المصاحبة المسماة في المستودع `UthmanicHafs_V20.ttf` و`Uthmanic_NeoCOLORD-Regular.ttf` وخطوط السور والبسملة، إن كانت ضمن QUL.

نرجو بيان صاحب الحق لكل مورد على حدة، وما إذا كانت QUL تملك حق منح الإذن أو أنها وسيط/مستضيف فقط، وتحديد أي إذن مباشر مطلوب من مجمع الملك فهد أو مالك آخر. نحتاج إلى نسخة الترخيص وشروطه لكل إصدار/معرّف مورد، لا إلى استنتاج من إتاحة التنزيل.

الاستخدام المقترح هو عرض مصحف تفاعلي في تطبيق تبيان لتعلّم القرآن على الويب وiOS App Store وAndroid Google Play. نطلب بيان الإذن بالعرض والنسخ والاستضافة على الويب والتضمين والتوزيع وإعادة التوزيع والتخزين المؤقت والتنزيل وقت التشغيل، والاستخدام التجاري إذا كان منطبقًا. الحالة التجارية لتبيان: **`TO_BE_DECLARED_BY_TABYAN_OWNER`**.

لن نغيّر نص القرآن أو تهجئته أو ترتيب الكلمات أو أرقام الآيات. نرجو إجابة صريحة عما إذا كانت الشروط تسمح بتمييز الكلمة الحالية/المؤكدة/غير المطابقة، وإخفاء الكلمات وإظهارها تدريجيًا للحفظ، وتغيير الألوان المحيطة والعلامات المرئية لواجهة تبيان، وتغيير لوحة ألوان/شفافية ملفات COLR/CPAL في الذاكرة وقت العرض فقط دون تغيير أشكال الحروف أو إعادة توزيع ملفات الخط المعدلة. نرجو كذلك تحديد شروط النسبة، والإعلانات، والتخزين المحلي، ومزامنة/تحديث الموارد، ودمج معرّفات الكلمات مع مزوّد تسميع خارجي.

هذه مسودة غير مرسلة؛ لم يتم التواصل أو تنزيل الموارد أو استخدامها.

مع الشكر،  
`[اسم/صفة مقدم الطلب — يملؤها مالك تبيان]`  
`[بيانات التواصل — يملؤها مالك تبيان]`

### `QUL_PERMISSION_REQUEST_EN`

**Subject: Request to map and license exact QUL resources for the Tabyan Mushaf**

Dear Quranic Universal Library / Tarteel team,

Please identify the exact QUL resources corresponding to the following `quran_library` files. A general statement about QCF fonts will not identify the resources in this request:

- The 604 files `assets/fonts/quran_fonts_qfc4/QCF4001_COLOR-Regular.ttf.gz` through `QCF4604_COLOR-Regular.ttf.gz`: resource ID, release, page-to-file mapping, exact QPC V4 Tajweed designation, and whether these correspond to QUL font resource 240 or another resource.
- Text/word data `assets/jsons/qpc-v4.json.gz` and `assets/jsons/quranV4.json.gz`.
- Page/line mappings `assets/jsons/qpc_v4_ayah_info.json.gz`.
- Word mapping `assets/jsons/qpc-hafs-word-by-word.json.gz` and surah data `assets/jsons/surahs_name.json.gz`, if these are QUL resources.
- The source and terms for the package’s `UthmanicHafs_V20.ttf`, `Uthmanic_NeoCOLORD-Regular.ttf`, and surah/Basmala font files, if QUL supplies them.

For each resource, please identify the rights holder and state whether QUL can grant the permission or only hosts/distributes the resource. Identify any permission required directly from KFGQPC or another rights holder. Please provide the operative license for the exact resource ID and release; download availability alone is not being treated as a license.

Proposed use: display an interactive Mushaf in Tabyan, a Quran-learning application for Web, iOS App Store, and Android Google Play. Please state whether the grant permits display, copying, Web hosting, bundling, distribution and redistribution to end users, local caching, and runtime download. Please address commercial use if applicable. Tabyan’s commercial status is **`TO_BE_DECLARED_BY_TABYAN_OWNER`**.

We will not alter Quran text, spelling, word order, or ayah numbering. Please explicitly address temporary highlighting of current/confirmed/incorrect words; hiding and progressively revealing words for memorization; Tabyan’s surrounding colors and branded controls; in-memory COLR/CPAL color/opacity changes for display only without changing glyph outlines or redistributing transformed font files; and using word IDs with an external recitation provider.

Please specify attribution, advertising, local-cache, synchronization/update, and any account requirements. This draft has not been sent; no contact, asset download, or use has occurred.

Sincerely,  
`[Applicant name/title — to be completed by the Tabyan owner]`  
`[Contact details — to be completed by the Tabyan owner]`

### `ALHEEKMAH_REQUEST_AR`

**الموضوع: طلب حصر مصادر وحقوق موارد `quran_library` لاستخدامها كمحرّك عرض في تبيان**

السادة/مكتبة الحكمة — فريق `alheekmahlib/quran_library`،

نراجع إمكانية استخدام جزء العرض فقط من `quran_library`، مع إبقاء مزوّد التسميع خارجيًا. نرجو تزويدنا بإجابة موثقة عن الأسئلة التالية:

1. ما مصدر نص القرآن المستخدم؟ يرجى ذكر الإصدار والمورد/المعرّف والجهة المالكة ومسار كل ملف نصي أو بيانات كلمات.
2. ما إصدار QPC/QCF الدقيق المستخدم؟ يرجى مطابقة ملفات `QCF4001_COLOR-Regular.ttf.gz` إلى `QCF4604_COLOR-Regular.ttf.gz` بمعرّفات موارد QUL وإصداراتها، وبيان التغييرات التي أجريتموها عليها.
3. ما مصدر بيانات تخطيط الصفحات والأسطر؟ يرجى تحديد منشئ ومصدر `qpc_v4_ayah_info.json.gz` وبيانات الكلمات والسور، وما إذا كانت من QUL أو KFGQPC أو إعدادكم أو مصدر آخر.
4. ما الموارد التي تملكون أنتم حق إعادة توزيعها؟ يرجى تزويدنا بنص الإذن أو الترخيص الذي يثبت ذلك لكل ملف، مع المنصات والمدة والنطاق والشروط.
5. ما الموارد التي يجب على المستخدم النهائي أن يطلب إذنًا مستقلًا لها؟ يرجى تسمية صاحب الحق الفعلي وطريقة طلب الإذن.
6. هل يسمح ترخيص `quran_library` باستخدام تجاري داخل تطبيق يحمل علامة تجارية مختلفة؟ يرجى الإجابة منفصلًا لشفرة MIT ولكل من النص والتخطيط والخطوط والخرائط والرسوم، والتمييز بين إصدار pub.dev ‏5.0.1 و`main` الذي يعلن 5.0.2.
7. هل يمكن إعادة تسمية واجهة Smart Mushaf وتغيير ألوان التطبيق المحيطة والملاحة والأزرار وحالات إبراز الكلمات وإخفائها/إظهارها دون تغيير محتوى القرآن؟ يرجى تناول تحويل ألوان/شفافية CPAL وقت التشغيل بوضوح.
8. هل توجد أذونات أو شروط أخرى غير مذكورة في المستودع، مثل الإسناد أو منع الإعلانات أو حساب QUL أو المزامنة أو التحديث أو توزيع App Store/Google Play أو التنزيل وقت التشغيل؟
9. يرجى إرسال بيان أصول دقيق وهاشات إصدار 5.0.1 المنشور، وتحديد ما إذا كانت موارد القرآن في 5.0.2 على `main` مختلفة.
10. يشير `QuranRepository.getQuran()` إلى `assets/jsons/quran_hafs.json.gz`، لكن المسار غير موجود في شجرة `main` التي راجعناها. هل هذا مسار قديم أم مورد يضاف من مكان آخر أم اختلاف في إصدار منشور؟
11. هل يمكن دمج محرك العرض فقط دون تضمين أو تفعيل مكونات التسميع/النموذج الاختيارية ومواردها واعتمادياتها؟ لا يتضمن هذا الطلب ترخيص تلك المكونات أو تقييمها.

الاستخدام المقترح هو عرض مصحف تفاعلي داخل تطبيق تبيان لتعلّم القرآن على الويب وiOS App Store وAndroid Google Play. نطلب إذنًا مكتوبًا لكل مورد مخوّل لكم ترخيصه يشمل العرض والنسخ والتضمين والاستضافة على الويب والتوزيع وإعادة التوزيع والتخزين المؤقت والتنزيل وقت التشغيل عند الموافقة عليه، والاستخدام التجاري إذا كان منطبقًا. الحالة التجارية لتبيان: **`TO_BE_DECLARED_BY_TABYAN_OWNER`**؛ لن نفترضها.

لن نعدّل النص العربي أو تهجئته أو ترتيب الكلمات أو ترقيم الآيات. سنستخدم ألوان تبيان والملاحة والتحكم وحالات إبراز الكلمة الصحيحة/الحالية/غير المطابقة والإخفاء/الإظهار كحالات بصرية فقط. نرجو تحديد ما إذا كانت حقوق هذه الحالات تحتاج إلى إذن من QUL أو KFGQPC أو صاحب حق آخر، وما إذا كانت لديكم صلاحية منحها.

هذه مسودة غير مرسلة، وليست طلبًا لتطبيق التغييرات أو تنزيل الموارد. لا يوجد تواصل أو استخدام أو توزيع حتى الآن.

مع الشكر،  
`[اسم/صفة مقدم الطلب — يملؤها مالك تبيان]`  
`[بيانات التواصل — يملؤها مالك تبيان]`

### `ALHEEKMAH_REQUEST_EN`

**Subject: Request for `quran_library` resource provenance and renderer-only rights for Tabyan**

Dear Al-Heekmah Library / `alheekmahlib/quran_library` team,

We are evaluating the renderer portion of `quran_library` only, with recitation assessment remaining external. Please provide documented answers to the following:

1. What exact Quran text source is used? Identify the edition, resource IDs, rights holder, and every file containing text or word data.
2. Which exact QPC/QCF release is used? Map `QCF4001_COLOR-Regular.ttf.gz` through `QCF4604_COLOR-Regular.ttf.gz` to QUL resource IDs/releases and disclose any changes you made to the fonts.
3. What is the source of page and line layout data? Identify the author and provenance of `qpc_v4_ayah_info.json.gz`, word mappings, and surah metadata, including whether each came from QUL, KFGQPC, Al-Heekmah, or another source.
4. Which resources do you have rights to redistribute? Please provide the operative grant/license for each file, including permitted platforms, term, territory, and conditions.
5. Which resources require downstream users to obtain independent permission? Please identify the actual rights holder and permission process.
6. May `quran_library` be used in a commercially branded application? Please answer separately for MIT code, text, page/line layout, each font, mappings, and graphics; distinguish the published pub.dev 5.0.1 release from current `main`, which declares version 5.0.2.
7. May Tabyan rebrand the Smart Mushaf UI and change surrounding colors, navigation, controls, word highlighting, hide/reveal presentation, and other visual states without changing Quran content? Please specifically address runtime COLR/CPAL color/opacity transformation.
8. Are there additional permissions or terms not included in the repository, including attribution, advertising, QUL account or synchronization, updates, runtime downloads, or Apple/Google store redistribution?
9. Please provide the exact asset manifest and hashes for published 5.0.1 and state whether Quran resources differ on the 5.0.2 `main` branch.
10. `QuranRepository.getQuran()` references `assets/jsons/quran_hafs.json.gz`, which is absent from the inspected `main` tree. Is this stale, supplied elsewhere, or present only in a published release?
11. Can Tabyan integrate only the renderer while omitting or disabling optional Tasmee/model components and their assets/dependencies? This request does not seek rights to or an evaluation of those components.

Proposed use: display an interactive Mushaf in Tabyan, a Quran-learning application on Web, iOS App Store, and Android Google Play. We request written permission for each resource you are authorized to license covering display, copying, bundling, Web hosting, distribution and redistribution, local caching, and runtime download if approved, plus commercial use if applicable. Tabyan’s commercial status is **`TO_BE_DECLARED_BY_TABYAN_OWNER`**; we will not assume it.

We will not modify Quran Arabic text, spelling, word order, or ayah numbering. Tabyan would use its own surrounding UI, branding, navigation, controls, and transient correct/current/incorrect word highlights and hide/reveal states. Please identify whether you have authority to license these operations or whether permission must come from QUL, KFGQPC, or another rights holder.

This draft is unsent and does not authorize implementation, asset download, use, or distribution. No contact has been made.

Sincerely,  
`[Applicant name/title — to be completed by the Tabyan owner]`  
`[Contact details — to be completed by the Tabyan owner]`

## References reviewed

1. [`quran_library` published package page](https://pub.dev/packages/quran_library) and [pub.dev package API](https://pub.dev/api/packages/quran_library) — version status checked without downloading the package archive.
2. [`quran_library` current repository tree](https://github.com/alheekmahlib/quran_library/tree/main), [`pubspec.yaml`](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/pubspec.yaml), [QPC V4 asset loader](https://github.com/alheekmahlib/quran_library/blob/main/lib/src/quran/data/qpc_v4/qpc_v4_assets_loader.dart), [word loader](https://github.com/alheekmahlib/quran_library/blob/main/lib/src/quran/data/qpc_v4/qpc_hafs_word_by_word_assets_loader.dart), [QPC V4 models](https://github.com/alheekmahlib/quran_library/blob/main/lib/src/quran/data/qpc_v4/qpc_v4_models.dart), and [font service](https://github.com/alheekmahlib/quran_library/blob/main/lib/src/quran/core/services/quran_fonts_service.dart).
3. [`quran_library` README](https://github.com/alheekmahlib/quran_library/blob/main/README.md), [MIT LICENSE](https://github.com/alheekmahlib/quran_library/blob/main/LICENSE), and [resource NOTICE](https://github.com/alheekmahlib/quran_library/blob/main/NOTICE). Saved prior captures: `research/sources/market-quran-library-readme.md`, `market-quran-library-license.md`, and `market-quran-library-notice.md`.
4. [QUL FAQ](https://qul.tarteel.ai/faq) and [QPC V4 Tajweed font resource 240](https://qul.tarteel.ai/resources/font/240). Saved prior captures: `research/sources/market-qul-faq.md` and `market-qul-font-v4-240.md`. The FAQ says rights vary by resource and points users to each resource’s author/license.
5. [KFGQPC Quran Developer Portal](https://qurancomplex.gov.sa/quran-dev/) — listed by the package README as the Quran text/metadata source. It was not independently reachable in the prior research environment; no direct KFGQPC grant is claimed.
6. Related [`alquranalkareem` repository](https://github.com/alheekmahlib/alquranalkareem), its [README](https://github.com/alheekmahlib/alquranalkareem/blob/main/README.md), and [pubspec](https://github.com/alheekmahlib/alquranalkareem/blob/main/pubspec.yaml) — the application identifies the KFGQPC edition and depends on `quran_library`; no app-level downstream license was identified.

## Safety status

- App code changes: **0**
- Old Mushaf changes: **0**
- QCF v2 adapter: **NO**
- Auth changes: **NO**
- Nabr calls: **0**
- Model downloads: **0**
- Quran/font asset downloads: **0**
- Database mutations: **0**
- Vendor contact: **0**
- Purchases: **0**
- Deployment: **NO**
- Permission requests sent: **0**

## Final verdict

RIGHTS_CAN_POTENTIALLY_BE_CLEARED_BY_PERMISSION
