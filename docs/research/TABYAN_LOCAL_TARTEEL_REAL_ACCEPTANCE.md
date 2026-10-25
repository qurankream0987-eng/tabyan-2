# Tabyan Local Tarteel Whisper — Real-Audio Acceptance

**Status: BLOCKED — the approved audio recording is not present in the workspace.**

This report records the requested acceptance attempt without substituting mocked,
synthetic, downloaded, or rights-unverified audio for real authorized recordings.

## Acceptance results

| Measure | Result |
| --- | --- |
| Model READY | YES |
| Model | `tarteel-ai/whisper-base-ar-quran` |
| Model revision | `9fee6e6bca1099abef1c280e79be43a8f74d78b9` |
| Worker mode | Local CPU / int8, cache-only |
| Model load time | 1,829 ms (startup log) |
| Model files reported | 77,466,773 bytes |
| CPU threads | 4 |
| Worker peak RSS at load | 227,740 KB |
| User authorization stated | YES |
| User-provided audio file present | NO — the latest attachment is text instructions, not an audio recording |
| Real audio used | NO — blocked; no eligible local test clips found |
| Mock worker used | NO for this acceptance attempt |
| Real transcription | BLOCKED — not run |
| Median latency | N/A |
| Real-time factor | N/A |
| Final flush | BLOCKED — no audio was available to flush |
| Matcher compatibility | BLOCKED — no real transcript to pass through the matcher |
| Correct recitation | BLOCKED |
| Omission case | BLOCKED |
| Repetition case | BLOCKED |
| Short hesitation | BLOCKED |
| Short ayah transition | BLOCKED |
| False positives | UNKNOWN |
| CPU acceptable | UNKNOWN — load was observed; inference CPU behavior was not measured |
| Recommended role | NOT DECIDED; keep the provider experimental |
| Default provider changed | NO |
| Paid calls | 0 |
| Deployment | NO |
| Database changes | NO |

No per-clip transcript, normalized text, audio duration, matcher result, or
committed word count is reported because no audio clip was available.

## Why the run was blocked

- A workspace-wide search found no local `.wav`, `.mp3`, `.flac`, `.m4a`, `.ogg`,
  `.opus`, `.aac`, or `.webm` files. The benchmark cache
  `/tmp/tabyan-recitation-bench` was also absent.
- The latest attachment describes an approved user-provided recording, but the
  attached file is a `.txt` instruction document; no recording file accompanied
  it. The stated approval is noted, but there are no audio bytes to process.
- The existing benchmark script,
  `artifacts/tabyan/scripts/recitation-audio-benchmark.ts`, fetches audio from
  Quran.com when its cache is missing. It was not run because this acceptance
  explicitly forbids downloading audio.
- The existing Quran.com reuse audit
  (`research/QURAN_COM_ECOSYSTEM_REUSE_AUDIT.md`) records reciter recordings and
  hosting rights as unverified. No such recording was used.
- The benchmark's omission/repetition deviations are splices of real audio, not
  recordings of an actual reciter omitting or repeating a word. Those scenarios
  were not presented as real error-case acceptance evidence.

## Final-flush and live-UI boundary

The required chain — session stop, remaining buffered audio, final worker flush,
final transcript, matcher, and state engine — remains unproven with real audio.
This report does not claim Web, iPhone, Native-device, or production readiness.

The startup log confirms that the existing local worker reached READY. Its
implementation sets `HF_HUB_OFFLINE=1` and uses `local_files_only=True`; no
model download or hosted inference request was made during this acceptance
attempt.

## To unblock

Provide a small set of rights-cleared local audio clips covering correct
recitation, one omission, one repetition, a hesitation, and a short ayah
transition. The real-audio run can then measure transcription, final flush,
matcher/state-engine behavior, latency, RTF, and CPU without calling OpenAI or
downloading audio.
