# Source capture: market-nabr-api

URL: https://nabrquran.ai/en/api
Fetched: 2026-10-15

909 msaverage response timeMeasured from sending audio over WebSocket to receiving structured recitation feedback.

385 msmedian response timeA typical response arrives fast enough for live, interactive recitation.

4.23 sP95 response time95% of responses arrive within this time. Use it to plan loading, retry and fallback states.

0-8exit codesEvery response carries an exit code, so your app can handle success, unsupported content, failed checks and finished surahs separately.

## Example response

Fields can vary by session and deployment, but the core is small on purpose: position, recognized words, skipped words, and mistake lists with fixed error codes.

### What a mistake entry contains

Each tajweed or letter mistake includes the letter index, the word with tashkeel (speech), a localized message for the learner and an errorCode such as ghunna\_missed, madd\_02\_12, tadeef\_extra, letters\_mismatch, letters\_extra or letters\_missed.

response.json

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

## How the API processes a recitation

The API is a streaming assessment pipeline, not a general transcription endpoint. It returns the reciter's position in the Quran, recognized words, skipped words and localized mistake entries you can display as they are.

1. 01


### Overlapping audio windows



The API processes audio in overlapping windows, so feedback arrives while the learner is still reciting.



   - Each cycle sends a fixed-length window of audio to the correction engine.
   - The window moves forward at short intervals, keeping the latest audio and dropping the oldest.
   - The same word can fall into several windows, so the final feedback is settled across windows instead of taken from one raw pass.

2. 02


### Matching against the Quran text



The engine matches the recitation against the expected surah, ayah and word sequence.



   - The response returns chapter\_index, verse\_index and word\_index so your app can keep its display in sync with the reciter.
   - Recognized words go into correct\_words with their chapter, verse and word indexes.
   - Words that were left out, skipped, replaced or badly misread go into skipped\_words.

3. 03


### Mistakes sorted by type



After recognition, the API reports memorization, pronunciation and tajweed mistakes separately instead of merging them into one score.



   - Memorization mistakes appear in skipped\_words.
   - Tajweed mistakes appear in tajweed\_mistakes, with the letter position and a fixed errorCode.
   - Pronunciation and articulation mistakes appear in letter\_mistakes, in the same entry format.

4. 04


### Feedback ready to display



Each mistake entry carries what a mobile app, teacher dashboard, analytics pipeline or localized correction message needs.



   - letter gives the position of the letter inside the word.
   - speech holds the word as displayed, with tashkeel.
   - message explains the mistake to the learner, and errorCode lets you group and report mistakes.

## Main response fields

- exit\_code: status number from 0 to 8
- chapter\_index, verse\_index, word\_index: current position in the Quran
- correct\_words: recognized words, with chapter, verse and word indexes
- skipped\_words: memorization mistakes, or words in the sequence that were not recognized
- tajweed\_mistakes: tajweed mistakes in recognized words
- letter\_mistakes: pronunciation mistakes in recognized words

## Exit codes

Each response returns one exit code: unsupported chapter, verse not found, word not found, unsupported hifz level, unsupported tajweed level, unexpected error, success, check failed or surah finished.

- 0 CHAPTER\_NOT\_SUPPORTED
- 1 VERSE\_NOT\_FOUND
- 2 VERSE\_WORD\_NOT\_FOUND
- 3 HAFZ\_LEVEL\_NOT\_SUPPORTED
- 4 TAJWEED\_LEVEL\_NOT\_SUPPORTED
- 5 UNEXPECTED\_PROBLEM
- 6 SUCCESS
- 7 CHECK\_FAILED
- 8 SURAH\_FINISHED

## How your app should label each word

Combine the response arrays to give each word one clear status. Base the status on which arrays the word appears in, not on the transcript text alone.

1. 01


### Memorization mistake



A word in skipped\_words is a memorization mistake.



   - This covers words that were left out, skipped, replaced or not reliably recognized by the ASR.
   - Show it separately from pronunciation and tajweed feedback, because the word sequence itself failed.
   - Let the teacher or your product rules decide whether to label it skipped, missing or needs review.

2. 02


### Recognized, with mistakes



A word in correct\_words can still have tajweed mistakes, pronunciation mistakes or both.



   - If the word is in both tajweed\_mistakes and letter\_mistakes, show both.
   - If it is only in tajweed\_mistakes, tie the feedback to the tajweed rule.
   - If it is only in letter\_mistakes, focus the feedback on pronunciation and articulation.

3. 03


### Fully correct



A word is correct when it is in correct\_words and has no matching tajweed or letter mistake.



   - Mark it as correct or leave it unmarked, depending on the screen.
   - Don't mark a recognized word as a memorization mistake just because another window skipped it.
   - Use the position fields to keep word highlighting steady across overlapping windows.

4. 04


### Unsupported content and failed checks



Treat non-success exit codes as integration states, not learner mistakes.



   - An unsupported chapter, verse, word, hifz level or tajweed level should show a configuration message in your app.
   - CHECK\_FAILED and UNEXPECTED\_PROBLEM should trigger a retry, a support log entry or a graceful fallback.
   - SURAH\_FINISHED tells your app to close the session, so it doesn't have to infer completion from the word position.

## Tajweed rules and their error codes

- Ghunna: ghunna\_extra, ghunna\_missed
- Qalqala: qalqala\_extra, qalqala\_missed
- Iqlab: iqlab\_missed
- Idgham: idgham\_missed
- Ikhfaa: ikhfa\_extra, ikhfa\_missed
- Tafkheem / Tarqeeq: tafkheem\_extra, tafkheem\_missed
- Madd: madd\_extra, madd\_missed\_02, madd\_12\_02, madd\_missed\_12, madd\_02\_12, madd\_missed\_arid
- Tadeef: tadeef\_extra, tadeef\_missed

## Pronunciation mistakes covered

- Letter substitution: confusing letters with nearby makharij, heavy and light letters, or throat and glottal sounds; changing a vowel's quality; holding a sound too long or too short.
- Letter insertion: sun and moon lam, hamzat al-wasl, added harakat, Uthmani-script letters that are written but not pronounced, and some idgham cases.
- Letter deletion: dropping the moon lam, a hamza or a vowel; skipping small superscript letters; merging neighboring sounds.

## Build with the recitation API

The integration docs cover the WebSocket flow, session setup, audio streaming, response fields and error codes.

[Open API docs](https://qurani.ai/en/dashboard)

## Where to go next

Next steps for implementation, research review, trust review and product planning.

- [Developer docsOpen the current integration docs for WebSocket setup and API behavior.](https://qurani.ai/en/dashboard)
- [Pricing and accessTalk to the team about usage volume, deployment model, limits and commercial terms.](mailto:hello@misraj.ai)
- [Research and evaluationReview the model's data, annotation process and evaluation metrics before you integrate.](https://nabrquran.ai/en/research)
- [Tajweed feedbackSee how tajweed feedback is kept separate from memorization and pronunciation mistakes.](https://nabrquran.ai/en/features)
- [Makharij and pronunciationSee how the API handles letter identity, articulation, substitutions, insertions and deletions.](https://nabrquran.ai/en/features)
- [Hifz featuresPlan where memorization checks, skipped words and placement tests fit in your product.](https://nabrquran.ai/en/features)

## FAQ

### What can I build with the Nabr API?

### Is the API designed for production integrations?

### Can the API response be shown directly to learners?