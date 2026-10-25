Source: https://docs.cloud.google.com/speech-to-text/docs/speech-to-text-supported-languages
Title: Cloud Speech-to-Text V2 supported languages  |  Google Cloud Documentation
Fetched: 2026-10-05T15:27:34.424Z

[Skip to main content](https://docs.cloud.google.com/speech-to-text/docs/speech-to-text-supported-languages#main-content)

[![Google Cloud Documentation](https://www.gstatic.com/devrel-devsite/prod/vfdb441d2e08dbd9d3e48d8cd72b242388a87bcf7626bf5fb9df50c2bdd4a70fd/clouddocs/images/lockup_full_color.svg)](https://docs.cloud.google.com/)

`/`

[Console](https://console.cloud.google.com/)

- English
- Deutsch
- Español
- Español – América Latina
- Français
- Indonesia
- Italiano
- Português
- Português – Brasil
- עברית
- 中文 – 简体
- 中文 – 繁體
- 日本語
- 한국어

Sign in

[![](https://docs.cloud.google.com/_static/clouddocs/images/icons/categories/ai-and-machine-learning-color.svg)](https://docs.cloud.google.com/speech-to-text/docs)

- [Cloud Speech-to-Text](https://docs.cloud.google.com/speech-to-text/docs)

[Start free](https://console.cloud.google.com/freetrial)

- [Home](https://docs.cloud.google.com/)
- [Documentation](https://docs.cloud.google.com/docs)
- [AI and ML](https://docs.cloud.google.com/docs/ai-ml)
- [Cloud Speech-to-Text](https://docs.cloud.google.com/speech-to-text/docs)



 Send feedback



# Cloud Speech-to-Text V2 supported languages    Stay organized with collections      Save and categorize content based on your preferences.

This page lists all languages supported by Cloud Speech-to-Text. Language is
specified within a recognition request's
[`languageCodes`](https://docs.cloud.google.com/speech-to-text/docs/reference/rpc/google.cloud.speech.v2#recognizer)
parameter. For more information about sending a recognition request and
specifying the language of the transcription, see the [how-to\\
guides](https://docs.cloud.google.com/speech-to-text/docs/how-to) about performing speech recognition. For
more information about the [class\\
tokens](https://docs.cloud.google.com/speech-to-text/docs/adaptation-model#classes) available for each
language, see the [class tokens page](https://docs.cloud.google.com/speech-to-text/docs/class-tokens).

## Try it for yourself

If you're new to Google Cloud, create an account to evaluate how
Cloud STT performs in real-world
scenarios. New customers also get $300 in free credits to run, test, and
deploy workloads.


[Try Cloud STT free](https://console.cloud.google.com/freetrial)

The table below lists the models available for each language. Cloud
Speech-to-Text offers multiple
[recognition models](https://docs.cloud.google.com/speech-to-text/docs/basics#select-model),
each tuned to different audio types.

Some languages are supported by additional models which are optimized for
additional audio types: These include **telephony\_short** and **telephony**.

Use only the language codes shown in the following table. The following language
codes are officially maintained and monitored externally by Google. Using other
language codes can result in breaking changes.

Filter by region:
asia-northeast1asia-south1asia-southeast1eueurope-west2europe-west3europe-west4globalnorthamerica-northeast1usus-central1

Filter by supported feature:


[Automatic punctuation](https://docs.cloud.google.com/speech-to-text/docs/automatic-punctuation)

[Speaker diarization](https://docs.cloud.google.com/speech-to-text/docs/multiple-voices)

[Model adaptation](https://docs.cloud.google.com/speech-to-text/docs/adaptation-model)

[Word-level confidence](https://docs.cloud.google.com/speech-to-text/docs/word-confidence)(Preview)

Profanity filter

[Spoken punctuation](https://docs.cloud.google.com/speech-to-text/docs/spoken-punctuation-emojis)(Preview)

[Spoken emoji](https://docs.cloud.google.com/speech-to-text/docs/spoken-punctuation-emojis)(Preview)

Filter by language:


| Location | Name | BCP-47 | Model | Automatic punctuation | Diarization | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| asia-south1 | English (United States) | en-US | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| asia-southeast1 | Afrikaans (South Africa) | af-ZA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Afrikaans (South Africa) | af-ZA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Albanian (Albania) | sq-AL | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Albanian (Albania) | sq-AL | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Amharic (Ethiopia) | am-ET | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Amharic (Ethiopia) | am-ET | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Arabic (Egypt) | ar-EG | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Arabic (Egypt) | ar-EG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Armenian (Armenia) | hy-AM | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Armenian (Armenia) | hy-AM | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Aromanian (Bulgaria) | rup-BG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Assamese (India) | as-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Assamese (India) | as-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Asturian (Spain) | ast-ES | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Asturian (Spain) | ast-ES | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Azerbaijani (Azerbaijan) | az-AZ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Azerbaijani (Azerbaijan) | az-AZ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Basque (Spain) | eu-ES | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Basque (Spain) | eu-ES | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Belarusian (Belarus) | be-BY | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Belarusian (Belarus) | be-BY | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Bengali (Bangladesh) | bn-BD | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Bengali (India) | bn-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Bosnian (Bosnia and Herzegovina) | bs-BA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Bosnian (Bosnia and Herzegovina) | bs-BA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Bulgarian (Bulgaria) | bg-BG | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Bulgarian (Bulgaria) | bg-BG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Burmese (Myanmar) | my-MM | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Burmese (Myanmar) | my-MM | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Catalan (Spain) | ca-ES | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Catalan (Spain) | ca-ES | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Cebuano (Philippines) | ceb-PH | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Cebuano (Philippines) | ceb-PH | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Central Kurdish (Iraq) | ckb-IQ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Central Kurdish (Iraq) | ckb-IQ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Chinese (Simplified, China) | cmn-Hans-CN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Chinese (Simplified, China) | cmn-Hans-CN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Chinese, Cantonese (Traditional Hong Kong) | yue-Hant-HK | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Chinese, Cantonese (Traditional Hong Kong) | yue-Hant-HK | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Chinese, Mandarin (Traditional, Taiwan) | cmn-Hant-TW | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Chinese, Mandarin (Traditional, Taiwan) | cmn-Hant-TW | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Croatian (Croatia) | hr-HR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Croatian (Croatia) | hr-HR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Czech (Czech Republic) | cs-CZ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Czech (Czech Republic) | cs-CZ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Danish (Denmark) | da-DK | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Danish (Denmark) | da-DK | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Dutch (Netherlands) | nl-NL | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Dutch (Netherlands) | nl-NL | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | English (Australia) | en-AU | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | English (Australia) | en-AU | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | English (Australia) | en-AU | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| asia-southeast1 | English (India) | en-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | English (India) | en-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | English (United Kingdom) | en-GB | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | English (United Kingdom) | en-GB | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | English (United Kingdom) | en-GB | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| asia-southeast1 | English (United States) | en-US | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | English (United States) | en-US | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | English (United States) | en-US | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| asia-southeast1 | Estonian (Estonia) | et-EE | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Estonian (Estonia) | et-EE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Filipino (Philippines) | fil-PH | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Filipino (Philippines) | fil-PH | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Finnish (Finland) | fi-FI | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Finnish (Finland) | fi-FI | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | French (Canada) | fr-CA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | French (Canada) | fr-CA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | French (Canada) | fr-CA | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| asia-southeast1 | French (France) | fr-FR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | French (France) | fr-FR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | French (France) | fr-FR | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| asia-southeast1 | Fulah (Senegal) | ff-SN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Galician (Spain) | gl-ES | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Galician (Spain) | gl-ES | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Ganda (Uganda) | lg-UG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Georgian (Georgia) | ka-GE | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Georgian (Georgia) | ka-GE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | German (Germany) | de-DE | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | German (Germany) | de-DE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | German (Germany) | de-DE | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| asia-southeast1 | Greek (Greece) | el-GR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Greek (Greece) | el-GR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Gujarati (India) | gu-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Gujarati (India) | gu-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Hausa (Nigeria) | ha-NG | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Hausa (Nigeria) | ha-NG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Hebrew (Israel) | iw-IL | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Hebrew (Israel) | iw-IL | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Hindi (India) | hi-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Hindi (India) | hi-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Hungarian (Hungary) | hu-HU | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Hungarian (Hungary) | hu-HU | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Icelandic (Iceland) | is-IS | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Icelandic (Iceland) | is-IS | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Igbo (Nigeria) | ig-NG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Indonesian (Indonesia) | id-ID | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Indonesian (Indonesia) | id-ID | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Irish (Ireland) | ga-IE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Italian (Italy) | it-IT | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Italian (Italy) | it-IT | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Italian (Italy) | it-IT | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| asia-southeast1 | Japanese (Japan) | ja-JP | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Japanese (Japan) | ja-JP | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Javanese (Indonesia) | jv-ID | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Javanese (Indonesia) | jv-ID | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Kabuverdianu (Cape Verde) | kea-CV | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Kabuverdianu (Cape Verde) | kea-CV | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Kamba (Kenya) | kam-KE | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Kamba (Kenya) | kam-KE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Kannada (India) | kn-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Kannada (India) | kn-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Kazakh (Kazakhstan) | kk-KZ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Kazakh (Kazakhstan) | kk-KZ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Khmer (Cambodia) | km-KH | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Khmer (Cambodia) | km-KH | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Korean (South Korea) | ko-KR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Korean (South Korea) | ko-KR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Kyrgyz (Cyrillic) | ky-KG | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Kyrgyz (Cyrillic) | ky-KG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Lao (Laos) | lo-LA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Lao (Laos) | lo-LA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Latvian (Latvia) | lv-LV | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Latvian (Latvia) | lv-LV | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Lingala (Congo-Kinshasa) | ln-CD | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Lingala (Congo-Kinshasa) | ln-CD | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Lithuanian (Lithuania) | lt-LT | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Lithuanian (Lithuania) | lt-LT | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Luo (Kenya) | luo-KE | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Luo (Kenya) | luo-KE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Luxembourgish (Luxembourg) | lb-LU | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Luxembourgish (Luxembourg) | lb-LU | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Macedonian (North Macedonia) | mk-MK | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Macedonian (North Macedonia) | mk-MK | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Malay (Malaysia) | ms-MY | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Malay (Malaysia) | ms-MY | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Malayalam (India) | ml-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Malayalam (India) | ml-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Maltese (Malta) | mt-MT | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Maltese (Malta) | mt-MT | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Maori (New Zealand) | mi-NZ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Maori (New Zealand) | mi-NZ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Marathi (India) | mr-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Marathi (India) | mr-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Mongolian (Mongolia) | mn-MN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Mongolian (Mongolia) | mn-MN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Nepali (Nepal) | ne-NP | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Nepali (Nepal) | ne-NP | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Norwegian Bokmål (Norway) | no-NO | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Norwegian Bokmål (Norway) | no-NO | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Nyanja (Malawi) | ny-MW | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Nyanja (Malawi) | ny-MW | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Occitan (France) | oc-FR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Occitan (France) | oc-FR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Oriya (India) | or-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Oromo (Ethiopia) | om-ET | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Pashto | ps-AF | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Pashto | ps-AF | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Persian (Iran) | fa-IR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Persian (Iran) | fa-IR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Polish (Poland) | pl-PL | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Polish (Poland) | pl-PL | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Portuguese (Brazil) | pt-BR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Portuguese (Brazil) | pt-BR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Portuguese (Brazil) | pt-BR | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| asia-southeast1 | Portuguese (Portugal) | pt-PT | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Punjabi (Gurmukhi India) | pa-Guru-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Punjabi (Gurmukhi India) | pa-Guru-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Romanian (Romania) | ro-RO | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Romanian (Romania) | ro-RO | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Russian (Russia) | ru-RU | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Russian (Russia) | ru-RU | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Sepedi (South Africa) | nso-ZA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Sepedi (South Africa) | nso-ZA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Serbian (Serbia) | sr-RS | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Serbian (Serbia) | sr-RS | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Shona (Zimbabwe) | sn-ZW | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Shona (Zimbabwe) | sn-ZW | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Sindhi (India) | sd-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Sindhi (India) | sd-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Sinhala (Sri Lanka) | si-LK | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Sinhala (Sri Lanka) | si-LK | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Slovak (Slovakia) | sk-SK | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Slovak (Slovakia) | sk-SK | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Slovenian (Slovenia) | sl-SI | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Slovenian (Slovenia) | sl-SI | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Somali | so-SO | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Somali | so-SO | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Spanish (Latin American) | es-419 | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Spanish (Spain) | es-ES | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Spanish (Spain) | es-ES | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Spanish (Spain) | es-ES | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| asia-southeast1 | Spanish (United States) | es-US | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Spanish (United States) | es-US | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Spanish (United States) | es-US | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| asia-southeast1 | Sundanese (Indonesia) | su-ID | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Sundanese (Indonesia) | su-ID | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Swahili | sw | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Swahili | sw | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Swahili (Kenya) | sw-KE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Swedish (Sweden) | sv-SE | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Swedish (Sweden) | sv-SE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Tajik (Tajikistan) | tg-TJ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Tajik (Tajikistan) | tg-TJ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Tamil (India) | ta-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Tamil (India) | ta-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Telugu (India) | te-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Telugu (India) | te-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Thai (Thailand) | th-TH | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Thai (Thailand) | th-TH | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Turkish (Turkey) | tr-TR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Turkish (Turkey) | tr-TR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Ukrainian (Ukraine) | uk-UA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Ukrainian (Ukraine) | uk-UA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Umbundu (Angola) | umb-AO | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Urdu (Pakistan) | ur-PK | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Urdu (Pakistan) | ur-PK | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Uzbek (Uzbekistan) | uz-UZ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Uzbek (Uzbekistan) | uz-UZ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Vietnamese (Vietnam) | vi-VN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Vietnamese (Vietnam) | vi-VN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Welsh (United Kingdom) | cy-GB | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Welsh (United Kingdom) | cy-GB | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Wolof (Senegal) | wo-SN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Wolof (Senegal) | wo-SN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Xhosa (South Africa) | xh-ZA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Yoruba (Nigeria) | yo-NG | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Yoruba (Nigeria) | yo-NG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| asia-southeast1 | Zulu (South Africa) | zu-ZA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| asia-southeast1 | Zulu (South Africa) | zu-ZA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Afrikaans (South Africa) | af-ZA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Albanian (Albania) | sq-AL | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Amharic (Ethiopia) | am-ET | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (Algeria) | ar-DZ | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (Algeria) | ar-DZ | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Algeria) | ar-DZ | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Bahrain) | ar-BH | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (Bahrain) | ar-BH | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Bahrain) | ar-BH | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Egypt) | ar-EG | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (Egypt) | ar-EG | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Egypt) | ar-EG | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Iraq) | ar-IQ | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (Iraq) | ar-IQ | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Iraq) | ar-IQ | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Israel) | ar-IL | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (Israel) | ar-IL | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Israel) | ar-IL | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Jordan) | ar-JO | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (Jordan) | ar-JO | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Jordan) | ar-JO | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Kuwait) | ar-KW | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (Kuwait) | ar-KW | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Kuwait) | ar-KW | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Lebanon) | ar-LB | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (Lebanon) | ar-LB | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Lebanon) | ar-LB | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Mauritania) | ar-MR | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (Mauritania) | ar-MR | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Mauritania) | ar-MR | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Morocco) | ar-MA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (Morocco) | ar-MA | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Morocco) | ar-MA | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Oman) | ar-OM | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (Oman) | ar-OM | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Oman) | ar-OM | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Pseudo-Accents) | ar-XA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (Qatar) | ar-QA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (Qatar) | ar-QA | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Qatar) | ar-QA | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Saudi Arabia) | ar-SA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (Saudi Arabia) | ar-SA | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Saudi Arabia) | ar-SA | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (State of Palestine) | ar-PS | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (State of Palestine) | ar-PS | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (State of Palestine) | ar-PS | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Syria) | ar-SY | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (Tunisia) | ar-TN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (Tunisia) | ar-TN | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Tunisia) | ar-TN | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (United Arab Emirates) | ar-AE | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (United Arab Emirates) | ar-AE | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (United Arab Emirates) | ar-AE | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Yemen) | ar-YE | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Arabic (Yemen) | ar-YE | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Arabic (Yemen) | ar-YE | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Armenian (Armenia) | hy-AM | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Assamese (India) | as-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Asturian (Spain) | ast-ES | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Azerbaijani (Azerbaijan) | az-AZ | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Basque (Spain) | eu-ES | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Bengali (Bangladesh) | bn-BD | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Bengali (Bangladesh) | bn-BD | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Bengali (Bangladesh) | bn-BD | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Bengali (India) | bn-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Bulgarian (Bulgaria) | bg-BG | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Bulgarian (Bulgaria) | bg-BG | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Bulgarian (Bulgaria) | bg-BG | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Burmese (Myanmar) | my-MM | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Catalan (Spain) | ca-ES | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Chinese (Simplified, China) | cmn-Hans-CN | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| eu | Chinese, Cantonese (Traditional Hong Kong) | yue-Hant-HK | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Chinese, Mandarin (Traditional, Taiwan) | cmn-Hant-TW | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Croatian (Croatia) | hr-HR | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Czech (Czech Republic) | cs-CZ | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Czech (Czech Republic) | cs-CZ | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Czech (Czech Republic) | cs-CZ | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Danish (Denmark) | da-DK | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Danish (Denmark) | da-DK | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Danish (Denmark) | da-DK | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Dutch (Belgium) | nl-BE | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Dutch (Belgium) | nl-BE | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Dutch (Netherlands) | nl-NL | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Dutch (Netherlands) | nl-NL | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Dutch (Netherlands) | nl-NL | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Dutch (Netherlands) | nl-NL | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Dutch (Netherlands) | nl-NL | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | English (Australia) | en-AU | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | English (Australia) | en-AU | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (Australia) | en-AU | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (Australia) | en-AU | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (Australia) | en-AU | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (Hong Kong) | en-HK | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (Hong Kong) | en-HK | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (India) | en-IN | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| eu | English (India) | en-IN | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (India) | en-IN | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (India) | en-IN | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (India) | en-IN | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (Ireland) | en-IE | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (Ireland) | en-IE | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (New Zealand) | en-NZ | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (New Zealand) | en-NZ | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (Pakistan) | en-PK | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (Pakistan) | en-PK | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (Philippines) | en-PH | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | English (Singapore) | en-SG | `telephony` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (Singapore) | en-SG | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (United Kingdom) | en-GB | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| eu | English (United Kingdom) | en-GB | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (United Kingdom) | en-GB | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (United Kingdom) | en-GB | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (United Kingdom) | en-GB | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (United States) | en-US | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| eu | English (United States) | en-US | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (United States) | en-US | `medical_conversation` | Automatic punctuation | Speaker diarization |  | Word-level confidence |  |  |  |
| eu | English (Uniglish (United Kingdom) | en-GB | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| eu | English (United Kingdom) | en-GB | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (United Kingdom) | en-GB | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (United Kingdom) | en-GB | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (United Kingdom) | en-GB | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (United States) | en-US | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| eu | English (United States) | en-US | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (United States) | en-US | `medical_conversation` | Automatic punctuation | Speaker diarization |  | Word-level confidence |  |  |  |
| eu | English (United States) | en-US | `medical_dictation` | Automatic punctuation |  | Model adaptation | Word-level confidence |  | Spoken punctuation |  |
| eu | English (United States) | en-US | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (United States) | en-US | `telephony` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | English (United States) | en-US | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | Estonian (Estonia) | et-EE | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Filipino (Philippines) | fil-PH | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Finnish (Finland) | fi-FI | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Finnish (Finland) | fi-FI | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Finnish (Finland) | fi-FI | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | French (Belgium) | fr-BE | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | French (Belgium) | fr-BE | `telephony_short` | Automatic punctuation |  | Model adaptation |  | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | French (Canada) | fr-CA | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| eu | French (Canada) | fr-CA | `long` |  |  | Model adaptation | Word-level confidence |  | Spoken punctuation |  |
| eu | French (Canada) | fr-CA | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | French (Canada) | fr-CA | `telephony` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | French (Canada) | fr-CA | `telephony_short` |  |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | French (France) | fr-FR | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| eu | French (France) | fr-FR | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | French (France) | fr-FR | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | French (France) | fr-FR | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | French (France) | fr-FR | `telephony_short` | Automatic punctuation |  | Model adaptation |  | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | French (Switzerland) | fr-CH | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | French (Switzerland) | fr-CH | `telephony_short` | Automatic punctuation |  | Model adaptation |  | Profanity filter | Spoken punctuation | Spoken emoji |
| eu | Galician (Spain) | gl-ES | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Georgian (Georgia) | ka-GE | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | German (Austria) | de-AT | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | German (Austria) | de-AT | `telephony_short` | Automatic punctuation |  | Model adaptation |  | Profanity filter | Spoken punctuation |  |
| eu | German (Germany) | de-DE | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| eu | German (Germany) | de-DE | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | German (Germany) | de-DE | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | German (Germany) | de-DE | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | German (Germany) | de-DE | `telephony_short` | Automatic punctuation |  | Model adaptation |  | Profanity filter | Spoken punctuation |  |
| eu | German (Switzerland) | de-CH | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | German (Switzerland) | de-CH | `telephony_short` | Automatic punctuation |  | Model adaptation |  | Profanity filter | Spoken punctuation |  |
| eu | Greek (Greece) | el-GR | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Gujarati (India) | gu-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Hausa (Nigeria) | ha-NG | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Hebrew (Israel) | iw-IL | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Hindi (India) | hi-IN | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| eu | Hindi (India) | hi-IN | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Hindi (India) | hi-IN | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Hindi (India) | hi-IN | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Hindi (India) | hi-IN | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Hungarian (Hungary) | hu-HU | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Hungarian (Hungary) | hu-HU | `long` |  |  |  |  | Profanity filter |  |  |
| eu | Hungarian (Hungary) | hu-HU | `short` |  |  |  |  | Profanity filter |  |  |
| eu | Icelandic (Iceland) | is-IS | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Indonesian (Indonesia) | id-ID | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Indonesian (Indonesia) | id-ID | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Indonesian (Indonesia) | id-ID | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Italian (Italy) | it-IT | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| eu | Italian (Italy) | it-IT | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Italian (Italy) | it-IT | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Italian (Italy) | it-IT | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Italian (Italy) | it-IT | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Italian (Switzerland) | it-CH | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Italian (Switzerland) | it-CH | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Japanese (Japan) | ja-JP | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| eu | Japanese (Japan) | ja-JP | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Japanese (Japan) | ja-JP | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Japanese (Japan) | ja-JP | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Japanese (Japan) | ja-JP | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Javanese (Indonesia) | jv-ID | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Kannada (India) | kn-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Kannada (India) | kn-IN | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Kannada (India) | kn-IN | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Kazakh (Kazakhstan) | kk-KZ | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Khmer (Cambodia) | km-KH | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Khmer (Cambodia) | km-KH | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Khmer (Cambodia) | km-KH | `short` |  |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Kinyarwanda (Rwanda) | rw-RW | `long` |  |  |  |  | Profanity filter |  |  |
| eu | Kinyarwanda (Rwanda) | rw-RW | `short` |  |  |  |  | Profanity filter |  |  |
| eu | Korean (South Korea) | ko-KR | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| eu | Korean (South Korea) | ko-KR | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Korean (South Korea) | ko-KR | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Korean (South Korea) | ko-KR | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Korean (South Korea) | ko-KR | `telephony_short` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Kyrgyz (Cyrillic) | ky-KG | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Lao (Laos) | lo-LA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Latvian (Latvia) | lv-LV | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Lithuanian (Lithuania) | lt-LT | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Luxembourgish (Luxembourg) | lb-LU | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Macedonian (North Macedonia) | mk-MK | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Macedonian (North Macedonia) | mk-MK | `long` |  |  |  |  | Profanity filter |  |  |
| eu | Macedonian (North Macedonia) | mk-MK | `short` |  |  |  |  | Profanity filter |  |  |
| eu | Malay (Malaysia) | ms-MY | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Malayalam (India) | ml-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Malayalam (India) | ml-IN | `long` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Malayalam (India) | ml-IN | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Maltese (Malta) | mt-MT | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Maori (New Zealand) | mi-NZ | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Marathi (India) | mr-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Marathi (India) | mr-IN | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Marathi (India) | mr-IN | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Mongolian (Mongolia) | mn-MN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Nepali (Nepal) | ne-NP | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Norwegian Bokmål (Norway) | no-NO | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Norwegian Bokmål (Norway) | no-NO | `long` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Norwegian Bokmål (Norway) | no-NO | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Oriya (India) | or-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Persian (Iran) | fa-IR | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Polish (Poland) | pl-PL | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Polish (Poland) | pl-PL | `long` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Polish (Poland) | pl-PL | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Portuguese (Brazil) | pt-BR | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| eu | Portuguese (Brazil) | pt-BR | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Portuguese (Brazil) | pt-BR | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Portuguese (Brazil) | pt-BR | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Portuguese (Brazil) | pt-BR | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Portuguese (Portugal) | pt-PT | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Portuguese (Portugal) | pt-PT | `long` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Portuguese (Portugal) | pt-PT | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Portuguese (Portugal) | pt-PT | `telephony` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Portuguese (Portugal) | pt-PT | `telephony_short` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Punjabi (Gurmukhi India) | pa-Guru-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Romanian (Romania) | ro-RO | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Romanian (Romania) | ro-RO | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Romanian (Romania) | ro-RO | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Russian (Russia) | ru-RU | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Russian (Russia) | ru-RU | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Russian (Russia) | ru-RU | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Sepedi (South Africa) | nso-ZA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Serbian (Serbia) | sr-RS | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Slovak (Slovakia) | sk-SK | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Slovenian (Slovenia) | sl-SI | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Southern Sotho (South Africa) | st-ZA | `long` |  |  |  |  | Profanity filter |  |  |
| eu | Southern Sotho (South Africa) | st-ZA | `short` |  |  |  |  | Profanity filter |  |  |
| eu | Spanish (Argentina) | es-AR | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Argentina) | es-AR | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Bolivia) | es-BO | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Bolivia) | es-BO | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Chile) | es-CL | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Chile) | es-CL | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Colombia) | es-CO | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Colombia) | es-CO | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Costa Rica) | es-CR | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Costa Rica) | es-CR | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Dominican Republic) | es-DO | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Dominican Republic) | es-DO | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Ecuador) | es-EC | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Ecuador) | es-EC | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (El Salvador) | es-SV | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (El Salvador) | es-SV | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Guatemala) | es-GT | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Guatemala) | es-GT | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Honduras) | es-HN | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Honduras) | es-HN | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Mexico) | es-MX | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Spanish (Mexico) | es-MX | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Mexico) | es-MX | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Nicaragua) | es-NI | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Nicaragua) | es-NI | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Panama) | es-PA | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Panama) | es-PA | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Peru) | es-PE | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Peru) | es-PE | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Puerto Rico) | es-PR | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Puerto Rico) | es-PR | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Spain) | es-ES | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| eu | Spanish (Spain) | es-ES | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Spain) | es-ES | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Spain) | es-ES | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Spain) | es-ES | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (United States) | es-US | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| eu | Spanish (United States) | es-US | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (United States) | es-US | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (United States) | es-US | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (United States) | es-US | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Uruguay) | es-UY | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Uruguay) | es-UY | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Venezuela) | es-VE | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Spanish (Venezuela) | es-VE | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Swahili | sw | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Swahili (Kenya) | sw-KE | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Swati (Latin, South Africa) | ss-Latn-ZA | `long` |  |  |  |  | Profanity filter |  |  |
| eu | Swati (Latin, South Africa) | ss-Latn-ZA | `short` |  |  |  |  | Profanity filter |  |  |
| eu | Swedish (Sweden) | sv-SE | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Swedish (Sweden) | sv-SE | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Swedish (Sweden) | sv-SE | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Tamil (India) | ta-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Tamil (India) | ta-IN | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Tamil (India) | ta-IN | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Telugu (India) | te-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Telugu (India) | te-IN | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Telugu (India) | te-IN | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Thai (Thailand) | th-TH | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Thai (Thailand) | th-TH | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Thai (Thailand) | th-TH | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Tsonga (South Africa) | ts-ZA | `long` |  |  |  |  | Profanity filter |  |  |
| eu | Tsonga (South Africa) | ts-ZA | `short` |  |  |  |  | Profanity filter |  |  |
| eu | Tswana (Latin, South Africa) | tn-Latn-ZA | `long` |  |  |  |  | Profanity filter |  |  |
| eu | Tswana (Latin, South Africa) | tn-Latn-ZA | `short` |  |  |  |  | Profanity filter |  |  |
| eu | Turkish (Turkey) | tr-TR | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Turkish (Turkey) | tr-TR | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Turkish (Turkey) | tr-TR | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| eu | Ukrainian (Ukraine) | uk-UA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Ukrainian (Ukraine) | uk-UA | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Ukrainian (Ukraine) | uk-UA | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Urdu (Pakistan) | ur-PK | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Uzbek (Uzbekistan) | uz-UZ | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Venda (South Africa) | ve-ZA | `long` |  |  |  |  | Profanity filter |  |  |
| eu | Venda (South Africa) | ve-ZA | `short` |  |  |  |  | Profanity filter |  |  |
| eu | Vietnamese (Vietnam) | vi-VN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Vietnamese (Vietnam) | vi-VN | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| eu | Vietnamese (Vietnam) | vi-VN | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| eu | Welsh (United Kingdom) | cy-GB | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Wolof (Senegal) | wo-SN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Xhosa (South Africa) | xh-ZA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Xhosa (South Africa) | xh-ZA | `long` |  |  |  |  | Profanity filter |  |  |
| eu | Xhosa (South Africa) | xh-ZA | `short` |  |  |  |  | Profanity filter |  |  |
| eu | Yoruba (Nigeria) | yo-NG | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| eu | Zulu (South Africa) | zu-ZA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| europe-west4 | Afrikaans (South Africa) | af-ZA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Afrikaans (South Africa) | af-ZA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Albanian (Albania) | sq-AL | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Albanian (Albania) | sq-AL | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Amharic (Ethiopia) | am-ET | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Amharic (Ethiopia) | am-ET | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Arabic (Egypt) | ar-EG | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Arabic (Egypt) | ar-EG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Armenian (Armenia) | hy-AM | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Armenian (Armenia) | hy-AM | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Aromanian (Bulgaria) | rup-BG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Assamese (India) | as-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Assamese (India) | as-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Asturian (Spain) | ast-ES | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Asturian (Spain) | ast-ES | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Azerbaijani (Azerbaijan) | az-AZ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Azerbaijani (Azerbaijan) | az-AZ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Basque (Spain) | eu-ES | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Basque (Spain) | eu-ES | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Belarusian (Belarus) | be-BY | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Belarusian (Belarus) | be-BY | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Bengali (Bangladesh) | bn-BD | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Bengali (India) | bn-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Bosnian (Bosnia and Herzegovina) | bs-BA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Bosnian (Bosnia and Herzegovina) | bs-BA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Bulgarian (Bulgaria) | bg-BG | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Bulgarian (Bulgaria) | bg-BG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Burmese (Myanmar) | my-MM | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Burmese (Myanmar) | my-MM | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Catalan (Spain) | ca-ES | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Catalan (Spain) | ca-ES | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Cebuano (Philippines) | ceb-PH | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Cebuano (Philippines) | ceb-PH | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Central Kurdish (Iraq) | ckb-IQ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Central Kurdish (Iraq) | ckb-IQ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Chinese (Simplified, China) | cmn-Hans-CN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Chinese (Simplified, China) | cmn-Hans-CN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Chinese, Cantonese (Traditional Hong Kong) | yue-Hant-HK | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Chinese, Cantonese (Traditional Hong Kong) | yue-Hant-HK | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Chinese, Mandarin (Traditional, Taiwan) | cmn-Hant-TW | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Chinese, Mandarin (Traditional, Taiwan) | cmn-Hant-TW | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Croatian (Croatia) | hr-HR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Croatian (Croatia) | hr-HR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Czech (Czech Republic) | cs-CZ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Czech (Czech Republic) | cs-CZ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Danish (Denmark) | da-DK | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Danish (Denmark) | da-DK | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Dutch (Netherlands) | nl-NL | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Dutch (Netherlands) | nl-NL | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | English (Australia) | en-AU | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | English (Australia) | en-AU | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | English (Australia) | en-AU | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| europe-west4 | English (India) | en-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | English (India) | en-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | English (United Kingdom) | en-GB | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | English (United Kingdom) | en-GB | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | English (United Kingdom) | en-GB | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| europe-west4 | English (United States) | en-US | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | English (United States) | en-US | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | English (United States) | en-US | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| europe-west4 | Estonian (Estonia) | et-EE | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Estonian (Estonia) | et-EE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Filipino (Philippines) | fil-PH | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Filipino (Philippines) | fil-PH | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Finnish (Finland) | fi-FI | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Finnish (Finland) | fi-FI | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | French (Canada) | fr-CA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | French (Canada) | fr-CA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | French (Canada) | fr-CA | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| europe-west4 | French (France) | fr-FR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | French (France) | fr-FR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | French (France) | fr-FR | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| europe-west4 | Fulah (Senegal) | ff-SN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Galician (Spain) | gl-ES | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Galician (Spain) | gl-ES | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Ganda (Uganda) | lg-UG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Georgian (Georgia) | ka-GE | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Georgian (Georgia) | ka-GE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | German (Germany) | de-DE | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | German (Germany) | de-DE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | German (Germany) | de-DE | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| europe-west4 | Greek (Greece) | el-GR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Greek (Greece) | el-GR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Gujarati (India) | gu-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Gujarati (India) | gu-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Hausa (Nigeria) | ha-NG | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Hausa (Nigeria) | ha-NG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Hebrew (Israel) | iw-IL | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Hebrew (Israel) | iw-IL | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Hindi (India) | hi-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Hindi (India) | hi-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Hungarian (Hungary) | hu-HU | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Hungarian (Hungary) | hu-HU | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Icelandic (Iceland) | is-IS | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Icelandic (Iceland) | is-IS | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Igbo (Nigeria) | ig-NG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Indonesian (Indonesia) | id-ID | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Indonesian (Indonesia) | id-ID | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Irish (Ireland) | ga-IE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Italian (Italy) | it-IT | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Italian (Italy) | it-IT | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Italian (Italy) | it-IT | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| europe-west4 | Japanese (Japan) | ja-JP | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Japanese (Japan) | ja-JP | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Javanese (Indonesia) | jv-ID | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Javanese (Indonesia) | jv-ID | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Kabuverdianu (Cape Verde) | kea-CV | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Kabuverdianu (Cape Verde) | kea-CV | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Kamba (Kenya) | kam-KE | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Kamba (Kenya) | kam-KE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Kannada (India) | kn-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Kannada (India) | kn-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Kazakh (Kazakhstan) | kk-KZ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Kazakh (Kazakhstan) | kk-KZ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Khmer (Cambodia) | km-KH | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Khmer (Cambodia) | km-KH | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Korean (South Korea) | ko-KR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Korean (South Korea) | ko-KR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Kyrgyz (Cyrillic) | ky-KG | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Kyrgyz (Cyrillic) | ky-KG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Lao (Laos) | lo-LA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Lao (Laos) | lo-LA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Latvian (Latvia) | lv-LV | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Latvian (Latvia) | lv-LV | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Lingala (Congo-Kinshasa) | ln-CD | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Lingala (Congo-Kinshasa) | ln-CD | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Lithuanian (Lithuania) | lt-LT | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Lithuanian (Lithuania) | lt-LT | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Luo (Kenya) | luo-KE | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Luo (Kenya) | luo-KE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Luxembourgish (Luxembourg) | lb-LU | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Luxembourgish (Luxembourg) | lb-LU | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Macedonian (North Macedonia) | mk-MK | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Macedonian (North Macedonia) | mk-MK | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Malay (Malaysia) | ms-MY | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Malay (Malaysia) | ms-MY | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Malayalam (India) | ml-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Malayalam (India) | ml-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Maltese (Malta) | mt-MT | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Maltese (Malta) | mt-MT | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Maori (New Zealand) | mi-NZ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Maori (New Zealand) | mi-NZ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Marathi (India) | mr-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Marathi (India) | mr-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Mongolian (Mongolia) | mn-MN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Mongolian (Mongolia) | mn-MN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Nepali (Nepal) | ne-NP | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Nepali (Nepal) | ne-NP | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Norwegian Bokmål (Norway) | no-NO | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Norwegian Bokmål (Norway) | no-NO | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Nyanja (Malawi) | ny-MW | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Nyanja (Malawi) | ny-MW | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Occitan (France) | oc-FR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Occitan (France) | oc-FR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Oriya (India) | or-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Oromo (Ethiopia) | om-ET | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Pashto | ps-AF | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Pashto | ps-AF | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Persian (Iran) | fa-IR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Persian (Iran) | fa-IR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Polish (Poland) | pl-PL | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Polish (Poland) | pl-PL | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Portuguese (Brazil) | pt-BR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Portuguese (Brazil) | pt-BR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Portuguese (Brazil) | pt-BR | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| europe-west4 | Portuguese (Portugal) | pt-PT | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Punjabi (Gurmukhi India) | pa-Guru-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Punjabi (Gurmukhi India) | pa-Guru-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Romanian (Romania) | ro-RO | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Romanian (Romania) | ro-RO | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Russian (Russia) | ru-RU | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Russian (Russia) | ru-RU | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Sepedi (South Africa) | nso-ZA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Sepedi (South Africa) | nso-ZA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Serbian (Serbia) | sr-RS | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Serbian (Serbia) | sr-RS | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Shona (Zimbabwe) | sn-ZW | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Shona (Zimbabwe) | sn-ZW | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Sindhi (India) | sd-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Sindhi (India) | sd-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Sinhala (Sri Lanka) | si-LK | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Sinhala (Sri Lanka) | si-LK | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Slovak (Slovakia) | sk-SK | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Slovak (Slovakia) | sk-SK | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Slovenian (Slovenia) | sl-SI | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Slovenian (Slovenia) | sl-SI | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Somali | so-SO | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Somali | so-SO | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Spanish (Latin American) | es-419 | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Spanish (Spain) | es-ES | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Spanish (Spain) | es-ES | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Spanish (Spain) | es-ES | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| europe-west4 | Spanish (United States) | es-US | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Spanish (United States) | es-US | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Spanish (United States) | es-US | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| europe-west4 | Sundanese (Indonesia) | su-ID | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Sundanese (Indonesia) | su-ID | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Swahili | sw | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Swahili | sw | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Swahili (Kenya) | sw-KE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Swedish (Sweden) | sv-SE | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Swedish (Sweden) | sv-SE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Tajik (Tajikistan) | tg-TJ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Tajik (Tajikistan) | tg-TJ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Tamil (India) | ta-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Tamil (India) | ta-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Telugu (India) | te-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Telugu (India) | te-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Thai (Thailand) | th-TH | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Thai (Thailand) | th-TH | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Turkish (Turkey) | tr-TR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Turkish (Turkey) | tr-TR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Ukrainian (Ukraine) | uk-UA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Ukrainian (Ukraine) | uk-UA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Umbundu (Angola) | umb-AO | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Urdu (Pakistan) | ur-PK | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Urdu (Pakistan) | ur-PK | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Uzbek (Uzbekistan) | uz-UZ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Uzbek (Uzbekistan) | uz-UZ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Vietnamese (Vietnam) | vi-VN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Vietnamese (Vietnam) | vi-VN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Welsh (United Kingdom) | cy-GB | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Welsh (United Kingdom) | cy-GB | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Wolof (Senegal) | wo-SN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Wolof (Senegal) | wo-SN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Xhosa (South Africa) | xh-ZA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Yoruba (Nigeria) | yo-NG | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Yoruba (Nigeria) | yo-NG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| europe-west4 | Zulu (South Africa) | zu-ZA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| europe-west4 | Zulu (South Africa) | zu-ZA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Algeria) | ar-DZ | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Algeria) | ar-DZ | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Bahrain) | ar-BH | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Bahrain) | ar-BH | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Egypt) | ar-EG | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Egypt) | ar-EG | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Iraq) | ar-IQ | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Iraq) | ar-IQ | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Israel) | ar-IL | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Israel) | ar-IL | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Jordan) | ar-JO | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Jordan) | ar-JO | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Kuwait) | ar-KW | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Kuwait) | ar-KW | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Lebanon) | ar-LB | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Lebanon) | ar-LB | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Mauritania) | ar-MR | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Mauritania) | ar-MR | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Morocco) | ar-MA | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Morocco) | ar-MA | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Oman) | ar-OM | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Oman) | ar-OM | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Qatar) | ar-QA | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Qatar) | ar-QA | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Saudi Arabia) | ar-SA | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Saudi Arabia) | ar-SA | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Arabic (State of Palestine) | ar-PS | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| global | Arabic (State of Palestine) | ar-PS | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Tunisia) | ar-TN | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Tunisia) | ar-TN | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Arabic (United Arab Emirates) | ar-AE | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| global | Arabic (United Arab Emirates) | ar-AE | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Yemen) | ar-YE | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| global | Arabic (Yemen) | ar-YE | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Bengali (Bangladesh) | bn-BD | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| global | Bengali (Bangladesh) | bn-BD | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Bulgarian (Bulgaria) | bg-BG | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| global | Bulgarian (Bulgaria) | bg-BG | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Czech (Czech Republic) | cs-CZ | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Czech (Czech Republic) | cs-CZ | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Danish (Denmark) | da-DK | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Danish (Denmark) | da-DK | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Dutch (Belgium) | nl-BE | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Dutch (Belgium) | nl-BE | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Dutch (Netherlands) | nl-NL | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Dutch (Netherlands) | nl-NL | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Dutch (Netherlands) | nl-NL | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Dutch (Netherlands) | nl-NL | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | English (Australia) | en-AU | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (Australia) | en-AU | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (Australia) | en-AU | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (Australia) | en-AU | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (Hong Kong) | en-HK | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (Hong Kong) | en-HK | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (India) | en-IN | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (India) | en-IN | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (India) | en-IN | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (India) | en-IN | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (Ireland) | en-IE | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (Ireland) | en-IE | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (New Zealand) | en-NZ | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (New Zealand) | en-NZ | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (Pakistan) | en-PK | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (Pakistan) | en-PK | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (Singapore) | en-SG | `telephony` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (Singapore) | en-SG | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (United Kingdom) | en-GB | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (United Kingdom) | en-GB | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (United Kingdom) | en-GB | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (United Kingdom) | en-GB | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (United States) | en-US | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (United States) | en-US | `medical_conversation` | Automatic punctuation | Speaker diarization |  | Word-level confidence |  |  |  |
| global | English (United States) | en-US | `medical_dictation` | Automatic punctuation |  | Model adaptation | Word-level confidence |  | Spoken punctuation |  |
| global | English (United States) | en-US | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (United States) | en-US | `telephony` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | English (United States) | en-US | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | Finnish (Finland) | fi-FI | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| global | Finnish (Finland) | fi-FI | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | French (Belgium) | fr-BE | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | French (Belgium) | fr-BE | `telephony_short` | Automatic punctuation |  | Model adaptation |  | Profanity filter | Spoken punctuation | Spoken emoji |
| global | French (Canada) | fr-CA | `long` |  |  | Model adaptation | Word-level confidence |  | Spoken punctuation |  |
| global | French (Canada) | fr-CA | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | French (Canada) | fr-CA | `telephony` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | French (Canada) | fr-CA | `telephony_short` |  |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | French (France) | fr-FR | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | French (France) | fr-FR | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | French (France) | fr-FR | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | French (France) | fr-FR | `telephony_short` | Automatic punctuation |  | Model adaptation |  | Profanity filter | Spoken punctuation | Spoken emoji |
| global | French (Switzerland) | fr-CH | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| global | French (Switzerland) | fr-CH | `telephony_short` | Automatic punctuation |  | Model adaptation |  | Profanity filter | Spoken punctuation | Spoken emoji |
| global | German (Austria) | de-AT | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | German (Austria) | de-AT | `telephony_short` | Automatic punctuation |  | Model adaptation |  | Profanity filter | Spoken punctuation |  |
| global | German (Germany) | de-DE | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | German (Germany) | de-DE | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | German (Germany) | de-DE | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | German (Germany) | de-DE | `telephony_short` | Automatic punctuation |  | Model adaptation |  | Profanity filter | Spoken punctuation |  |
| global | German (Switzerland) | de-CH | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | German (Switzerland) | de-CH | `telephony_short` | Automatic punctuation |  | Model adaptation |  | Profanity filter | Spoken punctuation |  |
| global | Hindi (India) | hi-IN | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Hindi (India) | hi-IN | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Hindi (India) | hi-IN | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Hindi (India) | hi-IN | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Hungarian (Hungary) | hu-HU | `long` |  |  |  |  | Profanity filter |  |  |
| global | Hungarian (Hungary) | hu-HU | `short` |  |  |  |  | Profanity filter |  |  |
| global | Indonesian (Indonesia) | id-ID | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Indonesian (Indonesia) | id-ID | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Italian (Italy) | it-IT | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Italian (Italy) | it-IT | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Italian (Italy) | it-IT | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Italian (Italy) | it-IT | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Italian (Switzerland) | it-CH | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Italian (Switzerland) | it-CH | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Japanese (Japan) | ja-JP | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Japanese (Japan) | ja-JP | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Japanese (Japan) | ja-JP | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Japanese (Japan) | ja-JP | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Kannada (India) | kn-IN | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| global | Kannada (India) | kn-IN | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Khmer (Cambodia) | km-KH | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| global | Khmer (Cambodia) | km-KH | `short` |  |  |  | Word-level confidence | Profanity filter |  |  |
| global | Kinyarwanda (Rwanda) | rw-RW | `long` |  |  |  |  | Profanity filter |  |  |
| global | Kinyarwanda (Rwanda) | rw-RW | `short` |  |  |  |  | Profanity filter |  |  |
| global | Korean (South Korea) | ko-KR | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Korean (South Korea) | ko-KR | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Korean (South Korea) | ko-KR | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Korean (South Korea) | ko-KR | `telephony_short` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Macedonian (North Macedonia) | mk-MK | `long` |  |  |  |  | Profanity filter |  |  |
| global | Macedonian (North Macedonia) | mk-MK | `short` |  |  |  |  | Profanity filter |  |  |
| global | Malayalam (India) | ml-IN | `long` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Malayalam (India) | ml-IN | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Marathi (India) | mr-IN | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| global | Marathi (India) | mr-IN | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Norwegian Bokmål (Norway) | no-NO | `long` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Norwegian Bokmål (Norway) | no-NO | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Polish (Poland) | pl-PL | `long` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Polish (Poland) | pl-PL | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Portuguese (Brazil) | pt-BR | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Portuguese (Brazil) | pt-BR | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Portuguese (Brazil) | pt-BR | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Portuguese (Brazil) | pt-BR | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Portuguese (Portugal) | pt-PT | `long` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Portuguese (Portugal) | pt-PT | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Portuguese (Portugal) | pt-PT | `telephony` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Portuguese (Portugal) | pt-PT | `telephony_short` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Romanian (Romania) | ro-RO | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| global | Romanian (Romania) | ro-RO | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Russian (Russia) | ru-RU | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Russian (Russia) | ru-RU | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Southern Sotho (South Africa) | st-ZA | `long` |  |  |  |  | Profanity filter |  |  |
| global | Southern Sotho (South Africa) | st-ZA | `short` |  |  |  |  | Profanity filter |  |  |
| global | Spanish (Argentina) | es-AR | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Argentina) | es-AR | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Bolivia) | es-BO | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Bolivia) | es-BO | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Chile) | es-CL | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Chile) | es-CL | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Colombia) | es-CO | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Colombia) | es-CO | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Costa Rica) | es-CR | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Costa Rica) | es-CR | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Dominican Republic) | es-DO | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Dominican Republic) | es-DO | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Ecuador) | es-EC | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Ecuador) | es-EC | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (El Salvador) | es-SV | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (El Salvador) | es-SV | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Guatemala) | es-GT | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Guatemala) | es-GT | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Honduras) | es-HN | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Honduras) | es-HN | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Mexico) | es-MX | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Mexico) | es-MX | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Nicaragua) | es-NI | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Nicaragua) | es-NI | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Panama) | es-PA | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Panama) | es-PA | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Peru) | es-PE | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Peru) | es-PE | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Puerto Rico) | es-PR | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Puerto Rico) | es-PR | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Spain) | es-ES | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Spain) | es-ES | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Spain) | es-ES | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Spain) | es-ES | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (United States) | es-US | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (United States) | es-US | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (United States) | es-US | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (United States) | es-US | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Uruguay) | es-UY | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Uruguay) | es-UY | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Venezuela) | es-VE | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Spanish (Venezuela) | es-VE | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Swati (Latin, South Africa) | ss-Latn-ZA | `long` |  |  |  |  | Profanity filter |  |  |
| global | Swati (Latin, South Africa) | ss-Latn-ZA | `short` |  |  |  |  | Profanity filter |  |  |
| global | Swedish (Sweden) | sv-SE | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Swedish (Sweden) | sv-SE | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Tamil (India) | ta-IN | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| global | Tamil (India) | ta-IN | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Telugu (India) | te-IN | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| global | Telugu (India) | te-IN | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Thai (Thailand) | th-TH | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| global | Thai (Thailand) | th-TH | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Tsonga (South Africa) | ts-ZA | `long` |  |  |  |  | Profanity filter |  |  |
| global | Tsonga (South Africa) | ts-ZA | `short` |  |  |  |  | Profanity filter |  |  |
| global | Tswana (Latin, South Africa) | tn-Latn-ZA | `long` |  |  |  |  | Profanity filter |  |  |
| global | Tswana (Latin, South Africa) | tn-Latn-ZA | `short` |  |  |  |  | Profanity filter |  |  |
| global | Turkish (Turkey) | tr-TR | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Turkish (Turkey) | tr-TR | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| global | Ukrainian (Ukraine) | uk-UA | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| global | Ukrainian (Ukraine) | uk-UA | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Venda (South Africa) | ve-ZA | `long` |  |  |  |  | Profanity filter |  |  |
| global | Venda (South Africa) | ve-ZA | `short` |  |  |  |  | Profanity filter |  |  |
| global | Vietnamese (Vietnam) | vi-VN | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| global | Vietnamese (Vietnam) | vi-VN | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| global | Xhosa (South Africa) | xh-ZA | `long` |  |  |  |  | Profanity filter |  |  |
| global | Xhosa (South Africa) | xh-ZA | `short` |  |  |  |  | Profanity filter |  |  |
| us | Afrikaans (South Africa) | af-ZA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Albanian (Albania) | sq-AL | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Amharic (Ethiopia) | am-ET | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (Algeria) | ar-DZ | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (Algeria) | ar-DZ | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Algeria) | ar-DZ | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Bahrain) | ar-BH | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (Bahrain) | ar-BH | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Bahrain) | ar-BH | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Egypt) | ar-EG | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (Egypt) | ar-EG | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Egypt) | ar-EG | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Iraq) | ar-IQ | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (Iraq) | ar-IQ | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Iraq) | ar-IQ | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Israel) | ar-IL | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (Israel) | ar-IL | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Israel) | ar-IL | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Jordan) | ar-JO | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (Jordan) | ar-JO | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Jordan) | ar-JO | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Kuwait) | ar-KW | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (Kuwait) | ar-KW | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Kuwait) | ar-KW | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Lebanon) | ar-LB | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (Lebanon) | ar-LB | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Lebanon) | ar-LB | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Mauritania) | ar-MR | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (Mauritania) | ar-MR | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Mauritania) | ar-MR | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Morocco) | ar-MA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (Morocco) | ar-MA | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Morocco) | ar-MA | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Oman) | ar-OM | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (Oman) | ar-OM | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Oman) | ar-OM | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Pseudo-Accents) | ar-XA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (Qatar) | ar-QA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (Qatar) | ar-QA | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Qatar) | ar-QA | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Saudi Arabia) | ar-SA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (Saudi Arabia) | ar-SA | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Saudi Arabia) | ar-SA | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Arabic (State of Palestine) | ar-PS | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (State of Palestine) | ar-PS | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| us | Arabic (State of Palestine) | ar-PS | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Syria) | ar-SY | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (Tunisia) | ar-TN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (Tunisia) | ar-TN | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Tunisia) | ar-TN | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Arabic (United Arab Emirates) | ar-AE | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (United Arab Emirates) | ar-AE | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| us | Arabic (United Arab Emirates) | ar-AE | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Yemen) | ar-YE | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Arabic (Yemen) | ar-YE | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| us | Arabic (Yemen) | ar-YE | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Armenian (Armenia) | hy-AM | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Assamese (India) | as-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Asturian (Spain) | ast-ES | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Azerbaijani (Azerbaijan) | az-AZ | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Basque (Spain) | eu-ES | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Bengali (Bangladesh) | bn-BD | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Bengali (Bangladesh) | bn-BD | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| us | Bengali (Bangladesh) | bn-BD | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Bengali (India) | bn-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Bulgarian (Bulgaria) | bg-BG | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Bulgarian (Bulgaria) | bg-BG | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| us | Bulgarian (Bulgaria) | bg-BG | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Burmese (Myanmar) | my-MM | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Catalan (Spain) | ca-ES | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Chinese (Simplified, China) | cmn-Hans-CN | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| us | Chinese, Cantonese (Traditional Hong Kong) | yue-Hant-HK | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Chinese, Mandarin (Traditional, Taiwan) | cmn-Hant-TW | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Croatian (Croatia) | hr-HR | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanitnl-NL | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Dutch (Netherlands) | nl-NL | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Dutch (Netherlands) | nl-NL | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Dutch (Netherlands) | nl-NL | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | English (Australia) | en-AU | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | English (Australia) | en-AU | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (Australia) | en-AU | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (Australia) | en-AU | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (Australia) | en-AU | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (Hong Kong) | en-HK | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (Hong Kong) | en-HK | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (India) | en-IN | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| us | English (India) | en-IN | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (India) | en-IN | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (India) | en-IN | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (India) | en-IN | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (Ireland) | en-IE | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (Ireland) | en-IE | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (New Zealand) | en-NZ | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (New Zealand) | en-NZ | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (Pakistan) | en-PK | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (Pakistan) | en-PK | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (Philippines) | en-PH | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | English (Singapore) | en-SG | `telephony` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (Singapore) | en-SG | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (United Kingdom) | en-GB | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| us | English (United Kingdom) | en-GB | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (United Kingdom) | en-GB | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (United Kingdom) | en-GB | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (United Kingdom) | en-GB | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (United States) | en-US | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| us | English (United States) | en-US | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (United States) | en-US | `medical_conversation` | Automatic punctuation | Speaker diarization |  | Word-level confidence |  |  |  |
| us | English (United States) | en-US | `medical_dictation` | Automatic punctuation |  | Model adaptation | Word-level confidence |  | Spoken punctuation |  |
| us | English (United States) | en-US | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (United States) | en-US | `telephony` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | English (United States) | en-US | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | Estonian (Estonia) | et-EE | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Filipino (Philippines) | fil-PH | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Finnish (Finland) | fi-FI | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Finnish (Finland) | fi-FI | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| us | Finnish (Finland) | fi-FI | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | French (Belgium) | fr-BE | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | French (Belgium) | fr-BE | `telephony_short` | Automatic punctuation |  | Model adaptation |  | Profanity filter | Spoken punctuation | Spoken emoji |
| us | French (Canada) | fr-CA | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| us | French (Canada) | fr-CA | `long` |  |  | Model adaptation | Word-level confidence |  | Spoken punctuation |  |
| us | French (Canada) | fr-CA | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | French (Canada) | fr-CA | `telephony` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | French (Canada) | fr-CA | `telephony_short` |  |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | French (France) | fr-FR | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| us | French (France) | fr-FR | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | French (France) | fr-FR | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | French (France) | fr-FR | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | French (France) | fr-FR | `telephony_short` | Automatic punctuation |  | Model adaptation |  | Profanity filter | Spoken punctuation | Spoken emoji |
| us | French (Switzerland) | fr-CH | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation | Spoken emoji |
| us | French (Switzerland) | fr-CH | `telephony_short` | Automatic punctuation |  | Model adaptation |  | Profanity filter | Spoken punctuation | Spoken emoji |
| us | Galician (Spain) | gl-ES | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Georgian (Georgia) | ka-GE | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | German (Austria) | de-AT | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | German (Austria) | de-AT | `telephony_short` | Automatic punctuation |  | Model adaptation |  | Profanity filter | Spoken punctuation |  |
| us | German (Germany) | de-DE | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| us | German (Germany) | de-DE | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | German (Germany) | de-DE | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | German (Germany) | de-DE | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | German (Germany) | de-DE | `telephony_short` | Automatic punctuation |  | Model adaptation |  | Profanity filter | Spoken punctuation |  |
| us | German (Switzerland) | de-CH | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | German (Switzerland) | de-CH | `telephony_short` | Automatic punctuation |  | Model adaptation |  | Profanity filter | Spoken punctuation |  |
| us | Greek (Greece) | el-GR | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Gujarati (India) | gu-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Hausa (Nigeria) | ha-NG | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Hebrew (Israel) | iw-IL | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Hindi (India) | hi-IN | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| us | Hindi (India) | hi-IN | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Hindi (India) | hi-IN | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Hindi (India) | hi-IN | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Hindi (India) | hi-IN | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Hungarian (Hungary) | hu-HU | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Hungarian (Hungary) | hu-HU | `long` |  |  |  |  | Profanity filter |  |  |
| us | Hungarian (Hungary) | hu-HU | `short` |  |  |  |  | Profanity filter |  |  |
| us | Icelandic (Iceland) | is-IS | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Indonesian (Indonesia) | id-ID | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Indonesian (Indonesia) | id-ID | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Indonesian (Indonesia) | id-ID | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Italian (Italy) | it-IT | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| us | Italian (Italy) | it-IT | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Italian (Italy) | it-IT | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Italian (Italy) | it-IT | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Italian (Italy) | it-IT | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Italian (Switzerland) | it-CH | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Italian (Switzerland) | it-CH | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Japanese (Japan) | ja-JP | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| us | Japanese (Japan) | ja-JP | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Japanese (Japan) | ja-JP | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Japanese (Japan) | ja-JP | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Japanese (Japan) | ja-JP | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Javanese (Indonesia) | jv-ID | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Kannada (India) | kn-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Kannada (India) | kn-IN | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| us | Kannada (India) | kn-IN | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Kazakh (Kazakhstan) | kk-KZ | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Khmer (Cambodia) | km-KH | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Khmer (Cambodia) | km-KH | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| us | Khmer (Cambodia) | km-KH | `short` |  |  |  | Word-level confidence | Profanity filter |  |  |
| us | Kinyarwanda (Rwanda) | rw-RW | `long` |  |  |  |  | Profanity filter |  |  |
| us | Kinyarwanda (Rwanda) | rw-RW | `short` |  |  |  |  | Profanity filter |  |  |
| us | Korean (South Korea) | ko-KR | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| us | Korean (South Korea) | ko-KR | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Korean (South Korea) | ko-KR | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Korean (South Korea) | ko-KR | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Korean (South Korea) | ko-KR | `telephony_short` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Kyrgyz (Cyrillic) | ky-KG | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Lao (Laos) | lo-LA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Latvian (Latvia) | lv-LV | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Lithuanian (Lithuania) | lt-LT | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Luxembourgish (Luxembourg) | lb-LU | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Macedonian (North Macedonia) | mk-MK | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Macedonian (North Macedonia) | mk-MK | `long` |  |  |  |  | Profanity filter |  |  |
| us | Macedonian (North Macedonia) | mk-MK | `short` |  |  |  |  | Profanity filter |  |  |
| us | Malay (Malaysia) | ms-MY | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Malayalam (India) | ml-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Malayalam (India) | ml-IN | `long` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Malayalam (India) | ml-IN | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Maltese (Malta) | mt-MT | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Maori (New Zealand) | mi-NZ | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Marathi (India) | mr-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Marathi (India) | mr-IN | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| us | Marathi (India) | mr-IN | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Mongolian (Mongolia) | mn-MN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Nepali (Nepal) | ne-NP | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Norwegian Bokmål (Norway) | no-NO | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Norwegian Bokmål (Norway) | no-NO | `long` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Norwegian Bokmål (Norway) | no-NO | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Oriya (India) | or-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Persian (Iran) | fa-IR | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Polish (Poland) | pl-PL | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Polish (Poland) | pl-PL | `long` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Polish (Poland) | pl-PL | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Portuguese (Brazil) | pt-BR | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| us | Portuguese (Brazil) | pt-BR | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Portuguese (Brazil) | pt-BR | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Portuguese (Brazil) | pt-BR | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Portuguese (Brazil) | pt-BR | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Portuguese (Portugal) | pt-PT | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Portuguese (Portugal) | pt-PT | `long` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Portuguese (Portugal) | pt-PT | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Portuguese (Portugal) | pt-PT | `telephony` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Portuguese (Portugal) | pt-PT | `telephony_short` |  |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Punjabi (Gurmukhi India) | pa-Guru-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Romanian (Romania) | ro-RO | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Romanian (Romania) | ro-RO | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| us | Romanian (Romania) | ro-RO | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Russian (Russia) | ru-RU | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Russian (Russia) | ru-RU | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Russian (Russia) | ru-RU | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Sepedi (South Africa) | nso-ZA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Serbian (Serbia) | sr-RS | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Slovak (Slovakia) | sk-SK | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Slovenian (Slovenia) | sl-SI | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Southern Sotho (South Africa) | st-ZA | `long` |  |  |  |  | Profanity filter |  |  |
| us | Southern Sotho (South Africa) | st-ZA | `short` |  |  |  |  | Profanity filter |  |  |
| us | Spanish (Argentina) | es-AR | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Argentina) | es-AR | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Bolivia) | es-BO | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Bolivia) | es-BO | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Chile) | es-CL | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Chile) | es-CL | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Colombia) | es-CO | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Colombia) | es-CO | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Costa Rica) | es-CR | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Costa Rica) | es-CR | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Dominican Republic) | es-DO | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Dominican Republic) | es-DO | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Ecuador) | es-EC | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Ecuador) | es-EC | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (El Salvador) | es-SV | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (El Salvador) | es-SV | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Guatemala) | es-GT | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Guatemala) | es-GT | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Honduras) | es-HN | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Honduras) | es-HN | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Mexico) | es-MX | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Spanish (Mexico) | es-MX | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Mexico) | es-MX | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Nicaragua) | es-NI | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Nicaragua) | es-NI | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Panama) | es-PA | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Panama) | es-PA | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Peru) | es-PE | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Peru) | es-PE | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Puerto Rico) | es-PR | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Puerto Rico) | es-PR | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Spain) | es-ES | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| us | Spanish (Spain) | es-ES | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Spain) | es-ES | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Spain) | es-ES | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Spain) | es-ES | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (United States) | es-US | `chirp_3` | Automatic punctuation | Speaker diarization | Model adaptation |  | Profanity filter |  |  |
| us | Spanish (United States) | es-US | `long` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (United States) | es-US | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (United States) | es-US | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (United States) | es-US | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Uruguay) | es-UY | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Uruguay) | es-UY | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Venezuela) | es-VE | `telephony` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Spanish (Venezuela) | es-VE | `telephony_short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Swahili | sw | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Swahili (Kenya) | sw-KE | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Swati (Latin, South Africa) | ss-Latn-ZA | `long` |  |  |  |  | Profanity filter |  |  |
| us | Swati (Latin, South Africa) | ss-Latn-ZA | `short` |  |  |  |  | Profanity filter |  |  |
| us | Swedish (Sweden) | sv-SE | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Swedish (Sweden) | sv-SE | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Swedish (Sweden) | sv-SE | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Tamil (India) | ta-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Tamil (India) | ta-IN | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| us | Tamil (India) | ta-IN | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Telugu (India) | te-IN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Telugu (India) | te-IN | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| us | Telugu (India) | te-IN | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Thai (Thailand) | th-TH | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Thai (Thailand) | th-TH | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| us | Thai (Thailand) | th-TH | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Tsonga (South Africa) | ts-ZA | `long` |  |  |  |  | Profanity filter |  |  |
| us | Tsonga (South Africa) | ts-ZA | `short` |  |  |  |  | Profanity filter |  |  |
| us | Tswana (Latin, South Africa) | tn-Latn-ZA | `long` |  |  |  |  | Profanity filter |  |  |
| us | Tswana (Latin, South Africa) | tn-Latn-ZA | `short` |  |  |  |  | Profanity filter |  |  |
| us | Turkish (Turkey) | tr-TR | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Turkish (Turkey) | tr-TR | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Turkish (Turkey) | tr-TR | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter | Spoken punctuation |  |
| us | Ukrainian (Ukraine) | uk-UA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Ukrainian (Ukraine) | uk-UA | `long` |  |  |  | Word-level confidence | Profanity filter |  |  |
| us | Ukrainian (Ukraine) | uk-UA | `short` |  |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Urdu (Pakistan) | ur-PK | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Uzbek (Uzbekistan) | uz-UZ | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Venda (South Africa) | ve-ZA | `long` |  |  |  |  | Profanity filter |  |  |
| us | Venda (South Africa) | ve-ZA | `short` |  |  |  |  | Profanity filter |  |  |
| us | Vietnamese (Vietnam) | vi-VN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Vietnamese (Vietnam) | vi-VN | `long` | Automatic punctuation |  |  | Word-level confidence | Profanity filter |  |  |
| us | Vietnamese (Vietnam) | vi-VN | `short` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us | Welsh (United Kingdom) | cy-GB | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Wolof (Senegal) | wo-SN | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Xhosa (South Africa) | xh-ZA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Xhosa (South Africa) | xh-ZA | `long` |  |  |  |  | Profanity filter |  |  |
| us | Xhosa (South Africa) | xh-ZA | `short` |  |  |  |  | Profanity filter |  |  |
| us | Yoruba (Nigeria) | yo-NG | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us | Zulu (South Africa) | zu-ZA | `chirp_3` | Automatic punctuation |  | Model adaptation |  | Profanity filter |  |  |
| us-central1 | Afrikaans (South Africa) | af-ZA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Afrikaans (South Africa) | af-ZA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Albanian (Albania) | sq-AL | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Albanian (Albania) | sq-AL | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Amharic (Ethiopia) | am-ET | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Amharic (Ethiopia) | am-ET | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Arabic (Egypt) | ar-EG | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Arabic (Egypt) | ar-EG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Armenian (Armenia) | hy-AM | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Armenian (Armenia) | hy-AM | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Aromanian (Bulgaria) | rup-BG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Assamese (India) | as-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Assamese (India) | as-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Asturian (Spain) | ast-ES | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Asturian (Spain) | ast-ES | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Azerbaijani (Azerbaijan) | az-AZ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Azerbaijani (Azerbaijan) | az-AZ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Basque (Spain) | eu-ES | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Basque (Spain) | eu-ES | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Belarusian (Belarus) | be-BY | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Belarusian (Belarus) | be-BY | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Bengali (Bangladesh) | bn-BD | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Bengali (India) | bn-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Bosnian (Bosnia and Herzegovina) | bs-BA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Bosnian (Bosnia and Herzegovina) | bs-BA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Bulgarian (Bulgaria) | bg-BG | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Bulgarian (Bulgaria) | bg-BG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Burmese (Myanmar) | my-MM | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Burmese (Myanmar) | my-MM | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Catalan (Spain) | ca-ES | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Catalan (Spain) | ca-ES | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Cebuano (Philippines) | ceb-PH | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Cebuano (Philippines) | ceb-PH | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Central Kurdish (Iraq) | ckb-IQ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Central Kurdish (Iraq) | ckb-IQ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Chinese (Simplified, China) | cmn-Hans-CN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Chinese (Simplified, China) | cmn-Hans-CN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Chinese, Cantonese (Traditional Hong Kong) | yue-Hant-HK | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Chinese, Cantonese (Traditional Hong Kong) | yue-Hant-HK | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Chinese, Mandarin (Traditional, Taiwan) | cmn-Hant-TW | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Chinese, Mandarin (Traditional, Taiwan) | cmn-Hant-TW | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Croatian (Croatia) | hr-HR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Croatian (Croatia) | hr-HR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Czech (Czech Republic) | cs-CZ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Czech (Czech Republic) | cs-CZ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Danish (Denmark) | da-DK | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Danish (Denmark) | da-DK | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Dutch (Netherlands) | nl-NL | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Dutch (Netherlands) | nl-NL | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | English (Australia) | en-AU | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | English (Australia) | en-AU | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | English (Australia) | en-AU | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| us-central1 | English (India) | en-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | English (India) | en-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | English (United Kingdom) | en-GB | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | English (United Kingdom) | en-GB | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | English (United Kingdom) | en-GB | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| us-central1 | English (United States) | en-US | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | English (United States) | en-US | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | English (United States) | en-US | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| us-central1 | Estonian (Estonia) | et-EE | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Estonian (Estonia) | et-EE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Filipino (Philippines) | fil-PH | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Filipino (Philippines) | fil-PH | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Finnish (Finland) | fi-FI | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Finnish (Finland) | fi-FI | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | French (Canada) | fr-CA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | French (Canada) | fr-CA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | French (Canada) | fr-CA | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| us-central1 | French (France) | fr-FR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | French (France) | fr-FR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | French (France) | fr-FR | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| us-central1 | Fulah (Senegal) | ff-SN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Galician (Spain) | gl-ES | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Galician (Spain) | gl-ES | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Ganda (Uganda) | lg-UG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Georgian (Georgia) | ka-GE | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Georgian (Georgia) | ka-GE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | German (Germany) | de-DE | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | German (Germany) | de-DE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | German (Germany) | de-DE | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| us-central1 | Greek (Greece) | el-GR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Greek (Greece) | el-GR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Gujarati (India) | gu-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Gujarati (India) | gu-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Hausa (Nigeria) | ha-NG | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Hausa (Nigeria) | ha-NG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Hebrew (Israel) | iw-IL | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Hebrew (Israel) | iw-IL | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Hindi (India) | hi-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Hindi (India) | hi-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Hungarian (Hungary) | hu-HU | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Hungarian (Hungary) | hu-HU | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Icelandic (Iceland) | is-IS | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Icelandic (Iceland) | is-IS | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Igbo (Nigeria) | ig-NG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Indonesian (Indonesia) | id-ID | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Indonesian (Indonesia) | id-ID | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Irish (Ireland) | ga-IE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Italian (Italy) | it-IT | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Italian (Italy) | it-IT | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Italian (Italy) | it-IT | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| us-central1 | Japanese (Japan) | ja-JP | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Japanese (Japan) | ja-JP | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Javanese (Indonesia) | jv-ID | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Javanese (Indonesia) | jv-ID | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Kabuverdianu (Cape Verde) | kea-CV | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Kabuverdianu (Cape Verde) | kea-CV | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Kamba (Kenya) | kam-KE | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Kamba (Kenya) | kam-KE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Kannada (India) | kn-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Kannada (India) | kn-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Kazakh (Kazakhstan) | kk-KZ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Kazakh (Kazakhstan) | kk-KZ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Khmer (Cambodia) | km-KH | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Khmer (Cambodia) | km-KH | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Korean (South Korea) | ko-KR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Korean (South Korea) | ko-KR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Kyrgyz (Cyrillic) | ky-KG | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Kyrgyz (Cyrillic) | ky-KG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Lao (Laos) | lo-LA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Lao (Laos) | lo-LA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Latvian (Latvia) | lv-LV | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Latvian (Latvia) | lv-LV | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Lingala (Congo-Kinshasa) | ln-CD | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Lingala (Congo-Kinshasa) | ln-CD | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Lithuanian (Lithuania) | lt-LT | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Lithuaniaa) | ko-KR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Korean (South Korea) | ko-KR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Kyrgyz (Cyrillic) | ky-KG | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Kyrgyz (Cyrillic) | ky-KG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Lao (Laos) | lo-LA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Lao (Laos) | lo-LA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Latvian (Latvia) | lv-LV | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Latvian (Latvia) | lv-LV | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Lingala (Congo-Kinshasa) | ln-CD | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Lingala (Congo-Kinshasa) | ln-CD | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Lithuanian (Lithuania) | lt-LT | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Lithuanian (Lithuania) | lt-LT | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Luo (Kenya) | luo-KE | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Luo (Kenya) | luo-KE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Luxembourgish (Luxembourg) | lb-LU | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Luxembourgish (Luxembourg) | lb-LU | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Macedonian (North Macedonia) | mk-MK | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Macedonian (North Macedonia) | mk-MK | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Malay (Malaysia) | ms-MY | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Malay (Malaysia) | ms-MY | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Malayalam (India) | ml-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Malayalam (India) | ml-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Maltese (Malta) | mt-MT | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Maltese (Malta) | mt-MT | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Maori (New Zealand) | mi-NZ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Maori (New Zealand) | mi-NZ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Marathi (India) | mr-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Marathi (India) | mr-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Mongolian (Mongolia) | mn-MN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Mongolian (Mongolia) | mn-MN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Nepali (Nepal) | ne-NP | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Nepali (Nepal) | ne-NP | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Norwegian Bokmål (Norway) | no-NO | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Norwegian Bokmål (Norway) | no-NO | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Nyanja (Malawi) | ny-MW | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Nyanja (Malawi) | ny-MW | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Occitan (France) | oc-FR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Occitan (France) | oc-FR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Oriya (India) | or-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Oromo (Ethiopia) | om-ET | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Pashto | ps-AF | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Pashto | ps-AF | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Persian (Iran) | fa-IR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Persian (Iran) | fa-IR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Polish (Poland) | pl-PL | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Polish (Poland) | pl-PL | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Portuguese (Brazil) | pt-BR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Portuguese (Brazil) | pt-BR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Portuguese (Brazil) | pt-BR | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| us-central1 | Portuguese (Portugal) | pt-PT | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Punjabi (Gurmukhi India) | pa-Guru-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Punjabi (Gurmukhi India) | pa-Guru-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Romanian (Romania) | ro-RO | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Romanian (Romania) | ro-RO | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Russian (Russia) | ru-RU | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Russian (Russia) | ru-RU | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Sepedi (South Africa) | nso-ZA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Sepedi (South Africa) | nso-ZA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Serbian (Serbia) | sr-RS | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Serbian (Serbia) | sr-RS | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Shona (Zimbabwe) | sn-ZW | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Shona (Zimbabwe) | sn-ZW | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Sindhi (India) | sd-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Sindhi (India) | sd-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Sinhala (Sri Lanka) | si-LK | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Sinhala (Sri Lanka) | si-LK | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Slovak (Slovakia) | sk-SK | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Slovak (Slovakia) | sk-SK | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Slovenian (Slovenia) | sl-SI | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Slovenian (Slovenia) | sl-SI | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Somali | so-SO | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Somali | so-SO | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Spanish (Latin American) | es-419 | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Spanish (Spain) | es-ES | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Spanish (Spain) | es-ES | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Spanish (Spain) | es-ES | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| us-central1 | Spanish (United States) | es-US | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Spanish (United States) | es-US | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Spanish (United States) | es-US | `chirp_telephony` |  |  |  |  | Profanity filter |  |  |
| us-central1 | Sundanese (Indonesia) | su-ID | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Sundanese (Indonesia) | su-ID | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Swahili | sw | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Swahili | sw | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Swahili (Kenya) | sw-KE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Swedish (Sweden) | sv-SE | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Swedish (Sweden) | sv-SE | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Tajik (Tajikistan) | tg-TJ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Tajik (Tajikistan) | tg-TJ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Tamil (India) | ta-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Tamil (India) | ta-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Telugu (India) | te-IN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Telugu (India) | te-IN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Thai (Thailand) | th-TH | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Thai (Thailand) | th-TH | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Turkish (Turkey) | tr-TR | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Turkish (Turkey) | tr-TR | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Ukrainian (Ukraine) | uk-UA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Ukrainian (Ukraine) | uk-UA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Umbundu (Angola) | umb-AO | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Urdu (Pakistan) | ur-PK | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Urdu (Pakistan) | ur-PK | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Uzbek (Uzbekistan) | uz-UZ | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Uzbek (Uzbekistan) | uz-UZ | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Vietnamese (Vietnam) | vi-VN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Vietnamese (Vietnam) | vi-VN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Welsh (United Kingdom) | cy-GB | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Welsh (United Kingdom) | cy-GB | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Wolof (Senegal) | wo-SN | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Wolof (Senegal) | wo-SN | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Xhosa (South Africa) | xh-ZA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Yoruba (Nigeria) | yo-NG | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Yoruba (Nigeria) | yo-NG | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |
| us-central1 | Zulu (South Africa) | zu-ZA | `chirp` | Automatic punctuation |  |  |  |  |  |  |
| us-central1 | Zulu (South Africa) | zu-ZA | `chirp_2` | Automatic punctuation |  | Model adaptation | Word-level confidence | Profanity filter |  |  |



 Send feedback



Except as otherwise noted, the content of this page is licensed under the [Creative Commons Attribution 4.0 License](https://creativecommons.org/licenses/by/4.0/), and code samples are licensed under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0). For details, see the [Google Developers Site Policies](https://developers.google.com/site-policies). Java is a registered trademark of Oracle and/or its affiliates.

Last updated 2026-09-30 UTC.


Need to tell us more?






\[\[\["Easy to understand","easyToUnderstand","thumb-up"\],\["Solved my problem","solvedMyProblem","thumb-up"\],\["Other","otherUp","thumb-up"\]\],\[\["Hard to understand","hardToUnderstand","thumb-down"\],\["Incorrect information or sample code","incorrectInformationOrSampleCode","thumb-down"\],\["Missing the information/samples I need","missingTheInformationSamplesINeed","thumb-down"\],\["Other","otherDown","thumb-down"\]\],\["Last updated 2026-09-30 UTC."\],\[\],\[\]\]