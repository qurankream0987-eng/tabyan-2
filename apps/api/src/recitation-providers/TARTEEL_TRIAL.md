# Tarteel Whisper trial

This is an experimental, CPU-only batch-per-commit adapter. It emits final
transcripts only; it does not provide Whisper partials or replace OpenAI.

## Run the benchmark

From the workspace root:

```sh
BENCH_PROVIDER=tarteel npx tsx tools/benchmarks/recitation-audio-benchmark.ts clear_67_1-3
```

The benchmark uses the same public Alafasy audio, PCM framing, segmenter,
canonical Quran word data, matcher, and recitation state engine as the existing
OpenAI benchmark. It reports word error rate and provider/display latency. The
worker uses only an already-cached int8 CTranslate2 base-model folder.
Missing cached weights block the trial; there is no automatic download or paid
provider fallback. Model weights and audio are not added to the repository.

The converted checkpoint is pinned to a Hugging Face revision and identifies
`tarteel-ai/whisper-base-ar-quran` as its source. It is loaded locally; no
student audio is sent to a hosted inference service. The upstream converted
model card's reported short-ayah accuracy is inconsistent with its own summary,
so it is not treated as evidence of acceptable quality. Use Tabyan's benchmark
results before considering any broader use.

The worker uses the project Python environment (`.pythonlibs/bin/python`) when
available, because the workspace's system `python3` may be a different version.
`TABYAN_TARTEEL_PYTHON` can explicitly select another interpreter. This worker
is development-only; no Python runtime or model weights are bundled into Native.
Its logs report model load time and size, CPU thread count, process peak RSS, and
per-commit inference wall/CPU time without logging audio or transcript text.

## Optional development gateway path

The WebSocket gateway can select this adapter only when all of these are true:

- `NODE_ENV=development`
- `TABYAN_AI_ASR_PROVIDER=tarteel`
- `TABYAN_AI_TARTEEL_TRIAL_ENABLED=true`

The existing live-transcription feature flags and student-session authorization
still apply. Production always rejects Tarteel selection, regardless of these
flags. The default provider selection and OpenAI path are unchanged. There is no
automatic fallback if the local model fails or its queue is full.