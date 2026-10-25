# Unfetched GitHub commit evidence (snippets captured from repository page)

## Latest library commit

- Title: `fix(recitation): WAV encoder (Opus unsupported on iOS) + method PascalCase`
- URL: https://github.com/alheekmahlib/quran_audio/commit/41411a597b9d7613127220c911e8f2f642947c58
- Publication date: July 11, 2026 (repository page labels it “3 months ago” as fetched October 15, 2026)
- Exact snippet shown on repository page: “Two critical fixes: 1. Audio encoder: Opus is NOT supported on iOS (commented out in record_darwin's isEncoderSupported). Switched to WAV (PCM16 with headers), which IS supported on all platforms. The 0-byte file was caused by Opus being rejected silently. 2. Method wire format: switched back to PascalCase (StartTilawaSession / EndTilawaSession) matching the JS docs' methods.START_TILAWA_SESSION. Also added file-existence/size validation in stop() with clear error messages if the recording file is missing or empty.”
- Evidence context: This commit is shown as the latest commit for the repository’s `lib` folder on the fetched repository page. The actual patch was not fetched; the commit description alone does not establish the precise bytes sent on the wire.

## Earlier example commit

- Title: `feat(recitation): file-then-stream Opus pattern (qurani.ai expects Opus)`
- URL: https://github.com/alheekmahlib/quran_audio/commit/3c1a2693b798cae27eaf2994c0a61dfccf5c9114
- Publication date: July 11, 2026 (repository page labels it “3 months ago” as fetched October 15, 2026)
- Exact snippet shown on repository page: “qurani.ai requires Opus audio, but iOS/Android can't encode Opus in streaming mode (only PCM). Switched to file-then-stream: - start(): record Opus to a temp .opus file (file mode supports Opus) - stop(): read the file, stream it over WS in 4KB chunks, send end_tilawa_session, then clean up the temp file. Feedback now arrives after stop (not real-time), which matches what qurani.ai returns once it processes the complete audio.”
- Evidence context: This is an earlier example-folder commit shown in the fetched repository page. It describes an interim design and is superseded in time by later listed library changes; it should not be treated as the current wire protocol.

## Protocol-alignment commit

- Title: `fix(recitation): align with qurani.ai documented protocol`
- URL: https://github.com/alheekmahlib/quran_audio/commit/0f89ebb04ece7a23c61231bdc51044a2dfaeb3cb
- Publication date: July 11, 2026 (repository page labels it “3 months ago” as fetched October 15, 2026)
- Exact snippet shown on repository page: “Corrected per the official qurani.ai QRC docs: - WS endpoint: wss://api.qurani.ai?api_key=KEY (was wrong path) - Outbound methods use snake_case: start_tilawa_session, end_tilawa_session - Send end_tilawa_session on stop() for explicit cleanup ... - Confirmed ranges: hafz_level 1..3, tajweed_level 1..3 (asserted) ... Note: server expects Opus audio; iOS streaming only supports PCM16.”
- Evidence context: This earlier `pubspec.lock`/repository-file commit description conflicts with the later library-folder commit description and with the fetched current official guide’s WAV support and method literals. It is evidence of a version/history contradiction, not proof of current implementation behavior.
