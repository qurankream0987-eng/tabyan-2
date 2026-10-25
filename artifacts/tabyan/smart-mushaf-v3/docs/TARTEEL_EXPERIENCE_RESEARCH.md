# Tarteel Experience Benchmark — Product Research & Analysis
**Document Version:** 1.0.0  
**Research Date:** October 2026  
**Source Material:** Public official Tarteel documentation (tarteel.ai), Apple App Store & Google Play product descriptions, public feature walkthroughs, and user experience demonstrations.  
**Constraint:** Zero proprietary code or assets copied. Analysis is strictly conceptual and focused on product experience, visual hierarchy, and interaction design.

---

## 1. Verified Features (Public Evidence)

1. **The Quran Page is the Primary Interface:**
   - The Mushaf text occupies >80% of the screen.
   - When opened, the app presents the Quran text immediately without intermediate dashboard cards, landing banners, or complex setup screens.
2. **Automated Memorization Mode ("Hide & Reveal"):**
   - Unrecited Quran words are masked/hidden in place.
   - As the user recites aloud, the speech engine identifies correctly recited words and reveals them progressively.
   - The visual geometry of the text remains invariant: words do not collapse to 0px, avoiding distracting line reflows.
3. **Restrained Mistake Highlighting:**
   - When an articulatory mistake, skipped word, or wrong *tashkeel* occurs, the word is highlighted with a restrained indicator (e.g. subtle reddish or amber tint/underline).
   - Tapping on a flagged word opens an inline tooltip showing the expected canonical word.
4. **Ergonomic Assistance (Hints):**
   - Single-tap hint: Unmasks the immediate next word.
   - Double hint: Unmasks the remainder of the current *ayah*.
5. **Thumb-Zone Centered Controls:**
   - Controls are concentrated in the lower 15% of the mobile screen: a central microphone button flanked by hint triggers and session end actions.
6. **Adaptive Script Selection & Calm Presentation:**
   - Clean classical Arabic typography with ample line-height (`leading-[3rem]` to `[4rem]`) and breathing room.
   - Zero intrusive AI status labels or telemetry in the student view.

---

## 2. Verified User Flows

```
[Open Mushaf]
     │
     ▼ (Immediate Quran text visible)
[Tap Floating Mic Action]
     │
     ▼ (Words in scope smoothly blur/obscure in place — no line reflow)
[Student Begins Recitation]
     │
     ├─► [Word Recited Correctly]  ──► Revealed smoothly in ink, next word highlighted
     ├─► [Student Pauses]           ──► System remains patient at current active word
     ├─► [Student Repeats Phrase]  ──► Repetition acknowledged, no penalty
     ├─► [Student Skips Word]      ──► Gentle skipped indicator flagged, moves forward
     ├─► [Student Stuck]           ──► Taps "Reveal Word" hint (unmasks 1 word)
     │
     ▼ (Student Taps Finish / Complete)
[Session Summary Sheet]
     │
     └─► Accuracy %, words confirmed, skipped words, reviewable mistake list
```

---

## 3. Verified Memorization UX & Layout Invariance

- **No Layout Collapse:** A critical finding from Tarteel's UX is that masking words using `display: none` or collapsing margins completely breaks the student's spatial memory. Tarteel preserves the physical character footprint (using CSS opacity/blur filters or typographic glyph masks) so that the line breaks and paragraph flow remain identical whether words are hidden or visible.
- **Subtle Active Focus:** The active word is accented with a gentle contrast ring or soft gold glow, never aggressive blinking or strobe animations.

---

## 4. Unknown / Not Publicly Verified Internals

- The exact internal acoustic model architecture and proprietary neural network weights used by Tarteel are private.
- The precise millisecond debounce intervals for speech end-pointing are proprietary.
- **Tabyan's stance:** Tabyan uses its own independent normalization, canonical `WordKey` mapping, and `ObservationStabilizer` engine with Nabr / Qurani.ai QRC as the neutral speech intelligence provider.

---

## 5. Lessons for Tabyan Smart Mushaf

1. **Make the Quran the Hero:** Remove all extraneous secondary headers and banners while reciting. The student should feel they are holding a traditional sacred Mushaf that has subtle live intelligence.
2. **Zero Layout Reflow:** Ensure `QuranWordSpan` retains its exact width and height when in `'HIDDEN'` state.
3. **Thumb-Reach Affordances:** Primary microphone toggle and 1-tap hint controls must be comfortably reachable with one thumb at 390x844.
4. **Calm Islamic Aesthetic:** Tabyan's deep burgundy (`#4A0E17`), muted gold (`#C5A059`), and warm ivory (`#FAF6EE`) provide an authentic, reverent aesthetic distinct from generic modern SaaS apps.
