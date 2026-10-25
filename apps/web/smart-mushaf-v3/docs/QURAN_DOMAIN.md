# Tabyan Smart Mushaf — Canonical Quran Domain Model
**Specification Version:** 1.0.0  
**Status:** Canonical & Immutable  

---

## 1. Principles of Quranic Data Integrity

1. **Sacred Text Immutability:**
   Quranic tokens and diacritical marks (tashkeel, dagger alefs, stops) are never altered, normalized in-place, or stripped in the presentation layer. Diacritic stripping is strictly confined to `textSimple` for phonetic matching and search indexing.

2. **Immutable WordKey Identity:**
   ```ts
   export interface WordKey {
     readonly surah: number;     // 1..114
     readonly ayah: number;      // 1..totalAyahs
     readonly wordIndex: number; // 1-based canonical index within Ayah
   }
   ```
   All progress tracking, bookmarks, student assessments, mistakes, and recitation highlights are anchored to this tuple.

3. **Strict 1-Based Policy:**
   - Surahs: `1` to `114`
   - Ayahs: `1` to `N`
   - Words: `1` to `W`
   Provider adapters that use 0-based indices MUST translate at the boundary.

4. **Entity Hierarchy:**
   - `Surah`
     - `Ayah`
       - `QuranWord` (holds `WordKey`, `textUthmani`, `textSimple`, `page`, `juz`, `hizb`)
