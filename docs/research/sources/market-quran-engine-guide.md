# Source capture: market-quran-engine-guide

URL: https://quran.ws/docs/reference/quran-engine/
Fetched: 2026-10-15

ContentsReference

# Quran Engine

Quran Engine exists for one reason: **SVG does not perform on mobile.** A fully split
[muṣḥaf](https://quran.ws/docs/concepts/glossary/#mushaf "The Quran as a written, bound book, in its established order.") page is hundreds of kilobytes of vector paths, and an app that wants 604 of them cannot ship
or hold that. The engine is the same interactive page as a compact binary, drawn by each
platform’s own canvas.

Blocks used

[Quran Engine](https://quran.ws/blocks/quran-engine/) [Quran SVG Elements](https://quran.ws/blocks/quran-svg-elements/)

Platforms

Web (wasm) · Android · Flutter · React Native

Time

About 12 minutes

## SVG, Elements and Engine

Three blocks render printed pages. They are not a queue and not alternatives of equal scope:
**coverage narrows as addressing deepens.**

|  | What it covers | What you can address | Where it runs |
| --- | --- | --- | --- |
| [Quran SVG](https://quran.ws/blocks/quran-svg/) | every vectorised muṣḥaf | an ayah | anywhere an `<svg>` renders |
| [Quran SVG Elements](https://quran.ws/blocks/quran-svg-elements/) | only the muṣḥafs that have been split | a word, a mark | the web, where the split SVGs work well |
| **Quran Engine** | those same split muṣḥafs | a word, a mark — the same addressing, fast | Web (wasm), Android, Flutter, React Native |

If you are rendering a page in a browser and it is fast enough, use Elements. Come here when you
are on a phone, or when you want word-level hit-testing, masking or search to cost microseconds
rather than DOM work. The engine carries the text of the words on a page of one muṣḥaf; for the
text of a riwayah as data, use [Quran Text](https://quran.ws/blocks/quran-text/).

## What you can run today

|  | Published? | Where |
| --- | --- | --- |
| **Page data** — 604 `NNN.qvp`, their `NNN.words.json` sidecars, `atlas.qva` | Yes | release `v0.1.0`, a 44 MB `.tar.gz` with a SHA-256 beside it |
| **The engine** — `qvp_ffi.wasm`, the native libraries, `web/qvp.js` | **No** | build from source, or copy from a repository checkout |
| **A package on npm, Maven or pub.dev** | **No** | — |

There is no `npm install` for this block yet. To show it working on this site we installed a Rust
toolchain and built `qvp_ffi.wasm` ourselves; the three files under `public/demo/qvp/` are the only
demo payload in this repository that a sync script cannot fetch. The fetch step in the code below
is not yet one you can copy verbatim.

Two licences, one repository

The engine code (`crates/`, `packages/`, `scripts/`, `web/`) is MIT and `docs/` is CC BY 4.0, per the
`LICENSE` file at the root. The **page data is separate** and carries the source bundle’s terms
(KFGQPC Madani muṣḥaf), not the engine’s licence. See [Licensing](https://quran.ws/docs/reference/licensing/).

[Try it live\\
The engine, running in your browser on the real wasm. Click a word — the hit-test happens inside\\
the engine, and the timing shown is measured on your machine.](https://quran.ws/blocks/quran-engine/)

## What ships, and what shape it is on disk

Three kinds of file. Code never bundles them; they are assets your app loads.

| File | What it is |
| --- | --- |
| `NNN.qvp` | one printed page: geometry, words, ayah fragments, lines, decorations. Magic bytes `QVP1`. |
| `NNN.words.json` | optional text sidecar, keyed `"surah:ayah:word"`, five forms per word |
| `atlas.qva` | optional cross-page index: which page an ayah is on, surah metadata, juz and hizb |

The sidecar for page 001 is 29 entries, one per word on the page:

```json
"1:1:1": {
  "rasm_uthmani": "بِسْمِ",
  "rasm_imlai":   "بِسْمِ",
  "qpc":          "بِسۡمِ",
  "rasm":         "بسم",
  "search":       "بسم"
}
```

Five forms, because they answer different questions: `rasm_uthmani` is what is printed, `qpc` is the
font-specific encoding, `rasm` is the bare consonantal skeleton, and `search` is the
[normalised](https://quran.ws/docs/concepts/glossary/#normalisation "Rewriting Arabic text into one canonical form so two copies can be compared.") form you match a user's typing against.

## Addressing

The engine speaks the same address as every other block: [a word is\\
`surah:ayah:word`](https://quran.ws/docs/concepts/glossary/#word-identity "A stable number for each word, so the same word can be referenced across datasets."). You do not match on Arabic strings, and you do not compute coordinates.

**Targets** resolve to a list of words. Anywhere a target is accepted you can pass:

| Target | Means |
| --- | --- |
| `'page'` | every word on the page |
| `'1:2'` | one ayah |
| `'1:1:3'` | one word |
| `'2:255-257'` | an ayah range |
| `'line:7'` | one printed line |
| `'surah:1'` | the part of a surah on this page |
| `4` or `[4, 5, 6]` | word indices you already hold |

**Selectors** say what a style applies to, and go finer than a word, down to one
[diacritic](https://quran.ws/docs/concepts/glossary/#harakah "A mark fixing a letter's vowel, its absence or its doubling: fathah, dammah, kasrah, sukun and shaddah."):
`Sel.page()`, `Sel.word(i)`, `Sel.ayah(s, a)`, `Sel.line(n)`, `Sel.wordBody(i)`, `Sel.wordMarks(i)`,
`Sel.wordMark(i, nth)`, `Sel.wordMarkNamed(i, 'fathah', nth)`, `Sel.mark('shaddah')`,
`Sel.category('harakah')`, `Sel.kind('mark')`, `Sel.deco('ayah-mark')`.

## Load a page and ask it questions

Page 001 in `public/demo/qvp/001.qvp` is al-Fātiḥa; the comments are the values it returns.

```js
const engine = await QvpEngine.init(wasmBytes);
const page = engine.loadPage(new Uint8Array(qvpBytes));
page.attachWords(wordsJsonText); // → 29 (words updated)

page.page;    // 1
page.width;   // 345   ── page units, the printed page's viewBox
page.height;  // 550
page.nLines;  // 8
page.nWords;  // 29
page.nPaths;  // 268
page.nDecos;  // 8

page.findWord(1, 1, 1);   // 0        ── word index for 1:1:1
page.wordKey(0);          // "1:1:1"
page.resolve("1:2");      // [4, 5, 6, 7]
page.wordForm(0, "qpc");  // "بِسۡمِ"
page.ayahKeys();          // [[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7]]
page.citation([4,5,6,7]); // "1:2"
page.ayahLabel(0);        // "Ayah 1 of Fatihah"   ── for screen readers
```

Metadata comes with the page, so a reader app needs no database of its own:

```js
page.surahs();
// [{ number: 1, ayahCount: 7, hasBanner: true, hasBasmalah: false,\
//    place: "makkah", arabic: "الفاتحة", latin: "Fatihah", english: "The Opener" }]

page.divisions();
// [{ kind: "juz", n: 1, line: 2, surah: 1, ayah: 1, ayahIdx: 0 }, … ]

page.ayahMarks();  // 7 medallions, with centre, radius and their path indices
page.sajdahs();    // []  ── none on this page
```

page.nAyahs is not the number of ayat

On page 001, `page.nAyahs` is **10** and `page.ayahKeys().length` is **7**. `page.ayahs[]` holds
one _fragment_ per printed line, so an ayah that wraps across three lines contributes three
entries. Use `ayahKeys()` to count ayat and `resolve('1:2')` to get an ayah’s words. Treating
`nAyahs` as a verse count over-counts on almost every page.

An ayah can continue onto the next page

`page.ayahWordCount(1, 7)` returns `{ count: 9, complete: true }`. When `complete` is `false`, the
words on this page are only part of the ayah and the rest is on the neighbouring page. Build a
highlight or a citation from one page’s words alone and you will truncate the verse.

## Render a page

Adapted from `src/components/blockdemo/engine-live.tsx`, which is the code running on this site’s
engine demo.

1. ### Load the engine, the page and the sidecar




Three fetches. The wasm is loaded once for the whole app; pages are loaded and freed as the
reader moves.



```js
const [wasmBuf, qvpBuf, wordsTxt] = await Promise.all([\
     fetch("/qvp/qvp_ffi.wasm").then((r) => r.arrayBuffer()),\
     fetch("/qvp/001.qvp").then((r) => r.arrayBuffer()),\
     fetch("/qvp/001.words.json").then((r) => r.text()),\
]);

const engine = await QVP.QvpEngine.init(new Uint8Array(wasmBuf));
const page = engine.loadPage(new Uint8Array(qvpBuf));
page.buildPaths();          // caches Path2D for the Canvas2D renderer
page.attachWords(wordsTxt); // enables the derived text forms and search
```



`buildPaths()` is a renderer concern, not part of loading — every query API above works without
it, including outside a browser.

2. ### Lay it out for your viewport




`layout()` returns the transform; it does not draw. Pass `page.nLines`, not a guess.



```js
const L = page.layout({
     viewportW: w,
     viewportH: h,
     padTop: 4, padBottom: 4, padLeft: 8, padRight: 8,
     lineSpacing: 1,
     lineGap: 0,
     fillHeight: true,
     nominalLines: Math.max(1, page.nLines),
});
// L = { scale, ox, oy, contentW, contentH, pitch, lineDy[], slots[] }
```

3. ### Draw




The engine decides, the host draws. On the web that is the reference Canvas2D renderer; on
Android, Flutter and React Native it is the platform’s own canvas.



```js
const renderer = new QVP.CanvasRenderer(canvasEl);
const view = { scale: L.scale, ox: L.ox, oy: L.oy };
renderer.draw(page, view, window.devicePixelRatio || 1);
```



For anything animated, drive it from the engine clock: `page.tick(now)` returns `true` while a
fade or a band slide is still moving, so you only keep a frame loop alive while something is
actually changing.

4. ### Hit-test a tap, then highlight what it found




`hitTestViewEx` takes viewport pixels and returns the word, the line, the distance, and whether
the hit was on the exact outline.



```js
const vx = (clientX - rect.left - view.ox) / view.scale;
const vy = (clientY - rect.top - view.oy) / view.scale;

const h = page.hitTestViewEx(vx, vy, { maxDistance: 4 });
// → { word: 0, path: -1, deco: -1, line: 1, distance: 0,
//     exact: false, wordKey: "1:1:1", ayahKey: "1:1" }

if (h && h.word >= 0) {
     page.clearHighlights();
     page.highlight(QVP.T.word(h.word), {
       mode: "band",
       band: "rgba(21,112,93,0.28)",
       ink: "#15705D",
     });
     renderer.draw(page, view, window.devicePixelRatio || 1);
}
```



A tap between two words still resolves: the engine partitions each line into gap-aware boxes
with no dead zones; `page.hitBoxes()` returns exactly 29 of them for page 001, one per word.


Page units and viewport pixels are two coordinate systems

`page.width` is **345** and `page.height` is **550** — the printed page’s viewBox space, y
downwards. Anything named `…View` is in viewport pixels _through the current layout_:
`hitTestViewEx`, `wordBoxView`, `highlightBoxes()`, `maskBoxes()`. Feed raw mouse coordinates to
`hitTest` and you get the wrong word, or none, with no error. Subtract the layout offset and
divide by the scale first.

## Styling, highlighting and memorisation

Every mutating call returns a handle, and removing the handle undoes exactly that call. There is a
`clearStyles()`, but you rarely need it.

```js
page.styleTarget("1:1", "#0a7d32", { layer: LAYER.HIGHLIGHT });
const h = page.style(Sel.wordMark(0, 1), "#1a73e8", { ms: 200 }); // the 2nd mark of word 0
page.restyle(h, "#ff0000", 100);
page.unstyle(h);

page.hide(Sel.kind("mark")); // a reading view with no tashkīl
page.theme({ ink: "#e8e4dc", diacritics: "#7fb0e8", ayahMark: "#b8860b", ms: 300 });
```

Highlights are separate from styles, because a highlight also draws a band behind the ink:

```js
const hl = page.highlight("1:2", { mode: "both", ink: "#15705D", band: "#15705D33" });
page.highlightWords(hl);   // [4, 5, 6, 7]
page.highlightBoxes();     // 1 box  ── one shape across every line the ayah occupies
page.rehighlight(hl, "1:3"); // band slides, ink cross-fades — one handle, for word-by-word following
```

Masking hides words in place, which is what a memorisation view needs:

```js
page.mask("1:7", "hide");  // 'hide' | 'block' | 'blur'
page.maskWords();          // 9 words masked
page.revealNext(1);        // → 1
page.unmask();
```

revealStart() is broken in the web wrapper

`docs/API.md` documents `page.revealStart({ lit, byAyah, grey, ink, ayahMarks, ms })` — the greyed
page with a lit window. In `web/qvp.js` at the version we consumed it throws
`ReferenceError: markers is not defined` on every call, because the function reads a variable that
was never declared. The rest of the mask and reveal surface above works. Recorded in
`docs/dx/quran-engine.md` and filed upstream as
[quran-engine#7](https://github.com/quran-ws/quran-engine/issues/7), with the one-line fix as
[PR #6](https://github.com/quran-ws/quran-engine/pull/6) — both open at the time of writing.

## Text, search and export

Search normalises both sides, stripping marks and folding letter variants, and retries with a looser
key when the strict pass finds nothing, so a user typing `الرحمان` finds the printed `ٱلرَّحْمَٰنِ`.

```js
page.text("1:1");
// "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"

page.search("الله");
// [{ word: 1, wordKey: "1:1:2", text: "ٱللَّهِ", index: 0, loose: false }]

page.selectionText("rasm_uthmani", true);
// "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ (1:1)"

page.cropSvg("1:1", { pad: 2 });
// a standalone <svg viewBox="111.62 216.07 122.23 28.98" …> with the current colours
```

`cropSvg` is how you get a shareable image of one ayah out of the engine without a rendering server.

Search without the sidecar searches something else

`attachWords()` is optional, and everything keeps working without it. With no sidecar,
`page.hasForm('search')` is `false` and search falls back to the stripped `rasm_uthmani`, so a
user’s typed query misses words it should have found. Check `hasForm` before you offer a
search box.

## Across pages: the atlas

`atlas.qva` answers questions a single page cannot: `atlas.pageOf(s, a)`, `pageRange(page)`,
`surah(n)`, `pageOfSurah(n)`, `juz(n)`, `hizb(n)`, `juzAt(s, a)`, `pagesOfJuz(n)`, and
`findSurah('cow' | 'البقرة' | '2')`.

Note

Unverified here. The atlas is not part of this site’s demo payload, so these calls are taken
from the repository’s `docs/API.md` rather than from a run. Check the shapes against the file
you download.

## How this data is made

Each `NNN.qvp` is converted from the split source SVG and checked back against it with a pixel diff
at 4× resolution; all 604 pages pass, and coordinates stay exact to 0.01 page unit. The format stores
only what cannot be recomputed (bounding boxes, path origins and opcode offsets are rebuilt at load),
so a page is several times smaller than its SVG and still lossless. The mark, family and category
names the engine reports are the source bundle's own taxonomy, and a C ABI test keeps the Rust core,
the C header and every wrapper in step.

[Quran SVG ElementsThe split pages the engine converts — and the block to use on the web.](https://quran.ws/blocks/quran-svg-elements/) [Choosing a blockEight packages. Which one answers your question, and which one does not.](https://quran.ws/docs/start/choosing-a-block/) [GlossaryEvery Qur'anic term in these docs, with what it means for your code.](https://quran.ws/docs/concepts/glossary/)