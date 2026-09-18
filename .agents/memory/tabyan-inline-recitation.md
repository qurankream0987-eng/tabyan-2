---
name: Tabyan Inline Recitation (Phase 1A.2)
description: Architecture of the inline recitation layer inside MushafReader — key constraints and traps.
---

# Tabyan Inline Recitation — Phase 1A.2

## Word hiding: opacity only, no currentVerseKey exception
`MushafPage` applies `opacity` (0, 0.25, or 1) per word. **The current verse is NOT automatically shown** — hiding applies uniformly across ALL range ayahs in every mode:
- `full_hide`: all type-0 words in range → opacity 0
- `first_word`: first word position visible, rest → 0
- `progressive_reveal`: words revealed by count in `revealedWords` Map (per verseKey)
- `visible_review`: all words visible

Only `type !== 0` words (aya markers, stop signs) are always visible.

**Why:** Showing the current ayah defeats the entire purpose of full_hide and first_word modes.

## Async mutation safety (critical)
All lifecycle mutations in `useRecitationSession` are **awaited** with error handling:
- `pause/resume`: optimistic (UI updates immediately, reverts + shows error on failure)
- `end`: pessimistic — transitions to `result` phase ONLY after server confirms; stays in active/paused on failure
- `cancel`: optimistic fire-and-forget (user already chose to exit)
- `busy` state + ref gates all operations — prevents concurrent mutations

**Why:** Fire-and-forget mutations inside setState left DB/UI state inconsistent on network failures.

## DB schema trap
`recitation_sessions.status` `$type<>` in `lib/db/src/schema/index.ts` must include `"cancelled"`. Build order: `lib/db` → `lib/tabyan-trpc` → `artifacts/api-server`.

## Architecture: refs for async correctness
Hook uses parallel refs (`phaseRef`, `sessionIdRef`, `accumulatedSecsRef`, etc.) that stay in sync with state via `useEffect`. Async callbacks read from refs (always fresh) and write to state (triggers re-renders). Avoids closure-staling in long async spans.

## Timer: timestamps, not interval drift
Stores `startTs` (epoch ms) + `accumulatedSecs`. On pause: snapshot. On resume: new startTs. Interval reads `Date.now() - startTs` — immune to jitter.

## MushafControls bottom bar swap
When `sessionActive=true`, bottom bar slides away (`translate-y-full`) and `RecitationSessionBar` appears at `absolute bottom-0 z-[25]`. Visual swap, not unmount.

## Sheet positioning
Setup/result sheets are `absolute inset-0 z-30` INSIDE MushafReader shell (`fixed inset-0 z-[100]`). No portal needed.
