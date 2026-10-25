# Tabyan Recitation Provider Live Comparison

**Scope:** development-only provider proof. No production provider switch, deployment, database change, student recording, or Native-device success is claimed.

## Result

The local Quran model completed the same public Alafasy recording used by the benchmark: Al-Mulk 67:1–3, 43 seconds, mono PCM16 at 24 kHz, paced in 100 ms frames. The run used the existing provider adapter, segmenter, canonical Quran words, matcher, and recitation state engine. The audio remained in the OS temporary cache; this report does not include the audio or raw transcript.

OpenAI could not be measured in this paired run. Its recheck returned **“You have no credits remaining”**; the benchmark then timed out waiting 15 seconds for provider readiness. The harness waits for readiness before it starts playback, so **no sample audio was sent to OpenAI**. This is a billing/quota block, not an ASR accuracy failure.

| Measure | OpenAI `gpt-live-transcribe` | Local Tarteel-derived CTranslate2 int8 |
| --- | --- | --- |
| Live provider result | Blocked before readiness by exhausted credits | Completed locally |
| Transcript events | Not measured | 0 partials, 8 finals; all 8 commits resolved |
| Tabyan-normalized Quran WER (Q-WER) | Not measured | 9/38 word errors; WER 0.237 (23.7%) |
| Orthography-sensitive WER | Not measured | 22/38 word errors; WER 0.579 (57.9%) |
| Spoken words committed | Not measured | 38/38 |
| Final Quran location | Not measured | Correct: 67:3:18 |
| Confirmed mistakes | Not measured | One false positive at 67:3:10; the clear-audio scenario had no injected mistakes |
| Commit-to-final provider latency | Not measured | P50 1,669 ms; P95 2,063 ms |
| Word shown/committed latency from word end | Not measured | P50 3,838 ms; P95 9,217 ms |
| First transcript partial | Not measured | None; this adapter is batch-per-commit and final-only |
| Published model price | $0.017/audio minute on the model page; this run sent no audio | No hosted inference charge; local CPU work |

The matcher summary marked 37 of 38 words correct on first try (97%); that is a separate alignment metric, not a replacement for word-level WER. Q-WER uses Tabyan's Quran normalizer, while orthography-sensitive WER preserves letter-form distinctions; neither should be mislabeled as the other. The local model also emitted extra and incorrect text; the full transcript is deliberately omitted from this repository report. This one reciter and one clear recording are not representative of student speech, microphones, or other reciters.

## Local resource measurement

The pinned checkpoint is `kaylazima/quranic-model`, revision
`9fee6e6bca1099abef1c280e79be43a8f74d78b9`, folder `whisper-quran-ct2`, sourced
from `tarteel-ai/whisper-base-ar-quran`.

- Model folder size measured through the cached files: **77,466,713 bytes** (73.9 MiB).
- First provider-ready time: **15,096 ms**. This includes Python startup and model initialization.
- Worker-reported load time: **8,497 ms**. This first run used a cold Hugging Face cache, so this value includes the initial snapshot fetch as well as model loading; it is not a warm-cache-only load measurement.
- CPU: **4 worker threads**, CPU-only, no GPU.
- Python worker peak RSS: **269,116 KiB** after model load and **409,432 KiB** at the maximum observed during inference (about 400 MiB).
- Per-commit inference wall time: **1,042–2,002 ms** across eight commits. Per-process CPU time was **2,153–3,868 ms**; it can exceed wall time because the model uses multiple CPU threads.
- The worker logged one rate-limit-classified startup warning, but the pinned model loaded and all eight inference commits completed with no provider errors.

The benchmark excludes browser microphone capture, the client-to-gateway WebSocket hop, and React rendering. The latency values are therefore adapter/matcher evidence, not real-device end-to-end latency.

## OpenAI protocol check

The current dedicated [Realtime transcription guide](https://developers.openai.com/api/docs/guides/realtime-transcription) specifies:

- `session.update` with `session.type: "transcription"` and `audio.input.transcription.model: "gpt-live-transcribe"`;
- mono `audio/pcm` at 24 kHz;
- `turn_detection: null` (server VAD is unsupported for this transcription session);
- `languages: ["ar"]` for expected Arabic input;
- audio append and client commit events, followed by transcript delta and completed events.

The guide's latency section lists `minimal` through `xhigh` for the transcription workflow. The generated Realtime client-event reference currently says the `delay` field is supported only with `gpt-realtime-whisper` in GA Realtime sessions. These pages do not describe the scope identically; the implementation retains `delay: "minimal"` because it follows the dedicated transcription guide, but the live session update remains unverified while the account has no credits.

The dedicated guide says to connect with WebSocket but does not show a full connection URL. The general [WebSocket guide](https://developers.openai.com/api/docs/guides/realtime-websocket) shows a `model=gpt-realtime-2.1` URL, while the [`gpt-live-transcribe` model page](https://developers.openai.com/api/docs/models/gpt-live-transcribe) lists the `/v1/realtime/transcription_sessions` endpoint for server-created transcription sessions. The adapter now combines the documented Realtime WebSocket model with the transcription intent (`?model=gpt-realtime-2.1&intent=transcription`) and continues to select `gpt-live-transcribe` in `session.update`. A local test verifies the URL parameters and session payload. Because the credit rejection happened before readiness, the exact URL/session combination remains unverified against OpenAI.

The adapter now counts audio as forwarded only after the provider adapter sends/queues it, treats OpenAI's `input_audio_buffer.committed` server event as positive commit acceptance evidence, and records first partial/final events without logging audio, transcript text, or credentials. A local mock-WebSocket test verifies these event mappings; it does not substitute for a live OpenAI test.

## Model rights and current recommendation

At the pinned revision, the converted repository's model-card metadata declares MIT. Its README says the checkpoint is derived from the Tarteel model and documents conversion with `ct2-transformers-converter`; the repository metadata does not include a separate `LICENSE` file. The upstream [Tarteel model card](https://huggingface.co/tarteel-ai/whisper-base-ar-quran) declares Apache-2.0. Those declarations alone do not independently establish the rights chain for the exact converted weights, training data, or commercial redistribution.

**Recommendation:** keep the existing production provider selection unchanged. Tarteel remains an opt-in development trial: it is final-only, reached 23.7% WER on this single clear recitation, and the converted checkpoint's redistribution rights are not fully established. OpenAI remains unranked in this paired run because the account-level credit gate prevented audio from reaching it.

## Verification record

- API server TypeScript check: passed.
- API server tests: 59 passed, including a local mock-WebSocket test for OpenAI session setup, audio forwarding, and commit acknowledgement.
- Local Al-Mulk 67:1–3 benchmark: completed successfully with the metrics above.
- Real browser microphone, real Native device, and live OpenAI provider readiness: **not verified**.
- Production routing, deployment, and database: **unchanged**.

## References

- [OpenAI Realtime transcription guide](https://developers.openai.com/api/docs/guides/realtime-transcription)
- [OpenAI Realtime WebSocket guide](https://developers.openai.com/api/docs/guides/realtime-websocket)
- [OpenAI Realtime transcription session reference](https://developers.openai.com/api/reference/resources/realtime/subresources/transcription_sessions)
- [OpenAI `gpt-live-transcribe` model and pricing](https://developers.openai.com/api/docs/models/gpt-live-transcribe)
- [Converted CTranslate2 model card at the pinned revision](https://huggingface.co/kaylazima/quranic-model/tree/9fee6e6bca1099abef1c280e79be43a8f74d78b9)
- [Upstream Tarteel Arabic Quran Whisper model card](https://huggingface.co/tarteel-ai/whisper-base-ar-quran)
- [Quran Foundation Developer Terms](https://api-docs.quran.com/legal/developer-terms/)
