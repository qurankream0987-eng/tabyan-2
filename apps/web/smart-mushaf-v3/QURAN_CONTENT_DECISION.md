# Tabyan Smart Mushaf — Quran Content Source Decision & Legal Rights Ledger
**Document ID:** `QURAN_CONTENT_DECISION.md`  
**Release Target:** `TABYAN_SMART_MUSHAF_RC1`  
**Decision Status:** APPROVED & RATIFIED  

```
CANONICAL_PROVIDER = TanzilQuranProvider
QF_LIVE_REQUESTS = DISABLED
TABYAN_AGE_RANGE = 4–100
QF_INTEGRATION = HOLD_FOR_PERMISSION
```

---

## 1. Executive Policy Mandate

Tabyan is intentionally engineered for children, students, adults, teachers, and families across an age spectrum of **4 to 100 years old**. Under no circumstances will Tabyan restrict its target audience to 13+ or force user account creation merely to accommodate third-party cloud API terms of service.

The primary Quran content path for Tabyan is confirmed as **Tanzil Uthmani Canonical Text (Hafs 'an 'Asim)**, bundled and served statically/locally via the `TanzilQuranProvider` implementation of `QuranContentProvider`.

This architecture requires **zero runtime network requests**, **zero third-party user accounts**, and **zero transmission of user data to external Quran text servers**.

---

## 2. Assessment of Current Tanzil Path

### 1. Can the current Tanzil text remain the canonical Quran text source?
**Answer: YES.**
- **Orthography:** Authentic Medina Uthmani orthography (Hafs 'an 'Asim standard) aligned with the Medina Mushaf standard.
- **Completeness:** Full 114 Surahs, 6,236 Ayahs, canonical diacritics (tashkeel), and standardized Quranic pause/waqf indicators (U+06D6 to U+06ED).
- **Global Provenance:** Developed by Hamid Zarrabi-Zadeh (Tanzil Project, https://tanzil.net), verified over 15+ years by scholarly consensus and adopted by leading Quranic software worldwide.

### 2. Can Tabyan use it under its published terms?
**Answer: YES.**
- **Terms & Distribution:** Tanzil Quran text may be copied and distributed under its published terms.
- **Text Immutability:** The Quran text itself must remain **verbatim and unmodified**. Under no circumstances is the sacred Quran text adapted, edited, or altered.
- **Derived Metadata:** Tabyan may create derived metadata such as WordKey token indexes, line/word coordinate maps, and search index lookups, but the underlying `SOURCE_QURAN_TEXT` remains strictly immutable and authentic.
- **Attribution Requirement:** Tanzil attribution and source link must remain prominently documented.
- **Audience & Data Usage:** Tanzil's published Quran text terms do not require user accounts or impose an age restriction, and Tabyan serves the Quran text locally without sending user data to Tanzil.

### 3. Can we keep Quran content local/static rather than depending on QF runtime requests?
**Answer: YES.**
- **Offline Reliability:** Static bundling guarantees that children and students in classrooms, mosques, or areas without internet connectivity have uninterrupted access.
- **Deterministic Latency:** Zero-millisecond local retrieval ensures the real-time Tasmee word tracking loop operates with zero network latency or jitter.
- **Independence:** Eliminates third-party API downtime, breaking schema changes, rate limits, and API credential exposures.

### 4. Can word-level identity continue to be derived safely from the existing canonical tokenizer?
**Answer: YES.**
- In Hafs Arabic Uthmani text, each Ayah consists of words delimited by standard Unicode spaces (`\s+`).
- Tabyan's `canonicalWordTokenizer` splits Ayah text on whitespace, correctly preserves ligature-attached Quranic stop signs (such as ۖ, ۗ, ۚ, ۛ, ۜ, ۝) on the preceding word, and assigns an immutable 1-based index `wordIndex: 1, 2, ... N`.
- Every word strictly adheres to:
  ```typescript
  interface WordKey {
    readonly surah: number;     // 1 to 114
    readonly ayah: number;      // 1 to totalAyahs
    readonly wordIndex: number; // 1-based within Ayah
  }
  ```
- All state management (`SmartMushafState`), observation normalizers (`ObservationNormalizer`), position resolvers (`CanonicalPositionResolver`), and UI spans (`QuranWordSpan`) operate on this exact contract.

### 5. What exact attribution must remain?
**Answer:**
The following clear attribution is preserved in `docs/RIGHTS_AND_SOURCES.md`, application metadata, and UI info dialogs:
> **"Quranic text provided by the Tanzil Project (https://tanzil.net), licensed under the Creative Commons Attribution 3.0 Unported (CC BY 3.0) license. Medina Uthmani orthography preserved. The Quran text itself remains verbatim and unmodified."**

### 6. Does anything in the current implementation actually require QF?
**Answer: NO.**
- The codebase audit confirms:
  - `QuranContentProvider`: fully satisfied by `TanzilQuranProvider`.
  - `SmartMushafState`: completely standalone state machine.
  - `MushafRenderer`: pure DOM rendering with open typefaces.
  - `RecitationSessionEngine`: interfaces directly with provider abstraction.
  - Zero imports, zero URLs, and zero runtime dependencies rely on Quran Foundation or `quran.com` APIs.

---

## 3. Demarcation of Asset Rights

To avoid legal conflation, rights for each layer of the Smart Mushaf are independently audited:

| Asset Layer | Primary Source | Owner / Author | Status / Terms | Clarification |
| :--- | :--- | :--- | :--- | :--- |
| **1. Quran Text** | Tanzil Project (Uthmani) | Hamid Zarrabi-Zadeh | CC BY 3.0 | Verbatim & unmodified text. Attribution retained. Local/static. |
| **2. Primary Quran Typeface** | Amiri Quran | Khaled Hosny | SIL OFL 1.1 | Open font license. Embedding permitted. |
| **3. Secondary Typeface** | Scheherazade New | SIL International | SIL OFL 1.1 | Open font license. Embedding permitted. |
| **4. Latin/Numeral Typeface**| Plus Jakarta Sans | Tokotype | SIL OFL 1.1 | Open font license. Embedding permitted. |
| **5. 604-Page Data** | Medina 1405 AH Standard | Public Reference Standard | `LOGICAL_604_PAGE_GROUPING` | Logical Ayah/Surah grouping only. Does not reproduce authentic printed Madani/QPC physical page layout. |
| **6. Audio Playback** | EveryAyah Archive | Mishary Alafasy / EveryAyah | `NOT_APPROVED_FOR_PRODUCTION` | Unverified license status. Not approved for production until authoritative written license is cited. |
| **7. Mic Audio & Tasmee** | Local Web Audio API | Client Browser Engine | Standard Web API | Local browser audio capture; zero cloud exfiltration. |

---

## 4. Candidate Source Matrix

| Source | Owner | License / Terms | Commercial Use | Audience Constraints | Bundling | Word Data | Network Req. | Replaceable | Rights Status & Blockers |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Tanzil Project (Selected)** | Tanzil / H. Zarrabi-Zadeh | CC BY 3.0 | Permitted with attribution; text verbatim | No user account or age restriction in terms | Yes | Tokenizer derivable | **NO** | Yes | **VERIFIED & LICENSED** (Text immutable) |
| **KFGQPC Dataset** | King Fahd Complex | Unverified | Unverified | Unverified | Unverified | Official text stream | **NO** | Yes | **RIGHTS_STATUS = UNVERIFIED** (No authoritative written license cited) |
| **Quran Foundation (QF)** | Quran Foundation | Proprietary ToS | Commercial Agreement Req. | Restrictive (13+ in standard API ToS) | No (Cloud API) | Native API | **YES** | Yes | **HOLD_FOR_PERMISSION** (Audience conflict with Tabyan 4–100) |

---

## 5. 604-Page Classification & Renderer Boundary

The current 604-page dataset and renderer are formally classified as:
```
604_PAGE_CLASSIFICATION = LOGICAL_604_PAGE_GROUPING
```
- **Factual Scope:** It groups Quranic Ayahs into 604 logical page segments based on traditional Medina page start and end boundaries.
- **Rendering Boundary:** The renderer formats words dynamically using standard CSS/DOM layout (wrapping text per container width). It does **not** reproduce the authentic printed Madani/QPC 15-line layout, line-by-line justification, or exact word-level calligraphic ligatures of the printed King Fahd Complex Mushaf.

---

## 6. Architectural Replaceability Guarantee

The Tabyan codebase strictly honors the `QuranContentProvider` interface contract:
```typescript
export interface QuranContentProvider {
  getSurahList(): Promise<readonly SurahMetaEntry[]>;
  getSurah(surahNumber: number): Promise<Surah>;
  getAyah(surahNumber: number, ayahNumber: number): Promise<Ayah>;
  getWords(surahNumber: number, ayahNumber: number): Promise<readonly QuranWord[]>;
  resolveWord(key: WordKey): Promise<QuranWord | null>;
  getPage(pageNumber: number): Promise<{ reference: PageReference; ayahs: readonly Ayah[] }>;
  getJuz(juzNumber: number): Promise<{ reference: JuzReference; ayahs: readonly Ayah[] }>;
  search(query: string, maxResults?: number): Promise<readonly SearchResult[]>;
}
```

The downstream architecture:
1. `SmartMushafState` (State machine)
2. `MushafRenderer` (Visual presentation)
3. `QuranWordSpan` (Atomic word span with data attributes)
4. `RecitationSessionEngine` (Tasmee orchestration)
5. `ProviderObservationNormalizer` (Data cleaning)
6. `CanonicalPositionResolver` (Sacred text validation)
7. `ObservationStabilizer` (Temporal hysteresis and confirmation)

...is **100% decoupled** from the content source. If an alternative institutional Quran source is approved in the future, only the single class `TanzilQuranProvider` is swapped. No UI, state machine, audio, or verification logic is touched.

---

## 7. Verification Summary

- **Tanzil Text Immutability:** Strictly enforced; Quran text remains verbatim.
- **Child Privacy/Audience Claims:** Factual wording only; no whole-app compliance overstatement.
- **KFGQPC Rights Status:** Set to `UNVERIFIED`.
- **EveryAyah Rights Status:** Set to `NOT_APPROVED_FOR_PRODUCTION`.
- **604-Page Representation:** Documented strictly as `LOGICAL_604_PAGE_GROUPING`.
- **Canonical Provider:** `TanzilQuranProvider`.
- **Runtime Code Changes:** 0.
