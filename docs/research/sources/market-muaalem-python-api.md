# Source capture: market-muaalem-python-api

URL: https://obadx.github.io/quran-muaalem/en/muaalem/python-api.html
Fetched: 2026-10-15

[Skip to content](https://obadx.github.io/quran-muaalem/en/muaalem/python-api.html#VPContent)

On this page

# Python API [​](https://obadx.github.io/quran-muaalem/en/muaalem/python-api.html\#python-api)

The core inference class is `Muaalem` in `src/quran_muaalem/inference.py`. It runs the multi‑level CTC model and returns phoneme predictions plus per‑phoneme sifat attributes.

## Class signature [​](https://obadx.github.io/quran-muaalem/en/muaalem/python-api.html\#class-signature)

python

```
class Muaalem:
    def __init__(
        self,
        model_name_or_path: str = "obadx/muaalem-model-v3_2",
        device: str = "cpu",
        dtype=torch.bfloat16,
    ):
        ...

    @torch.no_grad()
    def __call__(
        self,
        waves: list[list[float] | torch.FloatTensor | NDArray],
        ref_quran_phonetic_script_list: list[QuranPhoneticScriptOutput],
        sampling_rate: int,
    ) -> list[MuaalemOutput]:
        ...
```

## Inputs [​](https://obadx.github.io/quran-muaalem/en/muaalem/python-api.html\#inputs)

### 1) Audio (`waves`) [​](https://obadx.github.io/quran-muaalem/en/muaalem/python-api.html\#_1-audio-waves)

- A list of waveforms (batch).
- Each waveform can be:
  - `list[float]`
  - `torch.FloatTensor`
  - `numpy.ndarray`
- **Required sample rate:**`16000 Hz`. The implementation raises `ValueError` if it is not `16000`.

### 2) Reference phonetic scripts (`ref_quran_phonetic_script_list`) [​](https://obadx.github.io/quran-muaalem/en/muaalem/python-api.html\#_2-reference-phonetic-scripts-ref-quran-phonetic-script-list)

- A list of `QuranPhoneticScriptOutput` objects.
- Generate them using `quran_transcript.quran_phonetizer(..., remove_spaces=True)` to match the expected alignment.

Example reference generation:

python

```
from quran_transcript import Aya, quran_phonetizer, MoshafAttributes

uthmani_ref = Aya(8, 75).get_by_imlaey_words(17, 9).uthmani
moshaf = MoshafAttributes(
    rewaya="hafs",
    madd_monfasel_len=4,
    madd_mottasel_len=4,
    madd_mottasel_waqf=4,
    madd_aared_len=4,
)
ref = quran_phonetizer(uthmani_ref, moshaf, remove_spaces=True)
```

## Outputs [​](https://obadx.github.io/quran-muaalem/en/muaalem/python-api.html\#outputs)

The call returns `list[MuaalemOutput]` (one per input waveform). See `src/quran_muaalem/muaalem_typing.py`:

- `Unit` — decoded sequence with `text`, `probs`, and `ids`.
- `Sifa` — per‑phoneme group of phonetic attributes (`SingleUnit | None`).
- `MuaalemOutput` — container with `phonemes` and `sifat`.

For a detailed schema and example output, see **Outputs**.

## Minimal example [​](https://obadx.github.io/quran-muaalem/en/muaalem/python-api.html\#minimal-example)

python

```
from librosa.core import load
import torch
from quran_transcript import Aya, quran_phonetizer, MoshafAttributes
from quran_muaalem import Muaalem

sampling_rate = 16000
wave, _ = load("./assets/test.wav", sr=sampling_rate, mono=True)

uthmani_ref = Aya(8, 75).get_by_imlaey_words(17, 9).uthmani
moshaf = MoshafAttributes(
    rewaya="hafs",
    madd_monfasel_len=4,
    madd_mottasel_len=4,
    madd_mottasel_waqf=4,
    madd_aared_len=4,
)
ref = quran_phonetizer(uthmani_ref, moshaf, remove_spaces=True)

model = Muaalem(device="cuda" if torch.cuda.is_available() else "cpu")
outs = model([wave], [ref], sampling_rate=sampling_rate)
print(outs[0].phonemes.text)
```

## Error handling and edge cases [​](https://obadx.github.io/quran-muaalem/en/muaalem/python-api.html\#error-handling-and-edge-cases)

- `sampling_rate != 16000` → `ValueError`.
- If alignment lengths mismatch, the decoder may insert padding tokens; some `Sifa` attributes can be `None`.
- Model runs in `torch.no_grad()` by design (inference only).

## Performance notes [​](https://obadx.github.io/quran-muaalem/en/muaalem/python-api.html\#performance-notes)

- Default `dtype` is `torch.bfloat16`. You can override it (e.g., `torch.float16`) if your GPU does not support BF16.
- The model is loaded on construction; reuse the same `Muaalem` instance for multiple calls to avoid reload cost.