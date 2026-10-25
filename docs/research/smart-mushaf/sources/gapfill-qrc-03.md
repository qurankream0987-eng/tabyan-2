# QRC gap-fill evidence notes

Evidence scope: local Tabyan implementation inspected 2026-10-15. This index preserves the local-code passages used for comparison; it is not provider documentation.

## Tabyan implementation (local code; implementation evidence, not provider specification)

- `artifacts/api-server/src/recitation-providers/nabr-qrc-config.ts:60-78,82-111`: server-side start input and payload are `START_TILAWA_SESSION` with chapter/verse/word and hafz/tajweed levels; comments say level semantics remain unresolved. URL is `wss://api.qurani.ai` with `api_key`, `lang=ar`, `audio_format=wav`.
- `artifacts/api-server/src/recitation-providers/nabr-qrc-audio.ts:1-12,18-56,59-84`: 24 kHz mono PCM16LE input is resampled to 16 kHz; output is complete mono 16-bit WAV frames, 3,200 samples/200 ms, with final partial frame emitted at finish.
- `artifacts/api-server/src/recitation-providers/NabrQrcTransport.ts:191-312`: connection lifecycle waits for binary messages, rejects text responses, and closes on transport error or premature close.
- `artifacts/api-server/src/recitation-providers/NabrQrcTransport.ts:314-380`: active-session audio is sent as `CHECK_TILAWA_AUDIO`; stop flushes final WAV then sends `RESET_TILAWA_SESSION`.
- `artifacts/api-server/src/recitation-providers/NabrQrcTransport.ts:460-543`: MessagePack decode and event handling; waits for `QRC_CLIENT_CONNECTED` before start, requires `TILAWA_SESSION_STARTED.exit_code === 6`, handles keep-alives, `TILAWA_RESULT` exit 8, session ended, provider error, and ignores unknown events.
- `artifacts/api-server/src/recitation-providers/NabrQrcTransport.ts:88-92,605-633`: local connection/heartbeat/stop/session timers are 10 s/45 s/10 s/180 s; these are Tabyan safety limits, not provider-documented values.
- `artifacts/api-server/src/recitationRealtime.ts:530-567`: Nabr is gated to development, one-shot test, enabled/non-dry-run/shadow flags, server-owned session start data, and a server-injected credential.

## Unfetched source paths

The GitHub source fetch in `gapfill-qrc-02.md` covers only `qrc_client.dart`. The other discovered package paths (`recitation_session.dart`, `models/qrc_config.dart`, `models/qrc_feedback.dart`, `models/qrc_method.dart`, `recitation.dart`) were not fetched or independently verified here. Do not infer their exact current implementation from the client file alone.
