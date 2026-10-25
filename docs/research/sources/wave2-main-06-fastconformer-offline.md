Source: https://huggingface.co/Muno459/fastconformer-quran
Title: Muno459/fastconformer-quran · Hugging Face
Fetched: 2026-10-10T21:08:14.004Z

## You need to agree to share your contact information to access this model

This repository is publicly accessible, but you have to accept the conditions to access its files and content.

[Log in](https://huggingface.co/login?next=/Muno459/fastconformer-quran) or [Sign Up](https://huggingface.co/join?next=/Muno459/fastconformer-quran) to review the conditions and access this model content.

> **Update (June 2026):** weights upgraded in place - real-phone word-error roughly halved (~20% → ~10%) with the same clean-studio accuracy, and the pronunciation/tajweed head retrained to match. Same file layout as before. Live low-latency **streaming** model: [fastconformer-quran-streaming](https://huggingface.co/Muno459/fastconformer-quran-streaming).

# FastConformer-Quran

**State-of-the-art automatic speech recognition for Quranic recitation, with a multi-signal mispronunciation detector built on top.**

🚀 **#1 on a [leakage-free Quran benchmark](https://huggingface.co/spaces/Muno459/quranic-asr-leaderboard)** (Hafs riwayah): 5.41% overall WER on held-out audio (benchmark v1.1 references), ahead of nvidia FastConformer (7.44%, previous public #1) and Tarteel's production realtime ASR (9.56%) on identical clips. On held-out reciters never seen in training: **0.93% WER**.
🎯 **~80% sensitivity at ~9% FPR** on a 39K-token held-out mispronunciation benchmark (verified on the current weights).
📱 **iOS-ready** via the companion CoreML repos ( [offline](https://huggingface.co/Muno459/fastconformer-quran-coreml-offline) · [streaming](https://huggingface.co/Muno459/fastconformer-quran-coreml-streaming)).

* * *

## Headline numbers

> **Honesty note (June 2026).** Earlier versions of this card quoted a 0.029% WER on the EveryAyah
> test split. That split overlaps our training data: the public EveryAyah `test` shard shares ~88% of
> its clips with reciters we trained on, so that number measured memorization, not generalization. The
> numbers below come from a **leakage-free held-out benchmark** \- every clip is verified absent from
> training - and are the ones you should trust. The model is still SOTA on this stricter test; it just
> reports an honest ~0.9% on unseen reciters instead of a leaked 0.029%.
>
> 📊 **Live, interactive board (this model vs nvidia, whisper, seamless, mms, omniASR, cohere, Tarteel):**
> **[Quranic ASR Leaderboard](https://huggingface.co/spaces/Muno459/quranic-asr-leaderboard).**

### Leakage-free Quran benchmark (600 clips, same decoding/normalization for every model)

Three held-out sources, 200 clips each: **EveryAyah** reciters with zero training samples (clean
studio), a **QUL** reciter (Al-Nufais) we never trained on, and held-out **real phone-mic** recitation
(tlog). Ranked by overall WER (lower = better); WER/CER are over diacritic-normalized text.

| Model | Family | EveryAyah (unseen) | QUL (unseen) | Phone (tlog) | **Overall WER** | Overall CER |
| --- | --- | --: | --: | --: | --: | --: |
| **FastConformer-Quran (this model, offline)** | ours | **0.93** | **7.78** | **8.88** | **5.41** | **2.96** |
| nvidia `stt_ar_fastconformer_hybrid` | baseline (previous public #1) | 1.50 | 7.61 | 16.77 | 7.44 | 3.08 |
| ⭐ **Tarteel (official, realtime)** | Tarteel production (streaming) | 5.97 | 9.05 | 16.17 | 9.56 | 5.82 |
| whisper-large-v3 | whisper | 5.48 | 4.69 | 26.23 | 10.10 | 4.26 |
| Tarteel `whisper-base-ar-quran` (old open model, chunked long-form decode) | whisper | 2.40 | 4.03 | 23.27 | 7.97 | 3.51 |
| seamless-m4t-v2-large | seamless | 18.97 | 30.49 | 29.59 | 25.85 | 15.87 |
| mms-1b-all | mms | 40.94 | 50.86 | 44.25 | 45.49 | 11.45 |

> Scores reflect benchmark **v1.1** (2026-08-15): ten `qul_alnufais` reference texts were corrected because the recordings contain the ayah recited twice while the QUL per-ayah references covered it once. All stored predictions were rescored; see the benchmark dataset README for details.

⭐ **Tarteel (official, realtime)** is Tarteel's current production ASR (a _streaming_ FastConformer), not their old open Whisper model. We ran all 600 benchmark clips through it at `voice-v2.tarteel.io` and scored them with the same scorer. It is the strongest external streaming system here (9.56 overall). Their old public `whisper-base-ar-quran` scores 7.97 when decoded with chunked 30 s long-form windows; naive single-window decoding misrepresents it badly.

This model is **#1 overall**, ahead of the current public leaderboard #1 (nvidia FastConformer) on the
same held-out clips. Against **Tarteel's official production model** (⭐, their realtime streaming
FastConformer at `voice-v2.tarteel.io`), this model leads overall **5.41 vs 9.56**.

One honest caveat on that head-to-head: **this repo is the offline (full-utterance) model, and Tarteel's**
**production model is streaming (realtime)**, so it is not a like-for-like comparison - full context is an
advantage. The fair streaming-vs-streaming number is our separate
[streaming model](https://huggingface.co/Muno459/fastconformer-quran-streaming) at **10.53** overall,
which is competitive with Tarteel's 9.56 (within the benchmark's noise on a 600-clip set). So: our
**offline** model is clearly ahead of every external system including Tarteel official; our **streaming**
model is roughly on par with Tarteel's streaming production system. General Arabic models
(whisper-large-v3, seamless, mms) are strong on broadcast Arabic but degrade on diacritized Quranic
recitation - which is the point of a Quran-specific model. Full interactive board:
[Quranic ASR Leaderboard Space](https://huggingface.co/spaces/Muno459/quranic-asr-leaderboard).

The held-out **phone-mic** column is the hard, real-world case. tlog also carries substantial label
noise (filename↔ayah mismatches, user-added basmala, partial recitations), so a portion of that 8.88%
is the model correctly transcribing what was actually said against wrong metadata.

_Two further leaderboard families were attempted but not scored here: `cohere-transcribe-03-2026`_
_(gated, requires license access) and `omniASR-LLM-7B` (fairseq2 7B - loads but its CUDA inference path_
_segfaults on our hardware). They can be folded into the benchmark on a machine where they run._

* * *

## Demo audio

**Alafasy reciting Q 1:4:**

Predicted: `مَالِكِ يَوْمِ الدِّينِ` ✓

**Abdullah Basfar reciting Q 112:1:**

Predicted: `قُلْ هُوَ اللَّهُ أَحَدٌ` ✓

**Alafasy reciting Q 78:2:**

Predicted: `قُلْ هُوَ نَبَأٌ عَظِيمٌ` ✓

Try the live demo: [Space](https://huggingface.co/spaces/Muno459/fastconformer-quran-demo).

* * *

## Mispronunciation detection

We also ship a **multi-signal pronunciation scorer** combining three orthogonal signals on the same CTC architecture:

| Signal | What it measures | Style-invariant |
| --- | --- | :-: |
| **Pronunciation head v7** | Learned P(token correctly pronounced) on 1.33 M-parameter MLP over encoder features | ✓ |
| **Reference-anchor distance** | Cosine distance to master qari centroid bank (multi-ayah aware) | partial |
| **CTC GOP** | log P(expected token) minus max log P(non-blank token), averaged over CTC interval | ✓ |

A token is flagged by the **consensus rule** when at least 2 of 3 signals agree (default thresholds: head < 0.5, anchor > 0.20, GOP < -3.0).

### Held-out evaluation

On 39,173 tokens from 996 tlog clips that were **never seen by the pronunciation head during training**, with per-token consensus labels from our ASR and ElevenLabs Scribe v2:

| Detector | TPR @ 1% FPR | TPR @ 5% FPR | AUC |
| --- | --: | --: | --: |
| GOP (style-invariant) | 73.7% | 78.9% | **0.907** |
| Pronunciation head | 73.0% | 77.6% | 0.940 |
| Anchor distance (where bank covers) | 2.6% | 13.8% | 0.722 |
| **Consensus (2 of 3)** | n/a | n/a | **80.3% TPR / 9.3% FPR** |

The combined detector catches ~80% of real mispronunciations at a ~9% false-positive rate. This is the deployable operating point. (Re-verified June 2026 on the current shipped weights; the head and encoder are the same vintage.)

* * *

## What this model is and isn't

**Is:**

- The best published ASR for Quranic recitation in Hafs riwayah.
- A frame-level CTC model with 512-dim encoder features exposed for downstream scoring.
- Production-ready ONNX (fp32 437 MB, fp16 219 MB), running at RTF ~0.001 on an RTX 4090.
- Diacritic-aware: outputs fully harakat-marked Arabic text.

**Isn't:**

- A general Arabic ASR. Trained only on Quranic audio with a 1,024-token BPE tokenizer. Performance on dialectal, news, or conversational Arabic will be poor by design.
- A streaming model itself. This repo is the offline (full-utterance) model. For true token-by-token low-latency streaming there is now a separately-trained cache-aware variant: [fastconformer-quran-streaming](https://huggingface.co/Muno459/fastconformer-quran-streaming) (\+ [CoreML/ANE](https://huggingface.co/Muno459/fastconformer-quran-coreml-streaming)). On the leakage-free benchmark the streaming model trades some accuracy for latency (10.53% overall WER vs 5.41% offline), as expected.
- Trained for other qira'at. Hafs riwayah only.

* * *

## How it was built

**Stage 1: base training on EveryAyah.** Fine-tuned NVIDIA's `stt_ar_fastconformer_hybrid_large_pcd_v1.0` (Arabic-pretrained, ~1100 h) on 22 K EveryAyah clips. Reached **0.0757% WER** on the held-out test split.

**Stage 2: pronunciation scoring stack.** Built a per-token head on top of frozen encoder features (512-dim pooled + 64-dim token embedding + 16-dim Quran-phonology features into an MLP). Initial training on weak labels (CTC-vs-expected disagreement + GOP scores) plus master qari anchors (Husary, Abdul Basit, Alafasy clean recitations).

**Stage 3: phone-audio fine-tune.** Three rounds of low-LR continuation on EveryAyah and tlog: 22,585 clean clips, 6,869 high-quality tlog clips (full weight), 20,589 borderline tlog clips (half weight). LR schedule 1e-5, 5e-6, 2.5e-6 over six epochs total. Trend was monotonic improvement on a held-out tlog slice through round three, then saturated.

**Stage 4: dual-ASR consensus labels.** Ran ElevenLabs Scribe v2 over the 6,168 highest-quality tlog clips. Aligned Scribe transcripts vs. expected ayah text at the character level (diacritic-insensitive Levenshtein), then aligned vs. our ASR output. Asymmetric-trust consensus rule:

> A token is labeled CORRECT if EITHER ASR or Scribe says correct. It is labeled WRONG only when BOTH agree wrong.

Result: 144,664 per-token labels at ~98.0% positive rate, with 6,789 ASR-vs-Scribe disagreements flagged as high-information tokens. Cost: ~$11 in ElevenLabs Creator-plan credits.

**Stage 5: final pronunciation head.** Retrained on encoder features extracted with the final ASR (consistent features for both consensus labels and master qari anchors).

**Stage 6: tajweed rule engine.** Pure-Python rule engine that takes the expected diacritized text, audio, and per-token alignment, producing per-letter tajweed feedback across 27 dispatched rules (noon sakinah, meem sakinah, madd typology, qalqalah sughra/kubra, ra tafkheem/tarqeeq, Allah lafdh, lam shamsiyyah, hamzat wasl, idgham types, leen letters, more).

* * *

## Architecture

- **Backbone**: NVIDIA FastConformer Large encoder + CTC head (114.6 M params)
- **Tokenizer**: SentencePiece BPE, 1,024 vocab + 1 blank = 1,025 output classes
- **Audio**: 16 kHz, log-mel features (80 channels)
- **Decoder**: CTC greedy\_batched (frame-independent, noise-robust, deterministic)
- **Output**: token log-probabilities and 512-dim encoder features per output frame

CTC is the right decoder for this task: frame-level alignment for the pronunciation pipeline, no auto-correction that would mask user mispronunciations, faster inference, and (per the decoder ablation) sub-1% WER on held-out studio reciters - so there's no quality reason to add decoder complexity that would also hide mispronunciations.

* * *

## Quick start (CTC, ONNX)

```python
import numpy as np, soundfile as sf, onnxruntime as ort, sentencepiece as spm

session = ort.InferenceSession("onnx/model_with_encoder.onnx",
                                providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
sp = spm.SentencePieceProcessor(model_file="tokenizer.model")

wav, sr = sf.read("clip.wav")           # 16 kHz mono float32
features = log_mel(wav)                  # see tajweed/aligner.py for the pipeline
features = features[None, ...]           # (B=1, 80, T_in)
length = np.array([features.shape[2]], dtype=np.int64)

logprobs, encoder_features = session.run(
    ["logprobs", "encoder_output"],
    {"audio_signal": features, "length": length},
)
# encoder_features: (1, 512, T_out). Feed to the pronunciation head.
# logprobs:         (1, T_out, 1025). Argmax + CTC collapse to get tokens.
```

The full multi-signal scorer (CTC + head + anchor + GOP + tajweed) is in [`tajweed/full_scorer.py`](https://huggingface.co/Muno459/fastconformer-quran/blob/main/tajweed/full_scorer.py).

* * *

## Files

| Path | Description |
| --- | --- |
| `nemo/fastconformer-quran.nemo` | NeMo checkpoint, current (June 2026) weights (459 MB) |
| `onnx/model.onnx` | CTC-only ONNX, fp32 (437 MB) |
| `onnx/model.fp16.onnx` | CTC-only ONNX, fp16 (219 MB) |
| `onnx/model_with_encoder.onnx` | CTC + encoder features, fp32 (437 MB) |
| `head/pronunciation_head.pt` | Pronunciation head v7 (5.4 MB) |
| `tajweed/` | Python module: text analyzer, 27 rules, full scorer |
| `tokenizer.model` | SentencePiece tokenizer |
| `model_config.yaml` | NeMo model config |
| `demo/` | Three sample clips with known transcriptions |

For iOS / CoreML deployment, see [Muno459/fastconformer-quran-coreml](https://huggingface.co/Muno459/fastconformer-quran-coreml).

* * *

## Datasets

The current (June 2026) weights were trained on a fully canonical-imlaei labeled mix of:

- **Tarteel EveryAyah** (`tarteel-ai/everyayah`): CC-BY 4.0. Multi-reciter Hafs studio recitation, the clean backbone.
- **Tarteel tlog** (`tarteel-ai/tlog`): gated. Real user phone recordings (the real-world / robustness signal).
- **Muaalem** (`obadx/muaalem-annotated-v3`): additional clean Hafs recitation (~12 K clips), relabeled from its diacritized text to our consistent imlaei orthography.

All audio is Hafs riwayah. Labels are each clip's canonical ayah text in one imlaei orthography.

* * *

## License

**NPL-1.1 (Quran-Lab No-Profit License)** \- see [`LICENSE`](https://huggingface.co/Muno459/fastconformer-quran/tree/main/LICENSE). This is the licence that governs
this repository: the fine-tuned weights, the ONNX exports, the pronunciation head, the tokenizer and the
tajweed code.

You may use, fine-tune, redistribute and even host the model, but **no profit may be made from it**. You
may recover only the strictly necessary direct running costs (compute, storage, bandwidth), with no margin.
No paid tiers, no subscriptions or paywalls, no advertising revenue, and no monetization of any kind. These
terms pass on to anyone you share it with.

**Upstream components keep their own terms.** The base model
[nvidia/stt\_ar\_fastconformer\_hybrid\_large\_pcd\_v1.0](https://huggingface.co/nvidia/stt_ar_fastconformer_hybrid_large_pcd_v1.0)
is CC-BY-4.0, so **attribution to NVIDIA is required**, and the training datasets keep their own licences
(e.g. Tarteel EveryAyah, CC-BY-4.0). Those CC-BY-4.0 terms apply to the upstream material only - they do
**not** license this repository's fine-tuned weights or components, which are NPL-1.1.

There is **no commercial license** for this model and none will be granted. It is not available for a fee,
a revenue share, or any other arrangement. If your use requires profit, you do not have a license under
these terms.

## Citation

```bibtex
@misc{fastconformer-quran-2026,
  title  = {FastConformer-Quran: Quranic ASR and unsupervised mispronunciation scoring},
  author = {Anon},
  year   = {2026},
  url    = {https://huggingface.co/Muno459/fastconformer-quran},
}
```

Downloads last month2,291

Inference Providers [NEW](https://huggingface.co/docs/inference-providers)

[Automatic Speech Recognition](https://huggingface.co/tasks/automatic-speech-recognition "Learn more about automatic-speech-recognition")

This model isn't deployed by any Inference Provider. [🙋Ask for provider support](https://huggingface.co/spaces/huggingface/InferenceSupport/discussions/new?title=Muno459/fastconformer-quran&description=React%20to%20this%20comment%20with%20an%20emoji%20to%20vote%20for%20%5BMuno459%2Ffastconformer-quran%5D(%2FMuno459%2Ffastconformer-quran)%20to%20be%20supported%20by%20Inference%20Providers.%0A%0A(optional)%20Which%20providers%20are%20you%20interested%20in%3F%20(Novita%2C%20Hyperbolic%2C%20Together%E2%80%A6)%0A)

## Model tree for Muno459/fastconformer-quran

Base model

[nvidia/stt\_ar\_fastconformer\_hybrid\_large\_pcd\_v1.0](https://huggingface.co/nvidia/stt_ar_fastconformer_hybrid_large_pcd_v1.0)

Quantized

( [8](https://huggingface.co/models?other=base_model:quantized:nvidia/stt_ar_fastconformer_hybrid_large_pcd_v1.0))

this model

Quantizations

[2 models](https://huggingface.co/models?other=base_model:quantized:Muno459/fastconformer-quran)

## Datasets used to train Muno459/fastconformer-quran

## Spaces using Muno459/fastconformer-quran5

## Evaluation results

- WER (normalized) - leakage-free held-out reciterson EveryAyah held-out (3 zero-training reciters)
[self-reported](https://huggingface.co/Muno459/fastconformer-quran/blob/main/README.md)


0.930

- CER (normalized) - leakage-free held-out reciterson EveryAyah held-out (3 zero-training reciters)
[self-reported](https://huggingface.co/Muno459/fastconformer-quran/blob/main/README.md)


0.260

- WER (normalized) overall - beats nvidia FastConformer (7.44) and Tarteel's production realtime ASR (9.56)on Held-out Quran benchmark (EveryAyah unseen + QUL unseen + tlog phone, 600 clips)
[self-reported](https://huggingface.co/Muno459/fastconformer-quran/blob/main/README.md)


5.410