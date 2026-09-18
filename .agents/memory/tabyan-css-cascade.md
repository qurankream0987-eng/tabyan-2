---
name: Tabyan CSS cascade traps
description: Unlayered global rules in tabyan's index.css silently beat Tailwind utility classes — check them before assuming a class is dead.
---

# Tabyan CSS cascade traps

Tabyan's `index.css` mixes Tailwind layers with **unlayered** author rules. Unlayered styles beat every `@layer` (including Tailwind's utilities layer), so a Tailwind class on an element can silently lose to a global rule.

Known global traps:
- `svg { color: var(--svg-primary) }` — every icon renders burgundy (light) / gold (dark) regardless of `text-*` classes. To color an icon differently, add its container to the adjacent `color: inherit` selector list, or write a more specific unlayered selector (e.g. `.my-shell svg`).
- `:where(html:not(.dark)) [class*="bg-gold/"] { color: #800020 }` — an element combining `bg-gold/x` with `text-gold` turns burgundy in light mode.
- Card borders are forced via `!important` on `.glass, .card-bubble, .shadow-card, [data-slot="card"]`.

**Why:** debugging "my Tailwind class does nothing" here wasted real effort; the class was alive but out-ranked.
**How to apply:** when a color class seems dead on an element in this app, grep index.css for unlayered rules targeting the element/tag before concluding the class is ungenerated.
