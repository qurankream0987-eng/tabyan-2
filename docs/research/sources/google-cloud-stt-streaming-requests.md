Source: https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests
Title: Cloud Speech-to-Text overview  |  Google Cloud Documentation
Fetched: 2026-10-05T15:31:05.491Z

[Skip to main content](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#main-content)

[![Google Cloud Documentation](https://www.gstatic.com/devrel-devsite/prod/vfdb441d2e08dbd9d3e48d8cd72b242388a87bcf7626bf5fb9df50c2bdd4a70fd/clouddocs/images/lockup_full_color.svg)](https://docs.cloud.google.com/)

`/`

[Console](https://console.cloud.google.com/)Language

- [English](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests)
- [Deutsch](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests?hl=de)
- [Español](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests?hl=es)
- [Español – América Latina](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests?hl=es-419)
- [Français](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests?hl=fr)
- [Indonesia](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests?hl=id)
- [Italiano](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests?hl=it)
- [Português](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests?hl=pt)
- [Português – Brasil](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests?hl=pt-br)
- [עברית](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests?hl=he)
- [中文 – 简体](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests?hl=zh-cn)
- [中文 – 繁體](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests?hl=zh-tw)
- [日本語](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests?hl=ja)
- [한국어](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests?hl=ko)

Sign in

[![](https://docs.cloud.google.com/_static/clouddocs/images/icons/categories/ai-and-machine-learning-color.svg)](https://docs.cloud.google.com/speech-to-text/docs)

- [AI and ML](https://docs.cloud.google.com/docs/ai-ml)
- [Cloud Speech-to-Text](https://docs.cloud.google.com/speech-to-text/docs)

[Start free](https://console.cloud.google.com/freetrial)

- On this page
- [Speech requests](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#speech_requests)
- [Cloud Speech-to-Text API recognition](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#synchronous-recognition)
  - [Synchronous Speech Recognition Requests](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#synchronous-requests)
  - [Sample rates](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#sample-rates)
  - [Languages](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#languages)
  - [Time offsets (timestamps)](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#time-offsets)
  - [Model selection](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#select-model)
  - [Embedded audio content](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#embedded-audio)
  - [Pass audio referenced by a URI](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#uri-audio)
- [Cloud Speech-to-Text API responses](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#api-responses)
  - [Select alternatives](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#select_alternatives)
  - [Handling transcriptions](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#transcriptions)
  - [Confidence values](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#confidence-values)
- [Asynchronous Requests and Responses](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#async-responses)
- [Streaming Cloud Speech-to-Text API Recognition Requests](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#streaming-recognition)
  - [Streaming requests](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#streaming-requests)
  - [Streaming responses](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#streaming_responses)

New Cloud Speech-to-Text users should use the [V2 API](https://docs.cloud.google.com/speech-to-text/docs). Read our [migration guide](https://docs.cloud.google.com/speech-to-text/docs/migration) to learn how to migrate existing projects to the latest version.


- [Home](https://docs.cloud.google.com/)
- [Documentation](https://docs.cloud.google.com/docs)
- [AI and ML](https://docs.cloud.google.com/docs/ai-ml)
- [Cloud Speech-to-Text](https://docs.cloud.google.com/speech-to-text/docs)
- [Guides](https://docs.cloud.google.com/speech-to-text/docs/v1)



 Send feedback



# Cloud Speech-to-Text overview    Stay organized with collections      Save and categorize content based on your preferences.

- On this page
- [Speech requests](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#speech_requests)
- [Cloud Speech-to-Text API recognition](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#synchronous-recognition)
  - [Synchronous Speech Recognition Requests](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#synchronous-requests)
  - [Sample rates](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#sample-rates)
  - [Languages](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#languages)
  - [Time offsets (timestamps)](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#time-offsets)
  - [Model selection](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#select-model)
  - [Embedded audio content](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#embedded-audio)
  - [Pass audio referenced by a URI](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#uri-audio)
- [Cloud Speech-to-Text API responses](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#api-responses)
  - [Select alternatives](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#select_alternatives)
  - [Handling transcriptions](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#transcriptions)
  - [Confidence values](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#confidence-values)
- [Asynchronous Requests and Responses](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#async-responses)
- [Streaming Cloud Speech-to-Text API Recognition Requests](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#streaming-recognition)
  - [Streaming requests](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#streaming-requests)
  - [Streaming responses](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#streaming_responses)

This document is a guide to the basics of using Cloud Speech-to-Text.
This conceptual guide covers the types of requests you can make
to Cloud STT, how to construct those requests, and how to
handle their responses. We recommend that all users of Cloud STT
read this guide and one of the associated tutorials before diving into
the API itself.

## Try it for yourself

If you're new to Google Cloud, create an account to evaluate how
Cloud STT performs in real-world
scenarios. New customers also get $300 in free credits to run, test, and
deploy workloads.


[Try Cloud STT free](https://console.cloud.google.com/freetrial)

## Speech requests

Cloud STT has three main methods to perform speech recognition:

- **Synchronous recognition** (REST and gRPC) sends audio data to the Cloud Speech-to-Text API,
performs recognition on that data, and returns results after all audio
has been processed. Synchronous recognition requests are limited to audio
data of 1 minute or less in duration.

- **Asynchronous Recognition** (REST and gRPC) sends audio data to the Cloud Speech-to-Text API
and initiates a _Long-Running Operation_. Using this operation, you can
periodically poll for recognition results. Use asynchronous requests for
audio data of any duration up to 480 minutes.

- **Streaming Recognition** (gRPC only) performs recognition on audio data
provided within a
[gRPC bi-directional stream](http://www.grpc.io/docs/guides/concepts.html#bidirectional-streaming-rpc).
Streaming requests are designed for real-time recognition purposes, such as
capturing live audio from a microphone. Streaming recognition provides
interim results while audio is being captured, allowing result to appear,
for example, while a user is still speaking.


Requests contain configuration parameters as well as audio data. The following
sections describe these type of recognition requests, the responses they
generate, and how to handle those responses in more detail.

## Cloud Speech-to-Text API recognition

A Cloud Speech-to-Text API synchronous recognition request is the simplest method for
performing recognition on speech audio data. Cloud STT can process up to
1 minute of speech audio data sent in a synchronous request. After Cloud STT
processes and recognizes all of the audio, it returns a response.

A synchronous request is blocking, meaning that Cloud STT must
return a response before processing the next request. Cloud STT
typically processes audio faster than realtime, processing 30 seconds of audio
in 15 seconds on average. In cases of poor audio quality, your recognition
request can take significantly longer.

### Synchronous Speech Recognition Requests

A synchronous Cloud Speech-to-Text API request consists of a speech recognition configuration,
and audio data. For example:

```
{
    "config": {
        "encoding": "LINEAR16",
        "sampleRateHertz": 16000,
        "languageCode": "en-US",
    },
    "audio": {
        "uri": "gs://bucket-name/path_to_audio_file"
    }
}
```

All Cloud Speech-to-Text API synchronous recognition requests must include a speech recognition
`config` field (of type
[RecognitionConfig](https://docs.cloud.google.com/speech-to-text/docs/reference/rest/v1/RecognitionConfig)). A
`RecognitionConfig` contains the following sub-fields:

- `encoding`: Required. Specifies the encoding scheme of the supplied
audio (of type `AudioEncoding`). If you have a choice in codec, prefer
a lossless encoding such as FLAC or `LINEAR16` for best performance.
(For more information, see [Audio Encodings](https://docs.cloud.google.com/speech-to-text/docs/v1/encoding#audio-encodings).)
The `encoding` field is optional for FLAC and WAV files where the
encoding is included in the file header.
- `sampleRateHertz`: Required. Specifies the sample rate (in Hertz) of the
supplied audio. (For more information on sample rates, see
[Sample Rates](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#sample-rates) below.)
The `sampleRateHertz` field is optional for FLAC and WAV files where the
sample rate is included in the file header.
- `languageCode`: Required. Contains the language plus the region or locale to use for
speech recognition of the supplied audio. The language code must be a
[BCP-47](https://www.rfc-editor.org/info/bcp47) identifier.
Note that language codes typically
consist of primary language tags and secondary region subtags to indicate
dialects (for example, 'en' for English and 'US' for the United States in
the preceding example.) (For a list of supported languages, see
[Supported Languages](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-supported-languages).)
- `maxAlternatives`: Optional, defaults to `1`. Indicates the number of
alternative transcriptions to provide in the response. By default, the
Cloud Speech-to-Text API provides one primary transcription. If you want to evaluate
different alternatives, set `maxAlternatives` to a higher value. Note that
Cloud STT will only return alternatives if the recognizer determines
alternatives to be of sufficient quality; in general, alternatives
are more appropriate for real-time requests requiring user feedback (for
example, voice commands) and therefore are more suited for streaming
recognition requests.
- `profanityFilter`: Optional. Indicates whether to filter out profane
words or phrases. Words filtered out will contain their first letter
and asterisks for the remaining characters (e.g. f\*\*\*). The profanity
filter operates on single words, it does not detect abusive or offensive
speech that is a phrase or a combination of words.
- `speechContext`: Optional. Contains additional contextual information
for processing this audio. A context contains the following sub-fields:

  - `boost`: Contains a value that assigns a weight to recognizing a given
    word or phrase.
  - `phrases`: Contains a list of words and phrases that provide hints
    to the speech recognition task. For more information, see the
    information on
    [speech adaptation](https://docs.cloud.google.com/speech-to-text/docs/v1/adaptation-model).

Audio is supplied to Cloud STT through the `audio` parameter of type
[RecognitionAudio](https://docs.cloud.google.com/speech-to-text/docs/reference/rest/v1/RecognitionAudio). The
`audio` field contains **either** of the following sub-fields:

- `content` contains the audio to evaluate, embedded within the request.
See [Embedding Audio Content](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#embedded-audio) for more information.
Audio passed directly within this field is limited to 1 minute in duration.
- `uri` contains a URI pointing to the audio content. The file must not be
compressed (for example, gzip). This
field must contain a Cloud Storage URI (of format
`gs://bucket-name/path_to_audio_file`). See
[Passing Audio reference by a URI](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#uri-audio).

### Sample rates

You specify the sample rate of your audio in the `sampleRateHertz` field
of the request configuration, and it must match the sample rate of the associated audio
content or stream. Sample rates between 8000 Hz and 48000 Hz are supported
within Cloud STT. You can specify the sample rate for a FLAC or
WAV file in the file header instead of using the `sampleRateHertz` field.
**A FLAC file must contain the sample rate in the FLAC header in order to be**
**submitted to the Speech-to-Text API.**

If you have a choice when encoding the source material, capture audio using a
sample rate of 16000 Hz. Values lower than this may impair speech recognition
accuracy, and higher levels have no appreciable effect on speech recognition
quality.

However, if your audio data has already been recorded at an existing sample
rate other than 16000 Hz, don't resample your audio to 16000 Hz. Most legacy
telephony audio, for example, use sample rates of 8000 Hz, which may give less
accurate results. If you must use such audio, provide the audio to the Speech
API at its original sample rate.

### Languages

Cloud STT's recognition engine supports a variety of languages and
dialects. You specify the language (and national or regional dialect) of your
audio within the request configuration's `languageCode` field, using a
[BCP-47](https://www.rfc-editor.org/info/bcp47) identifier.

A full list of supported languages for each feature
is available on the [Language Support](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-supported-languages) page.

### Time offsets (timestamps)

Cloud STT can include time offset values (timestamps)
for the beginning
and end of each spoken word that is recognized in the supplied audio. A time
offset value represents the amount of time that has elapsed from the beginning
of the audio, in increments of 100ms.

Time offsets are especially useful for analyzing longer audio files, where you
may need to search for a particular word in the recognized text and
locate it (seek) in the original audio. Time offsets are supported for all
our recognition methods: `recognize`, `streamingrecognize`, and
`longrunningrecognize`.

Time offset values are only included for the first alternative provided in the
recognition response.

To include time offsets in the results of your request, set the
`enableWordTimeOffsets` parameter to true in your request configuration. For
examples using the REST API or the Client Libraries, see
[Using Time Offsets (Timestamps)](https://docs.cloud.google.com/speech-to-text/docs/v1/async-time-offsets).
For example, you can include the `enableWordTimeOffsets` parameter in the
request configuration as shown here:

```
{
"config": {
  "languageCode": "en-US",
  "enableWordTimeOffsets": true
  },
"audio":{
  "uri":"gs://gcs-test-data/gettysburg.flac"
  }
}
```

The result returned by the Cloud Speech-to-Text API will contain time offset
values for each recognized word as shown following:

```
{
  "name": "6212202767953098955",
  "metadata": {
    "@type": "type.googleapis.com/google.cloud.speech.v1.LongRunningRecognizeMetadata",
    "progressPercent": 100,
    "startTime": "2017-07-24T10:21:22.013650Z",
    "lastUpdateTime": "2017-07-24T10:21:45.278630Z"
  },
  "done": true,
  "response": {
    "@type": "type.googleapis.com/google.cloud.speech.v1.LongRunningRecognizeResponse",
    "results": [\
      {\
        "alternatives": [\
          {\
            "transcript": "Four score and twenty...(etc)...",\
            "confidence": 0.97186122,\
            "words": [\
              {\
                "startTime": "1.300s",\
                "endTime": "1.400s",\
                "word": "Four"\
              },\
              {\
                "startTime": "1.400s",\
                "endTime": "1.600s",\
                "word": "score"\
              },\
              {\
                "startTime": "1.600s",\
                "endTime": "1.600s",\
                "word": "and"\
              },\
              {\
                "startTime": "1.600s",\
                "endTime": "1.900s",\
                "word": "twenty"\
              },\
              ...\
            ]\
          }\
        ]\
      },\
      {\
        "alternatives": [\
          {\
            "transcript": "for score and plenty...(etc)...",\
            "confidence": 0.9041967,\
          }\
        ]\
      }\
    ]
  }
}
```

### Model selection

Cloud STT can use one of several machine learning
_models_ to transcribe your audio file. Google has trained these
speech recognition models for specific audio types and sources.

When you send an audio transcription request to
Cloud STT, you can improve the results that you receive
by specifying the source of the original audio. This allows the
Cloud Speech-to-Text API to process your audio files using a
machine learning model trained to recognize speech audio from that
particular type of source.

To specify a model for speech recognition, include the `model` field
in the [`RecognitionConfig`](https://docs.cloud.google.com/speech-to-text/docs/reference/rest/v1p1beta1/RecognitionConfig) object for your
request, specifying the model that you want to use.

See the [Cloud STT transcription models list](https://docs.cloud.google.com/speech-to-text/docs/v1/transcription-model)
for the available machine learning models.

### Embedded audio content

Embedded audio is included in the speech recognition request when passing a
`content` parameter within the request's `audio` field. For embedded audio
provided as content within a gRPC request, that audio must be compatible for
[Proto3](https://developers.google.com/protocol-buffers/docs/reference/proto3-spec)
serialization, and provided as binary data. For embedded audio provided as
content within a REST request, that audio must be compatible with JSON
serialization and first be Base64-encoded. See
[Base64 Encoding Your Audio](https://docs.cloud.google.com/speech-to-text/docs/v1/base64-encoding) for more information.

When constructing a request using a
[Google Cloud client library](https://cloud.google.com/sdk/cloud-client-libraries),
you generally will write out this binary (or base-64 encoded) data
directly within the `content` field.

### Pass audio referenced by a URI

More typically, you will pass a `uri` parameter within the Speech request's
`audio` field, pointing to an audio file (in binary format, not base64)
located on Cloud Storage of the following form:

```
gs://bucket-name/path_to_audio_file
```

For example, the following part of a Speech request references the sample audio
file used within the [Quickstart](https://docs.cloud.google.com/speech-to-text/docs/v1/quickstart):

```
...
    "audio": {
        "uri":"gs://cloud-samples-tests/speech/brooklyn.flac"
    }
...
```

You must have proper access permissions to read Cloud Storage files, such
as one of the following:

- Publicly readable (such as our sample audio files)
- Readable by your service account, if using service account authorization.
- Readable by a user account, if using 3-legged OAuth for user account
authorization.

More information about managing access to Cloud Storage is available at
[Creating and Managing Access Control Lists](https://docs.cloud.google.com/storage/docs/access-control/create-manage-lists)
in the Cloud Storage documentation.

## Cloud Speech-to-Text API responses

As indicated previously, a synchronous Cloud Speech-to-Text API response may take some time
to return results, proportional to the length of the supplied audio. Once
processed, the API will return a response as shown in the following code block:

```
{
  "results": [\
    {\
      "alternatives": [\
        {\
          "confidence": 0.98267895,\
          "transcript": "how old is the Brooklyn Bridge"\
        }\
      ]\
    }\
  ]
}
```

- `results` contains the list of results (of type `SpeechRecognitionResult`)
where each result corresponds to a segment of audio (segments of audio
are separated by pauses).
Each result will consist of one or more of the following fields:

  - `alternatives` contains a list of possible transcriptions, of type
    `SpeechRecognitionAlternatives`. Whether more than one alternative
    appears depends both on whether you requested more than one alternative
    (by setting `maxAlternatives` to a value greater than `1`) and on whether
    Cloud STT produced alternatives of high enough quality. Each
    alternative will consist of the following fields:

    - `transcript` contains the transcribed text. See
      [Handling Transcriptions](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#transcriptions).
    - `confidence` contains a value between `0` and `1` indicating how
      confident Cloud STT is of the given transcription. See
      [Interpreting Confidence Values](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#confidence-values).

The components of this response are explained in the following sections.

### Select alternatives

Each result within a successful synchronous recognition response can contain one
or more `alternatives` (if the `maxAlternatives` value for the request is
greater than `1`). If Cloud STT determines that an alternative has
a sufficient [Confidence Value](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#confidence-values), then that alternative is
included in the response. The first alternative in the response is always the
best (most likely) alternative.

Setting `maxAlternatives` to a higher value than `1` does not imply or guarantee
that multiple alternatives will be returned. In general, more than one
alternative is more appropriate for providing real-time options to users getting
results using a [Streaming Recognition Request](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#streaming-requests).

### Handling transcriptions

Each alternative supplied within the response will contain a `transcript`
containing the recognized text. When provided with sequential alternatives,
you should concatenate these transcriptions together.

The following Python code iterates over a result list and concatenates the
transcriptions together. Note that we take the first alternative (the zeroth) in
all cases.

```
response = service_request.execute()
recognized_text = 'Transcribed Text: \n'
for i in range(len(response['results'])):
    recognized_text += response['results'][i]['alternatives'][0]['transcript']
```

### Confidence values

The `confidence` value is an estimate between `0.0` and `1.0`. It's calculated
by aggregating the "likelihood" values assigned to each word in the
audio. A higher number indicates an estimated greater likelihood that the
individual words were recognized correctly. This field is typically
provided only for the top hypothesis, and only for results where
`is_final=true`. For example, you may use the `confidence` value
to decide whether to show
[alternative results](https://docs.cloud.google.com/speech-to-text/docs/reference/rest/v1/speech/recognize#speechrecognitionalternative)
to the user or ask for confirmation from the user.

Be aware, however, that the model determines the "best", top-ranked result based
on more signals than the `confidence` score alone (such as sentence context).
Because of this there are occasional cases where the top result doesn't
have the highest confidence score. If you haven't requested multiple alternative
results, the single "best" result returned may have a lower confidence value
than anticipated. This can occur, for example, in cases where rare words are
being used. A word that's rarely used can be assigned a low "likelihood" value
even if it's recognized correctly. If the model determines the rare word to be
the most likely option based on context, that result is returned at the top even
if the result's `confidence` value is lower than alternative options.

## Asynchronous Requests and Responses

An asynchronous Cloud Speech-to-Text API request to the
[LongRunningRecognize](https://docs.cloud.google.com/speech-to-text/docs/reference/rest/v1/speech/longrunningrecognize)
method is identical in form to a [synchronous Cloud Speech-to-Text API\\
request](https://docs.cloud.google.com/speech-to-text/docs/v1/speech-to-text-requests#synchronous-requests). However, instead of returning a response, the
asynchronous request will initiate a
_Long-Running Operation_ (of type
[Operation](https://docs.cloud.google.com/speech-to-text/docs/reference/rest/v1/operations#resource-operation)) and
return this operation to the callee immediately. You can use asynchronous speech
recognition with audio of any length up to 480 minutes.

For example:

```
{
  "name": "operation_name",
  "metadata": {
    "@type": "type.googleapis.com/google.cloud.speech.v1.LongRunningRecognizeMetadata"
    "progressPercent": 34,
    "startTime": "2016-08-30T23:26:29.579144Z",
    "lastUpdateTime": "2016-08-30T23:26:29.826903Z"
  }
}
```

Note that no results are yet present. Cloud STT will continue to
process the audio and use this operation to store the results. Results will
appear in the `response` field of the
[operation](https://docs.cloud.google.com/speech-to-text/docs/reference/rest/Shared.Types/ListOperationsResponse#Operation)
returned when the [`LongRunningRecognize`](https://docs.cloud.google.com/speech-to-text/docs/reference/rest/v1/speech/longrunningrecognize)
request is complete.

The following example is a full response after completion of the request:

```
{
  "name": "1268386125834704889",
  "metadata": {
    "lastUpdateTime": "2016-08-31T00:16:32.169Z",
    "@type": "type.googleapis.com/google.cloud.speech.v1.LongrunningRecognizeMetadata",
    "startTime": "2016-08-31T00:16:29.539820Z",
    "progressPercent": 100
  }
  "response": {
    "@type": "type.googleapis.com/google.cloud.speech.v1.LongRunningRecognizeResponse",
    "results": [{\
      "alternatives": [{\
        "confidence": 0.98267895,\
        "transcript": "how old is the Brooklyn Bridge"\
      }]}]
  },
  "done": True,
}
```

Note that `done` has been set to `True` and that the operation's `response`
contains a set of results of type
[SpeechRecognitionResult](https://docs.cloud.google.com/speech-to-text/docs/reference/rest/v1/speech/recognize#SpeechRecognitionResult)
which is the same type returned by a synchronous Cloud Speech-to-Text API recognition request.

## Streaming Cloud Speech-to-Text API Recognition Requests

A streaming Cloud Speech-to-Text API recognition call is designed for real-time capture and
recognition of audio, within a bi-directional stream. Your application can send
audio on the request stream, and receive interim and final recognition
results on the response stream in real time. Interim results represent the
current recognition result for a section of audio, while the final
recognition result represents the last, best guess for that section of audio.

### Streaming requests

Unlike synchronous and asynchronous calls, in which you send both the
configuration and audio within a single request, calling the streaming Speech
API requires sending multiple requests. The first `StreamingRecognizeRequest`
must contain a configuration of type
[StreamingRecognitionConfig](https://docs.cloud.google.com/speech-to-text/docs/reference/rpc/google.cloud.speech.v1#google.cloud.speech.v1.StreamingRecognitionConfig)
without any accompanying audio. Subsequent `StreamingRecognizeRequest`s sent
over the same stream will then consist of consecutive frames of raw audio bytes.

A `StreamingRecognitionConfig` consists of the following fields:

- `config`: Required. contains configuration information for the audio,
of type
[RecognitionConfig](https://docs.cloud.google.com/speech-to-text/docs/reference/rpc/google.cloud.speech.v1#google.cloud.speech.v1.StreamingRecognitionConfig)
and is the same as that shown within synchronous and asynchronous requests.
- `single_utterance`: (optional, defaults to `false`) indicates whether this
request should automatically end after speech is no longer detected. If set,
Cloud STT will detect pauses, silence, or non-speech audio to determine
when to end recognition. If not set, the stream will continue to listen and
process audio until either the stream is closed directly, or the stream's
limit length has been exceeded. Setting `single_utterance` to `true` is
useful for processing voice commands.
- `interim_results`: (optional, defaults to `false`) indicates that this
stream request should return temporary results that may be refined at a
later time (after processing more audio). Interim results will be noted
within responses through the setting of `is_final` to `false`.

### Streaming responses

Streaming speech recognition results are returned within a series of responses
of type
[StreamingRecognitionResponse](https://docs.cloud.google.com/speech-to-text/docs/reference/rpc/google.cloud.speech.v1#google.cloud.speech.v1.StreamingRecognizeResponse).
Such a response consists of the following fields:

- `speechEventType` contains events of type
[SpeechEventType](https://docs.cloud.google.com/speech-to-text/docs/reference/rpc/google.cloud.speech.v1#google.cloud.speech.v1.StreamingRecognizeResponse.SpeechEventType). The value
of these events will indicate when
a single utterance has been determined to have been
completed. The speech events serve as markers within your stream's
response.
- `results` contains the list of results, which may be either interim or final
results, of type
[StreamingRecognitionResult](https://docs.cloud.google.com/speech-to-text/docs/reference/rpc/google.cloud.speech.v1#google.cloud.speech.v1.StreamingRecognitionResult).
The `results` list contains following the sub-fields:

  - `alternatives` contains a list of alternative transcriptions.
  - `isFinal` indicates whether the results obtained within this list entry
    are interim or are final. Google might return multiple `isFinal=true`
    results throughout a single stream, but the `isFinal=true` result is
    only _guaranteed_ after the write stream is closed (half-close).
  - `stability` indicates the volatility of results obtained so far, with
    `0.0` indicating complete instability while `1.0` indicates complete
    stability. Note that unlike confidence, which estimates whether a
    transcription is correct, `stability` estimates whether the given
    partial result may change. If `isFinal` is set to `true`, `stability`
    won't be set.



 Send feedback



Except as otherwise noted, the content of this page is licensed under the [Creative Commons Attribution 4.0 License](https://creativecommons.org/licenses/by/4.0/), and code samples are licensed under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0). For details, see the [Google Developers Site Policies](https://developers.google.com/site-policies). Java is a registered trademark of Oracle and/or its affiliates.

Last updated 2026-09-30 UTC.


Need to tell us more?






\[\[\["Easy to understand","easyToUnderstand","thumb-up"\],\["Solved my problem","solvedMyProblem","thumb-up"\],\["Other","otherUp","thumb-up"\]\],\[\["Hard to understand","hardToUnderstand","thumb-down"\],\["Incorrect information or sample code","incorrectInformationOrSampleCode","thumb-down"\],\["Missing the information/samples I need","missingTheInformationSamplesINeed","thumb-down"\],\["Other","otherDown","thumb-down"\]\],\["Last updated 2026-09-30 UTC."\],\[\],\[\]\]