# Tabyan vs Tarteel — Experience Gap Matrix
**Document Version:** 1.0.0  
**Status:** Architecture & Experience Benchmark  

---

| Capability | Tarteel Public Behavior / Evidence | Current Tabyan Implementation | Gap | Required Action / Status |
| :--- | :--- | :--- | :--- | :--- |
| **Quran Reading** | Immediate Medina/Indo-Pak script display with generous line-height and classical ornaments. | `MushafRenderer` with `Amiri Quran`, `Amiri`, `Scheherazade New`, and `Noto Naskh Arabic`. | None in visual clarity; Tabyan uses classical Islamic Surah frames. | **TARGET ACHIEVED** |
| **Navigation** | Drawer & modal selector for Surahs, Juz, and Pages. | `NavigationModal` supporting all 114 Surahs, 30 Juz, and 604 Pages with quick search. | None. | **TARGET ACHIEVED** |
| **Tasmee (Hide/Reveal)** | Unrecited words masked in place without collapsing width; revealed word-by-word on recitation confirmation. | `SmartWordState` with `'HIDDEN'` using `filter: blur(5px); opacity: 0.25; user-select: none`. Geometry completely preserved. | Ensure word span never shrinks or shifts layout during state change. | **TARGET ACHIEVED (VERIFIED IN RC1)** |
| **Current-Word Tracking** | Subtle indicator on the expected word to guide the reciter. | `'CURRENT'` state applies gold ring (`ring-1 ring-[#C5A059]/50`) and soft gold background. | None. Non-blinking and restrained. | **TARGET ACHIEVED** |
| **Skip Handling** | Detected skipped words flagged with restrained indicator; allows student to continue. | `ObservationStabilizer` detects jumps $\le 8$ words and marks intermediate words as `'SKIPPED'`. | None. Handled in domain state without error penalties. | **TARGET ACHIEVED** |
| **Repetition Handling** | Student repeating words/phrases is acknowledged without throwing red errors. | `ObservationStabilizer` detects backward confirmation within window and marks `'REPEATED'`. | None. Non-punitive repetition policy. | **TARGET ACHIEVED** |
| **Hints** | 1-tap for next word, 2-tap for remaining ayah. | Dedicated buttons in `TasmeeControlBar`: "كشف كلمة" and "كشف الآية". | Keep buttons directly adjacent to mic button for thumb reach. | **TARGET ACHIEVED** |
| **Recitation Correction** | Real-time follow mode with word-level error highlighting. | `'CORRECTION'` mode tracking live confirmed positions with `CorrectionBanner`. | Provider recognition is simulated via `MockNabrProvider` until Replit backend connects live Nabr. | **MOCK VERIFIED / READY FOR REPLIT** |
| **Tajweed & Letter Feedback** | Flags pronunciation and rule mistakes at word-level. | `ConfirmedMistake` holds rule name and Arabic explanation; renders wavy underline + tooltip. | Live acoustic recognition requires Replit server-side Nabr key. | **UI READY / DETECTION NOT LIVE VERIFIED** |
| **Session Results** | Summary modal showing accuracy %, duration, and mistake breakdown. | `SessionSummaryModal` displays accuracy score, confirmed words, skipped words, and reviewable notes. | None. Clean unboxed typography. | **TARGET ACHIEVED** |
| **Mobile Thumb Ergonomics** | Floating mic button anchored in bottom 15% thumb zone. | Fixed bottom control bar (`max-w-xl`, touch hitboxes $\ge 44\text{px}$, aggregate height $< 15\%$). | None. | **TARGET ACHIEVED** |
| **Performance** | Instantaneous word-level feedback without full-screen re-renders. | `QuranWordSpan` uses custom `React.memo` comparator on `state` and `mistake`. | Re-renders strictly confined to changed word spans. | **TARGET ACHIEVED** |
| **Dark Mode** | Deep, non-inverted nocturnal palette preserving contrast. | Authentic dark theme: `#170F11` (dark obsidian-burgundy) with `#EAD8C7` warm ivory text and gold accents. | None. Pure WCAG AA contrast. | **TARGET ACHIEVED** |
