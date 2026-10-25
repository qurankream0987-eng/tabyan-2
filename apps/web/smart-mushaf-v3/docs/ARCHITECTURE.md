# Tabyan Smart Mushaf — System Architecture
**Version:** 1.0.0  
**Status:** Approved for Build & Replit Handoff  
**Philosophy:** Sacred Text Invariance, Provider-Neutrality, Zero-Bypass Confirmation Pipeline

---

## 1. High-Level Architecture Diagram

```
+-------------------------------------------------------------+
|                     QURAN DOMAIN CORE                       |
|  +--------------------------+    +-----------------------+  |
|  |   QuranContentProvider   |--->|  CanonicalQuranModel  |  |
|  +--------------------------+    +-----------------------+  |
+----------------------------------------------|--------------+
                                               v
+-------------------------------------------------------------+
|                      MUSHAF RENDERER                        |
|  - Continuous Layout / 604-Page Madani Page System          |
|  - Individual QuranWord Spans (Surah/Ayah/WordKey)          |
|  - Visual State Binding (NORMAL, HIDDEN, CURRENT, etc.)     |
|  - Classical Arabic RTL Typography (Amiri / Scheherazade)    |
+-------------------------------------------------------------+
                               ^
                               | (Word State Maps & Viewport)
+-------------------------------------------------------------+
|                     SMART MUSHAF STATE                      |
|  - Active Mode: READING, TASMEE, CORRECTION, TEACHER        |
|  - Per-Word State Machine (Immutable State Map)             |
|  - Active Recitation Session Metrics & Session Summary      |
+-------------------------------------------------------------+
                               ^
                               | (ConfirmedRecitationEvent)
+-------------------------------------------------------------+
|                   OBSERVATION STABILIZER                    |
|  - Deduplication & Backtracking Guard                       |
|  - Multi-Observation Consistency Window                     |
|  - Skip & Intentional Repetition Disambiguation             |
+-------------------------------------------------------------+
                               ^
                               | (CanonicalPositionCandidate)
+-------------------------------------------------------------+
|                CANONICAL POSITION RESOLVER                  |
|  - Maps normalized coordinates to canonical WordKey         |
|  - Validates boundaries (Surah 1..114, Ayah 1..N, Word 1..W)|
+-------------------------------------------------------------+
                               ^
                               | (NormalizedObservation)
+-------------------------------------------------------------+
|               PROVIDER OBSERVATION NORMALIZER               |
|  - Converts provider indices (0-based -> 1-based canonical) |
|  - Normalizes vendor error types & mistake payloads         |
+-------------------------------------------------------------+
                               ^
                               | (Raw Provider Observation)
+-------------------------------------------------------------+
|                     RECITATION PROVIDER                     |
|  - Abstract Interface: RecitationProvider                   |
|  - Implementations:                                         |
|      1. MockNabrProvider (Deterministic, scenario-driven)   |
|      2. NabrQrcProvider (Skeleton / WebSocket adapter)      |
|      3. Future Local / On-Device Providers                  |
+-------------------------------------------------------------+
                               ^
                               | (CanonicalAudioFrame / PCM16)
+-------------------------------------------------------------+
|                   AUDIO PIPELINE LAYER                      |
|  - AudioCaptureService (Browser MediaStream -> 16kHz Mono)  |
|  - NabrAudioAdapter (WAV RIFF 200ms framing / Opus packets) |
|  - Echo Safety: Recitation Playback completely isolated     |
+-------------------------------------------------------------+
```

---

## 2. Invariant Rules & Boundaries

1. **Sacred Text Invariance:**
   The Quranic text (Uthmani Hafs standard) is strictly immutable. No algorithm, correction engine, or state change may alter or strip diacritics of the original text.

2. **No-Bypass Rule:**
   No provider event (raw WebSocket message or simulated event) may bypass the normalization, resolution, and stabilization layers. Only `ConfirmedRecitationEvent` can mutate `SmartMushafState`.

3. **Canonical WordKey Supremacy:**
   Learner progress, memorization state, and bookmark coordinates are anchored exclusively to `WordKey { surah, ayah, wordIndex }`. DOM identifiers, QCF numbers, font glyph codes, or layout page line indices are strictly presentation details.

4. **Zero API Keys in Browser:**
   No proprietary secrets or live Nabr credentials are baked into client JavaScript. Live calls are gated behind developer-controlled configurations and backend proxies.
