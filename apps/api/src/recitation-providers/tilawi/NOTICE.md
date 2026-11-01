# Tilawi recitation model — attribution

Live transcription provider `tilawi` runs this model in-process:

- **Model:** [muhdur/tilawi-fastconformer-quran](https://huggingface.co/muhdur/tilawi-fastconformer-quran)
  (revision `e9448a0e84f3adb64c28b7a8db501dd8e0e59a84`), a Quran-recitation fine-tune of
  [nvidia/stt_ar_fastconformer_hybrid_large_pcd_v1.0](https://huggingface.co/nvidia/stt_ar_fastconformer_hybrid_large_pcd_v1.0).
  License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Copyright the respective authors.
- **Reference project:** [Tilawi/quran-asr](https://github.com/Tilawi/quran-asr) (MIT). Only its model
  and vocabulary are used; the decoding and streaming code here is Tabyan's own.

CC BY 4.0 requires this credit to be shown to users, for example on the app's About or
Acknowledgements page: "Speech recognition: Tilawi FastConformer (based on NVIDIA NeMo FastConformer), CC BY 4.0."

Fetch the files with `node tools/scripts/fetch-asr-model.mjs`; they are not committed.
