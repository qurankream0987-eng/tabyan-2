Source: https://github.com/alheekmahlib/quran_audio
Title: GitHub - alheekmahlib/quran_audio: A Flutter package for Quran audio playback — logic only, no UI. Supports full-surah & per-ayah playback, system notifications, offline downloads, and repeat modes. · GitHub
Fetched: 2026-10-15T02:09:25.516Z

[Skip to content](https://github.com/alheekmahlib/quran_audio#start-of-content)

You signed in with another tab or window. [Reload](https://github.com/alheekmahlib/quran_audio) to refresh your session.You signed out in another tab or window. [Reload](https://github.com/alheekmahlib/quran_audio) to refresh your session.You switched accounts on another tab or window. [Reload](https://github.com/alheekmahlib/quran_audio) to refresh your session.Dismiss alert

{{ message }}

main

[**2** Branches](https://github.com/alheekmahlib/quran_audio/branches) [**2** Tags](https://github.com/alheekmahlib/quran_audio/tags)

[Go to Branches page](https://github.com/alheekmahlib/quran_audio/branches)[Go to Tags page](https://github.com/alheekmahlib/quran_audio/tags)

Go to file

Code

Open more actions menu

## Latest commit

[![alheekmahlib](https://avatars.githubusercontent.com/u/53709203?v=4&size=40)](https://github.com/alheekmahlib)[alheekmahlib](https://github.com/alheekmahlib/quran_audio/commits?author=alheekmahlib)

[fix(recitation): WAV encoder (Opus unsupported on iOS) + method Pasca…](https://github.com/alheekmahlib/quran_audio/commit/41411a597b9d7613127220c911e8f2f642947c58)

Open commit details

3 months agoJul 11, 2026

[41411a5](https://github.com/alheekmahlib/quran_audio/commit/41411a597b9d7613127220c911e8f2f642947c58) · 3 months agoJul 11, 2026

## History

[18 Commits](https://github.com/alheekmahlib/quran_audio/commits/main/)

Open commit details

[View commit history for this file.](https://github.com/alheekmahlib/quran_audio/commits/main/) 18 Commits

## Folders and files

| Name | Name | Last commit message | Last commit date |
| --- | --- | --- | --- |
| [assets](https://github.com/alheekmahlib/quran_audio/tree/main/assets "assets") | [assets](https://github.com/alheekmahlib/quran_audio/tree/main/assets "assets") | [Initial release: quran\_audio v0.1.0](https://github.com/alheekmahlib/quran_audio/commit/4ddd58cfd1fda4e1cdf6c2e18a04cdfcf563049a "Initial release: quran_audio v0.1.0  Logic-only Quran audio playback library (no UI) with two independent systems: - Surah system (21 reciters, full-surah MP3 playback with auto-advance) - Ayah system (12 reciters, per-ayah playback with playlist + windowing)  Features: - Unified QuranAudio facade (single init() + flat API) - System media notifications (lock screen / Bluetooth) - Offline downloads (surahs & ayahs) - Repeat modes (one ayah / surah / range) - Tiny metadata file (~3KB, no ayah text) with cumulative UQ computation - Custom notification icon from asset/url/file - GetX state management  Includes a professional example app (3 tabs: surahs, ayahs with manual input, usage guide) with bilingual docs.") | 3 months agoJul 11, 2026 |
| [example](https://github.com/alheekmahlib/quran_audio/tree/main/example "example") | [example](https://github.com/alheekmahlib/quran_audio/tree/main/example "example") | [feat(recitation): file-then-stream Opus pattern (qurani.ai expects Opus)](https://github.com/alheekmahlib/quran_audio/commit/3c1a2693b798cae27eaf2994c0a61dfccf5c9114 "feat(recitation): file-then-stream Opus pattern (qurani.ai expects Opus)  qurani.ai requires Opus audio, but iOS/Android can't encode Opus in streaming mode (only PCM). Switched to file-then-stream: - start(): record Opus to a temp .opus file (file mode supports Opus) - stop(): read the file, stream it over WS in 4KB chunks, send   end_tilawa_session, then clean up the temp file  Feedback now arrives after stop (not real-time), which matches what qurani.ai returns once it processes the complete audio.  Example updates: - Status label shows Arabic descriptions per state (جارٍ المعالجة... etc.) - Button disabled + shows hourglass during 'processing' state - Removed redundant _sessionState reset in _stopSession (stop() sets it)  Verified: dart analyze clean, flutter build ios passes.") | 3 months agoJul 11, 2026 |
| [lib](https://github.com/alheekmahlib/quran_audio/tree/main/lib "lib") | [lib](https://github.com/alheekmahlib/quran_audio/tree/main/lib "lib") | [fix(recitation): WAV encoder (Opus unsupported on iOS) + method Pasca…](https://github.com/alheekmahlib/quran_audio/commit/41411a597b9d7613127220c911e8f2f642947c58 "fix(recitation): WAV encoder (Opus unsupported on iOS) + method PascalCase  Two critical fixes: 1. Audio encoder: Opus is NOT supported on iOS (commented out in    record_darwin's isEncoderSupported). Switched to WAV (PCM16 with headers),    which IS supported on all platforms. The 0-byte file was caused by Opus    being rejected silently.  2. Method wire format: switched back to PascalCase (StartTilawaSession /    EndTilawaSession) matching the JS docs' methods.START_TILAWA_SESSION.  Also added file-existence/size validation in stop() with clear error messages if the recording file is missing or empty.") | 3 months agoJul 11, 2026 |
| [.gitignore](https://github.com/alheekmahlib/quran_audio/blob/main/.gitignore ".gitignore") | [.gitignore](https://github.com/alheekmahlib/quran_audio/blob/main/.gitignore ".gitignore") | [Initial release: quran\_audio v0.1.0](https://github.com/alheekmahlib/quran_audio/commit/4ddd58cfd1fda4e1cdf6c2e18a04cdfcf563049a "Initial release: quran_audio v0.1.0  Logic-only Quran audio playback library (no UI) with two independent systems: - Surah system (21 reciters, full-surah MP3 playback with auto-advance) - Ayah system (12 reciters, per-ayah playback with playlist + windowing)  Features: - Unified QuranAudio facade (single init() + flat API) - System media notifications (lock screen / Bluetooth) - Offline downloads (surahs & ayahs) - Repeat modes (one ayah / surah / range) - Tiny metadata file (~3KB, no ayah text) with cumulative UQ computation - Custom notification icon from asset/url/file - GetX state management  Includes a professional example app (3 tabs: surahs, ayahs with manual input, usage guide) with bilingual docs.") | 3 months agoJul 11, 2026 |
| [CHANGELOG.md](https://github.com/alheekmahlib/quran_audio/blob/main/CHANGELOG.md "CHANGELOG.md") | [CHANGELOG.md](https://github.com/alheekmahlib/quran_audio/blob/main/CHANGELOG.md "CHANGELOG.md") | [FIX: Fix README, Add documentation](https://github.com/alheekmahlib/quran_audio/commit/0c2eea1139bf70a1f73d51db12d7550520c9641c "FIX: Fix README, Add documentation") | 3 months agoJul 11, 2026 |
| [LICENSE](https://github.com/alheekmahlib/quran_audio/blob/main/LICENSE "LICENSE") | [LICENSE](https://github.com/alheekmahlib/quran_audio/blob/main/LICENSE "LICENSE") | [Initial release: quran\_audio v0.1.0](https://github.com/alheekmahlib/quran_audio/commit/4ddd58cfd1fda4e1cdf6c2e18a04cdfcf563049a "Initial release: quran_audio v0.1.0  Logic-only Quran audio playback library (no UI) with two independent systems: - Surah system (21 reciters, full-surah MP3 playback with auto-advance) - Ayah system (12 reciters, per-ayah playback with playlist + windowing)  Features: - Unified QuranAudio facade (single init() + flat API) - System media notifications (lock screen / Bluetooth) - Offline downloads (surahs & ayahs) - Repeat modes (one ayah / surah / range) - Tiny metadata file (~3KB, no ayah text) with cumulative UQ computation - Custom notification icon from asset/url/file - GetX state management  Includes a professional example app (3 tabs: surahs, ayahs with manual input, usage guide) with bilingual docs.") | 3 months agoJul 11, 2026 |
| [README.md](https://github.com/alheekmahlib/quran_audio/blob/main/README.md "README.md") | [README.md](https://github.com/alheekmahlib/quran_audio/blob/main/README.md "README.md") | [feat(recitation): optional recitation correction via qurani.ai](https://github.com/alheekmahlib/quran_audio/commit/8f1221eaf00bf833c2aa9cf6c072a8c5562db849 "feat(recitation): optional recitation correction via qurani.ai  Isolated, lazy-loaded module (src/recitation/) for real-time Quran recitation correction (Tajweed feedback) via qurani.ai QRC WebSocket. Activates only after Recitation.init(apiKey:) — zero impact on playback users.  Library additions: - Recitation facade (init/createSession/isInitialized) - RecitationSession (WS lifecycle + mic recording via 'record' package) - QrcClient (low-level WebSocket, 3 auth strategies) - Models: QrcConfig, QrcFeedback (permissive), QrcMethod - RecitationState enum + QrcConstants/QrcAuthStrategy - Exported from quran_audio.dart  Example: - New 'Recitation' tab (4th tab): API key input, surah/ayah selection,   record/stop button, live feedback StreamBuilder. - Mic permissions added (Android RECORD_AUDIO, iOS NSMicrophoneUsageDescription) - permission_handler dependency  Docs: - README: full Recitation Correction section + TOC - Guide tab: CodeSnippets for Recitation.init + createSession  Dependencies: web_socket_channel ^3.0.0, record ^6.0.0  Verified: dart analyze clean, flutter build web + apk pass. Note: some qurani.ai details (wss URL, response schema, level ranges) are underdocumented — client is defensive with TODOs for calibration.") | 3 months agoJul 11, 2026 |
| [analysis\_options.yaml](https://github.com/alheekmahlib/quran_audio/blob/main/analysis_options.yaml "analysis_options.yaml") | [analysis\_options.yaml](https://github.com/alheekmahlib/quran_audio/blob/main/analysis_options.yaml "analysis_options.yaml") | [Initial release: quran\_audio v0.1.0](https://github.com/alheekmahlib/quran_audio/commit/4ddd58cfd1fda4e1cdf6c2e18a04cdfcf563049a "Initial release: quran_audio v0.1.0  Logic-only Quran audio playback library (no UI) with two independent systems: - Surah system (21 reciters, full-surah MP3 playback with auto-advance) - Ayah system (12 reciters, per-ayah playback with playlist + windowing)  Features: - Unified QuranAudio facade (single init() + flat API) - System media notifications (lock screen / Bluetooth) - Offline downloads (surahs & ayahs) - Repeat modes (one ayah / surah / range) - Tiny metadata file (~3KB, no ayah text) with cumulative UQ computation - Custom notification icon from asset/url/file - GetX state management  Includes a professional example app (3 tabs: surahs, ayahs with manual input, usage guide) with bilingual docs.") | 3 months agoJul 11, 2026 |
| [pubspec.lock](https://github.com/alheekmahlib/quran_audio/blob/main/pubspec.lock "pubspec.lock") | [pubspec.lock](https://github.com/alheekmahlib/quran_audio/blob/main/pubspec.lock "pubspec.lock") | [fix(recitation): align with qurani.ai documented protocol](https://github.com/alheekmahlib/quran_audio/commit/0f89ebb04ece7a23c61231bdc51044a2dfaeb3cb "fix(recitation): align with qurani.ai documented protocol  Corrected per the official qurani.ai QRC docs: - WS endpoint: wss://api.qurani.ai?api_key=KEY (was wrong path) - Outbound methods use snake_case: start_tilawa_session, end_tilawa_session - Send end_tilawa_session on stop() for explicit cleanup - Documented response schema now modeled in QrcFeedback:   - start_tilawa_session → {event, exit_code, websocket_id}   - check_tilawa → {event, exit_code, chapter/verse/word_index,     correct_words[], skipped_words[], tajweed_mistakes[]} - Added QrcEvent enum + strong accessors (correctWords, skippedWords,   tajweedMistakes, isFullyCorrect, score) - Confirmed ranges: hafz_level 1..3, tajweed_level 1..3 (asserted) - QrcClient now logs inbound events for debugging - Example tab: feedback list shows correct/skipped/tajweed counts  Also pinned web_socket_channel to ^2.4.0 (avoids objective_c FFI crash from web_socket 1.x on iOS simulator).  Note: server expects Opus audio; iOS streaming only supports PCM16. If no feedback arrives, the audio format mismatch is the likely cause — a file-upload (REST) path or on-device Opus encode may be needed next.") | 3 months agoJul 11, 2026 |
| [pubspec.yaml](https://github.com/alheekmahlib/quran_audio/blob/main/pubspec.yaml "pubspec.yaml") | [pubspec.yaml](https://github.com/alheekmahlib/quran_audio/blob/main/pubspec.yaml "pubspec.yaml") | [fix(recitation): align with qurani.ai documented protocol](https://github.com/alheekmahlib/quran_audio/commit/0f89ebb04ece7a23c61231bdc51044a2dfaeb3cb "fix(recitation): align with qurani.ai documented protocol  Corrected per the official qurani.ai QRC docs: - WS endpoint: wss://api.qurani.ai?api_key=KEY (was wrong path) - Outbound methods use snake_case: start_tilawa_session, end_tilawa_session - Send end_tilawa_session on stop() for explicit cleanup - Documented response schema now modeled in QrcFeedback:   - start_tilawa_session → {event, exit_code, websocket_id}   - check_tilawa → {event, exit_code, chapter/verse/word_index,     correct_words[], skipped_words[], tajweed_mistakes[]} - Added QrcEvent enum + strong accessors (correctWords, skippedWords,   tajweedMistakes, isFullyCorrect, score) - Confirmed ranges: hafz_level 1..3, tajweed_level 1..3 (asserted) - QrcClient now logs inbound events for debugging - Example tab: feedback list shows correct/skipped/tajweed counts  Also pinned web_socket_channel to ^2.4.0 (avoids objective_c FFI crash from web_socket 1.x on iOS simulator).  Note: server expects Opus audio; iOS streaming only supports PCM16. If no feedback arrives, the audio format mismatch is the likely cause — a file-upload (REST) path or on-device Opus encode may be needed next.") | 3 months agoJul 11, 2026 |
| View all files |

## Repository files navigation

## Quran Audio

[Permalink: Quran Audio](https://github.com/alheekmahlib/quran_audio#quran-audio)

![](https://raw.githubusercontent.com/alheekmahlib/data/main/packages/quran_audio/quran_audio_logo.png)

![](https://raw.githubusercontent.com/alheekmahlib/data/main/packages/quran_audio/img.png)

[![pub package](https://camo.githubusercontent.com/00cb7b2d8b874627c3f3abff0f1f9b6c0b323ad4751884c377925e5b6c95c8a6/68747470733a2f2f696d672e736869656c64732e696f2f7075622f762f717572616e5f617564696f2e7376673f636f6c6f723d326361636266266c6162656c436f6c6f723d313435323631)](https://pub.dev/packages/quran_audio)[![pub points](https://camo.githubusercontent.com/99e0ac2de43dc8c662ee98655ce3c5d34d02982c1ff6e79526cc2d9b8072a476/68747470733a2f2f696d672e736869656c64732e696f2f7075622f706f696e74732f717572616e5f617564696f3f636f6c6f723d326361636266266c6162656c436f6c6f723d313435323631)](https://pub.dev/packages/quran_audio/score)[![likes](https://camo.githubusercontent.com/075502d4371c142613d59f59864c2ef98e2e806e5263a0675b56a908f46792c7/68747470733a2f2f696d672e736869656c64732e696f2f7075622f6c696b65732f717572616e5f617564696f3f636f6c6f723d326361636266266c6162656c436f6c6f723d313435323631)](https://pub.dev/packages/quran_audio/score)[![Pub Downloads](https://camo.githubusercontent.com/620ab12612a6d294eacf463039eb4f351e9ca1af106a592f4d83884622cf5086/68747470733a2f2f696d672e736869656c64732e696f2f7075622f646d2f717572616e5f617564696f3f636f6c6f723d326361636266266c6162656c436f6c6f723d313435323631)](https://pub.dev/packages/quran_audio/score)[![License: MIT](https://camo.githubusercontent.com/9ec917eeb260cf6bb9dca2d3ea2422189871f4da5ffd46d859c07c556e674c40/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f4c6963656e73652d4d49542d3263616362662e7376673f6c6162656c436f6c6f723d313435323631)](https://github.com/alheekmahlib/quran_audio/blob/main/LICENSE)

[![Web](https://camo.githubusercontent.com/987d1ab06ce09548ae8a43a538fdf7592ba5ef701e10549f88cba19a304baddb/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f5765622d3134353236313f6c6f676f3d676f6f676c652d6368726f6d65266c6f676f436f6c6f723d7768697465)](https://flutter.dev/)[![Windows](https://camo.githubusercontent.com/3f74622984835e90f46392e9150fcb47eb1d86afcfa70795865ffad39364f07e/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f57696e646f77732d3134353236313f6c6f676f3d57696e646f7773266c6f676f436f6c6f723d7768697465)](https://flutter.dev/)[![macOS](https://camo.githubusercontent.com/2773351ebb42339d954165b22a152c08cc76af1fdc5b9e24b1f694d8bc86a881/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f6d61634f532d3134353236313f6c6f676f3d6170706c65266c6f676f436f6c6f723d7768697465)](https://flutter.dev/)[![Android](https://camo.githubusercontent.com/d828da869bebf934d884615ce8b5c1de8388a272ede984799d98b32652ab4473/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f416e64726f69642d3134353236313f6c6f676f3d616e64726f6964266c6f676f436f6c6f723d7768697465)](https://flutter.dev/)[![iOS](https://camo.githubusercontent.com/5f1f708414af7d2bbcf95a8d3c8d35401d2fe62c2b96167716e81db3a9225bd4/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f694f532d3134353236313f6c6f676f3d696f73266c6f676f5374796c653d626f6c64266c6f676f436f6c6f723d7768697465)](https://flutter.dev/)

A Flutter package for Quran audio playback — **logic only, no UI**. It supports two independent playback systems (full-surah and per-ayah), system media notifications, offline downloads, and repeat modes — all through a single unified `QuranAudio` facade.

## Table of Contents

[Permalink: Table of Contents](https://github.com/alheekmahlib/quran_audio#table-of-contents)

- [Getting started](https://github.com/alheekmahlib/quran_audio#getting-started)
- [Usage Example](https://github.com/alheekmahlib/quran_audio#usage-example)
  - [Play a Surah](https://github.com/alheekmahlib/quran_audio#play-a-surah)
  - [Play a Specific Ayah](https://github.com/alheekmahlib/quran_audio#play-a-specific-ayah)
  - [Playback Mode: Stream vs Download](https://github.com/alheekmahlib/quran_audio#playback-mode-stream-vs-download)
  - [Playback Controls](https://github.com/alheekmahlib/quran_audio#playback-controls)
- [Reciters](https://github.com/alheekmahlib/quran_audio#reciters)
- [Notification Icon](https://github.com/alheekmahlib/quran_audio#notification-icon)
- [Offline Downloads](https://github.com/alheekmahlib/quran_audio#offline-downloads)
- [Repeat](https://github.com/alheekmahlib/quran_audio#repeat)
- [Recitation Correction (qurani.ai)](https://github.com/alheekmahlib/quran_audio#recitation-correction-quraniai)
- [Reading State (GetX)](https://github.com/alheekmahlib/quran_audio#reading-state-getx)
- [Metadata Helpers](https://github.com/alheekmahlib/quran_audio#metadata-helpers)
- [How it Works](https://github.com/alheekmahlib/quran_audio#how-it-works)
- [Sources](https://github.com/alheekmahlib/quran_audio#sources)
- [License](https://github.com/alheekmahlib/quran_audio#license)

## Getting started

[Permalink: Getting started](https://github.com/alheekmahlib/quran_audio#getting-started)

#### Android

[Permalink: Android](https://github.com/alheekmahlib/quran_audio#android)

The required permissions for audio playback (`WAKE_LOCK`, and `FOREGROUND_SERVICE_MEDIA_PLAYOUT`) are automatically added by the package. You don't need to manually edit your AndroidManifest.xml.

Additionally, to enable system-integrated audio controls (notification/lockscreen) using `audio_service`, your app's MainActivity must extend `AudioServiceActivity`:

Kotlin:

```
import com.ryanheise.audioservice.AudioServiceActivity

class MainActivity: AudioServiceActivity()
```

Java:

```
import com.ryanheise.audioservice.AudioServiceActivity;

public class MainActivity extends AudioServiceActivity {}
```

If you don't apply this change, the audio will still work locally, but system controls won't be available.

#### iOS

[Permalink: iOS](https://github.com/alheekmahlib/quran_audio#ios)

For background audio playback, you must add the following to your app's `Info.plist`:

```
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>
```

#### macOS

[Permalink: macOS](https://github.com/alheekmahlib/quran_audio#macos)

macOS requires a network entitlement. Open `macos/Runner/DebugProfile.entitlements` and add:

```
<key>com.apple.security.network.client</key>
<true/>
```

> ⚠️ Also add the same key to `macos/Runner/Release.entitlements`, otherwise release builds cannot reach the network for audio streaming.

The library works out of the box on macOS (just\_audio uses the native AVAudioPlayer backend). The minimum deployment target should be macOS 11.0.

#### Windows & Linux

[Permalink: Windows & Linux](https://github.com/alheekmahlib/quran_audio#windows--linux)

No manual setup is required. The library automatically initializes the `media_kit` audio backend on Windows and Linux via `just_audio_media_kit` during `QuranAudio.init()`. Just run:

```
flutter run -d windows   # or -d linux
```

> **Note:** System media notifications (lock-screen controls) are not available on Windows, Linux, or macOS — this is an `audio_service` limitation. Audio playback itself works fully on all desktop platforms.

#### Web

[Permalink: Web](https://github.com/alheekmahlib/quran_audio#web)

The library works on web in **streaming-only mode** (no offline downloads, since browsers have no file system). `QuranAudio.init()` handles everything automatically:

```
flutter run -d chrome
```

- ✅ Play surahs & ayahs (streamed from network URLs)
- ✅ Reciter selection, repeat modes, playback controls
- ❌ Offline downloads (not possible on web — use streaming instead)
- ❌ System media notifications (not supported on web by `audio_service`)

### Installation

[Permalink: Installation](https://github.com/alheekmahlib/quran_audio#installation)

In the `pubspec.yaml` of your flutter project, add the following dependency:

```
dependencies:
  ...
  quran_audio: ^1.0.0
```

Import it:

```
import 'package:quran_audio/quran_audio.dart';
```

Initialize it:

```
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Initialize the entire library in one step
  await QuranAudio.init();
  runApp(const MyApp());
}
```

> 💡 `QuranAudio.init()` accepts optional parameters:
>
> ```
> await QuranAudio.init(
>   enableSystemNotifications: true,   // false = no notifications (lighter, for web/tests)
>   androidNotificationChannelId: 'com.myapp.quran',
>   androidNotificationChannelName: 'Quran Playback',
>   notificationIconSource: 'assets/images/logo.png', // custom icon (asset/url/file)
> );
> ```

> By default, `QuranAudio.init()` uses the library's bundled icon for the system media notification. To change it at runtime, see [Notification Icon](https://github.com/alheekmahlib/quran_audio#notification-icon).

## Notification Icon

[Permalink: Notification Icon](https://github.com/alheekmahlib/quran_audio#notification-icon)

The system media notification (lock screen / Bluetooth / car audio) shows an icon. By default the library's bundled logo is used. You can set a custom icon from an asset, a network URL, or a local file:

```
// From an asset (most common)
await QuranAudio.setNotificationIconFromAsset('assets/images/my_logo.png');

// From a network URL
await QuranAudio.setNotificationIconFromUrl('https://example.com/logo.png');

// From a local file path
await QuranAudio.setNotificationIconFromFile('/path/to/logo.png');

// Auto-detect type (asset / url / file)
await QuranAudio.setNotificationIcon('assets/images/my_logo.png');

// Revert to the library's default icon
await QuranAudio.useDefaultNotificationIcon();

// Read the current icon URI
final Uri? icon = QuranAudio.notificationIcon;
```

> The icon is refreshed live — if playback is active when you call these methods, the notification updates immediately.

## Usage Example

[Permalink: Usage Example](https://github.com/alheekmahlib/quran_audio#usage-example)

### Play a Surah

[Permalink: Play a Surah](https://github.com/alheekmahlib/quran_audio#play-a-surah)

Play a full surah (single MP3 file per surah):

```
// Play Surah Al-Baqarah
QuranAudio.playSurah(2);

// Play Surah Al-Fatihah
QuranAudio.playSurah(1);
```

### Play a Specific Ayah

[Permalink: Play a Specific Ayah](https://github.com/alheekmahlib/quran_audio#play-a-specific-ayah)

Play a specific ayah by surah number and ayah number:

```
// Play Ayat al-Kursi (2:255), continue to following ayahs
QuranAudio.playAyah(
  surah: 2,
  ayah: 255,
  singleAyah: false, // false = continue to next ayahs
);

// Play a single ayah then stop
QuranAudio.playAyah(
  surah: 36,
  ayah: 1,
  singleAyah: true,
);
```

### Playback Mode: Stream vs Download

[Permalink: Playback Mode: Stream vs Download](https://github.com/alheekmahlib/quran_audio#playback-mode-stream-vs-download)

By default, playback **streams online** if the file is not already downloaded — giving instant playback. You can change this with `streamFirst` / `downloadFirst` / `downloadScope`:

```
// 1) Default: stream immediately (online)
QuranAudio.playAyah(surah: 2, ayah: 255);

// 2) Download the single ayah first, then play it (offline-ready)
QuranAudio.playAyah(
  surah: 2, ayah: 255,
  downloadFirst: true,
  downloadScope: DownloadScope.single,
);

// 3) Download the entire surah first, then play from ayah 255
QuranAudio.playAyah(
  surah: 2, ayah: 255,
  downloadFirst: true,
  downloadScope: DownloadScope.surah,
);

// 4) Full surah — download first then play
QuranAudio.playSurah(2, downloadFirst: true);
```

| Parameter | Default | Description |
| --- | --- | --- |
| `streamFirst` | `true` | Stream online immediately if the file is missing |
| `downloadFirst` | `false` | Download before playing (overrides `streamFirst`) |
| `downloadScope` | `DownloadScope.single` | With `downloadFirst`: `single` (current ayah) or `surah` (all ayahs) |

> **Web**: downloading is not possible (no file system), so `downloadFirst` is ignored and playback always streams.
> **Note**: `downloadFirst` takes precedence over `streamFirst`. If the file is already downloaded, it plays locally regardless of either setting.

### Playback Controls

[Permalink: Playback Controls](https://github.com/alheekmahlib/quran_audio#playback-controls)

Controls automatically execute on the **currently active** system — no need to know which is running.

```
QuranAudio.pause();               // Pause (active system)
QuranAudio.resume();              // Resume (active system)
QuranAudio.stop();                // Stop completely
QuranAudio.next();                // Next (surah or ayah)
QuranAudio.previous();            // Previous (surah or ayah)
QuranAudio.seek(Duration(minutes: 5));  // Seek to position
QuranAudio.togglePlayPause();     // Toggle play/pause
```

Complete Audio Example

```
class AudioPlayerScreen extends StatelessWidget {
  const AudioPlayerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = QuranAudio.surahController;
    return Scaffold(
      appBar: AppBar(title: const Text('Quran Audio Player')),
      body: Column(
        children: [\
          // Reactive now-playing display\
          Obx(() {\
            final surahNo = c.currentSurahNumber.value;\
            final meta = QuranAudio.surah(surahNo);\
            return Text('${meta.name} — ${meta.englishName}');\
          }),\
\
          // Control buttons\
          Row(\
            mainAxisAlignment: MainAxisAlignment.center,\
            children: [\
              IconButton(\
                onPressed: QuranAudio.previous,\
                icon: const Icon(Icons.skip_previous),\
              ),\
              IconButton(\
                onPressed: QuranAudio.togglePlayPause,\
                icon: const Icon(Icons.play_arrow),\
              ),\
              IconButton(\
                onPressed: QuranAudio.next,\
                icon: const Icon(Icons.skip_next),\
              ),\
              IconButton(\
                onPressed: QuranAudio.stop,\
                icon: const Icon(Icons.stop),\
              ),\
            ],\
          ),\
\
          // Progress bar\
          StreamBuilder<PositionData>(\
            stream: QuranAudio.positionDataStream,\
            builder: (context, snap) {\
              final d = snap.data;\
              return Slider(\
                value: d?.position.inSeconds.toDouble() ?? 0,\
                max: d?.duration.inSeconds.toDouble() ?? 1,\
                onChanged: (v) => QuranAudio.seek(\
                  Duration(seconds: v.toInt()),\
                ),\
              );\
            },\
          ),\
\
          // Play buttons\
          ElevatedButton(\
            onPressed: () => QuranAudio.playSurah(1),\
            child: const Text('Play Al-Fatihah'),\
          ),\
          ElevatedButton(\
            onPressed: () => QuranAudio.playAyah(surah: 2, ayah: 255),\
            child: const Text('Play Ayat al-Kursi'),\
          ),\
        ],
      ),
    );
  }
}
```

## Reciters

[Permalink: Reciters](https://github.com/alheekmahlib/quran_audio#reciters)

The library ships with two independent reciter lists (matching the original `quran_library`):

- **Surah reciters**: 21 reciters (quranicaudio.com, mp3quran.net, tarteel.ai)
- **Ayah reciters**: 12 reciters (cdn.islamic.network, everyayah.com)

```
// Change reciter by index
QuranAudio.setSurahReader(2);
QuranAudio.setAyahReader(1);

// Access the lists
final surahReaders = QuranAudio.surahReaders;
final ayahReaders = QuranAudio.ayahReaders;
final currentIndex = QuranAudio.surahReaderIndex;
```

Custom Reciters

```
// Override the default surah reciters list
SurahReaders.customReaders = [\
  const ReaderInfo(\
    index: 0,\
    name: 'My Custom Reciter',\
    readerNamePath: 'my_reader/',\
    url: 'https://my-server.com/quran/',\
  ),\
];

// Override the default ayah reciters list
AyahReaders.customReaders = [\
  const ReaderInfo(\
    index: 0,\
    name: 'My Custom Reciter',\
    readerNamePath: 'my_reader',\
    url: 'https://everyayah.com/data/',\
  ),\
];
```

## Offline Downloads

[Permalink: Offline Downloads](https://github.com/alheekmahlib/quran_audio#offline-downloads)

```
// Surah system (single MP3 file)
await QuranAudio.downloadSurah(2);                  // Download Al-Baqarah
final ready = await QuranAudio.isSurahDownloaded(2);
await QuranAudio.deleteSurahDownload(2);

// Ayah system (one MP3 per ayah)
await QuranAudio.downloadSurahAyahs(2);             // All ayahs of Al-Baqarah
await QuranAudio.downloadAyahRange(2, from: 1, to: 10);  // Range
final ready = await QuranAudio.isSurahAyahsDownloaded(2);
await QuranAudio.deleteSurahAyahDownloads(2);

// Cancel any ongoing download
QuranAudio.cancelDownload();
```

## Repeat

[Permalink: Repeat](https://github.com/alheekmahlib/quran_audio#repeat)

```
QuranAudio.repeatAyah();      // Repeat the current ayah
QuranAudio.repeatSurah();     // Repeat the current surah
QuranAudio.repeatAyahRange(   // Repeat a range of ayahs
  fromAyah: 1,
  toAyah: 10,
  times: 3,
);
QuranAudio.disableRepeat();   // Disable repeat
```

## Recitation Correction (qurani.ai)

[Permalink: Recitation Correction (qurani.ai)](https://github.com/alheekmahlib/quran_audio#recitation-correction-quraniai)

An **optional** module for real-time Quran recitation correction (Tajweed feedback) via [qurani.ai](https://qurani.ai/en/docs/2-advanced-tools/qrc). It is **completely isolated** — the library works at 100% without it. It activates only after you call `Recitation.init(apiKey:)`.

### Get an API key

[Permalink: Get an API key](https://github.com/alheekmahlib/quran_audio#get-an-api-key)

1. Subscribe at [qurani.ai](https://qurani.ai/).
2. Get your API key from the [dashboard](https://qurani.ai/en/dashboard).

### Initialize (optional — once)

[Permalink: Initialize (optional — once)](https://github.com/alheekmahlib/quran_audio#initialize-optional--once)

```
import 'package:quran_audio/quran_audio.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await QuranAudio.init();                 // playback (required)
  Recitation.init(apiKey: 'YOUR_KEY');     // recitation (optional)
  runApp(MyApp());
}
```

Without `Recitation.init(...)`, the recitation module stays inert — no cost, no network, no permissions.

### Run a recitation session

[Permalink: Run a recitation session](https://github.com/alheekmahlib/quran_audio#run-a-recitation-session)

```
// 1) Create a session targeting a specific ayah
final session = Recitation.createSession(
  config: QrcConfig(
    chapterIndex: 1,    // Al-Fatihah (1..114)
    verseIndex: 1,      // first ayah
    hafzLevel: 1,       // memorization strictness (default 1)
    tajweedLevel: 1,    // tajweed strictness (default 1)
  ),
);

// 2) Listen to live feedback
session.feedbackStream.listen((QrcFeedback fb) {
  print('correct: ${fb.isCorrect}, score: ${fb.score}, raw: ${fb.raw}');
});

// 3) Start (opens WS + sends StartTilawaSession + records mic + streams)
await session.start();

// ... the user recites — feedback arrives in real time ...

// 4) Stop
await session.stop();
```

### Session state (GetX)

[Permalink: Session state (GetX)](https://github.com/alheekmahlib/quran_audio#session-state-getx)

```
final session = Recitation.createSession(config: cfg);
session.state.listen((RecitationState s) {
  // idle | connecting | recording | paused | processing | error | finished
});
```

### Platform setup

[Permalink: Platform setup](https://github.com/alheekmahlib/quran_audio#platform-setup)

- **Android**: add `<uses-permission android:name="android.permission.RECORD_AUDIO"/>` to `AndroidManifest.xml`.
- **iOS**: add `NSMicrophoneUsageDescription` to `Info.plist`.
- **macOS**: add `com.apple.security.device.audio-input` to entitlements.
- **Web**: the browser prompts for mic permission automatically.

> ⚠️ **Documentation gaps**: some qurani.ai details (the exact `wss://` endpoint, the response JSON schema, the allowed ranges for `hafz_level`/`tajweed_level`) are not fully published. The client is designed defensively — `QrcFeedback.raw` holds the full server JSON, and you can override the WS URL/auth strategy via `Recitation.init(wsUrl:, authStrategy:)`. Calibrate these empirically once you have an API key.

## Reading State (GetX)

[Permalink: Reading State (GetX)](https://github.com/alheekmahlib/quran_audio#reading-state-getx)

> ⚠️ **Important**: Each `Obx` must read `.value` **directly** from a controller inside its builder. Do not wrap a whole widget in `Obx` if Rx values are read in a deeper `build` — GetX will throw an error.

```
final c = QuranAudio.surahController;

// ✅ Correct — .value is read directly inside Obx
Obx(() => Text(
  c.isPlaying.value ? 'Playing' : 'Paused',
));

Obx(() => Text('Surah: ${c.currentSurahNumber.value}'));
```

Progress bar & reactive card

```
// Progress bar via StreamBuilder (no Obx needed)
StreamBuilder<PositionData>(
  stream: QuranAudio.positionDataStream,
  builder: (context, snap) {
    final d = snap.data;
    return Slider(
      value: d?.position.inSeconds.toDouble() ?? 0,
      max: d?.duration.inSeconds.toDouble() ?? 1,
      onChanged: (v) => QuranAudio.seek(Duration(seconds: v.toInt())),
    );
  },
);

// A reactive now-playing card
class NowPlayingCard extends StatelessWidget {
  Widget build(BuildContext context) {
    final surahC = QuranAudio.surahController;
    final ayahC = QuranAudio.ayahController;
    return Obx(() {
      final surahNo = surahC.currentSurahNumber.value;
      final ayahNo = ayahC.currentAyahInSurah.value;
      final playing = surahC.isPlaying.value || ayahC.isPlaying.value;
      final meta = QuranAudio.surah(surahNo);
      return Card(
        child: ListTile(
          title: Text(meta.name),
          subtitle: Text(playing ? 'Playing' : 'Paused'),
          trailing: Text('$ayahNo / ${meta.ayahCount}'),
        ),
      );
    });
  }
}
```

## Metadata Helpers

[Permalink: Metadata Helpers](https://github.com/alheekmahlib/quran_audio#metadata-helpers)

Instead of bundling the full Quran file (745KB), the library uses a tiny (~3KB) JSON holding only surah numbers, names, and ayah counts. Unique ayah numbers (UQ 1..6236) are computed cumulatively — no need to store them.

```
QuranAudio.ayahCountOf(2);          // → 286
QuranAudio.uqNumberOf(2, 255);      // → 262
QuranAudio.surah(2).name;           // → "Surat Al-Baqarah"
QuranAudio.allSurahs;               // → List<SurahMeta> (114 entries)

// Validation
QuranAudio.metadata.isValidSurah(2);           // → true
QuranAudio.metadata.isValidAyah(2, 255);       // → true
```

## How it Works

[Permalink: How it Works](https://github.com/alheekmahlib/quran_audio#how-it-works)

The library maintains two independent playback systems, each with its own reciters, URLs, and mechanisms:

| System | Description | Reciters | Sources |
| --- | --- | --- | --- |
| **Surah** (`SurahAudioController`) | One MP3 per full surah | 21 | quranicaudio.com, mp3quran.net, tarteel.ai |
| **Ayah** (`AyahAudioController`) | One MP3 per ayah | 12 | cdn.islamic.network, everyayah.com |

They share a single `AudioPlayer` via a coordination layer (`AudioEngine`). When one system takes control, the other is automatically stopped and its state is reset.

- **Auto-advance**: Ayahs play sequentially (playlist + windowing); surahs auto-advance to the next (1→114) on completion.
- **Smart controls**: `pause()`/`resume()`/`next()`/`previous()` execute on whichever system is currently active.
- **Direct access**: For advanced use, the controllers are exposed via `QuranAudio.surahController` and `QuranAudio.ayahController`.

## Sources

[Permalink: Sources](https://github.com/alheekmahlib/quran_audio#sources)

- Quran metadata (surah names & ayah counts): derived from King Fahd Glorious Quran Printing Complex data
- Audio sources: quranicaudio.com, mp3quran.net, tarteel.ai, cdn.islamic.network, everyayah.com

## License

[Permalink: License](https://github.com/alheekmahlib/quran_audio#license)

MIT for code. Read more about the license [here](https://github.com/alheekmahlib/quran_audio/blob/main/LICENSE).

## About

A Flutter package for Quran audio playback — logic only, no UI. Supports full-surah & per-ayah playback, system notifications, offline downloads, and repeat modes.

[quran-audio.vexaltech.dev/](https://quran-audio.vexaltech.dev/)

### Topics

[audio](https://github.com/topics/audio) [dart](https://github.com/topics/dart) [flutter](https://github.com/topics/flutter) [flutter-package](https://github.com/topics/flutter-package) [islam](https://github.com/topics/islam) [quran](https://github.com/topics/quran) [recitation](https://github.com/topics/recitation)

### Resources

[Readme](https://github.com/alheekmahlib/quran_audio#readme-ov-file)

[MIT license](https://github.com/alheekmahlib/quran_audio#MIT-1-ov-file)

[Activity](https://github.com/alheekmahlib/quran_audio/activity)

### Stars

**3** stars

### Watchers

**1** watching

### Forks

[**0** forks](https://github.com/alheekmahlib/quran_audio/forks)

[Report repository](https://github.com/contact/report-content?content_url=https%3A%2F%2Fgithub.com%2Falheekmahlib%2Fquran_audio&report=alheekmahlib+%28user%29)

## [Releases](https://github.com/alheekmahlib/quran_audio/releases) 2 (2)

[Quran-Lab zipformer v3.1 (int8)Latest\\
\\
2 months agoAug 31, 2026](https://github.com/alheekmahlib/quran_audio/releases/tag/zipformer-model-v1)

[\+ 1 release](https://github.com/alheekmahlib/quran_audio/releases)

## [Contributors](https://github.com/alheekmahlib/quran_audio/graphs/contributors) 1 (1)

- [![@alheekmahlib](https://avatars.githubusercontent.com/u/53709203?s=64&v=4)](https://github.com/alheekmahlib) [**alheekmahlib** Hawazen Sameer](https://github.com/alheekmahlib)

## Languages

- [Dart81%](https://github.com/alheekmahlib/quran_audio/search?l=dart)
- [C++9%](https://github.com/alheekmahlib/quran_audio/search?l=c%2B%2B)
- [CMake7%](https://github.com/alheekmahlib/quran_audio/search?l=cmake)
- [Ruby1%](https://github.com/alheekmahlib/quran_audio/search?l=ruby)
- [Swift0.9%](https://github.com/alheekmahlib/quran_audio/search?l=swift)
- [HTML0.5%](https://github.com/alheekmahlib/quran_audio/search?l=html)
- [Other0.6%](https://github.com/alheekmahlib/quran_audio/search?l=Other)

You can’t perform that action at this time.