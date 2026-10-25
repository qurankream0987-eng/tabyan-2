/** Development-only fixture: real production header + canonical metadata.
 * Not a route, login bypass, Quran renderer or production build entry. */
import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import SurahHeaderFrame from "../../src/components/mushaf/SurahHeaderFrame";
import { SURAHS } from "../../src/lib/quran-data";
import { measureInk } from "../../src/lib/mushaf/title-fit";
import "../../src/components/mushaf/mushaf-reader.css";

const widths = [320, 360, 375, 390, 393, 414, 430, 1024, 1280, 1440];
const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const failures: string[] = [];
let minimumFont = Infinity;
const harness = document.createElement("div");
harness.style.cssText = "position:fixed;left:-2000px;top:0;pointer-events:none";
document.body.append(harness);
const checks = createRoot(harness);

function Headers({ width, opening, names = SURAHS }: { width: number; opening: boolean; names?: typeof SURAHS }) {
  const pageWidth = Math.min(width - 16, 640);
  const rowH = (pageWidth * 917 / 622) / 15;
  return <div className="tby-reader" style={{ width: pageWidth, background: "none" }}>
    <div className="tby-mushaf-paper" style={{ background: "none" }}>
      {names.map(surah => <div key={surah.n} style={{ height: opening ? pageWidth * .17 : rowH, display: "flex", alignItems: "center" }}>
        <SurahHeaderFrame surahName={surah.name} rowH={rowH} width={pageWidth}
          variant={opening ? "opening" : "standard"} surahNumber={surah.n} ayahCount={surah.ayahs} />
      </div>)}
    </div>
  </div>;
}

function check(width: number, opening: boolean) {
  for (const banner of harness.querySelectorAll<HTMLElement>("[data-surah-frame]")) {
    const title = banner.querySelector<HTMLElement>(".tby-surah-title")!;
    const panel = banner.querySelector<HTMLElement>(".tby-surah-cartouche-body")!;
    const style = getComputedStyle(title);
    const size = parseFloat(style.fontSize);
    const ink = measureInk(title.textContent!, style.fontFamily, 400, size)!;
    const t = title.getBoundingClientRect(), p = panel.getBoundingClientRect(), b = banner.getBoundingClientRect();
    const baseline = t.top + (t.height - ink.fontAscent - ink.fontDescent) / 2 + ink.fontAscent;
    const edges = { left: t.left + t.width / 2 - ink.left, right: t.left + t.width / 2 + ink.right,
      top: baseline - ink.ascent, bottom: baseline + ink.descent };
    const centerError = Math.max(Math.abs((edges.left + edges.right) / 2 - (p.left + p.right) / 2),
      Math.abs((edges.top + edges.bottom) / 2 - (p.top + p.bottom) / 2));
    minimumFont = Math.min(minimumFont, size);
    if (style.visibility !== "visible" || !document.fonts.check(`400 ${size}px "Tabyan Surah Amiri"`)) failures.push(`${width}/${opening}/${banner.dataset.surahFrame}: font not ready`);
    if (edges.left < p.left - .6 || edges.right > p.right + .6 || edges.top < b.top - .6 || edges.bottom > b.bottom + .6) failures.push(`${width}/${opening}/${banner.dataset.surahFrame}: clipped ink`);
    if (centerError > .8) failures.push(`${width}/${opening}/${banner.dataset.surahFrame}: off-center ${centerError.toFixed(2)}`);
    if (size < 20) failures.push(`${width}/${opening}/${banner.dataset.surahFrame}: tiny ${size.toFixed(2)}px`);
    if (b.width > 640.6 || b.width > Math.min(width - 16, 640) + .6) failures.push(`${width}: overflow/stretch`);
    const sides = [...banner.querySelectorAll<HTMLElement>(".tby-surah-side")].map(el => el.getBoundingClientRect());
    if (Math.abs((sides[0].left + sides[1].right) / 2 - (b.left + b.right) / 2) > .8) failures.push(`${width}: asymmetric sides`);
  }
}

async function run() {
  // Mount once to load only the owned/local face; no Google font CSS imported.
  flushSync(() => checks.render(<Headers width={320} opening={false} names={SURAHS.slice(0, 1)} />));
  await document.fonts.load('400 100px "Tabyan Surah Amiri"');
  for (const width of widths) {
    for (const opening of [false, true]) {
      flushSync(() => checks.render(<Headers width={width} opening={opening} />));
      await nextFrame(); await nextFrame();
      check(width, opening);
    }
  }
  checks.unmount(); harness.remove();
  const selectedWidth = Math.max(320, Math.min(innerWidth, 640));
  const sample = [1, 18, 26, 63, 80, 114].map(n => SURAHS[n - 1]);
  const root = createRoot(document.getElementById("root")!);
  flushSync(() => root.render(<main style={{ padding: "24px 8px", background: "#fdfaf2", minHeight: "100vh", color: "#332b22" }}>
    <h1 style={{ font: "20px serif", textAlign: "center" }}>ترويسة السورة — Amiri Regular</h1>
    <p id="validation-result" data-status={failures.length ? "FAIL" : "PASS"} style={{ font: "14px monospace", textAlign: "center" }}>
      {failures.length ? `${failures.length} FAIL` : "2280 / 2280 PASS"} · min font {minimumFont.toFixed(2)}px
    </p>
    <p style={{ font: "12px monospace", textAlign: "center", overflowWrap: "anywhere" }}>{widths.join(" / ")}</p>
    <Headers width={selectedWidth} opening={false} names={sample} />
    <div style={{ height: 24 }} />
    <Headers width={selectedWidth} opening={true} names={sample.slice(0, 2)} />
    {failures.length ? <pre dir="ltr" style={{ whiteSpace: "pre-wrap" }}>{failures.join("\n")}</pre> : null}
  </main>));
  document.documentElement.dataset.validation = failures.length ? "FAIL" : "PASS";
  if (document.documentElement.scrollWidth > innerWidth) failures.push("fixture horizontal scroll");
}
void run().catch(error => {
  document.getElementById("root")!.textContent = `FAIL: ${String(error)}`;
  document.documentElement.dataset.validation = "FAIL";
});
