# Tabyan Smart Mushaf — Verified Constraints & Analysis
**Document Version:** 1.0.0  
**Phase:** 0 — Initial Constraint Triaging & Boundary Verification  
**Author:** Tabyan Engineering Engine  
**Platform Target:** Web-First, Provider-Neutral, Replit-Handoff Ready

---

## 1. Verified Facts (Ground Truth)

1. **Project Mission & Hand-off Target:**
   - This is the **New Tabyan Smart Mushaf** built from scratch as an independent, clean, production-oriented project.
   - It will be exported directly and handed off to **Replit**, where the core Tabyan infrastructure resides.
   - Must not depend on any Google AI Studio internal/proprietary runtime, session storage, or hidden services.
   - Standard Web tech stack: React 19, TypeScript, Vite, Tailwind CSS.

2. **Canonical Quran Identity:**
   - Progress and learner state must **NEVER** depend on DOM ids, glyph IDs, QCF numbers, font codepoints, vendor-specific word IDs, or visual page coordinates.
   - Every Quran word is identified by an immutable `WordKey`:
     ```ts
     export interface WordKey {
       surah: number;     // 1..114
       ayah: number;      // 1..totalAyahs
       wordIndex: number; // 1-based canonical index within the Ayah
     }
     ```
   - Canonical indexing is strictly defined: **1-based** across `surah`, `ayah`, and `wordIndex`.
   - Provider-specific indices (which may be 0-based or vendor-indexed) must be mapped explicitly at system boundaries and verified.

3. **Immutable Quran Domain Model:**
   - Quran domain entities (`Surah`, `Ayah`, `QuranWord`, `WordKey`, `PageReference`, `JuzReference`, `HizbReference`) are immutable data structures.
   - Zero in-place mutation of sacred texts.

4. **Nabr / Qurani.ai QRC Contract (Current Official Specification):**
   - Protocol: WebSocket at `wss://api.qurani.ai`.
   - Authentication: API key in the WebSocket query string parameter.
   - Serialization: Binary MessagePack (`msgpack`).
   - Required Methods:
     - `START_TILAWA_SESSION` (with `chapter_index`, `verse_index`, `word_index`, `hafz_level`, `tajweed_level`).
     - `CHECK_TILAWA_AUDIO` (with binary audio payload).
     - `RESET_TILAWA_SESSION`.
   - Expected Events:
     - `QRC_CLIENT_CONNECTED`
     - `TILAWA_SESSION_STARTED`
     - `TILAWA_SESSION_ENDED`
     - `TILAWA_RESULT` (contains `chapter_index`, `verse_index`, `word_index`, `correct_words`, `skipped_words`, `tajweed_mistakes`, `letter_mistakes`)
     - `KEEP_ALIVE`
     - `QRC_ERROR`
   - Audio Specs:
     - Sample Rate: **16 kHz**, Channels: **Mono (1-channel)**, Bit Depth: **16-bit PCM**.
     - WAV mode: Complete valid RIFF WAV header per chunk message (~200ms recommended chunk duration).
     - Opus mode: Raw 20ms Opus frames (320 samples @ 16 kHz), no WebM/Ogg container encapsulation.
   - **Critical Security Constraint:** Live Nabr WebSocket calls are strictly prohibited in the browser client bundle. No live API keys in client code. Live connection is handled via adapter skeleton with mock transport in browser, deferring live secret negotiation to the Replit backend proxy.

5. **Provider Pipeline Isolation (No Bypass Allowed):**
   - The flow of data is strictly linear and gated:
     $$\text{Raw Provider Event} \to \text{ObservationNormalizer} \to \text{CanonicalPositionResolver} \to \text{ObservationStabilizer} \to \text{ConfirmedRecitationEvent} \to \text{SmartMushafState} \to \text{UI}$$
   - No raw provider event may ever mutate UI state directly.

6. **Smart Word State Machine:**
   - Explicit domain states:
     - `NORMAL`: Visible standard recitation text.
     - `HIDDEN`: Obscured/masked for Tasmee memorization test while retained in memory.
     - `CURRENT`: Actively focused or currently being recited.
     - `CONFIRMED`: Successfully recited and verified by confirmation engine.
     - `INCORRECT`: Restrained mistake indicator.
     - `SKIPPED`: Detected skipped word.
     - `REPEATED`: Detected repetitive phrase/word (not automatically treated as error).
     - `REVEALED`: Manually prompted or revealed via hint.
     - `UNKNOWN`: Unverified state (never fabricate feedback).

7. **Design & UX Quality Benchmark:**
   - Brand aesthetic: Deep burgundy (`#4A0E17`, `#6B1D2F`), muted gold (`#C5A059`, `#D4AF37`), warm ivory (`#FDFBF7`, `#FAF6EE`), nocturnal dark mode.
   - Arabic RTL primary layout, classical typography (`Amiri Quran`, `Scheherazade New`).
   - Phone-first touch ergonomics (primary target: 390x844 iPhone standard, responsive up to 1440px desktop).
   - Touch targets $\ge 44\text{px}$, aggregate mobile sticky bars $\le 15\%$ viewport height.
   - Anti-slop: No code comments in UI headers, no decorative pulsing dots, zero-pill metadata discipline.

---

## 2. Assumptions (Explicitly Documented & Validated)

1. **Quran Content Text & Source:**
   - *Assumption:* The initial clean standalone build uses the verified Tanzil Uthmani text standard (Hafs 'an 'Asim, standard 114 Surahs, 6,236 Ayahs) with complete word-by-word tokenization and Madani 604-page verse mappings.
   - *Validation:* Tanzil text is strictly verified, license-compatible (Public Domain / CC BY 3.0), non-proprietary, and can be replaced seamlessly via the `QuranContentProvider` interface.
2. **Page Layout Strategy:**
   - *Assumption:* We provide both `CONTINUOUS_QURAN_LAYOUT` (continuous fluid layout with Surah banners, ayah ornaments, word interactive spans) and `AUTHENTIC_604_PAGE_LAYOUT` metadata reference (where page 1..604 ranges are mapped to standard Madani mushaf pages without faking non-licensed QCF font glyphs).
   - *Validation:* Explicitly distinguished in renderer state.
3. **Index Base Conversion:**
   - *Assumption:* Canonical Quran model is strictly **1-based** (`surah: 1..114`, `ayah: 1..N`, `wordIndex: 1..W`).
   - *Validation:* Nabr/QRC provider contract uses 0-based indexing for `chapter_index`, `verse_index`, `word_index`. The `NabrObservationNormalizer` strictly performs `+1` conversion on incoming coordinates and `-1` on outgoing session requests.
4. **Letter/Tajweed Mistake Granularity:**
   - *Assumption:* Because letter glyph mapping varies across fonts and QCF codepoints, letter/tajweed mistakes without proven grapheme clustering are anchored safely at the **Word level**, preventing broken glyph splitting in Arabic text.

---

## 3. Open Questions (For Future Replit Phase)

1. *Backend Secret Management:* Will Replit host an Express/Node.js WebSocket proxy to pipe client PCM16 audio to `wss://api.qurani.ai` with the server-side API key, or issue short-lived ephemeral session tokens? (Documented in `REPLIT_HANDOFF.md`).
2. *Authentic 604-Page Vector Layout:* When licensed KFGQPC V2/V4 glyph assets or QCF fonts are secured by Tabyan, the `MushafRenderer` page layout strategy will ingest them through the isolated `PageLayoutAdapter`.
3. *Student Profile & Spaced Repetition Cloud Sync:* Replit will attach the existing Tabyan PostgreSQL / Prisma schema to the `SmartMushafState` export hook.

---

## 4. Phase 0 Gate Check

- [x] All constraints extracted from user specification.
- [x] Verified facts, assumptions, and open questions clearly distinguished.
- [x] Canonical `WordKey` contract formalized.
- [x] Nabr/QRC official WebSocket & MessagePack protocol documented.
- [x] Audio conversion requirements (16kHz mono PCM16 / WAV header / 20ms Opus) isolated.
- [x] Ready to proceed to Phase 1 & 2.
