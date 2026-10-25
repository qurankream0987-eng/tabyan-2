Source: https://docs.cloud.google.com/speech-to-text/docs/reference/rest/v2/StreamingRecognitionResult
Title: StreamingRecognitionResult  |  Cloud Speech-to-Text  |  Google Cloud Documentation
Fetched: 2026-10-05T15:31:19.715Z

[Skip to main content](https://docs.cloud.google.com/speech-to-text/docs/reference/rest/v2/StreamingRecognitionResult#main-content)

[![Google Cloud Documentation](https://www.gstatic.com/devrel-devsite/prod/vfdb441d2e08dbd9d3e48d8cd72b242388a87bcf7626bf5fb9df50c2bdd4a70fd/clouddocs/images/lockup_full_color.svg)](https://docs.cloud.google.com/)

`/`

[Console](https://console.cloud.google.com/)

- English
- Deutsch
- Español – América Latina
- Français
- Português – Brasil
- 中文 – 简体
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
- [Reference](https://docs.cloud.google.com/speech-to-text/docs/apis)



 Send feedback



# StreamingRecognitionResult    Stay organized with collections      Save and categorize content based on your preferences.

- [JSON representation](https://docs.cloud.google.com/speech-to-text/docs/reference/rest/v2/StreamingRecognitionResult#SCHEMA_REPRESENTATION)

A streaming speech recognition result corresponding to a portion of the audio that is currently being processed.

| JSON representation |
| --- |
| ```<br>{<br>  "alternatives": [<br>    {<br>      object (SpeechRecognitionAlternative)<br>    }<br>  ],<br>  "isFinal": boolean,<br>  "stability": number,<br>  "resultEndOffset": string,<br>  "channelTag": integer,<br>  "languageCode": string<br>}<br>``` |

| Fields |
| --- |
| `alternatives[]` | `object (SpeechRecognitionAlternative)`<br>May contain one or more recognition hypotheses. These alternatives are ordered in terms of accuracy, with the top (first) alternative being the most probable, as ranked by the recognizer. |
| `isFinal` | `boolean`<br>If `false`, this `StreamingRecognitionResult` represents an interim result that may change. If `true`, this is the final time the speech service will return this particular `StreamingRecognitionResult`, the recognizer will not return any further hypotheses for this portion of the transcript and corresponding audio. |
| `stability` | `number`<br>An estimate of the likelihood that the recognizer will not change its guess about this interim result. Values range from 0.0 (completely unstable) to 1.0 (completely stable). This field is only provided for interim results (`isFinal`=`false`). The default of 0.0 is a sentinel value indicating `stability` was not set. |
| `resultEndOffset` | `string (Duration format)`<br>Time offset of the end of this result relative to the beginning of the audio.<br>A duration in seconds with up to nine fractional digits, ending with '`s`'. Example: `"3.5s"`. |
| `channelTag` | `integer`<br>For multi-channel audio, this is the channel number corresponding to the recognized result for the audio from that channel. For `audioChannelCount` = `N`, its output values can range from `1` to `N`. |
| `languageCode` | `string`<br>Output only. The [BCP-47](https://www.rfc-editor.org/rfc/bcp/bcp47.txt) language tag of the language in this result. This language code was detected to have the most likelihood of being spoken in the audio. |



 Send feedback



Except as otherwise noted, the content of this page is licensed under the [Creative Commons Attribution 4.0 License](https://creativecommons.org/licenses/by/4.0/), and code samples are licensed under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0). For details, see the [Google Developers Site Policies](https://developers.google.com/site-policies). Java is a registered trademark of Oracle and/or its affiliates.

Last updated 2025-10-23 UTC.


Need to tell us more?






\[\[\["Easy to understand","easyToUnderstand","thumb-up"\],\["Solved my problem","solvedMyProblem","thumb-up"\],\["Other","otherUp","thumb-up"\]\],\[\["Hard to understand","hardToUnderstand","thumb-down"\],\["Incorrect information or sample code","incorrectInformationOrSampleCode","thumb-down"\],\["Missing the information/samples I need","missingTheInformationSamplesINeed","thumb-down"\],\["Other","otherDown","thumb-down"\]\],\["Last updated 2025-10-23 UTC."\],\[\],\[\]\]