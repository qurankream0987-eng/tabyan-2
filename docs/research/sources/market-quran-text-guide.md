# Source capture: market-quran-text-guide

URL: https://quran.ws/docs/reference/quran-text/
Fetched: 2026-10-15

ContentsReference

# Quran Text

The text itself, as a data structure. Seven printed editions, each addressable by surah, ayah, page,
juz or word position — and one number per word that means the same word in every one of them.

Blocks used

[Quran Text](https://quran.ws/blocks/quran-text/)

Platforms

JavaScript · Python · PHP · Dart · Swift · Kotlin

Time

About 12 minutes

## The shortest thing that works

Ḥafṣ — the [riwayah](https://quran.ws/docs/concepts/glossary/#riwayah "What is attributed to a transmitter from an imam of a qiraah, such as the riwayah of Hafs from Asim.") most of the world prints — is bundled with every client
library, so the first call needs no file and no configuration.

```js
import { Mushaf } from "quran-text";

const m = await Mushaf.hafs();

m.ayah(1, 4).text;                                 // مَٰلِكِ يَوۡمِ ٱلدِّينِ
m.ayah(1, 4).render({ marks: true, ayahMarks: true });
m.page(1).lines.length;                            // 7
m.word(1, 4, 1).number;                            // 11 — the same word in all seven riwayat
m.search("مالك يوم الدين");                        // [Span] at positions 10–13
```

مَٰلِكِ يَوۡمِ ٱلدِّينِ

1:4 · Ḥafṣ · m.ayah(1, 4).text

The same six lines exist in Python, PHP, Dart, Swift and Kotlin. Method names follow each language's
convention (`ayah_marks` in Python, `ayahMarks` elsewhere); nothing else changes.

Not on a registry yet

At the commit this page was written against, the repository is private, has no tags, and nothing is
published to npm, PyPI, Packagist, pub.dev or Maven Central. Installing means installing from the
directory — `pip install ./lib/python` — or copying the single source file in. Publishing the six
packages is an open decision in the repository’s own launch notes, not an oversight.

## What ships

Two files are normative — specified, schema-checkable, and the thing "the format" refers to.
Everything else is a generated view of them.

| File | Normative | Answers |
| --- | --- | --- |
| `data/mushaf/<edition>.json` | yes | one [muṣḥaf](https://quran.ws/docs/concepts/glossary/#mushaf "The Quran as a written, bound book, in its established order."): its words by position, with ayah, page, line, juz and mark layers |
| `data/word-index.json` | yes | what word number _n_ is, who reads it, how each edition spells it, and where it sits in Ḥafṣ |
| `data/mushaf/<edition>.nested.json.gz` | view | the same muṣḥaf as surah → ayah → words |
| `data/mushaf/<edition>.csv.gz` | view | the same muṣḥaf as one row per word |
| `data/differences.json` | view | only the words where the editions disagree about letters, the ā, presence or boundary |
| `data/ayah-map.json` | view | what a Kufan ayah reference is in each of the seven editions |
| `data/counting.json` | view | the six counting systems as word numbers, and which system each edition follows |
| `data/word-index.csv` | view | the word index as a table |
| `data/quran.sqlite.gz` | view | all seven editions and the word index, queryable in SQL |
| `data/fonts/<file>.ttf` | — | the publisher's font each edition's text is set in — see [Ship the font](https://quran.ws/docs/reference/quran-text/#ship-the-font) |
| `data/catalog.json` | — | the index: every edition, every surah, every file with the question it answers |
| `data/manifest.json` | — | the SHA-256 of every source package and every emitted file |

Start at `data/catalog.json`. It lists the seven editions with their counts and file paths, so you
can build a picker without opening a 2 MB muṣḥaf file first.

There is no per-surah file: a surah, a page and a juz are all slices of one array. That
also means the smallest download for one ayah is the whole edition — see [Limits](https://quran.ws/docs/reference/quran-text/#limits).

## The seven editions

| `edition` | Riwayah | Qāriʾ | Counting system | Ayat printed | Words | Basmalah numbered |
| --- | --- | --- | --- | --- | --- | --- |
| hafs | Ḥafṣ | ʿĀṣim al-Kūfī | Kufi Numbering | 6,236 | 77,432 | yes |
| shubah | Shuʿbah | ʿĀṣim al-Kūfī | Kufi Numbering | 6,236 | 77,432 | yes |
| warsh | Warsh | Nāfiʿ al-Madanī | Last Madani Numbering | 6,214 | 77,431 | no |
| qalun | Qālūn | Nāfiʿ al-Madanī | Last Madani Numbering | 6,214 | 77,431 | no |
| duri | Dūrī | Abū ʿAmr al-Baṣrī | First Madani Numbering | 6,217 | 77,431 | no |
| susi | Sūsī | Abū ʿAmr al-Baṣrī | First Madani Numbering | 6,218 | 77,431 | no |
| bazzi | Bazzī | Ibn Kathīr al-Makkī | Makki Numbering | 6,220 | 77,432 | yes |

Read at build time from `public/demo/fatiha.json`, which `scripts/sync-demo-data.mjs` built from each muṣḥaf file’s own header at the pinned commit in `public/demo/SOURCES.json`.

`edition` in the first column is the string you pass everywhere — file names, library calls, the
download service's `edition=` parameter.

Each of these is a printed muṣḥaf on its own terms: 604 pages, its own spelling, its own
[waqf marks](https://quran.ws/docs/concepts/glossary/#waqf "Stopping the recitation at a place in the text according to the rules of stopping and starting.") and its own ayah count. None of them is a font applied over Ḥafṣ.

## The shape on disk

A muṣḥaf file is one flat array of word strings, and every other layer is a sorted list of positions
into that array.

```json
{
  "format": "quran-mushaf", "format_version": "1.0", "generated": "2026-09-08",
  "mushaf":   { "key": "warsh", "name_en": "Warsh", "word_count": 77431, "…": "…" },
  "counting": { "system": "madani-last", "ayah_count": 6214, "basmalah_counted": false, "…": "…" },
  "provenance": { "text": { "package": "UthmanicWarsh-v-3.0.zip", "sha256": "…" }, "…": "…" },
  "font":     { "family": "KFGQPC Warsh Uthmanic Script", "file": "UthmanicWarsh-v-3.0.ttf", "…": "…" },
  "layers":   { "present": ["surahs", "ayahs", "pages", "lines", "marks", "juz"], "absent": { "…": "…" } },

  "words": ["بِسْمِ", "…"],
  "numbering": { "total": 77434, "missing": [25685, 60522, 69720], "written_joined": [] },

  "surah_starts": [0, 29, "…"],
  "ayah_starts":  [4, 8, 10, "…"],
  "page_starts":  [0, 29, "…"],
  "line_starts":  [0, 4, "…"],
  "juz_starts":   [0, 2522, "…"],

  "surahs":     [{ "number": 1, "name_en": "Al-Fātiḥah", "ayah_count": 7, "first_ayah": 0, "…": "…" }],
  "marks":      [[192, 0], "…"],
  "mark_types": [{ "kind": "division", "side": "before", "sign": "۞" }, "…"],
  "mark_signs": { "ۖ": { "cp": "U+06D6", "unicode_name": "…" } }
}
```

**Unit _k_ is `words.slice(starts[k], starts[k + 1] ?? words.length)`.** That holds for every array
whose key ends in `_starts`, in all seven files, with nothing to filter out.

Positions and numbers are different integers

Every `*_starts` array, and `marks[i][0]`, holds a **position**: an index into _this_ edition's
`words`. Only the `numbering` block holds a **number**: the identity shared across all seven
editions. They are close in value and never equal — Ḥafṣ position `10` is number `11` — so mixing
them shifts your text by a word or two and throws nothing. No field in the format holds both kinds.

## Addressing the text

Three of these are properties of the edition and one is not.

| You want | Address | Notes |
| --- | --- | --- |
| a surah | `m.surah(n)` | 1–114, identical in every edition |
| an ayah | `m.ayah(surah, n)` | `n` is **this edition's own** count — see below |
| a page | `m.page(n)` | 1–604 in all seven; read from the source's own page breaks |
| a juz | `m.juz(n)` | 1–30; absent in al-Bazzī, whose source carries none — check `m.has("juz")` |
| a printed line | `m.line(page, n)` | reconstructed, not read. Layout aid, not a citable fact |
| a word in an ayah | `m.word(surah, ayah, i)` | `i` is 1-based within the ayah |
| a word by position | `m.wordAt(position)` | 0-based index into `words` |
| a word across editions | `m.wordByNumber(n)` | `null` where this edition does not read it |

Without a library, the arithmetic for `(surah, n)` → ayah is two lines, and it is the only piece of
index arithmetic the format asks of you:

```js
// Verified against data/mushaf/warsh.json
const s = m.surahs[surah - 1];
const i = s.first_ayah + n - 1;               // index into ayah_starts
const words = m.words.slice(m.ayah_starts[i], m.ayah_starts[i + 1] ?? m.words.length);
```

```js
ayahWords(1, 1);   // ࡴ۬لْحَمْدُ لِلهِ رَبِّ ࡴ۬لْعَٰلَمِينَ
ayahWords(2, 253); // ࡰ۬للَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ࡰ۬لْحَيُّ ࡲ۬لْقَيُّومُ
```

That second line is the point of the next section: in Warsh, `2:253` is the opening of the ayah that
Ḥafṣ numbers `2:255`.

## Ayah numbers belong to the edition

Every edition here carries its own `counting` block ( [ayah counting](https://quran.ws/docs/concepts/glossary/#ayah-counting "The scholarly tradition that decides where each verse ends — and so how many verses there are.")
differs by edition), and `m.ayahCount` is what that edition prints, not a constant.

A reference without its edition is not a reference

`warsh.ayah(2, 255)` does not throw and does not return āyat al-Kursī. It returns the ayah Warsh
numbers 255, which is a different passage. Nothing in the type system stops you passing a Ḥafṣ
reference to another edition; the only symptom is the wrong text on screen.

Convert instead of assuming. Both directions are one call, and the result names its relation:

```js
const hafs  = await Mushaf.hafs();
const warsh = await Mushaf.load("data/mushaf/warsh.json");   // Node
// browser: Mushaf.fromJson(await (await fetch(url)).json())

hafs.ayah(1, 4).to(warsh).key;          // "1:3"        relation "same"
hafs.ayah(2, 255).to(warsh).key;        // "2:253-254"  relation "split"
warsh.ayah(2, 253).to(hafs).key;        // "2:255"      relation "merged"
```

`relation` is one of `same`, `merged`, `split`, `shifted` or `unnumbered`. If you only need the
mapping and not the text, `data/ayah-map.json` answers it without loading any edition:

```js
const map = await AyahMap.load("data/ayah-map.json");

map.convert(2, 255, "warsh");
// { surah: 2, ayah: 253, ayahLast: 254, relation: "split" }

map.all(2, 255);
// hafs 2:255 same · shubah 2:255 same · bazzi 2:253-254 split
// qalun 2:253-254 split · warsh 2:253-254 split · duri 2:253 same · susi 2:253 same
```

### The basmalah is numbered in three editions and not in four

`counting.basmalah_counted` tells you which case you are in, and the editions table above lists it
per edition. Where it is `false`, the four words are still printed and still in `words` — they simply
belong to no numbered ayah.

```js
warsh.wordAt(0).text;              // "بِسْمِ"
warsh.wordAt(0).ayah;              // null
warsh.surah(1).basmalah.text;      // the four words, as a Span
warsh.ayah(1, 1).text;             // starts at ٱلْحَمْدُ
```

So `ayah_starts[0]` is `0` for Ḥafṣ, Shuʿbah and al-Bazzī, and `4` for Warsh, Qālūn, al-Dūrī and
al-Sūsī. The muṣḥaf format has no ayah numbered zero — `counting.basmalah_counted` states the case
once instead. The flat CSV view, the word index's `ayah` map and the download service _do_ use `0`
for those four words, so if you read one of those, handle it.

## One number, seven editions

In this dataset that identity is a single integer per word, dense from 1 to `numbering.total`, and it
is the same integer in all seven muṣḥaf files.

```js
const w = hafs.word(1, 4, 1);

w.number;              // 11
w.text;                // مَٰلِكِ
w.to(warsh).text;      // مَلِكِ
w.to(susi).text;       // مَّلِكِ
```

Attach a translation, a grammar record or an audio
segment to number 11 once and it is attached in all seven.

`data/word-index.json` is the same numbering with the text and the per-edition spelling on every
record:

```js
const idx = await WordIndex.load("data/word-index.json");

idx.total;               // 77434
idx.find(1, 4, 1).number;  // 11 — by Ḥafṣ surah, ayah, 1-based word
idx.word(11).status;     // "dotting_variant"
idx.word(11).forms;
// { hafs: "مَٰلِكِ", shubah: "مَٰلِكِ", bazzi: "مَلِكِ", qalun: "مَلِكِ",
//   warsh: "مَلِكِ", duri: "مَلِكِ", susi: "مَّلِكِ" }
idx.word(11).ayah;
// { hafs: 4, shubah: 4, bazzi: 4, qalun: 3, warsh: 3, duri: 3, susi: 3 }
```

The `hafs` field on each record — `{ surah, ayah, position }` in the Kufan count — is what lets an
existing word-level dataset keyed on Ḥafṣ coordinates join in a single lookup.

Do not persist the number as a long-lived key

The number is a position in the union of the seven texts. A future publisher release that adds or
removes one word shifts every number after it, and your stored rows keep resolving — to the
neighbouring word. For anything you write to a database, persist the record’s `key`
(`surah:pointed#occurrence`, content-derived) or its Ḥafṣ `{surah, ayah, position}`. Both survive a
rebuild; the running count does not.

### Three numbers that look like a contradiction

They are all correct, and they answer different questions.

| Field | Ḥafṣ | Warsh | al-Sūsī | Means |
| --- | --- | --- | --- | --- |
| `mushaf.word_count` | 77,432 | 77,431 | 77,431 | words this edition **prints** |
| `numbering.total` | 77,434 | 77,434 | 77,434 | size of the **shared** numbering — identical in all seven |
| `numbering.missing` | 1 | 3 | 2 | numbers this edition does not read |
| `numbering.written_joined` | 1 | 0 | 1 | printed words covering more than one number |

The numbering counts the finest division any of the seven prints, so it is a superset of every
edition. The identity holds per file, and the build checks it:

```text
words.length + Σ(run length − 1) + missing.length == numbering.total

Ḥafṣ     77432 + 1 + 1 = 77434
Warsh    77431 + 0 + 3 = 77434
al-Sūsī  77431 + 1 + 2 = 77434
```

Concretely, five ayat account for all of it. Three words are read by some editions and not others,
and two pairs are written joined by some:

```js
idx.word(60522).forms;   // { hafs: "أَوۡ", shubah: "أَوۡ" }  — 40:26
idx.word(60522).missing; // ["warsh", "qalun", "duri", "susi", "bazzi"]

idx.word(73951).writtenJoined;  // ["hafs", "shubah", "bazzi"]  — 72:16
idx.word(73951).forms;
// hafs/shubah/bazzi "وَأَلَّوِ" (one printed word covering two numbers)
// qalun/warsh/duri/susi "لَّوِ"
```

`missing` says "this edition does not read this word" and nothing finer. At 40:26 Warsh reads `وَ`
where Ḥafṣ reads `أَوۡ`; the numbering records the absence, and the word text records the
substitution.

## Marks are a separate layer, not characters in the word

[Waqf marks](https://quran.ws/docs/concepts/glossary/#waqf "Stopping the recitation at a place in the text according to the rules of stopping and starting."), the sajdah sign, the sajdah line and the `۞` division symbol are
peeled off the words and published as their own layer. So `words[i]` is the word, and only the word.

```js
m.wordAt(33).text;         // "رَيۡبَ"
m.wordAt(33).marks;        // [{ kind: "waqf", side: "after", sign: "ۛ" }]
m.wordAt(33).render(true); // "رَيۡبَۛ"

m.ayah(2, 2).text;
// ذَٰلِكَ ٱلۡكِتَٰبُ لَا رَيۡبَ فِيهِ هُدࣰى لِّلۡمُتَّقِينَ
m.ayah(2, 2).render({ marks: true, ayahMarks: true });
// ذَٰلِكَ ٱلۡكِتَٰبُ لَا رَيۡبَۛ فِيهِۛ هُدࣰى لِّلۡمُتَّقِينَ ۝٢
```

Those two strings differ in length. That matters more than it looks:

Character offsets from another dataset do not apply to this text

A tajwīd span, or any annotation expressed as character ranges, was computed against one exact
string. This dataset’s `text` holds no marks; its `render` with marks on
does; and both may still differ from the annotating dataset in how a shadda and its vowel are
ordered. Any of those shifts the offsets, and the colouring lands on the wrong letters without an
error. Only ever index spans into the exact text they were
published with, or verify the [digest](https://quran.ws/docs/concepts/glossary/#digest "A SHA-256 hash published with a dataset so you can prove you have the exact text.") first.

`mark_types` is interned per file and `mark_signs` names every sign's code point and Unicode name, so
you never hard-code a table of Arabic signs — [edition marks are not the text](https://quran.ws/docs/guidelines/quranic-text/) (Quranic text, rule 3.4).

Two limits on marks:

- **Waqf conventions are not comparable across editions.** Warsh and Qālūn print one general waqf
sign where Ḥafṣ, al-Dūrī and al-Sūsī print seven distinct ones. That is a publishing convention,
not a difference of [qirāʾah](https://quran.ws/docs/concepts/glossary/#qiraah "One of the ways of reciting the Quran, attributed to one of the imams of the qiraat, from which the riwayahs and tariqs branch."), and nothing here normalises it. Ḥafṣ carries
4,517 marks of 9 types; Warsh carries 448 of 2.
- **`marks` records ink, not divisions.** The `۞` symbol is emitted exactly as each source prints it,
and the sources disagree about how often to print it — 199 times in Ḥafṣ, Shuʿbah and al-Bazzī
against 433–437 in the others, because the two groups are marking different divisions. `juz_starts`
is the only division layer you should compute over.

## Ship the font

Every muṣḥaf file names the font its text is set in, and it is required rather than decorative.

```js
m.font.family;   // "KFGQPC HAFS Uthmanic Script"
m.font.file;     // "UthmanicHafs-v-3.0.ttf"
m.fontFace();    // a @font-face rule for the bundled file
```

Blank text is a font problem, not missing data

Warsh, Qālūn and al-Sūsī use Arabic Extended-B code points that Unicode only added in 2021
(`U+0870`–`U+0882`, plus the open tanwīn marks) and almost no general font draws them. In a browser
with the wrong font the words render as empty boxes or as nothing at all — 19,431 Warsh words
contain at least one such code point. `text.length` and a code-point dump both show the text is
intact. Ship the font from `data/fonts/` named in that edition's own `font` block: seven fonts, one
per edition, not one for all seven.

## Searching

`m.search(text)` matches on a fold that drops [harakat](https://quran.ws/docs/concepts/glossary/#harakah "A mark fixing a letter's vowel, its absence or its doubling: fathah, dammah, kasrah, sukun and shaddah.") and waqf marks and
unifies alif and yāʾ forms, so unvowelled input finds vowelled text.

```js
m.search("مالك يوم الدين");   // [Span] — positions 10 to 13
fold("مَٰلِكِ يَوۡمِ ٱلدِّينِ");    // "مالك يوم الدين"
```

Match on `fold()`, or on the word index's `plain` field. Never match on the printed spelling: it
differs between editions, and between releases of the same edition.

## What this is not for

| You want | Use | Why not this |
| --- | --- | --- |
| tajwīd colouring | [Quran Tajweed](https://quran.ws/blocks/quran-tajweed/) | its spans are character offsets into its own edition's encoding, which is **not** byte-identical to this text |
| a printed page as artwork | [Quran SVG](https://quran.ws/blocks/quran-svg/) | this dataset has page _membership_, not page _geometry_ — no coordinates |
| tapping a word on a rendered page | [Quran SVG Elements](https://quran.ws/blocks/quran-svg-elements/) · [Quran Engine](https://quran.ws/blocks/quran-engine/) | join to them by word number, which is what the number is for |
| references in the six scholarly counting systems | [Qiraat Ayah Map](https://quran.ws/blocks/qiraat-ayah-map/) | `ayah-map.json` converts between **these seven editions**, not between counting systems in the abstract |
| roots, lemmas, morphology, translation | another dataset | there is none here |

## Limits

- **Seven riwayat, not ten qirāʾāt.** Four of the seven canonical reciters, and Ibn Kathīr only
through al-Bazzī — Qunbul is absent, as are Ibn ʿĀmir, Ḥamzah and al-Kisāʾī. This is a complete
comparison of the material provided, not of the qirāʾāt.
- **Lines are reconstructed, pages are read.** No source encodes printed lines; they are inferred, and
every file declares its score and lists every ayah where the reconstruction disagrees with a source
that states the line. Treat `page_starts` as a fact and `line_starts` as a layout aid.
- **Word boundaries are derived.** No source shipped word-level data; the boundaries come from the
publisher's own typesetting, which is demonstrably inconsistent between releases of the same
edition. Twelve words are re-segmented by the build, and every one is listed in the file.
- **Verification is internal.** The checks prove the data is faithful to the source packages. They do
not prove the packages are faithful to a printed muṣḥaf.
- **One download is the whole edition.**`data/mushaf/hafs.json` is 3.1 MB and
`data/mushaf/warsh.json` is 1.9 MB. There are no per-surah slices.

Careful

The printed ayah count of an edition and the published total of the counting system it is filed
under are different numbers, and here they disagree. The al-Sūsī muṣḥaf prints 6,218 ayat; its file
measures it as First Madinan, whose published total in Qiraat Ayah Map is 6,214. Its own
`distance_to_systems` reads `madani-first: 1` against `basri: 98` — while Qiraat Ayah Map assigns
Abū ʿAmr, al-Sūsī’s qāriʾ, to Basran. Both repositories are defensible about different
questions, and joining them naively produces a contradiction. This needs a scholar and has not been
resolved. See [Ayah-counting systems](https://quran.ws/docs/concepts/ayah-counting/).

[Try it live\\
The same ayah in all seven editions, with each one’s own boundaries and spelling, from the real\\
dataset.](https://quran.ws/blocks/quran-text/)

## How this data is made

The text is extracted unedited from the digital packages published by the King Fahd Glorious Qurʾān
Printing Complex, and every muṣḥaf file names its source package and that package's SHA-256 in its own
[provenance](https://quran.ws/docs/concepts/glossary/#provenance "The record of which published source a dataset was built from.") block, alongside every place the build departed from it. What
is derived is what no source supplied: word boundaries, the shared numbering, and the measurement of
which counting system each edition follows. Those are checked by round-tripping every letter of every
edition and by the numbering identity above, asserted on every file at build time.

[Ayah-counting systemsWhy 6,236 is not a constant, and the bug that follows from assuming it is.](https://quran.ws/docs/concepts/ayah-counting/) [GlossaryEvery Qur'anic term in these docs, with what it means for your code.](https://quran.ws/docs/concepts/glossary/) [Quran Text blockThe live demo: one ayah across all seven editions.](https://quran.ws/blocks/quran-text/)