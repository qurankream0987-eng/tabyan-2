import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Bookmark, BookOpen, EyeOff, Headphones, Menu, Mic, Moon, MoreHorizontal, Search, Settings, X } from "lucide-react";
import "./_refined.css";

type Word = readonly [number, number, 0 | 1 | 2, string];
type Verse = { k: string; n: number; c: number; w: Word[] };
type PageData = { p: number; j: number; h: number | null; v: Verse[] };
const ASPECT = 622 / 917, LINES = 15, BASMALAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";

function HeaderFrame({ rowH, width }: { rowH: number; width: number }) {
  const bandH = width * .94 * (154 / 932);
  return <div className="tby-surah-banner" style={{ height: bandH, ["--band-h" as string]: `${bandH}px` }}>
    <img className="tby-surah-reference-art" src="/__mockup/images/tabyan-mushaf-header.png" alt="" aria-hidden="true" />
    <span className="tby-surah-side" data-side="start"><span className="tby-surah-detail"><span>ترتيبها</span><span className="tby-surah-detail-value">١</span></span></span>
    <div className="tby-surah-cartouche"><div className="tby-surah-cartouche-body">
      <span className="tby-surah-title" style={{ fontSize: Math.min(bandH * .46, rowH * .76) }}>سُورَةُ الْفَاتِحَة</span>
    </div></div>
    <span className="tby-surah-side" data-side="end"><span className="tby-surah-detail"><span>آياتها</span><span className="tby-surah-detail-value">٧</span></span></span>
  </div>;
}

function MushafPage({ data, width }: { data: PageData; width: number }) {
  const height = width / ASPECT, titleH = height / LINES;
  const lines = useMemo(() => {
    const map = new Map<number, Word[]>(), result: { line: number; kind: "words" | "header" | "basmalah"; words?: Word[] }[] = [];
    data.v.forEach(v => v.w.forEach(w => { const a = map.get(w[1]) ?? []; a.push(w); map.set(w[1], a); }));
    const first = data.v.find(v => v.n === 1 && v.w.length);
    if (first) { const h = first.w[0][1] - (first.c === 1 || first.c === 9 ? 1 : 2); if (h >= 1) { result.push({ line: h, kind: "header" }); if (first.c !== 1 && first.c !== 9) result.push({ line: h + 1, kind: "basmalah" }); } }
    for (const [line, words] of map) result.push({ line, kind: "words", words });
    return result.sort((a, b) => a.line - b.line);
  }, [data]);
  const rowCount = Math.max(1, ...lines.map(x => x.line)), rowH = height * .97 / LINES;
  const layout = useMemo(() => {
    const kinds = new Map(lines.map(x => [x.line, x.kind])), tops = new Map<number, number>(); let y = 0;
    for (let line = 1; line <= rowCount; line++) { tops.set(line, y); y += kinds.get(line) === "header" ? titleH + rowH * .2 : rowH; }
    const top = Math.max(height * .015, (height - y) / 2); tops.forEach((v, k) => tops.set(k, top + v));
    return { tops, top, bottom: top + y };
  }, [height, lines, rowCount, rowH, titleH]);
  const [fontSize, setFontSize] = useState(0);
  useEffect(() => { const face = new FontFace("QCF2_p1", 'url("/__mockup/mushaf/fonts/p1.woff2") format("woff2")'); face.load().then(f => document.fonts.add(f)).catch(() => {}); }, []);
  useLayoutEffect(() => {
    let cancelled = false; const ctx = document.createElement("canvas").getContext("2d"); if (!ctx) return;
    (async () => { await document.fonts.load('100px "QCF2_p1"'); ctx.font = '100px "QCF2_p1"'; const space = ctx.measureText(" ").width; let max = 0;
      lines.forEach(m => { if (m.kind === "words") max = Math.max(max, m.words!.reduce((s, w) => s + ctx.measureText(w[3]).width, 0) + (m.words!.length - 1) * space); });
      if (!cancelled) setFontSize(Math.min(max ? width * .94 * 100 / max : titleH * .5, rowH * .53));
    })(); return () => { cancelled = true; };
  }, [lines, rowH, titleH, width]);
  return <div className="tby-mushaf-paper" data-mushaf-page="1" style={{ width, height, opacity: fontSize ? 1 : 0 }}>
    {fontSize > 0 && <div className="tby-opening-panel" style={{ top: Math.max(height * .04, layout.top - rowH * .9), height: Math.min(height * .96, layout.bottom + rowH * .9) - Math.max(height * .04, layout.top - rowH * .9) }}>{(["ts", "te", "bs", "be"] as const).map(c => <span key={c} className="tby-opening-corner" data-corner={c} />)}</div>}
    {fontSize > 0 && lines.map(m => <div key={m.line} style={{ position: "absolute", insetInline: 0, top: layout.tops.get(m.line), height: m.kind === "header" ? titleH : rowH, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {m.kind === "header" ? <HeaderFrame rowH={titleH} width={width} /> : m.kind === "basmalah" ? <><span className="font-quran" style={{ fontSize: Math.min(fontSize * 1.1, titleH * .62), lineHeight: 1 }}>{BASMALAH}</span></> : <span style={{ fontFamily: "QCF2_p1", fontSize, lineHeight: 1, color: "var(--mushaf-ink)", whiteSpace: "nowrap" }}>{m.words!.map((w, i) => <span key={i}>{i ? " " : ""}<span>{w[3]}</span></span>)}</span>}
    </div>)}
    {fontSize > 0 && <div className="tby-page-footer" aria-hidden="true"><img className="tby-page-footer-art" src="/__mockup/images/tabyan-mushaf-footer.png" alt="" /><span>١</span></div>}
  </div>;
}

function Controls() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [night, setNight] = useState(false);
  return <div className="tby-topbar">
    <div className="tby-topbar-inner">
      <div className="tby-leading-actions">
        <button className="tby-icon-btn" aria-label="خيارات القراءة" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}><Menu size={22} strokeWidth={1.8} /></button>
      </div>
      <div className="tby-title-block">
        <button className="tby-title-button" onClick={() => {}} aria-label="الفَاتِحَة — الجزء ١، صفحة ١">
          <span className="tby-topbar-title">سُورَةُ الفَاتِحَة</span>
          <span className="tby-topbar-meta">الجزء ١ · الصفحة ١</span>
        </button>
      </div>
      <div className="tby-header-actions">
        <button className="tby-icon-btn" aria-label="حفظ علامة على الصفحة" aria-pressed="false" onClick={() => {}}><Bookmark size={18} strokeWidth={1.6} /></button>
        <button className="tby-icon-btn" aria-label="إعدادات القراءة" onClick={() => setMenuOpen(value => !value)}><Settings size={20} strokeWidth={1.7} /></button>
      </div>
    </div>
    {searchOpen && <div className="tby-search-row"><Search size={16} /><input autoFocus aria-label="بحث" placeholder="ابحث في المصحف" /><button aria-label="إغلاق البحث" onClick={() => setSearchOpen(false)}><X size={16} /></button></div>}
    {menuOpen && <div className="tby-reader-menu" role="menu">
      <button role="menuitem" onClick={() => { setSearchOpen(true); setMenuOpen(false); }}><Search size={17} /><span>بحث</span></button>
      <button role="menuitem" aria-pressed={night} onClick={() => setNight(value => !value)}><Moon size={17} /><span>الوضع الليلي</span><span className={`tby-toggle ${night ? "is-on" : ""}`} /></button>
      <div className="tby-menu-divider" />
      <button role="menuitem" onClick={() => {}}><BookOpen size={17} /><span>الفهرس</span></button>
      <button role="menuitem" onClick={() => {}}><Headphones size={17} /><span>استماع</span></button>
      <button role="menuitem" onClick={() => {}}><Mic size={17} /><span>ابدأ التسميع</span></button>
      <button role="menuitem" onClick={() => {}}><EyeOff size={17} /><span>الحفظ</span></button>
      <button role="menuitem" onClick={() => {}}><MoreHorizontal size={17} /><span>الأدوات</span></button>
    </div>}
    <span className="tby-screen-reader-meta">الجزء ١ · صفحة ١</span>
    <span className="tby-night-state" data-night={night} />
  </div>;
}

export function ReferenceMatch() {
  const [data, setData] = useState<PageData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    let active = true;
    fetch("/__mockup/mushaf/pages/1.json")
      .then(response => { if (!response.ok) throw new Error("Unable to load the page"); return response.json(); })
      .then(page => { if (active) setData(page); })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(() => setWidth(Math.min(box.current!.clientWidth - 16, 600)));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  return <div className="mushaf-reference-match min-h-screen">
    <div className="tby-reader" dir="rtl">
      <Controls />
      <div ref={box} className="tby-reader-viewport">
        <div className="tby-reading-stage">
          {data && width > 0 && <div className="tby-page-frame" style={{ width }}><MushafPage data={data} width={width} /></div>}
          {!data && !loadError && <div className="tby-page-loading" aria-label="جارٍ تحميل صفحة المصحف"><span /><span /><span /><span /><span /></div>}
          {loadError && <div className="tby-page-error" role="alert"><p>تعذّر تحميل صفحة المصحف</p><button onClick={() => { setLoadError(false); setData(null); fetch("/__mockup/mushaf/pages/1.json").then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(setData).catch(() => setLoadError(true)); }}>إعادة المحاولة</button></div>}
        </div>
      </div>
    </div>
  </div>;
}