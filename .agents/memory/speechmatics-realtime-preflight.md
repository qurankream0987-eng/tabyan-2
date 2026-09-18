---
name: Speechmatics Realtime preflight
description: Protocol constraints and acceptance gates for the hosted Speechmatics Arabic streaming adapter.
---

Use the global Realtime WebSocket with server-side bearer authentication. Send `StartRecognition` using raw PCM16, a declared input sample rate, Arabic language, enhanced model, and partials enabled. Treat `RecognitionStarted` as the session-ready signal and `AudioAdded` as the audio-acceptance signal; socket-open alone proves neither.

**Why:** The current API accepts the WebSocket and may emit informational messages before recognition begins. It also rejects `end_of_utterance_silence_trigger` when placed inside `transcription_config`, returning a protocol error. A configuration that merely opens the socket is not a usable ASR session.

**How to apply:** Before a human microphone benchmark, run a no-audio server preflight through `RecognitionStarted`. During the real run require `AudioAdded`, `AddPartialTranscript`, and `AddTranscript`. Keep provider selection explicit and fail closed; never substitute OpenAI or NVIDIA when Speechmatics is selected.