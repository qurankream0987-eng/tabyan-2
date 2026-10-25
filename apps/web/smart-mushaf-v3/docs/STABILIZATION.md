# Tabyan Smart Mushaf — Observation Stabilization Engine
**Document Version:** 1.0.0  

---

## 1. Problem Statement
Real-time streaming speech recognition providers (like Qurani.ai QRC) emit continuous observations every 100–200ms. In practice, observations often contain:
- Rapid duplicates of the same word while the student elongates a vowel
- Temporary backtracking candidates due to acoustic ambiguities
- Out-of-order candidate arrivals due to network jitter
- Student intentional repetitions (e.g., repeating a verse head)

## 2. Stabilization Algorithms

### A. Deduplication Gate
Maintains a `Set<WordKeyString>` of already confirmed words. If a candidate is already in the set, it is never re-confirmed.

### B. Repetition & Backtracking Guard
When candidate $K_{\text{new}}$ is before the last confirmed position $K_{\text{last}}$:
- If $K_{\text{new}}$ was previously confirmed, it emits a `WORD_REPEATED` event.
- It updates the anticipated word pointer to follow this repetition, avoiding mistaking it for an error.

### C. Skip Detection Disambiguation
When candidate $K_{\text{new}}$ is within the same Ayah but advances past $K_{\text{last}}$ by more than 1 word (up to the threshold of 8 words):
- Emits `WORD_SKIPPED` events for intermediate words.
- Confirms the target candidate.
