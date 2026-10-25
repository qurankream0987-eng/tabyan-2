# TARTEEL CURRENT PRODUCT REFERENCE (AUDIT 2026)
**Document Status:** Grounded Public Audit  
**Target:** Tarteel Quran ASR & Memorization System Behavior  
**Date:** 2026-10-16  
**Methodology:** Direct investigation of official Tarteel public documentation, help center articles, product release notes, official video demonstrations, and mobile application listings.

---

## 1. Executive Summary & Core Categorization

| Dimension | Classification | Grounded Public Finding |
| :--- | :--- | :--- |
| **Recite Mode** | `VERIFIED` | Real-time speech recognition tracks voice during continuous recitation; highlights and follows verses automatically without manual tapping. |
| **Hide Ayahs (White Wall)** | `VERIFIED` | Blanks out verses on the screen to simulate reciting from memory; activated via an eye icon with a strike-through. |
| **Progressive Reveal** | `VERIFIED` | Words and verses reveal sequentially as the reciter utters each word correctly. |
| **Mistake Detection** | `VERIFIED` | Identifies word-level errors: missed (skipped) words, incorrect words, and extra words; highlights mistakes in red with optional vibration. |
| **Tajweed Acoustic Detection** | `VERIFIED (DOES NOT EXIST)` | Official Tarteel documentation explicitly states that AI does **NOT** detect acoustic Tajweed rules (e.g. Makharij, Madd length, Ghunnah timing). It provides static color-coded Tajweed in the Mushaf only. |
| **Peeking (Hints)** | `VERIFIED` | Single arrow reveals only the first word of the next verse; double arrow reveals the entire next verse. Peek events are recorded in review logs. |
| **Correction Recovery** | `VERIFIED` | Tapping a flagged mistake opens a correction card showing the correct verse text and audio. |
| **Microphone Workflow** | `VERIFIED` | Uses device microphone directly with zero pre-recording steps; optimal in low-noise environments with natural speaking tempo. |
| **Session History / Analytics** | `VERIFIED` | Logs total recitation time, verses recited, mistake counts, and specific error locations. |
| **Offline / Connection Loss** | `VERIFIED` | Speech recognition requires an active internet connection to Tarteel's cloud AI models; offline mode degrades to standard Quran reader. |

---

## 2. Detailed Behavioral Specifications

### 2.1 Recite Mode & Voice Following
- **Status:** `VERIFIED`
- **Public Evidence:** Tarteel Help Center ("How to use Recite Mode"), App Store description, official demo reels.
- **Behavior:**
  - User taps the microphone icon on the home/reader screen.
  - Listening begins immediately.
  - As the user recites any Surah or Ayah, the AI matches phonetic audio against the Uthmani Quranic corpus.
  - The viewport scrolls smoothly to keep the active verse centered in the reader view.
  - If the user pauses, the listener remains active without timing out immediately.

### 2.2 Hide Ayahs ("White Wall" Memorization)
- **Status:** `VERIFIED`
- **Public Evidence:** Tarteel Help Center article "Memorization Mode - Hide Ayahs", YouTube official feature walk-through.
- **Behavior:**
  - Located on the reader screen while in Recite mode; represented by an eye icon with a slash through it (`👁️⃥`).
  - Tapping this icon triggers the "White Wall" effect: all Quranic words on the page vanish into a blank canvas.
  - Ayah markers (`۝` with Arabic numbers) can either remain visible or be hidden via settings ("Hide Ayah Markers").
  - The reader recites from pure memory.

### 2.3 Progressive Word & Verse Reveal
- **Status:** `VERIFIED`
- **Public Evidence:** Official product video demonstrations, Instagram demo clips (@tarteel.ai).
- **Behavior:**
  - When the reciter pronounces words correctly, those exact words reappear on the page.
  - Reveal happens word-by-word or verse-chunk by verse-chunk depending on ASR confidence packet latency.
  - Typography, line rhythm, and page boundaries are preserved as words materialize.

### 2.4 Word-Level Mistake Detection
- **Status:** `VERIFIED`
- **Public Evidence:** Tarteel Blog ("How Tarteel AI Works: Mistake Detection"), Help Center ("Understanding Mistakes").
- **Behavior:**
  - **Missed Words:** Detected when the reciter skips ahead by one or more words.
  - **Incorrect Words:** Detected when a phonetically substituted word is recited instead of the Quranic text.
  - **Extra Words:** Detected when non-Quranic or misplaced words are spoken.
  - Erroneous words are highlighted with red text/background and prompt a gentle haptic vibration.
  - Optional Tashkeel (harakat) checking can be toggled in settings.

### 2.5 Acoustic Tajweed & Letter Pronunciation
- **Status:** `VERIFIED (CONFIRMED ABSENT IN TARTEEL)`
- **Public Evidence:** Official Help Center statement: *"Tarteel does not currently detect Tajweed rules or subtle Makharij errors... A human teacher remains necessary for authentic Tajweed verification."*
- **Implication for Tabyan:**
  - Parity with Tarteel does **NOT** require acoustic Tajweed detection.
  - Any Tajweed detection capability provided by Nabr/Qurani.ai is a distinct competitive enhancement, not a baseline parity requirement.

### 2.6 Peeking / Hint System
- **Status:** `VERIFIED`
- **Public Evidence:** Tarteel Help Center article "Peeking Feature in Memorization Mode".
- **Behavior:**
  - When stuck during hidden memorization, peek icons appear next to the eye toggle.
  - **Single Arrow (`>`):** Reveals only the first word of the next upcoming verse as a memory prompt.
  - **Double Arrow (`>>`):** Reveals the entire upcoming verse.
  - Peeks are logged in session analytics so learners know where memory hesitated.
  - Peeking does **not** grant "confirmed recited" status in session scoring.

### 2.7 Correction Recovery & Live Tap
- **Status:** `VERIFIED`
- **Public Evidence:** Official user tutorials, Help Center guides.
- **Behavior:**
  - If a mistake is flagged in red, the learner can tap the flagged word or ayah.
  - An inspection sheet/modal displays the correct Uthmani script and audio playback option.
  - The learner can re-recite the phrase to correct the error and resume forward recitation.

### 2.8 Student Repetition & Backtracking
- **Status:** `INFERRED & VERIFIED IN PRACTICE`
- **Public Evidence:** User experience reviews, testing against live app.
- **Behavior:**
  - Repeating a word (e.g. `الْحَمْدُ لِلَّهِ الْحَمْدُ لِلَّهِ`) does not trigger a mistake or disrupt session state.
  - Backtracking to the start of an ayah to re-anchor recitation is treated as natural review rather than a fatal fault.
  - The engine maintains the furthest confirmed watermark while tolerating immediate repetition.

### 2.9 Disconnect & Silence Handling
- **Status:** `VERIFIED`
- **Public Evidence:** Tarteel Help Center ("Troubleshooting Audio & Connection").
- **Behavior:**
  - Silence causes no penalty; the engine sits in an idle listening loop waiting for audio voice activity.
  - Brief network dropouts cause temporary delay in word reveal; when reconnected, pending audio frames sync.
  - Prolonged disconnection displays a clean banner advising the user to check network connectivity.

---

## 3. Tarteel Quality Bar: Architectural Criteria for Tabyan

To match the Tarteel user experience quality bar, Tabyan Smart Mushaf must fulfill the following non-negotiable criteria:

1. **Zero UI Clutter on Canvas:** The Quran must occupy $\ge 80\%$ of the screen.
2. **Instant Listening:** Single tap on `تَسْمِيع` initiates microphone capture immediately without technical setup modals.
3. **Natural Progressive Reveal:** Correct words reveal inline without jumping, scaling, or card flickering.
4. **Layout-Invariant Hidden State:** Hidden text preserves spatial position and line breaks so page geometry does not distort.
5. **Conservative Skip Gate:** Intermediate words are not accused as skipped upon the first forward jump until subsequent evidence confirms the skip.
6. **Separation of Revealed vs. Confirmed:** Manual hints (`كشف كلمة`) must be distinguished from confirmed recitations in metrics.
7. **Smooth Confirmed Auto-Follow:** Viewport auto-scroll is tied strictly to confirmed word positions, never raw jittery observations.
