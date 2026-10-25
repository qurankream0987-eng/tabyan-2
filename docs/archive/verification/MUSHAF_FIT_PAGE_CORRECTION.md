# Mushaf fit-page correction

## Root cause
The preceding patch sized desktop paper by width alone (680 × 1003px) and measured
the expanding content stage. At 1440 × 900, that paper exceeded the reading viewport.
This correction measures the fixed viewport between reader controls and fits both
width and height on desktop/tablet. Phones remain width-first.

## Implementation
- Original 622 / 917 page ratio retained.
- At 1440 × 900: paper approximately 483 × 712px inside a 1440 × 728px viewport.
- 100% has no desktop vertical overflow. User zoom remains separate, up to 300%.
- Page row occupancy comes from existing line numbers, with no page/Surah exceptions.
- Header uses a compact band near the upper paper margin.
- Paper radius 6px, very subtle shadow; Quran stays black in light mode.
- Quran data, glyphs, font assets, verse markers, and 604-page mapping unchanged.

## Browser verification
Screenshots visually inspected for desktop 1440 × 900, tablet 768 × 1024,
and mobile 390 × 844. Pages 1, 2, 3, 187, 250 and 604 passed at each size:
complete paper visible, all glyph bounds within paper, expected QCF font loaded,
DOM glyphs/verse keys/positions/marker types match source JSON, RTL preserved.
Al-Fatiha contains all seven ayat, including its QCF Bismillah and all markers.
Phone widths 320, 360, 375, 390, 414 and 430px have no horizontal overflow at 100%.
Zoom 150%, 200%, 300%, navigation and dark mode checked. All four page edges remain
reachable at 300% on desktop, tablet and mobile.

- [Desktop Al-Fatiha](../screenshots/mushaf-fit-page/desktop-fatiha.png)
- [Desktop middle page](../screenshots/mushaf-fit-page/desktop-p250.png)
- [Desktop final page](../screenshots/mushaf-fit-page/desktop-p604.png)
- [Desktop Al-Baqarah opening](../screenshots/mushaf-fit-page/desktop-p2.png)
- [Mobile Al-Fatiha](../screenshots/mushaf-fit-page/mobile-p1.png)
- [Measurements](../screenshots/mushaf-fit-page/measurements.json)
- [300% pan checks](../screenshots/mushaf-fit-page/pan-measurements.json)

38 Mushaf tests passed. Web and native TypeScript passed. Local production build
passed. git diff --check passed. Native presentation changes were typechecked;
no native simulator was used. No backend, database, auth, API, native configuration,
deployment or publishing changes were made by this correction.
