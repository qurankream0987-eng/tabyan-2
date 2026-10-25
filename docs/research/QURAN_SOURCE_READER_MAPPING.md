# Quran source reader mapping — Tabyan

**Reviewed:** 2026-10-12, Asia/Riyadh.  
**Requested reference:** Quran.com source architecture, not Tarteel screenshots.  
**Status:** Source study completed. Alternate renderer and real-route acceptance **NOT COMPLETED**. No application code, provider, database, Native or production changes made in this study.

## 1. Method and evidence limits

Inspected selected public source files remotely, including page/line grouping, page and line components, glyph and word components, chapter title/icon components, basmala composition, package metadata and README. No full repository clone, external project execution, dependency installation, Quran API call, Quran asset download or model call.

This extends `research/QURAN_COM_ECOSYSTEM_REUSE_AUDIT.md`. Its older font inspection is identified as prior evidence, not a new download or new exhaustive font review. The current source and legal terms were rechecked selectively.

Source provenance, renderer correctness and redistribution permission are three separate questions. A field called `code_v2` does not prove that an arbitrary font or page layout is compatible.

## 2. Source inventory

| Repository | Inspected branch / evidence | Safe conclusion |
|---|---|---|
| `quran/quran.com-frontend-next` | `production`; ReadingView/Page, Line, grouping helpers, PageContainer; QuranWord/GlyphWord and QuranWord; chapter header components; README and package.json | Source-based architectural reference. Not a drop-in reader for Tabyan and no direct code import authorized by this report. |
| `quran/quran.com-fonts` | `master`; actual `public/fonts/surah_names/` directory, plus prior exact TTF analysis | Surah-name assets exist; their specific reuse rights remain unverified. The requested `fonts/surah_names/` path is actually under `public/`. |
| `quran/api-js` | `main`; LICENSE, plus earlier SDK client/verses audit | SDK code is MIT. That does not license API data, fonts or audio. No installation needed for a local alternate renderer. |
| `quran/qf-api-docs` | `main`; current Developer Terms, plus earlier Content v4 contract audit | Official reference for API fields/access and conditional content rights. No live access or new integration established. |

### Licensing decisions

- Frontend `package.json` declares MIT and README displays an MIT badge. Its README also asks that the site/code not be copied; GitHub metadata did not identify a root license. This is **not a determination that the code is legally unusable**. It is an unresolved scope/permission question. Use architecture as reference and write original Tabyan code; do not copy components, SCSS or artwork.
- `api-js/LICENSE` contains MIT and its copyright notice. If substantially reused, keep the notice and license. This task does not need to import the SDK.
- The Surah-name folder contains `surah_names.ttf`, `.woff`, `.eot`, `.svg`, without a license sidecar in that directory. The earlier inspected TTF lacks license metadata. **Specific asset rights: UNVERIFIED; new import: BLOCKED.**
- Current QF Developer Terms allow conditional application display and conditional bundling of font/image files obtained through QF APIs or documented CDN URLs, with an active Developer Console account and attribution. This does **not** automatically cover every GitHub font. Tabyan's account status and the exact Surah-name font's coverage have not been established.
- Ordinary API content has a one-week storage limit unless an applicable exception applies. Resources supported by Content Sync must use that sync path for offline copies, with next sync at least every seven days when connectivity permits. Font/image bundling is not a blanket permission to ship a frozen corpus.
- Do not retroactively delete or rewrite Tabyan's existing snapshot. A separate legal/provenance review would be needed to establish its historic permission. This report does not certify that permission.

## 3. Mechanism-by-mechanism mapping

### 3.1 Quran pages

**QURAN.COM:** `groupPagesByVerses` groups verses by `pageNumber`. `PageContainer` resolves page indexes, fetches verses and filters each verse's words to the current page. This matters for ayahs spanning page boundaries. `Page` renders a page identifier, its grouped lines and a footer.  
**TABYAN CURRENT:** `loadPage` retrieves the existing local `{p,j,h,v}` snapshot; `MushafPage` renders a single page, using canonical verse keys and supplied word positions.  
**SAFE REUSE:** Separate page data acquisition from a pure page/line/word renderer, using Tabyan's existing data unchanged.  
**REQUIRES ADAPTATION:** QF verse/word objects must be adapted explicitly to the fixed Hafs/QCF v2 snapshot contract. New QF layouts may have different page boundaries.  
**DO NOT USE:** Reconstructing pages from screenshots, page images, or grouping a cross-page ayah as if every word belonged to its verse's page.

### 3.2 QCF fonts

**QURAN.COM:** `GlyphWord` selects `textCodeV1` or `textCodeV2` according to font choice and uses a page-specific font face. Before that font is loaded it displays `qpcUthmaniHafs` in a distinct fallback path. Its source also contains a browser-specific V1 ayah-marker spacing workaround.  
**TABYAN CURRENT:** Local `QCF2_p{page}` FontFace loaded from existing `mushaf/fonts/p{page}.woff2`; a local line measurement calibrates font size without rewriting glyphs. Distant font faces are released.  
**SAFE REUSE:** Page-aware font readiness, immutable glyph payloads and explicit failure states. Reuse the existing loaded font, not a newly downloaded font bundle.  
**REQUIRES ADAPTATION:** A new renderer must measure in its own rendered width after the correct font is ready. Keep page-to-font mapping exact; preserve QCF spacing contracts.  
**DO NOT USE:** Treating glyph code as semantic word identity, displaying PUA text with a generic Arabic fallback, copying a V1 workaround into V2, or transform-scaling the entire page to fake responsive layout.

### 3.3 Surah headers

**QURAN.COM:** `Page` adds a chapter header when the first verse starts a chapter. `Line` can also add one at a later chapter start; `pageHeaderChapterId` prevents duplicates. `ChapterIconContainer` composes the chapter icon and an optional Surah prefix.  
**TABYAN CURRENT:** The local line builder supplies structural header rows; `SurahHeaderFrame` uses existing Tabyan ornament and measured live title text.  
**SAFE REUSE:** Detect chapter starts from canonical metadata, with explicit handling for mid-page starts and duplicate prevention. Keep the current Tabyan header in the comparison if the new font is not cleared.  
**REQUIRES ADAPTATION:** Exact font asset, encoding and mapping must be approved together before replacing any title. The modern frontend and older font repository are not interchangeable.  
**DO NOT USE:** Inventing a new generic-font approximation and calling it the authentic QF header, or assuming an unverified PUA offset maps all 114 chapter names.

**Prior exact font evidence:** The older `surah_names.ttf` is an icon/PUA font; the modern frontend's Surah-name font uses a different encoding/ligature mechanism. The previous audit established the incompatibility. No new font was fetched here.

### 3.4 Basmala

**QURAN.COM:** `BismillahSection` omits the added basmala for chapters 1 and 9. `Bismillah` imports `public/bismillah.svg`. This is a separate artwork path, not proof of a QCF word identity.  
**TABYAN CURRENT:** Basmala is a structural display row using the existing Quran text/font path; canonical verse words remain separate.  
**SAFE REUSE:** Canonical chapter-based exceptions and separate decoration/display metadata.  
**REQUIRES ADAPTATION:** Distinguish Al-Fatihah's verse text from a separate pre-chapter basmala. Verify opening pages and At-Tawbah.  
**DO NOT USE:** Copying the external SVG without asset permission, inserting decorative basmala words into the AI corpus, or adding a basmala to At-Tawbah.

### 3.5 Ayah markers

**QURAN.COM:** Words have a `charTypeName` distinguishing words and end markers. Marker rendering and interactions are not inferred from the visible digit or pixel coordinates.  
**TABYAN CURRENT:** Tuples retain source character types: 0 word, 1 ayah marker, 2 other marker. Word spans expose `data-verse`, `data-pos`, `data-type`; markers can stay visible independently of word hiding.  
**SAFE REUSE:** Keep markers structurally typed and keep their canonical verse association.  
**REQUIRES ADAPTATION:** Preserve documented QDC quirks rather than “fixing” them based on visual assumptions.  
**DO NOT USE:** Counting every glyph/marker as a recited word, stripping markers, or changing source types without a verified correction.

### 3.6 Page boundaries

**QURAN.COM:** `PageContainer` filters words by `word.pageNumber`; line grouping includes both page and line. A verse key alone is not a sufficient grouping key.  
**TABYAN CURRENT:** Each snapshot explicitly belongs to a page. The recitation matcher separately maintains canonical words across page changes.  
**SAFE REUSE:** Page/line-aware display grouping and stable canonical semantic keys.  
**REQUIRES ADAPTATION:** Preserve the exact order and source positions when a verse continues on another page. The alternate view must not change the existing matcher/navigation pipeline.  
**DO NOT USE:** Resetting an AI session because a display component remounts, or deriving continuation from the final visible line alone.

### 3.7 Responsive width

**QURAN.COM:** `Page.module.scss` uses fit-content sizing, auto inline margins and a maximum inline size of 100%; `Line.module.scss` uses `--line-width` and centred RTL lines. Font/layout settings influence line-width classes; big-text/word-by-word layouts have a separate flow mode.  
**TABYAN CURRENT:** Mobile fitting follows available width and can scroll vertically; desktop uses the existing fitted paper dimensions. Existing user zoom has its own transform and gesture system.  
**SAFE REUSE:** A near-full-width phone page and a centred readable desktop width, with real font sizing and normal document geometry.  
**REQUIRES ADAPTATION:** Use ResizeObserver/font readiness against the actual available stage. Do not force a single 15-line height on all opening/short pages.  
**DO NOT USE:** Introducing transform-scale as the alternate renderer's fitting strategy. Do not remove existing user-controlled zoom; it is a separate feature.

### 3.8 Navigation

**QURAN.COM:** Source page identifiers, page footer and page index/lookup provide page-based navigation. Line DOM metadata records page/chapter/hizb; intersection observation tracks visible location.  
**TABYAN CURRENT:** Route `/student/mushaf-fahd`, local chapter/page/Juz index and existing `onNavigate`, last location and account-scoped bookmarks.  
**SAFE REUSE:** Keep navigation outside the renderer and preserve existing callbacks and page numbering.  
**REQUIRES ADAPTATION:** Continuous virtualized scrolling is not equivalent to Tabyan's current single-page gesture reader. It is not needed for this one safe alternate renderer.  
**DO NOT USE:** Importing Redux, Next.js routing, QF account/auth state or external bookmarks in place of Tabyan's account system.

### 3.9 Word highlighting

**QURAN.COM:** `QuranWord` uses `word.verseKey`, `word.position` and `word.location` for interactions/highlighting; glyph presentation is downstream. Highlighting is not based on text ink coordinates.  
**TABYAN CURRENT:** Canonical verse key and position drive committed/current word feedback, word hiding and reveal state; spans expose the same semantic identity to the reader's handlers.  
**SAFE REUSE:** Semantic identity carried through every rendered word, without changing the AI's normalized text or index.  
**REQUIRES ADAPTATION:** A comparison renderer must retain all existing DOM identity and hiding contracts. Until proved, keep recitation/test sessions on the current renderer; do not claim alternate-renderer AI support based on visual similarity.  
**DO NOT USE:** Glyph code, array offset after marker removal, bounding box or page image as AI identity.

### 3.10 Audio following

**QURAN.COM:** `Line` selects the active audio surah/ayah from an audio state machine, checks visibility, and conditionally scrolls the highlighted line. Word interaction references semantic location. This is reference-reciter playback.  
**TABYAN CURRENT:** Existing EveryAyah player supplies `audioVerseKey` to presentation; student recitation uses a different AI state path.  
**SAFE REUSE:** Feed the existing audio verse key into highlighting and optional local following, without changing the provider.  
**REQUIRES ADAPTATION:** Do not create a second audio player or change its lifecycle when switching views. A verse-level source cannot be represented as verified word-level timestamps.  
**DO NOT USE:** Treating reference playback/elapsed time as evidence of student recitation success, or changing OpenAI/Local Quran Whisper to implement a UI renderer.

## 4. Data adapter and provenance

Existing Tabyan source declarations:

- `scripts/download-mushaf.mjs`: QDC `/verses/by_page/{n}` with `code_v2`, `line_v2`, `position`, `char_type_name`; page-level Juz/Hizb; QCF v2 CDN source.
- `public/mushaf/quran-words/manifest.json`: declares “Quran Foundation QDC”, endpoint/query, Hafs, per-page word counts and SHA-256.
- `src/lib/mushaf/types.ts`: exact local tuple `[position, line, type, code]`, verse `{k,n,c,w}`, page `{p,j,h,v}`.

This establishes **recorded source provenance**, not a fresh comparison against current QF responses or proof of current redistribution rights.

The least-risk first alternate renderer can consume the **existing, unchanged local QDC-derived snapshot and existing local QCF v2 fonts**. It should be labelled as a source-architecture comparison, not as a new live QF API integration. Do not redownload/rebundle data or change the corpus.

For any future live QF input, explicitly verify Hafs, matching Mushaf/layout, `v2_page`, `code_v2`, `line_number` versus legacy `line_v2`, word type and canonical position. The Content API supports other layouts; a `page_number` alone does not establish compatibility. Confidential Content API credentials belong server-side. Adding such a service would exceed this task's frontend-only safe path.

Canonical identity at the display boundary:

```text
semantic key = (surah, ayah, source word position)
layout key   = (mushaf/layout, page, line)
font key     = (QCF version, page)
```

These keys must not be conflated. Preserve source positions without renumbering word tuples. Markers and decoration do not become new semantic words.

## 5. One safe alternate implementation boundary

Planned original component: `NewQuranFoundationRenderer`.

- Keep `MushafPage` and all current Quran assets in place.
- Add an independent page/line/word presentation path following the reviewed architecture, not a wrapper that merely changes the current page's border.
- Reuse existing local data/font loading and existing Tabyan header until external Surah-name asset permission is proved. Explicitly disclose that the authentic external header font is not imported.
- Add a **development-only** comparison selector on the real `/student/mushaf-fahd` reader: “Current Tabyan Mushaf” / “Quran Foundation Mushaf”, with local snapshot provenance visible.
- Production must retain the current renderer and not expose the selector. Do not publish.
- Block view changes during an active session. Keep AI/test modes on the current renderer until alternate word contracts are independently proved; no AI engine changes are needed.
- No database, Native, OpenAI, Local Quran Whisper, QuranNormalizer, QuranLiveMatcher or RecitationStateEngine changes.
- No new provider, SDK dependency, downloaded Quran assets, copied external frontend code, or transform-scale fitting.

**Current blocker:** A fresh implementation/design-assistant round and a signed-in browser acceptance pass have not been approved under the owner's unknown-cost gate. The earlier one-round approval was used for the Tarteel presentation pass and is not treated as permission for more agents/tests.

## 6. Acceptance — real route only

No disconnected component preview counts as final acceptance.

Required evidence after implementation, on authenticated `/student/mushaf-fahd`:

1. Screenshots at **390**, **430**, **1440** pixels, with the alternate choice and actual rendered reader visible.
2. Switch current → alternate → current without losing page, bookmark or account settings.
3. Opening pages 1/2; ordinary page 3; a mid-page chapter start; At-Tawbah; an ayah crossing a page.
4. Correct header/basmala exceptions, intact ayah markers, no missing words/PUA fallback and no horizontal overflow.
5. Each display word retains the exact canonical tuple and source glyph; neighbouring lines do not merge/reflow into different Quran positions.
6. Search/index page navigation and reference-audio highlight still use existing callbacks/state.
7. Switching is unavailable during an active recitation/test; existing renderer/AI paths remain unaffected.
8. Production selector absent by static DEV gating; no production publish/build required for this development task.

**Evidence captured so far for this task:** source study only. No real-route screenshots and no implemented alternate renderer. **Completion is not claimed.**

## 7. Source links

All frontend links below refer to the inspected `production` branch; these branches can change.

- [Page](https://github.com/quran/quran.com-frontend-next/blob/production/src/components/QuranReader/ReadingView/Page.tsx)
- [PageContainer / boundary filtering](https://github.com/quran/quran.com-frontend-next/blob/production/src/components/QuranReader/ReadingView/PageContainer.tsx)
- [groupPagesByVerses](https://github.com/quran/quran.com-frontend-next/blob/production/src/components/QuranReader/ReadingView/groupPagesByVerses.ts)
- [groupLinesByVerses](https://github.com/quran/quran.com-frontend-next/blob/production/src/components/QuranReader/ReadingView/groupLinesByVerses.ts)
- [Line / audio following / metadata](https://github.com/quran/quran.com-frontend-next/blob/production/src/components/QuranReader/ReadingView/Line.tsx)
- [Page layout SCSS](https://github.com/quran/quran.com-frontend-next/blob/production/src/components/QuranReader/ReadingView/Page.module.scss)
- [Line layout SCSS](https://github.com/quran/quran.com-frontend-next/blob/production/src/components/QuranReader/ReadingView/Line.module.scss)
- [GlyphWord](https://github.com/quran/quran.com-frontend-next/blob/production/src/components/dls/QuranWord/GlyphWord.tsx)
- [QuranWord](https://github.com/quran/quran.com-frontend-next/blob/production/src/components/dls/QuranWord/QuranWord.tsx)
- [ChapterTitle](https://github.com/quran/quran.com-frontend-next/blob/production/src/components/chapters/ChapterHeader/components/ChapterTitle.tsx)
- [ChapterIconContainer](https://github.com/quran/quran.com-frontend-next/blob/production/src/components/chapters/ChapterIcon/ChapterIconContainer.tsx)
- [BismillahSection](https://github.com/quran/quran.com-frontend-next/blob/production/src/components/chapters/ChapterHeader/components/BismillahSection.tsx)
- [Bismillah artwork import](https://github.com/quran/quran.com-frontend-next/blob/production/src/components/dls/Bismillah/Bismillah.tsx)
- [Surah-name font directory](https://github.com/quran/quran.com-fonts/tree/master/public/fonts/surah_names)
- [Frontend README](https://github.com/quran/quran.com-frontend-next/blob/production/README.md) / [package.json](https://github.com/quran/quran.com-frontend-next/blob/production/package.json)
- [SDK MIT license](https://github.com/quran/api-js/blob/main/LICENSE)
- [QF Content v4 contract — prior audit](https://github.com/quran/qf-api-docs/blob/main/openAPI/content/v4.json)
- [Current Developer Terms](https://github.com/quran/qf-api-docs/blob/main/src/pages/legal/developer-terms.mdx)
- [Prior exact font and ecosystem audit](./QURAN_COM_ECOSYSTEM_REUSE_AUDIT.md)
