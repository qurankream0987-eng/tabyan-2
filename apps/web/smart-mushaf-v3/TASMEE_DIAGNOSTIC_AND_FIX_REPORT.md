# Tabyan Smart Mushaf — Tasmee Button Failure Diagnostic & Fix Report
**Document ID:** `TASMEE_DIAGNOSTIC_AND_FIX_REPORT.md`  
**Release Target:** TABYAN_SMART_MUSHAF_RC1  
**Status:** Defect Diagnosed, Root Cause Identified, Minimal Fix Applied, Re-Verified (41/41 Tests Passing)  
**Investigation Date:** October 16, 2026  

---

## 1. FAILURE ROOT CAUSE

When the user pressed the **تَسْمِيع (Tasmee / Microphone)** button in the navigation header, the Tasmee recitation session did not start.

### The Exact Cause:
1. **Disconnected Execution Hook:**  
   The primary top-level navigation bar (`MushafNavBar.tsx`) rendered the Tasmee button with `<Mic />` icon and label `"تَسْمِيع"`. When clicked, its handler fired `onSelectMode('TASMEE')`. In `App.tsx`, this was connected directly to `dispatch({ type: 'SET_MODE', payload: mode })`.
2. **Incomplete Mode-Switch Effect in Reducer:**  
   `smartMushafReducer` treats `SET_MODE` purely as a view mode change (`state.mode = 'TASMEE'`). It intentionally keeps `sessionStatus: 'IDLE'` and `wordStates: {}` (unmasked) unless an explicit session start action is dispatched.
3. **Session Start Was Never Invoked:**  
   The actual session start function (`handleStartTasmee()`) — which masks the Quran words (`START_TASMEE_SESSION`), starts `RecitationSessionEngine`, initializes audio capture, and starts `MockNabrProvider` — was **only wired to the bottom secondary button** (`TasmeeControlBar`), not the main navigation Tasmee button that the user clicked.
4. **State Race Guard on First Mount:**  
   Additionally, in `handleStartTasmee()`, the check `if (!currentSurah || currentAyahs.length === 0) return;` would silently return and abort if the user clicked before the initial asynchronous `loadSurah(1)` promise had resolved in React state.

---

## 2. EXACT SOURCE CODE TRACE

### Component Rendering the Button:
- **FILE:** `/src/mushaf/navigation/MushafNavBar.tsx` (lines 61–71)
- **COMPONENT:** `MushafNavBar`
- **BUTTON_HANDLER:** `onClick={() => onSelectMode('TASMEE')}`
- **FUNCTION_CALLED:** `onSelectMode('TASMEE')`

### Full Execution Call Chain (Before Fix):
```
User clicks [تَسْمِيع] button in MushafNavBar
  └── MushafNavBar.tsx: onClick={() => onSelectMode('TASMEE')}
       └── App.tsx: onSelectMode={(mode) => dispatch({ type: 'SET_MODE', payload: mode })}
            └── smartMushafReducer.ts: case 'SET_MODE'
                 └── state.mode = 'TASMEE'
                      └── sessionStatus remains 'IDLE'
                      └── wordStates remains '{}' (Words NOT masked)
                      └── RecitationSessionEngine.start() NEVER CALLED
                      └── MockNabrProvider.startSession() NEVER CALLED
                      └── Recitation fails to start (DEAD END)
```

### Full Execution Call Chain (After Fix):
```
User clicks [تَسْمِيع] button in MushafNavBar (or [ابدأ التسميع] in TasmeeControlBar)
  └── MushafNavBar.tsx: onClick={() => onSelectMode('TASMEE')}
       └── App.tsx: handleSelectMode('TASMEE')
            ├── dispatch({ type: 'SET_MODE', payload: 'TASMEE' })
            └── handleStartTasmee()
                 ├── Fetch canonical Surah if state not yet settled (safeguards race condition)
                 ├── dispatch({ type: 'START_TASMEE_SESSION', payload: { allScopeWordKeys, ... } })
                 │    ├── state.mode = 'TASMEE'
                 │    ├── state.sessionStatus = 'RECITING'
                 │    ├── state.wordStates: all 29 words masked as 'HIDDEN'
                 │    └── state.wordStates['1:1:1'] = 'CURRENT'
                 └── RecitationSessionEngine.start({ sessionId, surahNumber, allScopeWordKeys, ... })
                      ├── Provider.connect() -> state: 'CONNECTED'
                      ├── Provider.startSession() -> state: 'READY'
                      └── Provider.pushAudio() -> state: 'STREAMING'
                           └── MockNabrProvider runs simulation scenario
                                └── Observations emitted into Zero-Bypass Pipeline
```

---

## 3. STAGE-BY-STAGE PIPELINE TRACE

Every incoming recognition observation follows the strict, non-bypassable 6-stage linear pipeline:

| Stage | Component | Action & Transformation | Verified Log Output |
|:---|:---|:---|:---|
| **Stage 1: RAW_OBSERVATION** | `MockNabrProvider` | Emits vendor raw 0-based candidate observation | `[DEV_TRACE] STAGE 1: RAW_OBSERVATION: c=0, v=0, w=0` |
| **Stage 2: NORMALIZED** | `ObservationNormalizer` | Translates 0-based coordinate to canonical 1-based candidate `{ surah: 1, ayah: 1, wordIndex: 1 }` | `[DEV_TRACE] STAGE 2: NORMALIZED: candidateKey=1:1:1` |
| **Stage 3: RESOLVED_CANONICAL** | `CanonicalPositionResolver` | Validates candidate against sacred immutable Quran DOM model (`defaultQuranProvider`) | `[DEV_TRACE] STAGE 3: RESOLVED_CANONICAL: isValid=true, word="بِسْمِ"` |
| **Stage 4: STABILIZED_CONFIRMED** | `ObservationStabilizer` | Applies confirmation policy, deduplicates, and generates verified events | `[DEV_TRACE] STAGE 4: STABILIZED_CONFIRMED: eventsCount=2 ['WORD_CONFIRMED', 'CURRENT_WORD_CHANGED']` |
| **Stage 5: STATE_MUTATED** | `smartMushafReducer` | Pure reducer receives confirmed events and mutates state | `[DEV_TRACE] STAGE 5: STATE_MUTATED: type=WORD_CONFIRMED, key=1:1:1` <br/> `[DEV_TRACE] STAGE 5: STATE_MUTATED: type=CURRENT_WORD_CHANGED, key=1:1:2` |
| **Stage 6: DOM_RENDERED** | `QuranWordSpan` | Updates DOM attribute `data-word-state="CONFIRMED"` and unmasks word visually; sets next word to `CURRENT` | `data-word-key="1:1:1"` rendered with confirmed styles; `1:1:2` highlighted as active focus |

---

## 4. FIX APPLIED

### Changes in `/src/App.tsx`:
1. **Added `handleSelectMode` Dispatcher:**
   Intercepts top bar mode tab navigation. When `TASMEE` is selected, it immediately sets mode and executes `handleStartTasmee()`. When leaving active reciting modes, it cleans up via `handleStopSession()`.
   ```tsx
   const handleSelectMode = async (mode: MushafMode) => {
     console.log(`[DEV_TRACE] BUTTON_CLICKED = true | mode=${mode}`);
     if (mode === 'TASMEE') {
       dispatch({ type: 'SET_MODE', payload: 'TASMEE' });
       await handleStartTasmee();
     } else if (mode === 'CORRECTION') {
       dispatch({ type: 'SET_MODE', payload: 'CORRECTION' });
       await handleStartCorrection();
     } else {
       if (state.sessionStatus === 'RECITING' || state.sessionStatus === 'PAUSED') {
         await handleStopSession();
       }
       dispatch({ type: 'SET_MODE', payload: mode });
     }
   };
   ```
2. **Defensive Data Guard in `handleStartTasmee`:**
   Guards against null/empty Surah state by dynamically resolving from `defaultQuranProvider` if state is not yet ready, avoiding silent click drops.
3. **Rollback on Engine Error:**
   If `sessionEngineRef.current.start()` encounters any error (e.g. microphone denied in browser), it dispatches `STOP_SESSION` along with the descriptive student error message, preventing the UI from remaining stuck in `RECITING`.
4. **Added Dev Tracing Instrumentation:**
   Injected explicit trace markers matching verification steps 2 through 6:
   - `BUTTON_CLICKED = true`
   - `MOCK_PROVIDER_STARTED`
   - `MOCK_OBSERVATION_EMITTED`
   - `STAGE 1: RAW_OBSERVATION`
   - `STAGE 2: NORMALIZED`
   - `STAGE 3: RESOLVED_CANONICAL`
   - `STAGE 4: STABILIZED_CONFIRMED`
   - `STAGE 5: STATE_MUTATED`

---

## 5. END-TO-END PROOF LOG

Captured from the live test run (`src/tests/tasmeeButtonPath.test.ts`):

```
[DEV_TRACE] BUTTON_CLICKED = true | handleStartTasmee triggered
[DEV_TRACE] MOCK_PROVIDER_STARTED { sessionId: 'test-session-btn-1', surah: 1, ayah: 1 }
[DEV_TRACE] STAGE 1: RAW_OBSERVATION: c=0, v=0, w=0
[DEV_TRACE] STAGE 2: NORMALIZED: candidateKey=1:1:1
[DEV_TRACE] STAGE 3: RESOLVED_CANONICAL: isValid=true, word="بِسْمِ"
[DEV_TRACE] STAGE 4: STABILIZED_CONFIRMED: eventsCount=2 [ 'WORD_CONFIRMED', 'CURRENT_WORD_CHANGED' ]
[DEV_TRACE] STAGE 5: STATE_MUTATED: type=WORD_CONFIRMED, key=1:1:1
[DEV_TRACE] STAGE 5: STATE_MUTATED: type=CURRENT_WORD_CHANGED, key=1:1:2
[DEV_TRACE] STAGE 1: RAW_OBSERVATION: c=0, v=0, w=1
[DEV_TRACE] STAGE 2: NORMALIZED: candidateKey=1:1:2
[DEV_TRACE] STAGE 3: RESOLVED_CANONICAL: isValid=true, word="ٱللَّهِ"
[DEV_TRACE] STAGE 4: STABILIZED_CONFIRMED: eventsCount=2 [ 'WORD_CONFIRMED', 'CURRENT_WORD_CHANGED' ]
[DEV_TRACE] STAGE 5: STATE_MUTATED: type=WORD_CONFIRMED, key=1:1:2
[DEV_TRACE] STAGE 5: STATE_MUTATED: type=CURRENT_WORD_CHANGED, key=1:1:3
```

---

## 6. REGRESSION TEST RESULTS

Full automated test suite executed with `vitest run`:

```
Test Files  9 passed (9)
     Tests  41 passed (41)
  Duration  7.03s

Summary of Test Suites:
✓ src/tests/tasmeeButtonPath.test.ts (1 test) — Traces button click directly to session start & all 6 pipeline stages
✓ src/tests/quranDataIntegrity.test.ts (2 tests) — 114 Surahs, 6236 Ayahs, 43874 WordKeys verified
✓ src/tests/tasmeeAcceptanceMatrix.test.ts (9 tests) — Cases A through I verified
✓ src/tests/recitationScenarios.test.ts (2 tests) — Multi-ayah & full passage recitation
✓ src/tests/stabilizationAndPipeline.test.ts (10 tests) — Deduplication & confirmation policy
✓ src/tests/providerBypass.test.ts (2 tests) — Zero-bypass architectural safety guarantee
✓ src/tests/canonicalWordKey.test.ts (5 tests) — Immutable WordKey structure & serialization
✓ src/tests/nabrBoundary.test.ts (3 tests) — 0-based Nabr to 1-based canonical boundary rules
✓ src/tests/smartMushafReducer.test.ts (7 tests) — State transitions & word masking
```

### Verification Checks:
- **No new features added:** True.
- **No redesign performed:** True.
- **No Quran data altered:** True.
- **No live Nabr API call made:** True (clean mock simulator utilized).
- **TypeScript & linting check:** Clean (zero diagnostics, zero errors).
- **Compilation check:** Succeeded (`vite build` succeeded).
