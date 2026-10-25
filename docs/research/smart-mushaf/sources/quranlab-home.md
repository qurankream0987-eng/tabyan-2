Source: https://quranlab.ai/
Title: Quran Lab · Open, on-device AI for Quran recitation
Fetched: 2026-10-15T02:10:04.210Z

[Skip to content](https://quranlab.ai/#main)

الفاتحةThis is the voice spectrum of Al-Fatiha. Press play.

# Open, on-device AI for Quran recitation.

Our models listen to a recitation and write it down phoneme by phoneme, tajweed included, on a phone with no internet. Free, never sold, built as sadaqah jariyah.

[Try the playground](https://quranlab.ai/#playground) [Contribute a recitation](https://contribute.quranlab.ai/)

سورة الفاتحة

بِسْمِٱللَّهِٱلرَّحْمَـٰنِٱلرَّحِيمِ١ٱلْحَمْدُلِلَّهِرَبِّٱلْعَـٰلَمِينَ٢ٱلرَّحْمَـٰنِٱلرَّحِيمِ٣مَـٰلِكِيَوْمِٱلدِّينِ٤إِيَّاكَنَعْبُدُوَإِيَّاكَنَسْتَعِينُ٥ٱهْدِنَاٱلصِّرَٰطَٱلْمُسْتَقِيمَ٦صِرَٰطَٱلَّذِينَأَنْعَمْتَعَلَيْهِمْغَيْرِٱلْمَغْضُوبِعَلَيْهِمْوَلَاٱلضَّآلِّينَ٧

## Measured on recitations it never heard

Zipformer Quran 3.1 on all 600 clips of the held-out benchmark. Lower is better.

[See the benchmark](https://quranlab.ai/benchmark)

![](https://quranlab.ai/banners/panel-evidence.webp)

Phoneme error, all 600 clips4.13%3 held-out sets, none trained on

Held-out studio reciters2.06%200 clips

Real phone recordings5.96%200 clips

A professional reciter it never heard5.09%200 clips

## Playground

Try each model on real recitations, or on your own voice.

RecognizeZipformer Quran 3.1RestoreSAWT v4AlignMFA Quran Hafs

سورة الفاتحة

ٱلرَّحْمَـٰنِٱلرَّحِيمِ٣

The Beneficent, the Merciful.

ررَrraحِḥiۦۦiimaddمm

0:14 / 0:46

### Recite with it

- ![](https://quranlab.ai/cards/read.webp)
Read3 layouts

Read along from the mushaf page, ayah by ayah, or as a teleprompter. The text follows your voice.
Give it a try
- ![](https://quranlab.ai/cards/memorize.webp)
MemoriseHints

The words stay hidden until you recite them. Stuck? A hint shows the next word, one per tap.
Give it a try
- ![](https://quranlab.ai/cards/shuffle.webp)
ShuffleScored

Random ayat from the surahs, juz or pages you choose. Recite each from memory, then see your score.
Give it a try

## Models

Free and public, never sold. Each model states its licence. Speech recognition comes first; restoration, alignment and data serve it.

[All models](https://quranlab.ai/models)

![Two ripple patterns crossing, printed as an indigo halftone](https://quranlab.ai/banners/tajweedformer.webp)

### TajweedFormer

The next recognition model. It was going to be Zipformer Quran 4; it has its own name because the architecture is new.

Evaluation after training

Release forthcoming

![Clustered leaf-like forms, printed as an indigo halftone](https://quranlab.ai/banners/zipformer.webp)

### Zipformer Quran 3.1

Writes a recitation down phoneme by phoneme, tajweed included, streaming on a phone with no internet. No language model, so a reciter's mistake is never quietly corrected.

4.13%

PER, full 600-clip benchmark

[Hugging Face](https://huggingface.co/Quran-Lab/zipformer_p-arabic-v3) NPL-1.2

![Soft billowing clouds, printed as an indigo halftone](https://quranlab.ai/banners/sawt.webp)

### SAWT v4

Restores archive recitations to 48 kHz studio sound in the same voice, without moving a phoneme. Each restored window is checked against the input before it is kept.

0.071

PER on 120 restored archive recitations

[Hugging Face](https://huggingface.co/Quran-Lab/sawt-v4) SAWT Non-Commercial 2.0

![Folded horizontal strata, printed as an indigo halftone](https://quranlab.ai/banners/mfa.webp)

### MFA Quran Hafs

Aligns each ayah to its text phone by phone, so madd, ghunnah and qalqalah can be measured, not only word timestamps.

10–20 ms

median phone-boundary error

[Hugging Face](https://huggingface.co/Quran-Lab/mfa-quran-hafs) Apache-2.0

![Soft vertical folds of cloth, printed as an indigo halftone](https://quranlab.ai/banners/tts.webp)

### Quranic TTS

A text-to-speech model for research and teaching. Planned, not in training yet. Its corpus, QuranTTS, is already public.

301 h

QuranTTS corpus, published

[Corpus](https://huggingface.co/datasets/Quran-Lab/QuranTTS) To be announced

## Research

[All research](https://quranlab.ai/research)

- [Sep 2026Proving the potential of ternary quantization in ASRAn internal experiment: Zipformer Quran 3.1 at −1, 0 and +1 reaches 3.34% phoneme error, but it is overfit to the canonical text. Not for feedback yet; ready to build a canonicalizer on.ASR](https://quranlab.ai/research/ternary-qat)
- [Sep 2026The data behind the models: a 59,000-hour corpus, and what the models took from itQuran Lab holds more than 59,000 hours of recitation. No model trains on all of it; this is how the selections for Zipformer Quran 3 and 3.1 were made.Data](https://quranlab.ai/research/59000-hours)
- [Sep 2026Zipformer Quran 3.1: it now writes what was said4.13% phoneme error on all 600 benchmark clips, madd held as it was recited, and the Neural Engine.ASR](https://quranlab.ai/research/zipformer-v3-1)
- [Sep 2026SAWT v4: 48 kHz restoration of archive recitationsBringing archive recitations back to studio quality with a 372M flow-matching generator that renders texture but never decides what was said.Restoration](https://quranlab.ai/research/sawt-v4-restoration)
- [Sep 2026Zipformer Quran 3: closing the emphatic-letter gapHow ص ض ط ظ went from three times the error of plain letters to parity on every held-out set.ASR](https://quranlab.ai/research/zipformer-v3-emphatic-gap)

## Every voice helps the model hear better.

Recite an ayah, share a recitation, or check one. Recordings are encrypted on your device and never published. Open to everyone, from children to seniors.

[Contribute](https://contribute.quranlab.ai/)

![](https://quranlab.ai/media/reciter-poster.webp)