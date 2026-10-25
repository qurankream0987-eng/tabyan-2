# Research Notes: Quran Recitation ASR Provider for Tabyan

**Status:** complete — Quick provider-offering update (2026-10-10)
**Depth:** Quick

## Plan

- **Question:** Which production-usable provider should Tabyan evaluate for live Quran recitation recognition?
- **Scope:** Verify Tarteel’s own public API/model offerings, compare hosted real-time Arabic ASR options, and check commercial rights/runtime constraints for Quran-tuned models. No integration or provider change.
- **Audience:** Tabyan product and engineering.
- **Deliverable:** Short Arabic recommendation with current official sources, limitations, and a safe evaluation path.

## Focus Areas

| # | Area | Status | Sources |
|---|---|---|---|
| 1 | Tarteel’s public API and Quran-specific models | complete | 4 saved documents |
| 2 | Hosted real-time Arabic ASR providers | complete | 10 saved documents |
| 3 | Quran-tuned/self-hosted model licensing and fit | complete | 6 saved documents |

## Coverage Checklist

- [x] Is there a documented public Tarteel API that third-party apps can use for live recitation?
- [x] Which hosted providers document Arabic streaming and partial/final transcripts?
- [x] Which Quran-specific models have a commercial license that covers the exact weights and data?
- [x] How do current options fit Tabyan’s existing WebSocket/session architecture and prior benchmark evidence?
- [x] What important Quran-recognition limitations remain even if Arabic speech recognition is available?
- [x] What provider should Tabyan evaluate next, and what must pass before any production switch?

## Findings Log

- **Tarteel API:** Tarteel Help Center’s 2025-09-27 answer says no public API is offered. Its separately documented MCP server exposes Quran-content tools, not a live audio-recognition contract. This does not rule out a later or private offering. Sources R01–R02.
- **Tarteel weights:** `whisper-base-ar-quran` is distributed as downloadable Whisper fine-tune weights; the repository declares Apache-2.0. The card reports WER 5.7544, leaves evaluation/training details incomplete, and showed no Hugging Face Inference Provider deployment when checked. Sources R03–R04.
- **Hosted ASR:** Google Cloud documents Chirp 3 streaming and lists `ar-SA` for Chirp 3 in EU/US regions; its `long`/`short` entries have different regions. This is generic Arabic recognition, not evidence of Quran-specific accuracy. Sources R07–R09.
- **Other hosted options:** OpenAI documents live transcript deltas and finals; Speechmatics documents preliminary partials but the reviewed Realtime page does not establish its Arabic locale; Azure lists `ar-SA` for some speech functions but the exact required live SDK path needs verification. Sources R05, R10–R12.
- **Commercial model fit:** WasimLHR’s model card restricts use to personal/educational/noncommercial unless permission is granted; Tadabur’s model and dataset declare CC BY-NC 4.0. These are not safe default choices for Tabyan commercial production. Sources R13–R16.
- **Tabyan decision:** Keep the implemented OpenAI path as the internal comparison/fallback, not as a formally approved provider. The strongest Quran-specific candidate to evaluate is a private GPU endpoint around Tarteel’s Apache-declared model; it is not a turnkey hosted streaming provider. No production route changed.

## Conflicts & Open Questions

- The Tarteel Help Center answer is from 2025. Ask Tarteel directly before ruling out a private, partner, or newly launched commercial API.
- Apache-2.0 is the Tarteel model repository’s declaration; it does not establish training-audio rights or resolve the license chain for converted/quantized derivatives.
- Quran-specific WER values are not comparable across these repositories because evaluation sets and protocols differ or are incomplete.
- The existing Tabyan comparison favors the OpenAI path over a local Tarteel conversion on one synthetic reciter only. It is a narrow internal result, not evidence of broad student performance.

## Gaps

- No matched, rights-cleared multi-reciter benchmark across current checkpoints and hosted candidates.
- No verified service-level latency, cost, quota, data-retention, or residency comparison for the exact commercial plans.
- Google’s language/model/region matrix must be checked against the exact chosen streaming recognizer and target region before integration.
- Tarteel’s current commercial API and the model’s training-data provenance remain unconfirmed.

## Deliverables

- `research/quran-recitation-asr-recommendation-ar.md` — Arabic recommendation and evidence.
- `research/sources.json` — source registry; saved source captures are in `research/sources/`.
- `research/quran-asr-provider-update-2026-10-10-ar.md` — current provider shortlist and recommendation.

## Follow-up research (2026-10-10)

- **Question:** Is there now a turnkey Quran-recitation recognition provider/API for Tabyan, especially Qurani.ai QRC or Tarteel itself?
- **Scope:** Recheck first-party API availability, Quran-specific live recognition, commercial access/pricing, and audio data handling. No integration, provider switch, or student-audio upload.
- **Audience:** Tabyan product and engineering.
- **Deliverable:** Concise Arabic shortlist and recommendation with verified source links, limitations, and vendor questions.

| # | Area | Status | Sources |
|---|---|---|---|
| 1 | Tarteel current API/partner offering | complete | 3 |
| 2 | Nabr/QRC API access, commercial terms, and privacy | complete | 7 |
| 3 | Quran.ai Recite and hosted alternatives | complete | 4 |

- [x] **Developer API:** Nabr documents a recitation API; Tarteel’s latest public no-API answer found is dated 2025-09-27. [@nabr-api] [@tarteel-api-faq]
- [x] **Live feedback:** Nabr/QRC documents WebSocket chunk streaming, Quran positions, missed words, and tajweed/pronunciation feedback; latency and accuracy remain vendor claims. [@nabr-api] [@nabr-qrc-docs]
- [x] **Commercial access:** Nabr’s terms allow Quran-learning use, but price, limits, SLA, support, and commercial terms require a separate agreement. [@nabr-terms] [@nabr-api]
- [x] **Audio governance:** Nabr says model improvement is permission-dependent and retention is customer-configured; subprocessors and processing region are not disclosed in the reviewed policy. [@nabr-privacy]
- [x] **Safe next step:** Contact Nabr for a demo and written terms; do not send student audio until retention, consent, processing region, and contract controls are confirmed. [@nabr-home] [@nabr-privacy] [@nabr-terms]

## Follow-up Findings Log

### Nabr / QRC

- Nabr’s product API page links to QRC documentation hosted on Qurani.ai. The technical docs describe a MessagePack WebSocket, streamed microphone chunks, Quran word positions, and correction events. Treat this as first-party documentation, not independent accuracy validation. [@nabr-api] [@nabr-qrc-docs]
- Nabr directs app teams to contact the vendor for price, limits, deployment, and commercial terms. The public terms permit intended Quran-learning workflows but defer commercial conditions, SLA, support, retention, and local deployment to a separate agreement. [@nabr-api] [@nabr-terms]
- The May 5, 2026 privacy summary says model/evaluation improvement depends on customer agreement, consent, or research permission and that retention is configured per customer; it does not state subprocessors or processing region. [@nabr-privacy]
- Nabr publishes internal data and performance claims on its research page. These are vendor-reported, not independently verified; do not use them as proof of Tabyan performance. [@nabr-research]
- Misraj AI’s September 10, 2026 article identifies Nabr as its Quran-recitation correction layer; the Nabr site provides `hello@misraj.ai` for integration and terms questions. [@misraj-nabr] [@nabr-home]

### Tarteel and other options

- Tarteel’s public API answer says it does not offer a public developer API, but it dates to September 27, 2025; its MCP documentation covers Quran tools, not audio recognition. A September 2026 partner story describes Tarteel’s own infrastructure, not a third-party API. [@tarteel-api-faq] [@tarteel-mcp-docs] [@tarteel-coreweave]
- The reviewed Quran.ai Recite page does not provide developer API documentation, so it is not a verified integration option in this search. [@quran-ai-recite]

## Follow-up Conflicts & Open Questions

- Nabr publishes latency, WER, and corpus claims, but no independent benchmark or full evaluation protocol was located. Treat all performance figures as vendor-reported. [@nabr-api] [@nabr-research]
- The Nabr privacy and terms pages are explicitly working summaries; obtain a signed data-processing agreement and deployment-specific commitments before sending any student audio. [@nabr-privacy] [@nabr-terms]
- Nabr's terms restrict public benchmarking, resale, sublicensing, and competitor-model training unless an agreement allows it; obtain written permission before publishing evaluation results. [@nabr-terms]
- Whether Nabr can meet Tabyan’s required region, retention/deletion, SLA, quota, cost, exact riwaya/level support, and child-consent requirements remains unconfirmed. [@nabr-api] [@nabr-privacy] [@nabr-terms]

## Follow-up Gaps

- Moved unresolved commercial, privacy, residency, and independent benchmark questions to the report’s Limitations section; evaluation remains blocked until written permissions and technical access are granted.

## Wave 2: Quran-specialized ASR checkpoint benchmark

**Status:** complete — feasibility review; no candidate inference
**Depth:** Quick

### Plan

- **Question:** Which currently available Quran-focused checkpoints merit a matched test against Tabyan’s Tarteel Whisper Base baseline, and can any run from its actual upstream weights in this environment?
- **Scope:** Research and benchmark-only. Use the same public Al-Mulk 67:1–3 Alafasy audio; no student audio, app/provider changes, Python configuration edits, database changes, deployment, or paid GPU.
- **Audience:** Tabyan product and engineering.
- **Deliverable:** A sourced candidate comparison, baseline metric correction, and explicit benchmark/blocker report.

### Coverage checklist

- [x] Verify candidate architecture, parameter and file size, training data, claimed metrics, license, and streaming mode from publisher cards.
- [x] Separate publisher/benchmark claims from results measured on Tabyan’s exact audio.
- [x] Check actual-upstream CPU feasibility; no candidate fit an authorized supported execution path, and no conversion was substituted.
- [x] Define orthography-sensitive WER and Tabyan-normalized Q-WER with their accepted spelling folds.
- [x] Record what was measured and what remains unmeasured: candidate accuracy, alignment, false positives, chunks, context carry, and runtime.

### Findings log

- Wasim Whisper Quran v1’s author reports 1.55B parameters, 6.17 GB weights, 5.74% released-checkpoint WER / 5.35% best-checkpoint WER on 115 examples, and CC-BY-NC-4.0. Its model card describes 5–10 second chunking, not stateful streaming. [@wave2-wasim-card] [@wave2-wasim-files]
- Wasim’s training card lists Alafasy among its reciter/style tracks; exact overlap with the public Al-Mulk test audio is unknown. The related dataset card does not establish audio rights. [@wave2-wasim-card] [@wave2-buraaq-dataset]
- The FastConformer offline and streaming cards report separate models and results; Quran-Lab documents the distinct 600-clip benchmark and its normalized scoring. These remain publisher claims, not Tabyan results. [@wave2-fastconformer-offline] [@wave2-fastconformer-streaming] [@wave2-quran-benchmark]
- Zipformer emits a finite phoneme alphabet and reports PER; it is not a normal Arabic word-transcript model. DeepDML reports text WER but does not supply enough evaluation detail to establish comparability. [@wave2-zipformer-v3] [@wave2-deepdml-card] [@wave2-deepdml-metadata]
- Corrected the existing provider comparison: 23.7% is Tabyan-normalized Q-WER; letter-form-preserving WER is 57.9% on the same 38 reference words. Neither number measures a new candidate. [Local baseline report]

### Conflicts & open questions

- All accuracy numbers for the candidate checkpoints are self-reported or from their authors’ benchmark; no candidate was run on the same Tabyan audio.
- Same-reciter overlap is possible for Wasim because both its reported training data and the test use Alafasy; exact audio overlap was not established.
- The FastConformer streaming card gives results for multiple contexts/cohorts; its headline figure and comparison table are not fully reconciled.
- DeepDML’s declared Apache-2.0 model license does not resolve rights to its upstream training audio.

### Limitations

- Wasim’s upstream weights exceed the workspace’s available memory. The gated FastConformer and Zipformer repositories returned HTTP 401 for file access. DeepDML was not loaded because a supported Transformers/PyTorch runtime is absent; no package install or project Python configuration change was made.
- Candidate inference, WER/PER on Tabyan’s sample, false-positive and alignment checks, latency/RSS, 2/5/10/15/30-second chunks, and cross-chunk context carry were not measured.
- All ten cited web sources are Tier 3 primary publisher/model/dataset pages. They establish what their authors claim, not independent accuracy or legal clearance.

### Deliverable

- `research/wave2-quran-asr-benchmark.md` — sourced feasibility review, candidate comparison, metric correction, and unmeasured-test list.

## Ready Smart Mushaf candidate search (2026-10-15)

**Status:** complete
**Depth:** Standard

### Plan

- **Question:** Is there a rights-clear, ready Smart Mushaf for Tabyan, or a cleanly compatible rights-clear Mushaf plus recitation-provider stack?
- **Scope:** Search public repositories, registries, official docs, commercial SDK/white-label offerings, and Tarteel/Nabr/Quran Muaalem/Quran Lab sources. Research only: no purchases, vendor contact, account creation, paid API calls, Nabr/QRC calls, model downloads, app/auth/database changes, or deployment.
- **Audience:** Tabyan product and engineering.
- **Deliverables:** `TABYAN_READY_SMART_MUSHAF_MARKET_SCAN.md` and `TABYAN_READY_SMART_MUSHAF_CANDIDATE_MATRIX.md`; shortlist no more than five candidates and give one final decision token.

### Focus Areas

| # | Area | Status | Sources |
|---|---|---|---|
| 1 | Public and commercial complete Mushaf/Smart Mushaf renderers | complete | 12 saved pages |
| 2 | Quran text, layout, font and distribution rights | complete | 10 saved pages |
| 3 | Tarteel, Nabr/QRC and other recitation/Tasmee providers | complete | 9 saved pages |
| 4 | Quran Muaalem, Quran Lab and other engine-only candidates | complete | 6 saved pages |
| 5 | Candidate compatibility, platform coverage and final shortlist | complete | 12 saved pages |

### Coverage checklist

- [x] Identify serious ready Smart Mushaf and ready-renderer candidates beyond GitHub.
- [x] Separate complete Mushaf, recitation engine, data/API, and research-only offerings.
- [x] Verify code, Quran text, layout, font and model rights independently from authoritative sources.
- [x] Verify commercial use, redistribution, Web, App Store, Play Store and white-label rights.
- [x] Verify public Tarteel SDK/API/enterprise/licensing evidence without assuming availability.
- [x] Evaluate documented Nabr/QRC and other provider fit without making live calls or contacting vendors.
- [x] Test whether a rights-clear ready Mushaf can pair cleanly with a ready recitation provider.
- [x] Rank at most five serious candidates and state the final decision token.

### Findings Log

#### Ready readers and renderers

- `qcf_quran_plus` documents all 604 pages, word interactions, and Android/iOS support; its MIT license covers code, while the QCF assets have no separate clearance in the package evidence. [@market-qcf-quran-plus] [@market-qcf-plus-license]
- `quran_kit` has a complete reader, page view, word-by-word data, and audio; it omits Web support and its MIT code license does not clear its fonts, text, word data, or recordings. [@market-quran-kit-pub] [@market-quran-kit-license]
- Android `QuranSDK` documents 604 pages and word-level highlights, but runtime DB/JSON/font downloads are separate from its Apache-2.0 code license. [@market-quran-sdk-android] [@market-quran-sdk-license]
- Itqan IMAD requires a separate 9,000+ page-image directory; its MIT code license does not grant image rights, and the reader has no demonstrated word hit-testing or hide/reveal. [@market-itqan-imad-repo] [@market-itqan-license]
- Quran.ws documents 604-page data and word hit-testing/masking across Web/Android/Flutter/React Native, but says the engine binaries and installable package are not published. Its licensing page mirrors a KFGQPC statement permitting digital publishing and software/web use; exact commercial app-store scope was not verified directly with the rights holder. [@market-quran-engine-guide] [@market-quran-engine-license]

#### Rights and integrated options

- Quran Foundation's Oct 11 terms allow monetized end-user apps to display unmodified QF content conditionally, but prohibit raw-data resale/redistribution, require Content Sync for offline copies, and condition font/image bundling on an active account and attribution. [@market-qf-terms] [@market-qf-content-sync]
- The QF JavaScript starter is a working reader/search app, not a documented page-faithful Smart Mushaf or Tasmee renderer. Its APIs and font guide are building blocks, not a ready hide/reveal product. [@market-qf-js-sdk] [@market-qf-font-guide]
- QUL says commercial use may be allowed resource by resource; the QPC V4 Tajweed font page captured here exposes download/usage instructions but no per-resource commercial license. Quran-library's notice also defers QCF rights to QUL and KFGQPC. [@market-qul-faq] [@market-qul-font-v4-240] [@market-quran-library-notice]
- Rechecked `quran_library` 5.0.1: it is the closest integrated page/word/Tasmee feature set, but its included Quran-Lab NPL-1.2 forbids charging for the model or any feature it powers, including ads; its QUL/KFGQPC assets remain separate. It is not recommended for a commercial stack. [@market-quran-library-pub] [@market-quran-library-license] [@market-quran-library-npl12]
- Tanzil grants verbatim Quran-text use in apps with attribution and a link, but does not provide a ready reader, printed-page layout, or font license. AlQuran.cloud says commercial text reproduction requires acknowledgement; its audio terms describe non-commercial rights by default but mention commercial bundling subject to the reciters' rights and possible removal. Its text has multiple upstream sources. [@market-tanzil-text-license] [@market-alqurancloud-terms]

#### Recitation providers and B+C test

- Nabr/QRC documents streamed WebSocket assessment and a subscription API key, but its working terms defer commercial terms, SLA, support, retention, and deployment to a separate agreement. No API call, account, or vendor contact was made. [@nabr-api] [@nabr-qrc-docs] [@nabr-terms] [@nabr-privacy]
- Tarteel's latest official public API answer found is dated 2025-09-27 and says there is no public developer API; the targeted October 2026 news search found no newer official API announcement. QUL is a resource library, not the missing live assessment SDK. [@tarteel-api-faq] [@market-qul-faq]
- Quran Muaalem is a Python batch inference package, not a ready hosted live provider. MIT code/model metadata does not establish the source-recording rights, and the model card leaves training details incomplete. [@market-muaalem-python-api] [@market-muaalem-license] [@market-muaalem-model] [@market-muaalem-dataset]
- No B+C stack passes: each public renderer either has unresolved Quran-resource rights or is not ready/page-faithful, while Nabr's commercial terms require a separate agreement. A matching `surah/ayah/word` shape is not proof of word-index alignment or a tested integration. [@market-qcf-quran-plus] [@market-quran-kit-pub] [@nabr-qrc-docs] [@nabr-terms]
- Smartech's public page describes an Android/iOS Quran-learning app but shows no embeddable SDK, current white-label offer, or distribution terms. [@market-smartech]

### Conflicts & Open Questions

- Code licenses and content licenses are separate: MIT/Apache on renderer code does not clear fonts, page images, Quran text, audio, or model-training recordings.
- QUL's general FAQ allows commercial use only subject to each resource's terms; the exact QPC/KFGQPC assets and app-store redistribution rights were not established.
- Quran Foundation's terms are clearer for in-app display than the renderer candidates' bundled assets, but its starter does not establish page-faithful layout, live word tracking, or hide/reveal.
- Nabr's API details are public, but commercial use, price, privacy commitments, and exact candidate word-index compatibility remain unverified.

### Gaps

- Filled: authoritative Tanzil text terms, current Quran Foundation developer terms, QUL's per-resource caveat, Nabr technical docs/working terms, and Quran-Lab NPL-1.2 were captured.
- Limitations: exact KFGQPC/QUL redistribution grant for each bundled page/font, per-asset terms for QFC4 and downloaded audio, Nabr's signed commercial agreement, and live word-index alignment remain unknown. Vendor contact, package/model downloads, API calls, and implementation were explicitly outside this scan.

### Deliverables

- `research/TABYAN_READY_SMART_MUSHAF_MARKET_SCAN.md`
- `research/TABYAN_READY_SMART_MUSHAF_CANDIDATE_MATRIX.md`

## Renderer-only rights follow-up (2026-10-15)

**Status:** complete  
**Depth:** focused follow-up; broad market scan not repeated

### Findings

- Re-evaluated `quran_library` as renderer-only across Web/iOS/Android. Its code license does not clear QUL/KFGQPC text, page layout, or fonts; per-resource commercial/app redistribution rights remain unknown. [@market-quran-library-pub] [@market-quran-library-license] [@market-quran-library-notice] [@market-qul-font-v4-240] [@market-qul-faq]
- `qcf_quran_plus` documents 604-page rendering and word interaction for iOS/Android, but no Web target or resource-specific rights grant. [@market-qcf-quran-plus] [@market-qcf-plus-license]
- Targeted Quran.com repository evidence shows mature page/word code, but it is split by platform. Web v2 and Android READMEs conflict with their GPL labels about commercial use; current Web code has no clear license; the iOS code's Apache license does not clear its separately licensed data. [@renderer-qurancom-v2-repo] [@renderer-qurancom-v2-readme] [@renderer-qurancom-v2-tree] [@renderer-qurancom-next-repo] [@renderer-qurancom-next-readme] [@renderer-quran-ios-readme] [@renderer-quran-android-readme] [@renderer-quran-images-readme]
- A narrow public GitHub query found only a single-line QUL-font renderer, not a complete navigable Mushaf. The Quran.ws engine remains unpublished as an installable package, and its KFGQPC terms were not directly verified with the rights holder. [@renderer-github-search] [@market-quran-engine-guide] [@market-quran-engine]
- No candidate satisfies every rights and platform gate. No implementation, Nabr/QRC request, model/asset download, database mutation, or deployment occurred.

### Deliverable

- `research/TABYAN_RIGHTS_CLEAR_MUSHAF_RENDERER_SELECTION.md`
