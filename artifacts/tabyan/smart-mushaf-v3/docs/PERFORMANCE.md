# Tabyan Smart Mushaf — Performance Architecture & Benchmark
**Document Version:** 1.0.0  

---

## 1. Zero Entire-Quran Render Rule
- The app renders strictly the active Surah or Page Ayahs.
- Entire Quran (6,236 Ayahs, 77,430+ Words) is NEVER rendered in a single monolithic DOM tree.
- Lazy Surah and Page loading with in-memory caching in `TanzilQuranProvider`.

## 2. Targeted Word-State Updates
- `QuranWordSpan` uses custom `React.memo` comparator checking only `state`, `mistake`, `showTajweedColors`, and `key`.
- Mutating a single word state (e.g. from `CURRENT` to `CONFIRMED`) updates ONLY that individual span in the DOM, preventing full-screen re-renders.

## 3. Audio & Memory Budgets
- Audio downsampling uses single-pass linear interpolation in `AudioCaptureService`.
- Buffering maintains a fixed 3,200 sample window (200ms) with zero memory leaks.
- All event listeners, timers, and Web Audio nodes are systematically cleaned up on session stop.
