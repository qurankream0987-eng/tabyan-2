# Tabyan Rights-Clear Mushaf Renderer Selection

**Research date:** 2026-10-15  
**Scope:** Renderer-only rights and readiness check following the accepted market scan  
**Shortlist:** Three serious technical leads; none passes every required gate  
**Legal note:** This is a public-source review, not legal advice.

## Decision summary

No reviewed renderer has public evidence that clears every required component—Quran text, page layout, fonts, commercial use, and redistribution—for Tabyan's Web and mobile distribution. A package's MIT, Apache, or GPL code license does not automatically license bundled Quran data, page artwork, or fonts. Where terms are missing or conflict, the status below is **UNKNOWN**, which fails the user's hard gate.

This re-evaluation treats recognition/provider functionality as out of scope. It did not repeat the broad market scan. The source-holder evidence shows a useful technical route in `quran_library`, but its exact QUL/KFGQPC resource rights remain unproven. The other mobile package lacks a documented Web target. The Quran.com source ecosystem is split across separate applications and has unresolved or conflicting rights evidence for the exact resources and commercial reuse.

## Status definitions

- **CLEAR:** published evidence covers the exact component and required commercial/app-distribution use.
- **UNKNOWN:** the exact grant is missing, resource provenance is not mapped, or published statements conflict.
- **BLOCKED:** the available terms expressly prohibit a required use.

Code, Quran text, page layout, and fonts are evaluated separately. Rights for one do not substitute for another.

## Candidate 1 — `quran_library` 5.0.1, renderer-only

**NAME:** `quran_library` 5.0.1 (renderer surface only)  
**URL:** https://pub.dev/packages/quran_library  
**TECH:** Flutter reader with QPC V4 page rendering, Quran navigation, and word interactions; the package listing documents Web, iOS, and Android targets. The renderer can be assessed separately from any provider functionality. [1][2][3]

**WEB:** Yes  
**IOS:** Yes  
**ANDROID:** Yes  
**COMPLETE_QURAN:** YES — package documentation describes complete Mushaf reading/page data. [1]  
**WORD_IDENTITY:** YES — word interactions are documented; cross-provider canonical-index equivalence is not established. [1]  
**PAGE_LAYOUT:** YES — QPC V4 Mushaf page rendering is documented. [1]

**QURAN_TEXT_RIGHTS:** UNKNOWN — code and QUL/KFGQPC data are separately licensed; the exact text resource grant is not established. [2][3][4]  
**FONT_RIGHTS:** UNKNOWN — the package notice excludes upstream font/resource rights from its MIT code license, and the QPC V4 resource page does not provide the required per-resource commercial redistribution grant. [3][4][5]  
**LAYOUT_RIGHTS:** UNKNOWN — QPC/KFGQPC page assets are not cleared by the package's code license; no direct, resource-specific grant for commercial app distribution was verified. [3][4][5]  
**COMMERCIAL_USE:** UNKNOWN — the code license is not the asset license; QUL's general statement makes commercial use subject to each resource's terms. [2][3][5]  
**REDISTRIBUTION:** UNKNOWN — no exact grant for bundling the text, page layout, and fonts in Tabyan was found. [3][4][5]  
**TABYAN_REBRANDING:** CLEAR for the MIT-licensed code only; UNKNOWN for the bundled/upstream resources. [2][3]  
**INTEGRATION_COMPLEXITY:** MEDIUM — a Flutter renderer is available across the required targets, but the exact resource licensing and stable provider-to-word mapping would need resolution first.

**Disposition:** Best platform/feature fit among the package candidates, but it fails the hard rights gate on text, fonts, layout, commercial use, and redistribution.

## Candidate 2 — `qcf_quran_plus`

**NAME:** `qcf_quran_plus`  
**URL:** https://pub.dev/packages/qcf_quran_plus  
**TECH:** Flutter package documenting all 604 QCF pages and word interactions. Its package listing supports iOS and Android; Web is not listed. [6][7]

**WEB:** No documented target  
**IOS:** Yes  
**ANDROID:** Yes  
**COMPLETE_QURAN:** YES — 604 pages are documented. [6]  
**WORD_IDENTITY:** YES — word interactions are documented; canonical mapping to a separate provider is unverified. [6]  
**PAGE_LAYOUT:** YES — the package renders QCF page layouts. [6]

**QURAN_TEXT_RIGHTS:** UNKNOWN — the package license is for code and does not establish the exact Quran-text grant. [6][7]  
**FONT_RIGHTS:** UNKNOWN — the package license does not clear the QCF font assets. [6][7]  
**LAYOUT_RIGHTS:** UNKNOWN — the exact page/layout redistribution grant is not established. [6][7]  
**COMMERCIAL_USE:** UNKNOWN — MIT code rights do not establish commercial rights for the Quran resources. [7]  
**REDISTRIBUTION:** UNKNOWN — no exact app-integrated distribution grant for the page/font/text assets was found. [6][7]  
**TABYAN_REBRANDING:** CLEAR for the MIT-licensed package code only; UNKNOWN for its Quran resources. [7]  
**INTEGRATION_COMPLEXITY:** HIGH — it lacks a documented Web target, and the asset-rights and cross-provider word mapping gaps remain.

**Disposition:** Mobile-only in the captured documentation and not rights-cleared. It cannot serve as the selected cross-platform renderer without a separately approved Web renderer, which would add another unverified rights chain.

## Candidate 3 — Quran.com reader source ecosystem

**NAME:** Quran.com Web frontend + QuranEngine iOS + Quran for Android (separate projects, not one shared renderer package)  
**URLS:**  
- Web v2: https://github.com/quran/quran.com-frontend-v2  
- Current Web frontend: https://github.com/quran/quran.com-frontend-next  
- iOS: https://github.com/quran/quran-ios  
- Android: https://github.com/quran/quran_android

**TECH:** The archived Web v2 repository contains Mushaf page, word-position, page-controller, and word-controller sources. QuranEngine is an iOS Swift Package; Quran for Android is a separate Android application. The Web v2 repository is archived and its README conflicts with the GPL-3 license about material gain. The current Web repository is active, but its README's MIT badge points to a missing `LICENSE.txt`, the GitHub metadata reports no license, and the README says copying the code is unacceptable. [10][11][12][13][14]

**WEB:** Yes, but the archived v2 has conflicting terms; the current frontend's reuse rights are not established  
**IOS:** Yes, as a separate QuranEngine library  
**ANDROID:** Yes, as a separate Android application  
**COMPLETE_QURAN:** YES — the projects power complete Quran reading experiences. [11][15][18]  
**WORD_IDENTITY:** NO — Web v2 and Android have word-position/alignment components, but a shared canonical word-identity contract across Web, iOS, and Android is not documented. [12][28]  
**PAGE_LAYOUT:** YES — page-level reader components and Quran page-image sources are documented. [12][15][18][20]

**QURAN_TEXT_RIGHTS:** UNKNOWN — the apps identify multiple upstream data sources and defer to their individual terms. Quran Foundation's content terms are conditional and do not prove that these exact repositories' local/bundled resources are covered. [8][9][15][18]  
**FONT_RIGHTS:** UNKNOWN — the Quran.com image repository says its code is GPL but that its actual fonts and pages belong to King Fahd Quran Complex. The exact commercial redistribution grant for the resources used by these applications was not verified directly with the rights holder. [15][20]  
**LAYOUT_RIGHTS:** UNKNOWN — page artwork/layout resources are distinct from the open-source renderer code; exact commercial app-distribution rights were not proven. [15][18][20]  
**COMMERCIAL_USE:** UNKNOWN — the Web v2 and Android READMEs request non-profit/no-material-gain use despite GPL-3 headers; the current Web frontend has no clear license file. The iOS code's Apache-2.0 license does not clear separate content assets. [11][14][16][18][19]  
**REDISTRIBUTION:** UNKNOWN — separate projects and data authors' terms do not establish redistribution of the exact Quran pages, fonts, and text in a Tabyan app. [15][18][20]  
**TABYAN_REBRANDING:** UNKNOWN — the iOS code is Apache-2.0, but the Web and Android reuse statements conflict or are incomplete, and content/brand assets remain separate. [11][14][16][18][19]  
**INTEGRATION_COMPLEXITY:** HIGH — separate Web/iOS/Android codebases, no shared renderer interface or verified canonical word-position contract, and unresolved asset rights.

**Disposition:** Technically mature as a family of products, but not a ready single renderer to embed. The mixed code licenses, conflicting README restrictions, and separate page/font/data rights do not prove Tabyan's required commercial redistribution scope.

## Narrow search and screened alternatives

- The targeted Quran.com repository review found useful page/word rendering code, but no single cross-platform renderer license/resource chain. The active Web repository is not clearly licensed, and the Android/iOS projects identify separate data rights. [10]–[20]
- A narrow GitHub renderer query surfaced a single-line Remotion package using QUL page fonts, not a complete navigable Quran renderer; its MIT code license does not license those fonts. [25]
- `quran.ws` documents multi-target page/word rendering and clear licenses for some of its own code/data, but says its engine binaries and installable package are not published. Its KFGQPC rights statement is mirrored rather than directly verified with the rights holder, so it is neither a ready dependency nor a fully proven commercial/app-store grant. [21][22]
- The previously shortlisted `quran_kit` and Android `QuranSDK` do not close the platform gate: the package listing omits Web for `quran_kit`, while `QuranSDK` is Android-only in the captured documentation. Their exact resource rights remain unresolved. [23][24][26][27]

The official KFGQPC domain was not reachable from this research environment during the targeted check (HTTP 000). Therefore, the mirrored KFGQPC usage statement was not treated as direct rights-holder confirmation. No vendor was contacted.

## Safety status

- Old Mushaf patching: **NO**
- QCF v2 fallback: **NO**
- Authentication: **NO**
- Nabr/QRC live calls: **NO**
- Model download: **NO**
- Quran asset download: **NO**
- Database mutation: **0**
- Deployment: **NO**
- App implementation: **NO**
- External paid API/service: **NO**
- Public research traffic: unauthenticated, read-only GitHub metadata/repository requests and published documentation only

## Sources

1. [quran_library 5.0.1 — Flutter package](https://pub.dev/packages/quran_library) — [saved capture](sources/market-quran-library-pub.md).
2. [quran_library License — GitHub](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/LICENSE) — [saved capture](sources/market-quran-library-license.md).
3. [quran_library NOTICE: QCF Fonts and QUL Resources](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/NOTICE) — [saved capture](sources/market-quran-library-notice.md).
4. [QPC V4 Tajweed Font Resource 240 — QUL](https://qul.tarteel.ai/resources/font/240) — [saved capture](sources/market-qul-font-v4-240.md).
5. [Frequently Asked Questions — Quranic Universal Library](https://qul.tarteel.ai/faq) — [saved capture](sources/market-qul-faq.md).
6. [qcf_quran_plus — Flutter package](https://pub.dev/packages/qcf_quran_plus) — [saved capture](sources/market-qcf-quran-plus.md).
7. [qcf_quran_plus License — pub.dev](https://pub.dev/packages/qcf_quran_plus/license) — [saved capture](sources/market-qcf-plus-license.md).
8. [Quran Foundation Developer Terms of Service](https://api-docs.quran.foundation/legal/developer-terms/) — [saved capture](sources/market-qf-terms.md).
9. [Getting Started with Content Sync — Quran Foundation](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/) — [saved capture](sources/market-qf-content-sync.md).
10. [Quran.com Web v2 repository metadata](https://api.github.com/repos/quran/quran.com-frontend-v2) — [saved capture](sources/renderer-qurancom-v2.md).
11. [Quran.com Web v2 README](https://raw.githubusercontent.com/quran/quran.com-frontend-v2/master/README.md) — [saved capture](sources/renderer-qurancom-v2.md).
12. [Quran.com Web v2 source tree](https://api.github.com/repos/quran/quran.com-frontend-v2/git/trees/master?recursive=1) — [saved capture](sources/renderer-qurancom-v2.md).
13. [Quran.com current Web repository metadata](https://api.github.com/repos/quran/quran.com-frontend-next) — [saved capture](sources/renderer-qurancom-next.md).
14. [Quran.com current Web README](https://raw.githubusercontent.com/quran/quran.com-frontend-next/production/README.md) — [saved capture](sources/renderer-qurancom-next.md).
15. [QuranEngine iOS README](https://raw.githubusercontent.com/quran/quran-ios/main/README.md) — [saved capture](sources/renderer-quran-engine-ios.md).
16. [QuranEngine iOS License](https://raw.githubusercontent.com/quran/quran-ios/main/LICENSE) — [saved capture](sources/renderer-quran-engine-ios.md).
17. [QuranEngine iOS repository metadata](https://api.github.com/repos/quran/quran-ios) — [saved capture](sources/renderer-quran-engine-ios.md).
18. [Quran for Android README](https://raw.githubusercontent.com/quran/quran_android/main/README.md) — [saved capture](sources/renderer-quran-android.md).
19. [Quran for Android License](https://raw.githubusercontent.com/quran/quran_android/main/LICENSE) — [saved capture](sources/renderer-quran-android.md).
20. [Quran.com image generator README](https://raw.githubusercontent.com/quran/quran.com-images/master/README.md) — [saved capture](sources/renderer-quran-images.md).
21. [Quran Engine — Quran.ws](https://quran.ws/docs/reference/quran-engine/) — [saved capture](sources/market-quran-engine-guide.md).
22. [Licensing — Quran.ws](https://quran.ws/docs/reference/licensing/) — [saved capture](sources/market-quran-engine.md).
23. [quran_kit — Flutter package](https://pub.dev/packages/quran_kit) — [saved capture](sources/market-quran-kit-pub.md).
24. [QuranSDK — Android Mushaf rendering SDK](https://github.com/Mostafa-hashim-Quran-iqraa/QuranSDK) — [saved capture](sources/market-quran-sdk-android.md).
25. [Narrow GitHub Quran renderer search](https://api.github.com/search/repositories?q=Quran%20Mushaf%20renderer%20language%3ATypeScript%20license%3Amit&per_page=30) — [saved capture](sources/renderer-github-search.md).
26. [quran_kit License — pub.dev](https://pub.dev/packages/quran_kit/license) — [saved capture](sources/market-quran-kit-license.md).
27. [QuranSDK License — GitHub](https://raw.githubusercontent.com/Mostafa-hashim-Quran-iqraa/QuranSDK/main/LICENSE) — [saved capture](sources/market-quran-sdk-license.md).
28. [Quran for Android word-alignment source tree](https://api.github.com/repos/quran/quran_android/git/trees/main?recursive=1) — [saved capture](sources/renderer-quran-android.md).

## Final result

NO_RIGHTS_CLEAR_RENDERER_FOUND
