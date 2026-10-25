Source: https://docs.speechmatics.com/speech-to-text/realtime/output
Title: Output – Realtime | Speechmatics Docs
Fetched: 2026-10-05T15:27:06.117Z

For AI agents: a documentation index is available at /llms.txt. Markdown versions of all pages can be requested by appending \`.md\` to the URL, or by setting the \`Accept\` header to \`text/markdown\`.

[Skip to main content](https://docs.speechmatics.com/speech-to-text/realtime/output#__docusaurus_skipToContent_fallback)

Speech to TextRealtime transcription

Copy page

On this page

The Realtime API returns transcription output, and other information through a variety of messages, see [Received Messages](https://docs.speechmatics.com/api-ref/realtime-transcription-websocket#received-messages).

Which messages are returned, and how frequently, depends on how the session is configured in the [StartRecognition](https://docs.speechmatics.com/api-ref/realtime-transcription-websocket#startrecognition) message.

## Latency [​](https://docs.speechmatics.com/speech-to-text/realtime/output\#latency "Direct link to Latency")

When transcribing in real-time, you can control the maximum time to wait for the final transcript. This could be as fast as 0.7 seconds, though allowing a longer time will give a slight accuracy improvement.

For even faster output, use [Partial transcripts](https://docs.speechmatics.com/speech-to-text/realtime/output#partial-transcripts) to receive transcription output before higher-accuracy final transcripts are returned.

### Configuration example [​](https://docs.speechmatics.com/speech-to-text/realtime/output\#configuration-example "Direct link to Configuration example")

The following example shows a typical configuration for low latency applications. Include this in the [StartRecognition](https://docs.speechmatics.com/api-ref/realtime-transcription-websocket#startrecognition) message.

```json
{
  "type": "transcription",
  "transcription_config": {
    "language": "en",
    "model": "enhanced",
    "max_delay": 0.7,
    "max_delay_mode": "flexible",
    "enable_partials": true,

  }
}
```

- `max_delay` (Number): Optional. Allowed between 0.7 and 4 seconds. Default is 4 seconds. This is the delay in seconds between the end of a spoken word and returning the Final transcript results. Note that there is a very small amount of additional latency while the server is sending the transcript to the client.
- `max_delay_mode` (String): Optional. Allowed values are `fixed` and `flexible`. Default is `flexible`. This allows some additional time for [Smart formatting](https://docs.speechmatics.com/speech-to-text/realtime/output#smart-formatting).
- `enable_partials` (Boolean): Default is false. Whether or not to receive [Partial transcripts](https://docs.speechmatics.com/speech-to-text/realtime/output#partial-transcripts) before the Final transcripts are received.

## Accuracy/Latency trade-offs [​](https://docs.speechmatics.com/speech-to-text/realtime/output\#accuracylatency-trade-offs "Direct link to Accuracy/Latency trade-offs")

We recommend experimenting with different settings for the `max_delay` to find the right trade-off between accuracy and latency for your application.

Based on our own testing and experience, we can offer a few guidelines on `max_delay` settings to get you started:

- **0.7 - 1.5 seconds**: For use cases where an ultra-fast response is needed such as voice agents. This gives a minor accuracy degradation of less than 5% relative to the Batch transcription service.
- **2.0 seconds**: Recommended for most use cases, needing the optimal trade-off between acccuracy and latency, such as captioning or contact centres. This gives a negligible degradation of around 1% relative to the Batch transcription service.
- **4.0 seconds**: For use cases where accuracy is more important than latency, such as legal transcription. This gives accuracy equivalent to our Batch transcription service. You can also use Partial transcripts to give users early feedback of the recognized text.

## Partial transcripts [​](https://docs.speechmatics.com/speech-to-text/realtime/output\#partial-transcripts "Direct link to Partial transcripts")

Partial transcripts allow you to receive preliminary transcription and update as more context is available until the higher-accuracy [Finals](https://docs.speechmatics.com/api-ref/realtime-transcription-websocket#addtranscript) are returned. Typically Partials are returned in less than 500 milliseconds. Partials latency is not affected by the `max_delay` setting.

[Partial transcripts](https://docs.speechmatics.com/api-ref/realtime-transcription-websocket#addpartialtranscript) are enabled using the `enable_partials` config option. For example:

```json
{
  "type": "transcription",
  "transcription_config": {
    "language": "en",
    "model": "enhanced",
    "max_delay": 2,
    "enable_partials": true,
  }
}
```

On each Final transcript you will immediately receive a Partial transcript with any remaining words which have not been finalized.

Note that Partial transcripts have some limitations:

- Accuracy is usually 10-25% lower than the Final transcript. This includes punctuation and capitalization of words.
- The `confidence` field for Partial transcripts has no meaning and should not be relied on.

## Smart formatting [​](https://docs.speechmatics.com/speech-to-text/realtime/output\#smart-formatting "Direct link to Smart formatting")

[Smart formatting](https://docs.speechmatics.com/speech-to-text/formatting#smart-formatting) ensures readability of your transcripts by formatting numbers, dates, currencies and other important _entities_ into their written form.

When the `max_delay_mode` is set to `flexible`, and an entity is being spoken, the Final transcript would be delayed until the entity is fully spoken to enable proper formatting. This option should be used in most use-cases for improved accuracy and readability for numbers, currencies, and dates.

If you have strict latency requirements, and prefer not to wait for entity formatting to complete, set `max_delay_mode` to `fixed`. Note that in this mode, there will be some reduction in accuracy and readability for numbers, currencies, and dates.

## Example outputs (partials and finals) [​](https://docs.speechmatics.com/speech-to-text/realtime/output\#example-outputs-partials-and-finals "Direct link to Example outputs (partials and finals)")

With only `Finals` and default `max_delay_mode`, messages received could look like the following:

- **(Final)**: I am 35.

**Final output**: I am 35.

With `Partials` enabled and default `max_delay_mode`, messages received could look like the following:

- **(Partial)**: I
- **(Partial)**: I am
- **(partial)**: I am third
- **(Partial)**: I am 30
- **(Final)**: I am 35.

**Final output**: I am 35.

With `Partials` enabled and `max_delay_mode` as `fixed`, messages received could look like the following:

- **(Partial)**: I
- **(Final)**: I am
- **(partial)**: third
- **(Final)**: 30
- **(Partial)**: five
- **(Final)**: five.

**Final output**: I am 30 five.

## App usage tracking [​](https://docs.speechmatics.com/speech-to-text/realtime/output\#app-usage-tracking "Direct link to App usage tracking")

First, please contact [Support](https://support.speechmatics.com/) to enable this feature.

For integrations where customers use their own Speechmatics API keys, gain insights into application usage by aggregating data on unique users, processing hours, languages used, and more.

Once enabled, use the `sm-app` query parameter in the connection string when starting a session. For example:

```bash
wss://eu.rt.speechmatics.com/v2?sm-app=YourAppID
```

- [Latency](https://docs.speechmatics.com/speech-to-text/realtime/output#latency)
  - [Configuration example](https://docs.speechmatics.com/speech-to-text/realtime/output#configuration-example)
- [Accuracy/Latency trade-offs](https://docs.speechmatics.com/speech-to-text/realtime/output#accuracylatency-trade-offs)
- [Partial transcripts](https://docs.speechmatics.com/speech-to-text/realtime/output#partial-transcripts)
- [Smart formatting](https://docs.speechmatics.com/speech-to-text/realtime/output#smart-formatting)
- [Example outputs (partials and finals)](https://docs.speechmatics.com/speech-to-text/realtime/output#example-outputs-partials-and-finals)
- [App usage tracking](https://docs.speechmatics.com/speech-to-text/realtime/output#app-usage-tracking)

![Project Logo](https://docs.speechmatics.com/img/logo.svg)

Ask AI

reCAPTCHA

Recaptcha requires verification.

protected by **reCAPTCHA**