Source: https://huggingface.co/Muno459/fastconformer-quran-streaming
Title: Muno459/fastconformer-quran-streaming · Hugging Face
Fetched: 2026-10-10T21:08:18.960Z

## You need to agree to share your contact information to access this model

This repository is publicly accessible, but you have to accept the conditions to access its files and content.

[Log in](https://huggingface.co/login?next=%2FMuno459%2Ffastconformer-quran-streaming) or [Sign Up](https://huggingface.co/join?next=%2FMuno459%2Ffastconformer-quran-streaming) to review the conditions and access this model content.

# FastConformer Quran ASR - Streaming (cache-aware)

Low-latency **streaming** Arabic Quran speech recognition. It transcribes **live while you recite**
(causal, cache-aware FastConformer), for recitation-tracking use cases such as live word highlighting
and real-time feedback. Trained and validated on real phone-recorded recitation, not just clean studio.

This is the streaming counterpart to the offline model:
👉 **Offline (highest accuracy):** [Muno459/fastconformer-quran](https://huggingface.co/Muno459/fastconformer-quran)

## Offline vs streaming - which to use

|  | Offline | **Streaming (this repo)** |
| --- | --- | --- |
| When you get output | After the full recitation | **Live, every ~1s chunk** |
| Latency | High (whole-utterance) | **Low (real-time)** |
| Clean studio WER | **~1%** | **~6%** |
| Real phone-audio WER | **~9% (≈4% normalized)** | **~20% (≈14% normalized)** |
| Best for | Final transcript, max accuracy | **Live tracking, feedback, mushaf follow-along** |

Use **offline** when latency does not matter and you want the lowest error. Use **streaming** when you
need output _during_ recitation. The streaming model pays a few points of accuracy for real-time output.

📊 **Full leakage-free leaderboard** (this model vs nvidia, whisper, seamless, mms, omniASR, Tarteel):
[Quranic ASR Leaderboard](https://huggingface.co/spaces/Muno459/quranic-asr-leaderboard).

_WER notes:_ measured on a **leakage-free held-out set** \- EveryAyah reciters never used in training,
a held-out QUL reciter, and real phone-recorded recitation (tlog). CTC greedy, `[70,13]` context
( ~~1 s lookahead). "Normalized" = alef-insensitive, which removes a spelling-convention mismatch (the
eval references use Uthmani rasm; the model outputs imlaei), reflecting true word accuracy over
orthography. For reference, on the same held-out clips the public Arabic-ASR-leaderboard #1
(nvidia FastConformer) scores ~5.7% overall - the offline model here beats it (~~ 3% overall).

## Which ONNX do I use?

Three graphs, **same weights**, pick by what you are building:

| File | Cache-aware (live)? | Outputs `encoder_output`? | Use for |
| --- | :-: | :-: | --- |
| `model.onnx` / `model.q8.onnx` | ✅ | ❌ | Live word-by-word ASR (lowest overhead) |
| `model_with_encoder.onnx` / `.q8` | ❌ (full-context) | ✅ | Record-then-tajweed (run once on the whole clip) |
| **`model_streaming_with_encoder.onnx` / `.q8`** | ✅ | ✅ | **Live ASR + live tajweed in one pass** |

If you only need live text, use `model.q8.onnx`. If you score pronunciation only after the user stops,
`model_with_encoder.onnx` is simplest. If you want to stream text **and** feed the pronunciation head
while reciting, use **`model_streaming_with_encoder.q8.onnx`** \- one forward returns `logprobs`,
`encoder_output`, and the next-step cache together.

## Files

- `model.onnx` \- fp32 cache-aware streaming ONNX (~459 MB)
- `model.q8.onnx` \- INT8 dynamic-quantized (~132 MB, for on-device)
- `model_with_encoder.onnx` / `.q8.onnx` \- full-context (no cache) graph that returns `encoder_output` (~459 / ~132 MB); feature source for record-then-tajweed
- `model_streaming_with_encoder.onnx` / `.q8.onnx` \- **cache-aware AND returns `encoder_output`** in one pass (~459 / ~132 MB); for live ASR + live tajweed
- `streaming_global_cmvn.npz` \- fixed-global CMVN constants (`clean_*` / `tlog_*` mean+std)
- `streaming_inference_example.py` \- runnable pure-ONNX streaming reference (mel → chunked forward → CTC decode)
- `head/pronunciation_head.pt` \- streaming-matched pronunciation head (see below)
- `tajweed/head_scorer.py` \- loader/scorer for the pronunciation head

## Pronunciation head

`head/pronunciation_head.pt` is a small (1.33 M-param) per-token classifier that takes pooled encoder
features (512-d) + token IDs and returns P(token correctly pronounced). It is **trained on features**
**pooled from this streaming encoder** (`[70, 13]` context), so its inputs match what the streaming model
emits live - not the offline encoder.

To score pronunciation: get `encoder_output` (from `model_with_encoder.onnx` after recording, or live
from `model_streaming_with_encoder.onnx`), CTC-align the tokens, mean-pool `encoder_output` over each
token's frame interval, and feed those 512-d vectors + token IDs to the head via
`tajweed/head_scorer.py`. The CoreML (ANE) build of this streaming head is in
[Muno459/fastconformer-quran-coreml-streaming](https://huggingface.co/Muno459/fastconformer-quran-coreml-streaming).

### Does streaming hurt tajweed scoring?

Barely. The streaming (limited-context) encoder is much weaker for _ASR text_ (it needs long-range
context), but pronunciation correctness is a **local** acoustic judgement per letter, which limited
context preserves. Same held-out tokens, each head on its matched encoder features:

| Encoder feeding the head | ASR WER | Pron. AUC | TPR @ 1% FPR | TPR @ 5% FPR |
| --- | --: | --: | --: | --: |
| Offline (full context) | 4.1 | 0.980 | 92.7% | 94.8% |
| **Streaming (`[70,13]`)** | 11.9 | **0.984** | 92.3% | **96.5%** |

So you can run live tajweed off the streaming encoder with essentially no loss versus offline. Use the
offline model only when you want the lowest _text_ WER.

## Inference

The model takes **80-dim log-mel features** (the app extracts these), normalized with the supplied
fixed-global CMVN (use `tlog_*` for phone audio, `clean_*` for studio), fed chunk by chunk with the
cache tensors carried across steps:

```
# model.onnx
inputs : audio_signal[B,80,T], length, cache_last_channel, cache_last_time, cache_last_channel_len
outputs: logprobs[B,T',1025], encoded_lengths, cache_last_channel_next, cache_last_time_next, cache_last_channel_next_len

# model_streaming_with_encoder.onnx  (adds encoder_output)
outputs: logprobs[B,T',1025], encoder_output[B,512,T'], encoded_lengths, cache_last_channel_next, cache_last_time_next, cache_last_channel_next_len
```

Initialize the caches empty (`cache_last_channel` zeros `[B,17,70,512]`, `cache_last_time` zeros
`[B,17,512,8]`, `cache_last_channel_len``[0]`), feed each audio chunk, carry `cache_*_next` into the
next step's `cache_*`, and CTC-greedy-decode `logprobs` (blank id = 1024). Carry your `prev`-token
state across chunks too, or you will see duplicated letters at chunk seams. Vocabulary is a 1024-token
Arabic BPE.

## Training

FastConformer-Hybrid (17 layers, d\_model 512), causal convolutions + chunked-limited attention.
Warm-started from our offline Quran model, then adapted on a fully **canonical-labeled** corpus, all
relabeled to each clip's **canonical ayah text** in one consistent imlaei orthography:

- **EveryAyah** (`tarteel-ai/everyayah`): multi-reciter Hafs studio, the clean backbone.
- **Tarteel tlog** (`tarteel-ai/tlog`): real phone recitation, upweighted for real-world robustness.
- **Muaalem** (`obadx/muaalem-annotated-v3`): additional clean Hafs recitation (~12 K clips).

All Hafs riwayah.

## License

This model is licensed under the **Quran-Lab No-Profit License v1.0 (NPL-1.1)**. See [LICENSE](https://huggingface.co/Muno459/fastconformer-quran-streaming/tree/main/LICENSE) for the full terms. In short:

- **No profit.** You may not use this model, any derivative (fine-tune, quantization, distillation, re-export), or any service built on it to make money.
- **Local use is free.** Running it yourself must cost users nothing.
- **Hosted services: cost recovery only.** If you serve it over a network, you may recover only the strictly necessary direct running costs (compute, storage, bandwidth), never a profit.
- **Share-alike.** Every derivative must be released under this same license.
- **Attribution.** Credit `Muno459 / Quran-Lab, fastconformer-quran`.

This replaces the previous Apache-2.0 license. The change is not retroactive: copies obtained earlier under Apache-2.0 keep those terms, but all use going forward is governed by NPL-1.1.

Upstream components this model builds on (NVIDIA FastConformer and the upstream Muno459/fastconformer-quran) are released under CC-BY-4.0 and retain their own CC-BY-4.0 terms (attribution to NVIDIA) for those original portions. The NPL-1.1 terms above apply to this model as distributed here.

Downloads last month41

Inference Providers [NEW](https://huggingface.co/docs/inference-providers)

[Automatic Speech Recognition](https://huggingface.co/tasks/automatic-speech-recognition "Learn more about automatic-speech-recognition")

This model isn't deployed by any Inference Provider. [🙋Ask for provider support](https://huggingface.co/spaces/huggingface/InferenceSupport/discussions/new?title=Muno459/fastconformer-quran-streaming&description=React%20to%20this%20comment%20with%20an%20emoji%20to%20vote%20for%20%5BMuno459%2Ffastconformer-quran-streaming%5D(%2FMuno459%2Ffastconformer-quran-streaming)%20to%20be%20supported%20by%20Inference%20Providers.%0A%0A(optional)%20Which%20providers%20are%20you%20interested%20in%3F%20(Novita%2C%20Hyperbolic%2C%20Together%E2%80%A6)%0A)

## Model tree for Muno459/fastconformer-quran-streaming

Quantizations

[2 models](https://huggingface.co/models?other=base_model:quantized:Muno459/fastconformer-quran-streaming)

## Datasets used to train Muno459/fastconformer-quran-streaming

## Spaces using Muno459/fastconformer-quran-streaming2