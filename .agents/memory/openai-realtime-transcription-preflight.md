---
name: OpenAI Realtime transcription preflight
description: Provider connection requirements and account-level failure mode for the live transcription gate.
---

Use a Realtime-capable model in the OpenAI WebSocket URL, then select `gpt-live-transcribe` inside the dedicated transcription session configuration. Do not treat the transcription model as the WebSocket connection model. Keep turn detection disabled for this model and delimit continuous utterances with client-generated commits after detected silence.

**Why:** OpenAI rejects the mixed-up model role as `invalid_model`, and currently rejects `server_vad` for `gpt-live-transcribe` as `invalid_value`. Without VAD or periodic commits, continuous audio is not split into completed utterances. Even a correctly configured session can also be rejected with `insufficient_quota`.

**How to apply:** Before a human microphone run, perform a server-side session preflight. Validate two append/commit cycles on one socket, not only connection setup. A passing PCM smoke stream proves provider/account/config and turn continuity, but does not replace a human browser microphone run.