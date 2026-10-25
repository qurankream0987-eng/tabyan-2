# Tabyan Smart Mushaf — Handoff Directory & File Manifest
**Release Candidate:** `TABYAN_SMART_MUSHAF_RC1`  
**Purpose:** Replit engineering transfer manifest for directory permissions, invariants, and styling boundaries.

---

## Directory Level Matrix

| Directory Path | Purpose | MUST_PRESERVE | CAN_RESTYLE | CAN_REPLACE | DO_NOT_TOUCH |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/quran/domain/` | Canonical Quran models, `WordKey` invariants, bounds checking. | `WordKey` 1-based structure, immutability, `areWordKeysEqual`, `compareWordKeys`. | None. | None. | Canonical WordKey tuple `{ surah, ayah, wordIndex }`. |
| `src/quran/data/` | Canonical 114 Surahs metadata, 30 Juz definitions, limited page hints, official static Tanzil Uthmani text. | 114 Surahs, 6,236 ayahs, and 77,433 canonical words verified. The verbatim source file contains 77,881 raw tokens before all 112 separate Basmala prefixes (including the source-spelled variants in Surahs 95 and 97) are moved to the surah header at runtime; page hints do not claim printed-page fidelity. | None. | Content source if swapped for authenticated backend API. | Sacred Uthmani text tokens & diacritics. |
| `src/quran/providers/` | `QuranContentProvider` abstraction & `TanzilQuranProvider` implementation. | Interface contract (`getSurah`, `getAyah`, `getWords`, `resolveWord`, `search`). | None. | `TanzilQuranProvider` can be replaced with Tabyan's DB/API provider. | Interface method signatures. |
| `src/mushaf/renderer/` | Primary Quran text renderer and continuous/604-page layout frame. | RTL direction, `dir="rtl"`, word-level span containment, `data-word-key`. | Background colors, borders, font-sizes, ornamental frames. | Layout framing wrapper. | Text selection integrity & reading flow. |
| `src/mushaf/word/` | `QuranWordSpan` rendering individual words and binding `SmartWordState`. | `data-word-key`, React.memo comparator, layout-invariant blur masking. | Hover tints, underline colors, badge styles. | None. | Layout invariance (never use `display: none` for hidden words). |
| `src/mushaf/page/` | Islamic Surah headers and calligraphic Basmala headers. | Unboxed metadata format, Ayah counts, revelation types. | Border ornaments, gold accents, frame padding. | Ornamental SVG knots. | Surah name Arabic calligraphy. |
| `src/mushaf/navigation/` | Top Navigation Bar (3-zone contract) and Navigation Index Modal. | Top Bar Contract, 114-Surah index, Juz/Page jump. | Button radii, tab colors, modal transitions. | Icons (Lucide). | 3-zone structure. |
| `src/smart/state/` | SmartMushaf domain models, `SmartWordState` machine, session metrics. | States: `NORMAL, HIDDEN, CURRENT, CONFIRMED, INCORRECT, SKIPPED, REPEATED, REVEALED, UNKNOWN`. | None. | None. | Core state enum values. |
| `src/smart/reducer/` | Pure deterministic reducer managing reading, Tasmee, and correction modes. | State transitions, non-punitive repetition logic, immutable updates. | None. | None. | State transition table. |
| `src/smart/normalization/` | `ObservationNormalizer` converting 0-based provider indices to 1-based canonical coordinates. | 0-to-1 index mapping, mistake payload normalization. | None. | None. | Boundary conversion formulas. |
| `src/smart/resolution/` | `CanonicalPositionResolver` validating candidate positions against Quran model. | Strict boundary validation, invalid coordinate rejection. | None. | None. | Boundary guard algorithms. |
| `src/smart/stabilization/` | `ObservationStabilizer` confirmation policy and deduplication engine. | Deduplication gate, backward repetition guard, skip jump threshold. | None. | Configurable debounce intervals (`minDuplicateConfirmCount`). | Zero-bypass confirmation rule. |
| `src/recitation/events/` | Domain events (`ConfirmedRecitationEvent` union). | Authorized event types: `WORD_CONFIRMED`, `CURRENT_WORD_CHANGED`, `WORD_SKIPPED`, `WORD_REPEATED`, `MISTAKE_DETECTED`. | None. | None. | Confirmed event union. |
| `src/recitation/sessions/` | `RecitationSessionEngine` orchestrating the linear pipeline. | Strict linear flow: Provider $\to$ Normalizer $\to$ Resolver $\to$ Stabilizer $\to$ Events. | None. | None. | Pipeline order (No direct Provider $\to$ UI path). |
| `src/audio/` | Web Audio capture, 16 kHz mono downsampling, 200ms RIFF WAV encoder. | 16 kHz Mono PCM16 output, 44-byte RIFF header, echo isolation. | None. | Browser AudioWorklet vs ScriptProcessor. | Isolated playback from mic capture. |
| `src/providers/contracts/` | `RecitationProvider` neutral interface and connection state enums. | Provider capabilities, connection state machine, diagnostic fields. | None. | None. | Method signatures. |
| `src/providers/mock/` | `MockNabrProvider` deterministic recitation simulator. | Preset test scenarios: perfect, skips, repetitions, mistakes, duplicate windows. | None. | Additional simulation scenarios. | Simulation event sequencing. |
| `src/providers/nabr/` | `NabrQrcProvider` official Qurani.ai QRC WebSocket protocol skeleton. | Official QRC protocol structure: `START_TILAWA_SESSION`, `CHECK_TILAWA_AUDIO`, `RESET_TILAWA_SESSION`. | None. | Replit backend WebSocket proxy forwarding. | Client-side API key prohibition. |
| `src/features/reading/` | Reading mode controls, Quran search, bookmark local storage, audio playback. | 44px touch hitboxes, search indexing, isolated playback. | Accent colors, button placement, modal sizes. | Bookmarks storage adapter (swap with Tabyan DB). | Audio echo safety isolation. |
| `src/features/tasmee/` | Tasmee control bar, 1-tap hints ("كشف كلمة"), session summary modal. | Thumb-zone reach, layout-invariant unmasking, accuracy calculation. | Button colors, dialog styling. | None. | 1-tap hint action. |
| `src/features/correction/` | Recitation follow banner and live mistake display. | Quran remains visible, restrained mistake notices. | Banner colors, badge styling. | None. | Word-level mistake anchoring. |
| `src/features/teacher/` | Quran Teacher Mode Shell. | Sequenced: Qari plays $\to$ student repeats $\to$ evaluation. | Card backgrounds, icon accents. | Live audio evaluation once connected. | Playback and mic sequencing. |
| `src/diagnostics/` | `DevDiagnosticsDrawer` developer observability panel. | Collapsible bottom drawer, real-time pipeline telemetry, secret filtering. | Drawer styling, font sizes. | None. | Hidden from standard students. |
| `src/tests/` | Vitest automated test suite (8 test suites, 40 tests). | 100% test pass rate, 114 Surahs data integrity audit. | None. | Add more integration test cases. | Core assertions. |
| `docs/` | Complete architectural, protocol, and handoff documentation suite. | All 15 specification and gap analysis documents. | Markdown formatting. | None. | Architectural invariants. |
