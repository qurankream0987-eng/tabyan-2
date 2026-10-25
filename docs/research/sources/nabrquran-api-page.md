Source: https://nabrquran.ai/en/api
Title: Quran Recitation API for Developers
Fetched: 2026-10-10T08:31:29.575Z

# Developer API and response structure

The API is designed around stable fields and error codes so teams can build clear interfaces, localized messages, and analytics without reverse-engineering model output.

response.json

tilaweh-checker.ts

```
{
  "exit_code": 6,
  "chapter_index": 1,
  "correct_words": [\
    { "chapter": 1, "verse": 6, "word": 1 }\
  ],
  "tajweed_mistakes": [\
    {\
      "speech": "ٱلصِّرَٰطَ",\
      "errorCode": "madd_missed_02"\
    }\
  ]
}
```

```
const classifyWord = (word) => {
  if (word.inSkippedWords) return "memorization";

  const hasTajweed = word.errors.includes("tajweed");
  const hasLetters = word.errors.includes("letters");

  return conservativeWindowVote({
    recognized: true,
    tajweed: hasTajweed,
    phonetic: hasLetters
  });
};
```

## Exit codes

Processing states include unsupported chapter, verse not found, word not found, unsupported hafz or tajweed level, unexpected problem, success, check failed, and surah finished.

## Error entry anatomy

Each tajweed or letter mistake contains letter index, shaped speech text, localized instructional message, and an errorCode such as ghunna\_missed, madd\_02\_12, tadeef\_extra, letters\_mismatch, letters\_extra, or letters\_missed.

909 ms

### average response time

Measured round-trip time from WebSocket audio transmission to structured recitation feedback.

385 ms

### median response time

Typical successful responses are fast enough for interactive recitation product flows.

4.23 s

### P95 response time

Tail latency is documented so teams can design loading, retry, and fallback states honestly.

0-8

### status contract

Each response carries an exit code that lets apps route success, unsupported content, failed checks, and completed surahs.

## How a recitation request is processed

The docs describe the API as a streaming assessment pipeline, not a generic transcript endpoint. Product teams receive Quran position, recognized words, skipped words, and localized mistake entries that can be rendered directly.

### Streaming audio windows

Audio is processed in overlapping windows so feedback can be produced while the learner continues reciting.

- Each cycle sends a fixed-duration transcription window to the correction engine.
- The window slides forward on a frequent interval, keeping recent audio while discarding older audio.
- The same word may appear in multiple windows, which is why final feedback uses arbitration instead of a single raw pass.

### Quran reference alignment

The engine matches the recognized recitation against the target surah, ayah, and word sequence.

- The response reports chapter\_index, verse\_index, and word\_index so the client can keep UI state synchronized.
- Recognized words move into correct\_words with chapter, verse, and word indexes.
- Omitted, skipped, substituted, or severely misread sequence words are returned in skipped\_words.

### Layered mistake diagnosis

After recognition, the system separates memorization, phonetic, and tajweed concerns instead of flattening them into one score.

- Memorization errors are represented by skipped\_words.
- Tajweed rule violations are returned in tajweed\_mistakes with letter-level location and stable errorCode values.
- Pronunciation and articulation issues are returned in letter\_mistakes using the same mistake-entry structure.

### Client-ready feedback

Each mistake entry includes enough information for a mobile app, teacher dashboard, analytics pipeline, or localized correction message.

- letter identifies the exact character location inside the word.
- speech carries the displayed word with tashkeel.
- message provides an instructional explanation, while errorCode supports reporting and grouping.

## Primary response fields

- exit\_code: status integer from 0 to 8
- chapter\_index, verse\_index, word\_index: current Quran position
- correct\_words: recognized words with chapter, verse, and word indexes
- skipped\_words: memorization errors or unrecognized sequence words
- tajweed\_mistakes: rule violations inside recognized words
- letter\_mistakes: phonetic deviations inside recognized words

## Exit codes

- 0 CHAPTER\_NOT\_SUPPORTED
- 1 VERSE\_NOT\_FOUND
- 2 VERSE\_WORD\_NOT\_FOUND
- 3 HAFZ\_LEVEL\_NOT\_SUPPORTED
- 4 TAJWEED\_LEVEL\_NOT\_SUPPORTED
- 5 UNEXPECTED\_PROBLEM
- 6 SUCCESS
- 7 CHECK\_FAILED
- 8 SURAH\_FINISHED

## Example payload shape

The exact payload can vary by session and deployment, but the contract is intentionally small: position, recognized words, skipped words, and mistake arrays with stable error codes.

```
{
  "exit_code": 6,
  "chapter_index": 1,
  "verse_index": 2,
  "word_index": 3,
  "correct_words": [\
    { "chapter": 1, "verse": 2, "word": 1 }\
  ],
  "skipped_words": [\
    { "chapter": 1, "verse": 2, "word": 2 }\
  ],
  "tajweed_mistakes": [\
    {\
      "chapter": 1,\
      "verse": 2,\
      "word": 3,\
      "letter": 4,\
      "speech": "...",\
      "message": "Localized correction tip",\
      "errorCode": "madd_missed_02"\
    }\
  ],
  "letter_mistakes": []
}
```

## How clients should classify a word

The response arrays are designed to be composed into a clear word status. The docs recommend classifying from array membership rather than trying to infer meaning from transcript text alone.

### Memorization error

A word is treated as a memorization issue when it appears in skipped\_words.

- Use this for omitted words, skipped words, major substitutions, and words the ASR could not identify reliably.
- Display this separately from pronunciation or tajweed because the sequence itself did not pass.
- Let teachers or product policy decide whether to call this skipped, missing, or needs review.

### Recognized with specific mistakes

A word in correct\_words can still carry tajweed, phonetic, or combined mistakes.

- If the word also appears in tajweed\_mistakes and letter\_mistakes, show both categories.
- If it appears only in tajweed\_mistakes, keep the feedback rule-aware.
- If it appears only in letter\_mistakes, focus the UI on pronunciation and articulation.

### Fully correct recognition

A word is treated as correct when it appears in correct\_words and has no matching tajweed or letter mistake.

- This state should be rendered positively or left unmarked, depending on the product surface.
- Avoid treating a recognized word as a memorization error just because another window had a skipped result.
- Use the position fields to keep word highlighting stable across repeated windows.

### Unsupported or failed checks

Non-success exit codes should be handled as integration states, not learner mistakes.

- Unsupported chapter, verse, word, hafz level, or tajweed level should route to product configuration messages.
- CHECK\_FAILED and UNEXPECTED\_PROBLEM should trigger retry, support logging, or a graceful fallback.
- SURAH\_FINISHED lets the product finalize a session without guessing from word position alone.

## Tajweed rule coverage

- Ghunna: ghunna\_extra, ghunna\_missed
- Qalqala: qalqala\_extra, qalqala\_missed
- Iqlab: iqlab\_missed
- Idgham: idgham\_missed
- Ikhfaa: ikhfa\_extra, ikhfa\_missed
- Tafkheem / Tarqeeq: tafkheem\_extra, tafkheem\_missed
- Madd: madd\_extra, madd\_missed\_02, madd\_12\_02, madd\_missed\_12, madd\_02\_12, madd\_missed\_arid
- Tadeef: tadeef\_extra, tadeef\_missed

## Phonetic case registry

- Letter substitution: makhraj proximity, heavy/light letter confusion, throat/glottal substitutions, vowel quality changes, and duration shifts.
- Letter insertion: solar/lunar lam, hamzat al-wasl, added harakat, silent Uthmani-script letters, and selected idgham word cases.
- Letter deletion: missed lunar lam, omitted hamza, dropped vowels, unpronounced small/superscript letters, and merged neighboring phonemes.

## Cross-window arbitration

Because the same word can appear in multiple overlapping windows, the final interpretation is deliberately conservative. This reduces false alarms caused by ASR variation at window boundaries.

### Recognition overrules skipped output

If a word is recognized in at least one reliable window, it should not be finalized as a memorization error only because another window skipped it.

- A final memorization error is used when the word never appears in correct\_words across the relevant windows.
- This protects learners from skipped-word false alarms caused by window boundaries or temporary ASR instability.
- Dashboards can still keep raw attempts for diagnostics while showing the conservative final state to learners.

### Tajweed errors must persist

For a recognized word, tajweed feedback is finalized only when the error persists across processed windows.

- If any reliable window recognizes the word without a tajweed error, the final output can treat that word as tajweed-clean.
- When the error persists, the system reports the smallest stable set of tajweed mistakes.
- This helps keep correction feedback focused instead of overwhelming learners with unstable signals.

### Phonetic errors follow the same rule

Letter-level pronunciation mistakes are also evaluated independently across windows.

- A word can be free of phonetic errors if any reliable processed window has no matching letter\_mistakes entry.
- Persistent pronunciation errors are reported with letter, speech, message, and errorCode.
- This lets apps present articulation issues separately from tajweed timing or rule application.

### Product UI should show confidence through behavior

The API contract supports conservative presentation without forcing a single scoring model on every customer.

- Show stable final feedback to learners.
- Expose raw or repeated-window evidence in teacher and QA tools when useful.
- Handle long tail latency with clear loading and retry states rather than marking the learner wrong.

## Build with the recitation API

Review the integration docs for the WebSocket flow, session setup, audio streaming, response fields, and error codes.

[Open API docs](https://qurani.ai/en/docs/2-advanced-tools/qrc)

## Continue from the API

Use the API page as a hub for implementation, research validation, trust review, and product planning.

### Developer docs

Open the current integration documentation for WebSocket setup and API behavior.

[Open docs](https://qurani.ai/en/docs/2-advanced-tools/qrc)

### Pricing and access

Contact the team to discuss usage volume, deployment model, limits, and commercial terms.

[Request demo](mailto:hello@misraj.ai)

### Research validation

Review model data, annotation workflows, and evaluation metrics before technical adoption.

[Read research](https://nabrquran.ai/en/research)

### Tajweed feedback

See how the system separates rule-aware feedback from memorization and phonetic issues.

[View features](https://nabrquran.ai/en/features)

### Makharij and phonetics

Understand letter identity, articulation, substitutions, insertions, and deletions.

[View features](https://nabrquran.ai/en/features)

### Hifz workflows

Map memorization assessment, skipped words, and placement flows to product surfaces.

[What to build](https://nabrquran.ai/en/features)

## FAQ

### What can I build with the Nabr API?

You can build recitation assessment, tajweed feedback, hifz review, makharij analysis, and Quran voice search experiences.

### Is the API designed for production integrations?

### Can the API response be shown directly to learners?