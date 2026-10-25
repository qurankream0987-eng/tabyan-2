# Source capture: market-quran-engine

URL: https://quran.ws/docs/reference/licensing/
Fetched: 2026-10-15

ContentsReference

# Licensing

Which licence covers which package, directory by directory, and which material in these
repositories is not ours to license. The policy those licences carry out lives in the
guidelines.

Time

About 4 minutes

The attribution waiver and its scope, the test that separates use from republication, and the
attribution string to carry when it is required are stated once, in
[Waqf and open licensing](https://quran.ws/docs/guidelines/licensing/). What follows is the coverage.

## Package by package

| Package | Licence |
| --- | --- |
| [Quran Text](https://quran.ws/docs/reference/quran-text/) | CC BY 4.0 across the repository, client libraries included |
| [Qiraat Ayah Map](https://quran.ws/docs/reference/qiraat-ayah-map/) | CC BY 4.0 for `data/`; MIT for `scripts/`, `site/`, `tests/` |
| [Quran SVG](https://quran.ws/docs/reference/quran-svg/) | CC BY 4.0 for `mushafs/`; MIT for `tools/` |
| [Quran SVG Elements](https://quran.ws/docs/reference/quran-svg-elements/) | CC BY 4.0 for the decomposition, indexes and docs; MIT for `tools/` |
| [Quran Assets](https://quran.ws/docs/reference/quran-assets/) | MIT for the toolchain; CC BY 4.0 for the catalogue and docs. The ornaments carry their own terms per asset — see below |
| [Quran Engine](https://quran.ws/docs/reference/quran-engine/) | MIT for `crates/`, `packages/`, `scripts/`, `web/`; CC BY 4.0 for `docs/` |
| [Quran Tajweed](https://quran.ws/docs/reference/quran-tajweed/) | CC BY 4.0 for `editions/`, `conformance/`, `docs/` and for the rule corpus and annotations, which carry their own notices in `packages/rules/` and `packages/annotations/`; MIT for the rest of `packages/`, and for `python/`, `playground/`, `scripts/` |
| [QuranTech](https://quran.ws/docs/reference/qurantech/) | CC BY 4.0 for `dist/` and `plugins/`; MIT for `.claude-plugin/` and `evals/` |
| [Quran PNG](https://quran.ws/docs/reference/quran-png/) | MIT for the application; CC BY 4.0 for `data/` and `design/` |

Each repository's `LICENSE` names every top-level directory and which of the two covers it. If you
vendor a subdirectory, read the row for that directory.

**Quran Text is the one place where a single licence covers the code too.** Every client library
bundles the dataset — `hafs.json` and its font travel inside the package — so the data's terms
follow the data rather than an MIT wrapper carrying it, which is what
[Waqf and open licensing](https://quran.ws/docs/guidelines/licensing/) reads on for a product that ships them.

## Material that is not ours to license

Some of what these repositories carry belongs to the people who published it, and it reaches you
under their terms rather than ours.

**The King Fahd Glorious Qurʾān Printing Complex** publishes a complete free digital copy of Muṣḥaf
al-Madīnah — Illustrator files, PDFs, high-quality images and a TrueType font — for free use in
personal and individual work, in government and institutional publications, in digital publishing
and media, and in websites and software. The [muṣḥaf](https://quran.ws/docs/concepts/glossary/#mushaf "The Quran as a written, bound book, in its established order.") text editions, page
artwork and fonts in Quran Text, Quran SVG, Quran SVG Elements, Quran Engine, Quran Tajweed and
Quran PNG come from there, and each repository reproduces the Complex's usage-rights statement in
full, in Arabic and English, in its `LICENSE`. The Complex's own files are preserved unmodified,
with checksums, in the `kfgqpc-resources` archive.

**Quran Assets** is two lineages. Forty of the font-derived [ayah markers](https://quran.ws/docs/concepts/glossary/#ayah_mark "The circle separating one ayah from the next.")
come from families under the SIL Open Font License 1.1 and are ready to use — the OFL text and each
family's notice travel with them in the generated `dist/LICENSES.md`. The scan-derived
[surah headers](https://quran.ws/docs/concepts/glossary/#surah-header "The decorated banner printed at the start of a surah, with the surah's name inside it."), markers and [page frames](https://quran.ws/docs/concepts/glossary/#page-frame "The decorative border drawn around the text block of a muṣḥaf page.")
are traced from ornaments printed in scanned muṣḥafs, and permission is being settled with each
publisher; `catalog.json` records where each one stands. Every
asset records the muṣḥaf, the archive item, the source PDF's SHA-256, the page and the crop box it
came from, so each source is resolved on its own rather than the whole set waiting on the slowest.

## Accuracy

The material is provided as is, without warranty, as stated in the MIT License and in CC BY 4.0
§§5 and 6. What that leaves with a publisher of Qurʾānic text, and where corrections go, is in
[Waqf and open licensing](https://quran.ws/docs/guidelines/licensing/); pinning a corrected release is
[Pinning](https://quran.ws/docs/reference/versioning/).

A note for licence scanners

The `LICENSE` files combine the two licences with a coverage table, so GitHub’s detector
reports `NOASSERTION` for most repositories. That means “could not classify”, not
“no licence”. The SPDX expression is `MIT AND CC-BY-4.0`, split by directory as the
table above shows, and the full CC BY 4.0 text is in `LICENSES/CC-BY-4.0.txt` in each repository.

This page describes what the licence files say; it is not legal advice, and each repository's own
`LICENSE` is the binding text.

[PinningHow to pin a dataset, and what a digest proves.](https://quran.ws/docs/reference/versioning/) [Sources and provenanceWhich published source each dataset was built from, commit by commit.](https://quran.ws/provenance/) [Quran TextThe package whose licence covers its client libraries too.](https://quran.ws/docs/reference/quran-text/)