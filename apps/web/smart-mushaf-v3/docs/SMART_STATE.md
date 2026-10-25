# Tabyan Smart Mushaf — Smart State Architecture & State Machine
**Document Version:** 1.0.0  

---

## 1. State Machine Invariants
The state of every word during recitation progresses predictably:

```
[Session Start (Tasmee)]
         │
         ▼
     [HIDDEN] ─────────── (Manual Hint) ───────────► [REVEALED]
         │
         │ (ObservationStabilizer: Candidate Active)
         ▼
     [CURRENT]
         │
         ├─────────────── (Confirmed Match) ───────► [CONFIRMED]
         │                                               │
         ├─────────────── (Articulatory Alert) ──► [INCORRECT]
         │                                               ▼
         ├─────────────── (Advance Detected) ───► [SKIPPED]
         │
         └─────────────── (Backtrack Repeated) ──► [REPEATED]
```

## 2. Metrics & Calculation
- Accuracy percentage:
  $$\text{Accuracy} = \operatorname{round}\left(\frac{\text{confirmedWords}}{\max(1, \text{totalWordsInScope})} \times 100\right)$$
- Skipped and repeated counts are tracked independently without corrupting canonical progress.
