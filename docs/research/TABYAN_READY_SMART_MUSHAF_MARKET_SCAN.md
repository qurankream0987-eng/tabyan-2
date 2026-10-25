# Ready Smart Mushaf Market Scan for Tabyan

**Research date:** 2026-10-15  
**Depth:** Standard  
**Sources consulted:** 29  
**Decision scope:** Public evidence for a ready, rights-clear Smart Mushaf, or a ready Mushaf paired with a recitation provider. This is a research-only scan, not legal advice.

## Executive summary

No candidate found in this scan passes all four gates: a ready complete Mushaf, word-level interaction with hide/reveal or equivalent memorization support, clear rights for the exact text/layout/fonts/assets in commercial and app-store distribution, and a usable recitation provider under known terms. Three publicly installable renderers come closest technically: `qcf_quran_plus`, `quran_kit`, and Android-only `QuranSDK`. Their code licenses are identifiable, but those licenses do not clear their Quran text, fonts, page data, or audio. The captured package documentation also does not establish a complete hide/reveal flow or a tested recitation-provider integration. [[1]](https://pub.dev/packages/qcf_quran_plus) [[2]](https://pub.dev/packages/qcf_quran_plus/license) [[3]](https://pub.dev/packages/quran_kit) [[4]](https://pub.dev/packages/quran_kit/license) [[5]](https://github.com/Mostafa-hashim-Quran-iqraa/QuranSDK) [[6]](https://raw.githubusercontent.com/Mostafa-hashim-Quran-iqraa/QuranSDK/main/LICENSE)

Nabr/QRC is the clearest documented external recitation provider found: it describes streaming assessment and a subscription API key. However, its public terms defer commercial terms, service levels, support, retention, and deployment to a separate agreement. Pairing Nabr with an available renderer therefore does not close the rights or integration gaps. [[7]](https://qurani.ai/en/docs/2-advanced-tools/qrc) [[8]](https://nabrquran.ai/en/terms) [[9]](https://nabrquran.ai/en/privacy)

Quran Foundation has the clearest public terms for displaying its own unmodified content in a monetized end-user app, subject to attribution, Content Sync, and other conditions. Its JavaScript starter is a working reader/search application, but the documentation does not establish it as a page-faithful Smart Mushaf with hide/reveal and live assessment. The closest integrated Flutter package, `quran_library`, includes Quran-Lab’s NPL-1.2 model license, which prohibits charging for the model or a feature it powers, including through paid access or advertising; its QUL/KFGQPC assets have separate terms. **Result: no rights-clear ready Smart Mushaf or B+C stack was verified.** [[10]](https://api-docs.quran.foundation/legal/developer-terms/) [[11]](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/) [[12]](https://api-docs.quran.foundation/docs/sdk/javascript/) [[13]](https://pub.dev/packages/quran_library) [[14]](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/assets/quran_lab/LICENSE-QuranLab-NPL-1.2.txt) [[15]](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/NOTICE)

## Background and decision test

“Ready Smart Mushaf” was treated as more than an Arabic Quran reader or a collection of Quran text. The relevant product needs a complete reading experience, a usable page/layout or equivalent Mushaf presentation, word-level interaction, and a documented way to hide or reveal recitation text. A recitation model or API is a separate component: it does not provide a Mushaf, layout, font, or content license.

Rights were assessed separately for code, Quran text, page layout/images, fonts, recordings, and models. An MIT or Apache code license is not evidence that bundled or downloaded Quran resources may be commercially redistributed. Likewise, permission to display text through an API does not establish permission to bundle page images or fonts. The scan used published documentation, licenses, and terms only; no vendor was contacted, no account or API key was created, no provider was called, and no model or asset package was downloaded.

The shortlist below is ranked by technical proximity, not by legal clearance or endorsement. Each item still fails at least one release gate.

## Key findings

### 1. Three installable renderers are credible technical leads, not cleared products

`qcf_quran_plus` is the closest page-rendering lead in the public Flutter packages reviewed. Its package page describes all 604 pages, word interactions, and iOS/Android support. Its MIT license applies to package code; the captured license and package evidence do not independently clear the QCF Quran/font assets. The package page does not document Web support or a complete hide/reveal recitation flow. [[1]](https://pub.dev/packages/qcf_quran_plus) [[2]](https://pub.dev/packages/qcf_quran_plus/license)

`quran_kit` is a broader mobile toolkit with reader/page-view screens, word-by-word data, audio, and 22 reciters. It does not list Web support. Its MIT code license is separate from the QFC4 fonts, text, word data, and recordings named by its package documentation. The captured evidence does not establish page-faithful 604-page rendering, hide/reveal, or rights to redistribute those resources. [[3]](https://pub.dev/packages/quran_kit) [[4]](https://pub.dev/packages/quran_kit/license)

`QuranSDK` documents 604-page canvas rendering and word/ayah highlighting for Android. It downloads database, JSON, and font resources separately at first run; Apache-2.0 covers the SDK source, not those separate assets. It is Android-only in the captured documentation, and no hide/reveal or provider integration is demonstrated. [[5]](https://github.com/Mostafa-hashim-Quran-iqraa/QuranSDK) [[6]](https://raw.githubusercontent.com/Mostafa-hashim-Quran-iqraa/QuranSDK/main/LICENSE)

| Technical rank | Candidate | What is documented | Gate still open |
|---|---|---|---|
| 1 | `qcf_quran_plus` | 604-page rendering, word interactions, iOS/Android. [[1]](https://pub.dev/packages/qcf_quran_plus) | Exact QCF assets' commercial/store rights; Web; hide/reveal; provider mapping. [[2]](https://pub.dev/packages/qcf_quran_plus/license) |
| 2 | `quran_kit` | Mobile reader/page view, word-by-word data, audio, 22 reciters. [[3]](https://pub.dev/packages/quran_kit) | Text/font/audio rights; Web; page-fidelity; hide/reveal; provider mapping. [[4]](https://pub.dev/packages/quran_kit/license) |
| 3 | `QuranSDK` | Android 604-page rendering, word/ayah highlights, runtime asset downloads. [[5]](https://github.com/Mostafa-hashim-Quran-iqraa/QuranSDK) | Downloaded data/font rights; iOS/Web; hide/reveal; provider mapping. [[6]](https://raw.githubusercontent.com/Mostafa-hashim-Quran-iqraa/QuranSDK/main/LICENSE) |

These are the three strongest installable renderer leads, not three verified Smart Mushaf products. The source pages do not show that any one package supplies all required hide/reveal and recitation behavior.

### 2. The clearest text permission does not solve the page-rendering problem

Quran Foundation’s developer terms allow applications to display unmodified QF content, including in monetized end-user apps, subject to conditions. The terms prohibit raw-content resale or redistribution. Offline Content Sync copies must be refreshed on the stated schedule, and its font/image bundling path requires an active developer account and attribution. Its official Content Sync materials expose Quran text, Mushaf page mappings, and positioned words, while its font guide distinguishes ordinary Unicode fonts from QCF page fonts. These are useful building blocks, but they do not turn the documented JavaScript starter into a ready Smart Mushaf with live hide/reveal assessment. [[10]](https://api-docs.quran.foundation/legal/developer-terms/) [[11]](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/) [[16]](https://api-docs.quran.foundation/docs/tutorials/fonts/font-rendering/) [[12]](https://api-docs.quran.foundation/docs/sdk/javascript/)

Tanzil offers a narrower but clear route for Quran text: verbatim use in an application with attribution and a link, without altering the text. That license does not supply a reader, printed-page layout, or font. AlQuran.cloud’s terms separately permit commercial text reproduction with acknowledgement, but its text comes from multiple upstream sources. Its audio terms are not blanket commercial clearance: they describe non-commercial rights by default and mention commercial bundling subject to the reciters’ rights and possible removal. [[17]](https://tanzil.net/docs/text_license) [[18]](https://alquran.cloud/terms-and-conditions)

QUL states that commercial projects may use its data only subject to each resource’s own license. The QPC V4 Tajweed resource page identifies the font and download formats, but the captured page does not provide its per-resource commercial grant. The `quran_library` notice likewise says its MIT code license excludes QUL/KFGQPC assets and points back to upstream terms. Therefore, neither a package’s code license nor QUL’s general commercial-use FAQ clears the exact page/font files for Tabyan’s distribution. [[19]](https://qul.tarteel.ai/faq) [[20]](https://qul.tarteel.ai/resources/font/240) [[15]](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/NOTICE)

Quran.ws is a promising technical architecture rather than a ready dependency. Its documentation describes 604-page data and word hit-testing/masking across several targets, but says its engine binaries and installable package are not published. Its license page separates MIT engine code and CC BY data from third-party KFGQPC page/font resources, and reproduces a KFGQPC statement that lists digital publishing and websites/software among allowed uses. That is promising, but this scan did not verify the mirrored statement directly with the rights holder or establish the precise commercial app-store and white-label scope, so it is not counted as conclusive clearance. [[21]](https://quran.ws/docs/reference/quran-engine/) [[22]](https://quran.ws/docs/reference/licensing/)

### 3. Nabr is a provider candidate, but not yet a rights-cleared provider

Nabr/QRC documents a streaming WebSocket assessment flow, MessagePack payloads, result fields, and a subscription API key. Its public terms defer commercial terms, service levels, support, retention, and deployment details to a separate agreement. The privacy summary leaves subprocessors and processing region unstated. This makes Nabr a technically credible provider lead, but the public evidence is not enough to approve commercial use or user-audio handling in Tabyan. No API request or vendor contact was made. [[7]](https://qurani.ai/en/docs/2-advanced-tools/qrc) [[23]](https://nabrquran.ai/en/api) [[8]](https://nabrquran.ai/en/terms) [[9]](https://nabrquran.ai/en/privacy)

The latest official Tarteel API answer located in this scan is dated 2025-09-27 and says there is no public developer API. A targeted October 2026 news search did not surface a newer official API announcement. QUL is a resource library and its FAQ also says it has no API; neither is a substitute for a live recitation-assessment SDK. This is a bounded search finding, not proof that no private partnership exists. [[24]](https://support.tarteel.ai/en/articles/12414464-do-you-have-an-api-i-can-use) [[19]](https://qul.tarteel.ai/faq)

Quran Muaalem is an engine-only lead, not a hosted live provider. Its Python documentation describes batched waveform inference and phoneme/sifat outputs. The project code is MIT, but the visible model card is autogenerated and leaves license/training details blank, and the dataset card does not establish commercial training or source-audio redistribution rights. No hosted inference provider was documented in the captured model page. [[25]](https://obadx.github.io/quran-muaalem/en/muaalem/python-api.html) [[26]](https://obadx.github.io/quran-muaalem/en/appendix/license.html) [[27]](https://huggingface.co/obadx/muaalem-model-v3_2) [[28]](https://huggingface.co/datasets/obadx/muaalem-annotated-v3)

### 4. The best integrated technical near-match is blocked by its model terms

`quran_library` 5.0.1 documents QPC V4 reading, word interactions, and built-in Tasmee. Its current README says Tasmee is unavailable on Web and identifies Quran-Lab Zipformer as the default live engine. The repository’s MIT license covers its code, but its notice keeps QUL/KFGQPC resource terms separate. More decisively, the included Quran-Lab NPL-1.2 prohibits charging for the model, access to it, or any feature it powers; it specifically includes paid features and advertising. A monetized Tabyan recitation feature is therefore not cleared by this package’s code license. [[13]](https://pub.dev/packages/quran_library) [[29]](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/LICENSE) [[15]](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/NOTICE) [[14]](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/assets/quran_lab/LICENSE-QuranLab-NPL-1.2.txt)

This exclusion is about the model-powered feature and its terms; it is not a general judgment about the whole package or the upstream Quran resources. The exact QUL/KFGQPC assets remain a separate unresolved rights question.

### 5. The B+C alternative does not pass

Pairing each of the three ranked renderers with Nabr is a plausible architecture to investigate only after rights and commercial terms are resolved. It is not a ready, cleared stack today: the renderer assets remain unresolved, Nabr’s commercial contract is not public, and no candidate/provider word-index mapping has been tested. Shared labels such as surah, ayah, and word position do not prove that the renderer and provider use the same canonical word sequence. [[1]](https://pub.dev/packages/qcf_quran_plus) [[3]](https://pub.dev/packages/quran_kit) [[5]](https://github.com/Mostafa-hashim-Quran-iqraa/QuranSDK) [[7]](https://qurani.ai/en/docs/2-advanced-tools/qrc) [[8]](https://nabrquran.ai/en/terms)

The Quran Foundation starter plus its permitted content path plus Nabr is the strongest rights-oriented B+C comparison. QF’s terms support conditional in-app display, and its docs expose page/position data, but the starter is documented as a reader/search app rather than a page-faithful Smart Mushaf with hide/reveal. Nabr’s separate commercial and privacy terms remain unresolved. It therefore does not meet the ready-Smart-Mushaf gate. [[10]](https://api-docs.quran.foundation/legal/developer-terms/) [[12]](https://api-docs.quran.foundation/docs/sdk/javascript/) [[11]](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/) [[8]](https://nabrquran.ai/en/terms) [[9]](https://nabrquran.ai/en/privacy)

## Analysis

The market separates into three categories that should not be conflated. First are renderer packages with useful page and word behavior, but incomplete rights chains for bundled or downloaded resources. Second are content providers with comparatively clear conditions for displaying text, but no ready Smart Mushaf product. Third are recitation services or model projects whose commercial and privacy terms do not automatically cover the renderer’s content or fonts. Combining one item from each category does not make the combined stack rights-clear unless every asset and service is covered.

The strongest public code evidence is not the strongest rights evidence. `qcf_quran_plus` and `QuranSDK` describe the page behavior Tabyan would want, but their licenses apply to source code while the exact Quran assets need independent clearance. Quran Foundation’s app-display terms are more actionable, but its ready starter does not document the interaction and page-faithfulness gate. `quran_library` reduces integration work but introduces a model license that blocks charging for the feature it powers. These are independent blockers; resolving only one does not change the overall decision.

For B+C, Nabr is preferable to treating a generic transcription model as a ready recitation product because it documents Quran-oriented streamed assessment. But technical documentation is not a commercial grant or a privacy/data-processing agreement. Conversely, a rights-clear text source such as Tanzil is not a live recitation provider. A viable stack would need written scope for app-store distribution, monetization, redistribution, provider processing, and any white-label rights, followed by a technical test of canonical word alignment. None of those steps was performed in this research-only scan.

Commercial or store distribution is therefore not asserted to be prohibited for every candidate. The result is narrower: the evidence captured here does not establish a complete, ready stack with all required rights. Unknown remains unknown; code-package licenses are not used as a substitute for asset or model licenses.

## Limitations

This is a public-source snapshot dated 2026-10-15. Package pages and vendor terms can change. Some product and resource pages are maintained by their publishers and were not independently audited. The exact rights grant for QUL/KFGQPC page images and fonts, QFC4 assets, downloaded audio, and some package data was not located. Nabr’s signed commercial agreement and word-index compatibility were unavailable without separate approval and testing. No vendor was contacted; no accounts, provider calls, downloads, purchases, app changes, or legal review were made.

## Recommendation

Do not select or integrate a candidate from this scan as a rights-cleared Smart Mushaf. Keep the three ranked renderer packages as technical leads only. Treat `quran_library` as excluded for monetized Tasmee under its included NPL-1.2 model terms unless an authoritative license change is obtained. Treat Quran Foundation as a possible content/reader building-block route, not a ready Smart Mushaf.

If this decision is reopened, the minimum evidence needed is: (1) written rights for the exact page layout, text, and fonts distributed on Web, iOS, and Android, including monetization, app-store distribution, attribution, and white-label scope; (2) Nabr’s applicable commercial and privacy terms, including audio retention, subprocessors, processing region, and support; and (3) a no-production technical proof that the selected renderer’s canonical word indices align with the provider’s result positions and support the required hide/reveal behavior. These were not requested or carried out in this scan.

## Sources

1. [qcf_quran_plus — Flutter package](https://pub.dev/packages/qcf_quran_plus) — Published 2026-10-14, Tier 2; [saved capture](research/sources/market-qcf-quran-plus.md).
2. [qcf_quran_plus 0.1.1 License — pub.dev](https://pub.dev/packages/qcf_quran_plus/license) — Published 2026-10-14, Tier 2; [saved capture](research/sources/market-qcf-plus-license.md).
3. [quran_kit — Flutter package](https://pub.dev/packages/quran_kit) — Published 2026-03-15, Tier 2; [saved capture](research/sources/market-quran-kit-pub.md).
4. [quran_kit 0.2.0 License — pub.dev](https://pub.dev/packages/quran_kit/license) — Published 2026-03-15, Tier 2; [saved capture](research/sources/market-quran-kit-license.md).
5. [QuranSDK — Android Mushaf rendering SDK](https://github.com/Mostafa-hashim-Quran-iqraa/QuranSDK) — Published date not stated, Tier 2; [saved capture](research/sources/market-quran-sdk-android.md).
6. [QuranSDK License — GitHub](https://raw.githubusercontent.com/Mostafa-hashim-Quran-iqraa/QuranSDK/main/LICENSE) — Published date not stated, Tier 2; [saved capture](research/sources/market-quran-sdk-license.md).
7. [Nabr — Real-Time Recitation Correction API — Qurani.ai Docs](https://qurani.ai/en/docs/2-advanced-tools/qrc) — Published date not stated, Tier 3; [saved capture](research/sources/qurani-ai-qrc-technical-docs.md).
8. [Terms and Acceptable Use for Nabr](https://nabrquran.ai/en/terms) — Published 2026-05-05, Tier 3; [saved capture](research/sources/nabrquran-terms.md).
9. [Privacy Policy for Nabr](https://nabrquran.ai/en/privacy) — Published 2026-05-05, Tier 3; [saved capture](research/sources/nabrquran-privacy.md).
10. [Quran Foundation Developer Terms of Service](https://api-docs.quran.foundation/legal/developer-terms/) — Published 2026-10-11, Tier 1; [saved capture](research/sources/market-qf-terms.md).
11. [Getting Started with Content Sync — Quran Foundation](https://api-docs.quran.foundation/docs/tutorials/content-sync/getting-started/) — Published date not stated, Tier 1; [saved capture](research/sources/market-qf-content-sync.md).
12. [JavaScript SDK — Quran Foundation Documentation Portal](https://api-docs.quran.foundation/docs/sdk/javascript/) — Published date not stated, Tier 1; [saved capture](research/sources/market-qf-js-sdk.md).
13. [quran_library 5.0.1 — Flutter package](https://pub.dev/packages/quran_library) — Published 2026-09-23, Tier 2; [saved capture](research/sources/market-quran-library-pub.md).
14. [Quran-Lab No-Profit License NPL-1.2](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/assets/quran_lab/LICENSE-QuranLab-NPL-1.2.txt) — Published 2026, Tier 1; [saved capture](research/sources/market-quran-library-npl12.md).
15. [quran_library NOTICE: Additional Terms for QCF Fonts and QUL Resources](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/NOTICE) — Published date not stated, Tier 2; [saved capture](research/sources/market-quran-library-notice.md).
16. [Integrating Quran Font Rendering — Quran Foundation](https://api-docs.quran.foundation/docs/tutorials/fonts/font-rendering/) — Published date not stated, Tier 1; [saved capture](research/sources/market-qf-font-guide.md).
17. [Text License — Tanzil Documents](https://tanzil.net/docs/text_license) — Published date not stated, Tier 1; [saved capture](research/sources/market-tanzil-text-license.md).
18. [Terms and Conditions — AlQuran.cloud](https://alquran.cloud/terms-and-conditions) — Published 2026-06-14, Tier 1; [saved capture](research/sources/market-alqurancloud-terms.md).
19. [Frequently Asked Questions — Quranic Universal Library](https://qul.tarteel.ai/faq) — Published date not stated, Tier 1; [saved capture](research/sources/market-qul-faq.md).
20. [QPC V4 Tajweed Font Resource 240 — QUL](https://qul.tarteel.ai/resources/font/240) — Published date not stated, Tier 1; [saved capture](research/sources/market-qul-font-v4-240.md).
21. [Quran Engine — Quran.ws](https://quran.ws/docs/reference/quran-engine/) — Published date not stated, Tier 2; [saved capture](research/sources/market-quran-engine-guide.md).
22. [Licensing — Quran.ws](https://quran.ws/docs/reference/licensing/) — Published date not stated, Tier 2; [saved capture](research/sources/market-quran-engine.md).
23. [Quran Recitation API for Developers — Nabr](https://nabrquran.ai/en/api) — Published date not stated, Tier 3; [saved capture](research/sources/nabrquran-api-page.md).
24. [Do you have an API I can use? — Tarteel Help Center](https://support.tarteel.ai/en/articles/12414464-do-you-have-an-api-i-can-use) — Published 2025-09-27, Tier 1; [saved capture](research/sources/tarteel-help-api).
25. [Python API — Quran Muaalem](https://obadx.github.io/quran-muaalem/en/muaalem/python-api.html) — Published date not stated, Tier 3; [saved capture](research/sources/market-muaalem-python-api.md).
26. [License — Quran Muaalem](https://obadx.github.io/quran-muaalem/en/appendix/license.html) — Published date not stated, Tier 3; [saved capture](research/sources/market-muaalem-license.md).
27. [obadx/muaalem-model-v3_2 — Hugging Face model card](https://huggingface.co/obadx/muaalem-model-v3_2) — Published date not stated, Tier 3; [saved capture](research/sources/market-muaalem-model.md).
28. [obadx/muaalem-annotated-v3 — Hugging Face dataset card](https://huggingface.co/datasets/obadx/muaalem-annotated-v3) — Published date not stated, Tier 3; [saved capture](research/sources/market-muaalem-dataset.md).
29. [quran_library License — GitHub](https://raw.githubusercontent.com/alheekmahlib/quran_library/main/LICENSE) — Published date not stated, Tier 2; [saved capture](research/sources/market-quran-library-license.md).

