> Superseded: the width-first desktop result below was rejected. See [fit-page correction](MUSHAF_FIT_PAGE_CORRECTION.md) for the current implementation and verification.

# Mushaf visual redesign verification

Local Chromium screenshots use the existing development-only `?demo=student` mode.
No authentication, routing, backend, database, deployment or publishing changes.

## Rendered results

| Viewport | Paper width | Paper ratio | Result |
| --- | ---: | --- | --- |
| Desktop 1440 × 900 | 680px | 622 / 917 | PASS |
| Tablet 768 × 1024 | 614.4px | 622 / 917 | PASS |
| Mobile 390 × 844 | 374px | 622 / 917 | PASS |

Pages 1, 2, 3, 187, 250 and 604 checked at each viewport. DOM glyphs, verse keys,
positions and marker types matched the existing page JSON; each expected QCF2 page
font loaded. Light-mode Quran ink is black; dark-mode ink remains warm ivory.
The lower unused paper area measured approximately 2.5–4.5%, including opening pages.
Bismillah remains absent as expected on Al-Fatiha's separate-header row and At-Tawbah,
and present on page 2 and all three applicable Surah starts on page 604.

100%, 150%, 200% and 300% zoom checked. At 300%, all four paper edges are reachable
by panning at each viewport. Removing forced GPU layer promotion preserves sharp
transformed glyph rendering. Keyboard page navigation passed.

320, 360, 375, 390, 414 and 430px phone widths have no horizontal overflow at 100%.
At 320 × 568, touch scrolling moved the viewport without navigating; an RTL horizontal
swipe navigated from page 3 to page 4.

## Evidence

- [Desktop](../screenshots/mushaf-redesign/desktop-p3.png)
- [Tablet](../screenshots/mushaf-redesign/tablet-p3.png)
- [Mobile](../screenshots/mushaf-redesign/mobile-p3.png)
- [Al-Fatiha](../screenshots/mushaf-redesign/mobile-p1.png)
- [Al-Baqarah opening](../screenshots/mushaf-redesign/mobile-p2.png)
- [Final page](../screenshots/mushaf-redesign/mobile-p604.png)
- [Dark mode](../screenshots/mushaf-redesign/mobile-dark.png)
- [Measurements](../screenshots/mushaf-redesign/measurements.json)
- [300% pan checks](../screenshots/mushaf-redesign/pan-measurements.json)
- [Touch checks](../screenshots/mushaf-redesign/touch-measurements.json)

## Code checks

- 34 Mushaf tests across 6 files: PASS.
- Web TypeScript: PASS.
- Native TypeScript: PASS.
- Local Vite production build with PORT=5173 and BASE_PATH=/: PASS.
- git diff --check: PASS.
- Quran page and font assets: unchanged.

Native shell presentation was updated and typechecked. Native simulator/device visual
verification was not performed. Browser viewport results above do not claim native
runtime verification. Existing unrelated working-tree modifications were preserved.
