# Tabyan Smart Mushaf — Confirmed Recitation Events
**Document Version:** 1.0.0  

---

## 1. Zero-Bypass Confirmation Rule
Raw vendor WebSocket packets (`TILAWA_RESULT`, MessagePack payloads, candidate probabilities) are strictly prohibited from mutating UI state directly.

Only the following domain events produced by `ObservationStabilizer` can be dispatched to `smartMushafReducer`:

1. `WORD_CONFIRMED`
   - Payload: `key: WordKey`, `confidence: number`
   - Transitions target word from `CURRENT` or `HIDDEN` to `CONFIRMED`.

2. `CURRENT_WORD_CHANGED`
   - Payload: `key: WordKey`
   - Marks the target word as the active focus element.

3. `WORD_SKIPPED`
   - Payload: `key: WordKey`
   - Marks intermediate words as skipped when the reciter jumps forward.

4. `WORD_REPEATED`
   - Payload: `key: WordKey`
   - Marks word as repeated (acknowledging student repetition without penalty).

5. `MISTAKE_DETECTED`
   - Payload: `mistake: ConfirmedMistake`
   - Anchors letter or tajweed note to the canonical `WordKey`.

6. `SESSION_STARTED` / `SESSION_COMPLETED` / `SESSION_RESET`
   - Manages session lifecycle and final summary statistics.
