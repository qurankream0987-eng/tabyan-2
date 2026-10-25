# Tabyan Smart Mushaf — Rights & Sources Registry
**File:** `docs/RIGHTS_AND_SOURCES.md`  
**Purpose:** Mandatory rights, licensing, and attribution ledger for all runtime and build assets.  
**Strict Policy:** No unverified, unauthorized, or unknown-rights QCF/QPC/KFGQPC fonts, model weights, or proprietary data are bundled.

---

## Runtime Resources Inventory

### 1. Tanzil Uthmani Quran Canonical Text
- **NAME:** Tanzil Uthmani Script Dataset (Hafs 'an 'Asim)
- **SOURCE:** Tanzil Project — official download page (https://tanzil.net/download/)
- **VERSION:** 1.1, published February 2021; downloaded 2026-10-16 as Uthmani text with ayah numbers, pause marks, sajdah signs, and tatweel enabled.
- **SOURCE FILE:** `src/quran/data/tanzil-uthmani.txt` (the downloaded file is preserved verbatim).
- **SOURCE SHA-256:** `6933e133dd56db778c801bf738848454e43648105a151e8d84d86a7cae39ec5f`
- **OWNER:** Tanzil Project / Hamid Zarrabi-Zadeh
- **LICENSE/TERMS:** Creative Commons Attribution 3.0 Unported (CC BY 3.0). Tanzil Quran text may be copied and distributed under its published terms.
- **IMMUTABILITY MANDATE:** The Quran text itself must remain **verbatim and unmodified**. Tabyan creates derived metadata such as `WordKey` and token indexes, but `SOURCE_QURAN_TEXT` remains strictly immutable.
- **ATTRIBUTION:** The full notice is included in `docs/TANZIL_LICENSE.txt`; the reader's settings modal displays Tanzil Project attribution, CC BY 3.0, and a link to https://tanzil.net/.
- **AUDIENCE & DATA USAGE:** Tanzil's published Quran text terms do not require user accounts or impose an age restriction, and Tabyan serves the Quran text locally without sending user data to Tanzil.
- **USED_FOR:** Canonical Quran domain text, Surah metadata, Ayah divisions, word tokenization, and search indexing.
- **BUNDLED_OR_REMOTE:** Bundled as verified canonical static dataset.
- **REPLACEABLE:** YES — encapsulated strictly behind the `QuranContentProvider` interface.
- **VERIFICATION:** The source hash is checked in `src/tests/quranDataIntegrity.test.ts`; all 6,236 numbered ayahs map to the 114-surah metadata registry, and every provider ayah is compared to its verbatim source row.
- **STATUS:** VERIFIED & LICENSED (text immutable; font and page-layout rights remain separate).

---

### 2. Amiri Quran & Amiri Typeface
- **NAME:** Amiri Quran & Amiri Font Family
- **SOURCE:** Google Fonts / Khaled Hosny (https://github.com/aliftype/amiri)
- **OWNER:** Khaled Hosny, Sebastian Kosch
- **LICENSE/TERMS:** SIL Open Font License, Version 1.1 (OFL-1.1)
- **USED_FOR:** High-fidelity Arabic Uthmani Quranic typography, basmala calligraphy, and Surah headers.
- **BUNDLED_OR_REMOTE:** Loaded via secure Google Fonts CDN with local CSS font-display swap.
- **REPLACEABLE:** YES — typeface definitions are isolated in `src/theme/fonts.ts` and `src/index.css`.
- **STATUS:** VERIFIED & LICENSED.

---

### 3. Scheherazade New Font
- **NAME:** Scheherazade New
- **SOURCE:** SIL International / Google Fonts (https://software.sil.org/scheherazade/)
- **OWNER:** SIL International
- **LICENSE/TERMS:** SIL Open Font License, Version 1.1 (OFL-1.1)
- **USED_FOR:** Secondary Quranic text option for clear Nastaliq/Naskh legibility on low-resolution displays.
- **BUNDLED_OR_REMOTE:** Loaded via Google Fonts CDN.
- **REPLACEABLE:** YES.
- **STATUS:** VERIFIED & LICENSED.

---

### 4. Plus Jakarta Sans Font
- **NAME:** Plus Jakarta Sans
- **SOURCE:** Google Fonts / Tokotype (https://github.com/tokotype/PlusJakartaSans)
- **OWNER:** Tokotype
- **LICENSE/TERMS:** SIL Open Font License, Version 1.1 (OFL-1.1)
- **USED_FOR:** Clean, high-legibility tabular numerals, Ayah numbers, and Latin UI labels.
- **BUNDLED_OR_REMOTE:** Loaded via Google Fonts CDN.
- **REPLACEABLE:** YES.
- **STATUS:** VERIFIED & LICENSED.

---

### 5. Lucide Icons
- **NAME:** Lucide React
- **SOURCE:** Lucide Project (https://lucide.dev)
- **OWNER:** Lucide Contributors
- **LICENSE/TERMS:** ISC License
- **USED_FOR:** Functional UI affordances (microphone, search, bookmarks, play, pause, chevron navigation, restart).
- **BUNDLED_OR_REMOTE:** Bundled npm package.
- **REPLACEABLE:** YES.
- **STATUS:** VERIFIED & LICENSED.

---

### 6. Madani 604-Page Coordinate Registry
- **NAME:** Madani 604-Page Structural Index
- **SOURCE:** Medina Mushaf Standard Page References (King Fahd Complex Standard Divisions)
- **CLASSIFICATION:** `LOGICAL_604_PAGE_GROUPING`
- **SCOPE & BOUNDARY:** Ayah/Surah logical boundary mapping across 604 logical pages. Does **not** reproduce the authentic printed Madani/QPC physical page layout, line-by-line justification, or printed glyph ligatures.
- **USED_FOR:** Structural page navigation (Page 1 to 604) and Surah/Juz boundary mapping.
- **BUNDLED_OR_REMOTE:** Bundled in `src/quran/data/pages.ts`.
- **REPLACEABLE:** YES.
- **STATUS:** VERIFIED FACTUAL INDEX.

---

### 7. Audio Recitation Sample (Mishary Rashid Al-Afasy)
- **NAME:** EveryAyah Audio Recitation CDN
- **SOURCE:** EveryAyah.com (Alafasy_128kbps)
- **OWNER:** Unverified third-party audio repository
- **LICENSE/TERMS:** Unverified license terms
- **PRODUCTION APPROVAL STATUS:** `NOT_APPROVED_FOR_PRODUCTION`
- **POLICY:** Not approved for production until an authoritative written license is cited and verified. Must not be bundled or relied on for production releases.
- **USED_FOR:** Non-production reading demo only.
- **BUNDLED_OR_REMOTE:** Streamed remotely on-demand by Ayah key.
- **REPLACEABLE:** YES — encapsulated in `AudioPlaybackService`.

---

## Explicitly Excluded Resources (Not Bundled)

| Asset Category | Exclusion Reason | Future Path in Replit |
| :--- | :--- | :--- |
| **KFGQPC V1/V2 QCF Fonts & Datasets** | `RIGHTS_STATUS = UNVERIFIED`. Complex proprietary licensing and lack of authoritative open written license. | If Tabyan acquires enterprise license, load via private authenticated CDN. |
| **Qurani.ai Live Client API Key** | Security requirement: Client-side browser bundle must NEVER contain provider secrets. | Server-side WebSocket proxy in Replit backend (`server/routes/qrc.ts`). |
| **Proprietary ML Voice Models** | Client runs pure Web Audio capture; recognition is delegated to provider abstraction. | Cloud/Backend inference. |
