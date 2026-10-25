# Source capture: market-quran-kit-pub

URL: https://pub.dev/packages/quran_kit
Fetched: 2026-10-15

[![](https://pub.dev/static/hash-n31r4ser/img/pub-dev-logo.svg)](https://pub.dev/)

# quran\_kit 0.2.0 ![copy "quran_kit: ^0.2.0" to clipboard](https://pub.dev/static/hash-n31r4ser/img/content-copy-icon.svg) quran\_kit: ^0.2.0 copied to clipboard

Published [7 months ago](https://pub.dev/packages/quran_kit "Mar 15, 2026")

SDK [Flutter](https://pub.dev/packages?q=sdk%3Aflutter "Packages compatible with Flutter SDK")

Platform [Android](https://pub.dev/packages?q=platform%3Aandroid "Packages compatible with Android platform") [iOS](https://pub.dev/packages?q=platform%3Aios "Packages compatible with iOS platform") [macOS](https://pub.dev/packages?q=platform%3Amacos "Packages compatible with macOS platform")

![liked status: active](https://pub.dev/static/hash-n31r4ser/img/like-active.svg)![liked status: inactive](https://pub.dev/static/hash-n31r4ser/img/like-inactive.svg)2

→

### Metadata

Complete Quran toolkit for Flutter — rendering (QFC4 fonts with tajweed), audio playback (22 reciters, 3 quality levels, offline download), tafsir (14 books), word-by-word data, embedded Arabic text ( \[...\]

More...

- Readme
- [Changelog](https://pub.dev/packages/quran_kit/changelog)
- [Example](https://pub.dev/packages/quran_kit/example)
- [Installing](https://pub.dev/packages/quran_kit/install)
- [Versions](https://pub.dev/packages/quran_kit/versions)
- [Scores](https://pub.dev/packages/quran_kit/score)

# quran\_kit [\#](https://pub.dev/packages/quran_kit\#quran_kit)

[![pub package](https://external-images.pub.dev/QBnXFXaVeuX7PoibtEYtGjjfbDVt%2BVvReveP%2BNj981M%3D/1792022400000/https%3A%2F%2Fimg.shields.io%2Fpub%2Fv%2Fquran_kit.svg)](https://pub.dev/packages/quran_kit)![License: MIT](https://external-images.pub.dev/RUgX%2FYSm1tFEYn%2FozDQ86%2FrWrrJlzG8KS2SMvC9vviQ%3D/1792022400000/https%3A%2F%2Fimg.shields.io%2Fbadge%2Flicense-MIT-blue.svg)

A complete, modular Quran toolkit for Flutter — rendering, audio, tafsir, search, word-by-word, reading tracker, and 35+ ready-made UI widgets. Import only what you need.

## Features [\#](https://pub.dev/packages/quran_kit\#features)

| Feature | Details |
| --- | --- |
| **Rendering** | QFC4 fonts with tajweed coloring, 5 themes, auto night mode |
| **Audio** | 22 reciters, 3 quality levels, offline download, speed/repeat |
| **Tafsir** | 14 tafsir books with download & cache |
| **Text** | 40+ translation editions, embedded Uthmani + Simple Arabic |
| **Word-by-word** | Morphology data + word audio |
| **Search** | Arabic-aware with diacritic normalization, voice search |
| **Reading** | Daily wird goals, streaks, weekly/monthly stats |
| **Widgets** | 35 composable widgets + 6 ready-made screens |

## Architecture [\#](https://pub.dev/packages/quran_kit\#architecture)

Three import tiers — use only what you need:

```undefined
┌─────────────────────────────────────┐
│  screens.dart  — 6 ready-made screens│
├─────────────────────────────────────┤
│  *_ui.dart     — widgets per domain  │
├─────────────────────────────────────┤
│  headless.dart — services only       │
└─────────────────────────────────────┘
```

copied to clipboard

## Quick Start [\#](https://pub.dev/packages/quran_kit\#quick-start)

### 1\. Install [\#](https://pub.dev/packages/quran_kit\#1-install)

```yaml
dependencies:
  quran_kit: ^0.1.0
```

copied to clipboard

### 2\. Initialize [\#](https://pub.dev/packages/quran_kit\#2-initialize)

```dart
import 'package:quran_kit/kit.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await QuranKit.initialize(QuranKitConfig(
    fontBaseUrl: 'https://github.com/user/repo/releases/download/v1.0.0',
  ));

  runApp(const MyApp());
}
```

copied to clipboard

### 3\. Use a ready-made screen [\#](https://pub.dev/packages/quran_kit\#3-use-a-ready-made-screen)

```dart
import 'package:quran_kit/kit.dart';
import 'package:quran_kit/screens.dart';

class QuranPage extends StatefulWidget {
  const QuranPage({super.key});

  @override
  State<QuranPage> createState() => _QuranPageState();
}

class _QuranPageState extends State<QuranPage> {
  final _controller = QuranReaderController();

  @override
  void initState() {
    super.initState();
    _controller.init();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return QuranReaderScreen(
      controller: _controller,
      enableZoom: true,
      onAyahTap: (surah, ayah) {
        Navigator.push(context, MaterialPageRoute(
          builder: (_) => AyahDetailsScreen(surah: surah, ayah: ayah),
        ));
      },
    );
  }
}
```

copied to clipboard

### 4\. Or compose your own UI [\#](https://pub.dev/packages/quran_kit\#4-or-compose-your-own-ui)

```dart
import 'package:quran_kit/rendering_ui.dart';
import 'package:quran_kit/audio_ui.dart';
import 'package:quran_kit/navigation_ui.dart';

// Use individual widgets:
QuranPageView(initialPage: 1, onPageChanged: (p) => ...)
QuranAudioPlayerBar(state: audioState, onPlayPause: () => ...)
QuranBottomInfoBar(theme: theme, currentPage: page, ...)
```

copied to clipboard

## Import Guide [\#](https://pub.dev/packages/quran_kit\#import-guide)

| Import | Contents |
| --- | --- |
| `quran_kit/headless.dart` | All services, zero widgets |
| `quran_kit/core.dart` | Metadata, models, storage, themes |
| `quran_kit/rendering.dart` | Font download, cache, load, render |
| `quran_kit/rendering_ui.dart` | Page widgets + hifz + sajda + zoom + dual |
| `quran_kit/audio.dart` | Audio service |
| `quran_kit/audio_ui.dart` | Audio bar + reciter picker + download |
| `quran_kit/tafsir.dart` | Tafsir service |
| `quran_kit/tafsir_ui.dart` | Tafsir sheet + picker |
| `quran_kit/text.dart` | Text/translation service |
| `quran_kit/text_ui.dart` | Edition picker |
| `quran_kit/search.dart` | Search engine + voice |
| `quran_kit/search_ui.dart` | Search bar + voice widget |
| `quran_kit/word.dart` | Word-by-word service |
| `quran_kit/word_ui.dart` | Word info sheet |
| `quran_kit/content.dart` | Asbab al-nuzul + khatma du'a |
| `quran_kit/content_ui.dart` | Asbab nuzul sheet |
| `quran_kit/reading.dart` | Wird tracker + stats + settings |
| `quran_kit/reading_ui.dart` | Tracker + stats + qiraa picker |
| `quran_kit/navigation_ui.dart` | Bookmarks, juz, surah index, theme picker, share |
| `quran_kit/theme.dart` | Auto night mode |
| `quran_kit/theme_ui.dart` | Night mode widget |
| `quran_kit/kit.dart` | QuranKitConfig + QuranKit + controller |
| `quran_kit/screens.dart` | 6 ready-made screens |

## Configuration [\#](https://pub.dev/packages/quran_kit\#configuration)

```dart
QuranKitConfig(
  fontBaseUrl: 'https://...',         // Required: CDN for QFC4 fonts
  enableAudio: true,                  // Audio playback service
  enableTafsir: true,                 // Tafsir (exegesis) service
  enableSearch: true,                 // Full-text search
  enableWordByWord: true,             // Word-by-word data
  enableAsbabNuzul: true,             // Occasions of revelation
  defaultReciterIndex: 0,             // Mishary Alafasy
  defaultTafsirId: 'al-tabari',       // Default tafsir book
  defaultEditionId: 'ar-uthmani',     // Default text edition
  defaultQiraa: 'hafs',              // Default qira'a
  defaultTheme: QuranThemes.parchment,// Reading theme
  readingGoal: 20,                    // Daily pages goal
  showTajweed: true,                  // Tajweed coloring
  enableAutoNightMode: false,         // Time-based dark mode
  nightStartHour: 18,                // Night start (6 PM)
  nightEndHour: 6,                   // Night end (6 AM)
  storage: null,                      // Custom QuranStorage (default: JSON file)
)
```

copied to clipboard

## Ready-Made Screens [\#](https://pub.dev/packages/quran_kit\#ready-made-screens)

| Screen | Purpose |
| --- | --- |
| `QuranReaderScreen` | Full reader with page view, audio bar, navigation |
| `QuranSearchScreen` | Full-text search with filters |
| `QuranSettingsScreen` | Theme, reciter, translation, tafsir, font size |
| `AyahDetailsScreen` | Ayah text + translation + tafsir + word-by-word |
| `QuranBookmarksScreen` | Bookmark list with swipe-to-delete |
| `QuranDownloadsScreen` | Audio + text download management |

All screens support builder callbacks for customization:

```dart
QuranReaderScreen(
  controller: controller,
  appBarBuilder: (context, info) => AppBar(title: Text(info.surahName)),
  bottomBarBuilder: (context, info) => MyBottomBar(info: info),
  audioBarBuilder: (context, state) => MyAudioBar(state: state),
  drawerBuilder: (context, info) => MyDrawer(),
);
```

copied to clipboard

## Themes [\#](https://pub.dev/packages/quran_kit\#themes)

5 built-in themes:

```dart
QuranThemes.emeraldNight  // Dark green
QuranThemes.parchment     // Classic beige
QuranThemes.midnight      // Dark blue
QuranThemes.amoledDark    // Pure black AMOLED
QuranThemes.daylight      // Clean white
```

copied to clipboard

Or define your own:

```dart
QuranReadingTheme(
  id: 'custom',
  name: 'Custom Theme',
  backgroundColor: Color(0xFFF5F5F5),
  textColor: Color(0xFF333333),
  accentColor: Color(0xFF1E88E5),
  highlightColor: Color(0x331E88E5),
  isDark: false,
)
```

copied to clipboard

## Custom Storage [\#](https://pub.dev/packages/quran_kit\#custom-storage)

Implement `QuranStorage` to use your own persistence layer:

```dart
class HiveQuranStorage implements QuranStorage {
  @override
  Future<String?> getString(String key) async => box.get(key);

  @override
  Future<void> setString(String key, String value) async => box.put(key, value);

  // ... implement all methods
}

await QuranKit.initialize(QuranKitConfig(
  fontBaseUrl: '...',
  storage: HiveQuranStorage(),
));
```

copied to clipboard

## Data Sources [\#](https://pub.dev/packages/quran_kit\#data-sources)

| Data | Source | Caching |
| --- | --- | --- |
| Audio (22 reciters) | everyayah.com | Per-surah MP3 files |
| Translations (40+) | api.alquran.cloud | Per-edition JSON |
| Tafsir (14 books) | GitHub Releases CDN | Per-book JSON |
| Word-by-word | GitHub Releases CDN | Per-surah JSON |
| Asbab al-nuzul | GitHub Releases CDN | Single JSON |
| Word audio | audio.qurancdn.com | Streamed |
| QFC4 fonts | Configurable CDN | 5-page ZIP bundles |
| Arabic text | Embedded assets | In-memory (gzipped) |

## Platform Support [\#](https://pub.dev/packages/quran_kit\#platform-support)

| Platform | Status |
| --- | --- |
| Android | ✅ Supported |
| iOS | ✅ Supported |
| Web | ❌ Not supported (`dart:io` dependency) |
| Desktop | ⚠️ Untested |

## Requirements [\#](https://pub.dev/packages/quran_kit\#requirements)

- Dart SDK `^3.7.1`
- Flutter `>=3.0.0`
- Network access on first run (font + data downloads)

## License [\#](https://pub.dev/packages/quran_kit\#license)

MIT — see LICENSE.

### ← Metadata

[2\\
\\
likes\\
\\
140\\
\\
points\\
\\
86\\
\\
downloads](https://pub.dev/packages/quran_kit/score)

### Documentation

[API reference](https://pub.dev/documentation/quran_kit/latest/)

### Publisher

unverified uploader

### Weekly Downloads

2025.11.17 - 2026.10.12

### Metadata

Complete Quran toolkit for Flutter — rendering (QFC4 fonts with tajweed), audio playback (22 reciters, 3 quality levels, offline download), tafsir (14 books), word-by-word data, embedded Arabic text (Uthmani + Simple), asbab al-nuzul, reading tracker, search (voice-ready), and 20+ ready-made UI widgets. Import only what you need.

[Repository (GitHub)](https://github.com/MoeEyani/quran_kit)

[View/report issues](https://github.com/MoeEyani/quran_kit/issues)

### Topics

[#quran](https://pub.dev/packages?q=topic%3Aquran) [#islam](https://pub.dev/packages?q=topic%3Aislam) [#tajweed](https://pub.dev/packages?q=topic%3Atajweed) [#tafsir](https://pub.dev/packages?q=topic%3Atafsir) [#arabic](https://pub.dev/packages?q=topic%3Aarabic)

### License

![](https://pub.dev/static/hash-n31r4ser/img/material-icon-balance.svg)MIT ( [license](https://pub.dev/packages/quran_kit/license))

### Dependencies

[archive](https://pub.dev/packages/archive "^4.0.2"), [flutter](https://api.flutter.dev/), [flutter\_svg](https://pub.dev/packages/flutter_svg "^2.0.9"), [http](https://pub.dev/packages/http "^1.2.0"), [just\_audio](https://pub.dev/packages/just_audio ">=0.9.43 <1.0.0"), [path\_provider](https://pub.dev/packages/path_provider "^2.1.0")

### More

[Packages that depend on quran\_kit](https://pub.dev/packages?q=dependency%3Aquran_kit)

Back

![previous](https://pub.dev/static/hash-n31r4ser/img/keyboard_arrow_left.svg)

![next](https://pub.dev/static/hash-n31r4ser/img/keyboard_arrow_right.svg)