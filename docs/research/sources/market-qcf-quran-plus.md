# Source capture: market-qcf-quran-plus

URL: https://pub.dev/packages/qcf_quran_plus
Fetched: 2026-10-15

[![](https://pub.dev/static/hash-n31r4ser/img/pub-dev-logo.svg)](https://pub.dev/)

# qcf\_quran\_plus 0.1.1 ![copy "qcf_quran_plus: ^0.1.1" to clipboard](https://pub.dev/static/hash-n31r4ser/img/content-copy-icon.svg) qcf\_quran\_plus: ^0.1.1 copied to clipboard

Published [15 hours ago](https://pub.dev/packages/qcf_quran_plus "Oct 14, 2026")

SDK [Flutter](https://pub.dev/packages?q=sdk%3Aflutter "Packages compatible with Flutter SDK")

Platform [Android](https://pub.dev/packages?q=platform%3Aandroid "Packages compatible with Android platform") [iOS](https://pub.dev/packages?q=platform%3Aios "Packages compatible with iOS platform") [Linux](https://pub.dev/packages?q=platform%3Alinux "Packages compatible with Linux platform") [macOS](https://pub.dev/packages?q=platform%3Amacos "Packages compatible with macOS platform") [Windows](https://pub.dev/packages?q=platform%3Awindows "Packages compatible with Windows platform")

![liked status: active](https://pub.dev/static/hash-n31r4ser/img/like-active.svg)![liked status: inactive](https://pub.dev/static/hash-n31r4ser/img/like-inactive.svg)26

→

### Metadata

offline Quran package with Hafs font and have tajweed.

More...

- Readme
- [Changelog](https://pub.dev/packages/qcf_quran_plus/changelog)
- [Example](https://pub.dev/packages/qcf_quran_plus/example)
- [Installing](https://pub.dev/packages/qcf_quran_plus/install)
- [Versions](https://pub.dev/packages/qcf_quran_plus/versions)
- [Scores](https://pub.dev/packages/qcf_quran_plus/score)

# 🕌 qcf\_quran\_plus [\#](https://pub.dev/packages/qcf_quran_plus\#-qcf_quran_plus)

[![Pub Version](https://external-images.pub.dev/hJLcui02cIdc6bWYUm12eTBxklcd5A9%2Fr6Vs%2FPzGRok%3D/1792022400000/https%3A%2F%2Fimg.shields.io%2Fpub%2Fv%2Fqcf_quran_plus%3Fcolor%3Dblue%26style%3Dflat-square)](https://pub.dev/packages/qcf_quran_plus)[![Flutter](https://external-images.pub.dev/dy%2FkO6i5zx4llTrj6%2BMK27F1jCrm2klKYKKkFykred4%3D/1792022400000/https%3A%2F%2Fimg.shields.io%2Fbadge%2FPlatform-Flutter-02569B%3Flogo%3Dflutter%26style%3Dflat-square)](https://flutter.dev/)[![License: MIT](https://external-images.pub.dev/Z7bGC%2Bhv7doVL6DQhssqP5fh2u14jO7hJI37%2F3iiaMk%3D/1792022400000/https%3A%2F%2Fimg.shields.io%2Fbadge%2FLicense-MIT-yellow.svg%3Fstyle%3Dflat-square)](https://opensource.org/licenses/MIT)

A **lightweight, high-performance Flutter Quran package** powered by the official **QCF (Hafs) font**.

Built for professional Quran, memorization, Tafsir, translation, audio, and Islamic applications, `qcf_quran_plus` provides a complete offline Quran rendering engine with:

- Authentic **604-page Mushaf rendering**
- **Single-page** and **two-page** layouts
- Native **QCF / Hafs** rendering
- **Uthmani Tajweed** colors
- **Light & Dark mode**
- **Ayah highlighting**
- **Word-level highlighting**
- Interactive **word tapping**
- **Long-press Ayah interactions**
- Scrollable **Surah List / Vertical Reader**
- Smart **Arabic search and normalization**
- Quran **page / Surah / Juz / Quarter / revelation metadata**
- Optimized font loading and page preloading
- Custom builders for **Surah headers, Basmallah, page headers, Ayah containers, top bars, and bottom bars**

* * *

## 📸 Screenshots [\#](https://pub.dev/packages/qcf_quran_plus\#-screenshots)

![Mushaf View](https://external-images.pub.dev/sGOWiGPp9u706fVppW5jQ4H1PLbDh1BrjnNeQ6X1Un0%3D/1792022400000/https%3A%2F%2Fgithub.com%2Fuser-attachments%2Fassets%2F482a0b7f-f048-4434-86af-c40e301dc503)![Tajweed Support](https://external-images.pub.dev/y9WNG%2BTmx%2F0%2Ba41noGlb18OcTjWwgBDainu0MDGwKuE%3D/1792022400000/https%3A%2F%2Fgithub.com%2Fuser-attachments%2Fassets%2F65dc7b33-e80e-4cd4-ac4e-8d80957ae654)

![Surah List Mode](https://external-images.pub.dev/YDxa%2FLJW1fz26dYA3v1DNLxDZGSB6zRU3ywjBNE6idw%3D/1792022400000/https%3A%2F%2Fgithub.com%2Fuser-attachments%2Fassets%2F5a4652cf-9b53-4521-991f-304afd91a6cd)![Dark Mode](https://external-images.pub.dev/6mkTnb8RX3HysYoJWl%2B%2F67ALKUZ9SaeLpl0sncb3zAU%3D/1792022400000/https%3A%2F%2Fgithub.com%2Fuser-attachments%2Fassets%2Fda1d0f89-41e2-4e2e-8c21-6a50bece6786)

![Search Engine](https://external-images.pub.dev/cAfiEe1O64zJ9Hy7ngHqYh%2BMUUUfPuL5l9hzoUEL%2Fc8%3D/1792022400000/https%3A%2F%2Fgithub.com%2Fuser-attachments%2Fassets%2F4bac8673-06e8-4478-bf2f-55f331cd61f2)![Metadata Details](https://external-images.pub.dev/XVU%2Bazy67%2FSFFbRMPEdgszffdTycawUitz8iCYmcnjM%3D/1792022400000/https%3A%2F%2Fgithub.com%2Fuser-attachments%2Fassets%2F8caa32df-7168-48e3-8c1e-657710b6f5ad)

* * *

## ✨ Key Features [\#](https://pub.dev/packages/qcf_quran_plus\#-key-features)

### 📖 Authentic Mushaf Rendering [\#](https://pub.dev/packages/qcf_quran_plus\#-authentic-mushaf-rendering)

Render the complete Quran using the package's QCF data and page engine.

- 604 Mushaf pages
- 114 Surahs
- 6,236 Ayahs
- 30 Juz
- Exact page-based rendering through `QuranPageView`
- Dedicated handling for the first two Mushaf pages
- Automatic Surah headers
- Automatic Basmallah rendering
- RTL Quran rendering
- Page-aware QCF font selection

The package's page engine works from structured `QuranPage` data and pre-parsed line information rather than rebuilding the Quran text from scratch on every frame.

* * *

### ⚡ High Performance & Offline Rendering [\#](https://pub.dev/packages/qcf_quran_plus\#-high-performance--offline-rendering)

`qcf_quran_plus` is designed for Quran applications where smooth rendering matters.

- Offline Quran data
- No network dependency for Quran rendering
- `QcfFontLoader` for startup font initialization
- Page font preloading around the current page
- Cached word/line offsets
- Parsed line caching
- `RepaintBoundary` around Quran pages
- Memoized indexes for Ayah and word highlights
- Optimized page construction for continuous swiping

For best results, initialize the fonts during your splash/loading phase before opening the Mushaf.

* * *

### 🎨 Uthmani Tajweed [\#](https://pub.dev/packages/qcf_quran_plus\#-uthmani-tajweed)

Enable native Tajweed rendering through:

```dart
isTajweed: true,
```

copied to clipboard

The page renderer selects the appropriate QCF font for the requested page and supports:

- Tajweed colors in Light mode
- Tajweed colors in Dark mode
- Non-Tajweed rendering when disabled
- Page-specific font selection
- Dark-mode-aware Quran text rendering

* * *

### 🌙 Light & Dark Mode [\#](https://pub.dev/packages/qcf_quran_plus\#-light--dark-mode)

Both Quran widgets support dark mode.

```dart
isDarkMode: Theme.of(context).brightness == Brightness.dark,
```

copied to clipboard

For the Mushaf page renderer, the package internally builds its QCF text style from the page number, Tajweed setting, and dark-mode setting.

> **Important:** Avoid overriding `ayahStyle` unless you intentionally want to replace the package's default QCF style selection.

* * *

### 🎯 Dynamic Ayah Highlighting [\#](https://pub.dev/packages/qcf_quran_plus\#-dynamic-ayah-highlighting)

Use `HighlightVerse` to highlight any Ayah dynamically.

This is useful for:

- Audio synchronization
- Memorization sessions
- Bookmarks
- Active recitation
- Search results
- Tafsir navigation
- Temporary selection states

```dart
List<HighlightVerse> _activeHighlights = [];

setState(() {
  _activeHighlights = [\
    HighlightVerse(\
      surah: 2,\
      verseNumber: 255,\
      page: 42,\
      color: Colors.amber.withValues(alpha: 0.4),\
    ),\
  ];
});
```

copied to clipboard

Clear the highlights:

```dart
setState(() {
  _activeHighlights = [];
});
```

copied to clipboard

The package indexes the supplied highlights internally so the Quran lines can determine which Ayahs are active without repeatedly scanning the whole list.

* * *

### 🖍️ Word-Level Highlighting [\#](https://pub.dev/packages/qcf_quran_plus\#-word-level-highlighting)

The package also supports `WordHighlight` for highlighting individual words inside an Ayah.

You can control:

- `textColor`
- `backgroundColor`
- Surah
- Ayah
- Word index

Example:

```dart
final wordHighlights = <WordHighlight>[\
  WordHighlight(\
    surah: 2,\
    verseNumber: 255,\
    wordIndex: 3,\
    textColor: Colors.white,\
    backgroundColor: Colors.amber,\
  ),\
];
```

copied to clipboard

Pass the list directly to the page or Surah reader:

```dart
QuranPageView(
  pageController: controller,
  highlights: _activeHighlights,
  wordHighlights: wordHighlights,
  isDarkMode: isDark,
  isTajweed: true,
);
```

copied to clipboard

Word highlights are especially useful for:

- Word-by-word recitation tracking
- Quran teaching tools
- Pronunciation feedback
- Memorization assistants
- Vocabulary applications
- Audio word synchronization

* * *

### 👆 Word Interaction [\#](https://pub.dev/packages/qcf_quran_plus\#-word-interaction)

`QuranPageView` and `QuranSurahListView` expose `onWordTap`:

```dart
QuranPageView(
  pageController: controller,
  highlights: _activeHighlights,
  onWordTap: (surahNumber, verseNumber, wordIndex, word) {
    debugPrint(
      'Surah: $surahNumber | Ayah: $verseNumber | Word: $wordIndex | $word',
    );
  },
  isDarkMode: false,
  isTajweed: true,
);
```

copied to clipboard

This gives you the exact:

- Surah number
- Ayah number
- Word index
- Raw logical word

* * *

### 🤲 Long-Press Ayah Interaction [\#](https://pub.dev/packages/qcf_quran_plus\#-long-press-ayah-interaction)

Both Quran rendering modes support Ayah long press.

```dart
QuranPageView(
  pageController: controller,
  highlights: _activeHighlights,
  onLongPress: (surahNumber, verseNumber, details) {
    debugPrint(
      'Long pressed Surah $surahNumber, Ayah $verseNumber',
    );

    final position = details.globalPosition;

    // Show your own menu, bottom sheet, popup, tafsir dialog, etc.
    debugPrint('Pressed at: $position');
  },
  isDarkMode: false,
);
```

copied to clipboard

The callback gives you `LongPressStartDetails`, allowing you to build context menus relative to the exact press location.

Typical use cases:

- Copy Ayah
- Add bookmark
- Show Tafsir
- Start audio
- Share Ayah
- Start memorization
- Open translation

* * *

## 📖 Mushaf Page Mode [\#](https://pub.dev/packages/qcf_quran_plus\#-mushaf-page-mode)

Use `QuranPageView` when you need an authentic page-based Quran experience.

```dart
final PageController _controller = PageController(initialPage: 0);

List<HighlightVerse> _activeHighlights = [];

QuranPageView(
  pageController: _controller,
  highlights: _activeHighlights,
  isDarkMode: Theme.of(context).brightness == Brightness.dark,
  isTajweed: true,
  enableTwoPageLayout: true,

  onPageChanged: (pageNumber) {
    debugPrint('Navigated to page: $pageNumber');
  },

  onLongPress: (surahNumber, verseNumber, details) {
    debugPrint(
      'Long pressed Surah $surahNumber, Verse $verseNumber',
    );
  },
);
```

copied to clipboard

### Single Page [\#](https://pub.dev/packages/qcf_quran_plus\#single-page)

```dart
QuranPageView(
  pageController: _controller,
  highlights: _activeHighlights,
  isDarkMode: false,
  isTajweed: true,
  enableTwoPageLayout: false,
);
```

copied to clipboard

### Two-Page Layout [\#](https://pub.dev/packages/qcf_quran_plus\#two-page-layout)

On wide screens, the package can render two Mushaf pages side-by-side:

```dart
QuranPageView(
  pageController: _controller,
  highlights: _activeHighlights,
  isDarkMode: false,
  isTajweed: true,
  enableTwoPageLayout: true,
);
```

copied to clipboard

The widget keeps the two-page controller synchronized with the external `PageController`.

### Deferred Page Construction [\#](https://pub.dev/packages/qcf_quran_plus\#deferred-page-construction)

`QuranPageView` supports deferred page construction to improve performance during rapid page navigation.

When enabled, newly appearing Quran pages are not fully built while the user is actively swiping. Their content is rendered after scrolling has settled.

This can reduce unnecessary page construction and help keep page navigation smooth, especially on devices where Quran page rendering is relatively expensive.

The feature is enabled by default:

```dart
QuranPageView(
  pageController: _controller,
  highlights: _activeHighlights,
  isDarkMode: false,
  deferNewPages: true,
  deferDelay: const Duration(milliseconds: 50),
);
```

copied to clipboard

#### `deferNewPages`

Controls whether newly appearing pages should defer their content construction while the user is scrolling.

```dart
deferNewPages: true,
```

copied to clipboard

When `true`, pages that appear during an active swipe are temporarily kept lightweight. Their Quran content is built after scrolling has settled.

The currently displayed page remains available while navigating.

The default value is:

```dart
true
```

copied to clipboard

To disable deferred page construction and build pages immediately:

```dart
QuranPageView(
  pageController: _controller,
  highlights: _activeHighlights,
  isDarkMode: false,
  deferNewPages: false,
);
```

copied to clipboard

You can also change this value at runtime.

* * *

#### `deferDelay`

Controls how long `QuranPageView` waits after scrolling ends before deferred page content is built.

The default value is:

```dart
const Duration(milliseconds: 50)
```

copied to clipboard

Example:

```dart
QuranPageView(
  pageController: _controller,
  highlights: _activeHighlights,
  isDarkMode: false,
  deferNewPages: true,
  deferDelay: const Duration(milliseconds: 50),
);
```

copied to clipboard

You can increase the delay if you want to wait longer before constructing pages after a swipe:

```dart
QuranPageView(
  pageController: _controller,
  highlights: _activeHighlights,
  isDarkMode: false,
  deferNewPages: true,
  deferDelay: const Duration(milliseconds: 100),
);
```

copied to clipboard

If the user starts another swipe before `deferDelay` finishes, the pending page build is cancelled and the delay starts again after the new scrolling operation ends.

This prevents pages from being unnecessarily constructed while the user is rapidly flipping through multiple Quran pages.

`deferDelay` is only used when:

```dart
deferNewPages: true
```

copied to clipboard

## The deferred page construction optimization works with both the single-page and two-page layouts. [\#](https://pub.dev/packages/qcf_quran_plus\#the-deferred-page-construction-optimization-works-with-both-the-single-page-and-two-page-layouts)

## 🧩 Mushaf Customization [\#](https://pub.dev/packages/qcf_quran_plus\#-mushaf-customization)

`QuranPageView` supports custom builders for integrating Quran pages into your own application UI.

### Top Bar [\#](https://pub.dev/packages/qcf_quran_plus\#top-bar)

```dart
QuranPageView(
  pageController: _controller,
  highlights: _activeHighlights,
  isDarkMode: false,
  topBar: const SizedBox(
    height: 50,
    child: Center(
      child: Text('Quran'),
    ),
  ),
);
```

copied to clipboard

### Bottom Bar [\#](https://pub.dev/packages/qcf_quran_plus\#bottom-bar)

```dart
QuranPageView(
  pageController: _controller,
  highlights: _activeHighlights,
  isDarkMode: false,
  bottomBar: const SizedBox(
    height: 60,
    child: Center(
      child: Text('Player'),
    ),
  ),
);
```

copied to clipboard

### Page Header [\#](https://pub.dev/packages/qcf_quran_plus\#page-header)

```dart
QuranPageView(
  pageController: _controller,
  highlights: _activeHighlights,
  isDarkMode: false,
  pageHeaderBuilder: (context, pageNumber) {
    return Text('Page $pageNumber');
  },
);
```

copied to clipboard

### Custom Surah Header [\#](https://pub.dev/packages/qcf_quran_plus\#custom-surah-header)

```dart
QuranPageView(
  pageController: _controller,
  highlights: _activeHighlights,
  isDarkMode: false,
  surahHeaderBuilder: (context, surahNumber) {
    return Text(
      getSurahNameArabic(surahNumber),
      style: const TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.bold,
      ),
    );
  },
);
```

copied to clipboard

### Custom Basmallah [\#](https://pub.dev/packages/qcf_quran_plus\#custom-basmallah)

```dart
QuranPageView(
  pageController: _controller,
  highlights: _activeHighlights,
  isDarkMode: false,
  basmallahBuilder: (context, surahNumber) {
    return const Text(
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    );
  },
);
```

copied to clipboard

### Custom Text Style [\#](https://pub.dev/packages/qcf_quran_plus\#custom-text-style)

`ayahStyle` is available when you intentionally want to override the package's default Quran text style:

```dart
QuranPageView(
  pageController: _controller,
  highlights: _activeHighlights,
  isDarkMode: false,
  ayahStyle: const TextStyle(
    fontSize: 42,
  ),
);
```

copied to clipboard

Because `ayahStyle` overrides the default QCF style, use it carefully when relying on page-specific QCF font selection.

### Background [\#](https://pub.dev/packages/qcf_quran_plus\#background)

```dart
QuranPageView(
  pageController: _controller,
  highlights: _activeHighlights,
  isDarkMode: false,
  pageBackgroundColor: const Color(0xFFFBF6EE),
);
```

copied to clipboard

* * *

## 📜 Vertical Surah List Mode [\#](https://pub.dev/packages/qcf_quran_plus\#-vertical-surah-list-mode)

Use `QuranSurahListView` for continuous Surah reading.

This mode is especially useful for:

- Tafsir
- Translation
- Audio players
- Memorization
- Word-level interactions
- Custom Ayah cards
- Teaching interfaces

```dart
final ItemScrollController _itemScrollController =
    ItemScrollController();

final List<HighlightVerse> _highlights = [];

QuranSurahListView(
  surahNumber: 1,
  itemScrollController: _itemScrollController,
  highlights: _highlights,
  fontSize: 25,
  isTajweed: true,
  isDarkMode: Theme.of(context).brightness == Brightness.dark,
);
```

copied to clipboard

* * *

## 🎨 Fully Customizable Ayah Cards [\#](https://pub.dev/packages/qcf_quran_plus\#-fully-customizable-ayah-cards)

`QuranSurahListView` exposes `ayahBuilder` with all important Ayah information.

```dart
QuranSurahListView(
  surahNumber: 2,
  highlights: _highlights,
  fontSize: 25,
  isTajweed: true,
  isDarkMode: false,
  ayahBuilder: (
    context,
    surahNumber,
    verseNumber,
    pageNumber,
    ayahWidget,
    isHighlighted,
    highlightColor,
  ) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isHighlighted
            ? highlightColor.withValues(alpha: 0.15)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [\
          Text(\
            'Ayah $verseNumber • Page $pageNumber',\
            style: const TextStyle(\
              color: Colors.grey,\
            ),\
          ),\
          const SizedBox(height: 8),\
          ayahWidget,\
        ],
      ),
    );
  },
);
```

copied to clipboard

The builder receives:

```text
BuildContext
surahNumber
verseNumber
pageNumber
ayahWidget
isHighlighted
highlightColor
```

copied to clipboard

This lets you build your own:

- Audio controls
- Bookmark buttons
- Translation containers
- Tafsir cards
- Recitation feedback
- Memorization UI
- Ayah statistics

* * *

## 🔎 Smart Offline Arabic Search [\#](https://pub.dev/packages/qcf_quran_plus\#-smart-offline-arabic-search)

The package includes a lightweight Quran search engine.

### Normalize User Input [\#](https://pub.dev/packages/qcf_quran_plus\#normalize-user-input)

```dart
final query = normalise('الرحمن');
```

copied to clipboard

### Search [\#](https://pub.dev/packages/qcf_quran_plus\#search)

```dart
final results = searchWords(query);

debugPrint(
  'Matches: ${results['occurences']}',
);

for (final match in results['result']) {
  final surah = match['sora'];
  final ayah = match['aya_no'];
  final text = match['text'];

  debugPrint(
    '${getSurahNameArabic(surah)} : $ayah => $text',
  );
}
```

copied to clipboard

The search engine supports:

- Diacritic-insensitive matching
- Arabic normalization
- Alef normalization
- Ya normalization
- Hamza/Alef variants normalization
- Whitespace normalization
- Search without depending on network requests
- Emlaey search first
- Othmanic fallback when no Emlaey match exists
- Configurable result limit

Example:

```dart
final results = searchWords(
  'وتلك حدود',
  limit: 20,
);
```

copied to clipboard

The search logic can match phrases after removing spaces and standardizing Arabic forms.

* * *

## 🧹 Text Normalization Helpers [\#](https://pub.dev/packages/qcf_quran_plus\#-text-normalization-helpers)

### `normalise` [\#](https://pub.dev/packages/qcf_quran_plus\#normalise)

General Quran-oriented normalization:

```dart
final cleaned = normalise(text);
```

copied to clipboard

It removes Quranic annotation characters and common Arabic variants before comparison.

### `normalizeArabicText` [\#](https://pub.dev/packages/qcf_quran_plus\#normalizearabictext)

The package also exposes:

```dart
final cleaned = normalizeArabicText(text);
```

copied to clipboard

This normalization removes basic Arabic diacritics and standardizes selected Arabic letter forms.

### `removeDiacritics` [\#](https://pub.dev/packages/qcf_quran_plus\#removediacritics)

For lightweight diacritic removal:

```dart
final cleaned = removeDiacritics(text);
```

copied to clipboard

This is useful for:

- Search
- Comparison
- Matching user input
- Simplified text processing

* * *

## 📊 Quran Statistics & Constants [\#](https://pub.dev/packages/qcf_quran_plus\#-quran-statistics--constants)

The package exposes common Quran constants:

```dart
totalPagesCount;   // 604
totalSurahCount;   // 114
totalVerseCount;   // 6236
totalJuzCount;     // 30

totalMakkiSurahs;  // 89
totalMadaniSurahs; // 25
```

copied to clipboard

* * *

## 🧭 Page & Surah Metadata [\#](https://pub.dev/packages/qcf_quran_plus\#-page--surah-metadata)

### Get Page Data [\#](https://pub.dev/packages/qcf_quran_plus\#get-page-data)

```dart
final data = getPageData(42);
```

copied to clipboard

### Surah Count on a Page [\#](https://pub.dev/packages/qcf_quran_plus\#surah-count-on-a-page)

```dart
final count = getSurahCountByPage(42);
```

copied to clipboard

### Ayah Count on a Page [\#](https://pub.dev/packages/qcf_quran_plus\#ayah-count-on-a-page)

```dart
final count = getVerseCountByPage(42);
```

copied to clipboard

### Get Surah Names [\#](https://pub.dev/packages/qcf_quran_plus\#get-surah-names)

```dart
getSurahName(1);        // Transliteration/name
getSurahNameEnglish(1); // English
getSurahNameArabic(1);  // Arabic
```

copied to clipboard

### Revelation Place [\#](https://pub.dev/packages/qcf_quran_plus\#revelation-place)

```dart
getPlaceOfRevelation(1); // Makkah or Madinah
```

copied to clipboard

### Verse Count [\#](https://pub.dev/packages/qcf_quran_plus\#verse-count)

```dart
getVerseCount(1); // Number of Ayahs in the Surah
```

copied to clipboard

* * *

## 📍 Quran Location Helpers [\#](https://pub.dev/packages/qcf_quran_plus\#-quran-location-helpers)

### Find the Page of an Ayah [\#](https://pub.dev/packages/qcf_quran_plus\#find-the-page-of-an-ayah)

```dart
final page = getPageNumber(2, 255);
```

copied to clipboard

### Find the Juz [\#](https://pub.dev/packages/qcf_quran_plus\#find-the-juz)

```dart
final juz = getJuzNumber(2, 255);
```

copied to clipboard

### Find the Quarter [\#](https://pub.dev/packages/qcf_quran_plus\#find-the-quarter)

```dart
final quarter = getQuarterNumber(2, 255);
```

copied to clipboard

These helpers make it easy to build:

- Ayah details dialogs
- Audio players
- Bookmarks
- Search result navigation
- Memorization navigation
- Tafsir navigation

* * *

## 🕌 Hizb & Quarter Helpers [\#](https://pub.dev/packages/qcf_quran_plus\#-hizb--quarter-helpers)

### Show Only When a New Quarter Starts on the Page [\#](https://pub.dev/packages/qcf_quran_plus\#show-only-when-a-new-quarter-starts-on-the-page)

```dart
final text = getHizbTextByPage(
  42,
  isArabic: true,
);
```

copied to clipboard

Returns an empty string when no new quarter starts exactly on that page.

### Get the Current Hizb/Quarter for a Page [\#](https://pub.dev/packages/qcf_quran_plus\#get-the-current-hizbquarter-for-a-page)

```dart
final text = getCurrentHizbTextForPage(
  42,
  isArabic: true,
);
```

copied to clipboard

Unlike the exact-page helper, this also resolves the currently active quarter when it started on a previous page.

English output is available:

```dart
getCurrentHizbTextForPage(
  42,
  isArabic: false,
);
```

copied to clipboard

* * *

## 📖 Verse Text Helpers [\#](https://pub.dev/packages/qcf_quran_plus\#-verse-text-helpers)

### Get Verse Text [\#](https://pub.dev/packages/qcf_quran_plus\#get-verse-text)

```dart
final verse = getVerse(2, 255);
```

copied to clipboard

### Get Verse-End Symbol [\#](https://pub.dev/packages/qcf_quran_plus\#get-verse-end-symbol)

```dart
final symbol = getVerseEndSymbol(
  255,
  arabicNumeral: true,
);
```

copied to clipboard

### Get the QCF Ayah Glyph [\#](https://pub.dev/packages/qcf_quran_plus\#get-the-qcf-ayah-glyph)

```dart
final glyph = getAyaNoQCFLite(
  2,
  255,
);
```

copied to clipboard

### Cached QCF Ayah Glyph Lookup [\#](https://pub.dev/packages/qcf_quran_plus\#cached-qcf-ayah-glyph-lookup)

```dart
final glyph = getaya_noQCF(
  2,
  255,
);
```

copied to clipboard

`getaya_noQCF` keeps an internal cache so repeated Ayah-ending glyph lookups do not repeatedly scan the Quran dataset.

* * *

## 🚀 Font Initialization [\#](https://pub.dev/packages/qcf_quran_plus\#-font-initialization)

For the smoothest first render, initialize QCF fonts before entering the Quran screen.

```dart
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _initializeFonts();
  }

  Future<void> _initializeFonts() async {
    await QcfFontLoader.setupFontsAtStartup(
      onProgress: (progress) {
        debugPrint(
          'Font loading: ${(progress * 100).toStringAsFixed(1)}%',
        );
      },
    );

    if (!mounted) return;

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => const QuranScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}
```

copied to clipboard

The font loader exposes page preloading as well:

```dart
QcfFontLoader.preloadPages(
  42,
  radius: 3,
);
```

copied to clipboard

You can use this when changing pages or building your own advanced Quran navigation flow.

* * *

## 📦 Installation [\#](https://pub.dev/packages/qcf_quran_plus\#-installation)

Add the package to `pubspec.yaml`:

```yaml
dependencies:
  qcf_quran_plus: ^latest_version
  scrollable_positioned_list: ^0.3.8
```

copied to clipboard

Then:

```bash
flutter pub get
```

copied to clipboard

Import:

```dart
import 'package:qcf_quran_plus/qcf_quran_plus.dart';
```

copied to clipboard

* * *

## 🧩 Public API Overview [\#](https://pub.dev/packages/qcf_quran_plus\#-public-api-overview)

### Widgets [\#](https://pub.dev/packages/qcf_quran_plus\#widgets)

```dart
QuranPageView
QuranSurahListView
```

copied to clipboard

### Models [\#](https://pub.dev/packages/qcf_quran_plus\#models)

```dart
HighlightVerse
WordHighlight
Ayah
QuranPage
Surah
```

copied to clipboard

### Quran Data [\#](https://pub.dev/packages/qcf_quran_plus\#quran-data)

```dart
quran
pageData
suwar
juz
quarters
```

copied to clipboard

### Utilities [\#](https://pub.dev/packages/qcf_quran_plus\#utilities)

```dart
QuranTextStyles
QcfFontLoader
```

copied to clipboard

### Search & Normalization [\#](https://pub.dev/packages/qcf_quran_plus\#search--normalization)

```dart
searchWords
normalise
normalizeArabicText
removeDiacritics
```

copied to clipboard

### Metadata [\#](https://pub.dev/packages/qcf_quran_plus\#metadata)

```dart
getPageData
getSurahCountByPage
getVerseCountByPage
getSurahName
getSurahNameEnglish
getSurahNameArabic
getPlaceOfRevelation
getVerseCount
getPageNumber
getJuzNumber
getQuarterNumber
getHizbTextByPage
getCurrentHizbTextForPage
```

copied to clipboard

### Verse Helpers [\#](https://pub.dev/packages/qcf_quran_plus\#verse-helpers)

```dart
getVerse
getVerseEndSymbol
getAyaNoQCFLite
getaya_noQCF
```

copied to clipboard

* * *

## 🏗️ Typical Application Architecture [\#](https://pub.dev/packages/qcf_quran_plus\#-typical-application-architecture)

`qcf_quran_plus` is designed to fit into common Flutter architectures.

You can keep Quran UI state in:

- `setState`
- `Bloc / Cubit`
- `Provider`
- `Riverpod`
- Any other state-management solution

For example:

```dart
class QuranController extends ChangeNotifier {
  List<HighlightVerse> highlights = [];

  void highlightAyah({
    required int surah,
    required int ayah,
    required int page,
    required Color color,
  }) {
    highlights = [\
      ...highlights,\
      HighlightVerse(\
        surah: surah,\
        verseNumber: ayah,\
        page: page,\
        color: color,\
      ),\
    ];

    notifyListeners();
  }
}
```

copied to clipboard

Then pass the current state directly to the Quran widget.

* * *

## ⚡ Performance Recommendations [\#](https://pub.dev/packages/qcf_quran_plus\#-performance-recommendations)

### 1\. Initialize Fonts Early [\#](https://pub.dev/packages/qcf_quran_plus\#1-initialize-fonts-early)

Use:

```dart
QcfFontLoader.setupFontsAtStartup(...)
```

copied to clipboard

during splash/loading.

when implementing custom navigation or page tracking.

### 3\. Keep Highlight State External [\#](https://pub.dev/packages/qcf_quran_plus\#3-keep-highlight-state-external)

Store `HighlightVerse` and `WordHighlight` in your application state and update them as needed.

### 4\. Let the Package Control QCF Styling [\#](https://pub.dev/packages/qcf_quran_plus\#4-let-the-package-control-qcf-styling)

For authentic Mushaf rendering, prefer:

```dart
isTajweed: true,
isDarkMode: isDark,
```

copied to clipboard

without replacing `ayahStyle` unless you specifically need a custom text style.

### 5\. Use `getaya_noQCF` for Repeated Glyph Lookups [\#](https://pub.dev/packages/qcf_quran_plus\#5-use-getaya_noqcf-for-repeated-glyph-lookups)

Its internal cache is useful when rendering large Ayah lists.

* * *

## 🧱 Built For [\#](https://pub.dev/packages/qcf_quran_plus\#-built-for)

`qcf_quran_plus` is suitable for:

- 📖 Quran reading applications
- 🧠 Quran memorization applications
- 🎧 Audio-synced Quran players
- 🗣️ Recitation and pronunciation tools
- 🎨 Tajweed learning interfaces
- 🔍 Quran search applications
- 📚 Tafsir applications
- 🌍 Quran translation interfaces
- 📊 Quran statistics and metadata screens
- 🕌 Islamic educational applications

* * *

## 📄 License [\#](https://pub.dev/packages/qcf_quran_plus\#-license)

Distributed under the **MIT License**.

See `LICENSE` for more information.

* * *

## ❤️ Made for Serious Quran Applications [\#](https://pub.dev/packages/qcf_quran_plus\#-made-for-serious-quran-applications)

`qcf_quran_plus` combines an authentic page-based Mushaf renderer with a flexible vertical reader, interactive Ayah and word highlighting, offline Arabic search, metadata helpers, and a performance-oriented QCF font engine.

Built with Flutter for developers who want to focus on their Quran application instead of rebuilding the Quran rendering layer from scratch.

### ← Metadata

[26\\
\\
likes\\
\\
160\\
\\
points\\
\\
3.62k\\
\\
downloads](https://pub.dev/packages/qcf_quran_plus/score)

### Documentation

[API reference](https://pub.dev/documentation/qcf_quran_plus/latest/)

### Publisher

unverified uploader

### Weekly Downloads

2025.11.17 - 2026.10.12

### Metadata

offline Quran package with Hafs font and have tajweed.

[Homepage](https://github.com/hussein12347/qcf_quran_plus/?tab=readme-ov-file)

[Repository (GitHub)](https://github.com/hussein12347/qcf_quran_plus)

[View/report issues](https://github.com/hussein12347/qcf_quran_plus/issues)

### License

![](https://pub.dev/static/hash-n31r4ser/img/material-icon-balance.svg)MIT ( [license](https://pub.dev/packages/qcf_quran_plus/license))

### Dependencies

[archive](https://pub.dev/packages/archive "^4.0.9"), [flutter](https://api.flutter.dev/), [path\_provider](https://pub.dev/packages/path_provider "^2.1.5"), [scrollable\_positioned\_list](https://pub.dev/packages/scrollable_positioned_list "^0.3.8")

### More

[Packages that depend on qcf\_quran\_plus](https://pub.dev/packages?q=dependency%3Aqcf_quran_plus)

Back

![previous](https://pub.dev/static/hash-n31r4ser/img/keyboard_arrow_left.svg)

![next](https://pub.dev/static/hash-n31r4ser/img/keyboard_arrow_right.svg)