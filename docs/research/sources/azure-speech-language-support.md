Source: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support
Title: Language and Voice Support for Azure Speech - Foundry Tools | Microsoft Learn
Fetched: 2026-10-05T15:27:46.139Z

Table of contents Exit editor mode

Ask LearnAsk Learn

Reading modeTable of contents[Read in English](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt)Add to CollectionsAdd to Plans[Edit](https://github.com/MicrosoftDocs/azure-ai-docs/blob/main/articles/ai-services/speech-service/language-support.md)

* * *

Copy MarkdownPrint

* * *

Note

Access to this page requires authorization. You can try [signing in](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#) or changing directories.


Access to this page requires authorization. You can try changing directories.


# Language and voice support for Azure Speech

Feedback

Summarize this article for me


The following tables summarize language support for [speech to text](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-to-text), [text to speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/text-to-speech), [pronunciation assessment](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment), [speech translation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-translation), and more features of Azure Speech. Use them to check whether your target language and locale are available for each Azure Speech capability.

You can also see the list of locales and voices supported for each specific region or endpoint:

- [Speech SDK](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-sdk)
- [Speech-to-text REST API](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-speech-to-text)
- [Speech-to-text REST API for short audio](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-speech-to-text-short)
- [Text-to-speech REST API](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech#get-a-list-of-voices)

[Section titled: Supported languages](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#supported-languages)

## Supported languages

Language support varies by functionality in Azure Speech.

Note

See the [speech containers](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-container-overview#available-speech-containers) and [embedded speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/embedded-speech#models-and-voices) documentation for their supported languages.

Choose a feature:

- [Speech to text](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#tabpanel_1_stt)
- [Text to speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#tabpanel_1_tts)
- [Custom TTS](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#tabpanel_1_custom-tts)
- [Avatar](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#tabpanel_1_avatar)
- [Pronunciation assessment](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#tabpanel_1_pronunciation-assessment)
- [Speech translation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#tabpanel_1_speech-translation)
- [Language identification](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#tabpanel_1_language-identification)
- [Custom keyword](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#tabpanel_1_custom-keyword)

The following table summarizes locale support for [real-time transcription](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-to-text#real-time-transcription), [fast transcription](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-to-text#fast-transcription), [batch transcription](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-to-text#batch-transcription), and [post-stream refinement](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech). The table lists post-stream refinement support separately for generally available monolingual recognition and multilingual recognition in public preview.

**In this section**

- [Speech to text locales](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#speech-to-text-locales)
- [Custom speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#custom-speech)
- [Custom speech display support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#custom-speech-display-support)
- [LLM speech translation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#llm-speech-translation)
- [MAI-Transcribe supported languages](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#mai-transcribe-supported-languages)

Tip

To build and run samples in Visual Studio Code, try the [Azure Speech Toolkit](https://marketplace.visualstudio.com/items?itemName=ms-azureaispeech.azure-ai-speech-toolkit).

[Section titled: Speech to text locales](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#speech-to-text-locales)

### Speech to text locales

Expand table

| Locale (BCP-47) | Language | Fast transcription support | Monolingual post-stream refinement support | Multilingual post-stream refinement support (preview) |
| --- | --- | --- | --- | --- |
| `af-ZA` | Afrikaans (South Africa) | ✅ |  |  |
| `am-ET` | Amharic (Ethiopia) | ✅ |  |  |
| `ar-AE` | Arabic (United Arab Emirates) | ✅ |  |  |
| `ar-BH` | Arabic (Bahrain) | ✅ |  |  |
| `ar-DZ` | Arabic (Algeria) | ✅ |  |  |
| `ar-EG` | Arabic (Egypt) | ✅ |  |  |
| `ar-IL` | Arabic (Israel) | ✅ |  |  |
| `ar-IQ` | Arabic (Iraq) | ✅ |  |  |
| `ar-JO` | Arabic (Jordan) | ✅ |  |  |
| `ar-KW` | Arabic (Kuwait) | ✅ |  |  |
| `ar-LB` | Arabic (Lebanon) | ✅ |  |  |
| `ar-LY` | Arabic (Libya) | ✅ |  |  |
| `ar-MA` | Arabic (Morocco) | ✅ |  |  |
| `ar-OM` | Arabic (Oman) | ✅ |  |  |
| `ar-PS` | Arabic (Palestinian Authority) | ✅ |  |  |
| `ar-QA` | Arabic (Qatar) | ✅ |  |  |
| `ar-SA` | Arabic (Saudi Arabia) | ✅ | ✅ | ✅ |
| `ar-SY` | Arabic (Syria) | ✅ |  |  |
| `ar-TN` | Arabic (Tunisia) | ✅ |  |  |
| `ar-YE` | Arabic (Yemen) | ✅ |  |  |
| `as-IN` | Assamese (India) | ✅ |  |  |
| `az-AZ` | Azerbaijani (Latin, Azerbaijan) | ✅ |  |  |
| `bg-BG` | Bulgarian (Bulgaria) | ✅ |  |  |
| `bho-IN` | Bhojpuri (India) | ✅ |  |  |
| `bn-IN` | Bengali (India) | ✅ | ✅ |  |
| `bs-BA` | Bosnian (Bosnia and Herzegovina) | ✅ |  |  |
| `ca-ES` | Catalan | ✅ |  |  |
| `cs-CZ` | Czech (Czechia) | ✅ | ✅ | ✅ |
| `cy-GB` | Welsh (United Kingdom) | ✅ |  |  |
| `da-DK` | Danish (Denmark) | ✅ |  | ✅ |
| `de-AT` | German (Austria) | ✅ |  |  |
| `de-CH` | German (Switzerland) | ✅ | ✅ | ✅ |
| `de-DE` | German (Germany) | ✅ | ✅ | ✅ |
| `el-GR` | Greek (Greece) | ✅ | ✅ | ✅ |
| `en-AU` | English (Australia) | ✅ |  |  |
| `en-CA` | English (Canada) | ✅ |  |  |
| `en-GB` | English (United Kingdom) | ✅ | ✅ | ✅ |
| `en-GH` | English (Ghana) | ✅ |  |  |
| `en-HK` | English (Hong Kong SAR) | ✅ |  |  |
| `en-IE` | English (Ireland) | ✅ |  |  |
| `en-IN` | English (India) | ✅ | ✅ | ✅ |
| `en-KE` | English (Kenya) | ✅ |  |  |
| `en-NG` | English (Nigeria) | ✅ |  |  |
| `en-NZ` | English (New Zealand) | ✅ |  |  |
| `en-PH` | English (Philippines) | ✅ |  |  |
| `en-SG` | English (Singapore) | ✅ |  |  |
| `en-TZ` | English (Tanzania) | ✅ |  |  |
| `en-US` | English (United States) | ✅ | ✅ | ✅ |
| `en-ZA` | English (South Africa) | ✅ |  |  |
| `es-AR` | Spanish (Argentina) | ✅ |  |  |
| `es-BO` | Spanish (Bolivia) | ✅ |  |  |
| `es-CL` | Spanish (Chile) | ✅ |  |  |
| `es-CO` | Spanish (Colombia) | ✅ |  |  |
| `es-CR` | Spanish (Costa Rica) | ✅ |  |  |
| `es-CU` | Spanish (Cuba) | ✅ |  |  |
| `es-DO` | Spanish (Dominican Republic) | ✅ |  |  |
| `es-EC` | Spanish (Ecuador) | ✅ |  |  |
| `es-ES` | Spanish (Spain) | ✅ | ✅ | ✅ |
| `es-GQ` | Spanish (Equatorial Guinea) | ✅ |  |  |
| `es-GT` | Spanish (Guatemala) | ✅ |  |  |
| `es-HN` | Spanish (Honduras) | ✅ |  |  |
| `es-MX` | Spanish (Mexico) | ✅ | ✅ | ✅ |
| `es-NI` | Spanish (Nicaragua) | ✅ |  |  |
| `es-PA` | Spanish (Panama) | ✅ |  |  |
| `es-PE` | Spanish (Peru) | ✅ |  |  |
| `es-PR` | Spanish (Puerto Rico) | ✅ |  |  |
| `es-PY` | Spanish (Paraguay) | ✅ |  |  |
| `es-SV` | Spanish (El Salvador) | ✅ |  |  |
| `es-US` | Spanish (United States) | ✅ |  |  |
| `es-UY` | Spanish (Uruguay) | ✅ |  |  |
| `es-VE` | Spanish (Venezuela) | ✅ |  |  |
| `et-EE` | Estonian (Estonia) | ✅ |  |  |
| `eu-ES` | Basque | ✅ |  |  |
| `fa-IR` | Persian (Iran) | ✅ |  |  |
| `fi-FI` | Finnish (Finland) | ✅ | ✅ | ✅ |
| `fil-PH` | Filipino (Philippines) | ✅ |  |  |
| `fr-BE` | French (Belgium) | ✅ |  |  |
| `fr-CA` | French (Canada) | ✅ |  |  |
| `fr-CH` | French (Switzerland) | ✅ |  |  |
| `fr-FR` | French (France) | ✅ | ✅ | ✅ |
| `ga-IE` | Irish (Ireland) | ✅ |  |  |
| `gl-ES` | Galician | ✅ |  |  |
| `gu-IN` | Gujarati (India) | ✅ |  |  |
| `he-IL` | Hebrew (Israel) | ✅ |  | ✅ |
| `hi-IN` | Hindi (India) | ✅ | ✅ | ✅ |
| `hr-HR` | Croatian (Croatia) | ✅ |  |  |
| `hu-HU` | Hungarian (Hungary) | ✅ |  | ✅ |
| `hy-AM` | Armenian (Armenia) | ✅ |  |  |
| `id-ID` | Indonesian (Indonesia) | ✅ | ✅ | ✅ |
| `is-IS` | Icelandic (Iceland) | ✅ |  |  |
| `it-CH` | Italian (Switzerland) | ✅ |  |  |
| `it-IT` | Italian (Italy) | ✅ | ✅ | ✅ |
| `ja-JP` | Japanese (Japan) | ✅ | ✅ | ✅ |
| `jv-ID` | Javanese (Latin, Indonesia) | ✅ |  |  |
| `ka-GE` | Georgian (Georgia) | ✅ |  |  |
| `kk-KZ` | Kazakh (Kazakhstan) | ✅ |  |  |
| `km-KH` | Khmer (Cambodia) | ✅ |  |  |
| `kn-IN` | Kannada (India) | ✅ |  |  |
| `ko-KR` | Korean (Korea) | ✅ | ✅ | ✅ |
| `lo-LA` | Lao (Laos) | ✅ |  |  |
| `lt-LT` | Lithuanian (Lithuania) | ✅ |  |  |
| `lv-LV` | Latvian (Latvia) | ✅ |  |  |
| `mk-MK` | Macedonian (North Macedonia) | ✅ |  |  |
| `ml-IN` | Malayalam (India) | ✅ |  |  |
| `mn-MN` | Mongolian (Mongolia) | ✅ |  |  |
| `mr-IN` | Marathi (India) | ✅ | ✅ |  |
| `ms-MY` | Malay (Malaysia) | ✅ |  |  |
| `mt-MT` | Maltese (Malta) | ✅ |  |  |
| `my-MM` | Burmese (Myanmar) | ✅ |  |  |
| `nb-NO` | Norwegian Bokmål (Norway) | ✅ |  | ✅ |
| `ne-NP` | Nepali (Nepal) | ✅ |  |  |
| `nl-BE` | Dutch (Belgium) | ✅ |  |  |
| `nl-NL` | Dutch (Netherlands) | ✅ | ✅ | ✅ |
| `or-IN` | Odia (India) | ✅ |  |  |
| `pa-IN` | Punjabi (India) | ✅ | ✅ |  |
| `pl-PL` | Polish (Poland) | ✅ | ✅ | ✅ |
| `ps-AF` | Pashto (Afghanistan) | ✅ |  |  |
| `pt-BR` | Portuguese (Brazil) | ✅ | ✅ | ✅ |
| `pt-PT` | Portuguese (Portugal) | ✅ |  |  |
| `ro-RO` | Romanian (Romania) | ✅ |  |  |
| `ru-RU` | Russian (Russia) | ✅ | ✅ | ✅ |
| `si-LK` | Sinhala (Sri Lanka) | ✅ |  |  |
| `sk-SK` | Slovak (Slovakia) | ✅ |  |  |
| `sl-SI` | Slovenian (Slovenia) | ✅ |  |  |
| `so-SO` | Somali (Somalia) | ✅ |  |  |
| `sq-AL` | Albanian (Albania) | ✅ |  |  |
| `sr-ME` | Serbian (Montenegro) | ❌ |  |  |
| `sr-RS` | Serbian (Cyrillic, Serbia) | ✅ |  |  |
| `sr-XK` | Serbian (Kosovo) | ❌ |  |  |
| `sv-SE` | Swedish (Sweden) | ✅ | ✅ | ✅ |
| `sw-KE` | Kiswahili (Kenya) | ✅ |  |  |
| `sw-TZ` | Kiswahili (Tanzania) | ❌ |  |  |
| `ta-IN` | Tamil (India) | ✅ |  |  |
| `te-IN` | Telugu (India) | ✅ | ✅ |  |
| `th-TH` | Thai (Thailand) | ✅ | ✅ | ✅ |
| `tr-TR` | Turkish (Türkiye) | ✅ | ✅ | ✅ |
| `uk-UA` | Ukrainian (Ukraine) | ✅ |  |  |
| `ur-IN` | Urdu (India) | ✅ |  |  |
| `uz-UZ` | Uzbek (Latin, Uzbekistan) | ✅ |  |  |
| `vi-VN` | Vietnamese (Vietnam) | ✅ |  |  |
| `wuu-CN` | Chinese (Wu, Simplified) | ✅ |  |  |
| `yue-CN` | Chinese (Cantonese, Simplified) | ✅ |  |  |
| `zh-CN` | Chinese (Mandarin, Simplified) | ✅ | ✅ | ✅ |
| `zh-CN-shandong` | Chinese (Jilu Mandarin, Simplified) | ❌ |  |  |
| `zh-CN-sichuan` | Chinese (Southwestern Mandarin, Simplified) | ✅ |  |  |
| `zh-HK` | Chinese (Cantonese, Traditional) | ✅ |  |  |
| `zh-TW` | Chinese (Taiwanese Mandarin, Traditional) | ✅ |  |  |
| `zu-ZA` | isiZulu (South Africa) | ✅ |  |  |

[Section titled: Custom speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#custom-speech)

### Custom speech

To improve the accuracy of speech-to-text recognition, you can customize some languages and base models. Depending on the locale, you can upload audio with human-labeled transcripts, plain text, structured text, and pronunciation data. By default, all available base models support plain-text customization. For more information about customization, see [What is custom speech?](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/custom-speech-overview).

Expand table

| Locale (BCP-47) | Language | Custom speech support |
| --- | --- | --- |
| `af-ZA` | Afrikaans (South Africa) | Plain text |
| `am-ET` | Amharic (Ethiopia) | Plain text |
| `ar-AE` | Arabic (United Arab Emirates) | Audio + human-labeled transcript<br>Plain text |
| `ar-BH` | Arabic (Bahrain) | Audio + human-labeled transcript<br>Plain text |
| `ar-DZ` | Arabic (Algeria) | Audio + human-labeled transcript<br>Plain text |
| `ar-EG` | Arabic (Egypt) | Audio + human-labeled transcript<br>Plain text<br>Structured text |
| `ar-IL` | Arabic (Israel) | Audio + human-labeled transcript<br>Plain text |
| `ar-IQ` | Arabic (Iraq) | Audio + human-labeled transcript<br>Plain text |
| `ar-JO` | Arabic (Jordan) | Audio + human-labeled transcript<br>Plain text |
| `ar-KW` | Arabic (Kuwait) | Audio + human-labeled transcript<br>Plain text |
| `ar-LB` | Arabic (Lebanon) | Audio + human-labeled transcript<br>Plain text |
| `ar-LY` | Arabic (Libya) | Audio + human-labeled transcript<br>Plain text |
| `ar-MA` | Arabic (Morocco) | Audio + human-labeled transcript<br>Plain text |
| `ar-OM` | Arabic (Oman) | Audio + human-labeled transcript<br>Plain text |
| `ar-PS` | Arabic (Palestinian Authority) | Audio + human-labeled transcript<br>Plain text |
| `ar-QA` | Arabic (Qatar) | Audio + human-labeled transcript<br>Plain text |
| `ar-SA` | Arabic (Saudi Arabia) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Phrase list |
| `ar-SY` | Arabic (Syria) | Audio + human-labeled transcript<br>Plain text |
| `ar-TN` | Arabic (Tunisia) | Audio + human-labeled transcript<br>Plain text |
| `ar-YE` | Arabic (Yemen) | Audio + human-labeled transcript<br>Plain text |
| `as-IN` | Assamese (India) | Audio + human-labeled transcript |
| `az-AZ` | Azerbaijani (Latin, Azerbaijan) | Plain text |
| `bg-BG` | Bulgarian (Bulgaria) | Plain text |
| `bho-IN` | Bhojpuri (India) | Audio + human-labeled transcript<br>Plain text<br>Structured text |
| `bn-IN` | Bengali (India) | Audio + human-labeled transcript<br>Plain text |
| `bs-BA` | Bosnian (Bosnia and Herzegovina) | Plain text |
| `ca-ES` | Catalan | Plain text<br>Pronunciation |
| `cs-CZ` | Czech (Czechia) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Pronunciation |
| `cy-GB` | Welsh (United Kingdom) | Plain text |
| `da-DK` | Danish (Denmark) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Pronunciation |
| `de-AT` | German (Austria) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Pronunciation |
| `de-CH` | German (Switzerland) | Audio + human-labeled transcript<br>Plain text<br>Pronunciation<br>Phrase list |
| `de-DE` | German (Germany) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Pronunciation<br>Phrase list |
| `el-GR` | Greek (Greece) | Audio + human-labeled transcript<br>Plain text<br>Structured text |
| `en-AU` | English (Australia) | Audio + human-labeled transcript<br>Audio<br>Plain text<br>Structured text<br>Output format<br>Pronunciation<br>Phrase list |
| `en-CA` | English (Canada) | Audio + human-labeled transcript<br>Audio<br>Plain text<br>Structured text<br>Output format<br>Pronunciation<br>Phrase list |
| `en-GB` | English (United Kingdom) | Audio + human-labeled transcript<br>Audio<br>Plain text<br>Structured text<br>Output format<br>Pronunciation<br>Phrase list |
| `en-GH` | English (Ghana) | Audio + human-labeled transcript<br>Audio<br>Plain text<br>Structured text<br>Pronunciation |
| `en-HK` | English (Hong Kong SAR) | Audio + human-labeled transcript<br>Audio<br>Plain text<br>Structured text<br>Output format<br>Pronunciation |
| `en-IE` | English (Ireland) | Audio + human-labeled transcript<br>Audio<br>Plain text<br>Structured text<br>Output format<br>Pronunciation<br>Phrase list |
| `en-IN` | English (India) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Pronunciation<br>Phrase list |
| `en-KE` | English (Kenya) | Audio + human-labeled transcript<br>Audio<br>Plain text<br>Structured text<br>Pronunciation |
| `en-NG` | English (Nigeria) | Audio + human-labeled transcript<br>Audio<br>Plain text<br>Structured text<br>Output format<br>Pronunciation |
| `en-NZ` | English (New Zealand) | Audio + human-labeled transcript<br>Audio<br>Plain text<br>Structured text<br>Output format<br>Pronunciation |
| `en-PH` | English (Philippines) | Audio + human-labeled transcript<br>Audio<br>Plain text<br>Structured text<br>Output format<br>Pronunciation |
| `en-SG` | English (Singapore) | Audio + human-labeled transcript<br>Audio<br>Plain text<br>Structured text<br>Output format<br>Pronunciation |
| `en-TZ` | English (Tanzania) | Audio + human-labeled transcript<br>Audio<br>Plain text<br>Structured text<br>Pronunciation |
| `en-US` | English (United States) | Audio + human-labeled transcript<br>Audio<br>Plain text<br>Structured text<br>Output format<br>Pronunciation<br>Phrase list |
| `en-ZA` | English (South Africa) | Audio + human-labeled transcript<br>Audio<br>Plain text<br>Structured text<br>Pronunciation<br>Phrase list |
| `es-AR` | Spanish (Argentina) | Plain text<br>Structured text<br>Pronunciation |
| `es-BO` | Spanish (Bolivia) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Pronunciation |
| `es-CL` | Spanish (Chile) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Pronunciation |
| `es-CO` | Spanish (Colombia) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Pronunciation |
| `es-CR` | Spanish (Costa Rica) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Pronunciation |
| `es-CU` | Spanish (Cuba) | Plain text<br>Structured text<br>Pronunciation |
| `es-DO` | Spanish (Dominican Republic) | Plain text<br>Structured text<br>Pronunciation |
| `es-EC` | Spanish (Ecuador) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Pronunciation |
| `es-ES` | Spanish (Spain) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Pronunciation<br>Phrase list |
| `es-GQ` | Spanish (Equatorial Guinea) | Audio + human-labeled transcript<br>Plain text<br>Structured text |
| `es-GT` | Spanish (Guatemala) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Pronunciation |
| `es-HN` | Spanish (Honduras) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Pronunciation |
| `es-MX` | Spanish (Mexico) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Pronunciation<br>Phrase list |
| `es-NI` | Spanish (Nicaragua) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Pronunciation |
| `es-PA` | Spanish (Panama) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Pronunciation |
| `es-PE` | Spanish (Peru) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Pronunciation |
| `es-PR` | Spanish (Puerto Rico) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Pronunciation |
| `es-PY` | Spanish (Paraguay) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Pronunciation |
| `es-SV` | Spanish (El Salvador) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Pronunciation |
| `es-US` | Spanish (United States) | Plain text<br>Structured text<br>Pronunciation<br>Phrase list |
| `es-UY` | Spanish (Uruguay) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Pronunciation |
| `es-VE` | Spanish (Venezuela) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Pronunciation |
| `et-EE` | Estonian (Estonia) | Plain text<br>Pronunciation |
| `eu-ES` | Basque | Plain text |
| `fa-IR` | Persian (Iran) | Plain text |
| `fi-FI` | Finnish (Finland) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Pronunciation |
| `fil-PH` | Filipino (Philippines) | Plain text<br>Pronunciation |
| `fr-BE` | French (Belgium) | Plain text |
| `fr-CA` | French (Canada) | Plain text<br>Structured text<br>Output format<br>Pronunciation<br>Phrase list |
| `fr-CH` | French (Switzerland) | Plain text<br>Pronunciation |
| `fr-FR` | French (France) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Pronunciation<br>Phrase list |
| `ga-IE` | Irish (Ireland) | Plain text<br>Pronunciation |
| `gl-ES` | Galician | Plain text |
| `gu-IN` | Gujarati (India) | Audio + human-labeled transcript<br>Plain text |
| `he-IL` | Hebrew (Israel) | Audio + human-labeled transcript<br>Plain text |
| `hi-IN` | Hindi (India) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Phrase list |
| `hr-HR` | Croatian (Croatia) | Plain text<br>Pronunciation |
| `hu-HU` | Hungarian (Hungary) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Pronunciation |
| `hy-AM` | Armenian (Armenia) | Plain text |
| `id-ID` | Indonesian (Indonesia) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Pronunciation<br>Phrase list |
| `is-IS` | Icelandic (Iceland) | Plain text |
| `it-CH` | Italian (Switzerland) | Plain text |
| `it-IT` | Italian (Italy) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Pronunciation<br>Phrase list |
| `ja-JP` | Japanese (Japan) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Phrase list |
| `jv-ID` | Javanese (Latin, Indonesia) | Plain text |
| `ka-GE` | Georgian (Georgia) | Plain text |
| `kk-KZ` | Kazakh (Kazakhstan) | Plain text |
| `km-KH` | Khmer (Cambodia) | Plain text |
| `kn-IN` | Kannada (India) | Audio + human-labeled transcript<br>Plain text |
| `ko-KR` | Korean (Korea) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Phrase list |
| `lo-LA` | Lao (Laos) | Plain text |
| `lt-LT` | Lithuanian (Lithuania) | Plain text<br>Pronunciation |
| `lv-LV` | Latvian (Latvia) | Plain text<br>Pronunciation |
| `mk-MK` | Macedonian (North Macedonia) | Plain text |
| `ml-IN` | Malayalam (India) | Audio + human-labeled transcript<br>Plain text |
| `mn-MN` | Mongolian (Mongolia) | Plain text |
| `mr-IN` | Marathi (India) | Audio + human-labeled transcript<br>Plain text |
| `ms-MY` | Malay (Malaysia) | Plain text |
| `mt-MT` | Maltese (Malta) | Plain text |
| `my-MM` | Burmese (Myanmar) | Plain text |
| `nb-NO` | Norwegian Bokmål (Norway) | Plain text<br>Output format |
| `ne-NP` | Nepali (Nepal) | Plain text |
| `nl-BE` | Dutch (Belgium) | Plain text |
| `nl-NL` | Dutch (Netherlands) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Pronunciation<br>Phrase list |
| `or-IN` | Odia (India) | Audio + human-labeled transcript |
| `pa-IN` | Punjabi (India) | Audio + human-labeled transcript |
| `pl-PL` | Polish (Poland) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Pronunciation<br>Phrase list |
| `ps-AF` | Pashto (Afghanistan) | Plain text |
| `pt-BR` | Portuguese (Brazil) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Pronunciation<br>Phrase list |
| `pt-PT` | Portuguese (Portugal) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Pronunciation<br>Phrase list |
| `ro-RO` | Romanian (Romania) | Plain text<br>Pronunciation |
| `ru-RU` | Russian (Russia) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Phrase list |
| `si-LK` | Sinhala (Sri Lanka) | Plain text |
| `sk-SK` | Slovak (Slovakia) | Plain text<br>Pronunciation |
| `sl-SI` | Slovenian (Slovenia) | Plain text<br>Pronunciation |
| `so-SO` | Somali (Somalia) | Plain text |
| `sq-AL` | Albanian (Albania) | Plain text |
| `sr-ME` | Serbian (Montenegro) | Plain text |
| `sr-RS` | Serbian (Cyrillic, Serbia) | Plain text |
| `sr-XK` | Serbian (Kosovo) | Plain text |
| `sv-SE` | Swedish (Sweden) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Pronunciation<br>Phrase list |
| `sw-KE` | Kiswahili (Kenya) | Plain text |
| `sw-TZ` | Kiswahili (Tanzania) | Plain text |
| `ta-IN` | Tamil (India) | Audio + human-labeled transcript<br>Plain text<br>Structured text |
| `te-IN` | Telugu (India) | Audio + human-labeled transcript<br>Plain text<br>Structured text |
| `th-TH` | Thai (Thailand) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Phrase list |
| `tr-TR` | Turkish (Türkiye) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format |
| `uk-UA` | Ukrainian (Ukraine) | Audio + human-labeled transcript<br>Plain text |
| `ur-IN` | Urdu (India) | Audio + human-labeled transcript |
| `uz-UZ` | Uzbek (Latin, Uzbekistan) | Plain text |
| `vi-VN` | Vietnamese (Vietnam) | Plain text<br>Phrase list |
| `wuu-CN` | Chinese (Wu, Simplified) | Plain text |
| `yue-CN` | Chinese (Cantonese, Simplified) | Plain text |
| `zh-CN` | Chinese (Mandarin, Simplified) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Phrase list |
| `zh-CN-shandong` | Chinese (Jilu Mandarin, Simplified) | Plain text |
| `zh-CN-sichuan` | Chinese (Southwestern Mandarin, Simplified) | Plain text |
| `zh-HK` | Chinese (Cantonese, Traditional) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Phrase list |
| `zh-TW` | Chinese (Taiwanese Mandarin, Traditional) | Audio + human-labeled transcript<br>Plain text<br>Structured text<br>Output format<br>Phrase list |
| `zu-ZA` | isiZulu (South Africa) | Plain text |

Note

[Phrase list](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/improve-accuracy-phrase-list) is a runtime recognition feature, not a model customization capability. You can use phrase lists with real-time transcription and fast transcription on both base and custom speech endpoints, for locales where the feature is enabled. Phrase list doesn't require model training. For supported locales and usage details, see [Improve recognition accuracy with phrase list](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/improve-accuracy-phrase-list).

[Section titled: Custom speech display support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#custom-speech-display-support)

### Custom speech display support

These locales support the [display text format feature](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-custom-speech-display-text-format): `da-DK`, `de-DE`, `en-AU`, `en-CA`, `en-GB`, `en-HK`, `en-IE`, `en-IN`, `en-NG`, `en-NZ`, `en-PH`, `en-SG`, `en-US`, `es-ES`, `es-MX`, `fi-FI`, `fr-CA`, `fr-FR`, `hi-IN`, `it-IT`, `ja-JP`, `ko-KR`, `nb-NO`, `nl-NL`, `pl-PL`, `pt-BR`, `pt-PT`, `sv-SE`, `tr-TR`, `zh-CN`, `zh-HK`.

[Section titled: LLM speech translation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#llm-speech-translation)

### LLM speech translation

LLM speech supports the following languages for both transcription and translation.

Expand table

| Locale | Language | LLM speech translation support |
| --- | --- | --- |
| `de` | German | ✅ |
| `en` | English | ✅ |
| `es` | Spanish | ✅ |
| `fr` | French | ✅ |
| `it` | Italian | ✅ |
| `ja` | Japanese | ✅ |
| `ko` | Korean | ✅ |
| `pt` | Portuguese | ✅ |
| `zh` | Chinese | ✅ |

[Section titled: MAI-Transcribe supported languages](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#mai-transcribe-supported-languages)

### MAI-Transcribe supported languages

The following table summarizes the languages supported by [MAI-Transcribe](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/mai-transcribe) models for speech recognition.

Expand table

| Language code | Language | MAI-Transcribe-1.5 support | MAI-Transcribe-2 support |
| --- | --- | --- | --- |
| `af` | Afrikaans |  | ✅ |
| `ar` | Arabic | ✅ | ✅ |
| `as` | Assamese | ✅ | ✅ |
| `az` | Azerbaijani |  | ✅ |
| `bg` | Bulgarian | ✅ | ✅ |
| `bn` | Bengali | ✅ | ✅ |
| `bs` | Bosnian |  | ✅ |
| `ca` | Catalan | ✅ | ✅ |
| `cs` | Czech | ✅ | ✅ |
| `da` | Danish | ✅ | ✅ |
| `de` | German | ✅ | ✅ |
| `el` | Greek | ✅ | ✅ |
| `en` | English | ✅ | ✅ |
| `es` | Spanish | ✅ | ✅ |
| `et` | Estonian | ✅ | ✅ |
| `fa` | Persian |  | ✅ |
| `fi` | Finnish | ✅ | ✅ |
| `fil` | Filipino |  | ✅ |
| `fr` | French | ✅ | ✅ |
| `gl` | Galician |  | ✅ |
| `gu` | Gujarati | ✅ | ✅ |
| `he` | Hebrew |  | ✅ |
| `hi` | Hindi | ✅ | ✅ |
| `hu` | Hungarian | ✅ | ✅ |
| `hy` | Armenian |  | ✅ |
| `id` | Indonesian | ✅ | ✅ |
| `is` | Icelandic |  | ✅ |
| `it` | Italian | ✅ | ✅ |
| `ja` | Japanese | ✅ | ✅ |
| `kk` | Kazakh |  | ✅ |
| `kn` | Kannada | ✅ | ✅ |
| `ko` | Korean | ✅ | ✅ |
| `lt` | Lithuanian | ✅ | ✅ |
| `lv` | Latvian |  | ✅ |
| `mk` | Macedonian |  | ✅ |
| `ml` | Malayalam | ✅ | ✅ |
| `mr` | Marathi | ✅ | ✅ |
| `ms` | Malay |  | ✅ |
| `nb` | Norwegian Bokmål | ✅ | ✅ |
| `ne` | Nepali |  | ✅ |
| `nl` | Dutch | ✅ | ✅ |
| `or` | Odia | ✅ | ✅ |
| `pa` | Punjabi (Gurmukhi script) | ✅ | ✅ |
| `pl` | Polish | ✅ | ✅ |
| `pt` | Portuguese | ✅ | ✅ |
| `ro` | Romanian | ✅ | ✅ |
| `ru` | Russian | ✅ | ✅ |
| `sk` | Slovak | ✅ | ✅ |
| `sl` | Slovenian | ✅ | ✅ |
| `sv` | Swedish | ✅ | ✅ |
| `sw` | Swahili |  | ✅ |
| `ta` | Tamil | ✅ | ✅ |
| `te` | Telugu | ✅ | ✅ |
| `th` | Thai | ✅ | ✅ |
| `tr` | Turkish | ✅ | ✅ |
| `uk` | Ukrainian | ✅ | ✅ |
| `ur` | Urdu |  | ✅ |
| `vi` | Vietnamese | ✅ | ✅ |
| `yue` | Cantonese |  | ✅ |
| `zh` | Chinese (simplified) | ✅ | ✅ |

Learn about the different types and features of Azure Speech voices, or skip to the complete [Text to speech voices](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#text-to-speech-voices) table.

[Section titled: Types of voices](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#types-of-voices)

## Types of voices

The table in this section represents the locales and voices that text to speech supports. For details, see the following section notes. More remarks for text-to-speech locales are included in the [Voice styles and roles](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#voice-styles-and-roles), [Standard voices](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#standard-voices), [Professional voice](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#professional-voice), and [Personal voice](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#personal-voice) sections in this article.

[Section titled: Standard voices](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#standard-voices)

### Standard voices

Each standard voice supports a specific language and dialect, identified by locale. You can try the demo and hear the voices in the [Voice Gallery](https://speech.microsoft.com/portal/voicegallery).

Important

Pricing varies for standard voice and custom voice. For more information, see the [Azure Speech in Foundry Tools pricing](https://azure.microsoft.com/pricing/details/speech/) page.

Each standard voice model is available at 24 kHz and high-fidelity 48 kHz. You can get other sample rates through upsampling or downsampling when synthesizing.

[Section titled: Multilingual voices](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#multilingual-voices)

### Multilingual voices

Voices with names that include `MultilingualNeural`, `DragonHDLatestNeural`, or `DragonHDOmniLatestNeural` support multiple languages. These voices enable expressive speech synthesis across languages, which helps reduce language barriers and support inclusive global communication.

`DragonHDLatestNeural` and `DragonHDOmniLatestNeural` are neural high‑definition (HD) voices that are based on large language models (LLMs). They can understand the semantic content of the input text, automatically detect emotional cues, and adjust speaking style and tone in real time to better match the sentiment. HD voices maintain a consistent voice persona with their non‑HD (neural) counterparts while providing enhanced capabilities through improved contextual understanding.

`MultilingualNeural` voices represent an earlier generation of multilingual technology. They offer high naturalness but don't have the same level of contextual awareness as HD voices.

The locale prefix indicates the voice's primary locale. For example, for the voice `en‑US‑AndrewMultilingualNeural`, the locale prefix is `en‑US`, which is the first segment of the voice name.

Tip

To synthesize text in a specific language, use a voice from that locale and match your SSML locale to the same language (for example, `es-ES-*` voice with `xml:lang="es-ES"`).

If output doesn't match your target language, check these common causes:

- The selected voice is for a different locale.
- The SSML `xml:lang` value conflicts with the selected voice locale.
- Your flow uses text to speech only, but you expected translation behavior.

For implementation steps, see [Get started with text to speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-text-to-speech) and [Speech Synthesis Markup Language (SSML) overview](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup).

Tip

To determine the right voice for your business needs, check the [Voice Gallery](https://speech.microsoft.com/portal/voicegallery).

To build and run samples in Visual Studio Code, try the [Azure Speech Toolkit](https://marketplace.visualstudio.com/items?itemName=ms-azureaispeech.azure-ai-speech-toolkit).

[Section titled: Multi-talker voices](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#multi-talker-voices)

### Multi-talker voices

Multi-talker voices enable natural, dynamic conversations with multiple distinct speakers. This innovation enhances the realism of synthesized dialogues by preserving contextual flow, emotional consistency, and natural speech patterns.

Use this capability to generate engaging, podcast-style speech or conversational exchanges with seamless transitions between speakers. Unlike single-talker models, which synthesize each turn in isolation, multi-talker voices maintain coherence across dialogue. This coherence helps ensure a more authentic and immersive listening experience.

For more information about how to use multi-talker voices via Speech Synthesis Markup Language (SSML), see [Multi-talker voice example](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-voice#multi-talker-voice-example).

[Section titled: Voice styles and roles](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#voice-styles-and-roles)

## Voice styles and roles

In some cases, you can adjust the speaking style to express emotions like cheerfulness, empathy, and calm. All standard voices with speaking styles and multi-style custom voices support adjustment of style degree. You can optimize the voice for scenarios like customer service, newscast, and voice assistant. With roles, the same voice can act as a different age and gender.

To learn how you can configure and adjust voice styles and roles, see [Use speaking styles and roles](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-voice#use-speaking-styles-paralinguistics-and-roles).

[Section titled: Voice conversion](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#voice-conversion)

## Voice conversion

[Voice conversion](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-conversion) is a feature for transforming the voice characteristics of audio to a target voice speaker. The following table summarizes the supported locales for voice conversion. Each language is available in all [voice conversion regions](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions#regions).

[Section titled: Text to speech voices](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#text-to-speech-voices)

## Text to speech voices

Expand table

| Locale (BCP-47) | Language | Type | Text to speech voices | Style/Roles | Voice conversion |
| --- | --- | --- | --- | --- | --- |
| `af-ZA` | Afrikaans (South Africa) | Standard | `af-ZA-AdriNeural`3 (Female) |  | ❌ |
| `af-ZA` | Afrikaans (South Africa) | Standard | `af-ZA-WillemNeural`3 (Male) |  | ❌ |
| `am-ET` | Amharic (Ethiopia) | Standard | `am-ET-MekdesNeural`3 (Female) |  | ❌ |
| `am-ET` | Amharic (Ethiopia) | Standard | `am-ET-AmehaNeural`3 (Male) |  | ❌ |
| `ar-AE` | Arabic (United Arab Emirates) | Standard | `ar-AE-FatimaNeural` (Female) |  | ❌ |
| `ar-AE` | Arabic (United Arab Emirates) | Standard | `ar-AE-HamdanNeural` (Male) |  | ❌ |
| `ar-BH` | Arabic (Bahrain) | Standard | `ar-BH-LailaNeural` (Female) |  | ❌ |
| `ar-BH` | Arabic (Bahrain) | Standard | `ar-BH-AliNeural` (Male) |  | ❌ |
| `ar-DZ` | Arabic (Algeria) | Standard | `ar-DZ-AminaNeural` (Female) |  | ❌ |
| `ar-DZ` | Arabic (Algeria) | Standard | `ar-DZ-IsmaelNeural` (Male) |  | ❌ |
| `ar-EG` | Arabic (Egypt) | Standard | `ar-EG-SalmaNeural` (Female) |  | ❌ |
| `ar-EG` | Arabic (Egypt) | Standard | `ar-EG-ShakirNeural` (Male) |  | ❌ |
| `ar-IQ` | Arabic (Iraq) | Standard | `ar-IQ-RanaNeural` (Female) |  | ❌ |
| `ar-IQ` | Arabic (Iraq) | Standard | `ar-IQ-BasselNeural` (Male) |  | ❌ |
| `ar-JO` | Arabic (Jordan) | Standard | `ar-JO-SanaNeural` (Female) |  | ❌ |
| `ar-JO` | Arabic (Jordan) | Standard | `ar-JO-TaimNeural` (Male) |  | ❌ |
| `ar-KW` | Arabic (Kuwait) | Standard | `ar-KW-NouraNeural` (Female) |  | ❌ |
| `ar-KW` | Arabic (Kuwait) | Standard | `ar-KW-FahedNeural` (Male) |  | ❌ |
| `ar-LB` | Arabic (Lebanon) | Standard | `ar-LB-LaylaNeural` (Female) |  | ❌ |
| `ar-LB` | Arabic (Lebanon) | Standard | `ar-LB-RamiNeural` (Male) |  | ❌ |
| `ar-LY` | Arabic (Libya) | Standard | `ar-LY-ImanNeural` (Female) |  | ❌ |
| `ar-LY` | Arabic (Libya) | Standard | `ar-LY-OmarNeural` (Male) |  | ❌ |
| `ar-MA` | Arabic (Morocco) | Standard | `ar-MA-MounaNeural` (Female) |  | ❌ |
| `ar-MA` | Arabic (Morocco) | Standard | `ar-MA-JamalNeural` (Male) |  | ❌ |
| `ar-OM` | Arabic (Oman) | Standard | `ar-OM-AyshaNeural` (Female) |  | ❌ |
| `ar-OM` | Arabic (Oman) | Standard | `ar-OM-AbdullahNeural` (Male) |  | ❌ |
| `ar-QA` | Arabic (Qatar) | Standard | `ar-QA-AmalNeural` (Female) |  | ❌ |
| `ar-QA` | Arabic (Qatar) | Standard | `ar-QA-MoazNeural` (Male) |  | ❌ |
| `ar-SA` | Arabic (Saudi Arabia) | Standard | `ar-SA-ZariyahNeural` (Female) |  | ❌ |
| `ar-SA` | Arabic (Saudi Arabia) | Standard | `ar-SA-HamedNeural` (Male) |  | ❌ |
| `ar-SY` | Arabic (Syria) | Standard | `ar-SY-AmanyNeural` (Female) |  | ❌ |
| `ar-SY` | Arabic (Syria) | Standard | `ar-SY-LaithNeural` (Male) |  | ❌ |
| `ar-TN` | Arabic (Tunisia) | Standard | `ar-TN-ReemNeural` (Female) |  | ❌ |
| `ar-TN` | Arabic (Tunisia) | Standard | `ar-TN-HediNeural` (Male) |  | ❌ |
| `ar-YE` | Arabic (Yemen) | Standard | `ar-YE-MaryamNeural` (Female) |  | ❌ |
| `ar-YE` | Arabic (Yemen) | Standard | `ar-YE-SalehNeural` (Male) |  | ❌ |
| `as-IN` | Assamese (India) | Standard | `as-IN-YashicaNeural`3 (Female) |  | ❌ |
| `as-IN` | Assamese (India) | Standard | `as-IN-PriyomNeural`3 (Male) |  | ❌ |
| `az-AZ` | Azerbaijani (Latin, Azerbaijan) | Standard | `az-AZ-BanuNeural`3 (Female) |  | ❌ |
| `az-AZ` | Azerbaijani (Latin, Azerbaijan) | Standard | `az-AZ-BabekNeural`3 (Male) |  | ❌ |
| `bg-BG` | Bulgarian (Bulgaria) | Standard | `bg-BG-KalinaNeural` (Female) |  | ❌ |
| `bg-BG` | Bulgarian (Bulgaria) | Standard | `bg-BG-BorislavNeural` (Male) |  | ❌ |
| `bn-BD` | Bangla (Bangladesh) | Standard | `bn-BD-NabanitaNeural`3 (Female) |  | ❌ |
| `bn-BD` | Bangla (Bangladesh) | Standard | `bn-BD-PradeepNeural`3 (Male) |  | ❌ |
| `bn-IN` | Bengali (India) | Standard | `bn-IN-TanishaaNeural`3 (Female) |  | ❌ |
| `bn-IN` | Bengali (India) | Standard | `bn-IN-BashkarNeural`3 (Male) |  | ❌ |
| `bs-BA` | Bosnian (Bosnia and Herzegovina) | Standard | `bs-BA-VesnaNeural`3 (Female) |  | ❌ |
| `bs-BA` | Bosnian (Bosnia and Herzegovina) | Standard | `bs-BA-GoranNeural`3 (Male) |  | ❌ |
| `ca-ES` | Catalan | Standard | `ca-ES-JoanaNeural` (Female) |  | ❌ |
| `ca-ES` | Catalan | Standard | `ca-ES-EnricNeural` (Male) |  | ❌ |
| `ca-ES` | Catalan | Standard | `ca-ES-AlbaNeural` (Female) |  | ❌ |
| `cs-CZ` | Czech (Czechia) | Standard | `cs-CZ-VlastaNeural` (Female) |  | ❌ |
| `cs-CZ` | Czech (Czechia) | Standard | `cs-CZ-AntoninNeural` (Male) |  | ❌ |
| `cy-GB` | Welsh (United Kingdom) | Standard | `cy-GB-NiaNeural`3 (Female) |  | ❌ |
| `cy-GB` | Welsh (United Kingdom) | Standard | `cy-GB-AledNeural`3 (Male) |  | ❌ |
| `da-DK` | Danish (Denmark) | Standard | `da-DK-ChristelNeural` (Female) |  | ❌ |
| `da-DK` | Danish (Denmark) | Standard | `da-DK-JeppeNeural` (Male) |  | ❌ |
| `de-AT` | German (Austria) | Standard | `de-AT-IngridNeural` (Female) |  | ❌ |
| `de-AT` | German (Austria) | Standard | `de-AT-JonasNeural` (Male) |  | ❌ |
| `de-CH` | German (Switzerland) | Standard | `de-CH-LeniNeural` (Female) |  | ❌ |
| `de-CH` | German (Switzerland) | Standard | `de-CH-JanNeural` (Male) |  | ❌ |
| `de-DE` | German (Germany) | Neural HD | `de-DE-Seraphina:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `de-DE` | German (Germany) | Neural HD | `de-DE-Florian:DragonHDLatestNeural`2,4 (Male) |  | ❌ |
| `de-DE` | German (Germany) | Multilingual | `de-DE-SeraphinaMultilingualNeural`2 (Female) |  | ❌ |
| `de-DE` | German (Germany) | Multilingual | `de-DE-FlorianMultilingualNeural`2 (Male) |  | ❌ |
| `de-DE` | German (Germany) | Standard | `de-DE-KatjaNeural` (Female) |  | ❌ |
| `de-DE` | German (Germany) | Standard | `de-DE-ConradNeural` (Male) | **Styles**<br>`cheerful`, `sad`<br>**Roles**<br>Not supported | ❌ |
| `de-DE` | German (Germany) | Standard | `de-DE-AmalaNeural` (Female) |  | ❌ |
| `de-DE` | German (Germany) | Standard | `de-DE-BerndNeural` (Male) |  | ❌ |
| `de-DE` | German (Germany) | Standard | `de-DE-ChristophNeural` (Male) |  | ❌ |
| `de-DE` | German (Germany) | Standard | `de-DE-ElkeNeural` (Female) |  | ❌ |
| `de-DE` | German (Germany) | Standard | `de-DE-GiselaNeural` (Female, Child) |  | ❌ |
| `de-DE` | German (Germany) | Standard | `de-DE-KasperNeural` (Male) |  | ❌ |
| `de-DE` | German (Germany) | Standard | `de-DE-KillianNeural` (Male) |  | ❌ |
| `de-DE` | German (Germany) | Standard | `de-DE-KlarissaNeural` (Female) |  | ❌ |
| `de-DE` | German (Germany) | Standard | `de-DE-KlausNeural` (Male) |  | ❌ |
| `de-DE` | German (Germany) | Standard | `de-DE-LouisaNeural` (Female) |  | ❌ |
| `de-DE` | German (Germany) | Standard | `de-DE-MajaNeural` (Female) |  | ❌ |
| `de-DE` | German (Germany) | Standard | `de-DE-RalfNeural` (Male) |  | ❌ |
| `de-DE` | German (Germany) | Standard | `de-DE-TanjaNeural` (Female) |  | ❌ |
| `de-DE` | German (Germany) | Neural HD | `de-DE-Klaus:MAI-Voice-2`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `de-DE` | German (Germany) | Neural HD Flash | `de-DE-Klaus:MAI-Voice-2-Flash`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `de-DE` | German (Germany) | Neural HD | `de-DE-Mia:MAI-Voice-2`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `de-DE` | German (Germany) | Neural HD Flash | `de-DE-Mia:MAI-Voice-2-Flash`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `el-GR` | Greek (Greece) | Standard | `el-GR-AthinaNeural` (Female) |  | ❌ |
| `el-GR` | Greek (Greece) | Standard | `el-GR-NestorasNeural` (Male) |  | ❌ |
| `en-AU` | English (Australia) | Multilingual | `en-AU-WilliamMultilingualNeural`2 (Male) |  | ❌ |
| `en-AU` | English (Australia) | Standard | `en-AU-NatashaNeural` (Female) |  | ❌ |
| `en-AU` | English (Australia) | Standard | `en-AU-WilliamNeural` (Male) |  | ❌ |
| `en-AU` | English (Australia) | Standard | `en-AU-AnnetteNeural` (Female) |  | ❌ |
| `en-AU` | English (Australia) | Standard | `en-AU-CarlyNeural` (Female) |  | ❌ |
| `en-AU` | English (Australia) | Standard | `en-AU-DarrenNeural` (Male) |  | ❌ |
| `en-AU` | English (Australia) | Standard | `en-AU-DuncanNeural` (Male) |  | ❌ |
| `en-AU` | English (Australia) | Standard | `en-AU-ElsieNeural` (Female) |  | ❌ |
| `en-AU` | English (Australia) | Standard | `en-AU-FreyaNeural` (Female) |  | ❌ |
| `en-AU` | English (Australia) | Standard | `en-AU-JoanneNeural` (Female) |  | ❌ |
| `en-AU` | English (Australia) | Standard | `en-AU-KenNeural` (Male) |  | ❌ |
| `en-AU` | English (Australia) | Standard | `en-AU-KimNeural` (Female) |  | ❌ |
| `en-AU` | English (Australia) | Standard | `en-AU-NeilNeural` (Male) |  | ❌ |
| `en-AU` | English (Australia) | Standard | `en-AU-TimNeural` (Male) |  | ❌ |
| `en-AU` | English (Australia) | Standard | `en-AU-TinaNeural` (Female) |  | ❌ |
| `en-AU` | English (Australia) | Neural HD Omni | `en-au-cyanspark:DragonHDOmniLatestNeural`1,2 (Female) |  | ❌ |
| `en-AU` | English (Australia) | Neural HD | `en-AU-Isla:MAI-Voice-2`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `en-AU` | English (Australia) | Neural HD Flash | `en-AU-Isla:MAI-Voice-2-Flash`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `en-AU` | English (Australia) | Neural HD Omni | `en-au-siennatopaz:DragonHDOmniLatestNeural`1,2 (Female) |  | ❌ |
| `en-CA` | English (Canada) | Standard | `en-CA-ClaraNeural` (Female) |  | ❌ |
| `en-CA` | English (Canada) | Standard | `en-CA-LiamNeural` (Male) |  | ❌ |
| `en-GB` | English (United Kingdom) | Neural HD | `en-GB-Ada:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `en-GB` | English (United Kingdom) | Neural HD | `en-GB-Ollie:DragonHDLatestNeural`2,4 (Male) |  | ❌ |
| `en-GB` | English (United Kingdom) | Multilingual | `en-GB-AdaMultilingualNeural`2 (Female) |  | ❌ |
| `en-GB` | English (United Kingdom) | Multilingual | `en-GB-OllieMultilingualNeural`2 (Male) |  | ❌ |
| `en-GB` | English (United Kingdom) | Standard | `en-GB-SoniaNeural` (Female) | **Styles**<br>`cheerful`, `sad`<br>**Roles**<br>Not supported | ❌ |
| `en-GB` | English (United Kingdom) | Standard | `en-GB-RyanNeural` (Male) | **Styles**<br>`chat`, `cheerful`, `sad`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `en-GB` | English (United Kingdom) | Standard | `en-GB-LibbyNeural` (Female) |  | ❌ |
| `en-GB` | English (United Kingdom) | Standard | `en-GB-AbbiNeural` (Female) |  | ❌ |
| `en-GB` | English (United Kingdom) | Standard | `en-GB-AlfieNeural` (Male) |  | ❌ |
| `en-GB` | English (United Kingdom) | Standard | `en-GB-BellaNeural` (Female) |  | ❌ |
| `en-GB` | English (United Kingdom) | Standard | `en-GB-ElliotNeural` (Male) |  | ❌ |
| `en-GB` | English (United Kingdom) | Standard | `en-GB-EthanNeural` (Male) |  | ❌ |
| `en-GB` | English (United Kingdom) | Standard | `en-GB-HollieNeural` (Female) |  | ❌ |
| `en-GB` | English (United Kingdom) | Standard | `en-GB-MaisieNeural` (Female, Child) |  | ❌ |
| `en-GB` | English (United Kingdom) | Standard | `en-GB-NoahNeural` (Male) |  | ❌ |
| `en-GB` | English (United Kingdom) | Standard | `en-GB-OliverNeural` (Male) |  | ❌ |
| `en-GB` | English (United Kingdom) | Standard | `en-GB-OliviaNeural` (Female) |  | ❌ |
| `en-GB` | English (United Kingdom) | Standard | `en-GB-ThomasNeural` (Male) |  | ❌ |
| `en-GB` | English (United Kingdom) | Neural HD | `en-GB-Ryan:DragonHDLatestNeural`1,2 (Male) |  | ❌ |
| `en-GB` | English (United Kingdom) | Neural HD | `en-GB-Sonia:DragonHDLatestNeural`1,2 (Female) |  | ❌ |
| `en-HK` | English (Hong Kong SAR) | Standard | `en-HK-YanNeural` (Female) |  | ❌ |
| `en-HK` | English (Hong Kong SAR) | Standard | `en-HK-SamNeural` (Male) |  | ❌ |
| `en-IE` | English (Ireland) | Standard | `en-IE-EmilyNeural` (Female) |  | ❌ |
| `en-IE` | English (Ireland) | Standard | `en-IE-ConnorNeural` (Male) |  | ❌ |
| `en-IN` | English (India) | Neural HD | `en-IN-Diya:DragonHDLatestNeural`1,2 (Female) |  | ❌ |
| `en-IN` | English (India) | Neural HD | `en-IN-Meera:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `en-IN` | English (India) | Neural HD | `en-IN-Aarti:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `en-IN` | English (India) | Neural HD | `en-IN-Arjun:DragonHDLatestNeural`2,4 (Male) |  | ❌ |
| `en-IN` | English (India) | Neural HD | `en-IN-Neerja:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `en-IN` | English (India) | Standard | `en-IN-AartiIndicNeural` (Female) |  | ❌ |
| `en-IN` | English (India) | Standard | `en-IN-ArjunIndicNeural` (Male) |  | ❌ |
| `en-IN` | English (India) | Standard | `en-IN-NeerjaIndicNeural` (Female) |  | ❌ |
| `en-IN` | English (India) | Standard | `en-IN-PrabhatIndicNeural` (Male) |  | ❌ |
| `en-IN` | English (India) | Standard | `en-IN-AaravNeural` (Male) |  | ❌ |
| `en-IN` | English (India) | Standard | `en-IN-AashiNeural` (Female) |  | ❌ |
| `en-IN` | English (India) | Standard | `en-IN-AartiNeural` (Female) |  | ❌ |
| `en-IN` | English (India) | Standard | `en-IN-ArjunNeural` (Male) |  | ❌ |
| `en-IN` | English (India) | Standard | `en-IN-AnanyaNeural` (Female) |  | ❌ |
| `en-IN` | English (India) | Standard | `en-IN-KavyaNeural` (Female) |  | ❌ |
| `en-IN` | English (India) | Standard | `en-IN-KunalNeural` (Male) |  | ❌ |
| `en-IN` | English (India) | Standard | `en-IN-NeerjaNeural` (Female) | **Styles**<br>`cheerful`, `empathetic`, `newscast`<br>**Roles**<br>Not supported | ❌ |
| `en-IN` | English (India) | Standard | `en-IN-PrabhatNeural` (Male) |  | ❌ |
| `en-IN` | English (India) | Standard | `en-IN-RehaanNeural` (Male) |  | ❌ |
| `en-IN` | English (India) | Neural HD | `en-IN-Lavanya:DragonHDLatestNeural`1,2 (Female) |  | ❌ |
| `en-KE` | English (Kenya) | Standard | `en-KE-AsiliaNeural` (Female) |  | ❌ |
| `en-KE` | English (Kenya) | Standard | `en-KE-ChilembaNeural` (Male) |  | ❌ |
| `en-NG` | English (Nigeria) | Standard | `en-NG-EzinneNeural` (Female) |  | ❌ |
| `en-NG` | English (Nigeria) | Standard | `en-NG-AbeoNeural` (Male) |  | ❌ |
| `en-NZ` | English (New Zealand) | Standard | `en-NZ-MollyNeural` (Female) |  | ❌ |
| `en-NZ` | English (New Zealand) | Standard | `en-NZ-MitchellNeural` (Male) |  | ❌ |
| `en-PH` | English (Philippines) | Standard | `en-PH-RosaNeural` (Female) |  | ❌ |
| `en-PH` | English (Philippines) | Standard | `en-PH-JamesNeural` (Male) |  | ❌ |
| `en-SG` | English (Singapore) | Standard | `en-SG-LunaNeural` (Female) |  | ❌ |
| `en-SG` | English (Singapore) | Standard | `en-SG-WayneNeural` (Male) |  | ❌ |
| `en-TZ` | English (Tanzania) | Standard | `en-TZ-ImaniNeural` (Female) |  | ❌ |
| `en-TZ` | English (Tanzania) | Standard | `en-TZ-ElimuNeural` (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Ava:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Andrew:DragonHDLatestNeural`2,4 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Adam:DragonHDLatestNeural`2,4 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Alloy:DragonHDLatestNeural`2,4 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Aria:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Bree:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Brian:DragonHDLatestNeural`2,4 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Davis:DragonHDLatestNeural`2,4 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Emma:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Emma2:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Jane:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Jenny:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Nova:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Phoebe:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Serena:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Steffan:DragonHDLatestNeural`2,4 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD Omni | `en-US-Andrew:DragonHDOmniLatestNeural`1,2 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD Omni | `en-US-Caleb:DragonHDOmniLatestNeural`1,2 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD Omni | `en-US-Dana:DragonHDOmniLatestNeural`1,2 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD Omni | `en-US-Lewis:DragonHDOmniLatestNeural`1,2 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD Omni | `en-US-Phoebe:DragonHDOmniLatestNeural`1,2 (Female) |  | ❌ |
| `en-US` | English (United States) | Multilingual | `en-US-AvaMultilingualNeural`2 (Female) |  | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-AndrewMultilingualNeural`2 (Male) | **Styles**<br>`empathetic`, `relieved`<br>**Roles**<br>Not supported | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-AmandaMultilingualNeural`2 (Female) |  | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-AdamMultilingualNeural`2 (Male) |  | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-EmmaMultilingualNeural`2 (Female) |  | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-PhoebeMultilingualNeural`2 (Female) | **Styles**<br>`empathetic`, `sad`, `serious`<br>**Roles**<br>Not supported | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-AlloyTurboMultilingualNeural`2 (Male) |  | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-EchoTurboMultilingualNeural`2 (Male) |  | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-FableTurboMultilingualNeural`2 (Neutral) |  | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-OnyxTurboMultilingualNeural`2 (Male) |  | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-NovaTurboMultilingualNeural`2 (Female) |  | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-ShimmerTurboMultilingualNeural`2 (Female) |  | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-BrianMultilingualNeural`2 (Male) |  | ✅ |
| `en-US` | English (United States) | Standard | `en-US-AvaNeural` (Female) | **Styles**<br>`angry`, `fearful`, `sad`<br>**Roles**<br>Not supported | ❌ |
| `en-US` | English (United States) | Standard | `en-US-AndrewNeural` (Male) |  | ❌ |
| `en-US` | English (United States) | Standard | `en-US-EmmaNeural` (Female) |  | ❌ |
| `en-US` | English (United States) | Standard | `en-US-BrianNeural` (Male) |  | ❌ |
| `en-US` | English (United States) | Standard | `en-US-JennyNeural` (Female) | **Styles**<br>`angry`, `assistant`, `chat`, `cheerful`, `customerservice`, `excited`, `friendly`, `hopeful`, `newscast`, `sad`, `shouting`, `terrified`, `unfriendly`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `en-US` | English (United States) | Standard | `en-US-GuyNeural` (Male) | **Styles**<br>`angry`, `cheerful`, `excited`, `friendly`, `hopeful`, `newscast`, `sad`, `shouting`, `terrified`, `unfriendly`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `en-US` | English (United States) | Standard | `en-US-AriaNeural` (Female) | **Styles**<br>`angry`, `chat`, `cheerful`, `customerservice`, `empathetic`, `excited`, `friendly`, `hopeful`, `narration-professional`, `newscast-casual`, `newscast-formal`, `sad`, `shouting`, `terrified`, `unfriendly`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `en-US` | English (United States) | Standard | `en-US-DavisNeural` (Male) | **Styles**<br>`angry`, `chat`, `cheerful`, `excited`, `friendly`, `hopeful`, `sad`, `shouting`, `terrified`, `unfriendly`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `en-US` | English (United States) | Standard | `en-US-JaneNeural` (Female) | **Styles**<br>`angry`, `cheerful`, `excited`, `friendly`, `hopeful`, `sad`, `shouting`, `terrified`, `unfriendly`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `en-US` | English (United States) | Standard | `en-US-JasonNeural` (Male) | **Styles**<br>`angry`, `cheerful`, `excited`, `friendly`, `hopeful`, `sad`, `shouting`, `terrified`, `unfriendly`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `en-US` | English (United States) | Standard | `en-US-KaiNeural` (Male) | **Styles**<br>`conversation`<br>**Roles**<br>Not supported | ❌ |
| `en-US` | English (United States) | Standard | `en-US-LunaNeural` (Female) | **Styles**<br>`conversation`<br>**Roles**<br>Not supported | ❌ |
| `en-US` | English (United States) | Standard | `en-US-SaraNeural` (Female) | **Styles**<br>`angry`, `cheerful`, `excited`, `friendly`, `hopeful`, `sad`, `shouting`, `terrified`, `unfriendly`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `en-US` | English (United States) | Standard | `en-US-TonyNeural` (Male) | **Styles**<br>`angry`, `cheerful`, `excited`, `friendly`, `hopeful`, `sad`, `shouting`, `terrified`, `unfriendly`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `en-US` | English (United States) | Standard | `en-US-NancyNeural` (Female) | **Styles**<br>`angry`, `cheerful`, `excited`, `friendly`, `hopeful`, `sad`, `shouting`, `terrified`, `unfriendly`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `en-US` | English (United States) | Multilingual | `en-US-CoraMultilingualNeural`2 (Female) |  | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-ChristopherMultilingualNeural`2 (Male) |  | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-BrandonMultilingualNeural`2 (Male) |  | ✅ |
| `en-US` | English (United States) | Standard | `en-US-AIGenerate1Neural` (Male) |  | ❌ |
| `en-US` | English (United States) | Standard | `en-US-AIGenerate2Neural` (Female) |  | ❌ |
| `en-US` | English (United States) | Standard | `en-US-AmberNeural` (Female) |  | ❌ |
| `en-US` | English (United States) | Standard | `en-US-AnaNeural` (Female, Child) |  | ❌ |
| `en-US` | English (United States) | Standard | `en-US-AshleyNeural` (Female) |  | ❌ |
| `en-US` | English (United States) | Standard | `en-US-BrandonNeural` (Male) |  | ❌ |
| `en-US` | English (United States) | Standard | `en-US-ChristopherNeural` (Male) |  | ❌ |
| `en-US` | English (United States) | Standard | `en-US-CoraNeural` (Female) |  | ❌ |
| `en-US` | English (United States) | Multilingual | `en-US-DavisMultilingualNeural`2 (Male) | **Styles**<br>`empathetic`, `funny`, `relieved`<br>**Roles**<br>Not supported | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-DerekMultilingualNeural`2 (Male) | **Styles**<br>`empathetic`, `excited`, `relieved`, `shy`<br>**Roles**<br>Not supported | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-DustinMultilingualNeural`2 (Male) |  | ✅ |
| `en-US` | English (United States) | Standard | `en-US-ElizabethNeural` (Female) |  | ❌ |
| `en-US` | English (United States) | Standard | `en-US-EricNeural` (Male) |  | ❌ |
| `en-US` | English (United States) | Multilingual | `en-US-EvelynMultilingualNeural`2 (Female) |  | ✅ |
| `en-US` | English (United States) | Standard | `en-US-JacobNeural` (Male) |  | ❌ |
| `en-US` | English (United States) | Multilingual | `en-US-JennyMultilingualNeural`2 (Female) |  | ✅ |
| `en-US` | English (United States) | Neural HD Flash | `en-US-Jimmie:DragonHDFlashLatestNeural`2 (Male) |  | ❌ |
| `en-US` | English (United States) | Multilingual | `en-US-LewisMultilingualNeural`2 (Male) |  | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-LolaMultilingualNeural`2 (Female) |  | ✅ |
| `en-US` | English (United States) | Standard | `en-US-MichelleNeural` (Female) |  | ❌ |
| `en-US` | English (United States) | Standard | `en-US-MonicaNeural` (Female) |  | ❌ |
| `en-US` | English (United States) | Multilingual | `en-US-NancyMultilingualNeural`2 (Female) | **Styles**<br>`excited`, `friendly`, `funny`, `relieved`, `shy`<br>**Roles**<br>Not supported | ✅ |
| `en-US` | English (United States) | Standard | `en-US-RogerNeural` (Male) |  | ❌ |
| `en-US` | English (United States) | Multilingual | `en-US-RyanMultilingualNeural`2 (Male) |  | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-SamuelMultilingualNeural`2 (Male) |  | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-SerenaMultilingualNeural`2 (Female) | **Styles**<br>`empathetic`, `excited`, `friendly`, `relieved`, `sad`, `serious`, `shy`<br>**Roles**<br>Not supported | ✅ |
| `en-US` | English (United States) | Multilingual | `en-US-SteffanMultilingualNeural`2 (Male) |  | ✅ |
| `en-US` | English (United States) | Standard | `en-US-SteffanNeural` (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD Flash | `en-US-Tiana:DragonHDFlashLatestNeural`2 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD Flash | `en-US-Tyler:DragonHDFlashLatestNeural`2 (Male) |  | ❌ |
| `en-US` | English (United States) | Multilingual | `en-US-AshTurboMultilingualNeural`1,2 (Male) |  | ❌ |
| `en-US` | English (United States) | Standard | `en-US-BlueNeural`1 (Neutral) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Andrew2:DragonHDLatestNeural`2,4 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-Multitalker:DragonHDLatestNeural`1,2 (Neutral) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Andrew-Preview:DragonHDLatestNeural`1,2 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Andrew3:DragonHDLatestNeural`1,2 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Ava-Preview:DragonHDLatestNeural`1,2 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD Omni | `en-us-ava:DragonHDOmniLatestNeural`1,2 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Ava3:DragonHDLatestNeural`1,2 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD Omni | `en-us-blushzephyr:DragonHDOmniLatestNeural`1,2 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD Omni | `en-us-emma:DragonHDOmniLatestNeural`1,2 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Ethan:MAI-Voice-2`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `en-US` | English (United States) | Neural HD Flash | `en-US-Ethan:MAI-Voice-2-Flash`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Evelyn:DragonHDLatestNeural`1,2 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD Omni | `en-us-goldenspark:DragonHDOmniLatestNeural`1,2 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Grant:MAI-Voice-2`1 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD Flash | `en-US-Grant:MAI-Voice-2-Flash`1 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Harper:MAI-Voice-2`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `embarrassed`, `excited`, `happy`, `hopeful`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `en-US` | English (United States) | Neural HD Flash | `en-US-Harper:MAI-Voice-2-Flash`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `embarrassed`, `excited`, `happy`, `hopeful`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Iris:MAI-Voice-2`1 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD Flash | `en-US-Iris:MAI-Voice-2-Flash`1 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Jasper:MAI-Voice-2`1 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD Flash | `en-US-Jasper:MAI-Voice-2-Flash`1 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD Omni | `en-us-jelly:DragonHDOmniLatestNeural`1,2 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Jimmie:DragonHDLatestNeural`1,2 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Juno:DragonHDLatestNeural`1,2 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Mila:DragonHDLatestNeural`1,2 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Olivia:MAI-Voice-2`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `en-US` | English (United States) | Neural HD Flash | `en-US-Olivia:MAI-Voice-2-Flash`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Serena-Preview:DragonHDLatestNeural`1,2 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Tessa:DragonHDLatestNeural`1,2 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Tiana:DragonHDLatestNeural`1,2 (Female) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Tyler:DragonHDLatestNeural`1,2 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `en-US-Vance:DragonHDLatestNeural`1,2 (Male) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `fr-Multitalker:DragonHDLatestNeural`1,2 (Neutral) |  | ❌ |
| `en-US` | English (United States) | Neural HD | `zh-Multitalker:DragonHDLatestNeural`1,2 (Neutral) |  | ❌ |
| `en-ZA` | English (South Africa) | Standard | `en-ZA-LeahNeural` (Female) |  | ❌ |
| `en-ZA` | English (South Africa) | Standard | `en-ZA-LukeNeural` (Male) |  | ❌ |
| `es-AR` | Spanish (Argentina) | Standard | `es-AR-ElenaNeural` (Female) |  | ❌ |
| `es-AR` | Spanish (Argentina) | Standard | `es-AR-TomasNeural` (Male) |  | ❌ |
| `es-BO` | Spanish (Bolivia) | Standard | `es-BO-SofiaNeural` (Female) |  | ❌ |
| `es-BO` | Spanish (Bolivia) | Standard | `es-BO-MarceloNeural` (Male) |  | ❌ |
| `es-CL` | Spanish (Chile) | Standard | `es-CL-CatalinaNeural` (Female) |  | ❌ |
| `es-CL` | Spanish (Chile) | Standard | `es-CL-LorenzoNeural` (Male) |  | ❌ |
| `es-CO` | Spanish (Colombia) | Standard | `es-CO-SalomeNeural` (Female) |  | ❌ |
| `es-CO` | Spanish (Colombia) | Standard | `es-CO-GonzaloNeural` (Male) |  | ❌ |
| `es-CR` | Spanish (Costa Rica) | Standard | `es-CR-MariaNeural` (Female) |  | ❌ |
| `es-CR` | Spanish (Costa Rica) | Standard | `es-CR-JuanNeural` (Male) |  | ❌ |
| `es-CU` | Spanish (Cuba) | Standard | `es-CU-BelkysNeural` (Female) |  | ❌ |
| `es-CU` | Spanish (Cuba) | Standard | `es-CU-ManuelNeural` (Male) |  | ❌ |
| `es-DO` | Spanish (Dominican Republic) | Standard | `es-DO-RamonaNeural` (Female) |  | ❌ |
| `es-DO` | Spanish (Dominican Republic) | Standard | `es-DO-EmilioNeural` (Male) |  | ❌ |
| `es-EC` | Spanish (Ecuador) | Standard | `es-EC-AndreaNeural` (Female) |  | ❌ |
| `es-EC` | Spanish (Ecuador) | Standard | `es-EC-LuisNeural` (Male) |  | ❌ |
| `es-ES` | Spanish (Spain) | Neural HD | `es-ES-Ximena:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `es-ES` | Spanish (Spain) | Neural HD | `es-ES-Tristan:DragonHDLatestNeural`2,4 (Male) |  | ❌ |
| `es-ES` | Spanish (Spain) | Standard | `es-ES-ElviraNeural` (Female) |  | ❌ |
| `es-ES` | Spanish (Spain) | Standard | `es-ES-AlvaroNeural` (Male) | **Styles**<br>`cheerful`, `sad`<br>**Roles**<br>Not supported | ❌ |
| `es-ES` | Spanish (Spain) | Multilingual | `es-ES-ArabellaMultilingualNeural`2 (Female) |  | ❌ |
| `es-ES` | Spanish (Spain) | Multilingual | `es-ES-IsidoraMultilingualNeural`2 (Female) |  | ❌ |
| `es-ES` | Spanish (Spain) | Multilingual | `es-ES-TristanMultilingualNeural`2 (Male) |  | ❌ |
| `es-ES` | Spanish (Spain) | Multilingual | `es-ES-XimenaMultilingualNeural`2 (Female) |  | ❌ |
| `es-ES` | Spanish (Spain) | Standard | `es-ES-AbrilNeural` (Female) |  | ❌ |
| `es-ES` | Spanish (Spain) | Standard | `es-ES-ArnauNeural` (Male) |  | ❌ |
| `es-ES` | Spanish (Spain) | Standard | `es-ES-DarioNeural` (Male) |  | ❌ |
| `es-ES` | Spanish (Spain) | Standard | `es-ES-EliasNeural` (Male) |  | ❌ |
| `es-ES` | Spanish (Spain) | Standard | `es-ES-EstrellaNeural` (Female) |  | ❌ |
| `es-ES` | Spanish (Spain) | Standard | `es-ES-IreneNeural` (Female) |  | ❌ |
| `es-ES` | Spanish (Spain) | Standard | `es-ES-LaiaNeural` (Female) |  | ❌ |
| `es-ES` | Spanish (Spain) | Standard | `es-ES-LiaNeural` (Female) |  | ❌ |
| `es-ES` | Spanish (Spain) | Standard | `es-ES-NilNeural` (Male) |  | ❌ |
| `es-ES` | Spanish (Spain) | Standard | `es-ES-SaulNeural` (Male) |  | ❌ |
| `es-ES` | Spanish (Spain) | Standard | `es-ES-TeoNeural` (Male) |  | ❌ |
| `es-ES` | Spanish (Spain) | Standard | `es-ES-TrianaNeural` (Female) |  | ❌ |
| `es-ES` | Spanish (Spain) | Standard | `es-ES-VeraNeural` (Female) |  | ❌ |
| `es-ES` | Spanish (Spain) | Standard | `es-ES-XimenaNeural` (Female) |  | ❌ |
| `es-ES` | Spanish (Spain) | Neural HD | `es-ES-Marta:MAI-Voice-2`1 (Female) | **Styles**<br>`adventurous`, `caringempathy`, `curious`, `encouraging`, `excited`, `friendlycheerful`, `nostalgic`, `reflective`, `saddisappointed`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `es-ES` | Spanish (Spain) | Neural HD Flash | `es-ES-Marta:MAI-Voice-2-Flash`1 (Female) | **Styles**<br>`adventurous`, `caringempathy`, `curious`, `encouraging`, `excited`, `friendlycheerful`, `nostalgic`, `reflective`, `saddisappointed`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `es-GQ` | Spanish (Equatorial Guinea) | Standard | `es-GQ-TeresaNeural` (Female) |  | ❌ |
| `es-GQ` | Spanish (Equatorial Guinea) | Standard | `es-GQ-JavierNeural` (Male) |  | ❌ |
| `es-GT` | Spanish (Guatemala) | Standard | `es-GT-MartaNeural` (Female) |  | ❌ |
| `es-GT` | Spanish (Guatemala) | Standard | `es-GT-AndresNeural` (Male) |  | ❌ |
| `es-HN` | Spanish (Honduras) | Standard | `es-HN-KarlaNeural` (Female) |  | ❌ |
| `es-HN` | Spanish (Honduras) | Standard | `es-HN-CarlosNeural` (Male) |  | ❌ |
| `es-MX` | Spanish (Mexico) | Neural HD | `es-MX-Ximena:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `es-MX` | Spanish (Mexico) | Neural HD | `es-MX-Tristan:DragonHDLatestNeural`2,4 (Male) |  | ❌ |
| `es-MX` | Spanish (Mexico) | Standard | `es-MX-DaliaNeural` (Female) | **Styles**<br>`cheerful`, `sad`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `es-MX` | Spanish (Mexico) | Standard | `es-MX-JorgeNeural` (Male) | **Styles**<br>`chat`, `cheerful`, `excited`, `sad`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `es-MX` | Spanish (Mexico) | Multilingual | `es-MX-DaliaMultilingualNeural`2 (Female) |  | ❌ |
| `es-MX` | Spanish (Mexico) | Multilingual | `es-MX-JorgeMultilingualNeural`2 (Male) |  | ❌ |
| `es-MX` | Spanish (Mexico) | Standard | `es-MX-BeatrizNeural` (Female) |  | ❌ |
| `es-MX` | Spanish (Mexico) | Standard | `es-MX-CandelaNeural` (Female) |  | ❌ |
| `es-MX` | Spanish (Mexico) | Standard | `es-MX-CarlotaNeural` (Female) |  | ❌ |
| `es-MX` | Spanish (Mexico) | Standard | `es-MX-CecilioNeural` (Male) |  | ❌ |
| `es-MX` | Spanish (Mexico) | Standard | `es-MX-GerardoNeural` (Male) |  | ❌ |
| `es-MX` | Spanish (Mexico) | Standard | `es-MX-LarissaNeural` (Female) |  | ❌ |
| `es-MX` | Spanish (Mexico) | Standard | `es-MX-LibertoNeural` (Male) |  | ❌ |
| `es-MX` | Spanish (Mexico) | Standard | `es-MX-LucianoNeural` (Male) |  | ❌ |
| `es-MX` | Spanish (Mexico) | Standard | `es-MX-MarinaNeural` (Female, Child) |  | ❌ |
| `es-MX` | Spanish (Mexico) | Standard | `es-MX-NuriaNeural` (Female) |  | ❌ |
| `es-MX` | Spanish (Mexico) | Standard | `es-MX-PelayoNeural` (Male) |  | ❌ |
| `es-MX` | Spanish (Mexico) | Standard | `es-MX-RenataNeural` (Female) |  | ❌ |
| `es-MX` | Spanish (Mexico) | Standard | `es-MX-YagoNeural` (Male) |  | ❌ |
| `es-MX` | Spanish (Mexico) | Neural HD | `es-MX-Alejo:MAI-Voice-2`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `es-MX` | Spanish (Mexico) | Neural HD Flash | `es-MX-Alejo:MAI-Voice-2-Flash`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `es-MX` | Spanish (Mexico) | Neural HD | `es-MX-Valeria:MAI-Voice-2`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `es-MX` | Spanish (Mexico) | Neural HD Flash | `es-MX-Valeria:MAI-Voice-2-Flash`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `es-NI` | Spanish (Nicaragua) | Standard | `es-NI-YolandaNeural` (Female) |  | ❌ |
| `es-NI` | Spanish (Nicaragua) | Standard | `es-NI-FedericoNeural` (Male) |  | ❌ |
| `es-PA` | Spanish (Panama) | Standard | `es-PA-MargaritaNeural` (Female) |  | ❌ |
| `es-PA` | Spanish (Panama) | Standard | `es-PA-RobertoNeural` (Male) |  | ❌ |
| `es-PE` | Spanish (Peru) | Standard | `es-PE-CamilaNeural` (Female) |  | ❌ |
| `es-PE` | Spanish (Peru) | Standard | `es-PE-AlexNeural` (Male) |  | ❌ |
| `es-PR` | Spanish (Puerto Rico) | Standard | `es-PR-KarinaNeural` (Female) |  | ❌ |
| `es-PR` | Spanish (Puerto Rico) | Standard | `es-PR-VictorNeural` (Male) |  | ❌ |
| `es-PY` | Spanish (Paraguay) | Standard | `es-PY-TaniaNeural` (Female) |  | ❌ |
| `es-PY` | Spanish (Paraguay) | Standard | `es-PY-MarioNeural` (Male) |  | ❌ |
| `es-SV` | Spanish (El Salvador) | Standard | `es-SV-LorenaNeural` (Female) |  | ❌ |
| `es-SV` | Spanish (El Salvador) | Standard | `es-SV-RodrigoNeural` (Male) |  | ❌ |
| `es-US` | Spanish (United States) | Standard | `es-US-PalomaNeural` (Female) |  | ❌ |
| `es-US` | Spanish (United States) | Standard | `es-US-AlonsoNeural` (Male) |  | ❌ |
| `es-UY` | Spanish (Uruguay) | Standard | `es-UY-ValentinaNeural` (Female) |  | ❌ |
| `es-UY` | Spanish (Uruguay) | Standard | `es-UY-MateoNeural` (Male) |  | ❌ |
| `es-VE` | Spanish (Venezuela) | Standard | `es-VE-PaolaNeural` (Female) |  | ❌ |
| `es-VE` | Spanish (Venezuela) | Standard | `es-VE-SebastianNeural` (Male) |  | ❌ |
| `et-EE` | Estonian (Estonia) | Standard | `et-EE-AnuNeural`3 (Female) |  | ❌ |
| `et-EE` | Estonian (Estonia) | Standard | `et-EE-KertNeural`3 (Male) |  | ❌ |
| `eu-ES` | Basque | Standard | `eu-ES-AinhoaNeural`3 (Female) |  | ❌ |
| `eu-ES` | Basque | Standard | `eu-ES-AnderNeural`3 (Male) |  | ❌ |
| `fa-IR` | Persian (Iran) | Standard | `fa-IR-DilaraNeural`3 (Female) |  | ❌ |
| `fa-IR` | Persian (Iran) | Standard | `fa-IR-FaridNeural`3 (Male) |  | ❌ |
| `fi-FI` | Finnish (Finland) | Standard | `fi-FI-SelmaNeural` (Female) |  | ❌ |
| `fi-FI` | Finnish (Finland) | Standard | `fi-FI-HarriNeural` (Male) |  | ❌ |
| `fi-FI` | Finnish (Finland) | Standard | `fi-FI-NooraNeural` (Female) |  | ❌ |
| `fil-PH` | Filipino (Philippines) | Standard | `fil-PH-BlessicaNeural`3 (Female) |  | ❌ |
| `fil-PH` | Filipino (Philippines) | Standard | `fil-PH-AngeloNeural`3 (Male) |  | ❌ |
| `fil-PH` | Filipino (Philippines) | Neural HD | `fil-PH-Angelo:DragonHDLatestNeural`1,2,3 (Male) |  | ❌ |
| `fil-PH` | Filipino (Philippines) | Neural HD | `fil-PH-Blessica:DragonHDLatestNeural`1,2,3 (Female) |  | ❌ |
| `fr-BE` | French (Belgium) | Standard | `fr-BE-CharlineNeural` (Female) |  | ❌ |
| `fr-BE` | French (Belgium) | Standard | `fr-BE-GerardNeural` (Male) |  | ❌ |
| `fr-CA` | French (Canada) | Neural HD | `fr-CA-Sylvie:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `fr-CA` | French (Canada) | Neural HD | `fr-CA-Thierry:DragonHDLatestNeural`2,4 (Male) |  | ❌ |
| `fr-CA` | French (Canada) | Standard | `fr-CA-SylvieNeural` (Female) |  | ❌ |
| `fr-CA` | French (Canada) | Standard | `fr-CA-JeanNeural` (Male) |  | ❌ |
| `fr-CA` | French (Canada) | Standard | `fr-CA-AntoineNeural` (Male) |  | ❌ |
| `fr-CA` | French (Canada) | Standard | `fr-CA-ThierryNeural` (Male) |  | ❌ |
| `fr-CH` | French (Switzerland) | Standard | `fr-CH-ArianeNeural` (Female) |  | ❌ |
| `fr-CH` | French (Switzerland) | Standard | `fr-CH-FabriceNeural` (Male) |  | ❌ |
| `fr-FR` | French (France) | Neural HD | `fr-FR-Vivienne:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `fr-FR` | French (France) | Neural HD | `fr-FR-Remy:DragonHDLatestNeural`2,4 (Male) |  | ❌ |
| `fr-FR` | French (France) | Standard | `fr-FR-DeniseNeural` (Female) | **Styles**<br>`cheerful`, `excited`, `sad`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `fr-FR` | French (France) | Standard | `fr-FR-HenriNeural` (Male) | **Styles**<br>`cheerful`, `excited`, `sad`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `fr-FR` | French (France) | Multilingual | `fr-FR-VivienneMultilingualNeural`2 (Female) |  | ❌ |
| `fr-FR` | French (France) | Multilingual | `fr-FR-RemyMultilingualNeural`2 (Male) |  | ❌ |
| `fr-FR` | French (France) | Multilingual | `fr-FR-LucienMultilingualNeural`2 (Male) |  | ❌ |
| `fr-FR` | French (France) | Standard | `fr-FR-AlainNeural` (Male) |  | ❌ |
| `fr-FR` | French (France) | Standard | `fr-FR-BrigitteNeural` (Female) |  | ❌ |
| `fr-FR` | French (France) | Standard | `fr-FR-CelesteNeural` (Female) |  | ❌ |
| `fr-FR` | French (France) | Standard | `fr-FR-ClaudeNeural` (Male) |  | ❌ |
| `fr-FR` | French (France) | Standard | `fr-FR-CoralieNeural` (Female) |  | ❌ |
| `fr-FR` | French (France) | Standard | `fr-FR-EloiseNeural` (Female, Child) |  | ❌ |
| `fr-FR` | French (France) | Standard | `fr-FR-JacquelineNeural` (Female) |  | ❌ |
| `fr-FR` | French (France) | Standard | `fr-FR-JeromeNeural` (Male) |  | ❌ |
| `fr-FR` | French (France) | Standard | `fr-FR-JosephineNeural` (Female) |  | ❌ |
| `fr-FR` | French (France) | Standard | `fr-FR-MauriceNeural` (Male) |  | ❌ |
| `fr-FR` | French (France) | Standard | `fr-FR-YvesNeural` (Male) |  | ❌ |
| `fr-FR` | French (France) | Standard | `fr-FR-YvetteNeural` (Female) |  | ❌ |
| `fr-FR` | French (France) | Neural HD | `fr-FR-Marc:MAI-Voice-2`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `fr-FR` | French (France) | Neural HD Flash | `fr-FR-Marc:MAI-Voice-2-Flash`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `fr-FR` | French (France) | Neural HD | `fr-FR-Soleil:MAI-Voice-2`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `fr-FR` | French (France) | Neural HD Flash | `fr-FR-Soleil:MAI-Voice-2-Flash`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `ga-IE` | Irish (Ireland) | Standard | `ga-IE-OrlaNeural`3 (Female) |  | ❌ |
| `ga-IE` | Irish (Ireland) | Standard | `ga-IE-ColmNeural`3 (Male) |  | ❌ |
| `gl-ES` | Galician | Standard | `gl-ES-SabelaNeural`3 (Female) |  | ❌ |
| `gl-ES` | Galician | Standard | `gl-ES-RoiNeural`3 (Male) |  | ❌ |
| `gu-IN` | Gujarati (India) | Standard | `gu-IN-DhwaniNeural` (Female) |  | ❌ |
| `gu-IN` | Gujarati (India) | Standard | `gu-IN-NiranjanNeural` (Male) |  | ❌ |
| `he-IL` | Hebrew (Israel) | Standard | `he-IL-HilaNeural` (Female) |  | ❌ |
| `he-IL` | Hebrew (Israel) | Standard | `he-IL-AvriNeural` (Male) |  | ❌ |
| `hi-IN` | Hindi (India) | Standard | `hi-IN-AaravNeural` (Male) |  | ❌ |
| `hi-IN` | Hindi (India) | Standard | `hi-IN-AnanyaNeural` (Female) |  | ❌ |
| `hi-IN` | Hindi (India) | Standard | `hi-IN-AartiNeural` (Female) |  | ❌ |
| `hi-IN` | Hindi (India) | Standard | `hi-IN-ArjunNeural` (Male) |  | ❌ |
| `hi-IN` | Hindi (India) | Standard | `hi-IN-KavyaNeural` (Female) |  | ❌ |
| `hi-IN` | Hindi (India) | Standard | `hi-IN-KunalNeural` (Male) |  | ❌ |
| `hi-IN` | Hindi (India) | Standard | `hi-IN-RehaanNeural` (Male) |  | ❌ |
| `hi-IN` | Hindi (India) | Standard | `hi-IN-SwaraNeural` (Female) | **Styles**<br>`cheerful`, `empathetic`, `newscast`<br>**Roles**<br>Not supported | ❌ |
| `hi-IN` | Hindi (India) | Standard | `hi-IN-MadhurNeural` (Male) |  | ❌ |
| `hi-IN` | Hindi (India) | Neural HD | `hi-IN-Arjun:MAI-Voice-2`1 (Male) | **Styles**<br>`angry`, `confused`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `sad`, `surprised`<br>**Roles**<br>Not supported | ❌ |
| `hi-IN` | Hindi (India) | Neural HD Flash | `hi-IN-Arjun:MAI-Voice-2-Flash`1 (Male) | **Styles**<br>`angry`, `confused`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `sad`, `surprised`<br>**Roles**<br>Not supported | ❌ |
| `hi-IN` | Hindi (India) | Neural HD | `hi-IN-Dhruv:MAI-Voice-2`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `hi-IN` | Hindi (India) | Neural HD Flash | `hi-IN-Dhruv:MAI-Voice-2-Flash`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `hi-IN` | Hindi (India) | Neural HD | `hi-IN-Kavya:MAI-Voice-2`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `hi-IN` | Hindi (India) | Neural HD Flash | `hi-IN-Kavya:MAI-Voice-2-Flash`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `hi-IN` | Hindi (India) | Neural HD | `hi-IN-Priya:MAI-Voice-2`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `hi-IN` | Hindi (India) | Neural HD Flash | `hi-IN-Priya:MAI-Voice-2-Flash`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `hr-HR` | Croatian (Croatia) | Standard | `hr-HR-GabrijelaNeural` (Female) |  | ❌ |
| `hr-HR` | Croatian (Croatia) | Standard | `hr-HR-SreckoNeural` (Male) |  | ❌ |
| `hu-HU` | Hungarian (Hungary) | Standard | `hu-HU-NoemiNeural` (Female) |  | ❌ |
| `hu-HU` | Hungarian (Hungary) | Standard | `hu-HU-TamasNeural` (Male) |  | ❌ |
| `hu-HU` | Hungarian (Hungary) | Neural HD | `hu-HU-Bence:MAI-Voice-2`1 (Male) |  | ❌ |
| `hu-HU` | Hungarian (Hungary) | Neural HD Flash | `hu-HU-Bence:MAI-Voice-2-Flash`1 (Male) |  | ❌ |
| `hu-HU` | Hungarian (Hungary) | Neural HD | `hu-HU-Levente:MAI-Voice-2`1 (Male) |  | ❌ |
| `hu-HU` | Hungarian (Hungary) | Neural HD Flash | `hu-HU-Levente:MAI-Voice-2-Flash`1 (Male) |  | ❌ |
| `hu-HU` | Hungarian (Hungary) | Neural HD | `hu-HU-Lilla:MAI-Voice-2`1 (Female) |  | ❌ |
| `hu-HU` | Hungarian (Hungary) | Neural HD Flash | `hu-HU-Lilla:MAI-Voice-2-Flash`1 (Female) |  | ❌ |
| `hu-HU` | Hungarian (Hungary) | Neural HD | `hu-HU-Réka:MAI-Voice-2`1 (Female) |  | ❌ |
| `hu-HU` | Hungarian (Hungary) | Neural HD Flash | `hu-HU-Réka:MAI-Voice-2-Flash`1 (Female) |  | ❌ |
| `hy-AM` | Armenian (Armenia) | Standard | `hy-AM-AnahitNeural`3 (Female) |  | ❌ |
| `hy-AM` | Armenian (Armenia) | Standard | `hy-AM-HaykNeural`3 (Male) |  | ❌ |
| `id-ID` | Indonesian (Indonesia) | Standard | `id-ID-GadisNeural` (Female) |  | ❌ |
| `id-ID` | Indonesian (Indonesia) | Standard | `id-ID-ArdiNeural` (Male) |  | ❌ |
| `id-ID` | Indonesian (Indonesia) | Neural HD | `id-ID-Ardi:DragonHDLatestNeural`1,2 (Male) |  | ❌ |
| `id-ID` | Indonesian (Indonesia) | Neural HD Flash | `id-ID-Cahya:MAI-Voice-2-Flash`1 (Male) |  | ❌ |
| `id-ID` | Indonesian (Indonesia) | Neural HD | `id-ID-Gadis:DragonHDLatestNeural`1,2 (Female) |  | ❌ |
| `id-ID` | Indonesian (Indonesia) | Neural HD Flash | `id-ID-Sari:MAI-Voice-2-Flash`1 (Female) |  | ❌ |
| `is-IS` | Icelandic (Iceland) | Standard | `is-IS-GudrunNeural`3 (Female) |  | ❌ |
| `is-IS` | Icelandic (Iceland) | Standard | `is-IS-GunnarNeural`3 (Male) |  | ❌ |
| `it-IT` | Italian (Italy) | Neural HD | `it-IT-Isabella:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `it-IT` | Italian (Italy) | Neural HD | `it-IT-Alessio:DragonHDLatestNeural`2,4 (Male) |  | ❌ |
| `it-IT` | Italian (Italy) | Standard | `it-IT-ElsaNeural` (Female) |  | ❌ |
| `it-IT` | Italian (Italy) | Standard | `it-IT-IsabellaNeural` (Female) | **Styles**<br>`chat`, `cheerful`, `excited`, `sad`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `it-IT` | Italian (Italy) | Standard | `it-IT-DiegoNeural` (Male) | **Styles**<br>`cheerful`, `excited`, `sad`<br>**Roles**<br>Not supported | ❌ |
| `it-IT` | Italian (Italy) | Multilingual | `it-IT-AlessioMultilingualNeural`2 (Male) |  | ❌ |
| `it-IT` | Italian (Italy) | Multilingual | `it-IT-IsabellaMultilingualNeural`2 (Female) |  | ❌ |
| `it-IT` | Italian (Italy) | Multilingual | `it-IT-GiuseppeMultilingualNeural`2 (Male) |  | ❌ |
| `it-IT` | Italian (Italy) | Multilingual | `it-IT-MarcelloMultilingualNeural`2 (Male) |  | ❌ |
| `it-IT` | Italian (Italy) | Standard | `it-IT-BenignoNeural` (Male) |  | ❌ |
| `it-IT` | Italian (Italy) | Standard | `it-IT-CalimeroNeural` (Male) |  | ❌ |
| `it-IT` | Italian (Italy) | Standard | `it-IT-CataldoNeural` (Male) |  | ❌ |
| `it-IT` | Italian (Italy) | Standard | `it-IT-FabiolaNeural` (Female) |  | ❌ |
| `it-IT` | Italian (Italy) | Standard | `it-IT-FiammaNeural` (Female) |  | ❌ |
| `it-IT` | Italian (Italy) | Standard | `it-IT-GianniNeural` (Male) |  | ❌ |
| `it-IT` | Italian (Italy) | Standard | `it-IT-GiuseppeNeural` (Male) |  | ❌ |
| `it-IT` | Italian (Italy) | Standard | `it-IT-ImeldaNeural` (Female) |  | ❌ |
| `it-IT` | Italian (Italy) | Standard | `it-IT-IrmaNeural` (Female) |  | ❌ |
| `it-IT` | Italian (Italy) | Standard | `it-IT-LisandroNeural` (Male) |  | ❌ |
| `it-IT` | Italian (Italy) | Standard | `it-IT-PalmiraNeural` (Female) |  | ❌ |
| `it-IT` | Italian (Italy) | Standard | `it-IT-PierinaNeural` (Female, Child) |  | ❌ |
| `it-IT` | Italian (Italy) | Standard | `it-IT-RinaldoNeural` (Male) |  | ❌ |
| `it-IT` | Italian (Italy) | Neural HD | `it-IT-Luca:MAI-Voice-2`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `it-IT` | Italian (Italy) | Neural HD Flash | `it-IT-Luca:MAI-Voice-2-Flash`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `it-IT` | Italian (Italy) | Neural HD | `it-IT-Rosa:MAI-Voice-2`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `it-IT` | Italian (Italy) | Neural HD Flash | `it-IT-Rosa:MAI-Voice-2-Flash`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `iu-CANS-CA` | Inuktitut (Syllabics, Canada) | Standard | `iu-Cans-CA-SiqiniqNeural`3 (Female) |  | ❌ |
| `iu-CANS-CA` | Inuktitut (Syllabics, Canada) | Standard | `iu-Cans-CA-TaqqiqNeural`3 (Male) |  | ❌ |
| `iu-LATN-CA` | Inuktitut (Latin, Canada) | Standard | `iu-Latn-CA-SiqiniqNeural`3 (Female) |  | ❌ |
| `iu-LATN-CA` | Inuktitut (Latin, Canada) | Standard | `iu-Latn-CA-TaqqiqNeural`3 (Male) |  | ❌ |
| `ja-JP` | Japanese (Japan) | Neural HD | `ja-JP-Nanami:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `ja-JP` | Japanese (Japan) | Neural HD | `ja-JP-Masaru:DragonHDLatestNeural`2,4 (Male) |  | ❌ |
| `ja-JP` | Japanese (Japan) | Standard | `ja-JP-NanamiNeural` (Female) | **Styles**<br>`chat`, `cheerful`, `customerservice`<br>**Roles**<br>Not supported | ❌ |
| `ja-JP` | Japanese (Japan) | Standard | `ja-JP-KeitaNeural` (Male) |  | ❌ |
| `ja-JP` | Japanese (Japan) | Standard | `ja-JP-AoiNeural` (Female) |  | ❌ |
| `ja-JP` | Japanese (Japan) | Standard | `ja-JP-DaichiNeural` (Male) |  | ❌ |
| `ja-JP` | Japanese (Japan) | Standard | `ja-JP-MayuNeural` (Female) |  | ❌ |
| `ja-JP` | Japanese (Japan) | Standard | `ja-JP-NaokiNeural` (Male) |  | ❌ |
| `ja-JP` | Japanese (Japan) | Standard | `ja-JP-ShioriNeural` (Female) |  | ❌ |
| `ja-JP` | Japanese (Japan) | Multilingual | `ja-JP-MasaruMultilingualNeural`1,2 (Male) |  | ❌ |
| `ja-JP` | Japanese (Japan) | Neural HD Flash | `ja-JP-Haruto:MAI-Voice-2-Flash`1 (Male) |  | ❌ |
| `ja-JP` | Japanese (Japan) | Neural HD Flash | `ja-JP-Sakura:MAI-Voice-2-Flash`1 (Female) |  | ❌ |
| `jv-ID` | Javanese (Latin, Indonesia) | Standard | `jv-ID-SitiNeural`3 (Female) |  | ❌ |
| `jv-ID` | Javanese (Latin, Indonesia) | Standard | `jv-ID-DimasNeural`3 (Male) |  | ❌ |
| `ka-GE` | Georgian (Georgia) | Standard | `ka-GE-EkaNeural`3 (Female) |  | ❌ |
| `ka-GE` | Georgian (Georgia) | Standard | `ka-GE-GiorgiNeural`3 (Male) |  | ❌ |
| `kk-KZ` | Kazakh (Kazakhstan) | Standard | `kk-KZ-AigulNeural`3 (Female) |  | ❌ |
| `kk-KZ` | Kazakh (Kazakhstan) | Standard | `kk-KZ-DauletNeural`3 (Male) |  | ❌ |
| `km-KH` | Khmer (Cambodia) | Standard | `km-KH-SreymomNeural`3 (Female) |  | ❌ |
| `km-KH` | Khmer (Cambodia) | Standard | `km-KH-PisethNeural`3 (Male) |  | ❌ |
| `kn-IN` | Kannada (India) | Standard | `kn-IN-SapnaNeural`3 (Female) |  | ❌ |
| `kn-IN` | Kannada (India) | Standard | `kn-IN-GaganNeural`3 (Male) |  | ❌ |
| `ko-KR` | Korean (Korea) | Neural HD | `ko-KR-SunHi:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `ko-KR` | Korean (Korea) | Neural HD | `ko-KR-Hyunsu:DragonHDLatestNeural`2,4 (Male) |  | ❌ |
| `ko-KR` | Korean (Korea) | Standard | `ko-KR-SunHiNeural` (Female) |  | ❌ |
| `ko-KR` | Korean (Korea) | Standard | `ko-KR-InJoonNeural` (Male) | **Styles**<br>`sad`<br>**Roles**<br>Not supported | ❌ |
| `ko-KR` | Korean (Korea) | Multilingual | `ko-KR-HyunsuMultilingualNeural`2 (Male) |  | ❌ |
| `ko-KR` | Korean (Korea) | Standard | `ko-KR-BongJinNeural` (Male) |  | ❌ |
| `ko-KR` | Korean (Korea) | Standard | `ko-KR-GookMinNeural` (Male) |  | ❌ |
| `ko-KR` | Korean (Korea) | Standard | `ko-KR-HyunsuNeural` (Male) |  | ❌ |
| `ko-KR` | Korean (Korea) | Standard | `ko-KR-JiMinNeural` (Female) |  | ❌ |
| `ko-KR` | Korean (Korea) | Standard | `ko-KR-SeoHyeonNeural` (Female) |  | ❌ |
| `ko-KR` | Korean (Korea) | Standard | `ko-KR-SoonBokNeural` (Female) |  | ❌ |
| `ko-KR` | Korean (Korea) | Standard | `ko-KR-YuJinNeural` (Female) |  | ❌ |
| `ko-KR` | Korean (Korea) | Neural HD | `ko-KR-Haena:MAI-Voice-2`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `embarrassed`, `excited`, `happy`, `hopeful`, `joyful`, `regretful`, `relieved`, `sad`, `softvoice`, `surprised`<br>**Roles**<br>Not supported | ❌ |
| `ko-KR` | Korean (Korea) | Neural HD Flash | `ko-KR-Haena:MAI-Voice-2-Flash`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `embarrassed`, `excited`, `happy`, `hopeful`, `joyful`, `regretful`, `relieved`, `sad`, `softvoice`, `surprised`<br>**Roles**<br>Not supported | ❌ |
| `ko-KR` | Korean (Korea) | Neural HD | `ko-KR-Junho:MAI-Voice-2`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `embarrassed`, `excited`, `happy`, `hopeful`, `joyful`, `relieved`, `sad`, `softvoice`<br>**Roles**<br>Not supported | ❌ |
| `ko-KR` | Korean (Korea) | Neural HD Flash | `ko-KR-Junho:MAI-Voice-2-Flash`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `embarrassed`, `excited`, `happy`, `hopeful`, `joyful`, `relieved`, `sad`, `softvoice`<br>**Roles**<br>Not supported | ❌ |
| `lo-LA` | Lao (Laos) | Standard | `lo-LA-KeomanyNeural`3 (Female) |  | ❌ |
| `lo-LA` | Lao (Laos) | Standard | `lo-LA-ChanthavongNeural`3 (Male) |  | ❌ |
| `lt-LT` | Lithuanian (Lithuania) | Standard | `lt-LT-OnaNeural`3 (Female) |  | ❌ |
| `lt-LT` | Lithuanian (Lithuania) | Standard | `lt-LT-LeonasNeural`3 (Male) |  | ❌ |
| `lv-LV` | Latvian (Latvia) | Standard | `lv-LV-EveritaNeural`3 (Female) |  | ❌ |
| `lv-LV` | Latvian (Latvia) | Standard | `lv-LV-NilsNeural`3 (Male) |  | ❌ |
| `mk-MK` | Macedonian (North Macedonia) | Standard | `mk-MK-MarijaNeural`3 (Female) |  | ❌ |
| `mk-MK` | Macedonian (North Macedonia) | Standard | `mk-MK-AleksandarNeural`3 (Male) |  | ❌ |
| `ml-IN` | Malayalam (India) | Standard | `ml-IN-SobhanaNeural`3 (Female) |  | ❌ |
| `ml-IN` | Malayalam (India) | Standard | `ml-IN-MidhunNeural`3 (Male) |  | ❌ |
| `mn-MN` | Mongolian (Mongolia) | Standard | `mn-MN-YesuiNeural`3 (Female) |  | ❌ |
| `mn-MN` | Mongolian (Mongolia) | Standard | `mn-MN-BataaNeural`3 (Male) |  | ❌ |
| `mr-IN` | Marathi (India) | Standard | `mr-IN-AarohiNeural` (Female) |  | ❌ |
| `mr-IN` | Marathi (India) | Standard | `mr-IN-ManoharNeural` (Male) |  | ❌ |
| `ms-MY` | Malay (Malaysia) | Standard | `ms-MY-YasminNeural` (Female) |  | ❌ |
| `ms-MY` | Malay (Malaysia) | Standard | `ms-MY-OsmanNeural` (Male) |  | ❌ |
| `ms-MY` | Malay (Malaysia) | Neural HD | `ms-MY-Osman:DragonHDLatestNeural`1,2 (Male) |  | ❌ |
| `ms-MY` | Malay (Malaysia) | Neural HD | `ms-MY-Yasmin:DragonHDLatestNeural`1,2 (Female) |  | ❌ |
| `mt-MT` | Maltese (Malta) | Standard | `mt-MT-GraceNeural`3 (Female) |  | ❌ |
| `mt-MT` | Maltese (Malta) | Standard | `mt-MT-JosephNeural`3 (Male) |  | ❌ |
| `my-MM` | Burmese (Myanmar) | Standard | `my-MM-NilarNeural`3 (Female) |  | ❌ |
| `my-MM` | Burmese (Myanmar) | Standard | `my-MM-ThihaNeural`3 (Male) |  | ❌ |
| `nb-NO` | Norwegian Bokmål (Norway) | Standard | `nb-NO-PernilleNeural` (Female) |  | ❌ |
| `nb-NO` | Norwegian Bokmål (Norway) | Standard | `nb-NO-FinnNeural` (Male) |  | ❌ |
| `nb-NO` | Norwegian Bokmål (Norway) | Standard | `nb-NO-IselinNeural` (Female) |  | ❌ |
| `ne-NP` | Nepali (Nepal) | Standard | `ne-NP-HemkalaNeural`3 (Female) |  | ❌ |
| `ne-NP` | Nepali (Nepal) | Standard | `ne-NP-SagarNeural`3 (Male) |  | ❌ |
| `nl-BE` | Dutch (Belgium) | Standard | `nl-BE-DenaNeural` (Female) |  | ❌ |
| `nl-BE` | Dutch (Belgium) | Standard | `nl-BE-ArnaudNeural` (Male) |  | ❌ |
| `nl-NL` | Dutch (Netherlands) | Standard | `nl-NL-FennaNeural` (Female) |  | ❌ |
| `nl-NL` | Dutch (Netherlands) | Standard | `nl-NL-MaartenNeural` (Male) |  | ❌ |
| `nl-NL` | Dutch (Netherlands) | Standard | `nl-NL-ColetteNeural` (Female) |  | ❌ |
| `nl-NL` | Dutch (Netherlands) | Neural HD | `nl-NL-Fleur:MAI-Voice-2`1 (Female) |  | ❌ |
| `nl-NL` | Dutch (Netherlands) | Neural HD Flash | `nl-NL-Fleur:MAI-Voice-2-Flash`1 (Female) |  | ❌ |
| `nl-NL` | Dutch (Netherlands) | Neural HD | `nl-NL-Sander:MAI-Voice-2`1 (Male) | **Styles**<br>`adventurous`, `caringempathy`, `curious`, `encouraging`, `excited`, `friendlycheerful`, `nostalgic`, `reflective`, `saddisappointed`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `nl-NL` | Dutch (Netherlands) | Neural HD Flash | `nl-NL-Sander:MAI-Voice-2-Flash`1 (Male) | **Styles**<br>`adventurous`, `caringempathy`, `curious`, `encouraging`, `excited`, `friendlycheerful`, `nostalgic`, `reflective`, `saddisappointed`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `or-IN` | Odia (India) | Standard | `or-IN-SubhasiniNeural`3 (Female) |  | ❌ |
| `or-IN` | Odia (India) | Standard | `or-IN-SukantNeural`3 (Male) |  | ❌ |
| `pa-IN` | Punjabi (India) | Standard | `pa-IN-OjasNeural`3 (Male) |  | ❌ |
| `pa-IN` | Punjabi (India) | Standard | `pa-IN-VaaniNeural`3 (Female) |  | ❌ |
| `pl-PL` | Polish (Poland) | Standard | `pl-PL-AgnieszkaNeural` (Female) |  | ❌ |
| `pl-PL` | Polish (Poland) | Standard | `pl-PL-MarekNeural` (Male) |  | ❌ |
| `pl-PL` | Polish (Poland) | Standard | `pl-PL-ZofiaNeural` (Female) |  | ❌ |
| `ps-AF` | Pashto (Afghanistan) | Standard | `ps-AF-LatifaNeural`3 (Female) |  | ❌ |
| `ps-AF` | Pashto (Afghanistan) | Standard | `ps-AF-GulNawazNeural`3 (Male) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Neural HD | `pt-BR-Thalita:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Neural HD | `pt-BR-Macerio:DragonHDLatestNeural`2,4 (Male) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Standard | `pt-BR-FranciscaNeural` (Female) | **Styles**<br>`calm`<br>**Roles**<br>Not supported | ❌ |
| `pt-BR` | Portuguese (Brazil) | Standard | `pt-BR-AntonioNeural` (Male) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Multilingual | `pt-BR-MacerioMultilingualNeural`2 (Male) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Multilingual | `pt-BR-ThalitaMultilingualNeural`2 (Female) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Standard | `pt-BR-BrendaNeural` (Female) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Standard | `pt-BR-DonatoNeural` (Male) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Standard | `pt-BR-ElzaNeural` (Female) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Standard | `pt-BR-FabioNeural` (Male) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Standard | `pt-BR-GiovannaNeural` (Female) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Standard | `pt-BR-HumbertoNeural` (Male) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Standard | `pt-BR-JulioNeural` (Male) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Standard | `pt-BR-LeilaNeural` (Female) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Standard | `pt-BR-LeticiaNeural` (Female, Child) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Standard | `pt-BR-ManuelaNeural` (Female) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Standard | `pt-BR-NicolauNeural` (Male) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Standard | `pt-BR-ThalitaNeural` (Female) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Standard | `pt-BR-ValerioNeural` (Male) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Standard | `pt-BR-YaraNeural` (Female) |  | ❌ |
| `pt-BR` | Portuguese (Brazil) | Neural HD | `pt-BR-Caio:MAI-Voice-2`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `pt-BR` | Portuguese (Brazil) | Neural HD Flash | `pt-BR-Caio:MAI-Voice-2-Flash`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `pt-BR` | Portuguese (Brazil) | Neural HD | `pt-BR-Luana:MAI-Voice-2`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `pt-BR` | Portuguese (Brazil) | Neural HD Flash | `pt-BR-Luana:MAI-Voice-2-Flash`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `pt-BR` | Portuguese (Brazil) | Neural HD | `pt-BR-Pedro:MAI-Voice-2`1 (Male) | **Styles**<br>`confused`, `determined`, `embarrassed`, `excited`, `happy`, `hopeful`, `joyful`, `regretful`, `relieved`, `sad`, `softvoice`, `surprised`<br>**Roles**<br>Not supported | ❌ |
| `pt-BR` | Portuguese (Brazil) | Neural HD Flash | `pt-BR-Pedro:MAI-Voice-2-Flash`1 (Male) | **Styles**<br>`confused`, `determined`, `embarrassed`, `excited`, `happy`, `hopeful`, `joyful`, `regretful`, `relieved`, `sad`, `softvoice`, `surprised`<br>**Roles**<br>Not supported | ❌ |
| `pt-BR` | Portuguese (Brazil) | Neural HD | `pt-BR-Rafael:MAI-Voice-2`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `embarrassed`, `excited`, `happy`, `hopeful`, `joyful`, `regretful`, `relieved`, `sad`, `softvoice`, `surprised`<br>**Roles**<br>Not supported | ❌ |
| `pt-BR` | Portuguese (Brazil) | Neural HD Flash | `pt-BR-Rafael:MAI-Voice-2-Flash`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `embarrassed`, `excited`, `happy`, `hopeful`, `joyful`, `regretful`, `relieved`, `sad`, `softvoice`, `surprised`<br>**Roles**<br>Not supported | ❌ |
| `pt-PT` | Portuguese (Portugal) | Standard | `pt-PT-RaquelNeural` (Female) | **Styles**<br>`sad`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `pt-PT` | Portuguese (Portugal) | Standard | `pt-PT-DuarteNeural` (Male) |  | ❌ |
| `pt-PT` | Portuguese (Portugal) | Standard | `pt-PT-FernandaNeural` (Female) |  | ❌ |
| `pt-PT` | Portuguese (Portugal) | Neural HD | `pt-PT-Rui:MAI-Voice-2`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `embarrassed`, `excited`, `happy`, `hopeful`, `joyful`, `regretful`, `relieved`, `sad`, `softvoice`, `surprised`<br>**Roles**<br>Not supported | ❌ |
| `pt-PT` | Portuguese (Portugal) | Neural HD Flash | `pt-PT-Rui:MAI-Voice-2-Flash`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `embarrassed`, `excited`, `happy`, `hopeful`, `joyful`, `regretful`, `relieved`, `sad`, `softvoice`, `surprised`<br>**Roles**<br>Not supported | ❌ |
| `ro-RO` | Romanian (Romania) | Standard | `ro-RO-AlinaNeural` (Female) |  | ❌ |
| `ro-RO` | Romanian (Romania) | Standard | `ro-RO-EmilNeural` (Male) |  | ❌ |
| `ro-RO` | Romanian (Romania) | Neural HD | `ro-RO-Andrei:MAI-Voice-2`1 (Male) |  | ❌ |
| `ro-RO` | Romanian (Romania) | Neural HD Flash | `ro-RO-Andrei:MAI-Voice-2-Flash`1 (Male) |  | ❌ |
| `ro-RO` | Romanian (Romania) | Neural HD | `ro-RO-Elena:MAI-Voice-2`1 (Female) |  | ❌ |
| `ro-RO` | Romanian (Romania) | Neural HD Flash | `ro-RO-Elena:MAI-Voice-2-Flash`1 (Female) |  | ❌ |
| `ro-RO` | Romanian (Romania) | Neural HD | `ro-RO-Ioana:MAI-Voice-2`1 (Female) |  | ❌ |
| `ro-RO` | Romanian (Romania) | Neural HD Flash | `ro-RO-Ioana:MAI-Voice-2-Flash`1 (Female) |  | ❌ |
| `ro-RO` | Romanian (Romania) | Neural HD | `ro-RO-Radu:MAI-Voice-2`1 (Male) |  | ❌ |
| `ro-RO` | Romanian (Romania) | Neural HD Flash | `ro-RO-Radu:MAI-Voice-2-Flash`1 (Male) |  | ❌ |
| `ru-RU` | Russian (Russia) | Standard | `ru-RU-SvetlanaNeural` (Female) |  | ❌ |
| `ru-RU` | Russian (Russia) | Standard | `ru-RU-DmitryNeural` (Male) |  | ❌ |
| `ru-RU` | Russian (Russia) | Standard | `ru-RU-DariyaNeural` (Female) |  | ❌ |
| `ru-RU` | Russian (Russia) | Neural HD | `ru-RU-Lev:MAI-Voice-2`1 (Male) | **Styles**<br>`adventurous`, `caringempathy`, `curious`, `encouraging`, `excited`, `friendlycheerful`, `nostalgic`, `reflective`, `saddisappointed`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `ru-RU` | Russian (Russia) | Neural HD Flash | `ru-RU-Lev:MAI-Voice-2-Flash`1 (Male) | **Styles**<br>`adventurous`, `caringempathy`, `curious`, `encouraging`, `excited`, `friendlycheerful`, `nostalgic`, `reflective`, `saddisappointed`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `ru-RU` | Russian (Russia) | Neural HD | `ru-RU-Masha:MAI-Voice-2`1 (Female) | **Styles**<br>`adventurous`, `caringempathy`, `curious`, `encouraging`, `excited`, `friendlycheerful`, `nostalgic`, `reflective`, `saddisappointed`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `ru-RU` | Russian (Russia) | Neural HD Flash | `ru-RU-Masha:MAI-Voice-2-Flash`1 (Female) | **Styles**<br>`adventurous`, `caringempathy`, `curious`, `encouraging`, `excited`, `friendlycheerful`, `nostalgic`, `reflective`, `saddisappointed`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `si-LK` | Sinhala (Sri Lanka) | Standard | `si-LK-ThiliniNeural`3 (Female) |  | ❌ |
| `si-LK` | Sinhala (Sri Lanka) | Standard | `si-LK-SameeraNeural`3 (Male) |  | ❌ |
| `sk-SK` | Slovak (Slovakia) | Standard | `sk-SK-ViktoriaNeural` (Female) |  | ❌ |
| `sk-SK` | Slovak (Slovakia) | Standard | `sk-SK-LukasNeural` (Male) |  | ❌ |
| `sl-SI` | Slovenian (Slovenia) | Standard | `sl-SI-PetraNeural` (Female) |  | ❌ |
| `sl-SI` | Slovenian (Slovenia) | Standard | `sl-SI-RokNeural` (Male) |  | ❌ |
| `so-SO` | Somali (Somalia) | Standard | `so-SO-UbaxNeural`3 (Female) |  | ❌ |
| `so-SO` | Somali (Somalia) | Standard | `so-SO-MuuseNeural`3 (Male) |  | ❌ |
| `sq-AL` | Albanian (Albania) | Standard | `sq-AL-AnilaNeural`3 (Female) |  | ❌ |
| `sq-AL` | Albanian (Albania) | Standard | `sq-AL-IlirNeural`3 (Male) |  | ❌ |
| `sr-LATN-RS` | Serbian (Latin, Serbia) | Standard | `sr-Latn-RS-NicholasNeural`3 (Male) |  | ❌ |
| `sr-LATN-RS` | Serbian (Latin, Serbia) | Standard | `sr-Latn-RS-SophieNeural`3 (Female) |  | ❌ |
| `sr-RS` | Serbian (Cyrillic, Serbia) | Standard | `sr-RS-SophieNeural`3 (Female) |  | ❌ |
| `sr-RS` | Serbian (Cyrillic, Serbia) | Standard | `sr-RS-NicholasNeural`3 (Male) |  | ❌ |
| `su-ID` | Sundanese (Indonesia) | Standard | `su-ID-TutiNeural`3 (Female) |  | ❌ |
| `su-ID` | Sundanese (Indonesia) | Standard | `su-ID-JajangNeural`3 (Male) |  | ❌ |
| `sv-SE` | Swedish (Sweden) | Standard | `sv-SE-SofieNeural` (Female) |  | ❌ |
| `sv-SE` | Swedish (Sweden) | Standard | `sv-SE-MattiasNeural` (Male) |  | ❌ |
| `sv-SE` | Swedish (Sweden) | Standard | `sv-SE-HilleviNeural` (Female) |  | ❌ |
| `sw-KE` | Kiswahili (Kenya) | Standard | `sw-KE-ZuriNeural`3 (Female) |  | ❌ |
| `sw-KE` | Kiswahili (Kenya) | Standard | `sw-KE-RafikiNeural`3 (Male) |  | ❌ |
| `sw-TZ` | Kiswahili (Tanzania) | Standard | `sw-TZ-RehemaNeural` (Female) |  | ❌ |
| `sw-TZ` | Kiswahili (Tanzania) | Standard | `sw-TZ-DaudiNeural` (Male) |  | ❌ |
| `ta-IN` | Tamil (India) | Standard | `ta-IN-PallaviNeural` (Female) |  | ❌ |
| `ta-IN` | Tamil (India) | Standard | `ta-IN-ValluvarNeural` (Male) |  | ❌ |
| `ta-LK` | Tamil (Sri Lanka) | Standard | `ta-LK-SaranyaNeural` (Female) |  | ❌ |
| `ta-LK` | Tamil (Sri Lanka) | Standard | `ta-LK-KumarNeural` (Male) |  | ❌ |
| `ta-MY` | Tamil (Malaysia) | Standard | `ta-MY-KaniNeural` (Female) |  | ❌ |
| `ta-MY` | Tamil (Malaysia) | Standard | `ta-MY-SuryaNeural` (Male) |  | ❌ |
| `ta-SG` | Tamil (Singapore) | Standard | `ta-SG-VenbaNeural` (Female) |  | ❌ |
| `ta-SG` | Tamil (Singapore) | Standard | `ta-SG-AnbuNeural` (Male) |  | ❌ |
| `te-IN` | Telugu (India) | Standard | `te-IN-ShrutiNeural` (Female) |  | ❌ |
| `te-IN` | Telugu (India) | Standard | `te-IN-MohanNeural` (Male) |  | ❌ |
| `th-TH` | Thai (Thailand) | Standard | `th-TH-PremwadeeNeural` (Female) |  | ❌ |
| `th-TH` | Thai (Thailand) | Standard | `th-TH-NiwatNeural` (Male) |  | ❌ |
| `th-TH` | Thai (Thailand) | Standard | `th-TH-AcharaNeural` (Female) |  | ❌ |
| `th-TH` | Thai (Thailand) | Neural HD | `th-TH-Krit:MAI-Voice-2`1 (Male) | **Styles**<br>`adventurous`, `caringempathy`, `curious`, `encouraging`, `excited`, `friendlycheerful`, `nostalgic`, `reflective`, `saddisappointed`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `th-TH` | Thai (Thailand) | Neural HD Flash | `th-TH-Krit:MAI-Voice-2-Flash`1 (Male) | **Styles**<br>`adventurous`, `caringempathy`, `curious`, `encouraging`, `excited`, `friendlycheerful`, `nostalgic`, `reflective`, `saddisappointed`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `th-TH` | Thai (Thailand) | Neural HD | `th-TH-Nattapong:MAI-Voice-2`1 (Male) | **Styles**<br>`adventurous`, `caringempathy`, `curious`, `encouraging`, `excited`, `friendlycheerful`, `nostalgic`, `reflective`, `saddisappointed`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `th-TH` | Thai (Thailand) | Neural HD Flash | `th-TH-Nattapong:MAI-Voice-2-Flash`1 (Male) | **Styles**<br>`adventurous`, `caringempathy`, `curious`, `encouraging`, `excited`, `friendlycheerful`, `nostalgic`, `reflective`, `saddisappointed`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `tr-TR` | Turkish (Türkiye) | Standard | `tr-TR-EmelNeural` (Female) |  | ❌ |
| `tr-TR` | Turkish (Türkiye) | Standard | `tr-TR-AhmetNeural` (Male) |  | ❌ |
| `tr-TR` | Turkish (Türkiye) | Neural HD | `tr-TR-Aydın:MAI-Voice-2`1 (Male) | **Styles**<br>`adventurous`, `caringempathy`, `curious`, `encouraging`, `excited`, `friendlycheerful`, `nostalgic`, `reflective`, `saddisappointed`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `tr-TR` | Turkish (Türkiye) | Neural HD Flash | `tr-TR-Aydın:MAI-Voice-2-Flash`1 (Male) | **Styles**<br>`adventurous`, `caringempathy`, `curious`, `encouraging`, `excited`, `friendlycheerful`, `nostalgic`, `reflective`, `saddisappointed`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `tr-TR` | Turkish (Türkiye) | Neural HD | `tr-TR-Elif:MAI-Voice-2`1 (Female) | **Styles**<br>`adventurous`, `caringempathy`, `curious`, `encouraging`, `excited`, `friendlycheerful`, `nostalgic`, `reflective`, `saddisappointed`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `tr-TR` | Turkish (Türkiye) | Neural HD Flash | `tr-TR-Elif:MAI-Voice-2-Flash`1 (Female) | **Styles**<br>`adventurous`, `caringempathy`, `curious`, `encouraging`, `excited`, `friendlycheerful`, `nostalgic`, `reflective`, `saddisappointed`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `uk-UA` | Ukrainian (Ukraine) | Standard | `uk-UA-PolinaNeural` (Female) |  | ❌ |
| `uk-UA` | Ukrainian (Ukraine) | Standard | `uk-UA-OstapNeural` (Male) |  | ❌ |
| `ur-IN` | Urdu (India) | Standard | `ur-IN-GulNeural` (Female) |  | ❌ |
| `ur-IN` | Urdu (India) | Standard | `ur-IN-SalmanNeural` (Male) |  | ❌ |
| `ur-PK` | Urdu (Pakistan) | Standard | `ur-PK-UzmaNeural` (Female) |  | ❌ |
| `ur-PK` | Urdu (Pakistan) | Standard | `ur-PK-AsadNeural` (Male) |  | ❌ |
| `uz-UZ` | Uzbek (Latin, Uzbekistan) | Standard | `uz-UZ-MadinaNeural`3 (Female) |  | ❌ |
| `uz-UZ` | Uzbek (Latin, Uzbekistan) | Standard | `uz-UZ-SardorNeural`3 (Male) |  | ❌ |
| `vi-VN` | Vietnamese (Vietnam) | Standard | `vi-VN-HoaiMyNeural` (Female) |  | ❌ |
| `vi-VN` | Vietnamese (Vietnam) | Standard | `vi-VN-NamMinhNeural` (Male) |  | ❌ |
| `vi-VN` | Vietnamese (Vietnam) | Neural HD Flash | `vi-VN-Linh:MAI-Voice-2-Flash`1 (Female) |  | ❌ |
| `wuu-CN` | Chinese (Wu, Simplified) | Standard | `wuu-CN-XiaotongNeural`3 (Female) |  | ❌ |
| `wuu-CN` | Chinese (Wu, Simplified) | Standard | `wuu-CN-YunzheNeural`3 (Male) |  | ❌ |
| `yue-CN` | Chinese (Cantonese, Simplified) | Standard | `yue-CN-XiaoMinNeural`3 (Female) |  | ❌ |
| `yue-CN` | Chinese (Cantonese, Simplified) | Standard | `yue-CN-YunSongNeural`3 (Male) |  | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Flash | `zh-CN-Xiaoxiao:DragonHDFlashLatestNeural`2 (Female) | **Styles**<br>`angry`, `chat`, `cheerful`, `comforting`, `customer-service`, `debating`, `disappointed`, `excited`, `fearful`, `sad`, `shy`, `sorry`, `strict`, `voice-assistant`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Flash | `zh-CN-Xiaoxiao2:DragonHDFlashLatestNeural`2 (Female) | **Styles**<br>`affectionate`, `angry`, `anxious`, `cheerful`, `curious`, `disappointed`, `empathetic`, `encouraging`, `excited`, `fearful`, `guilty`, `lonely`, `poetry-reading`, `sad`, `sentimental`, `sorry`, `story-telling`, `surprised`, `tired`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD | `zh-CN-Xiaochen:DragonHDLatestNeural`2,4 (Female) |  | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Flash | `zh-CN-Yunxiao:DragonHDFlashLatestNeural`2 (Male) |  | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Flash | `zh-CN-Yunyi:DragonHDFlashLatestNeural`2 (Male) | **Styles**<br>`assassin`, `captain`, `cavalier`, `game-narrator`, `geomancer`, `poet`, `prince`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD | `zh-CN-Yunfan:DragonHDLatestNeural`2,4 (Male) |  | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Omni | `zh-CN-Xiaoyue:DragonHDOmniLatestNeural`1,2 (Female) |  | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Omni | `zh-CN-Yunqi:DragonHDOmniLatestNeural`1,2 (Male) |  | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Omni | `zh-CN-Maroonallegro:DragonHDOmniLatestNeural`1,2 (Female) |  | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-XiaoxiaoNeural` (Female) | **Styles**<br>`affectionate`, `angry`, `assistant`, `calm`, `chat`, `chat-casual`, `cheerful`, `customerservice`, `disgruntled`, `excited`, `fearful`, `friendly`, `gentle`, `lyrical`, `newscast`, `poetry-reading`, `sad`, `serious`, `sorry`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-YunxiNeural` (Male) | **Styles**<br>`angry`, `assistant`, `chat`, `cheerful`, `depressed`, `disgruntled`, `embarrassed`, `fearful`, `narration-relaxed`, `newscast`, `sad`, `serious`<br>**Roles**<br>`Boy`, `Narrator`, `YoungAdultMale` | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-YunjianNeural` (Male) | **Styles**<br>`angry`, `cheerful`, `depressed`, `disgruntled`, `documentary-narration`, `narration-relaxed`, `sad`, `serious`, `sports-commentary`, `sports-commentary-excited`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-XiaoyiNeural` (Female) | **Styles**<br>`affectionate`, `angry`, `cheerful`, `disgruntled`, `embarrassed`, `fearful`, `gentle`, `sad`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-YunyangNeural` (Male) | **Styles**<br>`customerservice`, `narration-professional`, `newscast-casual`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-XiaochenNeural` (Female) | **Styles**<br>`livecommercial`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Flash | `zh-CN-Xiaochen:DragonHDFlashLatestNeural`2 (Female) | **Styles**<br>`cheerful`, `debating`, `empathetic`, `live-commercial`, `poetry-reading`, `sad`, `sorry`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Multilingual | `zh-CN-XiaochenMultilingualNeural`2 (Female) |  | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Flash | `zh-CN-Xiaohan:DragonHDFlashLatestNeural`2 (Female) | **Styles**<br>`affectionate`, `angry`, `cheerful`, `complaining`, `fearful`, `gentle`, `sad`, `shy`, `strict`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-XiaohanNeural` (Female) | **Styles**<br>`affectionate`, `angry`, `calm`, `cheerful`, `disgruntled`, `embarrassed`, `fearful`, `gentle`, `sad`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Flash | `zh-CN-Xiaoke:DragonHDFlashLatestNeural`2 (Female) | **Styles**<br>`angry`, `customer-service`, `cutesy`, `excited`, `fearful`, `sad`, `sorry`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-XiaomengNeural` (Female) | **Styles**<br>`chat`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-XiaomoNeural` (Female) | **Styles**<br>`affectionate`, `angry`, `calm`, `cheerful`, `depressed`, `disgruntled`, `embarrassed`, `envious`, `fearful`, `gentle`, `sad`, `serious`<br>**Roles**<br>`Boy`, `Girl`, `OlderAdultFemale`, `OlderAdultMale`, `SeniorFemale`, `SeniorMale`, `YoungAdultFemale`, `YoungAdultMale` | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-XiaoqiuNeural` (Female) |  | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-XiaorouNeural` (Female) |  | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-XiaoruiNeural` (Female) | **Styles**<br>`angry`, `calm`, `fearful`, `sad`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Flash | `zh-CN-Xiaoshuang:DragonHDFlashLatestNeural`2 (Female) | **Styles**<br>`chat`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Multilingual | `zh-CN-XiaoshuangMultilingualNeural`2 (Female) | **Styles**<br>`chat`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-XiaoshuangNeural` (Female, Child) | **Styles**<br>`chat`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-XiaoxiaoDialectsNeural` (Female) |  | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Multilingual | `zh-CN-XiaoxiaoMultilingualNeural`2 (Female) | **Styles**<br>`affectionate`, `cheerful`, `empathetic`, `excited`, `poetry-reading`, `sorry`, `story`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-XiaoyanNeural` (Female) |  | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Flash | `zh-CN-Xiaoyi:DragonHDFlashLatestNeural`2 (Female) | **Styles**<br>`angry`, `cheerful`, `complaining`, `cute`, `gentle`, `nervous`, `sad`, `shy`, `strict`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Flash | `zh-CN-Xiaoyou:DragonHDFlashLatestNeural`2 (Female) | **Styles**<br>`angry`, `chat`, `cheerful`, `cute`, `poetry-reading`, `sad`, `story-telling`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Multilingual | `zh-CN-XiaoyouMultilingualNeural`2 (Female) | **Styles**<br>`angry`, `chat`, `cheerful`, `cute`, `poetry-reading`, `sad`, `story`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-XiaoyouNeural` (Female, Child) |  | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Flash | `zh-CN-Xiaoyu:DragonHDFlashLatestNeural`2 (Female) | **Styles**<br>`angry`, `cheerful`, `comforting`, `debating`, `sad`, `sorry`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Multilingual | `zh-CN-XiaoyuMultilingualNeural`2 (Female) |  | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-XiaozhenNeural` (Female) | **Styles**<br>`angry`, `cheerful`, `disgruntled`, `fearful`, `sad`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Multilingual | `zh-CN-YunfanMultilingualNeural`2 (Male) |  | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-YunfengNeural` (Male) | **Styles**<br>`angry`, `cheerful`, `depressed`, `disgruntled`, `fearful`, `sad`, `serious`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Flash | `zh-CN-Yunhan:DragonHDFlashLatestNeural`2 (Male) | **Styles**<br>`angry`, `cheerful`, `curious`, `empathetic`, `encouraging`, `excited`, `guilty`, `lonely`, `sad`, `serious`, `sorry`, `surprised`, `tired`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-YunhaoNeural` (Male) | **Styles**<br>`advertisement-upbeat`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-YunjieNeural` (Male) |  | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Flash | `zh-CN-Yunxi:DragonHDFlashLatestNeural`2 (Male) | **Styles**<br>`angry`, `chat`, `cheerful`, `complaining`, `depressed`, `fearful`, `news`, `sad`, `shy`, `strict`, `voice-assistant`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Flash | `zh-CN-Yunxia:DragonHDFlashLatestNeural`2 (Male) | **Styles**<br>`affectionate`, `angry`, `cheerful`, `comforting`, `encouraging`, `excited`, `fearful`, `sad`, `surprised`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-YunxiaNeural` (Male) | **Styles**<br>`angry`, `calm`, `cheerful`, `fearful`, `sad`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Multilingual | `zh-CN-YunxiaoMultilingualNeural`2 (Male) |  | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Flash | `zh-CN-Yunye:DragonHDFlashLatestNeural`2 (Male) |  | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-YunyeNeural` (Male) | **Styles**<br>`angry`, `calm`, `cheerful`, `disgruntled`, `embarrassed`, `fearful`, `sad`, `serious`<br>**Roles**<br>`Boy`, `Girl`, `OlderAdultFemale`, `OlderAdultMale`, `SeniorFemale`, `SeniorMale`, `YoungAdultFemale`, `YoungAdultMale` | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Multilingual | `zh-CN-YunyiMultilingualNeural`2 (Male) |  | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Standard | `zh-CN-YunzeNeural` (Male) | **Styles**<br>`angry`, `calm`, `cheerful`, `depressed`, `disgruntled`, `documentary-narration`, `fearful`, `sad`, `serious`<br>**Roles**<br>`OlderAdultMale`, `SeniorMale` | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD | `zh-CN-Bo:MAI-Voice-2`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Flash | `zh-CN-Bo:MAI-Voice-2-Flash`1 (Male) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD | `zh-CN-Lan:MAI-Voice-2`1 (Female) | **Styles**<br>`angry`, `confused`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `joyful`, `sad`, `surprised`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Flash | `zh-CN-Lan:MAI-Voice-2-Flash`1 (Female) | **Styles**<br>`angry`, `confused`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `joyful`, `sad`, `surprised`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD | `zh-CN-Mei:MAI-Voice-2`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Flash | `zh-CN-Mei:MAI-Voice-2-Flash`1 (Female) | **Styles**<br>`angry`, `confused`, `determined`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `relieved`, `sad`, `shouting`, `softvoice`, `surprised`, `whispering`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD | `zh-CN-Wei:MAI-Voice-2`1 (Male) | **Styles**<br>`angry`, `confused`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `sad`, `surprised`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN` | Chinese (Mandarin, Simplified) | Neural HD Flash | `zh-CN-Wei:MAI-Voice-2-Flash`1 (Male) | **Styles**<br>`angry`, `confused`, `disgusted`, `embarrassed`, `excited`, `fearful`, `happy`, `hopeful`, `jealous`, `joyful`, `regretful`, `sad`, `surprised`<br>**Roles**<br>Not supported | ❌ |
| `zh-CN-GUANGXI` | Chinese (Guangxi Accent Mandarin, Simplified) | Standard | `zh-CN-guangxi-YunqiNeural`1,3 (Male) |  | ❌ |
| `zh-CN-henan` | Chinese (Zhongyuan Mandarin Henan, Simplified) | Standard | `zh-CN-henan-YundengNeural`3 (Male) |  | ❌ |
| `zh-CN-liaoning` | Chinese (Northeastern Mandarin, Simplified) | Standard | `zh-CN-liaoning-XiaobeiNeural`1,3 (Female) |  | ❌ |
| `zh-CN-liaoning` | Chinese (Northeastern Mandarin, Simplified) | Standard | `zh-CN-liaoning-YunbiaoNeural`1,3 (Male) |  | ❌ |
| `zh-CN-shaanxi` | Chinese (Zhongyuan Mandarin Shaanxi, Simplified) | Standard | `zh-CN-shaanxi-XiaoniNeural`1,3 (Female) |  | ❌ |
| `zh-CN-shandong` | Chinese (Jilu Mandarin, Simplified) | Standard | `zh-CN-shandong-YunxiangNeural`3 (Male) |  | ❌ |
| `zh-CN-sichuan` | Chinese (Southwestern Mandarin, Simplified) | Standard | `zh-CN-sichuan-YunxiNeural`1,3 (Male) |  | ❌ |
| `zh-HK` | Chinese (Cantonese, Traditional) | Standard | `zh-HK-HiuMaanNeural` (Female) |  | ❌ |
| `zh-HK` | Chinese (Cantonese, Traditional) | Standard | `zh-HK-WanLungNeural` (Male) |  | ❌ |
| `zh-HK` | Chinese (Cantonese, Traditional) | Standard | `zh-HK-HiuGaaiNeural` (Female) |  | ❌ |
| `zh-TW` | Chinese (Taiwanese Mandarin, Traditional) | Standard | `zh-TW-HsiaoChenNeural` (Female) |  | ❌ |
| `zh-TW` | Chinese (Taiwanese Mandarin, Traditional) | Standard | `zh-TW-YunJheNeural` (Male) |  | ❌ |
| `zh-TW` | Chinese (Taiwanese Mandarin, Traditional) | Standard | `zh-TW-HsiaoYuNeural` (Female) |  | ❌ |
| `zu-ZA` | isiZulu (South Africa) | Standard | `zu-ZA-ThandoNeural`3 (Female) |  | ❌ |
| `zu-ZA` | isiZulu (South Africa) | Standard | `zu-ZA-ThembaNeural`3 (Male) |  | ❌ |

1 The neural voice is available in public preview. For the current list of regions that support voices and styles in preview, see the [table for Azure Speech regions](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions?tabs=tts).

2 The neural voice is a multilingual voice in Azure Speech. The turbo version of Azure OpenAI voices has a similar voice persona to Azure OpenAI voices but supports extra features. Turbo voices support the full set of SSML elements and more features (like word boundary), just like other Azure Speech voices. All multilingual voices can speak in the auto-detected language of the input text in the default locale without [using SSML](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-voice#adjust-speaking-languages). However, you can still use the `<lang xml:lang>` element to set the preferred speaking accent of each language, such as a British accent (`en-GB`) for English.

3 [Phonemes](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-pronunciation#phoneme-element), [custom lexicon](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-pronunciation#custom-lexicon), and [visemes](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-voice#viseme-element) aren't supported. For details about supported visemes, see the [table of viseme locales](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts#visemes).

4 For the current list of regions where Neural HD voices are generally available, see the [table for Azure Speech regions](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions?tabs=tts).

5 The OpenAI text-to-speech voices in Azure Speech are in preview and are available only in North Central US (`northcentralus`) and Sweden Central (`swedencentral`). Locales not listed for OpenAI voices aren't supported. For information about additional differences between OpenAI text-to-speech voices and Azure Speech text-to-speech voices, see [OpenAI text-to-speech voices](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/openai-voices#openai-text-to-speech-voices-via-azure-openai-or-via-azure-speech).

6 The `zh-CN-XiaoxiaoDialectsNeural` voice also supports the following secondary locales: `zh-CN-shaanxi`, `zh-CN-sichuan`, `zh-CN-shanxi`, `zh-CN-anhui`, `zh-CN-hunan`, `zh-CN-gansu`, `zh-CN-shandong`, `zh-CN-henan`, `zh-CN-liaoning`, `zh-TW`, `nan-CN`, `yue-CN`, and `wuu-CN`. To get the latest list of supported secondary locales, see the [voice list API reference](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech#get-a-list-of-voices).

7 The multi-talker voice is available in preview in these service [regions](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions): East US, West Europe, and Southeast Asia. Only `en-US` content is supported for this voice.

[Section titled: Professional voice](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#professional-voice)

## Professional voice

Use [professional voice fine-tuning](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/professional-voice-create-project) to create synthetic voices that are rich in speaking styles. You can create a unique brand voice in multiple languages and styles by using a small set of recording data. Multi-style custom voices support adjustment of style degree.

Select the right locale that matches the data for your professional voice fine-tuning. For example, if the recording data is spoken in English with a British accent, select `en-GB`.

By using the cross-lingual feature, you can transfer your custom voice model to speak a second language. For example, with the `zh-CN` data, you can create a voice that speaks `en-AU` or any of the languages with cross-lingual support.

For the cross-lingual feature, we categorize locales into two tiers:

- A tier that includes source languages that support the cross-lingual feature
- A tier that comprises locales designated as target languages for cross-lingual transfer

The following table distinguishes locales that function as both cross-lingual sources and targets from locales that are eligible solely as target locales for cross-lingual transfer.

Expand table

| Locale (BCP-47) | Language | Custom voice feature |
| --- | --- | --- |
| `ar-AE` | Arabic (UAE) | HD voice<br>Neural voice<br>Multi-style voice |
| `ar-EG` | Arabic (Egypt) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `ar-OM` | Arabic (Oman) | HD voice<br>Neural voice<br>Multi-style voice |
| `ar-SA` | Arabic (Saudi Arabia) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `ar-SY` | Arabic (Syria) | HD voice<br>Neural voice<br>Multi-style voice |
| `ar-TN` | Arabic (Tunisia) | HD voice<br>Neural voice<br>Multi-style voice |
| `bg-BG` | Bulgarian (Bulgaria) | HD voice<br>Neural voice<br>Multi-style voice |
| `ca-ES` | Catalan | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `cs-CZ` | Czech (Czechia) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `da-DK` | Danish (Denmark) | Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `de-AT` | German (Austria) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `de-CH` | German (Switzerland) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `de-DE` | German (Germany) | HD voice<br>Neural voice<br>Custom voice lite<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `el-GR` | Greek (Greece) | HD voice<br>Neural voice<br>Multi-style voice |
| `en-AU` | English (Australia) | HD voice<br>Neural voice<br>Custom voice lite<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `en-CA` | English (Canada) | HD voice<br>Neural voice<br>Custom voice lite<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `en-GB` | English (United Kingdom) | HD voice<br>Neural voice<br>Custom voice lite<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `en-IE` | English (Ireland) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `en-IN` | English (India) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `en-KE` | English (Kenya) | HD voice<br>Neural voice<br>Multi-style voice |
| `en-NG` | English (Nigeria) | HD voice<br>Neural voice<br>Multi-style voice |
| `en-NZ` | English (New Zealand) | HD voice<br>Neural voice<br>Multi-style voice |
| `en-PH` | English (Philippines) | HD voice<br>Neural voice<br>Multi-style voice |
| `en-SG` | English (Singapore) | HD voice<br>Neural voice<br>Multi-style voice |
| `en-TZ` | English (Tanzania) | HD voice<br>Neural voice<br>Multi-style voice |
| `en-US` | English (United States) | HD voice<br>Neural voice<br>Custom voice lite<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary<br>HD voice |
| `en-ZA` | English (South Africa) | HD voice<br>Neural voice<br>Multi-style voice |
| `es-AR` | Spanish (Argentina) | HD voice<br>Neural voice<br>Multi-style voice |
| `es-CL` | Spanish (Chile) | HD voice<br>Neural voice<br>Multi-style voice |
| `es-CO` | Spanish (Colombia) | HD voice<br>Neural voice<br>Multi-style voice |
| `es-ES` | Spanish (Spain) | HD voice<br>Neural voice<br>Custom voice lite<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `es-MX` | Spanish (Mexico) | HD voice<br>Neural voice<br>Custom voice lite<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `es-US` | Spanish (United States) | HD voice<br>Neural voice<br>Multi-style voice |
| `fi-FI` | Finnish (Finland) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `fr-BE` | French (Belgium) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `fr-CA` | French (Canada) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `fr-CH` | French (Switzerland) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `fr-FR` | French (France) | HD voice<br>Neural voice<br>Custom voice lite<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `he-IL` | Hebrew (Israel) | HD voice<br>Neural voice<br>Multi-style voice |
| `hi-IN` | Hindi (India) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `hr-HR` | Croatian (Croatia) | Neural voice<br>Multi-style voice |
| `hu-HU` | Hungarian (Hungary) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `id-ID` | Indonesian (Indonesia) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `it-IT` | Italian (Italy) | HD voice<br>Neural voice<br>Custom voice lite<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `ja-JP` | Japanese (Japan) | HD voice<br>Neural voice<br>Custom voice lite<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `ko-KR` | Korean (Korea) | HD voice<br>Neural voice<br>Custom voice lite<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `ms-MY` | Malay (Malaysia) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `nb-NO` | Norwegian Bokmål (Norway) | Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `nl-BE` | Dutch (Belgium) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `nl-NL` | Dutch (Netherlands) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `pl-PL` | Polish (Poland) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `pt-BR` | Portuguese (Brazil) | HD voice<br>Neural voice<br>Custom voice lite<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `pt-PT` | Portuguese (Portugal) | Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `ro-RO` | Romanian (Romania) | HD voice<br>Neural voice<br>Multi-style voice |
| `ru-RU` | Russian (Russia) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `sk-SK` | Slovak (Slovakia) | HD voice<br>Neural voice<br>Multi-style voice |
| `sl-SI` | Slovenian (Slovenia) | HD voice<br>Neural voice<br>Multi-style voice |
| `sv-SE` | Swedish (Sweden) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `ta-IN` | Tamil (India) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multilingual voice primary and secondary |
| `ta-MY` | Tamil (Malaysia) | HD voice<br>Neural voice<br>Multi-style voice |
| `te-IN` | Telugu (India) | HD voice<br>Neural voice<br>Multi-style voice |
| `th-TH` | Thai (Thailand) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `tr-TR` | Turkish (Türkiye) | Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `vi-VN` | Vietnamese (Vietnam) | HD voice<br>Neural voice<br>Multi-style voice |
| `zh-CN` | Chinese (Mandarin, Simplified) | HD voice<br>Neural voice<br>Custom voice lite<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary<br>HD voice |
| `zh-HK` | Chinese (Cantonese, Traditional) | Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |
| `zh-SG` | Chinese (Simplified, Singapore) | HD voice<br>Neural voice<br>Multi-style voice |
| `zh-TW` | Chinese (Taiwanese Mandarin, Traditional) | HD voice<br>Neural voice<br>Cross-lingual voice source and target<br>Multi-style voice<br>Multilingual voice primary and secondary |

[Section titled: Personal voice](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#personal-voice)

## Personal voice

[Personal voice](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/personal-voice-overview) is a feature for creating a voice that sounds like you or your users. The following table summarizes the supported locales for personal voice.

Expand table

| Locale (BCP-47) | Language |
| --- | --- |
| `am-ET` | Amharic (Ethiopia) |
| `ar-EG` | Arabic (Egypt) |
| `ar-SA` | Arabic (Saudi Arabia) |
| `bg-BG` | Bulgarian (Bulgaria) |
| `bn-IN` | Bengali (India) |
| `bs-BA` | Bosnian (Bosnia and Herzegovina) |
| `ca-ES` | Catalan |
| `cs-CZ` | Czech (Czechia) |
| `da-DK` | Danish (Denmark) |
| `de-AT` | German (Austria) |
| `de-CH` | German (Switzerland) |
| `de-DE` | German (Germany) |
| `el-GR` | Greek (Greece) |
| `en-AU` | English (Australia) |
| `en-CA` | English (Canada) |
| `en-GB` | English (United Kingdom) |
| `en-IE` | English (Ireland) |
| `en-IN` | English (India) |
| `en-US` | English (United States) |
| `es-ES` | Spanish (Spain) |
| `es-MX` | Spanish (Mexico) |
| `et-EE` | Estonian (Estonia) |
| `eu-ES` | Basque |
| `fi-FI` | Finnish (Finland) |
| `fil-PH` | Filipino (Philippines) |
| `fr-BE` | French (Belgium) |
| `fr-CA` | French (Canada) |
| `fr-CH` | French (Switzerland) |
| `fr-FR` | French (France) |
| `gl-ES` | Galician |
| `he-IL` | Hebrew (Israel) |
| `hi-IN` | Hindi (India) |
| `hr-HR` | Croatian (Croatia) |
| `hu-HU` | Hungarian (Hungary) |
| `id-ID` | Indonesian (Indonesia) |
| `it-IT` | Italian (Italy) |
| `ja-JP` | Japanese (Japan) |
| `jv-ID` | Javanese (Latin, Indonesia) |
| `ko-KR` | Korean (Korea) |
| `mk-MK` | Macedonian (North Macedonia) |
| `ms-MY` | Malay (Malaysia) |
| `nb-NO` | Norwegian Bokmål (Norway) |
| `ne-NP` | Nepali (Nepal) |
| `nl-BE` | Dutch (Belgium) |
| `nl-NL` | Dutch (Netherlands) |
| `pl-PL` | Polish (Poland) |
| `ps-AF` | Pashto (Afghanistan) |
| `pt-BR` | Portuguese (Brazil) |
| `pt-PT` | Portuguese (Portugal) |
| `ro-RO` | Romanian (Romania) |
| `ru-RU` | Russian (Russia) |
| `sk-SK` | Slovak (Slovakia) |
| `sl-SI` | Slovenian (Slovenia) |
| `sv-SE` | Swedish (Sweden) |
| `sw-KE` | Swahili (Kenya) |
| `ta-IN` | Tamil (India) |
| `te-IN` | Telugu (India) |
| `th-TH` | Thai (Thailand) |
| `tr-TR` | Turkish (Türkiye) |
| `uk-UA` | Ukrainian (Ukraine) |
| `vi-VN` | Vietnamese (Vietnam) |
| `zh-CN` | Chinese (Mandarin, Simplified) |
| `zh-HK` | Chinese (Cantonese, Traditional) |
| `zh-TW` | Chinese (Taiwanese Mandarin, Traditional) |
| `zu-ZA` | Zulu (South Africa) |

[Section titled: Visemes](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#visemes)

## Visemes

This table lists all the locales supported for [viseme](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-voice#viseme-element). For more information about viseme, see [Get facial position with viseme](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-speech-synthesis-viseme) and [Viseme element](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-voice#viseme-element).

Expand table

| Locale (BCP-47) | Language | Viseme feature |
| --- | --- | --- |
| `ar-AE` | Arabic (United Arab Emirates) | Viseme ID |
| `ar-BH` | Arabic (Bahrain) | Viseme ID |
| `ar-DZ` | Arabic (Algeria) | Viseme ID |
| `ar-EG` | Arabic (Egypt) | Viseme ID |
| `ar-IQ` | Arabic (Iraq) | Viseme ID |
| `ar-JO` | Arabic (Jordan) | Viseme ID |
| `ar-KW` | Arabic (Kuwait) | Viseme ID |
| `ar-LB` | Arabic (Lebanon) | Viseme ID |
| `ar-LY` | Arabic (Libya) | Viseme ID |
| `ar-MA` | Arabic (Morocco) | Viseme ID |
| `ar-OM` | Arabic (Oman) | Viseme ID |
| `ar-QA` | Arabic (Qatar) | Viseme ID |
| `ar-SA` | Arabic (Saudi Arabia) | Viseme ID |
| `ar-SY` | Arabic (Syria) | Viseme ID |
| `ar-TN` | Arabic (Tunisia) | Viseme ID |
| `ar-YE` | Arabic (Yemen) | Viseme ID |
| `bg-BG` | Bulgarian (Bulgaria) | Viseme ID |
| `ca-ES` | Catalan | Viseme ID |
| `cs-CZ` | Czech (Czechia) | Viseme ID |
| `da-DK` | Danish (Denmark) | Viseme ID |
| `de-AT` | German (Austria) | Viseme ID <br> Blend shapes |
| `de-CH` | German (Switzerland) | Viseme ID <br> Blend shapes |
| `de-DE` | German (Germany) | Viseme ID <br> Blend shapes |
| `el-GR` | Greek (Greece) | Viseme ID |
| `en-AU` | English (Australia) | Viseme ID <br> Blend shapes |
| `en-CA` | English (Canada) | Viseme ID <br> Blend shapes |
| `en-GB` | English (United Kingdom) | Viseme ID <br> Blend shapes |
| `en-HK` | English (Hong Kong SAR) | Viseme ID <br> Blend shapes |
| `en-IE` | English (Ireland) | Viseme ID <br> Blend shapes |
| `en-IN` | English (India) | Viseme ID <br> Blend shapes |
| `en-KE` | English (Kenya) | Viseme ID <br> Blend shapes |
| `en-NG` | English (Nigeria) | Viseme ID <br> Blend shapes |
| `en-NZ` | English (New Zealand) | Viseme ID <br> Blend shapes |
| `en-PH` | English (Philippines) | Viseme ID <br> Blend shapes |
| `en-SG` | English (Singapore) | Viseme ID <br> Blend shapes |
| `en-TZ` | English (Tanzania) | Viseme ID <br> Blend shapes |
| `en-US` | English (United States) | Viseme ID <br> Blend shapes<br>Scalable vector graphics (SVG) |
| `en-ZA` | English (South Africa) | Viseme ID <br> Blend shapes |
| `es-AR` | Spanish (Argentina) | Viseme ID <br> Blend shapes |
| `es-BO` | Spanish (Bolivia) | Viseme ID <br> Blend shapes |
| `es-CL` | Spanish (Chile) | Viseme ID <br> Blend shapes |
| `es-CO` | Spanish (Colombia) | Viseme ID <br> Blend shapes |
| `es-CR` | Spanish (Costa Rica) | Viseme ID <br> Blend shapes |
| `es-CU` | Spanish (Cuba) | Viseme ID <br> Blend shapes |
| `es-DO` | Spanish (Dominican Republic) | Viseme ID <br> Blend shapes |
| `es-EC` | Spanish (Ecuador) | Viseme ID <br> Blend shapes |
| `es-ES` | Spanish (Spain) | Viseme ID <br> Blend shapes |
| `es-GQ` | Spanish (Equatorial Guinea) | Viseme ID <br> Blend shapes |
| `es-GT` | Spanish (Guatemala) | Viseme ID <br> Blend shapes |
| `es-HN` | Spanish (Honduras) | Viseme ID <br> Blend shapes |
| `es-MX` | Spanish (Mexico) | Viseme ID <br> Blend shapes |
| `es-NI` | Spanish (Nicaragua) | Viseme ID <br> Blend shapes |
| `es-PA` | Spanish (Panama) | Viseme ID <br> Blend shapes |
| `es-PE` | Spanish (Peru) | Viseme ID <br> Blend shapes |
| `es-PR` | Spanish (Puerto Rico) | Viseme ID <br> Blend shapes |
| `es-PY` | Spanish (Paraguay) | Viseme ID <br> Blend shapes |
| `es-SV` | Spanish (El Salvador) | Viseme ID <br> Blend shapes |
| `es-US` | Spanish (United States) | Viseme ID <br> Blend shapes |
| `es-UY` | Spanish (Uruguay) | Viseme ID <br> Blend shapes |
| `es-VE` | Spanish (Venezuela) | Viseme ID <br> Blend shapes |
| `fi-FI` | Finnish (Finland) | Viseme ID |
| `fr-BE` | French (Belgium) | Viseme ID <br> Blend shapes |
| `fr-CA` | French (Canada) | Viseme ID <br> Blend shapes |
| `fr-CH` | French (Switzerland) | Viseme ID <br> Blend shapes |
| `fr-FR` | French (France) | Viseme ID <br> Blend shapes |
| `gu-IN` | Gujarati (India) | Viseme ID |
| `he-IL` | Hebrew (Israel) | Viseme ID |
| `hi-IN` | Hindi (India) | Viseme ID |
| `hr-HR` | Croatian (Croatia) | Viseme ID |
| `hu-HU` | Hungarian (Hungary) | Viseme ID |
| `id-ID` | Indonesian (Indonesia) | Viseme ID |
| `it-IT` | Italian (Italy) | Viseme ID <br> Blend shapes |
| `ja-JP` | Japanese (Japan) | Viseme ID |
| `ko-KR` | Korean (Korea) | Viseme ID |
| `mr-IN` | Marathi (India) | Viseme ID |
| `ms-MY` | Malay (Malaysia) | Viseme ID |
| `nb-NO` | Norwegian Bokmål (Norway) | Viseme ID |
| `nl-BE` | Dutch (Belgium) | Viseme ID |
| `nl-NL` | Dutch (Netherlands) | Viseme ID |
| `pl-PL` | Polish (Poland) | Viseme ID |
| `pt-BR` | Portuguese (Brazil) | Viseme ID <br> Blend shapes |
| `pt-PT` | Portuguese (Portugal) | Viseme ID <br> Blend shapes |
| `ro-RO` | Romanian (Romania) | Viseme ID |
| `ru-RU` | Russian (Russia) | Viseme ID |
| `sk-SK` | Slovak (Slovakia) | Viseme ID |
| `sl-SI` | Slovenian (Slovenia) | Viseme ID |
| `sv-SE` | Swedish (Sweden) | Viseme ID |
| `sw-TZ` | Swahili (Tanzania) | Viseme ID |
| `ta-IN` | Tamil (India) | Viseme ID |
| `ta-LK` | Tamil (Sri Lanka) | Viseme ID |
| `ta-MY` | Tamil (Malaysia) | Viseme ID |
| `ta-SG` | Tamil (Singapore) | Viseme ID |
| `te-IN` | Telugu (India) | Viseme ID |
| `th-TH` | Thai (Thailand) | Viseme ID |
| `tr-TR` | Turkish (Türkiye) | Viseme ID |
| `uk-UA` | Ukrainian (Ukraine) | Viseme ID |
| `ur-IN` | Urdu (India) | Viseme ID |
| `ur-PK` | Urdu (Pakistan) | Viseme ID |
| `vi-VN` | Vietnamese (Vietnam) | Viseme ID |
| `zh-CN` | Chinese (Mandarin, Simplified) | Viseme ID <br> Blend shapes |
| `zh-HK` | Chinese (Cantonese, Traditional) | Viseme ID |
| `zh-HK` | Chinese (Taiwanese Mandarin, Traditional) | Viseme ID (except `zh-TW-HsiaoYuNeural`) |

The table in this section summarizes the 33 supported locales for pronunciation assessment. Each language is available in all [speech-to-text regions](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions#regions). The latest update extends support from English to 32 more languages and quality enhancements to existing features, including accuracy, fluency, and miscue assessment. You should specify the language that you're learning or practicing improving pronunciation. The default language is `en-US`.

If you know your target learning language, [set the locale](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment#get-pronunciation-assessment-results) accordingly. For example, if you're learning British English, you should specify the language as `en-GB`. If you're teaching a broader language, such as Spanish, and you're uncertain about which locale to select, you can run various accent models (`es-ES`, `es-MX`) to determine the one that achieves the highest score to suit your specific scenario.

Expand table

| Language | Locale (BCP-47) |
| --- | --- |
| Arabic (Egypt) | `ar-EG` |
| Arabic (Saudi Arabia) | `ar-SA` |
| Catalan | `ca-ES` |
| Chinese (Cantonese, Traditional) | `zh-HK` |
| Chinese (Mandarin, Simplified) | `zh-CN` |
| Chinese (Taiwanese Mandarin, Traditional) | `zh-TW` |
| Danish (Denmark) | `da-DK` |
| Dutch (Netherlands) | `nl-NL` |
| English (Australia) | `en-AU` |
| English (Canada) | `en-CA` |
| English (India) | `en-IN` |
| English (United Kingdom) | `en-GB` |
| English (United States) | `en-US` |
| Finnish (Finland) | `fi-FI` |
| French (Canada) | `fr-CA` |
| French (France) | `fr-FR` |
| German (Germany) | `de-DE` |
| Hindi (India) | `hi-IN` |
| Italian (Italy) | `it-IT` |
| Japanese (Japan) | `ja-JP` |
| Korean (Korea) | `ko-KR` |
| Malay (Malaysia) | `ms-MY` |
| Norwegian Bokmål (Norway) | `nb-NO` |
| Polish (Poland) | `pl-PL` |
| Portuguese (Brazil) | `pt-BR` |
| Portuguese (Portugal) | `pt-PT` |
| Russian (Russia) | `ru-RU` |
| Spanish (Mexico) | `es-MX` |
| Spanish (Spain) | `es-ES` |
| Swedish (Sweden) | `sv-SE` |
| Tamil (India) | `ta-IN` |
| Thai (Thailand) | `th-TH` |
| Vietnamese (Vietnam) | `vi-VN` |

**In this section**

- [Real-time speech translation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#real-time-speech-translation)
- [Video translation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#video-translation)

Tip

To build and run samples on Visual Studio Code, try the [Azure Speech Toolkit](https://marketplace.visualstudio.com/items?itemName=ms-azureaispeech.azure-ai-speech-toolkit).

[Section titled: Real-time speech translation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#real-time-speech-translation)

### Real-time speech translation

The table in this section summarizes the supported locales for speech translation. Speech translation supports various languages for speech-to-speech and speech-to-text translation. The available target languages depend on whether the translation target is speech or text.

Expand table

| Text language | Language code |
| --- | --- |
| Afrikaans | `af` |
| Albanian | `sq` |
| Amharic | `am` |
| Arabic | `ar` |
| Armenian | `hy` |
| Assamese | `as` |
| Azerbaijani | `az` |
| Bangla | `bn` |
| Bosnian (Latin) | `bs` |
| Bulgarian | `bg` |
| Cantonese (Traditional) | `yue` |
| Catalan | `ca` |
| Chinese (Literary) | `lzh` |
| Chinese Simplified | `zh-Hans` |
| Chinese Traditional | `zh-Hant` |
| Croatian | `hr` |
| Czech | `cs` |
| Danish | `da` |
| Dari | `prs` |
| Dutch | `nl` |
| English | `en` |
| Estonian | `et` |
| Fijian | `fj` |
| Filipino | `fil` |
| Finnish | `fi` |
| French | `fr` |
| French (Canada) | `fr-ca` |
| German | `de` |
| Greek | `el` |
| Gujarati | `gu` |
| Haitian Creole | `ht` |
| Hebrew | `he` |
| Hindi | `hi` |
| Hmong Daw | `mww` |
| Hungarian | `hu` |
| Icelandic | `is` |
| Indonesian | `id` |
| Inuktitut | `iu` |
| Irish | `ga` |
| Italian | `it` |
| Japanese | `ja` |
| Kannada | `kn` |
| Kazakh | `kk` |
| Khmer | `km` |
| Klingon | `tlh-Latn` |
| Klingon (plqaD) | `tlh-Piqd` |
| Korean | `ko` |
| Kurdish (Central) | `ku` |
| Kurdish (Northern) | `kmr` |
| Lao | `lo` |
| Latvian | `lv` |
| Lithuanian | `lt` |
| Malagasy | `mg` |
| Malay | `ms` |
| Malayalam | `ml` |
| Maltese | `mt` |
| Maori | `mi` |
| Marathi | `mr` |
| Myanmar | `my` |
| Nepali | `ne` |
| Norwegian | `nb` |
| Odia | `or` |
| Pashto | `ps` |
| Persian | `fa` |
| Polish | `pl` |
| Portuguese (Brazil) | `pt` |
| Portuguese (Portugal) | `pt-pt` |
| Punjabi | `pa` |
| Queretaro Otomi | `otq` |
| Romanian | `ro` |
| Russian | `ru` |
| Samoan | `sm` |
| Serbian (Cyrillic) | `sr-Cyrl` |
| Serbian (Latin) | `sr-Latn` |
| Slovak | `sk` |
| Slovenian | `sl` |
| Spanish | `es` |
| Swahili | `sw` |
| Swedish | `sv` |
| Tahitian | `ty` |
| Tamil | `ta` |
| Telugu | `te` |
| Thai | `th` |
| Tigrinya | `ti` |
| Tongan | `to` |
| Turkish | `tr` |
| Ukrainian | `uk` |
| Urdu | `ur` |
| Vietnamese | `vi` |
| Welsh | `cy` |
| Yucatec Maya | `yua` |

[Section titled: Translate-from language](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#translate-from-language)

#### Translate-from language

To set the language for input speech recognition, specify the full locale with a dash (`-`) separator. See the [speech-to-text language table](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#supported-languages). All languages are supported, except `jv-ID` and `wuu-CN`. The default language is `en-US` if you don't specify a language.

[Section titled: Translate-to-text language](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#translate-to-text-language)

#### Translate-to-text language

To set the translation target language, you usually specify only the language code that precedes the locale dash (`-`) separator. For example, use `es` for Spanish (Spain) instead of `es-ES`. The default language is `en` if you don't specify a language.

[Section titled: Video translation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#video-translation)

### Video translation

The table in this section summarizes the supported locales for [video translation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/video-translation-overview). Video translation supports various languages for standard (platform) voice and personal voice. The available source and target languages depend on whether the translation source is standard or personal voice.

Expand table

| Locale (BCP-47) | Language | Standard voice source | Standard voice target | Personal voice source | Personal voice target | TTS custom lexicon phoneme target |
| --- | --- | --- | --- | --- | --- | --- |
| `af-ZA` | Afrikaans (South Africa) | Yes | Yes | Yes | No | No |
| `am-ET` | Amharic (Ethiopia) | Yes | Yes | Yes | Yes | No |
| `ar-AE` | Arabic (United Arab Emirates) | Yes | Yes | Yes | No | No |
| `ar-BH` | Arabic (Bahrain) | Yes | Yes | Yes | No | Yes |
| `ar-DZ` | Arabic (Algeria) | Yes | Yes | Yes | No | Yes |
| `ar-EG` | Arabic (Egypt) | Yes | Yes | Yes | Yes | Yes |
| `ar-IQ` | Arabic (Iraq) | Yes | Yes | Yes | No | Yes |
| `ar-JO` | Arabic (Jordan) | Yes | Yes | Yes | No | Yes |
| `ar-KW` | Arabic (Kuwait) | Yes | Yes | Yes | No | Yes |
| `ar-LB` | Arabic (Lebanon) | Yes | Yes | Yes | No | Yes |
| `ar-LY` | Arabic (Libya) | Yes | Yes | Yes | No | Yes |
| `ar-MA` | Arabic (Morocco) | Yes | Yes | Yes | No | Yes |
| `ar-OM` | Arabic (Oman) | Yes | Yes | Yes | No | Yes |
| `ar-QA` | Arabic (Qatar) | Yes | Yes | Yes | No | Yes |
| `ar-SA` | Arabic (Saudi Arabia) | Yes | Yes | Yes | Yes | Yes |
| `ar-SY` | Arabic (Syria) | Yes | Yes | Yes | No | Yes |
| `ar-TN` | Arabic (Tunisia) | Yes | Yes | Yes | No | Yes |
| `ar-YE` | Arabic (Yemen) | Yes | Yes | Yes | No | Yes |
| `as-IN` | Assamese (India) | No | Yes | No | No | No |
| `az-AZ` | Azerbaijani (Latin, Azerbaijan) | Yes | Yes | Yes | No | No |
| `bg-BG` | Bulgarian (Bulgaria) | Yes | Yes | Yes | Yes | Yes |
| `bn-BD` | Bangla (Bangladesh) | No | Yes | No | No | No |
| `bn-IN` | Bengali (India) | Yes | Yes | Yes | Yes | No |
| `bs-BA` | Bosnian (Bosnia and Herzegovina) | Yes | Yes | Yes | Yes | No |
| `ca-ES` | Catalan | Yes | Yes | Yes | Yes | Yes |
| `cs-CZ` | Czech (Czechia) | Yes | Yes | Yes | Yes | Yes |
| `cy-GB` | Welsh (United Kingdom) | Yes | Yes | Yes | No | No |
| `da-DK` | Danish (Denmark) | Yes | Yes | Yes | Yes | Yes |
| `de-AT` | German (Austria) | Yes | Yes | Yes | Yes | Yes |
| `de-CH` | German (Switzerland) | Yes | Yes | Yes | Yes | Yes |
| `de-DE` | German (Germany) | Yes | Yes | Yes | Yes | Yes |
| `el-GR` | Greek (Greece) | Yes | Yes | Yes | Yes | Yes |
| `en-AU` | English (Australia) | Yes | Yes | Yes | Yes | Yes |
| `en-CA` | English (Canada) | Yes | Yes | Yes | Yes | Yes |
| `en-GB` | English (United Kingdom) | Yes | Yes | Yes | Yes | Yes |
| `en-HK` | English (Hong Kong SAR) | Yes | Yes | Yes | No | Yes |
| `en-IE` | English (Ireland) | Yes | Yes | Yes | Yes | Yes |
| `en-IN` | English (India) | Yes | Yes | Yes | Yes | Yes |
| `en-KE` | English (Kenya) | Yes | Yes | Yes | No | Yes |
| `en-NG` | English (Nigeria) | Yes | Yes | Yes | No | Yes |
| `en-NZ` | English (New Zealand) | Yes | Yes | Yes | No | Yes |
| `en-PH` | English (Philippines) | Yes | Yes | Yes | No | Yes |
| `en-SG` | English (Singapore) | Yes | Yes | Yes | No | Yes |
| `en-TZ` | English (Tanzania) | Yes | Yes | Yes | No | Yes |
| `en-US` | English (United States) | Yes | Yes | Yes | Yes | Yes |
| `en-ZA` | English (South Africa) | Yes | Yes | Yes | No | Yes |
| `es-AR` | Spanish (Argentina) | Yes | Yes | Yes | No | Yes |
| `es-BO` | Spanish (Bolivia) | Yes | Yes | Yes | No | Yes |
| `es-CL` | Spanish (Chile) | Yes | Yes | Yes | No | Yes |
| `es-CO` | Spanish (Colombia) | Yes | Yes | Yes | No | Yes |
| `es-CR` | Spanish (Costa Rica) | Yes | Yes | Yes | No | Yes |
| `es-CU` | Spanish (Cuba) | Yes | Yes | Yes | No | Yes |
| `es-DO` | Spanish (Dominican Republic) | Yes | Yes | Yes | No | Yes |
| `es-EC` | Spanish (Ecuador) | Yes | Yes | Yes | No | Yes |
| `es-ES` | Spanish (Spain) | Yes | Yes | Yes | Yes | Yes |
| `es-GQ` | Spanish (Equatorial Guinea) | Yes | Yes | Yes | No | Yes |
| `es-GT` | Spanish (Guatemala) | Yes | Yes | Yes | No | Yes |
| `es-HN` | Spanish (Honduras) | Yes | Yes | Yes | No | Yes |
| `es-MX` | Spanish (Mexico) | Yes | Yes | Yes | Yes | Yes |
| `es-NI` | Spanish (Nicaragua) | Yes | Yes | Yes | No | Yes |
| `es-PA` | Spanish (Panama) | Yes | Yes | Yes | No | Yes |
| `es-PE` | Spanish (Peru) | Yes | Yes | Yes | No | Yes |
| `es-PR` | Spanish (Puerto Rico) | Yes | Yes | Yes | No | Yes |
| `es-PY` | Spanish (Paraguay) | Yes | Yes | Yes | No | Yes |
| `es-SV` | Spanish (El Salvador) | Yes | Yes | Yes | No | Yes |
| `es-US` | Spanish (United States) | Yes | Yes | Yes | No | Yes |
| `es-UY` | Spanish (Uruguay) | Yes | Yes | Yes | No | Yes |
| `es-VE` | Spanish (Venezuela) | Yes | Yes | Yes | No | Yes |
| `et-EE` | Estonian (Estonia) | Yes | Yes | Yes | Yes | No |
| `eu-ES` | Basque | Yes | Yes | Yes | Yes | No |
| `fa-IR` | Persian (Iran) | Yes | Yes | Yes | No | No |
| `fi-FI` | Finnish (Finland) | Yes | Yes | Yes | Yes | Yes |
| `fil-PH` | Filipino (Philippines) | Yes | Yes | Yes | Yes | No |
| `fr-BE` | French (Belgium) | Yes | Yes | Yes | Yes | Yes |
| `fr-CA` | French (Canada) | Yes | Yes | Yes | Yes | Yes |
| `fr-CH` | French (Switzerland) | Yes | Yes | Yes | Yes | Yes |
| `fr-FR` | French (France) | Yes | Yes | Yes | Yes | Yes |
| `ga-IE` | Irish (Ireland) | Yes | Yes | Yes | No | No |
| `gl-ES` | Galician | Yes | Yes | Yes | Yes | No |
| `gu-IN` | Gujarati (India) | Yes | Yes | Yes | No | No |
| `he-IL` | Hebrew (Israel) | Yes | Yes | Yes | Yes | Yes |
| `hi-IN` | Hindi (India) | Yes | Yes | Yes | Yes | Yes |
| `hr-HR` | Croatian (Croatia) | Yes | Yes | Yes | Yes | Yes |
| `hu-HU` | Hungarian (Hungary) | Yes | Yes | Yes | Yes | Yes |
| `hy-AM` | Armenian (Armenia) | Yes | Yes | Yes | No | No |
| `id-ID` | Indonesian (Indonesia) | Yes | Yes | Yes | Yes | Yes |
| `is-IS` | Icelandic (Iceland) | Yes | Yes | Yes | No | No |
| `it-IT` | Italian (Italy) | Yes | Yes | Yes | Yes | Yes |
| `iu-CANS-CA` | Inuktitut (Syllabics, Canada) | No | No | No | No | No |
| `iu-LATN-CA` | Inuktitut (Latin, Canada) | No | No | No | No | No |
| `ja-JP` | Japanese (Japan) | Yes | Yes | Yes | Yes | Yes |
| `jv-ID` | Javanese (Latin, Indonesia) | Yes | Yes | Yes | Yes | No |
| `ka-GE` | Georgian (Georgia) | Yes | Yes | Yes | No | No |
| `kk-KZ` | Kazakh (Kazakhstan) | Yes | Yes | Yes | No | No |
| `km-KH` | Khmer (Cambodia) | Yes | Yes | Yes | No | No |
| `kn-IN` | Kannada (India) | Yes | Yes | Yes | No | No |
| `ko-KR` | Korean (Korea) | Yes | Yes | Yes | Yes | Yes |
| `lo-LA` | Lao (Laos) | Yes | Yes | Yes | No | No |
| `lt-LT` | Lithuanian (Lithuania) | Yes | Yes | Yes | No | No |
| `lv-LV` | Latvian (Latvia) | Yes | Yes | Yes | No | No |
| `mk-MK` | Macedonian (North Macedonia) | Yes | Yes | Yes | Yes | No |
| `ml-IN` | Malayalam (India) | Yes | Yes | Yes | No | No |
| `mn-MN` | Mongolian (Mongolia) | Yes | Yes | Yes | No | No |
| `mr-IN` | Marathi (India) | Yes | Yes | Yes | No | No |
| `ms-MY` | Malay (Malaysia) | Yes | Yes | Yes | Yes | Yes |
| `mt-MT` | Maltese (Malta) | Yes | Yes | Yes | No | No |
| `my-MM` | Burmese (Myanmar) | Yes | Yes | Yes | No | No |
| `nb-NO` | Norwegian Bokmål (Norway) | Yes | Yes | Yes | Yes | Yes |
| `ne-NP` | Nepali (Nepal) | Yes | Yes | Yes | Yes | No |
| `nl-BE` | Dutch (Belgium) | Yes | Yes | Yes | Yes | Yes |
| `nl-NL` | Dutch (Netherlands) | Yes | Yes | Yes | Yes | Yes |
| `or-IN` | Odia (India) | No | Yes | No | No | No |
| `pa-IN` | Punjabi (India) | No | Yes | No | No | No |
| `pl-PL` | Polish (Poland) | Yes | Yes | Yes | Yes | Yes |
| `ps-AF` | Pashto (Afghanistan) | Yes | Yes | Yes | Yes | No |
| `pt-BR` | Portuguese (Brazil) | Yes | Yes | Yes | Yes | Yes |
| `pt-PT` | Portuguese (Portugal) | Yes | Yes | Yes | Yes | Yes |
| `ro-RO` | Romanian (Romania) | Yes | Yes | Yes | Yes | Yes |
| `ru-RU` | Russian (Russia) | Yes | Yes | Yes | Yes | Yes |
| `si-LK` | Sinhala (Sri Lanka) | Yes | Yes | Yes | No | No |
| `sk-SK` | Slovak (Slovakia) | Yes | Yes | Yes | Yes | Yes |
| `sl-SI` | Slovenian (Slovenia) | Yes | Yes | Yes | Yes | Yes |
| `so-SO` | Somali (Somalia) | Yes | Yes | Yes | No | No |
| `sq-AL` | Albanian (Albania) | Yes | Yes | Yes | No | No |
| `sr-LATN-RS` | Serbian (Latin, Serbia) | No | No | No | No | No |
| `sr-RS` | Serbian (Cyrillic, Serbia) | Yes | Yes | Yes | No | No |
| `su-ID` | Sundanese (Indonesia) | Yes | Yes | Yes | No | No |
| `sv-SE` | Swedish (Sweden) | Yes | Yes | Yes | Yes | Yes |
| `sw-KE` | Kiswahili (Kenya) | Yes | Yes | Yes | Yes | No |
| `sw-TZ` | Kiswahili (Tanzania) | Yes | Yes | Yes | No | No |
| `ta-IN` | Tamil (India) | Yes | Yes | Yes | Yes | Yes |
| `ta-LK` | Tamil (Sri Lanka) | No | Yes | No | No | Yes |
| `ta-MY` | Tamil (Malaysia) | No | Yes | No | No | Yes |
| `ta-SG` | Tamil (Singapore) | No | Yes | No | No | Yes |
| `te-IN` | Telugu (India) | Yes | Yes | Yes | Yes | Yes |
| `th-TH` | Thai (Thailand) | Yes | Yes | Yes | Yes | Yes |
| `tr-TR` | Turkish (Türkiye) | Yes | Yes | Yes | Yes | Yes |
| `uk-UA` | Ukrainian (Ukraine) | Yes | Yes | Yes | Yes | No |
| `ur-IN` | Urdu (India) | No | Yes | No | No | No |
| `ur-PK` | Urdu (Pakistan) | No | Yes | No | No | No |
| `uz-UZ` | Uzbek (Latin, Uzbekistan) | Yes | Yes | Yes | No | No |
| `vi-VN` | Vietnamese (Vietnam) | Yes | Yes | Yes | Yes | Yes |
| `wuu-CN` | Chinese (Wu, Simplified) | No | No | No | No | No |
| `yue-CN` | Chinese (Cantonese, Simplified) | Yes | Yes | Yes | No | No |
| `zh-CN` | Chinese (Mandarin, Simplified) | Yes | Yes | Yes | Yes | Yes |
| `zh-CN-GUANGXI` | Chinese (Guangxi Accent Mandarin, Simplified) | Yes | Yes | Yes | No | No |
| `zh-CN-henan` | Chinese (Zhongyuan Mandarin Henan, Simplified) | No | No | No | No | No |
| `zh-CN-liaoning` | Chinese (Northeastern Mandarin, Simplified) | No | No | No | No | No |
| `zh-CN-shaanxi` | Chinese (Zhongyuan Mandarin Shaanxi, Simplified) | No | No | No | No | No |
| `zh-CN-shandong` | Chinese (Jilu Mandarin, Simplified) | No | No | No | No | No |
| `zh-CN-sichuan` | Chinese (Southwestern Mandarin, Simplified) | No | No | No | No | No |
| `zh-HK` | Chinese (Cantonese, Traditional) | Yes | Yes | Yes | Yes | Yes |
| `zh-TW` | Chinese (Taiwanese Mandarin, Traditional) | Yes | Yes | Yes | Yes | Yes |
| `zu-ZA` | isiZulu (South Africa) | Yes | Yes | Yes | Yes | No |

The table in this section summarizes the supported locales for [language identification](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-identification).

Important

Language Identification compares speech at the language level, such as English and German. Don't include multiple locales of the same language in your candidate list.

Expand table

| Language | Locales (BCP-47) |
| --- | --- |
| Afrikaans | `af-ZA` |
| Albanian | `sq-AL` |
| Amharic | `am-ET` |
| Arabic | `ar-AE`<br>`ar-BH`<br>`ar-DZ`<br>`ar-EG`<br>`ar-IL`<br>`ar-IQ`<br>`ar-JO`<br>`ar-KW`<br>`ar-LB`<br>`ar-LY`<br>`ar-MA`<br>`ar-OM`<br>`ar-PS`<br>`ar-QA`<br>`ar-SA`<br>`ar-SY`<br>`ar-TN`<br>`ar-YE` |
| Armenian | `hy-AM` |
| Assamese | `as-IN` |
| Azerbaijani | `az-AZ` |
| Basque | `eu-ES` |
| Bengali | `bn-IN` |
| Bhojpuri | `bho-IN` |
| Bosnian | `bs-BA` |
| Bulgarian | `bg-BG` |
| Burmese | `my-MM` |
| Catalan | `ca-ES` |
| Chinese | `wuu-CN`<br>`yue-CN`<br>`zh-CN`<br>`zh-CN-shandong`<br>`zh-CN-sichuan`<br>`zh-HK`<br>`zh-TW` |
| Croatian | `hr-HR` |
| Czech | `cs-CZ` |
| Danish | `da-DK` |
| Dutch | `nl-BE`<br>`nl-NL` |
| English | `en-AU`<br>`en-CA`<br>`en-GB`<br>`en-GH`<br>`en-HK`<br>`en-IE`<br>`en-IN`<br>`en-KE`<br>`en-NG`<br>`en-NZ`<br>`en-PH`<br>`en-SG`<br>`en-TZ`<br>`en-US`<br>`en-ZA` |
| Estonian | `et-EE` |
| Filipino | `fil-PH` |
| Finnish | `fi-FI` |
| French | `fr-BE`<br>`fr-CA`<br>`fr-CH`<br>`fr-FR` |
| Galician | `gl-ES` |
| Georgian | `ka-GE` |
| German | `de-AT`<br>`de-CH`<br>`de-DE` |
| Greek | `el-GR` |
| Gujarati | `gu-IN` |
| Hebrew | `he-IL` |
| Hindi | `hi-IN` |
| Hungarian | `hu-HU` |
| Icelandic | `is-IS` |
| Indonesian | `id-ID` |
| Irish | `ga-IE` |
| isiZulu | `zu-ZA` |
| Italian | `it-CH`<br>`it-IT` |
| Japanese | `ja-JP` |
| Javanese | `jv-ID` |
| Kannada | `kn-IN` |
| Kazakh | `kk-KZ` |
| Khmer | `km-KH` |
| Kiswahili | `sw-KE`<br>`sw-TZ` |
| Korean | `ko-KR` |
| Lao | `lo-LA` |
| Latvian | `lv-LV` |
| Lithuanian | `lt-LT` |
| Macedonian | `mk-MK` |
| Malay | `ml-IN`<br>`ms-MY` |
| Malayalam | `ml-IN` |
| Maltese | `mt-MT` |
| Marathi | `mr-IN` |
| Mongolian | `mn-MN` |
| Nepali | `ne-NP` |
| Norwegian Bokmål | `nb-NO` |
| Odia | `or-IN` |
| Pashto | `ps-AF` |
| Persian | `fa-IR` |
| Polish | `pl-PL` |
| Portuguese | `pt-BR`<br>`pt-PT` |
| Punjabi | `pa-IN` |
| Romanian | `ro-RO` |
| Russian | `ru-RU` |
| Serbian | `sr-ME`<br>`sr-RS`<br>`sr-XK` |
| Sinhala | `si-LK` |
| Slovak | `sk-SK` |
| Slovenian | `sl-SI` |
| Somali | `so-SO` |
| Spanish | `es-AR`<br>`es-BO`<br>`es-CL`<br>`es-CO`<br>`es-CR`<br>`es-CU`<br>`es-DO`<br>`es-EC`<br>`es-ES`<br>`es-GQ`<br>`es-GT`<br>`es-HN`<br>`es-MX`<br>`es-NI`<br>`es-PA`<br>`es-PE`<br>`es-PR`<br>`es-PY`<br>`es-SV`<br>`es-US`<br>`es-UY`<br>`es-VE` |
| Swedish | `sv-SE` |
| Tamil | `ta-IN` |
| Telugu | `te-IN` |
| Thai | `th-TH` |
| Turkish | `tr-TR` |
| Ukrainian | `uk-UA` |
| Urdu | `ur-IN` |
| Uzbek | `uz-UZ` |
| Vietnamese | `vi-VN` |
| Welsh | `cy-GB` |

The following table summarizes the supported locales for custom keyword and keyword verification.

Expand table

| Language | Locale (BCP-47) | Custom keyword | Keyword verification |
| --- | --- | --- | --- |
| Chinese (Mandarin, Simplified) | `zh-CN` | Yes | Yes |
| English (United States) | `en-US` | Yes | Yes |
| Japanese (Japan) | `ja-JP` | No | Yes |
| Portuguese (Brazil) | `pt-BR` | No | Yes |

[Section titled: Related content](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#related-content)

## Related content

- [Region support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions)

**Note:** The author created this article with assistance from AI. [Learn more](https://learn.microsoft.com/principles-for-ai-generated-content)

* * *

## Feedback

Was this page helpful?


YesNoNo

Need help with this topic?


Want to try using Ask Learn to clarify or guide you through this topic?


Ask LearnAsk Learn

Suggest a fix?

* * *

## Additional resources

Training

Module

[Create speech-enabled apps with Azure Speech in Microsoft Foundry Tools - Training](https://learn.microsoft.com/en-us/training/modules/create-speech-enabled-apps/?source=recommendations)

Create speech-enabled apps with Azure Speech in Microsoft Foundry Tools.

* * *

- Last updated on 09/09/2026

Reading mode disabled

Ask Learn is an AI assistant that can answer questions, clarify concepts, and define terms using trusted Microsoft documentation.

Please sign in to use Ask Learn.

[Sign in](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#)