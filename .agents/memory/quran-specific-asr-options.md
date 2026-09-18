---
name: Quran-specific ASR options
description: Research outcome for selecting a Quran-recitation-specific Arabic ASR backend.
---

There is no verified public hosted API found that offers Quran-specific Arabic ASR with native realtime partials. The practical route is a custom GPU endpoint around a Quran-fine-tuned model, with OpenAI retained as fallback/benchmark.

**Why:** Tarteel's public `whisper-base-ar-quran` weights are Apache-2.0 but Whisper is chunk-oriented, so realtime requires a streaming wrapper and careful cumulative-prefix matching. `wasimlhr/whisper-quran-v1` reports strong Quran benchmarks and real-time system validation but is `CC BY-NC-4.0`, so it is unsuitable for commercial production without permission.

**How to apply:** Evaluate Tarteel's Apache-2.0 model first on a private GPU endpoint using 0.5–1 second overlapping chunks; use the noncommercial large model only as a research benchmark. Qurani.ai/QUL services provide Quran content and structure, not ASR.