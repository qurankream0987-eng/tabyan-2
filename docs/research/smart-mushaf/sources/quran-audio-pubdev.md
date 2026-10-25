Source: https://pub.dev/packages/quran_audio
Title: quran_audio | Flutter package
Fetched: 2026-10-15T02:09:37.397Z

[![](https://pub.dev/static/hash-n31r4ser/img/pub-dev-logo.svg)](https://pub.dev/)

# quran\_audio 1.0.0 ![copy "quran_audio: ^1.0.0" to clipboard](https://pub.dev/static/hash-n31r4ser/img/content-copy-icon.svg) quran\_audio: ^1.0.0 copied to clipboard

Published [3 months ago](https://pub.dev/packages/quran_audio "Jul 11, 2026")

SDK [Flutter](https://pub.dev/packages?q=sdk%3Aflutter "Packages compatible with Flutter SDK")

Platform [Android](https://pub.dev/packages?q=platform%3Aandroid "Packages compatible with Android platform") [iOS](https://pub.dev/packages?q=platform%3Aios "Packages compatible with iOS platform") [Linux](https://pub.dev/packages?q=platform%3Alinux "Packages compatible with Linux platform") [macOS](https://pub.dev/packages?q=platform%3Amacos "Packages compatible with macOS platform") [web](https://pub.dev/packages?q=platform%3Aweb "Packages compatible with Web platform") [Windows](https://pub.dev/packages?q=platform%3Awindows "Packages compatible with Windows platform")

![liked status: active](https://pub.dev/static/hash-n31r4ser/img/like-active.svg)![liked status: inactive](https://pub.dev/static/hash-n31r4ser/img/like-inactive.svg)2

→

### Metadata

A Flutter package for Quran audio playback — logic only, no UI. Supports full-surah and per-ayah playback with system media notifications, offline downloads, and repeat modes.

More...

- Readme
- [Changelog](https://pub.dev/packages/quran_audio/changelog)
- [Example](https://pub.dev/packages/quran_audio/example)
- [Installing](https://pub.dev/packages/quran_audio/install)
- [Versions](https://pub.dev/packages/quran_audio/versions)
- [Scores](https://pub.dev/packages/quran_audio/score)

## Quran Audio [\#](https://pub.dev/packages/quran_audio\#quran-audio)

![](https://external-images.pub.dev/vn%2B9FUIv6N2O4cDbD9Xk77GdLBPZDWVP16UngRdIoq8%3D/1792022400000/https%3A%2F%2Fraw.githubusercontent.com%2Falheekmahlib%2Fdata%2Fmain%2Fpackages%2Fquran_audio%2Fquran_audio_logo.png)

![](https://external-images.pub.dev/Q18svySTyfzZc%2BV%2BBMTVqJEXt9b0BN1yzE5gE3HOKPo%3D/1792022400000/https%3A%2F%2Fraw.githubusercontent.com%2Falheekmahlib%2Fdata%2Fmain%2Fpackages%2Fquran_audio%2Fimg.png)

[![pub package](https://external-images.pub.dev/GMtLgaZbCGu386leU4wsL0cDRdCAvcJ6RG8kKP%2F53m0%3D/1792022400000/https%3A%2F%2Fimg.shields.io%2Fpub%2Fv%2Fquran_audio.svg%3Fcolor%3D2cacbf%26labelColor%3D145261)](https://pub.dev/packages/quran_audio)[![pub points](https://external-images.pub.dev/mQYdIFkJiXWyNc9XcDP6EjlL9pn8ynjog3GgEyZ3eZ8%3D/1792022400000/https%3A%2F%2Fimg.shields.io%2Fpub%2Fpoints%2Fquran_audio%3Fcolor%3D2cacbf%26labelColor%3D145261)](https://pub.dev/packages/quran_audio/score)[![likes](https://external-images.pub.dev/DqqFmDHr2m8UbJf1hlhtQ%2FDqpsv4EYD1xbbY6Hi6Ido%3D/1792022400000/https%3A%2F%2Fimg.shields.io%2Fpub%2Flikes%2Fquran_audio%3Fcolor%3D2cacbf%26labelColor%3D145261)](https://pub.dev/packages/quran_audio/score)[![Pub Downloads](https://external-images.pub.dev/y28d3ndgvoAiSzsHFckiA4ImrfsQvTxvDUMaUrimcCI%3D/1792022400000/https%3A%2F%2Fimg.shields.io%2Fpub%2Fdm%2Fquran_audio%3Fcolor%3D2cacbf%26labelColor%3D145261)](https://pub.dev/packages/quran_audio/score)[![License: MIT](https://external-images.pub.dev/gc3VxTnAmXLyJ8xOYOe8cumstgX7EyI95mDMO6Ena2w%3D/1792022400000/https%3A%2F%2Fimg.shields.io%2Fbadge%2FLicense-MIT-2cacbf.svg%3FlabelColor%3D145261)](https://github.com/alheekmahlib/quran_audio/blob/main/LICENSE)

[![Web](https://external-images.pub.dev/gpRSXR0HvH6vcpoybqtUJzIogs9v4LWt3twQUSb7rWA%3D/1792022400000/https%3A%2F%2Fimg.shields.io%2Fbadge%2FWeb-145261%3Flogo%3Dgoogle-chrome%26logoColor%3Dwhite)](https://flutter.dev/)[![Windows](https://external-images.pub.dev/h%2FF7abs9PfEAlvPeBp1EE0n4H5Kr7Pm6go%2BBFJX3d7g%3D/1792022400000/https%3A%2F%2Fimg.shields.io%2Fbadge%2FWindows-145261%3Flogo%3DWindows%26logoColor%3Dwhite)](https://flutter.dev/)[![macOS](https://external-images.pub.dev/XsHig%2F%2FtJHTVmvej1GyA9vmZUy20SnzDid8bufn8C3s%3D/1792022400000/https%3A%2F%2Fimg.shields.io%2Fbadge%2FmacOS-145261%3Flogo%3Dapple%26logoColor%3Dwhite)](https://flutter.dev/)[![Android](https://external-images.pub.dev/jAWcZGpyzzg9uf5InvXNdhoYZRuknovlbiD7p%2BMw%2BNE%3D/1792022400000/https%3A%2F%2Fimg.shields.io%2Fbadge%2FAndroid-145261%3Flogo%3Dandroid%26logoColor%3Dwhite)](https://flutter.dev/)[![iOS](https://external-images.pub.dev/DLkl9Qfjm6K12n4QAtgwpGvcgZeC4GbetMw9Uy6%2BTwY%3D/1792022400000/https%3A%2F%2Fimg.shields.io%2Fbadge%2FiOS-145261%3Flogo%3Dios%26logoStyle%3Dbold%26logoColor%3Dwhite)](https://flutter.dev/)

A Flutter package for Quran audio playback — **logic only, no UI**. It supports two independent playback systems (full-surah and per-ayah), system media notifications, offline downloads, and repeat modes — all through a single unified `QuranAudio` facade.

# [\#](https://pub.dev/packages/quran_audio\#)

## Table of Contents [\#](https://pub.dev/packages/quran_audio\#table-of-contents)

- [Getting started](https://pub.dev/packages/quran_audio#getting-started)
- [Usage Example](https://pub.dev/packages/quran_audio#usage-example)
  - [Play a Surah](https://pub.dev/packages/quran_audio#play-a-surah)
  - [Play a Specific Ayah](https://pub.dev/packages/quran_audio#play-a-specific-ayah)
  - [Playback Controls](https://pub.dev/packages/quran_audio#playback-controls)
- [Reciters](https://pub.dev/packages/quran_audio#reciters)
- [Notification Icon](https://pub.dev/packages/quran_audio#notification-icon)
- [Offline Downloads](https://pub.dev/packages/quran_audio#offline-downloads)
- [Repeat](https://pub.dev/packages/quran_audio#repeat)
- [Reading State (GetX)](https://pub.dev/packages/quran_audio#reading-state-getx)
- [Metadata Helpers](https://pub.dev/packages/quran_audio#metadata-helpers)
- [How it Works](https://pub.dev/packages/quran_audio#how-it-works)
- [Sources](https://pub.dev/packages/quran_audio#sources)
- [License](https://pub.dev/packages/quran_audio#license)

# [\#](https://pub.dev/packages/quran_audio\#-2)

## Getting started [\#](https://pub.dev/packages/quran_audio\#getting-started)

#### Android

The required permissions for audio playback (`WAKE_LOCK`, and `FOREGROUND_SERVICE_MEDIA_PLAYOUT`) are automatically added by the package. You don't need to manually edit your AndroidManifest.xml.

Additionally, to enable system-integrated audio controls (notification/lockscreen) using `audio_service`, your app's MainActivity must extend `AudioServiceActivity`:

Kotlin:

```kotlin
import com.ryanheise.audioservice.AudioServiceActivity

class MainActivity: AudioServiceActivity()
```

copied to clipboard

Java:

```java
import com.ryanheise.audioservice.AudioServiceActivity;

public class MainActivity extends AudioServiceActivity {}
```

copied to clipboard

If you don't apply this change, the audio will still work locally, but system controls won't be available.

#### iOS

For background audio playback, you must add the following to your app's `Info.plist`:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>
```

copied to clipboard

#### macOS

macOS requires a network entitlement. Open `macos/Runner/DebugProfile.entitlements` and add:

```xml
<key>com.apple.security.network.client</key>
<true/>
```

copied to clipboard

> ⚠️ Also add the same key to `macos/Runner/Release.entitlements`, otherwise release builds cannot reach the network for audio streaming.

The library works out of the box on macOS (just\_audio uses the native AVAudioPlayer backend). The minimum deployment target should be macOS 11.0.

#### Windows & Linux

No manual setup is required. The library automatically initializes the `media_kit` audio backend on Windows and Linux via `just_audio_media_kit` during `QuranAudio.init()`. Just run:

```bash
flutter run -d windows   # or -d linux
```

copied to clipboard

> **Note:** System media notifications (lock-screen controls) are not available on Windows, Linux, or macOS — this is an `audio_service` limitation. Audio playback itself works fully on all desktop platforms.

#### Web

The library works on web in **streaming-only mode** (no offline downloads, since browsers have no file system). `QuranAudio.init()` handles everything automatically:

```bash
flutter run -d chrome
```

copied to clipboard

- ✅ Play surahs & ayahs (streamed from network URLs)
- ✅ Reciter selection, repeat modes, playback controls
- ❌ Offline downloads (not possible on web — use streaming instead)
- ❌ System media notifications (not supported on web by `audio_service`)

### Installation [\#](https://pub.dev/packages/quran_audio\#installation)

In the `pubspec.yaml` of your flutter project, add the following dependency:

```yaml
dependencies:
  ...
  quran_audio: ^1.0.0
```

copied to clipboard

Import it:

```dart
import 'package:quran_audio/quran_audio.dart';
```

copied to clipboard

Initialize it:

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Initialize the entire library in one step
  await QuranAudio.init();
  runApp(const MyApp());
}
```

copied to clipboard

> 💡 `QuranAudio.init()` accepts optional parameters:
>
> ```dart
> await QuranAudio.init(
>   enableSystemNotifications: true,   // false = no notifications (lighter, for web/tests)
>   androidNotificationChannelId: 'com.myapp.quran',
>   androidNotificationChannelName: 'Quran Playback',
>   notificationIconSource: 'assets/images/logo.png', // custom icon (asset/url/file)
> );
> ```
>
> copied to clipboard

> By default, `QuranAudio.init()` uses the library's bundled icon for the system media notification. To change it at runtime, see [Notification Icon](https://pub.dev/packages/quran_audio#notification-icon).

## Notification Icon [\#](https://pub.dev/packages/quran_audio\#notification-icon)

The system media notification (lock screen / Bluetooth / car audio) shows an icon. By default the library's bundled logo is used. You can set a custom icon from an asset, a network URL, or a local file:

```dart
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

copied to clipboard

> The icon is refreshed live — if playback is active when you call these methods, the notification updates immediately.

## Usage Example [\#](https://pub.dev/packages/quran_audio\#usage-example)

### Play a Surah [\#](https://pub.dev/packages/quran_audio\#play-a-surah)

Play a full surah (single MP3 file per surah):

```dart
// Play Surah Al-Baqarah
QuranAudio.playSurah(2);

// Play Surah Al-Fatihah
QuranAudio.playSurah(1);
```

copied to clipboard

### Play a Specific Ayah [\#](https://pub.dev/packages/quran_audio\#play-a-specific-ayah)

Play a specific ayah by surah number and ayah number:

```dart
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

copied to clipboard

### Playback Controls [\#](https://pub.dev/packages/quran_audio\#playback-controls)

Controls automatically execute on the **currently active** system — no need to know which is running.

```dart
QuranAudio.pause();               // Pause (active system)
QuranAudio.resume();              // Resume (active system)
QuranAudio.stop();                // Stop completely
QuranAudio.next();                // Next (surah or ayah)
QuranAudio.previous();            // Previous (surah or ayah)
QuranAudio.seek(Duration(minutes: 5));  // Seek to position
QuranAudio.togglePlayPause();     // Toggle play/pause
```

copied to clipboard

Complete Audio Example

```dart
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

copied to clipboard

## Reciters [\#](https://pub.dev/packages/quran_audio\#reciters)

The library ships with two independent reciter lists (matching the original `quran_library`):

- **Surah reciters**: 21 reciters (quranicaudio.com, mp3quran.net, tarteel.ai)
- **Ayah reciters**: 12 reciters (cdn.islamic.network, everyayah.com)

```dart
// Change reciter by index
QuranAudio.setSurahReader(2);
QuranAudio.setAyahReader(1);

// Access the lists
final surahReaders = QuranAudio.surahReaders;
final ayahReaders = QuranAudio.ayahReaders;
final currentIndex = QuranAudio.surahReaderIndex;
```

copied to clipboard

Custom Reciters

```dart
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

copied to clipboard

## Offline Downloads [\#](https://pub.dev/packages/quran_audio\#offline-downloads)

```dart
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

copied to clipboard

## Repeat [\#](https://pub.dev/packages/quran_audio\#repeat)

```dart
QuranAudio.repeatAyah();      // Repeat the current ayah
QuranAudio.repeatSurah();     // Repeat the current surah
QuranAudio.repeatAyahRange(   // Repeat a range of ayahs
  fromAyah: 1,
  toAyah: 10,
  times: 3,
);
QuranAudio.disableRepeat();   // Disable repeat
```

copied to clipboard

## Reading State (GetX) [\#](https://pub.dev/packages/quran_audio\#reading-state-getx)

> ⚠️ **Important**: Each `Obx` must read `.value` **directly** from a controller inside its builder. Do not wrap a whole widget in `Obx` if Rx values are read in a deeper `build` — GetX will throw an error.

```dart
final c = QuranAudio.surahController;

// ✅ Correct — .value is read directly inside Obx
Obx(() => Text(
  c.isPlaying.value ? 'Playing' : 'Paused',
));

Obx(() => Text('Surah: ${c.currentSurahNumber.value}'));
```

copied to clipboard

Progress bar & reactive card

```dart
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

copied to clipboard

## Metadata Helpers [\#](https://pub.dev/packages/quran_audio\#metadata-helpers)

Instead of bundling the full Quran file (745KB), the library uses a tiny (~3KB) JSON holding only surah numbers, names, and ayah counts. Unique ayah numbers (UQ 1..6236) are computed cumulatively — no need to store them.

```dart
QuranAudio.ayahCountOf(2);          // → 286
QuranAudio.uqNumberOf(2, 255);      // → 262
QuranAudio.surah(2).name;           // → "Surat Al-Baqarah"
QuranAudio.allSurahs;               // → List<SurahMeta> (114 entries)

// Validation
QuranAudio.metadata.isValidSurah(2);           // → true
QuranAudio.metadata.isValidAyah(2, 255);       // → true
```

copied to clipboard

## How it Works [\#](https://pub.dev/packages/quran_audio\#how-it-works)

The library maintains two independent playback systems, each with its own reciters, URLs, and mechanisms:

| System | Description | Reciters | Sources |
| --- | --- | --- | --- |
| **Surah** (`SurahAudioController`) | One MP3 per full surah | 21 | quranicaudio.com, mp3quran.net, tarteel.ai |
| **Ayah** (`AyahAudioController`) | One MP3 per ayah | 12 | cdn.islamic.network, everyayah.com |

They share a single `AudioPlayer` via a coordination layer (`AudioEngine`). When one system takes control, the other is automatically stopped and its state is reset.

- **Auto-advance**: Ayahs play sequentially (playlist + windowing); surahs auto-advance to the next (1→114) on completion.
- **Smart controls**: `pause()`/`resume()`/`next()`/`previous()` execute on whichever system is currently active.
- **Direct access**: For advanced use, the controllers are exposed via `QuranAudio.surahController` and `QuranAudio.ayahController`.

## Sources [\#](https://pub.dev/packages/quran_audio\#sources)

- Quran metadata (surah names & ayah counts): derived from King Fahd Glorious Quran Printing Complex data
- Audio sources: quranicaudio.com, mp3quran.net, tarteel.ai, cdn.islamic.network, everyayah.com

## License [\#](https://pub.dev/packages/quran_audio\#license)

MIT for code. Read more about the license [here](https://github.com/alheekmahlib/quran_audio/blob/main/LICENSE).

### ← Metadata

[2\\
\\
likes\\
\\
130\\
\\
points\\
\\
29\\
\\
downloads](https://pub.dev/packages/quran_audio/score)

### Documentation

[Documentation](https://quran-audio.vexaltech.dev/)

[API reference](https://pub.dev/documentation/quran_audio/latest/)

### Publisher

unverified uploader

### Weekly Downloads

2025.11.17 - 2026.10.12

### Metadata

A Flutter package for Quran audio playback — logic only, no UI. Supports full-surah and per-ayah playback with system media notifications, offline downloads, and repeat modes.

[Repository (GitHub)](https://github.com/alheekmahlib/quran_audio)

[View/report issues](https://github.com/alheekmahlib/quran_audio/issues)

### License

![](https://pub.dev/static/hash-n31r4ser/img/material-icon-balance.svg)MIT ( [license](https://pub.dev/packages/quran_audio/license))

### Dependencies

[archive](https://pub.dev/packages/archive "^4.0.9"), [audio\_service](https://pub.dev/packages/audio_service "^0.18.19"), [dio](https://pub.dev/packages/dio "^5.10.0"), [flutter](https://api.flutter.dev/), [get](https://pub.dev/packages/get "^4.7.3"), [get\_storage](https://pub.dev/packages/get_storage "^2.1.1"), [just\_audio](https://pub.dev/packages/just_audio "^0.10.6"), [just\_audio\_media\_kit](https://pub.dev/packages/just_audio_media_kit "^2.1.0"), [path](https://pub.dev/packages/path "^1.9.1"), [path\_provider](https://pub.dev/packages/path_provider "^2.1.6"), [rxdart](https://pub.dev/packages/rxdart "^0.28.0")

### More

[Packages that depend on quran\_audio](https://pub.dev/packages?q=dependency%3Aquran_audio)

Back

![previous](https://pub.dev/static/hash-n31r4ser/img/keyboard_arrow_left.svg)

![next](https://pub.dev/static/hash-n31r4ser/img/keyboard_arrow_right.svg)