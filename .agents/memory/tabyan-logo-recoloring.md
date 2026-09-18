---
name: Tabyan logo asset recoloring
description: Safe way to change Tabyan logo color without changing lettering, ornaments, dimensions, or transparency.
---

Recolor existing logo PNGs programmatically rather than using generative image editing when the request is color-only; preserve the original dimensions, alpha channel, and pixel composition.

**Why:** Generative editing changed the logo canvas and subtly redrew the lettering/ornament, while an ImageMagick colorize pass preserved the asset contract and produced the requested gold treatment.

**How to apply:** Keep original assets as the reference, create a same-size derived asset with a gold colorize operation, inspect it visually on the real burgundy app background, and verify dimensions plus alpha before wiring it into the app.