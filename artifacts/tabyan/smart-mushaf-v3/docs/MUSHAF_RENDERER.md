# Tabyan Smart Mushaf — Mushaf Renderer Specification
**Document Version:** 1.0.0  
**Status:** Approved for Production  

---

## 1. Principles of Quranic Rendering

1. **Word-Level Interactive Identity:**
   Every single word in the Quran is wrapped in a discrete, memoized `QuranWordSpan` element with an explicit `data-word-key="surah:ayah:wordIndex"` attribute.

2. **RTL Typography Excellence:**
   Layout is strictly right-to-left (`dir="rtl"`). Authentic Quranic typefaces are applied:
   - Primary: `Amiri Quran` (authentic Medina calligraphy with complex ligatures and vowel stacking)
   - Secondary: `Scheherazade New` / `Noto Naskh Arabic`
   - Numbers and labels: `Plus Jakarta Sans` with `tabular-nums`

3. **Visual State Model:**
   ```
   NORMAL:     Standard visible ink (#2C1E22 / #EAD8C7)
   HIDDEN:     Obscured text with layout-preserving blur filter (prevents line reflow)
   CURRENT:    Active focus indicator (#C5A059 gold ring, subtle scale)
   CONFIRMED:  Vibrant revealed ink with confirmed state marker
   INCORRECT:  Restrained wavy coral underline (#9E2A2B) with tooltip
   SKIPPED:    Dashed amber underline indicator (#B07D1E)
   REPEATED:   Subtle slate badge (non-punitive)
   REVEALED:   Manually unmasked hint state
   UNKNOWN:    Zero fabricated feedback
   ```

4. **Layout Strategies:**
   - `CONTINUOUS_QURAN_LAYOUT`: Fluid, responsive continuous reading view with ornamental Surah banners and calligraphic Basmalas.
   - `AUTHENTIC_604_PAGE_LAYOUT`: Page-by-page framing reflecting standard Medina 604-page boundaries.
