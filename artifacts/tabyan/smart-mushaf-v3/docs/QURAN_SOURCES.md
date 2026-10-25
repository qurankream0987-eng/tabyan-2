# Tabyan Smart Mushaf — Quran Content Sources & Integration
**Document Version:** 1.0.0  

---

## 1. Primary Text Source: Tanzil Uthmani Standard
- **Source:** Tanzil Project (https://tanzil.net)
- **Rasm:** Medina Uthmani Orthography (Hafs 'an 'Asim standard)
- **License:** Creative Commons Attribution 3.0 Unported / Open Public Reference
- **Word Tokenization:** Standard white-space and ligature-preserving tokenization.
- **Verse Counts:** Standard 6,236 verses across 114 Surahs.

## 2. Page & Juz Structural Divisions
- **Madani 604-Page Standard:** Divisions established in King Fahd Complex 1405 AH edition.
- **Juz Divisions:** Standard 30 Ajza' with canonical Ayah start/stop boundaries.

## 3. Replaceability Contract
The app relies solely on `QuranContentProvider`. If Tabyan switches in Replit to:
- King Fahd Complex Direct API
- Quran.com v4 API
- Internal Tabyan Postgres Quran Database
Only the `QuranContentProvider` implementation changes. Zero UI or state reducer alterations are needed.
