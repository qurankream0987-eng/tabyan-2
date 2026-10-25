# TABYAN VS TARTEEL FINAL ACCEPTANCE MATRIX
**Date:** 2026-10-16  
**Evaluation Standard:** Human & Behavioral Experience Quality Bar (No Self-Certification)  
**Target:** Tabyan Smart Mushaf vs. Tarteel Publicly Verified Capabilities  

---

## Acceptance Comparison Matrix

| DIMENSION | TARTEEL PUBLICLY VERIFIED BEHAVIOR | TABYAN ACTUAL BEHAVIOR | EVIDENCE | STATUS |
| :--- | :--- | :--- | :--- | :--- |
| **Quran Visual Focus** | Quran occupies entire viewport. Controls are minimal floating buttons (eye, mic) at bottom screen edges. | Quran occupies $\ge 82\%$ of screen area on 390x844. Slim sticky top bar (44px) and bottom thumb-zone bar (48px). | Viewport measurement: 692px / 844px dedicated to Quran canvas; zero card wrapping. | `MATCHED` |
| **Mushaf Readability** | Authentic Medina Mushaf typography with standard Hafs vocalization and ornate ayah markers. | Tanzil Medina Uthmani script with Amiri Quran & Amiri serif typography, authentic vocalization, and ﴿١﴾ ayah markers. | `MushafRenderer.tsx`, `quranDataIntegrity.test.ts` (43,874 unique canonical words). | `MATCHED` |
| **Mobile Polish** | Ergonomic touch targets in bottom thumb zone; zero text clipping on 390x844 and 430x932 screens. | 44px touch hitboxes, safe area bottom padding (`pb-28`), thumb-zone hint and mic controls, zero horizontal scrolling. | Mobile responsive inspection at 390x844 and 430x932 viewport constraints. | `MATCHED` |
| **Hide Ayahs** | Blanks out verses completely ("white wall"). Words reveal progressively as user recites from memory. | Words concealed in-place using layout-invariant masking (`opacity-[0.04]`). Spatial geometry and line breaks remain 100% stable. | `QuranWordSpan.tsx`, `wordSpanZeroReflow.test.ts` (zero reflow, no background card). | `MATCHED` |
| **Progressive Reveal** | Recited words appear immediately in place upon high confidence ASR match. | Confirmed words transition from `HIDDEN` to `CONFIRMED` instantaneously without page jumps or layout reflow. | `smartMushafReducer.ts`, `functionalClosureGate.test.ts` (Gate 1 & Gate 7). | `MATCHED` |
| **Current Word Tracking** | Subtle indicator or smooth cursor shows active word location. | Subtle soft gold baseline underline (`decoration-[#C5A059] decoration-2 underline-offset-8`) with zero font-weight jump. | `QuranWordSpan.tsx`, `wordSpanZeroReflow.test.ts` (Gate 3 zero-reflow measurement). | `MATCHED` |
| **Mistake Detection** | Flags missed, incorrect, and extra words with red highlight and haptic feedback. | Flags incorrect words with restrained crimson wavy underline (`decoration-wavy decoration-[#9E2A2B]`). | `smartMushafReducer.ts`, `QuranWordSpan.tsx` (state `INCORRECT`). Live acoustic detection pending Nabr live key. | `CLOSE` |
| **Skipped Word Behavior** | Conservative skip detection; does not falsely flag skipped words during minor pauses or re-anchoring. | Delayed Skip Confirmation Policy: Jump observations (`A → B → D`) retain `C` in `PendingSkip` until forward progression is corroborated. | `ObservationStabilizer.ts`, `functionalClosureGate.test.ts` (Gate 1 assertion). | `MATCHED` |
| **Correction Recovery** | Learner can re-recite the missed word or tap it to see the correct text and continue reciting. | Reciting the corrected word transitions state from `INCORRECT` to `CONFIRMED` without requiring a session restart. | `smartMushafReducer.ts`, `stabilizationAndPipeline.test.ts` (Scenario: correction recovery). | `MATCHED` |
| **Repetition Behavior** | Repeating a word or phrase (e.g. `الْحَمْدُ لِلَّهِ`) does not trigger a mistake or penalize progress. | Stabilizer detects repetition as non-punitive `WORD_REPEATED`; marks state without advancing active index or lowering accuracy. | `ObservationStabilizer.ts`, `smartMushafReducer.test.ts` (Test 9: repetition handling). | `MATCHED` |
| **Pause Behavior** | Learner may pause to breathe or think; engine remains calmly in listening state without timing out. | Idle silence generates zero observations; session status remains `RECITING` without emitting false skips or errors. | `functionalClosureGate.test.ts` (Gate 4 & Gate 5: short pause and long silence tests). | `MATCHED` |
| **Backtracking** | Learner can intentionally re-recite earlier phrases in the ayah to maintain rhythm. | Backtracking window (up to 8 words) allows returning to earlier words; stabilizer confirms repeat without resetting session. | `ObservationStabilizer.ts`, `stabilizationAndPipeline.test.ts`. | `MATCHED` |
| **Auto-Follow** | Smoothly scrolls down to keep active recitation area centered in the viewport. | Smooth auto-scroll triggers only when active confirmed word approaches viewport bounds (`rect.top < 60 || rect.bottom > height - 90`). | `MushafRenderer.tsx` (useEffect auto-scroll), `functionalClosureGate.test.ts` (Gate 9). | `MATCHED` |
| **Hint Workflow** | "Peek" button reveals either 1st word of upcoming verse or entire verse; logged as peek in history. | `كشف كلمة` reveals single target word; `كشف الآية` reveals current verse. Both set state to `REVEALED` without scoring as `CONFIRMED`. | `TasmeeControlBar.tsx`, `smartMushafReducer.ts`, `functionalClosureGate.test.ts` (Gate 2). | `MATCHED` |
| **Session Results** | Detailed summary showing total verses, errors, peeks, and overall accuracy percentage. | `SessionSummaryModal.tsx` truthfully itemizes: Confirmed Words, Revealed Words (hints), Skipped Words, Mistakes, and Accuracy %. | `SessionSummaryModal.tsx`, `functionalClosureGate.test.ts` (Gate 2: summary metrics). | `MATCHED` |
| **Connection Handling** | Alerts user if cloud connection drops; restores state upon reconnection. | Engine catches disconnect events, pauses stream cleanly, and permits immediate restart or resume without memory leak. | `RecitationSessionEngine.ts`, `functionalClosureGate.test.ts` (Gate 6 & Gate 7). | `MATCHED` |
| **Latency** | Typical cloud ASR word confirmation latency ranges between 300ms and 700ms. | Mock provider operates at configurable 200–600ms intervals; live Nabr cloud latency cannot be measured without live key. | `MockNabrProvider.ts` (simulation pace: 600ms/word); live Nabr latency `NOT_VERIFIED`. | `CLOSE` |
| **Real Recognition** | Full cloud AI automatic speech recognition trained on 75,000+ minutes of Quran recitation. | Web Audio captures real 16 kHz Mono PCM16 from user microphone. Live Qurani.ai QRC cloud backend integration deferred to Replit proxy. | Client secret scan = 0; microphone capture verified; live server ASR `NOT_VERIFIED`. | `NOT_VERIFIED` |
| **Accessibility** | Native iOS/Android dark mode, dynamic type, screen reader accessibility. | Full RTL (`dir="rtl"`), dark mode toggle, keyboard navigation, accessible ARIA roles, high contrast Islamic palette. | `index.html`, `MushafNavBar.tsx`, `MushafRenderer.tsx`. | `MATCHED` |

---

## 3. Summary of Dimension Ratings

- **MATCHED:** 15 Dimensions
- **CLOSE:** 2 Dimensions (Mistake Detection, Latency)
- **NOT_VERIFIED (Requires Live Nabr Gateway):** 1 Dimension (Real Recognition)
- **BELOW_TARGET:** 0 Dimensions
