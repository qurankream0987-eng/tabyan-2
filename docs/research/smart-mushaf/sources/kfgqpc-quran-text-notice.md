Source: https://github.com/quran-ws/quran-text/blob/main/NOTICE.md
Title: quran-text/NOTICE.md at main · quran-ws/quran-text · GitHub
Fetched: 2026-10-15T02:09:22.959Z

[Skip to content](https://github.com/quran-ws/quran-text/blob/main/NOTICE.md#start-of-content)

You signed in with another tab or window. [Reload](https://github.com/quran-ws/quran-text/blob/main/NOTICE.md) to refresh your session.You signed out in another tab or window. [Reload](https://github.com/quran-ws/quran-text/blob/main/NOTICE.md) to refresh your session.You switched accounts on another tab or window. [Reload](https://github.com/quran-ws/quran-text/blob/main/NOTICE.md) to refresh your session.Dismiss alert

{{ message }}

## Collapse file tree

## Files

main

Search this repository(forward slash)` forward slash/`

/

# NOTICE.md

Copy path

Blame

More file actions

Blame

More file actions

## Latest commit

[![AbdullahObaid](https://avatars.githubusercontent.com/u/1207636?v=4&size=40)](https://github.com/AbdullahObaid)[AbdullahObaid](https://github.com/quran-ws/quran-text/commits?author=AbdullahObaid)

[Adopt the standard Quran.ws licence notice, keeping one licence acros…](https://github.com/quran-ws/quran-text/commit/eba6aaed8c3af6a1c07e6d177000730323a41372)

Open commit detailsfailure

last monthSep 12, 2026

[eba6aae](https://github.com/quran-ws/quran-text/commit/eba6aaed8c3af6a1c07e6d177000730323a41372) · last monthSep 12, 2026

## History

[History](https://github.com/quran-ws/quran-text/commits/main/NOTICE.md)

Open commit details

[View commit history for this file.](https://github.com/quran-ws/quran-text/commits/main/NOTICE.md) History

89 lines (68 loc) · 4.14 KB

/

# NOTICE.md

Copy path

Top

## File metadata and controls

- Preview

- Code

- Blame


89 lines (68 loc) · 4.14 KB

[Raw](https://github.com/quran-ws/quran-text/raw/refs/heads/main/NOTICE.md)

Copy raw file

Download raw file

You must be signed in to make or propose changes

More edit options

Outline

Edit and raw actions

# Licence and attribution

[Permalink: Licence and attribution](https://github.com/quran-ws/quran-text/blob/main/NOTICE.md#licence-and-attribution)

`LICENSE` is the standard Quran.ws notice: **CC BY 4.0** across this repository,
with a standing waiver of attribution for use inside a product. The full legal
text is in `LICENSES/CC-BY-4.0.txt`. This file says what the licence covers,
what it cannot cover, and the attribution to carry when it is asked for.

## What is licensed

[Permalink: What is licensed](https://github.com/quran-ws/quran-text/blob/main/NOTICE.md#what-is-licensed)

Everything in this repository that this project authored:

|  |  |
| --- | --- |
| the word index and its numbering | `data/word-index.*`, `data/ayah-map.*` |
| the seven muṣḥaf files and derived layers | `data/mushaf/`, `data/counting.json` |
| the counting analysis and its citations | `sources/counting/khilaf.json`, `declared.json`, `open-findings.json` |
| the alignment data | `sources/alignment/` |
| the pipeline and the service | `pipeline/`, `service/` |
| the schemas, the reports, the documentation | `schema/`, `data/reports/`, `docs/` |

Word-level data is **derived** here — no source package contains it — and that
derivation, together with the alignment, the numbering and the counting
analysis, is the work being licensed. See `docs/sources.md`.

## The client libraries are CC BY 4.0 too

[Permalink: The client libraries are CC BY 4.0 too](https://github.com/quran-ws/quran-text/blob/main/NOTICE.md#the-client-libraries-are-cc-by-40-too)

`lib/` carries the same licence as everything else, and each package ships a
copy of it. One licence covers the whole repository: the dataset, the pipeline,
the docs and the six client libraries.

That is a deliberate choice against the usual advice. Creative Commons
discourage CC BY for software — it grants no patent rights and does not define
"source form" — and MIT is what a developer pulling `quran-text` from PyPI, npm,
Packagist, pub.dev or Maven Central would expect. But every one of those
packages **bundles the dataset**: `hafs.json` and its font travel inside them.
Licensing the wrapper under MIT while the data it carries is CC BY 4.0 would put
two licences in one package and, in practice, let the data reach people with the
attribution stripped — which is the one thing this licence exists to prevent.

So the link requirement holds wherever the data goes. If you need the library
code under different terms, ask.

## What is not licensed here

[Permalink: What is not licensed here](https://github.com/quran-ws/quran-text/blob/main/NOTICE.md#what-is-not-licensed-here)

**The Qurʾānic text is not this project's to license.** Nor are the packages it
was read from:

|  |  |
| --- | --- |
| `sources/kfgqpc/*.zip` | KFGQPC distributions, redistributed unmodified |
| `data/fonts/*.ttf` | KFGQPC fonts, copied unmodified from those packages |

These are the work of the **King Fahd Glorious Qurʾān Printing Complex**, are
included as received, and remain under KFGQPC's own terms. Those terms are the
Complex's published usage rights, reproduced in full in Arabic and English in
`LICENSE`. Nothing in `LICENSE` grants any right in them beyond what the
Complex itself grants there.

`sources/counting/book-boundary-primitives.json` and `counting-systems.json` are
copied verbatim from
[quranpedia/qiraat-ayah-map](https://github.com/quranpedia/qiraat-ayah-map)
(MIT) at a pinned commit; see `sources/counting/UPSTREAM.md`.

## Attribution: waived in products, asked for on republication

[Permalink: Attribution: waived in products, asked for on republication](https://github.com/quran-ws/quran-text/blob/main/NOTICE.md#attribution-waived-in-products-asked-for-on-republication)

**Building this data into an application, website, service, API, bot, tool,**
**research work or product needs no credit at all.** As rights holder we grant a
permanent, worldwide, royalty-free, irrevocable waiver of CC BY 4.0's
attribution requirement (§3(a)) for that use, free or commercial, including
when the dataset is bundled inside the application for offline operation. That
covers the client libraries too. Credit is always appreciated and never
required.

Attribution is asked for when the data **itself** is republished as a resource
in its own right — a mirror, a bulk dump, a downloadable export, an endpoint
that serves the corpus, or a repository that vendors these files. The test: if
a third party can obtain the data _as data_ from what you distribute, that is
republication.

When it applies, this is the form:

> quran-text by quran-ws — [https://github.com/quran-ws/quran-text](https://github.com/quran-ws/quran-text) — CC BY 4.0

**The link is the point** — it is how anyone who receives this data from you can
reach corrections and later releases. If you changed the data, say so:
§3(a)(1)(B) asks you to mark modifications, and it matters here more than in
most datasets.

Copyright © 2026 quran-ws.

You can’t perform that action at this time.