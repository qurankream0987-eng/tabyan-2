import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, BookOpen, Headphones, Moon, Play, Search, SlidersHorizontal } from "lucide-react";
import "./_group.css";

type Word = [number, number, 0 | 1 | 2, string];
type Verse = { k: string; n: number; c: number; w: Word[] };
type PageData = { p: number; j: number; h: number | null; v: Verse[] };

const ASPECT = 622 / 917;
const LINE_COUNT = 15;
type LineModel =
  | { line: number; kind: "header" }
  | { line: number; kind: "words"; words: Word[] };

function Header({ rowH }: { rowH: number }) {
  return (
    <div className="surah-banner" style={{ height: rowH * .86 }}>
      <span className="surah-side"><span className="surah-detail">ترتيبها ١</span></span>
      <div className="surah-cartouche">
        <svg className="surah-cap" viewBox="0 0 26 40" preserveAspectRatio="none" aria-hidden><path d="M0 2C10 2 12 8 16 13C18 16 20 18 22.5 20C20 22 18 24 16 27C12 32 10 38 0 38Z" fill="#f8f0d9" stroke="#b99a43" /></svg>
        <div className="surah-body">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden><rect x="0" y="2" width="100" height="36" fill="rgba(185,154,67,.08)" stroke="#b99a43" /><line x1="0" y1="6" x2="100" y2="6" stroke="rgba(185,154,67,.45)" /><line x1="0" y1="34" x2="100" y2="34" stroke="rgba(185,154,67,.45)" /></svg>
          <span className="surah-title">سُورَةُ الفَاتِحَة</span>
        </div>
        <svg className="surah-cap" viewBox="0 0 26 40" preserveAspectRatio="none" aria-hidden><path d="M0 2C10 2 12 8 16 13C18 16 20 18 22.5 20C20 22 18 24 16 27C12 32 10 38 0 38Z" fill="#f8f0d9" stroke="#b99a43" transform="scale(-1 1) translate(-26 0)" /></svg>
      </div>
      <span className="surah-side"><span className="surah-detail">آياتها ٧</span></span>
    </div>
  );
}

function MushafPage({ data, width }: { data: PageData; width: number }) {
  const height = width / ASPECT;
  const titleRowH = height / LINE_COUNT;
  const lines = useMemo<LineModel[]>(() => {
    const map = new Map<number, Word[]>();
    data.v.forEach((verse) => verse.w.forEach((word) => {
      const list = map.get(word[1]) ?? [];
      list.push(word);
      map.set(word[1], list);
    }));
    const models: LineModel[] = [];
    const firstVerse = data.v.find((verse) => verse.n === 1 && verse.w.length > 0);
    if (firstVerse) {
      const firstLine = firstVerse.w[0][1];
      if (firstVerse.c !== 9) models.push({ line: firstLine - (firstVerse.c === 1 ? 1 : 2), kind: "header" });
    }
    for (const [line, words] of map) models.push({ line, kind: "words", words });
    return models.sort((a, b) => a.line - b.line);
  }, [data]);
  const rowCount = Math.max(1, ...lines.map((line) => line.line));
  const wordRowH = (height * .97) / LINE_COUNT;
  const kindByLine = useMemo(() => new Map(lines.map((line) => [line.line, line.kind])), [lines]);
  const layout = useMemo(() => {
    const tops = new Map<number, number>();
    const headerGap = wordRowH * .2;
    let blockHeight = 0;
    for (let line = 1; line <= rowCount; line++) {
      tops.set(line, blockHeight);
      blockHeight += kindByLine.get(line) === "header"
        ? titleRowH + headerGap
        : wordRowH;
    }
    const blockTop = Math.max(height * .015, (height - blockHeight) / 2);
    for (const [line, top] of tops) tops.set(line, blockTop + top);
    return { tops, blockTop, blockBottom: blockTop + blockHeight };
  }, [height, kindByLine, rowCount, titleRowH, wordRowH]);
  const [fontSize, setFontSize] = useState(0);

  useEffect(() => {
    const face = new FontFace("QCF2_p1", 'url("/__mockup/mushaf/fonts/p1.woff2") format("woff2")');
    let cancelled = false;
    face.load().then((loaded) => {
      if (!cancelled) document.fonts.add(loaded);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setFontSize(0);
    (async () => {
      try { await document.fonts.load('100px "QCF2_p1"'); } catch {}
      const context = document.createElement("canvas").getContext("2d");
      if (!context) return;
      context.font = '100px "QCF2_p1"';
      const spaceWidth = context.measureText(" ").width;
      let maxLineWidth = 0;
      for (const line of lines) {
        if (line.kind !== "words") continue;
        const lineWidth = line.words.reduce((sum, word) => sum + context.measureText(word[3]).width, 0)
          + Math.max(0, line.words.length - 1) * spaceWidth;
        maxLineWidth = Math.max(maxLineWidth, lineWidth);
      }
      const fitted = maxLineWidth > 0 ? (width * .94 * 100) / maxLineWidth : titleRowH * .5;
      const maxSize = rowCount >= LINE_COUNT ? Infinity : wordRowH * .53;
      if (!cancelled) setFontSize(Math.min(fitted, maxSize));
    })();
    return () => { cancelled = true; };
  }, [lines, rowCount, titleRowH, width, wordRowH]);

  const panelPad = Math.max(wordRowH * .9, (height * .8 - (layout.blockBottom - layout.blockTop)) / 2);
  const panelTop = Math.max(height * .04, layout.blockTop - panelPad);
  const panelBottom = Math.min(height * .96, layout.blockBottom + panelPad);

  return (
    <div className="mushaf-paper" style={{ width, height, opacity: fontSize > 0 ? 1 : 0 }} dir="rtl">
      <div className="mushaf-page-ornament" aria-hidden />
      <div className="mushaf-opening-panel" style={{ top: panelTop, height: panelBottom - panelTop }}>
        {["ts", "te", "bs", "be"].map((c) => <span className="mushaf-corner" data-c={c} key={c} />)}
      </div>
      {lines.map((model) => {
        const top = layout.tops.get(model.line) ?? 0;
        if (model.kind === "header") {
          return <div key={`h-${model.line}`} style={{ position: "absolute", insetInline: 0, top, height: titleRowH, display: "flex", alignItems: "center", justifyContent: "center" }}><Header rowH={titleRowH} /></div>;
        }
        return (
          <div key={`l-${model.line}`} style={{ position: "absolute", insetInline: 0, top, height: wordRowH, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "QCF2_p1", fontSize, lineHeight: 1, whiteSpace: "nowrap" }}>
              {model.words.map((word, index) => <span key={`${model.line}-${index}`}>{index > 0 && " "}{word[3]}</span>)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function MushafMockup({ refined = false }: { refined?: boolean }) {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [viewport, setViewport] = useState({ width: 800, height: 900 });
  useEffect(() => {
    fetch("/__mockup/mushaf/pages/1.json").then((response) => response.json()).then(setPageData).catch(() => {});
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const desktop = viewport.width >= 768;
  const topReserve = refined && desktop ? 56 : 68;
  const bottomReserve = refined && desktop ? 88 : 104;
  const verticalPadding = refined && desktop ? 0 : 16;
  const pageWidth = Math.min(
    viewport.width - 16,
    600,
    desktop ? Math.max(0, viewport.height - topReserve - bottomReserve - verticalPadding) * ASPECT : Infinity,
  );

  return (
    <main className={`mushaf-mockup${refined ? " is-refined" : ""}`}>
      <header className="mushaf-topbar">
        <div className="mushaf-topbar-inner">
          <div className="mushaf-actions"><button className="mushaf-icon-btn" aria-label="العودة"><ArrowRight size={19} /></button><button className="mushaf-icon-btn" aria-label="حفظ الصفحة"><Bookmark size={18} /></button></div>
          <button className="mushaf-top-title"><strong>الفاتحة</strong><small>الجزء ١ · صفحة ١</small></button>
          <div className="mushaf-actions"><button className="mushaf-icon-btn" aria-label="بحث"><Search size={18} /></button><button className="mushaf-icon-btn" aria-label="الوضع الليلي"><Moon size={18} /></button></div>
        </div>
      </header>
      <section className="mushaf-viewport" style={{ top: topReserve, bottom: bottomReserve }}>
        <div className="mushaf-stage">
          <div className="mushaf-page-frame" style={{ width: pageWidth }}>
            {pageData ? <MushafPage data={pageData} width={pageWidth} /> : <div className="mushaf-paper" style={{ width: pageWidth, height: pageWidth / ASPECT }} />}
          </div>
        </div>
      </section>
      <nav className="mushaf-dock-wrap" aria-label="أدوات المصحف">
        <div className="mushaf-dock">
          <button className="mushaf-dock-action"><BookOpen size={19} /><span>الفهرس</span></button>
          <button className="mushaf-dock-action"><Headphones size={19} /><span>استماع</span></button>
          <button className="mushaf-primary"><Play size={21} fill="currentColor" /><span>استمع للقرآن</span></button>
          <button className="mushaf-dock-action"><Bookmark size={19} /><span>الحفظ</span></button>
          <button className="mushaf-dock-action"><SlidersHorizontal size={19} /><span>الأدوات</span></button>
        </div>
      </nav>
      <button className="mushaf-side-nav" style={{ insetInlineStart: 18 }} aria-label="الصفحة السابقة"><ArrowLeft size={18} /></button>
      <button className="mushaf-side-nav" style={{ insetInlineEnd: 18 }} aria-label="الصفحة التالية"><ArrowRight size={18} /></button>
    </main>
  );
}

export function Current() {
  return <MushafMockup />;
}