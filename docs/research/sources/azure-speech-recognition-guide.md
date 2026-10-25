Source: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech
Title: How to recognize speech - Speech service - Foundry Tools | Microsoft Learn
Fetched: 2026-10-05T15:31:36.085Z

Table of contents Exit editor mode

Ask LearnAsk Learn

Reading modeTable of contents[Read in English](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech)Add to CollectionsAdd to Plans[Edit](https://github.com/MicrosoftDocs/azure-ai-docs/blob/main/articles/ai-services/speech-service/how-to-recognize-speech.md)

* * *

Copy MarkdownPrint

* * *

Note

Access to this page requires authorization. You can try [signing in](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#) or changing directories.


Access to this page requires authorization. You can try changing directories.


# How to recognize speech

Feedback

Summarize this article for me


Choose a programming language or tool


RESTPythonC#JavaScriptJavaC++GoObjective-CSpeech CLISwift

[Speech to text REST API reference](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-speech-to-text) \| [Speech to text REST API for short audio reference](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-speech-to-text-short) \| [Additional samples on GitHub](https://github.com/Azure-Samples/cognitive-services-speech-sdk)

In this how-to guide, you learn how to use Azure Speech in Foundry Tools for real-time speech to text conversion. Real-time speech recognition is ideal for applications requiring immediate transcription, such as dictation, call center assistance, and captioning for live meetings.

To learn how to set up the environment for a sample application, see [Quickstart: Recognize and convert speech to text](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-speech-to-text).

[Section titled: Convert speech to text](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#convert-speech-to-text)

## Convert speech to text

At a command prompt, run the following command. Insert the following values into the command:

- Your API key for the Speech resource
- Your Speech service region
- The path for input audio file

curl

Copy

```curl
curl --location --request POST 'https://YourResourceName.cognitiveservices.azure.com/stt/speech/recognition/conversation/cognitiveservices/v1?language=en-US' \
--header 'Ocp-Apim-Subscription-Key: INSERT_SUBSCRIPTION_KEY_HERE' \
--header 'Content-Type: audio/wav' \
--data-binary @'INSERT_AUDIO_FILE_PATH_HERE'
```

You should receive a response like the following example:

JSON

Copy

```json
{
    "RecognitionStatus": "Success",
    "DisplayText": "My voice is my passport, verify me.",
    "Offset": 6600000,
    "Duration": 32100000
}
```

For more information, see the [Speech to text REST API reference](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-speech-to-text).

[Reference documentation](https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/) \| [Package (PyPi)](https://pypi.org/project/azure-cognitiveservices-speech/) \| [Additional samples on GitHub](https://aka.ms/speech/github-python)

In this how-to guide, you learn how to use Azure Speech in Foundry Tools for real-time speech to text conversion. Real-time speech recognition is ideal for applications requiring immediate transcription, such as dictation, call center assistance, and captioning for live meetings.

To learn how to set up the environment for a sample application, see [Quickstart: Recognize and convert speech to text](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-speech-to-text).

[Section titled: Create a speech configuration instance](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#create-a-speech-configuration-instance)

## Create a speech configuration instance

To call the Speech service by using the Speech SDK, you need to create a [`SpeechConfig`](https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.speechconfig) instance. This class includes information about your Speech resource, like your speech key and associated region, endpoint, host, or authorization token.

1. Create a Foundry resource for Speech in the [Azure portal](https://portal.azure.com/#create/Microsoft.CognitiveServicesAIFoundry). Get the Speech resource key and region.
2. Create a `SpeechConfig` instance by using the following code. Replace `YourSpeechKey` and `YourSpeechRegion` with your Speech resource key and region.

Python

Copy

```python
speech_config = speechsdk.SpeechConfig(subscription="YourSpeechKey", region="YourSpeechRegion")
```

You can initialize [`SpeechConfig`](https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.speechconfig) in a few other ways:

- Use an endpoint, and pass in a Speech service endpoint. A speech key or authorization token is optional.
- Use a host, and pass in a host address. A speech key or authorization token is optional.
- Use an authorization token with the associated region/location.

Note

Regardless of whether you're performing speech recognition, speech synthesis, translation, or intent recognition, you always create a configuration.

[Section titled: Recognize speech from a microphone](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#recognize-speech-from-a-microphone)

## Recognize speech from a microphone

To recognize speech by using your device microphone, create a `SpeechRecognizer` instance without passing [`AudioConfig`](https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.audio.audioconfig), and then pass `speech_config`:

Python

Copy

```python
import azure.cognitiveservices.speech as speechsdk

def from_mic():
    speech_config = speechsdk.SpeechConfig(subscription="YourSpeechKey", region="YourSpeechRegion")
    speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config)

    print("Speak into your microphone.")
    speech_recognition_result = speech_recognizer.recognize_once_async().get()
    print(speech_recognition_result.text)

from_mic()
```

If you want to use a _specific_ audio input device, you need to specify the device ID in `AudioConfig`, and the pass it to the `SpeechRecognizer` constructor's `audio_config` parameter. To learn how to get the device ID, see [Select an audio input device with the Speech SDK](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-select-audio-input-devices).

[Section titled: Recognize speech from a file](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#recognize-speech-from-a-file)

## Recognize speech from a file

If you want to recognize speech from an audio file instead of using a microphone, create an `AudioConfig` instance and use the `filename` parameter:

Python

Copy

```python
import azure.cognitiveservices.speech as speechsdk

def from_file():
    speech_config = speechsdk.SpeechConfig(subscription="YourSpeechKey", region="YourSpeechRegion")
    audio_config = speechsdk.AudioConfig(filename="your_file_name.wav")
    speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

    speech_recognition_result = speech_recognizer.recognize_once_async().get()
    print(speech_recognition_result.text)

from_file()
```

[Section titled: Handle errors](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#handle-errors)

## Handle errors

The previous examples only get the recognized text from the `speech_recognition_result.text` property. To handle errors and other responses, you need to write some code to handle the result. The following code evaluates the [`speech_recognition_result.reason`](https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.resultreason) property and:

- Prints the recognition result: `speechsdk.ResultReason.RecognizedSpeech`.
- If there's no recognition match, it informs the user: `speechsdk.ResultReason.NoMatch`.
- If an error is encountered, it prints the error message: `speechsdk.ResultReason.Canceled`.

Python

Copy

```python
if speech_recognition_result.reason == speechsdk.ResultReason.RecognizedSpeech:
    print("Recognized: {}".format(speech_recognition_result.text))
elif speech_recognition_result.reason == speechsdk.ResultReason.NoMatch:
    print("No speech could be recognized: {}".format(speech_recognition_result.no_match_details))
elif speech_recognition_result.reason == speechsdk.ResultReason.Canceled:
    cancellation_details = speech_recognition_result.cancellation_details
    print("Speech Recognition canceled: {}".format(cancellation_details.reason))
    if cancellation_details.reason == speechsdk.CancellationReason.Error:
        print("Error details: {}".format(cancellation_details.error_details))
        print("Did you set the speech resource key and region values?")
```

[Section titled: Use continuous recognition](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#use-continuous-recognition)

## Use continuous recognition

The previous examples use single-shot recognition, which recognizes a single utterance. The end of a single utterance is determined by listening for silence at the end or until a maximum of 15 seconds of audio is processed.

In contrast, you use continuous recognition when you want to control when to stop recognizing. It requires you to connect to `EventSignal` to get the recognition results. To stop recognition, you must call [stop\_continuous\_recognition()](https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.recognizer#azure-cognitiveservices-speech-recognizer-stop-continuous-recognition) or [stop\_continuous\_recognition\_async()](https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.recognizer#azure-cognitiveservices-speech-recognizer-stop-continuous-recognition-async). Here's an example of how continuous recognition is performed on an audio input file.

Start by defining the input and initializing [`SpeechRecognizer`](https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.speechrecognizer):

Python

Copy

```python
audio_config = speechsdk.audio.AudioConfig(filename=weatherfilename)
speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)
```

Next, create a variable to manage the state of speech recognition. Set the variable to `False` because at the start of recognition, you can safely assume that it's not finished:

Python

Copy

```python
done = False
```

Now, create a callback to stop continuous recognition when `evt` is received. Keep these points in mind:

- When `evt` is received, the `evt` message is printed.
- After `evt` is received, [stop\_continuous\_recognition()](https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.recognizer#azure-cognitiveservices-speech-recognizer-stop-continuous-recognition) is called to stop recognition.
- The recognition state is changed to `True`.

Python

Copy

```python
def stop_cb(evt):
    print('CLOSING on {}'.format(evt))
    speech_recognizer.stop_continuous_recognition()
    global done
    done = True
```

The following code sample shows how to connect callbacks to events sent from [`SpeechRecognizer`](https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.recognizer). The events are:

- [`recognizing`](https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.recognizer#azure-cognitiveservices-speech-recognizer-recognizing): Signal for events that contain intermediate recognition results.
- [`recognized`](https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.recognizer#azure-cognitiveservices-speech-recognizer-recognized): Signal for events that contain final recognition results, which indicate a successful recognition attempt.
- [`session_started`](https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.recognizer#azure-cognitiveservices-speech-recognizer-session-started): Signal for events that indicate the start of a recognition session (operation).
- [`session_stopped`](https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.recognizer#azure-cognitiveservices-speech-recognizer-session-stopped): Signal for events that indicate the end of a recognition session (operation).
- [`canceled`](https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.recognizer#azure-cognitiveservices-speech-recognizer-canceled): Signal for events that contain canceled recognition results. These results indicate a recognition attempt that was canceled as a result of a direct cancellation request. Alternatively, they indicate a transport or protocol failure.

Python

Copy

```python
speech_recognizer.recognizing.connect(lambda evt: print('RECOGNIZING: {}'.format(evt)))
speech_recognizer.recognized.connect(lambda evt: print('RECOGNIZED: {}'.format(evt)))
speech_recognizer.session_started.connect(lambda evt: print('SESSION STARTED: {}'.format(evt)))
speech_recognizer.session_stopped.connect(lambda evt: print('SESSION STOPPED {}'.format(evt)))
speech_recognizer.canceled.connect(lambda evt: print('CANCELED {}'.format(evt)))

speech_recognizer.session_stopped.connect(stop_cb)
speech_recognizer.canceled.connect(stop_cb)
```

With everything set up, you can call [start\_continuous\_recognition()](https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.recognizer#azure-cognitiveservices-speech-recognizer-start-continuous-recognition):

Python

Copy

```python
speech_recognizer.start_continuous_recognition()
while not done:
    time.sleep(.5)
```

[Section titled: Change the source language](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#change-the-source-language)

## Change the source language

A common task for speech recognition is specifying the input (or source) language. The following example shows how to change the input language to German. In your code, find your `SpeechConfig` instance and add this line directly below it:

Python

Copy

```python
speech_config.speech_recognition_language="de-DE"
```

[`speech_recognition_language`](https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.speechconfig#azure-cognitiveservices-speech-speechconfig-speech-recognition-language) is a parameter that takes a string as an argument. For a list of supported locales, see [Language and voice support for the Speech service](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support).

[Section titled: Language identification](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#language-identification)

## Language identification

You can use language identification with Speech to text recognition when you need to identify the language in an audio source and then transcribe it to text.

For a complete code sample, see [Language identification](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-identification?pivots=programming-language-python).

[Section titled: Use a custom endpoint](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#use-a-custom-endpoint)

## Use a custom endpoint

With [custom speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/custom-speech-overview), you can upload your own data, test and train a custom model, compare accuracy between models, and deploy a model to a custom endpoint. The following example shows how to set a custom endpoint.

Python

Copy

```python
speech_config = speechsdk.SpeechConfig(subscription="YourSpeechResoureKey", region="YourServiceRegion")
speech_config.endpoint_id = "YourEndpointId"
speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config)
```

[Section titled: Run and use a container](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#run-and-use-a-container)

## Run and use a container

Speech containers provide websocket-based query endpoint APIs that are accessed through the Speech SDK and Speech CLI. By default, the Speech SDK and Speech CLI use the public Speech service. To use the container, you need to change the initialization method. Use a container host URL instead of key and region.

For more information about containers, see Host URLs in [Install and run Speech containers with Docker](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-container-howto#host-urls).

[Section titled: Semantic segmentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#semantic-segmentation)

## Semantic segmentation

Semantic segmentation is a speech recognition segmentation strategy that's designed to mitigate issues associated with silence-based segmentation:

- Under-segmentation: When users speak for a long time without pauses, they can see a long sequence of text without breaks ("wall of text"), which severely degrades their readability experience.
- Over-segmentation: When a user pauses for a short time, the silence detection mechanism can segment incorrectly.

Instead of only relying on silence timeouts, semantic segmentation mostly segments and returns final results when it detects sentence-ending punctuation (such as '.' or '?'). This improves the user experience with higher-quality, semantically complete segments and prevents long intermediate results.

To use semantic segmentation, you need to set the following property on the `SpeechConfig` instance used to create a `SpeechRecognizer`:

Python

Copy

```python
speech_config.set_property(speechsdk.PropertyId.Speech_SegmentationStrategy, "Semantic")
```

Some of the limitations of semantic segmentation are as follows:

- You need the Speech SDK version 1.41 or later to use semantic segmentation.
- Semantic segmentation is only intended for use in [continuous recognition](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#use-continuous-recognition). This includes scenarios such as dictation and captioning. It shouldn't be used in the single recognition mode or interactive scenarios.
- Semantic segmentation isn't available for all languages and locales.
- Semantic segmentation doesn't yet support confidence scores and NBest lists. As such, we don't recommend semantic segmentation if you're using confidence scores or NBest lists.

[Section titled: Commit an explicit audio boundary (preview)](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#commit-an-explicit-audio-boundary-preview)

## Commit an explicit audio boundary (preview)

When you stream audio to Azure Speech Service, the service automatically segments the audio and generates transcription results accordingly. However, in certain scenarios, such as turn-based voice agents, you might need to explicitly define boundaries in the transcription stream. You can now achieve this goal by using the `Commit()` method of `PushAudioInputStream`.

Using an explicit audio boundary requires Speech SDK version 1.52 or later. It also requires the service property `setfeature=forcecommit` to be enabled.

During public preview, the following limitations apply:

- Only PCM, A-law, μ-law, and G.711 audio formats are supported. Other compressed audio formats aren't supported.
- Microsoft Audio Stack (MAS) isn't supported.

Create a `PushAudioInputStream` and use it with `SpeechRecognizer`.

C#

Copy

```csharp
var config = SpeechConfig.FromEndpoint(new Uri(endpoint), subscriptionKey);
config.SpeechRecognitionLanguage = "en-US";
config.SetServiceProperty("setfeature", "forcecommit", ServicePropertyChannel.UriQueryParameter);
var pushStream = AudioInputStream.CreatePushStream();
var audioInput = AudioConfig.FromStreamInput(pushStream);
var recognizer = new SpeechRecognizer(config, audioInput);
```

Use `PushAudioInputStream.Commit()` to commit audio boundary. A token is returned.

C#

Copy

```csharp
// writing audio
pushStream.Write(audioBytes);

// ...

// commit audio boundary
var token = pushStream.Commit();
```

Use `SpeechRecognitionResult.CommitToken` to identify the result from `Recognized` event that matches the commit.

C#

Copy

```csharp
recognizer.Recognized += (s, e) =>
{
    var token = e.Result.CommitToken;
    var tokenText = token != 0 ? $" commit_token={token}" : "";
    Console.WriteLine($"RECOGNIZED: Reason={e.Result.Reason} Text={e.Result.Text}{tokenText}");
};
```

You can find the complete sample in `RecognitionWithPushStreamCommitAsync` in Speech SDK samples [on GitHub](https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/samples/csharp/sharedcontent/console/speech_recognition_samples.cs).

Create a `PushAudioInputStream` and use it with `SpeechRecognizer`.

C++

Copy

```cpp
auto config = SpeechConfig::FromEndpoint(endpoint, subscriptionKey);
config->SetSpeechRecognitionLanguage("en-US");
config->SetServiceProperty("setfeature", "forcecommit", ServicePropertyChannel::UriQueryParameter);
auto pushStream = AudioInputStream::CreatePushStream();
auto recognizer = SpeechRecognizer::FromConfig(config, AudioConfig::FromStreamInput(pushStream));
```

Use `PushAudioInputStream::Commit()` to commit audio boundary. A token is returned.

C++

Copy

```cpp
// vector<uint8_t> audioBytes(3200);
// ... read audio into audioBytes
// writing audio
pushStream->Write(audioBytes.data(),static_cast<uint32_t>(audioBytes.size()));

// ...

// commit audio boundary
uint32_t token = pushStream->Commit();
```

Use `SpeechRecognitionResult::CommitToken()` to identify the result from `Recognized` event that matches the commit.

C++

Copy

```cpp
recognizer->Recognized.Connect([&](const SpeechRecognitionEventArgs& e)
{
    cout << "RECOGNIZED: Reason=" << (int)e.Result->Reason << " Text=" << e.Result->Text;
    // NoMatch can acknowledge a commit; naturally segmented results have token 0.
    if (e.Result->CommitToken() != 0)
    {
        uint32_t acknowledgedToken = e.Result->CommitToken();
        cout << " commit_token=" << acknowledgedToken;
    }
    cout << endl;
});
```

You can find the complete sample in `SpeechRecognitionWithPushStreamCommit` in Speech SDK samples [on GitHub](https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/samples/cpp/windows/console/samples/speech_recognition_samples.cpp).

Create a `PushAudioInputStream` and use it with `SpeechRecognizer`.

Java

Copy

```java
SpeechConfig config = SpeechConfig.fromEndpoint(new URI(endpoint), subscriptionKey);
config.setSpeechRecognitionLanguage("en-US");
config.setServiceProperty("setfeature", "forcecommit", ServicePropertyChannel.UriQueryParameter);
PushAudioInputStream pushStream = AudioInputStream.createPushStream();
AudioConfig audioInput = AudioConfig.fromStreamInput(pushStream);
SpeechRecognizer recognizer = new SpeechRecognizer(config, audioInput);
```

Use `PushAudioInputStream.commit()` to commit audio boundary. A token is returned.

Java

Copy

```java
// writing audio
pushStream.write(audioBytes);

// ...

// commit audio boundary
int token = pushStream.commit();
```

Use `SpeechRecognitionResult.getCommitToken()` to identify the result from `recognized` event that matches the commit.

Java

Copy

```java
recognizer.recognized.addEventListener((s, e) -> {
    int acknowledgedToken = e.getResult().getCommitToken();
    String tokenText = acknowledgedToken != 0 ? " commit_token=" + acknowledgedToken : "";
    System.out.println("RECOGNIZED: Reason=" + e.getResult().getReason()
        + " Text=" + e.getResult().getText() + tokenText);
});
```

You can find the complete sample in `recognitionWithPushStreamCommitAsync` in Speech SDK samples [on GitHub](https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/samples/java/jre/console/src/com/microsoft/cognitiveservices/speech/samples/console/SpeechRecognitionSamples.java).

Create a `PushAudioInputStream` and use it with `SpeechRecognizer`.

Python

Copy

```python
speech_config = speechsdk.SpeechConfig(subscription=speech_key, endpoint=speech_endpoint)
speech_config.speech_recognition_language = "en-US"

speech_config.set_service_property(
    "setfeature", "forcecommit", speechsdk.ServicePropertyChannel.UriQueryParameter)

pushStream = speechsdk.audio.PushAudioInputStream()
audio_config = speechsdk.audio.AudioConfig(stream=pushStream)
speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)
```

Use `PushAudioInputStream.commit()` to commit audio boundary. A token is returned.

Python

Copy

```python
# writing audio
pushStream.write(audio)

# ...

# commit audio boundary
token = pushStream.commit()
```

Use `SpeechRecognitionResult.commit_token` to identify the result from `recognized` event that matches the commit.

Python

Copy

```python
def recognized_cb(evt):
    result = evt.result
    commit_info = " commit_token={}".format(result.commit_token) if result.commit_token != 0 else ""
    print("RECOGNIZED: reason={} text={}{}".format(result.reason, result.text, commit_info))

speech_recognizer.recognized.connect(recognized_cb)
```

You can find the complete sample in `speech_recognition_with_push_stream_commit` in Speech SDK samples [on GitHub](https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/samples/python/console/speech_sample.py).

[Section titled: Post-stream refinement](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#post-stream-refinement)

## Post-stream refinement

Post-stream refinement gives you more accurate final results for [real-time transcription](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-to-text#real-time-transcription) with no impact to first-token latency. It runs a second recognition pass in parallel with real-time streaming, so intermediate and partial results stay low-latency. Only the final result is replaced with a more accurate version that uses broader audio context.

Monolingual post-stream refinement is generally available. Multilingual post-stream refinement is in public preview.

Expand table

| Capability | Monolingual post-stream refinement | Multilingual post-stream refinement |
| --- | --- | --- |
| Availability | Generally available | Public preview |
| Language scope | One configured locale per recognition session | Multiple supported languages in one session, including language switching |
| Language configuration | Set the recognition locale | Use open-range automatic language detection without a candidate language list |
| Phrase lists | [Supported](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/improve-accuracy-phrase-list) | Not supported during public preview |
| Diarization | [Supported](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-stt-diarization) | [Supported](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-stt-diarization) |

To enable post-stream refinement, set the `SpeechServiceResponse_PostProcessingOption` property on the `SpeechConfig` instance:

C++

Copy

```cpp
speechConfig->SetProperty(PropertyId::SpeechServiceResponse_PostProcessingOption, "PostRefinement");
```

C#

Copy

```csharp
speechConfig.SetProperty(PropertyId.SpeechServiceResponse_PostProcessingOption, "PostRefinement");
```

Java

Copy

```java
speechConfig.setProperty(PropertyId.SpeechServiceResponse_PostProcessingOption, "PostRefinement");
```

Python

Copy

```python
speech_config.set_property(
    speechsdk.PropertyId.SpeechServiceResponse_PostProcessingOption,
    "PostRefinement"
)
```

[Section titled: Multilingual post-stream refinement (preview)](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#multilingual-post-stream-refinement-preview)

### Multilingual post-stream refinement (preview)

Post-stream refinement supports multilingual recognition, so a single audio stream can span multiple languages, including switching between languages during a conversation. A single multilingual model recognizes the languages directly, so you don't set a language identification mode or provide a candidate language list. To enable the multilingual path, set `SpeechServiceResponse_PostProcessingOption` to `PostRefinement` and pass an `AutoDetectSourceLanguageConfig` configured for automatic language detection when you create the `SpeechRecognizer`.

Multilingual post-stream refinement requires Speech SDK version 1.50 or later and is available through the Speech SDK only.

During public preview, phrase lists aren't supported with multilingual post-stream refinement.

C++

Copy

```cpp
speechConfig->SetProperty(PropertyId::SpeechServiceResponse_PostProcessingOption, "PostRefinement");

auto autoDetectSourceLanguageConfig = AutoDetectSourceLanguageConfig::FromOpenRange();

auto recognizer = SpeechRecognizer::FromConfig(speechConfig, autoDetectSourceLanguageConfig, audioConfig);
```

C#

Copy

```csharp
speechConfig.SetProperty(PropertyId.SpeechServiceResponse_PostProcessingOption, "PostRefinement");

var autoDetectSourceLanguageConfig = AutoDetectSourceLanguageConfig.FromOpenRange();

var recognizer = new SpeechRecognizer(speechConfig, autoDetectSourceLanguageConfig, audioConfig);
```

Java

Copy

```java
speechConfig.setProperty(PropertyId.SpeechServiceResponse_PostProcessingOption, "PostRefinement");

AutoDetectSourceLanguageConfig autoDetectSourceLanguageConfig =
    AutoDetectSourceLanguageConfig.fromOpenRange();

SpeechRecognizer recognizer =
    new SpeechRecognizer(speechConfig, autoDetectSourceLanguageConfig, audioConfig);
```

Python

Copy

```python
speech_config.set_property(
    speechsdk.PropertyId.SpeechServiceResponse_PostProcessingOption,
    "PostRefinement"
)

auto_detect_source_language_config = speechsdk.languageconfig.AutoDetectSourceLanguageConfig()

recognizer = speechsdk.SpeechRecognizer(
    speech_config=speech_config,
    auto_detect_source_language_config=auto_detect_source_language_config,
    audio_config=audio_config)
```

During public preview, multilingual post-stream refinement recognizes 25 languages: Arabic, Chinese, Czech, Danish, Dutch, English, Finnish, French, German, Greek, Hebrew, Hindi, Hungarian, Indonesian, Italian, Japanese, Korean, Norwegian Bokmål, Polish, Portuguese, Russian, Spanish, Swedish, Thai, and Turkish. Because the service detects the spoken language automatically, you don't configure a locale. Audio in a language that isn't supported might produce unexpected results. For the specific locales that support monolingual and multilingual post-stream refinement, see [Speech to text language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt).

Some important considerations for post-stream refinement:

- Post-stream refinement works best for longer utterances such as conversations, meetings, and dictation. For very short phrases, the refined result might be identical to the standard result.
- Post-stream refinement and TrueText are separate values of the same `SpeechServiceResponse_PostProcessingOption` property. Only one value can be set at a time.
- Monolingual and multilingual post-stream refinement have different [Azure region availability](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions?tabs=stt).

For more information about post-processing options, see [How to use post-processing](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-post-processing).

Important

In multilingual post-stream refinement, some locales might not show significant quality gains, and results can differ from what you observe with standard recognition.

[Reference documentation](https://learn.microsoft.com/en-us/dotnet/api/microsoft.cognitiveservices.speech) \| [Package (NuGet)](https://www.nuget.org/packages/Microsoft.CognitiveServices.Speech) \| [Additional samples on GitHub](https://aka.ms/speech/github-csharp)

In this how-to guide, you learn how to use Azure Speech in Foundry Tools for real-time speech to text conversion. Real-time speech recognition is ideal for applications requiring immediate transcription, such as dictation, call center assistance, and captioning for live meetings.

To learn how to set up the environment for a sample application, see [Quickstart: Recognize and convert speech to text](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-speech-to-text).

[Section titled: Create a speech configuration instance](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#create-a-speech-configuration-instance)

## Create a speech configuration instance

To call the Speech service by using the Speech SDK, you need to create a [`SpeechConfig`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.cognitiveservices.speech.speechconfig) instance. This class includes information about your Speech resource, like your key and associated region, endpoint, host, or authorization token.

1. Create a Foundry resource for Speech in the [Azure portal](https://portal.azure.com/#create/Microsoft.CognitiveServicesAIFoundry). Get the Speech resource key and endpoint.
2. Create a `SpeechConfig` instance by using the following code. Replace `YourSpeechKey` and `YourSpeechEndpoint` with your Speech resource key and endpoint.

C#

Copy

```csharp
using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.CognitiveServices.Speech;
using Microsoft.CognitiveServices.Speech.Audio;

class Program
{
    async static Task Main(string[] args)
    {
        var speechConfig = SpeechConfig.FromEndpoint(new Uri("YourSpeechEndpoint"), "YourSpeechKey");
    }
}
```

You can initialize `SpeechConfig` in a few other ways:

- Use an endpoint, and pass in a Speech service endpoint. A key or authorization token is optional.
- Use a host, and pass in a host address. A key or authorization token is optional.
- Use an authorization token with the associated region/location.

Note

Regardless of whether you're performing speech recognition, speech synthesis, translation, or intent recognition, you always create a configuration.

[Section titled: Recognize speech from a microphone](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#recognize-speech-from-a-microphone)

## Recognize speech from a microphone

To recognize speech by using your device microphone, create an [`AudioConfig`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.cognitiveservices.speech.audio.audioconfig) instance by using the `FromDefaultMicrophoneInput()` method. Then initialize the [`SpeechRecognizer`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.cognitiveservices.speech.speechrecognizer) object by passing `speechConfig` and `audioConfig`.

C#

Copy

```csharp
using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.CognitiveServices.Speech;
using Microsoft.CognitiveServices.Speech.Audio;

class Program
{
    async static Task FromMic(SpeechConfig speechConfig)
    {
        using var audioConfig = AudioConfig.FromDefaultMicrophoneInput();
        using var speechRecognizer = new SpeechRecognizer(speechConfig, audioConfig);

        Console.WriteLine("Speak into your microphone.");
        var speechRecognitionResult = await speechRecognizer.RecognizeOnceAsync();
        Console.WriteLine($"RECOGNIZED: Text={speechRecognitionResult.Text}");
    }

    async static Task Main(string[] args)
    {
        var speechConfig = SpeechConfig.FromEndpoint(new Uri("YourSpeechEndpoint"), "YourSpeechKey");
        await FromMic(speechConfig);
    }
}
```

If you want to use a _specific_ audio input device, you need to specify the device ID in `AudioConfig`. To learn how to get the device ID, see [Select an audio input device with the Speech SDK](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-select-audio-input-devices).

[Section titled: Recognize speech from a file](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#recognize-speech-from-a-file)

## Recognize speech from a file

If you want to recognize speech from an audio file instead of a microphone, you still need to create an `AudioConfig` instance. However, you don't call `FromDefaultMicrophoneInput()`. You call `FromWavFileInput()` and pass the file path:

C#

Copy

```csharp
using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.CognitiveServices.Speech;
using Microsoft.CognitiveServices.Speech.Audio;

class Program
{
    async static Task FromFile(SpeechConfig speechConfig)
    {
        using var audioConfig = AudioConfig.FromWavFileInput("PathToFile.wav");
        using var speechRecognizer = new SpeechRecognizer(speechConfig, audioConfig);

        var speechRecognitionResult = await speechRecognizer.RecognizeOnceAsync();
        Console.WriteLine($"RECOGNIZED: Text={speechRecognitionResult.Text}");
    }

    async static Task Main(string[] args)
    {
        var speechConfig = SpeechConfig.FromEndpoint(new Uri("YourSpeechEndpoint"), "YourSpeechKey");
        await FromFile(speechConfig);
    }
}
```

[Section titled: Recognize speech from an in-memory stream](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#recognize-speech-from-an-in-memory-stream)

## Recognize speech from an in-memory stream

For many use cases, it's likely that your audio data comes from Azure Blob Storage, or it's otherwise already in memory as a `byte[]` instance or a similar raw data structure. The following example uses [`PushAudioInputStream`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.cognitiveservices.speech.audio.pushaudioinputstream) to recognize speech, which is essentially an abstracted memory stream. The sample code does the following actions:

- Writes raw audio data to `PushAudioInputStream` by using the `Write()` function, which accepts a `byte[]` instance.
- Reads a _.wav_ file by using `FileReader` for demonstration purposes. If you already have audio data in a `byte[]` instance, you can skip directly to writing the content to the input stream.
- The default format is 16-bit, 16-kHz mono pulse-code modulation (PCM) data. To customize the format, you can pass an [`AudioStreamFormat`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.cognitiveservices.speech.audio.audiostreamformat) object to `CreatePushStream()` by using the static function `AudioStreamFormat.GetWaveFormatPCM(sampleRate, (byte)bitRate, (byte)channels)`.

C#

Copy

```csharp
using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.CognitiveServices.Speech;
using Microsoft.CognitiveServices.Speech.Audio;

class Program
{
    async static Task FromStream(SpeechConfig speechConfig)
    {
        var reader = new BinaryReader(File.OpenRead("PathToFile.wav"));
        using var audioConfigStream = AudioInputStream.CreatePushStream();
        using var audioConfig = AudioConfig.FromStreamInput(audioConfigStream);
        using var speechRecognizer = new SpeechRecognizer(speechConfig, audioConfig);

        byte[] readBytes;
        do
        {
            readBytes = reader.ReadBytes(1024);
            audioConfigStream.Write(readBytes, readBytes.Length);
        } while (readBytes.Length > 0);

        var speechRecognitionResult = await speechRecognizer.RecognizeOnceAsync();
        Console.WriteLine($"RECOGNIZED: Text={speechRecognitionResult.Text}");
    }

    async static Task Main(string[] args)
    {
        var speechConfig = SpeechConfig.FromEndpoint(new Uri("YourSpeechEndpoint"), "YourSpeechKey");
        await FromStream(speechConfig);
    }
}
```

Using a push stream as input assumes that the audio data is raw PCM and skips any headers. The API still works in certain cases if the header isn't skipped. For the best results, consider implementing logic to read off the headers so that `byte[]` begins at the _start of the audio data_.

[Section titled: Handle errors](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#handle-errors)

## Handle errors

The previous examples only get the recognized text from the `speechRecognitionResult.Text` property. To handle errors and other responses, you need to write some code to handle the result. The following code evaluates the [`speechRecognitionResult.Reason`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.cognitiveservices.speech.recognitionresult.reason) property and:

- Prints the recognition result: `ResultReason.RecognizedSpeech`.
- If there's no recognition match, it informs the user: `ResultReason.NoMatch`.
- If an error is encountered, it prints the error message: `ResultReason.Canceled`.

C#

Copy

```csharp
switch (speechRecognitionResult.Reason)
{
    case ResultReason.RecognizedSpeech:
        Console.WriteLine($"RECOGNIZED: Text={speechRecognitionResult.Text}");
        break;
    case ResultReason.NoMatch:
        Console.WriteLine($"NOMATCH: Speech could not be recognized.");
        break;
    case ResultReason.Canceled:
        var cancellation = CancellationDetails.FromResult(speechRecognitionResult);
        Console.WriteLine($"CANCELED: Reason={cancellation.Reason}");

        if (cancellation.Reason == CancellationReason.Error)
        {
            Console.WriteLine($"CANCELED: ErrorCode={cancellation.ErrorCode}");
            Console.WriteLine($"CANCELED: ErrorDetails={cancellation.ErrorDetails}");
            Console.WriteLine($"CANCELED: Did you set the speech resource key and endpoint values?");
        }
        break;
}
```

[Section titled: Use continuous recognition](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#use-continuous-recognition)

## Use continuous recognition

The previous examples use single-shot recognition, which recognizes a single utterance. The end of a single utterance is determined by listening for silence at the end or until a maximum of 15 seconds of audio is processed.

In contrast, you use continuous recognition when you want to control when to stop recognizing. It requires you to subscribe to the `Recognizing`, `Recognized`, and `Canceled` events to get the recognition results. To stop recognition, you must call [`StopContinuousRecognitionAsync`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.cognitiveservices.speech.speechrecognizer.stopcontinuousrecognitionasync). Here's an example of how continuous recognition is performed on an audio input file.

Start by defining the input and initializing [`SpeechRecognizer`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.cognitiveservices.speech.speechrecognizer):

C#

Copy

```csharp
using var audioConfig = AudioConfig.FromWavFileInput("YourAudioFile.wav");
using var speechRecognizer = new SpeechRecognizer(speechConfig, audioConfig);
```

Then create a `TaskCompletionSource<int>` instance to manage the state of speech recognition:

C#

Copy

```csharp
var stopRecognition = new TaskCompletionSource<int>();
```

Next, subscribe to the events that `SpeechRecognizer` sends:

- [`Recognizing`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.cognitiveservices.speech.speechrecognizer.recognizing): Signal for events that contain intermediate recognition results.
- [`Recognized`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.cognitiveservices.speech.speechrecognizer.recognized): Signal for events that contain final recognition results, which indicate a successful recognition attempt.
- [`SessionStopped`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.cognitiveservices.speech.recognizer.sessionstopped): Signal for events that indicate the end of a recognition session (operation).
- [`Canceled`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.cognitiveservices.speech.speechrecognizer.canceled): Signal for events that contain canceled recognition results. These results indicate a recognition attempt that was canceled as a result of a direct cancellation request. Alternatively, they indicate a transport or protocol failure.

C#

Copy

```csharp
speechRecognizer.Recognizing += (s, e) =>
{
    Console.WriteLine($"RECOGNIZING: Text={e.Result.Text}");
};

speechRecognizer.Recognized += (s, e) =>
{
    if (e.Result.Reason == ResultReason.RecognizedSpeech)
    {
        Console.WriteLine($"RECOGNIZED: Text={e.Result.Text}");
    }
    else if (e.Result.Reason == ResultReason.NoMatch)
    {
        Console.WriteLine($"NOMATCH: Speech could not be recognized.");
    }
};

speechRecognizer.Canceled += (s, e) =>
{
    Console.WriteLine($"CANCELED: Reason={e.Reason}");

    if (e.Reason == CancellationReason.Error)
    {
        Console.WriteLine($"CANCELED: ErrorCode={e.ErrorCode}");
        Console.WriteLine($"CANCELED: ErrorDetails={e.ErrorDetails}");
        Console.WriteLine($"CANCELED: Did you set the speech resource key and endpoint values?");
    }

    stopRecognition.TrySetResult(0);
};

speechRecognizer.SessionStopped += (s, e) =>
{
    Console.WriteLine("\n    Session stopped event.");
    stopRecognition.TrySetResult(0);
};
```

With everything set up, call `StartContinuousRecognitionAsync` to start recognizing:

C#

Copy

```csharp
await speechRecognizer.StartContinuousRecognitionAsync();

// Waits for completion. Use Task.WaitAny to keep the task rooted.
Task.WaitAny(new[] { stopRecognition.Task });

// Make the following call at some point to stop recognition:
// await speechRecognizer.StopContinuousRecognitionAsync();
```

[Section titled: Change the source language](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#change-the-source-language)

## Change the source language

A common task for speech recognition is specifying the input (or source) language. The following example shows how to change the input language to Italian. In your code, find your [`SpeechConfig`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.cognitiveservices.speech.speechconfig) instance and add this line directly below it:

C#

Copy

```csharp
speechConfig.SpeechRecognitionLanguage = "it-IT";
```

The [`SpeechRecognitionLanguage`](https://learn.microsoft.com/en-us/dotnet/api/microsoft.cognitiveservices.speech.speechconfig.speechrecognitionlanguage) property expects a language-locale format string. For a list of supported locales, see [Language and voice support for the Speech service](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt).

[Section titled: Language identification](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#language-identification)

## Language identification

You can use language identification with speech to text recognition when you need to identify the language in an audio source and then transcribe it to text.

For a complete code sample, see [Language identification](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-identification?pivots=programming-language-csharp).

[Section titled: Use a custom endpoint](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#use-a-custom-endpoint)

## Use a custom endpoint

With [custom speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/custom-speech-overview), you can upload your own data, test and train a custom model, compare accuracy between models, and deploy a model to a custom endpoint. The following example shows how to set a custom endpoint.

C#

Copy

```csharp
var speechConfig = SpeechConfig.FromEndpoint(new Uri("YourSpeechEndpoint"), "YourSpeechKey");
speechConfig.EndpointId = "YourEndpointId";
var speechRecognizer = new SpeechRecognizer(speechConfig);
```

[Section titled: Run and use a container](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#run-and-use-a-container)

## Run and use a container

Speech containers provide websocket-based query endpoint APIs that are accessed through the Speech SDK and Speech CLI. By default, the Speech SDK and Speech CLI use the public Speech service. To use the container, you need to change the initialization method. Use a container host URL instead of key and region.

For more information about containers, see Host URLs in [Install and run Speech containers with Docker](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-container-howto#host-urls).

[Section titled: Change how silence is handled](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#change-how-silence-is-handled)

## Change how silence is handled

If a user speaks faster or slower than usual, the default behaviors for nonspeech silence in input audio might not result in what you expect. Common problems with silence handling include:

- Fast-speech that chains many sentences together into a single recognition result, instead of breaking sentences into individual results.
- Slow speech that separates parts of a single sentence into multiple results.
- A single-shot recognition that ends too quickly while waiting for speech to begin.

These problems can be addressed by setting one of two _timeout properties_ on the `SpeechConfig` instance used to create a `SpeechRecognizer`:

- **Segmentation silence timeout**adjusts how much nonspeech audio is allowed within a phrase that's currently being spoken before that phrase is considered "done."

  - _Higher_ values generally make results longer and allow longer pauses from the speaker within a phrase but make results take longer to arrive. They can also combine separate phrases into a single result when set too high.
  - _Lower_ values generally make results shorter and ensure more prompt and frequent breaks between phrases, but can also cause single phrases to separate into multiple results when set too low.
  - This timeout can be set to integer values between 100 and 5000, in milliseconds, with 500 a typical default.
- **Initial silence timeout** adjusts how much nonspeech audio is allowed _before_ a phrase before the recognition attempt ends in a "no match" result.

  - _Higher_ values give speakers more time to react and start speaking, but can also result in slow responsiveness when nothing is spoken.
  - _Lower_ values ensure a prompt "no match" for faster user experience and more controlled audio handling, but might cut a speaker off too quickly when set too low.
  - Because continuous recognition generates many results, this value determines how often "no match" results arrive but doesn't otherwise affect the content of recognition results.
  - This timeout can be set to any non-negative integer value, in milliseconds, or set to 0 to disable it entirely. 5000 is a typical default for single-shot recognition while 15000 is a typical default for continuous recognition.

Since there are tradeoffs when modifying these timeouts, you should only change the settings when you have a problem related to silence handling. Default values optimally handle most spoken audio and only uncommon scenarios should encounter problems.

**Example:** Users speaking a serial number like "ABC-123-4567" might pause between character groups long enough for the serial number to be broken into multiple results. In this case, try a higher value like 2000 milliseconds for the segmentation silence timeout:

C#

Copy

```csharp
speechConfig.SetProperty(PropertyId.Speech_SegmentationSilenceTimeoutMs, "2000");
```

**Example:** A recorded presenter's speech might be fast enough that several sentences in a row get combined, with large recognition results only arriving once or twice per minute. In this case, set the segmentation silence timeout to a lower value like 300 ms:

C#

Copy

```csharp
speechConfig.SetProperty(PropertyId.Speech_SegmentationSilenceTimeoutMs, "300");
```

**Example:** A single-shot recognition asking a speaker to find and read a serial number ends too quickly while the number is being found. In this case, try a longer initial silence timeout like 10,000 ms:

C#

Copy

```csharp
speechConfig.SetProperty(PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "10000");
```

[Section titled: Semantic segmentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#semantic-segmentation)

## Semantic segmentation

Semantic segmentation is a speech recognition segmentation strategy that's designed to mitigate issues associated with [silence-based segmentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#change-how-silence-is-handled):

- Under-segmentation: When users speak for a long time without pauses, they can see a long sequence of text without breaks ("wall of text"), which severely degrades their readability experience.
- Over-segmentation: When a user pauses for a short time, the silence detection mechanism can segment incorrectly.

Instead of only relying on silence timeouts, semantic segmentation mostly segments and returns final results when it detects sentence-ending punctuation (such as '.' or '?'). This improves the user experience with higher-quality, semantically complete segments and prevents long intermediate results.

To use semantic segmentation, you need to set the following property on the `SpeechConfig` instance used to create a `SpeechRecognizer`:

C#

Copy

```csharp
speechConfig.SetProperty(PropertyId.Speech_SegmentationStrategy, "Semantic");
```

Some of the limitations of semantic segmentation are as follows:

- You need the Speech SDK version 1.41 or later to use semantic segmentation.
- Semantic segmentation is only intended for use in [continuous recognition](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#use-continuous-recognition). This includes scenarios such as dictation and captioning. It shouldn't be used in the single recognition mode or interactive scenarios.
- Semantic segmentation isn't available for all languages and locales.
- Semantic segmentation doesn't yet support confidence scores and NBest lists. As such, we don't recommend semantic segmentation if you're using confidence scores or NBest lists.

[Section titled: Commit an explicit audio boundary (preview)](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#commit-an-explicit-audio-boundary-preview)

## Commit an explicit audio boundary (preview)

When you stream audio to Azure Speech Service, the service automatically segments the audio and generates transcription results accordingly. However, in certain scenarios, such as turn-based voice agents, you might need to explicitly define boundaries in the transcription stream. You can now achieve this goal by using the `Commit()` method of `PushAudioInputStream`.

Using an explicit audio boundary requires Speech SDK version 1.52 or later. It also requires the service property `setfeature=forcecommit` to be enabled.

During public preview, the following limitations apply:

- Only PCM, A-law, μ-law, and G.711 audio formats are supported. Other compressed audio formats aren't supported.
- Microsoft Audio Stack (MAS) isn't supported.

Create a `PushAudioInputStream` and use it with `SpeechRecognizer`.

C#

Copy

```csharp
var config = SpeechConfig.FromEndpoint(new Uri(endpoint), subscriptionKey);
config.SpeechRecognitionLanguage = "en-US";
config.SetServiceProperty("setfeature", "forcecommit", ServicePropertyChannel.UriQueryParameter);
var pushStream = AudioInputStream.CreatePushStream();
var audioInput = AudioConfig.FromStreamInput(pushStream);
var recognizer = new SpeechRecognizer(config, audioInput);
```

Use `PushAudioInputStream.Commit()` to commit audio boundary. A token is returned.

C#

Copy

```csharp
// writing audio
pushStream.Write(audioBytes);

// ...

// commit audio boundary
var token = pushStream.Commit();
```

Use `SpeechRecognitionResult.CommitToken` to identify the result from `Recognized` event that matches the commit.

C#

Copy

```csharp
recognizer.Recognized += (s, e) =>
{
    var token = e.Result.CommitToken;
    var tokenText = token != 0 ? $" commit_token={token}" : "";
    Console.WriteLine($"RECOGNIZED: Reason={e.Result.Reason} Text={e.Result.Text}{tokenText}");
};
```

You can find the complete sample in `RecognitionWithPushStreamCommitAsync` in Speech SDK samples [on GitHub](https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/samples/csharp/sharedcontent/console/speech_recognition_samples.cs).

Create a `PushAudioInputStream` and use it with `SpeechRecognizer`.

C++

Copy

```cpp
auto config = SpeechConfig::FromEndpoint(endpoint, subscriptionKey);
config->SetSpeechRecognitionLanguage("en-US");
config->SetServiceProperty("setfeature", "forcecommit", ServicePropertyChannel::UriQueryParameter);
auto pushStream = AudioInputStream::CreatePushStream();
auto recognizer = SpeechRecognizer::FromConfig(config, AudioConfig::FromStreamInput(pushStream));
```

Use `PushAudioInputStream::Commit()` to commit audio boundary. A token is returned.

C++

Copy

```cpp
// vector<uint8_t> audioBytes(3200);
// ... read audio into audioBytes
// writing audio
pushStream->Write(audioBytes.data(),static_cast<uint32_t>(audioBytes.size()));

// ...

// commit audio boundary
uint32_t token = pushStream->Commit();
```

Use `SpeechRecognitionResult::CommitToken()` to identify the result from `Recognized` event that matches the commit.

C++

Copy

```cpp
recognizer->Recognized.Connect([&](const SpeechRecognitionEventArgs& e)
{
    cout << "RECOGNIZED: Reason=" << (int)e.Result->Reason << " Text=" << e.Result->Text;
    // NoMatch can acknowledge a commit; naturally segmented results have token 0.
    if (e.Result->CommitToken() != 0)
    {
        uint32_t acknowledgedToken = e.Result->CommitToken();
        cout << " commit_token=" << acknowledgedToken;
    }
    cout << endl;
});
```

You can find the complete sample in `SpeechRecognitionWithPushStreamCommit` in Speech SDK samples [on GitHub](https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/samples/cpp/windows/console/samples/speech_recognition_samples.cpp).

Create a `PushAudioInputStream` and use it with `SpeechRecognizer`.

Java

Copy

```java
SpeechConfig config = SpeechConfig.fromEndpoint(new URI(endpoint), subscriptionKey);
config.setSpeechRecognitionLanguage("en-US");
config.setServiceProperty("setfeature", "forcecommit", ServicePropertyChannel.UriQueryParameter);
PushAudioInputStream pushStream = AudioInputStream.createPushStream();
AudioConfig audioInput = AudioConfig.fromStreamInput(pushStream);
SpeechRecognizer recognizer = new SpeechRecognizer(config, audioInput);
```

Use `PushAudioInputStream.commit()` to commit audio boundary. A token is returned.

Java

Copy

```java
// writing audio
pushStream.write(audioBytes);

// ...

// commit audio boundary
int token = pushStream.commit();
```

Use `SpeechRecognitionResult.getCommitToken()` to identify the result from `recognized` event that matches the commit.

Java

Copy

```java
recognizer.recognized.addEventListener((s, e) -> {
    int acknowledgedToken = e.getResult().getCommitToken();
    String tokenText = acknowledgedToken != 0 ? " commit_token=" + acknowledgedToken : "";
    System.out.println("RECOGNIZED: Reason=" + e.getResult().getReason()
        + " Text=" + e.getResult().getText() + tokenText);
});
```

You can find the complete sample in `recognitionWithPushStreamCommitAsync` in Speech SDK samples [on GitHub](https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/samples/java/jre/console/src/com/microsoft/cognitiveservices/speech/samples/console/SpeechRecognitionSamples.java).

Create a `PushAudioInputStream` and use it with `SpeechRecognizer`.

Python

Copy

```python
speech_config = speechsdk.SpeechConfig(subscription=speech_key, endpoint=speech_endpoint)
speech_config.speech_recognition_language = "en-US"

speech_config.set_service_property(
    "setfeature", "forcecommit", speechsdk.ServicePropertyChannel.UriQueryParameter)

pushStream = speechsdk.audio.PushAudioInputStream()
audio_config = speechsdk.audio.AudioConfig(stream=pushStream)
speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)
```

Use `PushAudioInputStream.commit()` to commit audio boundary. A token is returned.

Python

Copy

```python
# writing audio
pushStream.write(audio)

# ...

# commit audio boundary
token = pushStream.commit()
```

Use `SpeechRecognitionResult.commit_token` to identify the result from `recognized` event that matches the commit.

Python

Copy

```python
def recognized_cb(evt):
    result = evt.result
    commit_info = " commit_token={}".format(result.commit_token) if result.commit_token != 0 else ""
    print("RECOGNIZED: reason={} text={}{}".format(result.reason, result.text, commit_info))

speech_recognizer.recognized.connect(recognized_cb)
```

You can find the complete sample in `speech_recognition_with_push_stream_commit` in Speech SDK samples [on GitHub](https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/samples/python/console/speech_sample.py).

[Section titled: Post-stream refinement](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#post-stream-refinement)

## Post-stream refinement

Post-stream refinement gives you more accurate final results for [real-time transcription](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-to-text#real-time-transcription) with no impact to first-token latency. It runs a second recognition pass in parallel with real-time streaming, so intermediate and partial results stay low-latency. Only the final result is replaced with a more accurate version that uses broader audio context.

Monolingual post-stream refinement is generally available. Multilingual post-stream refinement is in public preview.

Expand table

| Capability | Monolingual post-stream refinement | Multilingual post-stream refinement |
| --- | --- | --- |
| Availability | Generally available | Public preview |
| Language scope | One configured locale per recognition session | Multiple supported languages in one session, including language switching |
| Language configuration | Set the recognition locale | Use open-range automatic language detection without a candidate language list |
| Phrase lists | [Supported](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/improve-accuracy-phrase-list) | Not supported during public preview |
| Diarization | [Supported](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-stt-diarization) | [Supported](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-stt-diarization) |

To enable post-stream refinement, set the `SpeechServiceResponse_PostProcessingOption` property on the `SpeechConfig` instance:

C++

Copy

```cpp
speechConfig->SetProperty(PropertyId::SpeechServiceResponse_PostProcessingOption, "PostRefinement");
```

C#

Copy

```csharp
speechConfig.SetProperty(PropertyId.SpeechServiceResponse_PostProcessingOption, "PostRefinement");
```

Java

Copy

```java
speechConfig.setProperty(PropertyId.SpeechServiceResponse_PostProcessingOption, "PostRefinement");
```

Python

Copy

```python
speech_config.set_property(
    speechsdk.PropertyId.SpeechServiceResponse_PostProcessingOption,
    "PostRefinement"
)
```

[Section titled: Multilingual post-stream refinement (preview)](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#multilingual-post-stream-refinement-preview)

### Multilingual post-stream refinement (preview)

Post-stream refinement supports multilingual recognition, so a single audio stream can span multiple languages, including switching between languages during a conversation. A single multilingual model recognizes the languages directly, so you don't set a language identification mode or provide a candidate language list. To enable the multilingual path, set `SpeechServiceResponse_PostProcessingOption` to `PostRefinement` and pass an `AutoDetectSourceLanguageConfig` configured for automatic language detection when you create the `SpeechRecognizer`.

Multilingual post-stream refinement requires Speech SDK version 1.50 or later and is available through the Speech SDK only.

During public preview, phrase lists aren't supported with multilingual post-stream refinement.

C++

Copy

```cpp
speechConfig->SetProperty(PropertyId::SpeechServiceResponse_PostProcessingOption, "PostRefinement");

auto autoDetectSourceLanguageConfig = AutoDetectSourceLanguageConfig::FromOpenRange();

auto recognizer = SpeechRecognizer::FromConfig(speechConfig, autoDetectSourceLanguageConfig, audioConfig);
```

C#

Copy

```csharp
speechConfig.SetProperty(PropertyId.SpeechServiceResponse_PostProcessingOption, "PostRefinement");

var autoDetectSourceLanguageConfig = AutoDetectSourceLanguageConfig.FromOpenRange();

var recognizer = new SpeechRecognizer(speechConfig, autoDetectSourceLanguageConfig, audioConfig);
```

Java

Copy

```java
speechConfig.setProperty(PropertyId.SpeechServiceResponse_PostProcessingOption, "PostRefinement");

AutoDetectSourceLanguageConfig autoDetectSourceLanguageConfig =
    AutoDetectSourceLanguageConfig.fromOpenRange();

SpeechRecognizer recognizer =
    new SpeechRecognizer(speechConfig, autoDetectSourceLanguageConfig, audioConfig);
```

Python

Copy

```python
speech_config.set_property(
    speechsdk.PropertyId.SpeechServiceResponse_PostProcessingOption,
    "PostRefinement"
)

auto_detect_source_language_config = speechsdk.languageconfig.AutoDetectSourceLanguageConfig()

recognizer = speechsdk.SpeechRecognizer(
    speech_config=speech_config,
    auto_detect_source_language_config=auto_detect_source_language_config,
    audio_config=audio_config)
```

During public preview, multilingual post-stream refinement recognizes 25 languages: Arabic, Chinese, Czech, Danish, Dutch, English, Finnish, French, German, Greek, Hebrew, Hindi, Hungarian, Indonesian, Italian, Japanese, Korean, Norwegian Bokmål, Polish, Portuguese, Russian, Spanish, Swedish, Thai, and Turkish. Because the service detects the spoken language automatically, you don't configure a locale. Audio in a language that isn't supported might produce unexpected results. For the specific locales that support monolingual and multilingual post-stream refinement, see [Speech to text language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt).

Some important considerations for post-stream refinement:

- Post-stream refinement works best for longer utterances such as conversations, meetings, and dictation. For very short phrases, the refined result might be identical to the standard result.
- Post-stream refinement and TrueText are separate values of the same `SpeechServiceResponse_PostProcessingOption` property. Only one value can be set at a time.
- Monolingual and multilingual post-stream refinement have different [Azure region availability](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions?tabs=stt).

For more information about post-processing options, see [How to use post-processing](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-post-processing).

Important

In multilingual post-stream refinement, some locales might not show significant quality gains, and results can differ from what you observe with standard recognition.

[Reference documentation](https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/) \| [Package (npm)](https://www.npmjs.com/package/microsoft-cognitiveservices-speech-sdk) \| [Additional samples on GitHub](https://aka.ms/speech/github-javascript) \| [Library source code](https://github.com/Microsoft/cognitive-services-speech-sdk-js)

In this how-to guide, you learn how to use Azure Speech in Foundry Tools for real-time speech to text conversion. Real-time speech recognition is ideal for applications requiring immediate transcription, such as dictation, call center assistance, and captioning for live meetings.

To learn how to set up the environment for a sample application, see [Quickstart: Recognize and convert speech to text](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-speech-to-text).

[Section titled: Create a speech configuration instance](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#create-a-speech-configuration-instance)

## Create a speech configuration instance

To call the Speech service by using the Speech SDK, you need to create a [`SpeechConfig`](https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/speechconfig) instance. This class includes information about your Speech resource, like your key and associated region, endpoint, host, or authorization token.

1. Create a Foundry resource for Speech in the [Azure portal](https://portal.azure.com/#create/Microsoft.CognitiveServicesAIFoundry). Get the Speech resource key and endpoint.
2. Create a `SpeechConfig` instance by using the following code. Replace `YourSpeechEndpoint` and `YourSpeechKey` with your Speech resource endpoint and key.

JavaScript

Copy

```javascript
const speechConfig = sdk.SpeechConfig.fromEndpoint(new URL("YourSpeechEndpoint"), "YourSpeechKey");
```

You can initialize `SpeechConfig` in a few other ways:

- Use an endpoint, and pass in a Speech service endpoint. A key or authorization token is optional.
- Use a host, and pass in a host address. A key or authorization token is optional.
- Use an authorization token with the associated region/location.

Note

Regardless of whether you're performing speech recognition, speech synthesis, translation, or intent recognition, you always create a configuration.

[Section titled: Recognize speech from a microphone](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#recognize-speech-from-a-microphone)

## Recognize speech from a microphone

Recognizing speech from a microphone isn't supported in Node.js. It's supported only in a browser-based JavaScript environment. For more information, see the [React sample](https://github.com/Azure-Samples/AzureSpeechReactSample) and the [implementation of speech to text from a microphone](https://github.com/Azure-Samples/AzureSpeechReactSample/blob/main/src/App.js#L29) on GitHub. The React sample shows design patterns for the exchange and management of authentication tokens. It also shows the capture of audio from a microphone or file for speech to text conversions.

Note

If you want to use a _specific_ audio input device, you need to specify the device ID in `AudioConfig`. To learn how to get the device ID, see [Select an audio input device with the Speech SDK](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-select-audio-input-devices).

[Section titled: Recognize speech from a file](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#recognize-speech-from-a-file)

## Recognize speech from a file

To recognize speech from an audio file, create an `AudioConfig` instance by using the `fromWavFileInput()` method, which accepts a `Buffer` object. Then initialize [`SpeechRecognizer`](https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/speechrecognizer) by passing `audioConfig` and `speechConfig`.

JavaScript

Copy

```javascript
const fs = require('fs');
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const speechConfig = sdk.SpeechConfig.fromEndpoint("YourSpeechEndpoint", "YourSpeechKey");

function fromFile() {
    let audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync("YourAudioFile.wav"));
    let speechRecognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    speechRecognizer.recognizeOnceAsync(result => {
        console.log(`RECOGNIZED: Text=${result.text}`);
        speechRecognizer.close();
    });
}
fromFile();
```

[Section titled: Recognize speech from an in-memory stream](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#recognize-speech-from-an-in-memory-stream)

## Recognize speech from an in-memory stream

For many use cases, your audio data likely comes from Azure Blob Storage. Or it's already in memory as an [`ArrayBuffer`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer) or a similar raw data structure. The following code:

- Creates a push stream by using `createPushStream()`.
- Reads a _.wav_ file by using `fs.createReadStream` for demonstration purposes. If you already have audio data in the `ArrayBuffer`, you can skip directly to writing the content to the input stream.
- Creates an audio configuration by using the push stream.

JavaScript

Copy

```javascript
const fs = require('fs');
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const speechConfig = sdk.SpeechConfig.fromEndpoint("YourSpeechEndpoint", "YourSpeechKey");

function fromStream() {
    let pushStream = sdk.AudioInputStream.createPushStream();

    fs.createReadStream("YourAudioFile.wav").on('data', function(arrayBuffer) {
        pushStream.write(arrayBuffer.slice());
    }).on('end', function() {
        pushStream.close();
    });

    let audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    let speechRecognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    speechRecognizer.recognizeOnceAsync(result => {
        console.log(`RECOGNIZED: Text=${result.text}`);
        speechRecognizer.close();
    });
}
fromStream();
```

Using a push stream as input assumes that the audio data is raw pulse-code modulation (PCM) data that skips any headers. The API still works in certain cases if the header isn't skipped. For the best results, consider implementing logic to read off the headers so that `fs` begins at the _start of the audio data_.

[Section titled: Handle errors](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#handle-errors)

## Handle errors

The previous examples only get the recognized text from the `result.text` property. To handle errors and other responses, you need to write some code to handle the result. The following code evaluates the [`result.reason`](https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/speechrecognitionresult#reason) property and:

- Prints the recognition result: `ResultReason.RecognizedSpeech`.
- If there's no recognition match, it informs the user: `ResultReason.NoMatch`.
- If an error is encountered, it prints the error message: `ResultReason.Canceled`.

JavaScript

Copy

```javascript
switch (result.reason) {
    case sdk.ResultReason.RecognizedSpeech:
        console.log(`RECOGNIZED: Text=${result.text}`);
        break;
    case sdk.ResultReason.NoMatch:
        console.log("NOMATCH: Speech could not be recognized.");
        break;
    case sdk.ResultReason.Canceled:
        const cancellation = sdk.CancellationDetails.fromResult(result);
        console.log(`CANCELED: Reason=${cancellation.reason}`);

        if (cancellation.reason == sdk.CancellationReason.Error) {
            console.log(`CANCELED: ErrorCode=${cancellation.ErrorCode}`);
            console.log(`CANCELED: ErrorDetails=${cancellation.errorDetails}`);
            console.log("CANCELED: Did you set the speech resource key and endpoint values?");
        }
        break;
    }
```

[Section titled: Use continuous recognition](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#use-continuous-recognition)

## Use continuous recognition

The previous examples use single-shot recognition, which recognizes a single utterance. The end of a single utterance is determined by listening for silence at the end or until a maximum of 15 seconds of audio is processed.

In contrast, you can use continuous recognition when you want to control when to stop recognizing. It requires you to subscribe to the `Recognizing`, `Recognized`, and `Canceled` events to get the recognition results. To stop recognition, you must call \[`stopContinuousRecognitionAsync`\]
(/javascript/api/microsoft-cognitiveservices-speech-sdk/speechrecognizer#microsoft-cognitiveservices-speech-sdk-speechrecognizer-stopcontinuousrecognitionasync). Here's an example of how continuous recognition is performed on an audio input file.

Start by defining the input and initializing [`SpeechRecognizer`](https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/speechrecognizer):

JavaScript

Copy

```javascript
const speechRecognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
```

Next, subscribe to the events sent from [`SpeechRecognizer`](https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/speechrecognizer):

- [`recognizing`](https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/speechrecognizer#recognizing): Signal for events that contain intermediate recognition results.
- [`recognized`](https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/speechrecognizer#recognized): Signal for events that contain final recognition results, which indicate a successful recognition attempt.
- [`sessionStopped`](https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/speechrecognizer#sessionstopped): Signal for events that indicate the end of a recognition session (operation).
- [`canceled`](https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/speechrecognizer#canceled): Signal for events that contain canceled recognition results. These results indicate a recognition attempt that was canceled as a result of a direct cancellation request. Alternatively, they indicate a transport or protocol failure.

JavaScript

Copy

```javascript
speechRecognizer.recognizing = (s, e) => {
    console.log(`RECOGNIZING: Text=${e.result.text}`);
};

speechRecognizer.recognized = (s, e) => {
    if (e.result.reason == sdk.ResultReason.RecognizedSpeech) {
        console.log(`RECOGNIZED: Text=${e.result.text}`);
    }
    else if (e.result.reason == sdk.ResultReason.NoMatch) {
        console.log("NOMATCH: Speech could not be recognized.");
    }
};

speechRecognizer.canceled = (s, e) => {
    console.log(`CANCELED: Reason=${e.reason}`);

    if (e.reason == sdk.CancellationReason.Error) {
        console.log(`"CANCELED: ErrorCode=${e.errorCode}`);
        console.log(`"CANCELED: ErrorDetails=${e.errorDetails}`);
        console.log("CANCELED: Did you set the speech resource key and endpoint values?");
    }

    speechRecognizer.stopContinuousRecognitionAsync();
};

speechRecognizer.sessionStopped = (s, e) => {
    console.log("\n    Session stopped event.");
    speechRecognizer.stopContinuousRecognitionAsync();
};
```

With everything set up, call \[`startContinuousRecognitionAsync`\]
(/javascript/api/microsoft-cognitiveservices-speech-sdk/speechrecognizer#microsoft-cognitiveservices-speech-sdk-speechrecognizer-startkeywordrecognitionasync) to start recognizing:

JavaScript

Copy

```javascript
speechRecognizer.startContinuousRecognitionAsync();

// Make the following call at some point to stop recognition:
// speechRecognizer.stopContinuousRecognitionAsync();
```

[Section titled: Change the source language](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#change-the-source-language)

## Change the source language

A common task for speech recognition is specifying the input (or source) language. The following example shows how to change the input language to Italian. In your code, find your [`SpeechConfig`](https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/speechconfig) instance and add this line directly below it:

JavaScript

Copy

```javascript
speechConfig.speechRecognitionLanguage = "it-IT";
```

The [`speechRecognitionLanguage`](https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/speechconfig#microsoft-cognitiveservices-speech-sdk-speechconfig-speechrecognitionlanguage) property expects a language-locale format string. For a list of supported locales, see [Language and voice support for the Speech service](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support).

[Section titled: Language identification](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#language-identification)

## Language identification

You can use language identification with speech to text recognition when you need to identify the language in an audio source and then transcribe it to text.

For a complete code sample, see [Language identification](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-identification?pivots=programming-language-javascript).

[Section titled: Use a custom endpoint](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#use-a-custom-endpoint)

## Use a custom endpoint

With [custom speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/custom-speech-overview), you can upload your own data, test and train a custom model, compare accuracy between models, and deploy a model to a custom endpoint. The following example shows how to set a custom endpoint.

JavaScript

Copy

```javascript
var speechConfig = SpeechSDK.SpeechConfig.fromSubscription("YourSpeechResoureKey", "YourServiceRegion");
speechConfig.endpointId = "YourEndpointId";
var speechRecognizer = new SpeechSDK.SpeechRecognizer(speechConfig);
```

[Section titled: Run and use a container](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#run-and-use-a-container)

## Run and use a container

Speech containers provide websocket-based query endpoint APIs that are accessed through the Speech SDK and Speech CLI. By default, the Speech SDK and Speech CLI use the public Speech service. To use the container, you need to change the initialization method. Use a container host URL instead of key and region.

For more information about containers, see Host URLs in [Install and run Speech containers with Docker](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-container-howto#host-urls).

[Reference documentation](https://learn.microsoft.com/en-us/java/api/com.microsoft.cognitiveservices.speech) \| [Additional samples on GitHub](https://aka.ms/speech/github-java)

In this how-to guide, you learn how to use Azure Speech in Foundry Tools for real-time speech to text conversion. Real-time speech recognition is ideal for applications requiring immediate transcription, such as dictation, call center assistance, and captioning for live meetings.

To learn how to set up the environment for a sample application, see [Quickstart: Recognize and convert speech to text](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-speech-to-text).

[Section titled: Create a speech configuration instance](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#create-a-speech-configuration-instance)

## Create a speech configuration instance

To call the Speech service by using the Speech SDK, you need to create a [SpeechConfig](https://learn.microsoft.com/en-us/java/api/com.microsoft.cognitiveservices.speech.speechconfig) instance. This class includes information about your Speech resource, like your key and associated region, endpoint, host, or authorization token.

1. Create a Foundry resource for Speech in the [Azure portal](https://portal.azure.com/#create/Microsoft.CognitiveServicesAIFoundry). Get the Speech resource key and region.
2. Create a `SpeechConfig` instance by using your Speech key and region.

Java

Copy

```java
import com.microsoft.cognitiveservices.speech.*;
import com.microsoft.cognitiveservices.speech.audio.AudioConfig;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;

public class Program {
    public static void main(String[] args) throws InterruptedException, ExecutionException, URISyntaxException {
        SpeechConfig speechConfig = SpeechConfig.fromEndpoint(new URI("<paste-your-speech-endpoint>"), "<paste-your-speech-key>");
    }
}
```

You can initialize `SpeechConfig` in a few other ways:

- Use an endpoint, and pass in a Speech service endpoint. A key or authorization token is optional.
- Use a host, and pass in a host address. A key or authorization token is optional.
- Use an authorization token with the associated region/location.

Note

Regardless of whether you're performing speech recognition, speech synthesis, translation, or intent recognition, you'll always create a configuration.

[Section titled: Recognize speech from a microphone](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#recognize-speech-from-a-microphone)

## Recognize speech from a microphone

To recognize speech by using your device microphone, create an `AudioConfig` instance by using the `fromDefaultMicrophoneInput()` method. Then initialize the [`SpeechRecognizer`](https://learn.microsoft.com/en-us/java/api/com.microsoft.cognitiveservices.speech.speechrecognizer) object by passing `audioConfig` and `config`.

Java

Copy

```java
import com.microsoft.cognitiveservices.speech.*;
import com.microsoft.cognitiveservices.speech.audio.AudioConfig;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;

public class Program {
    public static void main(String[] args) throws InterruptedException, ExecutionException, URISyntaxException {
        SpeechConfig speechConfig = SpeechConfig.fromEndpoint(new URI("<paste-your-speech-endpoint>"), "<paste-your-speech-key>");
        fromMic(speechConfig);
    }

    public static void fromMic(SpeechConfig speechConfig) throws InterruptedException, ExecutionException {
        AudioConfig audioConfig = AudioConfig.fromDefaultMicrophoneInput();
        SpeechRecognizer speechRecognizer = new SpeechRecognizer(speechConfig, audioConfig);

        System.out.println("Speak into your microphone.");
        Future<SpeechRecognitionResult> task = speechRecognizer.recognizeOnceAsync();
        SpeechRecognitionResult speechRecognitionResult = task.get();
        System.out.println("RECOGNIZED: Text=" + speechRecognitionResult.getText());
    }
}
```

If you want to use a _specific_ audio input device, you need to specify the device ID in `AudioConfig`. To learn how to get the device ID, see [Select an audio input device with the Speech SDK](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-select-audio-input-devices).

[Section titled: Recognize speech from a file](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#recognize-speech-from-a-file)

## Recognize speech from a file

If you want to recognize speech from an audio file instead of using a microphone, you still need to create an `AudioConfig` instance. However, you don't call `FromDefaultMicrophoneInput()`. You call `fromWavFileInput()` and pass the file path:

Java

Copy

```java
import com.microsoft.cognitiveservices.speech.*;
import com.microsoft.cognitiveservices.speech.audio.AudioConfig;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;

public class Program {
    public static void main(String[] args) throws InterruptedException, ExecutionException, URISyntaxException {
        SpeechConfig speechConfig = SpeechConfig.fromEndpoint(new URI("<paste-your-speech-endpoint>"), "<paste-your-speech-key>");
        fromFile(speechConfig);
    }

    public static void fromFile(SpeechConfig speechConfig) throws InterruptedException, ExecutionException {
        AudioConfig audioConfig = AudioConfig.fromWavFileInput("YourAudioFile.wav");
        SpeechRecognizer speechRecognizer = new SpeechRecognizer(speechConfig, audioConfig);

        Future<SpeechRecognitionResult> task = speechRecognizer.recognizeOnceAsync();
        SpeechRecognitionResult speechRecognitionResult = task.get();
        System.out.println("RECOGNIZED: Text=" + speechRecognitionResult.getText());
    }
}
```

[Section titled: Handle errors](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#handle-errors)

## Handle errors

The previous examples only get the recognized text by using `speechRecognitionResult.getText()`. To handle errors and other responses, you need to write some code to handle the result. The following example evaluates [`speechRecognitionResult.getReason()`](https://learn.microsoft.com/en-us/java/api/com.microsoft.cognitiveservices.speech.recognitionresult.getreason) and:

- Prints the recognition result: `ResultReason.RecognizedSpeech`.
- If there's no recognition match, it informs the user: `ResultReason.NoMatch`.
- If an error is encountered, it prints the error message: `ResultReason.Canceled`.

Java

Copy

```java
switch (speechRecognitionResult.getReason()) {
    case ResultReason.RecognizedSpeech:
        System.out.println("We recognized: " + speechRecognitionResult.getText());
        exitCode = 0;
        break;
    case ResultReason.NoMatch:
        System.out.println("NOMATCH: Speech could not be recognized.");
        break;
    case ResultReason.Canceled: {
            CancellationDetails cancellation = CancellationDetails.fromResult(speechRecognitionResult);
            System.out.println("CANCELED: Reason=" + cancellation.getReason());

            if (cancellation.getReason() == CancellationReason.Error) {
                System.out.println("CANCELED: ErrorCode=" + cancellation.getErrorCode());
                System.out.println("CANCELED: ErrorDetails=" + cancellation.getErrorDetails());
                System.out.println("CANCELED: Did you set the speech resource key and region values?");
            }
        }
        break;
}
```

[Section titled: Use continuous recognition](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#use-continuous-recognition)

## Use continuous recognition

The previous examples use single-shot recognition, which recognizes a single utterance. The end of a single utterance is determined by listening for silence at the end or until a maximum of 15 seconds of audio is processed.

In contrast, you use continuous recognition when you want to control when to stop recognizing. It requires you to subscribe to the `recognizing`, `recognized`, and `canceled` events to get the recognition results. To stop recognition, you must call [`stopContinuousRecognitionAsync`](https://learn.microsoft.com/en-us/java/api/com.microsoft.cognitiveservices.speech.speechrecognizer.stopcontinuousrecognitionasync). Here's an example of how you can perform continuous recognition on an audio input file.

Start by defining the input and initializing [`SpeechRecognizer`](https://learn.microsoft.com/en-us/java/api/com.microsoft.cognitiveservices.speech.speechrecognizer):

Java

Copy

```java
AudioConfig audioConfig = AudioConfig.fromWavFileInput("YourAudioFile.wav");
SpeechRecognizer speechRecognizer = new SpeechRecognizer(config, audioConfig);
```

Next, create a variable to manage the state of speech recognition. Declare a `Semaphore` instance at the class scope:

Java

Copy

```java
private static Semaphore stopTranslationWithFileSemaphore;
```

Next, subscribe to the events that [`SpeechRecognizer`](https://learn.microsoft.com/en-us/java/api/com.microsoft.cognitiveservices.speech.speechrecognizer) sends:

- [`recognizing`](https://learn.microsoft.com/en-us/java/api/com.microsoft.cognitiveservices.speech.speechrecognizer.recognizing): Signal for events that contain intermediate recognition results.
- [`recognized`](https://learn.microsoft.com/en-us/java/api/com.microsoft.cognitiveservices.speech.speechrecognizer.recognized): Signal for events that contain final recognition results, which indicate a successful recognition attempt.
- [`sessionStopped`](https://learn.microsoft.com/en-us/java/api/com.microsoft.cognitiveservices.speech.recognizer.sessionstopped): Signal for events that indicate the end of a recognition session (operation).
- [`canceled`](https://learn.microsoft.com/en-us/java/api/com.microsoft.cognitiveservices.speech.speechrecognizer.canceled): Signal for events that contain canceled recognition results. These results indicate a recognition attempt that was canceled as a result of a direct cancellation request. Alternatively, they indicate a transport or protocol failure.

Java

Copy

```java
// First initialize the semaphore.
stopTranslationWithFileSemaphore = new Semaphore(0);

speechRecognizer.recognizing.addEventListener((s, e) -> {
    System.out.println("RECOGNIZING: Text=" + e.getResult().getText());
});

speechRecognizer.recognized.addEventListener((s, e) -> {
    if (e.getResult().getReason() == ResultReason.RecognizedSpeech) {
        System.out.println("RECOGNIZED: Text=" + e.getResult().getText());
    }
    else if (e.getResult().getReason() == ResultReason.NoMatch) {
        System.out.println("NOMATCH: Speech could not be recognized.");
    }
});

speechRecognizer.canceled.addEventListener((s, e) -> {
    System.out.println("CANCELED: Reason=" + e.getReason());

    if (e.getReason() == CancellationReason.Error) {
        System.out.println("CANCELED: ErrorCode=" + e.getErrorCode());
        System.out.println("CANCELED: ErrorDetails=" + e.getErrorDetails());
        System.out.println("CANCELED: Did you set the speech resource key and region values?");
    }

    stopTranslationWithFileSemaphore.release();
});

speechRecognizer.sessionStopped.addEventListener((s, e) -> {
    System.out.println("\n    Session stopped event.");
    stopTranslationWithFileSemaphore.release();
});
```

With everything set up, call [`startContinuousRecognitionAsync`](https://learn.microsoft.com/en-us/java/api/com.microsoft.cognitiveservices.speech.speechrecognizer.startcontinuousrecognitionasync) to start recognizing:

Java

Copy

```java
// Starts continuous recognition. Uses StopContinuousRecognitionAsync() to stop recognition.
speechRecognizer.startContinuousRecognitionAsync().get();

// Waits for completion.
stopTranslationWithFileSemaphore.acquire();

// Stops recognition.
speechRecognizer.stopContinuousRecognitionAsync().get();
```

[Section titled: Change the source language](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#change-the-source-language)

## Change the source language

A common task for speech recognition is specifying the input (or source) language. The following example shows how to change the input language to French. In your code, find your [`SpeechConfig`](https://learn.microsoft.com/en-us/java/api/com.microsoft.cognitiveservices.speech.speechconfig) instance, and add this line directly below it:

Java

Copy

```java
config.setSpeechRecognitionLanguage("fr-FR");
```

[`setSpeechRecognitionLanguage`](https://learn.microsoft.com/en-us/java/api/com.microsoft.cognitiveservices.speech.speechconfig.setspeechrecognitionlanguage) is a parameter that takes a string as an argument. Refer to the [list of supported speech to text locales](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt).

[Section titled: Language identification](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#language-identification)

## Language identification

You can use language identification with speech to text recognition when you need to identify the language in an audio source and then transcribe it to text.

For a complete code sample, see [Language identification](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-identification?pivots=programming-language-java).

[Section titled: Use a custom endpoint](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#use-a-custom-endpoint)

## Use a custom endpoint

With [custom speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/custom-speech-overview), you can upload your own data, test and train a custom model, compare accuracy between models, and deploy a model to a custom endpoint. The following example shows how to set a custom endpoint:

Java

Copy

```java
SpeechConfig speechConfig = SpeechConfig.FromSubscription("YourSpeechKey", "YourServiceRegion");
speechConfig.setEndpointId("YourEndpointId");
SpeechRecognizer speechRecognizer = new SpeechRecognizer(speechConfig);
```

[Section titled: Run and use a container](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#run-and-use-a-container)

## Run and use a container

Speech containers provide websocket-based query endpoint APIs that are accessed through the Speech SDK and Speech CLI. By default, the Speech SDK and Speech CLI use the public Speech service. To use the container, you need to change the initialization method. Use a container host URL instead of key and region.

For more information about containers, see Host URLs in [Install and run Speech containers with Docker](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-container-howto#host-urls).

[Section titled: Semantic segmentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#semantic-segmentation)

## Semantic segmentation

Semantic segmentation is a speech recognition segmentation strategy that's designed to mitigate issues associated with silence-based segmentation:

- Under-segmentation: When users speak for a long time without pauses, they can see a long sequence of text without breaks ("wall of text"), which severely degrades their readability experience.
- Over-segmentation: When a user pauses for a short time, the silence detection mechanism can segment incorrectly.

Instead of only relying on silence timeouts, semantic segmentation mostly segments and returns final results when it detects sentence-ending punctuation (such as '.' or '?'). This improves the user experience with higher-quality, semantically complete segments and prevents long intermediate results.

To use semantic segmentation, you need to set the following property on the `SpeechConfig` instance used to create a `SpeechRecognizer`:

Java

Copy

```java
speechConfig.SetProperty(PropertyId.Speech_SegmentationStrategy, "Semantic");
```

Some of the limitations of semantic segmentation are as follows:

- You need the Speech SDK version 1.41 or later to use semantic segmentation.
- Semantic segmentation is only intended for use in [continuous recognition](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#use-continuous-recognition). This includes scenarios such as dictation and captioning. It shouldn't be used in the single recognition mode or interactive scenarios.
- Semantic segmentation isn't available for all languages and locales.
- Semantic segmentation doesn't yet support confidence scores and NBest lists. As such, we don't recommend semantic segmentation if you're using confidence scores or NBest lists.

[Section titled: Commit an explicit audio boundary (preview)](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#commit-an-explicit-audio-boundary-preview)

## Commit an explicit audio boundary (preview)

When you stream audio to Azure Speech Service, the service automatically segments the audio and generates transcription results accordingly. However, in certain scenarios, such as turn-based voice agents, you might need to explicitly define boundaries in the transcription stream. You can now achieve this goal by using the `Commit()` method of `PushAudioInputStream`.

Using an explicit audio boundary requires Speech SDK version 1.52 or later. It also requires the service property `setfeature=forcecommit` to be enabled.

During public preview, the following limitations apply:

- Only PCM, A-law, μ-law, and G.711 audio formats are supported. Other compressed audio formats aren't supported.
- Microsoft Audio Stack (MAS) isn't supported.

Create a `PushAudioInputStream` and use it with `SpeechRecognizer`.

C#

Copy

```csharp
var config = SpeechConfig.FromEndpoint(new Uri(endpoint), subscriptionKey);
config.SpeechRecognitionLanguage = "en-US";
config.SetServiceProperty("setfeature", "forcecommit", ServicePropertyChannel.UriQueryParameter);
var pushStream = AudioInputStream.CreatePushStream();
var audioInput = AudioConfig.FromStreamInput(pushStream);
var recognizer = new SpeechRecognizer(config, audioInput);
```

Use `PushAudioInputStream.Commit()` to commit audio boundary. A token is returned.

C#

Copy

```csharp
// writing audio
pushStream.Write(audioBytes);

// ...

// commit audio boundary
var token = pushStream.Commit();
```

Use `SpeechRecognitionResult.CommitToken` to identify the result from `Recognized` event that matches the commit.

C#

Copy

```csharp
recognizer.Recognized += (s, e) =>
{
    var token = e.Result.CommitToken;
    var tokenText = token != 0 ? $" commit_token={token}" : "";
    Console.WriteLine($"RECOGNIZED: Reason={e.Result.Reason} Text={e.Result.Text}{tokenText}");
};
```

You can find the complete sample in `RecognitionWithPushStreamCommitAsync` in Speech SDK samples [on GitHub](https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/samples/csharp/sharedcontent/console/speech_recognition_samples.cs).

Create a `PushAudioInputStream` and use it with `SpeechRecognizer`.

C++

Copy

```cpp
auto config = SpeechConfig::FromEndpoint(endpoint, subscriptionKey);
config->SetSpeechRecognitionLanguage("en-US");
config->SetServiceProperty("setfeature", "forcecommit", ServicePropertyChannel::UriQueryParameter);
auto pushStream = AudioInputStream::CreatePushStream();
auto recognizer = SpeechRecognizer::FromConfig(config, AudioConfig::FromStreamInput(pushStream));
```

Use `PushAudioInputStream::Commit()` to commit audio boundary. A token is returned.

C++

Copy

```cpp
// vector<uint8_t> audioBytes(3200);
// ... read audio into audioBytes
// writing audio
pushStream->Write(audioBytes.data(),static_cast<uint32_t>(audioBytes.size()));

// ...

// commit audio boundary
uint32_t token = pushStream->Commit();
```

Use `SpeechRecognitionResult::CommitToken()` to identify the result from `Recognized` event that matches the commit.

C++

Copy

```cpp
recognizer->Recognized.Connect([&](const SpeechRecognitionEventArgs& e)
{
    cout << "RECOGNIZED: Reason=" << (int)e.Result->Reason << " Text=" << e.Result->Text;
    // NoMatch can acknowledge a commit; naturally segmented results have token 0.
    if (e.Result->CommitToken() != 0)
    {
        uint32_t acknowledgedToken = e.Result->CommitToken();
        cout << " commit_token=" << acknowledgedToken;
    }
    cout << endl;
});
```

You can find the complete sample in `SpeechRecognitionWithPushStreamCommit` in Speech SDK samples [on GitHub](https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/samples/cpp/windows/console/samples/speech_recognition_samples.cpp).

Create a `PushAudioInputStream` and use it with `SpeechRecognizer`.

Java

Copy

```java
SpeechConfig config = SpeechConfig.fromEndpoint(new URI(endpoint), subscriptionKey);
config.setSpeechRecognitionLanguage("en-US");
config.setServiceProperty("setfeature", "forcecommit", ServicePropertyChannel.UriQueryParameter);
PushAudioInputStream pushStream = AudioInputStream.createPushStream();
AudioConfig audioInput = AudioConfig.fromStreamInput(pushStream);
SpeechRecognizer recognizer = new SpeechRecognizer(config, audioInput);
```

Use `PushAudioInputStream.commit()` to commit audio boundary. A token is returned.

Java

Copy

```java
// writing audio
pushStream.write(audioBytes);

// ...

// commit audio boundary
int token = pushStream.commit();
```

Use `SpeechRecognitionResult.getCommitToken()` to identify the result from `recognized` event that matches the commit.

Java

Copy

```java
recognizer.recognized.addEventListener((s, e) -> {
    int acknowledgedToken = e.getResult().getCommitToken();
    String tokenText = acknowledgedToken != 0 ? " commit_token=" + acknowledgedToken : "";
    System.out.println("RECOGNIZED: Reason=" + e.getResult().getReason()
        + " Text=" + e.getResult().getText() + tokenText);
});
```

You can find the complete sample in `recognitionWithPushStreamCommitAsync` in Speech SDK samples [on GitHub](https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/samples/java/jre/console/src/com/microsoft/cognitiveservices/speech/samples/console/SpeechRecognitionSamples.java).

Create a `PushAudioInputStream` and use it with `SpeechRecognizer`.

Python

Copy

```python
speech_config = speechsdk.SpeechConfig(subscription=speech_key, endpoint=speech_endpoint)
speech_config.speech_recognition_language = "en-US"

speech_config.set_service_property(
    "setfeature", "forcecommit", speechsdk.ServicePropertyChannel.UriQueryParameter)

pushStream = speechsdk.audio.PushAudioInputStream()
audio_config = speechsdk.audio.AudioConfig(stream=pushStream)
speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)
```

Use `PushAudioInputStream.commit()` to commit audio boundary. A token is returned.

Python

Copy

```python
# writing audio
pushStream.write(audio)

# ...

# commit audio boundary
token = pushStream.commit()
```

Use `SpeechRecognitionResult.commit_token` to identify the result from `recognized` event that matches the commit.

Python

Copy

```python
def recognized_cb(evt):
    result = evt.result
    commit_info = " commit_token={}".format(result.commit_token) if result.commit_token != 0 else ""
    print("RECOGNIZED: reason={} text={}{}".format(result.reason, result.text, commit_info))

speech_recognizer.recognized.connect(recognized_cb)
```

You can find the complete sample in `speech_recognition_with_push_stream_commit` in Speech SDK samples [on GitHub](https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/samples/python/console/speech_sample.py).

[Section titled: Post-stream refinement](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#post-stream-refinement)

## Post-stream refinement

Post-stream refinement gives you more accurate final results for [real-time transcription](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-to-text#real-time-transcription) with no impact to first-token latency. It runs a second recognition pass in parallel with real-time streaming, so intermediate and partial results stay low-latency. Only the final result is replaced with a more accurate version that uses broader audio context.

Monolingual post-stream refinement is generally available. Multilingual post-stream refinement is in public preview.

Expand table

| Capability | Monolingual post-stream refinement | Multilingual post-stream refinement |
| --- | --- | --- |
| Availability | Generally available | Public preview |
| Language scope | One configured locale per recognition session | Multiple supported languages in one session, including language switching |
| Language configuration | Set the recognition locale | Use open-range automatic language detection without a candidate language list |
| Phrase lists | [Supported](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/improve-accuracy-phrase-list) | Not supported during public preview |
| Diarization | [Supported](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-stt-diarization) | [Supported](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-stt-diarization) |

To enable post-stream refinement, set the `SpeechServiceResponse_PostProcessingOption` property on the `SpeechConfig` instance:

C++

Copy

```cpp
speechConfig->SetProperty(PropertyId::SpeechServiceResponse_PostProcessingOption, "PostRefinement");
```

C#

Copy

```csharp
speechConfig.SetProperty(PropertyId.SpeechServiceResponse_PostProcessingOption, "PostRefinement");
```

Java

Copy

```java
speechConfig.setProperty(PropertyId.SpeechServiceResponse_PostProcessingOption, "PostRefinement");
```

Python

Copy

```python
speech_config.set_property(
    speechsdk.PropertyId.SpeechServiceResponse_PostProcessingOption,
    "PostRefinement"
)
```

[Section titled: Multilingual post-stream refinement (preview)](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#multilingual-post-stream-refinement-preview)

### Multilingual post-stream refinement (preview)

Post-stream refinement supports multilingual recognition, so a single audio stream can span multiple languages, including switching between languages during a conversation. A single multilingual model recognizes the languages directly, so you don't set a language identification mode or provide a candidate language list. To enable the multilingual path, set `SpeechServiceResponse_PostProcessingOption` to `PostRefinement` and pass an `AutoDetectSourceLanguageConfig` configured for automatic language detection when you create the `SpeechRecognizer`.

Multilingual post-stream refinement requires Speech SDK version 1.50 or later and is available through the Speech SDK only.

During public preview, phrase lists aren't supported with multilingual post-stream refinement.

C++

Copy

```cpp
speechConfig->SetProperty(PropertyId::SpeechServiceResponse_PostProcessingOption, "PostRefinement");

auto autoDetectSourceLanguageConfig = AutoDetectSourceLanguageConfig::FromOpenRange();

auto recognizer = SpeechRecognizer::FromConfig(speechConfig, autoDetectSourceLanguageConfig, audioConfig);
```

C#

Copy

```csharp
speechConfig.SetProperty(PropertyId.SpeechServiceResponse_PostProcessingOption, "PostRefinement");

var autoDetectSourceLanguageConfig = AutoDetectSourceLanguageConfig.FromOpenRange();

var recognizer = new SpeechRecognizer(speechConfig, autoDetectSourceLanguageConfig, audioConfig);
```

Java

Copy

```java
speechConfig.setProperty(PropertyId.SpeechServiceResponse_PostProcessingOption, "PostRefinement");

AutoDetectSourceLanguageConfig autoDetectSourceLanguageConfig =
    AutoDetectSourceLanguageConfig.fromOpenRange();

SpeechRecognizer recognizer =
    new SpeechRecognizer(speechConfig, autoDetectSourceLanguageConfig, audioConfig);
```

Python

Copy

```python
speech_config.set_property(
    speechsdk.PropertyId.SpeechServiceResponse_PostProcessingOption,
    "PostRefinement"
)

auto_detect_source_language_config = speechsdk.languageconfig.AutoDetectSourceLanguageConfig()

recognizer = speechsdk.SpeechRecognizer(
    speech_config=speech_config,
    auto_detect_source_language_config=auto_detect_source_language_config,
    audio_config=audio_config)
```

During public preview, multilingual post-stream refinement recognizes 25 languages: Arabic, Chinese, Czech, Danish, Dutch, English, Finnish, French, German, Greek, Hebrew, Hindi, Hungarian, Indonesian, Italian, Japanese, Korean, Norwegian Bokmål, Polish, Portuguese, Russian, Spanish, Swedish, Thai, and Turkish. Because the service detects the spoken language automatically, you don't configure a locale. Audio in a language that isn't supported might produce unexpected results. For the specific locales that support monolingual and multilingual post-stream refinement, see [Speech to text language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt).

Some important considerations for post-stream refinement:

- Post-stream refinement works best for longer utterances such as conversations, meetings, and dictation. For very short phrases, the refined result might be identical to the standard result.
- Post-stream refinement and TrueText are separate values of the same `SpeechServiceResponse_PostProcessingOption` property. Only one value can be set at a time.
- Monolingual and multilingual post-stream refinement have different [Azure region availability](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions?tabs=stt).

For more information about post-processing options, see [How to use post-processing](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-post-processing).

Important

In multilingual post-stream refinement, some locales might not show significant quality gains, and results can differ from what you observe with standard recognition.

[Reference documentation](https://learn.microsoft.com/en-us/cpp/cognitive-services/speech/) \| [Package (NuGet)](https://www.nuget.org/packages/Microsoft.CognitiveServices.Speech) \| [Additional samples on GitHub](https://aka.ms/speech/github-cpp)

In this how-to guide, you learn how to use Azure Speech in Foundry Tools for real-time speech to text conversion. Real-time speech recognition is ideal for applications requiring immediate transcription, such as dictation, call center assistance, and captioning for live meetings.

To learn how to set up the environment for a sample application, see [Quickstart: Recognize and convert speech to text](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-speech-to-text).

[Section titled: Create a speech configuration instance](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#create-a-speech-configuration-instance)

## Create a speech configuration instance

To call the Speech service using the Speech SDK, you need to create a [`SpeechConfig`](https://learn.microsoft.com/en-us/cpp/cognitive-services/speech/speechconfig) instance. This class includes information about your Speech resource, like your key and associated region, endpoint, host, or authorization token.

1. Create a Foundry resource for Speech in the [Azure portal](https://portal.azure.com/#create/Microsoft.CognitiveServicesAIFoundry). Get the Speech resource key and endpoint.
2. Create a `SpeechConfig` instance by using the following code. Replace `YourSpeechKey` and `YourSpeechEndpoint` with your Speech resource key and endpoint.

C++

Copy

```cpp
using namespace std;
using namespace Microsoft::CognitiveServices::Speech;

auto speechConfig = SpeechConfig::FromEndpoint("YourServiceEndpoint", "YourSpeechResourceKey");
```

You can initialize `SpeechConfig` in a few other ways:

- Use an endpoint, and pass in a Speech service endpoint. A key or authorization token is optional.
- Use a host, and pass in a host address. A key or authorization token is optional.
- Use an authorization token with the associated region/location.

Note

Regardless of whether you're performing speech recognition, speech synthesis, or translation, you always create a configuration.

[Section titled: Recognize speech from a microphone](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#recognize-speech-from-a-microphone)

## Recognize speech from a microphone

To recognize speech by using your device microphone, create an [`AudioConfig`](https://learn.microsoft.com/en-us/cpp/cognitive-services/speech/audio-audioconfig) instance by using the `FromDefaultMicrophoneInput()` member function. Then initialize the [`SpeechRecognizer`](https://learn.microsoft.com/en-us/cpp/cognitive-services/speech/speechrecognizer) object by passing `audioConfig` and `config`.

C++

Copy

```cpp
using namespace Microsoft::CognitiveServices::Speech::Audio;

auto audioConfig = AudioConfig::FromDefaultMicrophoneInput();
auto speechRecognizer = SpeechRecognizer::FromConfig(config, audioConfig);

cout << "Speak into your microphone." << std::endl;
auto result = speechRecognizer->RecognizeOnceAsync().get();
cout << "RECOGNIZED: Text=" << result->Text << std::endl;
```

If you want to use a _specific_ audio input device, you need to specify the device ID in `AudioConfig`. To learn how to get the device ID, see [Select an audio input device with the Speech SDK](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-select-audio-input-devices).

[Section titled: Recognize speech from a file](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#recognize-speech-from-a-file)

## Recognize speech from a file

If you want to recognize speech from an audio file instead of using a microphone, you still need to create an `AudioConfig` instance. However, you don't call `FromDefaultMicrophoneInput()`. You call `FromWavFileInput()` and pass the file path:

C++

Copy

```cpp
using namespace Microsoft::CognitiveServices::Speech::Audio;

auto audioConfig = AudioConfig::FromWavFileInput("YourAudioFile.wav");
auto speechRecognizer = SpeechRecognizer::FromConfig(config, audioConfig);

auto result = speechRecognizer->RecognizeOnceAsync().get();
cout << "RECOGNIZED: Text=" << result->Text << std::endl;
```

[Section titled: Recognize speech by using the Recognizer class](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#recognize-speech-by-using-the-recognizer-class)

## Recognize speech by using the Recognizer class

The [Recognizer class](https://learn.microsoft.com/en-us/cpp/cognitive-services/speech/speechrecognizer) for the Speech SDK for C++ exposes a few methods that you can use for speech recognition.

[Section titled: Single-shot recognition](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#single-shot-recognition)

## Single-shot recognition

Single-shot recognition asynchronously recognizes a single utterance. The end of a single utterance is determined by listening for silence at the end or until a maximum of 15 seconds of audio is processed. Here's an example of asynchronous single-shot recognition via [`RecognizeOnceAsync`](https://learn.microsoft.com/en-us/cpp/cognitive-services/speech/speechrecognizer#recognizeonceasync):

C++

Copy

```cpp
auto result = speechRecognizer->RecognizeOnceAsync().get();
```

You need to write some code to handle the result. This sample evaluates [`result->Reason`](https://learn.microsoft.com/en-us/cpp/cognitive-services/speech/recognitionresult#reason) and:

- Prints the recognition result: `ResultReason::RecognizedSpeech`.
- If there's no recognition match, it informs the user: `ResultReason::NoMatch`.
- If an error is encountered, it prints the error message: `ResultReason::Canceled`.

C++

Copy

```cpp
switch (result->Reason)
{
    case ResultReason::RecognizedSpeech:
        cout << "We recognized: " << result->Text << std::endl;
        break;
    case ResultReason::NoMatch:
        cout << "NOMATCH: Speech could not be recognized." << std::endl;
        break;
    case ResultReason::Canceled:
        {
            auto cancellation = CancellationDetails::FromResult(result);
            cout << "CANCELED: Reason=" << (int)cancellation->Reason << std::endl;

            if (cancellation->Reason == CancellationReason::Error) {
                cout << "CANCELED: ErrorCode= " << (int)cancellation->ErrorCode << std::endl;
                cout << "CANCELED: ErrorDetails=" << cancellation->ErrorDetails << std::endl;
                cout << "CANCELED: Did you set the speech resource key and endpoint values?" << std::endl;
            }
        }
        break;
    default:
        break;
}
```

[Section titled: Continuous recognition](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#continuous-recognition)

## Continuous recognition

Continuous recognition is a bit more involved than single-shot recognition. It requires you to subscribe to the `Recognizing`, `Recognized`, and `Canceled` events to get the recognition results. To stop recognition, you must call [StopContinuousRecognitionAsync](https://learn.microsoft.com/en-us/cpp/cognitive-services/speech/speechrecognizer#stopcontinuousrecognitionasync). Here's an example of continuous recognition performed on an audio input file.

Start by defining the input and initializing [`SpeechRecognizer`](https://learn.microsoft.com/en-us/cpp/cognitive-services/speech/speechrecognizer):

C++

Copy

```cpp
auto audioConfig = AudioConfig::FromWavFileInput("YourAudioFile.wav");
auto speechRecognizer = SpeechRecognizer::FromConfig(config, audioConfig);
```

Next, create a variable to manage the state of speech recognition. Declare `promise<void>` because at the start of recognition, you can safely assume that it's not finished:

C++

Copy

```cpp
promise<void> recognitionEnd;
```

Next, subscribe to the events that [`SpeechRecognizer`](https://learn.microsoft.com/en-us/cpp/cognitive-services/speech/speechrecognizer) sends:

- [`Recognizing`](https://learn.microsoft.com/en-us/cpp/cognitive-services/speech/asyncrecognizer#recognizing): Signal for events that contain intermediate recognition results.
- [`Recognized`](https://learn.microsoft.com/en-us/cpp/cognitive-services/speech/asyncrecognizer#recognized): Signal for events that contain final recognition results, which indicate a successful recognition attempt.
- [`SessionStopped`](https://learn.microsoft.com/en-us/cpp/cognitive-services/speech/asyncrecognizer#sessionstopped): Signal for events that indicate the end of a recognition session (operation).
- [`Canceled`](https://learn.microsoft.com/en-us/cpp/cognitive-services/speech/asyncrecognizer#canceled): Signal for events that contain canceled recognition results. These results indicate a recognition attempt that was canceled as a result of a direct cancellation request. Alternatively, they indicate a transport or protocol failure.

C++

Copy

```cpp
speechRecognizer->Recognizing.Connect([](const SpeechRecognitionEventArgs& e)
    {
        cout << "Recognizing:" << e.Result->Text << std::endl;
    });

speechRecognizer->Recognized.Connect([](const SpeechRecognitionEventArgs& e)
    {
        if (e.Result->Reason == ResultReason::RecognizedSpeech)
        {
            cout << "RECOGNIZED: Text=" << e.Result->Text
                 << " (text could not be translated)" << std::endl;
        }
        else if (e.Result->Reason == ResultReason::NoMatch)
        {
            cout << "NOMATCH: Speech could not be recognized." << std::endl;
        }
    });

speechRecognizer->Canceled.Connect([&recognitionEnd](const SpeechRecognitionCanceledEventArgs& e)
    {
        cout << "CANCELED: Reason=" << (int)e.Reason << std::endl;
        if (e.Reason == CancellationReason::Error)
        {
            cout << "CANCELED: ErrorCode=" << (int)e.ErrorCode << "\n"
                 << "CANCELED: ErrorDetails=" << e.ErrorDetails << "\n"
                 << "CANCELED: Did you set the speech resource key and endpoint values?" << std::endl;

            recognitionEnd.set_value(); // Notify to stop recognition.
        }
    });

speechRecognizer->SessionStopped.Connect([&recognitionEnd](const SessionEventArgs& e)
    {
        cout << "Session stopped.";
        recognitionEnd.set_value(); // Notify to stop recognition.
    });
```

With everything set up, call [`StartContinuousRecognitionAsync`](https://learn.microsoft.com/en-us/cpp/cognitive-services/speech/speechrecognizer#startcontinuousrecognitionasync) to start recognizing:

C++

Copy

```cpp
// Starts continuous recognition. Uses StopContinuousRecognitionAsync() to stop recognition.
speechRecognizer->StartContinuousRecognitionAsync().get();

// Waits for recognition end.
recognitionEnd.get_future().get();

// Stops recognition.
speechRecognizer->StopContinuousRecognitionAsync().get();
```

[Section titled: Change the source language](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#change-the-source-language)

## Change the source language

A common task for speech recognition is specifying the input (or source) language. The following example shows how to change the input language to German. In your code, find your [`SpeechConfig`](https://learn.microsoft.com/en-us/cpp/cognitive-services/speech/speechconfig) instance and add this line directly below it:

C++

Copy

```cpp
speechConfig->SetSpeechRecognitionLanguage("de-DE");
```

[`SetSpeechRecognitionLanguage`](https://learn.microsoft.com/en-us/cpp/cognitive-services/speech/speechconfig#setspeechrecognitionlanguage) is a parameter that takes a string as an argument. For a list of supported locales, see [Language and voice support for the Speech service](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support).

[Section titled: Language identification](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#language-identification)

## Language identification

You can use language identification with speech to text recognition when you need to identify the language in an audio source and then transcribe it to text.

For a complete code sample, see [Language identification](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-identification?pivots=programming-language-cpp).

[Section titled: Use a custom endpoint](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#use-a-custom-endpoint)

## Use a custom endpoint

With [custom speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/custom-speech-overview), you can upload your own data, test and train a custom model, compare accuracy between models, and deploy a model to a custom endpoint. The following example shows how to set a custom endpoint.

C++

Copy

```cpp
auto speechConfig = SpeechConfig::FromEndpoint("YourServiceEndpoint", "YourSpeechResourceKey");
speechConfig->SetEndpointId("YourEndpointId");
auto speechRecognizer = SpeechRecognizer::FromConfig(speechConfig);
```

[Section titled: Run and use a container](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#run-and-use-a-container)

## Run and use a container

Speech containers provide websocket-based query endpoint APIs that are accessed through the Speech SDK and Speech CLI. By default, the Speech SDK and Speech CLI use the public Speech service. To use the container, you need to change the initialization method. Use a container host URL instead of key and endpoint.

For more information about containers, see Host URLs in [Install and run Speech containers with Docker](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-container-howto#host-urls).

[Section titled: Semantic segmentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#semantic-segmentation)

## Semantic segmentation

Semantic segmentation is a speech recognition segmentation strategy that's designed to mitigate issues associated with silence-based segmentation:

- Under-segmentation: When users speak for a long time without pauses, they can see a long sequence of text without breaks ("wall of text"), which severely degrades their readability experience.
- Over-segmentation: When a user pauses for a short time, the silence detection mechanism can segment incorrectly.

Instead of only relying on silence timeouts, semantic segmentation mostly segments and returns final results when it detects sentence-ending punctuation (such as '.' or '?'). This improves the user experience with higher-quality, semantically complete segments and prevents long intermediate results.

To use semantic segmentation, you need to set the following property on the `SpeechConfig` instance used to create a `SpeechRecognizer`:

C++

Copy

```cpp
speechConfig->SetProperty(PropertyId::Speech_SegmentationStrategy, "Semantic");
```

Some of the limitations of semantic segmentation are as follows:

- You need the Speech SDK version 1.41 or later to use semantic segmentation.
- Semantic segmentation is only intended for use in [continuous recognition](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#continuous-recognition). This includes scenarios such as dictation and captioning. It shouldn't be used in the single recognition mode or interactive scenarios.
- Semantic segmentation isn't available for all languages and locales.
- Semantic segmentation doesn't yet support confidence scores and NBest lists. As such, we don't recommend semantic segmentation if you're using confidence scores or NBest lists.

[Section titled: Commit an explicit audio boundary (preview)](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#commit-an-explicit-audio-boundary-preview)

## Commit an explicit audio boundary (preview)

When you stream audio to Azure Speech Service, the service automatically segments the audio and generates transcription results accordingly. However, in certain scenarios, such as turn-based voice agents, you might need to explicitly define boundaries in the transcription stream. You can now achieve this goal by using the `Commit()` method of `PushAudioInputStream`.

Using an explicit audio boundary requires Speech SDK version 1.52 or later. It also requires the service property `setfeature=forcecommit` to be enabled.

During public preview, the following limitations apply:

- Only PCM, A-law, μ-law, and G.711 audio formats are supported. Other compressed audio formats aren't supported.
- Microsoft Audio Stack (MAS) isn't supported.

Create a `PushAudioInputStream` and use it with `SpeechRecognizer`.

C#

Copy

```csharp
var config = SpeechConfig.FromEndpoint(new Uri(endpoint), subscriptionKey);
config.SpeechRecognitionLanguage = "en-US";
config.SetServiceProperty("setfeature", "forcecommit", ServicePropertyChannel.UriQueryParameter);
var pushStream = AudioInputStream.CreatePushStream();
var audioInput = AudioConfig.FromStreamInput(pushStream);
var recognizer = new SpeechRecognizer(config, audioInput);
```

Use `PushAudioInputStream.Commit()` to commit audio boundary. A token is returned.

C#

Copy

```csharp
// writing audio
pushStream.Write(audioBytes);

// ...

// commit audio boundary
var token = pushStream.Commit();
```

Use `SpeechRecognitionResult.CommitToken` to identify the result from `Recognized` event that matches the commit.

C#

Copy

```csharp
recognizer.Recognized += (s, e) =>
{
    var token = e.Result.CommitToken;
    var tokenText = token != 0 ? $" commit_token={token}" : "";
    Console.WriteLine($"RECOGNIZED: Reason={e.Result.Reason} Text={e.Result.Text}{tokenText}");
};
```

You can find the complete sample in `RecognitionWithPushStreamCommitAsync` in Speech SDK samples [on GitHub](https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/samples/csharp/sharedcontent/console/speech_recognition_samples.cs).

Create a `PushAudioInputStream` and use it with `SpeechRecognizer`.

C++

Copy

```cpp
auto config = SpeechConfig::FromEndpoint(endpoint, subscriptionKey);
config->SetSpeechRecognitionLanguage("en-US");
config->SetServiceProperty("setfeature", "forcecommit", ServicePropertyChannel::UriQueryParameter);
auto pushStream = AudioInputStream::CreatePushStream();
auto recognizer = SpeechRecognizer::FromConfig(config, AudioConfig::FromStreamInput(pushStream));
```

Use `PushAudioInputStream::Commit()` to commit audio boundary. A token is returned.

C++

Copy

```cpp
// vector<uint8_t> audioBytes(3200);
// ... read audio into audioBytes
// writing audio
pushStream->Write(audioBytes.data(),static_cast<uint32_t>(audioBytes.size()));

// ...

// commit audio boundary
uint32_t token = pushStream->Commit();
```

Use `SpeechRecognitionResult::CommitToken()` to identify the result from `Recognized` event that matches the commit.

C++

Copy

```cpp
recognizer->Recognized.Connect([&](const SpeechRecognitionEventArgs& e)
{
    cout << "RECOGNIZED: Reason=" << (int)e.Result->Reason << " Text=" << e.Result->Text;
    // NoMatch can acknowledge a commit; naturally segmented results have token 0.
    if (e.Result->CommitToken() != 0)
    {
        uint32_t acknowledgedToken = e.Result->CommitToken();
        cout << " commit_token=" << acknowledgedToken;
    }
    cout << endl;
});
```

You can find the complete sample in `SpeechRecognitionWithPushStreamCommit` in Speech SDK samples [on GitHub](https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/samples/cpp/windows/console/samples/speech_recognition_samples.cpp).

Create a `PushAudioInputStream` and use it with `SpeechRecognizer`.

Java

Copy

```java
SpeechConfig config = SpeechConfig.fromEndpoint(new URI(endpoint), subscriptionKey);
config.setSpeechRecognitionLanguage("en-US");
config.setServiceProperty("setfeature", "forcecommit", ServicePropertyChannel.UriQueryParameter);
PushAudioInputStream pushStream = AudioInputStream.createPushStream();
AudioConfig audioInput = AudioConfig.fromStreamInput(pushStream);
SpeechRecognizer recognizer = new SpeechRecognizer(config, audioInput);
```

Use `PushAudioInputStream.commit()` to commit audio boundary. A token is returned.

Java

Copy

```java
// writing audio
pushStream.write(audioBytes);

// ...

// commit audio boundary
int token = pushStream.commit();
```

Use `SpeechRecognitionResult.getCommitToken()` to identify the result from `recognized` event that matches the commit.

Java

Copy

```java
recognizer.recognized.addEventListener((s, e) -> {
    int acknowledgedToken = e.getResult().getCommitToken();
    String tokenText = acknowledgedToken != 0 ? " commit_token=" + acknowledgedToken : "";
    System.out.println("RECOGNIZED: Reason=" + e.getResult().getReason()
        + " Text=" + e.getResult().getText() + tokenText);
});
```

You can find the complete sample in `recognitionWithPushStreamCommitAsync` in Speech SDK samples [on GitHub](https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/samples/java/jre/console/src/com/microsoft/cognitiveservices/speech/samples/console/SpeechRecognitionSamples.java).

Create a `PushAudioInputStream` and use it with `SpeechRecognizer`.

Python

Copy

```python
speech_config = speechsdk.SpeechConfig(subscription=speech_key, endpoint=speech_endpoint)
speech_config.speech_recognition_language = "en-US"

speech_config.set_service_property(
    "setfeature", "forcecommit", speechsdk.ServicePropertyChannel.UriQueryParameter)

pushStream = speechsdk.audio.PushAudioInputStream()
audio_config = speechsdk.audio.AudioConfig(stream=pushStream)
speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)
```

Use `PushAudioInputStream.commit()` to commit audio boundary. A token is returned.

Python

Copy

```python
# writing audio
pushStream.write(audio)

# ...

# commit audio boundary
token = pushStream.commit()
```

Use `SpeechRecognitionResult.commit_token` to identify the result from `recognized` event that matches the commit.

Python

Copy

```python
def recognized_cb(evt):
    result = evt.result
    commit_info = " commit_token={}".format(result.commit_token) if result.commit_token != 0 else ""
    print("RECOGNIZED: reason={} text={}{}".format(result.reason, result.text, commit_info))

speech_recognizer.recognized.connect(recognized_cb)
```

You can find the complete sample in `speech_recognition_with_push_stream_commit` in Speech SDK samples [on GitHub](https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/samples/python/console/speech_sample.py).

[Section titled: Post-stream refinement](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#post-stream-refinement)

## Post-stream refinement

Post-stream refinement gives you more accurate final results for [real-time transcription](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-to-text#real-time-transcription) with no impact to first-token latency. It runs a second recognition pass in parallel with real-time streaming, so intermediate and partial results stay low-latency. Only the final result is replaced with a more accurate version that uses broader audio context.

Monolingual post-stream refinement is generally available. Multilingual post-stream refinement is in public preview.

Expand table

| Capability | Monolingual post-stream refinement | Multilingual post-stream refinement |
| --- | --- | --- |
| Availability | Generally available | Public preview |
| Language scope | One configured locale per recognition session | Multiple supported languages in one session, including language switching |
| Language configuration | Set the recognition locale | Use open-range automatic language detection without a candidate language list |
| Phrase lists | [Supported](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/improve-accuracy-phrase-list) | Not supported during public preview |
| Diarization | [Supported](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-stt-diarization) | [Supported](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-stt-diarization) |

To enable post-stream refinement, set the `SpeechServiceResponse_PostProcessingOption` property on the `SpeechConfig` instance:

C++

Copy

```cpp
speechConfig->SetProperty(PropertyId::SpeechServiceResponse_PostProcessingOption, "PostRefinement");
```

C#

Copy

```csharp
speechConfig.SetProperty(PropertyId.SpeechServiceResponse_PostProcessingOption, "PostRefinement");
```

Java

Copy

```java
speechConfig.setProperty(PropertyId.SpeechServiceResponse_PostProcessingOption, "PostRefinement");
```

Python

Copy

```python
speech_config.set_property(
    speechsdk.PropertyId.SpeechServiceResponse_PostProcessingOption,
    "PostRefinement"
)
```

[Section titled: Multilingual post-stream refinement (preview)](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#multilingual-post-stream-refinement-preview)

### Multilingual post-stream refinement (preview)

Post-stream refinement supports multilingual recognition, so a single audio stream can span multiple languages, including switching between languages during a conversation. A single multilingual model recognizes the languages directly, so you don't set a language identification mode or provide a candidate language list. To enable the multilingual path, set `SpeechServiceResponse_PostProcessingOption` to `PostRefinement` and pass an `AutoDetectSourceLanguageConfig` configured for automatic language detection when you create the `SpeechRecognizer`.

Multilingual post-stream refinement requires Speech SDK version 1.50 or later and is available through the Speech SDK only.

During public preview, phrase lists aren't supported with multilingual post-stream refinement.

C++

Copy

```cpp
speechConfig->SetProperty(PropertyId::SpeechServiceResponse_PostProcessingOption, "PostRefinement");

auto autoDetectSourceLanguageConfig = AutoDetectSourceLanguageConfig::FromOpenRange();

auto recognizer = SpeechRecognizer::FromConfig(speechConfig, autoDetectSourceLanguageConfig, audioConfig);
```

C#

Copy

```csharp
speechConfig.SetProperty(PropertyId.SpeechServiceResponse_PostProcessingOption, "PostRefinement");

var autoDetectSourceLanguageConfig = AutoDetectSourceLanguageConfig.FromOpenRange();

var recognizer = new SpeechRecognizer(speechConfig, autoDetectSourceLanguageConfig, audioConfig);
```

Java

Copy

```java
speechConfig.setProperty(PropertyId.SpeechServiceResponse_PostProcessingOption, "PostRefinement");

AutoDetectSourceLanguageConfig autoDetectSourceLanguageConfig =
    AutoDetectSourceLanguageConfig.fromOpenRange();

SpeechRecognizer recognizer =
    new SpeechRecognizer(speechConfig, autoDetectSourceLanguageConfig, audioConfig);
```

Python

Copy

```python
speech_config.set_property(
    speechsdk.PropertyId.SpeechServiceResponse_PostProcessingOption,
    "PostRefinement"
)

auto_detect_source_language_config = speechsdk.languageconfig.AutoDetectSourceLanguageConfig()

recognizer = speechsdk.SpeechRecognizer(
    speech_config=speech_config,
    auto_detect_source_language_config=auto_detect_source_language_config,
    audio_config=audio_config)
```

During public preview, multilingual post-stream refinement recognizes 25 languages: Arabic, Chinese, Czech, Danish, Dutch, English, Finnish, French, German, Greek, Hebrew, Hindi, Hungarian, Indonesian, Italian, Japanese, Korean, Norwegian Bokmål, Polish, Portuguese, Russian, Spanish, Swedish, Thai, and Turkish. Because the service detects the spoken language automatically, you don't configure a locale. Audio in a language that isn't supported might produce unexpected results. For the specific locales that support monolingual and multilingual post-stream refinement, see [Speech to text language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt).

Some important considerations for post-stream refinement:

- Post-stream refinement works best for longer utterances such as conversations, meetings, and dictation. For very short phrases, the refined result might be identical to the standard result.
- Post-stream refinement and TrueText are separate values of the same `SpeechServiceResponse_PostProcessingOption` property. Only one value can be set at a time.
- Monolingual and multilingual post-stream refinement have different [Azure region availability](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions?tabs=stt).

For more information about post-processing options, see [How to use post-processing](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-post-processing).

Important

In multilingual post-stream refinement, some locales might not show significant quality gains, and results can differ from what you observe with standard recognition.

[Reference documentation](https://aka.ms/csspeech/goref) \| [Package (Go)](https://pkg.go.dev/github.com/Microsoft/cognitive-services-speech-sdk-go) \| [Additional samples on GitHub](https://github.com/microsoft/cognitive-services-speech-sdk-go/tree/master/samples/)

In this how-to guide, you learn how to use Azure Speech in Foundry Tools for real-time speech to text conversion. Real-time speech recognition is ideal for applications requiring immediate transcription, such as dictation, call center assistance, and captioning for live meetings.

To learn how to set up the environment for a sample application, see [Quickstart: Recognize and convert speech to text](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-speech-to-text).

[Section titled: Recognize speech to text from a microphone](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#recognize-speech-to-text-from-a-microphone)

## Recognize speech to text from a microphone

1. Create a Foundry resource for Speech in the [Azure portal](https://portal.azure.com/#create/Microsoft.CognitiveServicesAIFoundry). Get the Speech resource key and region.
2. Use the following code sample to run speech recognition from your default device microphone. Replace `YourSpeechKey` and `YourSpeechRegion` with your Speech resource key and region. Running the script starts a recognition session on your default microphone and output text:

Go

Copy

```go
package main

import (
	"bufio"
	"fmt"
	"os"

	"github.com/Microsoft/cognitive-services-speech-sdk-go/audio"
	"github.com/Microsoft/cognitive-services-speech-sdk-go/speech"
)

func sessionStartedHandler(event speech.SessionEventArgs) {
	defer event.Close()
	fmt.Println("Session Started (ID=", event.SessionID, ")")
}

func sessionStoppedHandler(event speech.SessionEventArgs) {
	defer event.Close()
	fmt.Println("Session Stopped (ID=", event.SessionID, ")")
}

func recognizingHandler(event speech.SpeechRecognitionEventArgs) {
	defer event.Close()
	fmt.Println("Recognizing:", event.Result.Text)
}

func recognizedHandler(event speech.SpeechRecognitionEventArgs) {
	defer event.Close()
	fmt.Println("Recognized:", event.Result.Text)
}

func cancelledHandler(event speech.SpeechRecognitionCanceledEventArgs) {
	defer event.Close()
	fmt.Println("Received a cancellation: ", event.ErrorDetails)
	fmt.Println("Did you set the speech resource key and region values?")
}

func main() {
    subscription :=  "YourSpeechKey"
    region := "YourSpeechRegion"

	audioConfig, err := audio.NewAudioConfigFromDefaultMicrophoneInput()
	if err != nil {
		fmt.Println("Got an error: ", err)
		return
	}
	defer audioConfig.Close()
	config, err := speech.NewSpeechConfigFromSubscription(subscription, region)
	if err != nil {
		fmt.Println("Got an error: ", err)
		return
	}
	defer config.Close()
	speechRecognizer, err := speech.NewSpeechRecognizerFromConfig(config, audioConfig)
	if err != nil {
		fmt.Println("Got an error: ", err)
		return
	}
	defer speechRecognizer.Close()
	speechRecognizer.SessionStarted(sessionStartedHandler)
	speechRecognizer.SessionStopped(sessionStoppedHandler)
	speechRecognizer.Recognizing(recognizingHandler)
	speechRecognizer.Recognized(recognizedHandler)
	speechRecognizer.Canceled(cancelledHandler)
	speechRecognizer.StartContinuousRecognitionAsync()
	defer speechRecognizer.StopContinuousRecognitionAsync()
	bufio.NewReader(os.Stdin).ReadBytes('\n')
}
```

Run the following commands to create a _go.mod_ file that links to components hosted on GitHub:

Windows Command Prompt

Copy

```cmd
go mod init quickstart
go get github.com/Microsoft/cognitive-services-speech-sdk-go
```

Now build and run the code:

Windows Command Prompt

Copy

```cmd
go build
go run quickstart
```

For detailed information, see the reference content for the [`SpeechConfig` class](https://pkg.go.dev/github.com/Microsoft/cognitive-services-speech-sdk-go@v1.15.0/speech#SpeechConfig) and the [`SpeechRecognizer` class](https://pkg.go.dev/github.com/Microsoft/cognitive-services-speech-sdk-go@v1.15.0/speech#SpeechRecognizer).

[Section titled: Recognize speech to text from an audio file](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#recognize-speech-to-text-from-an-audio-file)

## Recognize speech to text from an audio file

Use the following sample to run speech recognition from an audio file. Replace `YourSpeechKey` and `YourSpeechRegion` with your Speech resource key and region. Additionally, replace the variable `file` with a path to a _.wav_ file. When you run the script, it recognizes speech from the file and output the text result:

Go

Copy

```go
package main

import (
	"fmt"
	"time"

	"github.com/Microsoft/cognitive-services-speech-sdk-go/audio"
	"github.com/Microsoft/cognitive-services-speech-sdk-go/speech"
)

func main() {
    subscription :=  "YourSpeechKey"
    region := "YourSpeechRegion"
    file := "path/to/file.wav"

	audioConfig, err := audio.NewAudioConfigFromWavFileInput(file)
	if err != nil {
		fmt.Println("Got an error: ", err)
		return
	}
	defer audioConfig.Close()
	config, err := speech.NewSpeechConfigFromSubscription(subscription, region)
	if err != nil {
		fmt.Println("Got an error: ", err)
		return
	}
	defer config.Close()
	speechRecognizer, err := speech.NewSpeechRecognizerFromConfig(config, audioConfig)
	if err != nil {
		fmt.Println("Got an error: ", err)
		return
	}
	defer speechRecognizer.Close()
	speechRecognizer.SessionStarted(func(event speech.SessionEventArgs) {
		defer event.Close()
		fmt.Println("Session Started (ID=", event.SessionID, ")")
	})
	speechRecognizer.SessionStopped(func(event speech.SessionEventArgs) {
		defer event.Close()
		fmt.Println("Session Stopped (ID=", event.SessionID, ")")
	})

	task := speechRecognizer.RecognizeOnceAsync()
	var outcome speech.SpeechRecognitionOutcome
	select {
	case outcome = <-task:
	case <-time.After(5 * time.Second):
		fmt.Println("Timed out")
		return
	}
	defer outcome.Close()
	if outcome.Error != nil {
		fmt.Println("Got an error: ", outcome.Error)
	}
	fmt.Println("Got a recognition!")
	fmt.Println(outcome.Result.Text)
}
```

Run the following commands to create a _go.mod_ file that links to components hosted on GitHub:

Windows Command Prompt

Copy

```cmd
go mod init quickstart
go get github.com/Microsoft/cognitive-services-speech-sdk-go
```

Now build and run the code:

Windows Command Prompt

Copy

```cmd
go build
go run quickstart
```

For detailed information, see the reference content for the [`SpeechConfig` class](https://pkg.go.dev/github.com/Microsoft/cognitive-services-speech-sdk-go@v1.15.0/speech#SpeechConfig) and the [`SpeechRecognizer` class](https://pkg.go.dev/github.com/Microsoft/cognitive-services-speech-sdk-go@v1.15.0/speech#SpeechRecognizer).

[Section titled: Run and use a container](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#run-and-use-a-container)

## Run and use a container

Speech containers provide websocket-based query endpoint APIs that are accessed through the Speech SDK and Speech CLI. By default, the Speech SDK and Speech CLI use the public Speech service. To use the container, you need to change the initialization method. Use a container host URL instead of key and region.

For more information about containers, see Host URLs in [Install and run Speech containers with Docker](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-container-howto#host-urls).

[Reference documentation](https://learn.microsoft.com/en-us/objectivec/cognitive-services/speech/) \| [Package (download)](https://aka.ms/csspeech/macosbinary) \| [Additional samples on GitHub](https://aka.ms/speech/github-objective-c)

In this how-to guide, you learn how to use Azure Speech in Foundry Tools for real-time speech to text conversion. Real-time speech recognition is ideal for applications requiring immediate transcription, such as dictation, call center assistance, and captioning for live meetings.

To learn how to set up the environment for a sample application, see [Quickstart: Recognize and convert speech to text](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-speech-to-text).

[Section titled: Install Speech SDK and samples](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#install-speech-sdk-and-samples)

## Install Speech SDK and samples

The [Azure-Samples/cognitive-services-speech-sdk](https://github.com/Azure-Samples/cognitive-services-speech-sdk) repository contains samples written in Objective-C for iOS and Mac. Select a link to see installation instructions for each sample:

- [Recognize speech from a microphone in Objective-C on macOS](https://github.com/Azure-Samples/cognitive-services-speech-sdk/tree/master/quickstart/objectivec/macos/from-microphone)
- [Recognize speech in Objective-C on iOS](https://github.com/Azure-Samples/cognitive-services-speech-sdk/tree/master/quickstart/objectivec/ios/from-microphone)
- [More samples for Objective-C on iOS](https://github.com/Azure-Samples/cognitive-services-speech-sdk/tree/master/samples/objective-c/ios)

For more information, see the [Speech SDK for Objective-C reference](https://learn.microsoft.com/en-us/objectivec/cognitive-services/speech/).

[Section titled: Use a custom endpoint](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#use-a-custom-endpoint)

## Use a custom endpoint

With [custom speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/custom-speech-overview), you can upload your own data, test and train a custom model, compare accuracy between models, and deploy a model to a custom endpoint. The following example shows how to set a custom endpoint:

Objective-C

Copy

```objective-c
SPXSpeechConfiguration *speechConfig = [[SPXSpeechConfiguration alloc] initWithSubscription:"YourSpeechResoureKey" region:"YourServiceRegion"];
speechConfig.endpointId = "YourEndpointId";
SPXSpeechRecognizer* speechRecognizer = [[SPXSpeechRecognizer alloc] init:speechConfig];
```

[Section titled: Run and use a container](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#run-and-use-a-container)

## Run and use a container

Speech containers provide websocket-based query endpoint APIs that are accessed through the Speech SDK and Speech CLI. By default, the Speech SDK and Speech CLI use the public Speech service. To use the container, you need to change the initialization method. Use a container host URL instead of key and region.

For more information about containers, see Host URLs in [Install and run Speech containers with Docker](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-container-howto#host-urls).

In this how-to guide, you learn how to use Azure Speech in Foundry Tools for real-time speech to text conversion. Real-time speech recognition is ideal for applications requiring immediate transcription, such as dictation, call center assistance, and captioning for live meetings.

To learn how to set up the environment for a sample application, see [Quickstart: Recognize and convert speech to text](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-speech-to-text).

[Section titled: Recognize speech from a microphone](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#recognize-speech-from-a-microphone)

## Recognize speech from a microphone

Plug in and turn on your PC microphone. Turn off any apps that might also use the microphone. Some computers have a built-in microphone, whereas others require configuration of a Bluetooth device.

Now you're ready to run the Speech CLI to recognize speech from your microphone. From the command line, change to the directory that contains the Speech CLI binary file. Then run the following command:

Bash

Copy

```bash
spx recognize --microphone
```

Note

The Speech CLI defaults to English. You can choose a different language [from the speech to text table](https://learn.microsoft.com/en-us/azure/ai-services/language-support?tabs=stt). For example, add `--source de-DE` to recognize German speech.

Speak into the microphone, and you can see transcription of your words into text in real time. The Speech CLI stops after a period of silence, or when you select **Ctrl+C**.

[Section titled: Recognize speech from a file](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#recognize-speech-from-a-file)

## Recognize speech from a file

The Speech CLI can recognize speech in many file formats and natural languages. In this example, you can use any _.wav_ file (16 kHz or 8 kHz, 16-bit, and mono PCM) that contains English speech. Or if you want a quick sample, download the file [whatstheweatherlike.wav](https://github.com/Azure-Samples/cognitive-services-speech-sdk/blob/master/samples/csharp/sharedcontent/console/whatstheweatherlike.wav), and copy it to the same directory as the Speech CLI binary file.

Use the following command to run the Speech CLI to recognize speech found in the audio file:

Bash

Copy

```bash
spx recognize --file whatstheweatherlike.wav
```

Note

The Speech CLI defaults to English. You can choose a different language [from the speech to text table](https://learn.microsoft.com/en-us/azure/ai-services/language-support?tabs=stt). For example, add `--source de-DE` to recognize German speech.

The Speech CLI shows a text transcription of the speech on the screen.

[Section titled: Run and use a container](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#run-and-use-a-container)

## Run and use a container

Speech containers provide websocket-based query endpoint APIs that are accessed through the Speech SDK and Speech CLI. By default, the Speech SDK and Speech CLI use the public Speech service. To use the container, you need to change the initialization method. Use a container host URL instead of key and region.

For more information about containers, see Host URLs in [Install and run Speech containers with Docker](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-container-howto#host-urls).

[Reference documentation](https://learn.microsoft.com/en-us/objectivec/cognitive-services/speech/) \| [Package (download)](https://aka.ms/csspeech/macosbinary) \| [Additional samples on GitHub](https://aka.ms/speech/github-objective-c)

In this how-to guide, you learn how to use Azure Speech in Foundry Tools for real-time speech to text conversion. Real-time speech recognition is ideal for applications requiring immediate transcription, such as dictation, call center assistance, and captioning for live meetings.

To learn how to set up the environment for a sample application, see [Quickstart: Recognize and convert speech to text](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-speech-to-text).

[Section titled: Install Speech SDK and samples](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#install-speech-sdk-and-samples)

## Install Speech SDK and samples

The [Azure-Samples/cognitive-services-speech-sdk](https://github.com/Azure-Samples/cognitive-services-speech-sdk) repository contains samples written in Swift for iOS and Mac. Select a link to see installation instructions for each sample:

- [Recognize speech in Swift on macOS](https://github.com/Azure-Samples/cognitive-services-speech-sdk/tree/master/quickstart/swift/macos/from-microphone)
- [Recognize speech in Swift on iOS](https://github.com/Azure-Samples/cognitive-services-speech-sdk/tree/master/quickstart/swift/ios/from-microphone)

For more information, see the [Speech SDK for Objective-C reference](https://learn.microsoft.com/en-us/objectivec/cognitive-services/speech/).

[Section titled: Use a custom endpoint](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#use-a-custom-endpoint)

## Use a custom endpoint

With [custom speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/custom-speech-overview), you can upload your own data, test and train a custom model, compare accuracy between models, and deploy a model to a custom endpoint. The following example shows how to set a custom endpoint:

Swift

Copy

```swift
let speechConfig = SPXSpeechConfiguration(subscription: "YourSpeechResoureKey", region: "YourServiceRegion");
speechConfig.endpointId = "YourEndpointId";
let speechRecognizer = SPXSpeechRecognizer(speechConfiguration: speechConfig);
```

[Section titled: Run and use a container](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#run-and-use-a-container)

## Run and use a container

Speech containers provide websocket-based query endpoint APIs that are accessed through the Speech SDK and Speech CLI. By default, the Speech SDK and Speech CLI use the public Speech service. To use the container, you need to change the initialization method. Use a container host URL instead of key and region.

For more information about containers, see Host URLs in [Install and run Speech containers with Docker](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-container-howto#host-urls).

[Section titled: Related content](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#related-content)

## Related content

- [Try the speech to text quickstart](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-started-speech-to-text)
- [Improve recognition accuracy with custom speech](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/custom-speech-overview)
- [Use batch transcription](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/batch-transcription)
- [Use post-processing](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-post-processing)

Reading mode disabled

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

* * *

- Last updated on 06/05/2026

Ask Learn is an AI assistant that can answer questions, clarify concepts, and define terms using trusted Microsoft documentation.

Please sign in to use Ask Learn.

[Sign in](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-recognize-speech?pivots=programming-language-rest#)