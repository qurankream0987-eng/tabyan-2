Source: https://huggingface.co/deepdml/whisper-base-ar-quran-mix-norm
Title: deepdml/whisper-base-ar-quran-mix-norm · Hugging Face
Fetched: 2026-10-10T21:08:29.569Z

# Whisper Base ar-quran

This model is a fine-tuned version of [openai/whisper-base](https://huggingface.co/openai/whisper-base) on the Quran dataset.
It achieves the following results on the evaluation set:

- Loss: 0.0021
- Wer Raw: 0.1668
- Cer Raw: 0.0591
- Wer: 0.1620
- Cer: 0.0609

## Model description

More information needed

## Intended uses & limitations

More information needed

## Training and evaluation data

More information needed

## Training procedure

### Training hyperparameters

The following hyperparameters were used during training:

- learning\_rate: 1e-05
- train\_batch\_size: 64
- eval\_batch\_size: 64
- seed: 42
- optimizer: Use adamw\_torch with betas=(0.9,0.999) and epsilon=1e-08 and optimizer\_args=No additional optimizer arguments
- lr\_scheduler\_type: linear
- lr\_scheduler\_warmup\_ratio: 0.04
- training\_steps: 20000

### Training results

| Training Loss | Epoch | Step | Validation Loss | Wer Raw | Cer Raw | Wer | Cer |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| 0.1422 | 0.05 | 1000 | 0.1588 | 15.2014 | 4.7959 | 14.3479 | 4.7106 |
| 0.0334 | 0.1 | 2000 | 0.0686 | 6.7112 | 2.1317 | 6.3945 | 2.1386 |
| 0.1 | 0.15 | 3000 | 0.0403 | 3.8938 | 1.2405 | 3.7529 | 1.2552 |
| 0.0188 | 0.2 | 4000 | 0.0277 | 2.8289 | 0.8949 | 2.7240 | 0.9113 |
| 0.01 | 0.25 | 5000 | 0.0218 | 2.2476 | 0.7068 | 2.1614 | 0.7183 |
| 0.0039 | 0.3 | 6000 | 0.0173 | 1.8120 | 0.6043 | 1.7444 | 0.6160 |
| 0.0091 | 0.35 | 7000 | 0.0147 | 1.4904 | 0.4771 | 1.4382 | 0.4875 |
| 0.0105 | 0.4 | 8000 | 0.0120 | 1.1808 | 0.3770 | 1.1387 | 0.3809 |
| 0.0025 | 0.45 | 9000 | 0.0102 | 0.9724 | 0.3168 | 0.9331 | 0.3209 |
| 0.0031 | 1.0074 | 10000 | 0.0086 | 0.8435 | 0.2776 | 0.8137 | 0.2826 |
| 0.0023 | 1.0575 | 11000 | 0.0075 | 0.7323 | 0.2374 | 0.7040 | 0.2423 |
| 0.0028 | 1.1075 | 12000 | 0.0064 | 0.6364 | 0.2072 | 0.6101 | 0.2097 |
| 0.0007 | 1.1575 | 13000 | 0.0055 | 0.5286 | 0.1703 | 0.5061 | 0.1729 |
| 0.0012 | 1.2074 | 14000 | 0.0048 | 0.4524 | 0.1509 | 0.4299 | 0.1511 |
| 0.0013 | 1.2574 | 15000 | 0.0041 | 0.4040 | 0.1337 | 0.3877 | 0.1379 |
| 0.0009 | 1.3075 | 16000 | 0.0036 | 0.3441 | 0.1155 | 0.3307 | 0.1180 |
| 0.0008 | 1.3575 | 17000 | 0.0033 | 0.3010 | 0.1062 | 0.2909 | 0.1079 |
| 0.0012 | 1.4074 | 18000 | 0.0026 | 0.2315 | 0.0824 | 0.2257 | 0.0846 |
| 0.0012 | 1.4575 | 19000 | 0.0023 | 0.1955 | 0.0737 | 0.1888 | 0.0745 |
| 0.0005 | 2.0154 | 20000 | 0.0021 | 0.1668 | 0.0591 | 0.1620 | 0.0609 |

### Framework versions

- Transformers 4.48.0.dev0
- Pytorch 2.5.1+cu121
- Datasets 3.6.0
- Tokenizers 0.21.0

## Citation

Please cite the model using the following BibTeX entry:

```bibtex
@misc{deepdml/whisper-base-ar-quran-mix-norm,
      title={Fine-tuned Whisper base ASR model for speech recognition in Arabic},
      author={Jimenez, David},
      howpublished={\url{https://huggingface.co/deepdml/whisper-base-ar-quran-mix-norm}},
      year={2026}
    }
```

Downloads last month194

Safetensors

Model size

72.6M params

Tensor type

F32

·

Files info

Inference Providers [NEW](https://huggingface.co/docs/inference-providers)

[Automatic Speech Recognition](https://huggingface.co/tasks/automatic-speech-recognition "Learn more about automatic-speech-recognition")

This model isn't deployed by any Inference Provider. [🙋Ask for provider support](https://huggingface.co/spaces/huggingface/InferenceSupport/discussions/new?title=deepdml/whisper-base-ar-quran-mix-norm&description=React%20to%20this%20comment%20with%20an%20emoji%20to%20vote%20for%20%5Bdeepdml%2Fwhisper-base-ar-quran-mix-norm%5D(%2Fdeepdml%2Fwhisper-base-ar-quran-mix-norm)%20to%20be%20supported%20by%20Inference%20Providers.%0A%0A(optional)%20Which%20providers%20are%20you%20interested%20in%3F%20(Novita%2C%20Hyperbolic%2C%20Together%E2%80%A6)%0A)

## Model tree for deepdml/whisper-base-ar-quran-mix-norm

Base model

[openai/whisper-base](https://huggingface.co/openai/whisper-base)

Finetuned

( [770](https://huggingface.co/models?other=base_model:finetune:openai/whisper-base))

this model

Finetunes

[4 models](https://huggingface.co/models?other=base_model:finetune:deepdml/whisper-base-ar-quran-mix-norm)

## Datasets used to train deepdml/whisper-base-ar-quran-mix-norm

## Space using deepdml/whisper-base-ar-quran-mix-norm1

## Collection including deepdml/whisper-base-ar-quran-mix-norm

[5 items•Updated Jul 15](https://huggingface.co/collections/deepdml/quran-asr)

## Evaluation results

- Weron Quran
[self-reported](https://huggingface.co/deepdml/whisper-base-ar-quran-mix-norm/blob/main/README.md)


0.162