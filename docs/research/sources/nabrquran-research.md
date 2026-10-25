Source: https://nabrquran.ai/en/research
Title: Quran ASR Research and Evaluation
Fetched: 2026-10-10T08:33:12.519Z

# Model, data, and evaluation

Nabr is built as a research-grade Quranic voice intelligence system with dedicated audio data, annotation workflows, model evaluation, and technical transfer.

### Dedicated model

The model was developed for Quran recitation over multiple years and focuses on letters, harakat, hamzat, waqf, madd, ghunna, qalqala, tafkheem, and other recitation properties.

### Specialized data

Training data includes hundreds of thousands of purpose-recorded recitations, covering different recitation styles, skill levels, age groups, thirteen nationalities, and all Quran chapters.

### Expert annotation

Licensed Quran specialists annotated reading style, mistakes, and tajweed properties through a platform built for Quranic audio and data lifecycle management.

### Measured performance

Whisper fine-tuning reached 0.51% CER and 2.25% WER on the strongest 25-hour run, with latency measured from WebSocket audio upload to structured feedback.

51,156

### Recitation records

Real-world Quran recordings collected for model training, annotation, and evaluation.

344h

### Audio corpus

Current labeled corpus with varied clip lengths, background conditions, and reciter profiles.

24

### Annotators

Tajweed annotators contributed to the labeling workflow, with 12 still active across the past year.

0.51%

### Best CER

Character error rate from the strongest Whisper 25-hour / 3000-step benchmark run.

## Dataset and annotation pipeline

The research system is built around traceable Quran audio data, expert judgment, and staged quality control rather than generic transcript collection.

### Data sourcing

The corpus combines targeted community recordings, segmented educational media, and planned production recitations from learning environments.

- Community contributors are assigned specific verses so the dataset covers the Quran instead of over-representing frequently recited passages.
- Ayman Swaid instructional episodes are manually segmented to isolate student recitations and expert correction contexts.
- Maqra'a sessions and Iqra app recordings are planned as real-world data streams for stronger production robustness.

### Six-level mistake labeling

Annotation separates recording validity, flow, graphemic structure, phonetic nuance, intrinsic letter traits, and contextual Tajweed rules.

- Level 1 filters unusable audio caused by noise, distortion, coughing, severe hesitation, or articulation disorders.
- Level 2 marks waqf, continuity, repetitions, forced pauses, and reciter self-correction flow.
- Levels 3-6 capture orthographic deviations, allophonic nuance, sifat al-huruf, and applied rules such as idgham, ikhfa, iqlab, madd, and qalqala.

### Waqf segmentation

Pause-aware alignment combines previous manual text segmentation with acoustic pause markers from a recitation segmentation model.

- Two annotators and an external reviewer verify segment boundaries when the automatic pause projection is uncertain.
- The workflow distinguishes intentional stops, breath-driven pauses, repetitions, and rejected recordings.
- The output preserves Quran position and pause context so downstream matching can handle wasl and waqf correctly.

### Traceable annotation output

Each labeled record keeps audio metadata, annotator profile, verse context, and structured JSON annotations in one central database.

- Record-level flags track incidents, strong or weak stutter, articulation disorders, and memorization mistakes.
- Fragment annotations identify the recited text, character span, feature type, and Tajweed or phonetic feature involved.
- The schema is designed for both ASR fine-tuning and downstream mistake detection and diagnosis.

## Annotation process and quality control

The annotation workflow builds confidence without exposing sensitive source data: it documents who reviews each record, how ambiguity is handled, and which quality gates decide whether audio enters training or evaluation.

### Licensed recitation specialists

The technical proposal identifies the annotation team as Quran specialists licensed in Hafs recitation.

- Annotators review reading style, tajweed properties, pronunciation issues, waqf, repetition, and memorization mistakes.
- The database stores professional profile fields and tajweed proficiency level so review provenance can be audited internally.
- Public pages describe the expertise level and process, not personal annotator identities or private learner data.

### Layered review workflow

Audio moves through validation, mistake labeling, segmentation, and alignment rather than one flat transcript task.

- Level 1 rejects recordings with noise, distortion, coughing, severe hesitation, or articulation conditions that make them unsuitable.
- Levels 2-6 separate flow, graphemic, phonetic, sifat, and applied tajweed judgments.
- Waqf segmentation uses two annotators and an external reviewer when pause boundaries are uncertain.

### Disagreement resolution

Ambiguous cases are handled through explicit decision paths instead of hidden majority voting.

- Annotators can reject, keep, or adjust records when pause markers, reciter repetitions, or acoustic evidence are unclear.
- External review is used for uncertain segment boundaries and sensitive quality decisions.
- The roadmap includes consolidated multi-annotator labels to improve consistency before broader retraining.

### Traceable quality gates

Structured metadata keeps each usable record connected to the audio source, Quran location, and annotation JSON.

- Record-level flags track incidents, stutter strength, articulation disorders, and memorization mistakes.
- Fragment annotations preserve character spans, feature types, and tajweed or phonetic features.
- Evaluation reports can separate model errors by mistake family, recording quality, and operational context.

## Model and diagnosis engine

The production flow combines a Quran-tuned ASR model with symbolic encoding and conservative reference matching so feedback stays explainable.

### Quran-trained ASR

The selected ASR path fine-tunes Whisper for Quranic recitation and emits a specialized symbolic representation instead of plain Arabic text.

- Training data intentionally includes correct recitations and expert-defined mistake examples.
- The model is optimized for Quranic letters, harakat, hamzat, madd, waqf, ghunnah, qalqala, tafkheem, and tarqeeq.
- The decoder output feeds the diagnosis layer, where lexical plausibility alone is not enough to accept a recitation as correct.

### 8-slot phonetic encoding

A proprietary symbolic schema represents the acoustic and Tajweed-relevant properties needed for downstream comparison.

- The encoded stream lets the matcher compare phoneme identity, vowel state, duration, and rule-bearing features.
- Ground-truth generation changes according to Quran text, waqf symbols, stop conditions, and wasl continuity.
- Future schema expansion is planned for more granular permanent traits such as hams and jahr.

### Two-stage matching

The engine first locates the relevant audio window, then performs word and character matching against the Quran reference.

- Window matching identifies the segment being recited so live streams can be synchronized with the expected passage.
- Word and character matching classify added, deleted, and mismatched elements at textual, phonetic, and Tajweed levels.
- Streaming arbitration avoids reporting an error when a reliable clean window has already recognized the same word correctly.

### Three error families

Diagnosis is intentionally split into memorization, phonetic, and Tajweed branches so product UIs can respond with the right teaching action.

- Memorization errors cover omissions, additions, substitutions, and words pronounced so incorrectly that sequence matching fails.
- Phonetic errors cover letter substitution, insertion, deletion, vowel shifts, duration shifts, and tadeef issues.
- Tajweed errors cover ghunnah, qalqala, iqlab, idgham, ikhfa, tafkheem, tarqeeq, and madd.

## Evaluation and operating profile

The current evidence combines ASR accuracy, a developing expert-led MDD benchmark, and live-system latency measurements.

2.25%

### Best WER

Whisper 25-hour / 3000-step run.

2,000

### Benchmark target

Correct and error-state recordings planned from 1,000 expert-selected cases.

909 ms

### Average RTT

Observed WebSocket round trip for tilawa\_audio\_result.

385 ms

### Median RTT

Typical successful response time in the measured profile.

4.23 s

### P95 RTT

Tail latency affected by windowing and current Python/FastAPI bottlenecks.

| Model | Dataset / run | CER | WER | Reading |
| --- | --- | --- | --- | --- |
| Whisper | 25 hours / 3000 steps | 0.51% | 2.25% | Best observed ASR run and the selected direction for recitation tuning. |
| Whisper selected | 50 hours / 20 epochs | 0.59% | 2.26% | Nearly identical WER indicates data quality and diversity matter more than raw hours. |
| Wav2Vec2-Bert | 25 hours | 1.25% | 6.89% | Competitive baseline but behind fine-tuned Whisper on this Quranic task. |
| QuartzNet | 25 hours | 1.37% | 7.47% | Useful baseline for comparison against transformer-based approaches. |
| Canary | 25 hours | 6.28% | 28.14% | Unsuitable for this domain in the observed experiment. |

## Sustainable model lifecycle

### Collect and annotate

Purpose-recorded Quran audio is annotated by qualified specialists through a platform designed for recitation data, reading styles, and tajweed properties.

### Train and retrain

The delivery model supports importing annotated data, preparing training sets, tuning model parameters, and retraining as more institutional data becomes available.

### Evaluate and report

Evaluation covers CER, WER, performance by recording quality, and detailed error reports by mistake family so teams can prioritize model improvements.

## Supported / not yet supported

These boundaries make the current model easier to evaluate in real products. They describe what the system is designed to handle now and which edge cases should shape rollout plans.

### Supported

Good-fit use cases for the current Nabr model and matching engine.

- Full Quran reference coverage, with assigned recordings used to balance coverage across all chapters.
- Streaming or completed audio for memorization, phonetic, and tajweed feedback in controlled learning workflows.
- Core tajweed and pronunciation issues including ghunnah, qalqala, iqlab, idgham, ikhfa, tafkheem, tarqeeq, madd, tadeef, and letter substitution or deletion.
- Recordings with normal real-world variation when speech is clear enough for the acoustic signal to support the judgment.

### Not yet supported

Cases that need careful product handling, teacher review, or future model work.

- Reliable diagnosis in very noisy, distorted, low-volume, or heavily interrupted recordings.
- Perfect generalization across every accent, non-Arabic learner profile, device type, and recording environment.
- Extreme recitation speeds such as hadr or tahqiq when 30-second windows make alignment unstable.
- Granular permanent sifat such as hams versus jahr unless the issue appears as a broader phoneme substitution.

## Known limitations

The current system is strong enough to productize carefully, but the report identifies clear technical risks that should shape rollout and roadmap decisions.

### Canonical bias

Whisper-style encoder-decoder models can complete a verse toward the expected Quran text when the acoustic signal contains an intentional mistake.

- This can create false acceptances where a real recitation error is hidden by the model's internal language prior.
- More error-labeled data and conservative matching are needed to keep the system sensitive to actual acoustic evidence.

### Data coverage

Current data is not yet broad enough to represent every speaker group, accent, recording device, and environment.

- The corpus is currently concentrated around Levant pronunciation patterns.
- Background noise and non-studio audio can still reduce sensitivity to subtle Tajweed features.

### Windowing constraints

Whisper's 30-second windowing can miss the first or last words of a segment and complicate skipped-word tracking.

- Extreme recitation speeds such as hadr and tahqiq need better calibration for stable alignment.
- The next matcher version should adapt more dynamically to incoming audio windows.

### Active rule set

The current matcher focuses on a closed set of high-impact memorization, phonetic, and Tajweed errors.

- Some granular permanent sifat are not yet represented in ground-truth generation.
- Expanding the schema is required before errors such as hams-versus-jahr can be diagnosed without full phoneme substitution.

## Roadmap

The next versions focus on stabilization first, then broader architecture and annotation-system changes.

### Version 2.5 stabilization

The next hardening cycle should start after the Iqra platform feedback and technical issues are consolidated.

- Run integrated training on the full augmented dataset with consolidated multi-annotator labels.
- Reduce overfitting and canonical bias by expanding authenticated error-labeled samples.
- Improve robustness to noise, device distortion, and high-speed recitation through targeted augmentation.

### Version 3.0 expansion

The following phase expands the model, rule system, and annotation workflow for deeper diagnosis.

- Explore model scales, epochs, hyperparameters, and alternative encoding schemas.
- Extend ground-truth and training data to cover more Tajweed rules and sub-phonemic attributes.
- Merge Tajweed and waqf labeling into a single-pass annotation stage with human-in-the-loop predictions.

## Apply the research carefully

Research content should support adoption without becoming sales copy. These links help teams move from evidence to the right implementation surface.

### Quran ASR model

Start with the model and data story before choosing a product workflow.

[View features](https://nabrquran.ai/en/features)

### Tajweed AI

Connect rule-aware feedback to learner and teacher interfaces.

[Explore features](https://nabrquran.ai/en/features)

### Developer API

Move from research validation to WebSocket integration and response fields.

[Review API](https://nabrquran.ai/en/api)

### Research collaboration

Discuss evaluation, datasets, annotation workflows, or institution-ready deployment.

[Contact us](mailto:hello@misraj.ai)

## Research opportunities

Quran recitation ASR

Audio classification of tajweed errors

High-quality Arabic speech datasets

Learner error modeling by age and level

Impact of immediate feedback on improvement

## FAQ

### What research areas does Nabr focus on?

Nabr focuses on Quran ASR, recitation feedback, tajweed signals, makharij analysis, and evaluation workflows.

### Can research teams collaborate with Nabr?

### Does Nabr support evaluation workflows?