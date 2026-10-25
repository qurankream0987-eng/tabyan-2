import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Bookmark, BookOpen, EyeOff, Headphones, Mic, Moon, Search } from "lucide-react";
import "./_group.css";

type Word = readonly [number, number, 0 | 1 | 2, string];
type Verse = { k: string; n: number; c: number; w: Word[] };
type PageData = { p: number; j: number; h: number | null; v: Verse[] };
const ASPECT = 622 / 917, LINES = 15, BASMALAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";

function HeaderFrame({ rowH }: { rowH: number }) {
  return <div className="tby-surah-banner" style={{ height: rowH * .86, ["--band-h" as string]: `${rowH * .86}px` }}>
    <span className="tby-surah-side" data-side="start"><svg className="tby-surah-finial" viewBox="0 0 12 12"><path d="M6 1.5 10.5 6 6 10.5 1.5 6z" className="tby-orn-line" fill="var(--mushaf-paper)" /><circle cx="6" cy="6" r="1" className="tby-orn-dot" /></svg><span className="tby-surah-detail">ترتيبها ١</span></span>
    <div className="tby-surah-cartouche"><div className="tby-surah-cartouche-body">
      <svg className="tby-surah-cartouche-rules" viewBox="0 0 100 40" preserveAspectRatio="none"><path d="M2 7H43M57 7H98M2 33H44M56 33H98M3 10H18M82 10H97" className="tby-orn-line-soft" fill="none" /><path d="m50 4.3 2.7 2.7L50 9.7 47.3 7z" className="tby-orn-line" fill="var(--mushaf-paper)" /><circle cx="2" cy="7" r="1.15" className="tby-orn-dot" /><circle cx="98" cy="7" r="1.15" className="tby-orn-dot" /></svg>
      <span className="tby-surah-title" style={{ fontSize: rowH * .44 }}>سُورَةُ الفَاتِحَة</span>
    </div></div>
    <span className="tby-surah-side" data-side="end"><svg className="tby-surah-finial" viewBox="0 0 12 12"><path d="M6 1.5 10.5 6 6 10.5 1.5 6z" className="tby-orn-line" fill="var(--mushaf-paper)" /><circle cx="6" cy="6" r="1" className="tby-orn-dot" /></svg><span className="tby-surah-detail">آياتها ٧</span></span>
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
      {m.kind === "header" ? <HeaderFrame rowH={titleH} /> : m.kind === "basmalah" ? <><span className="font-quran" style={{ fontSize: Math.min(fontSize * 1.1, titleH * .62), lineHeight: 1 }}>{BASMALAH}</span></> : <span style={{ fontFamily: "QCF2_p1", fontSize, lineHeight: 1, color: "var(--mushaf-ink)", whiteSpace: "nowrap" }}>{m.words!.map((w, i) => <span key={i}>{i ? " " : ""}<span>{w[3]}</span></span>)}</span>}
    </div>)}
  </div>;
}

function Controls() {
  const noop = () => {};
  return <><div className="tby-topbar"><div className="tby-topbar-inner">
    <div className="tby-header-actions"><button className="tby-icon-btn" aria-label="العودة" onClick={noop}><ArrowRight size={20} /></button><button className="tby-icon-btn" aria-label="حفظ علامة على الصفحة" aria-pressed="false" onClick={noop}><Bookmark size={18} /></button></div>
    <button className="tby-title-button" onClick={noop}><span className="tby-topbar-title">الفَاتِحَة</span><span className="tby-topbar-meta">الجزء ١ · صفحة ١</span></button>
    <div className="tby-header-actions"><button className="tby-icon-btn" aria-label="بحث" onClick={noop}><Search size={18} /></button><button className="tby-icon-btn" aria-label="الوضع الليلي" role="switch" aria-checked="false" onClick={noop}><Moon size={18} /></button></div>
  </div></div><div className="tby-dock-wrap"><div className="tby-utility-dock" role="toolbar" aria-label="أدوات المصحف">
    <button className="tby-dock-action" onClick={noop}><BookOpen size={20} /><span>الفهرس</span></button><button className="tby-dock-action" onClick={noop}><Headphones size={20} /><span>استماع</span></button><button className="tby-primary-action" onClick={noop} aria-label="ابدأ التسميع"><Mic size={19} /><span className="tby-recitation-label">ابدأ التسميع</span></button><button className="tby-dock-action" onClick={noop}><EyeOff size={20} /><span>الحفظ</span></button><button className="tby-dock-action" onClick={noop}><span style={{ fontSize: 20 }}>•••</span><span>الأدوات</span></button>
  </div></div></>;
}

export function Current() {
  const [data, setData] = useState<PageData | null>(null); const box = useRef<HTMLDivElement>(null); const [width, setWidth] = useState(0);
  useEffect(() => { fetch("/__mockup/mushaf/pages/1.json").then(r => r.json()).then(setData); }, []);
  useEffect(() => { if (!box.current) return; const ro = new ResizeObserver(() => setWidth(Math.min(box.current!.clientWidth - 16, 600))); ro.observe(box.current); return () => ro.disconnect(); }, []);
  return <div className="mushaf-reference-match min-h-screen"><div className="tby-reader" dir="rtl"><Controls /><div ref={box} className="tby-reader-viewport"><div className="tby-reading-stage">{data && width > 0 && <div className="tby-page-frame" style={{ width }}><MushafPage data={data} width={width} /></div>}</div></div></div></div>;
}
