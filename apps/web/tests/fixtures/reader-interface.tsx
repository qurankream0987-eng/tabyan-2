/** Development-only real-component checks, never an auth bypass or build entry.
 * All callbacks are local probes; there is no audio element, ASR, user data or backend mutation. */
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import Controls from "../../src/components/mushaf/MushafControls";
import Index from "../../src/components/mushaf/MushafIndexSheet";
import Search from "../../src/components/mushaf/MushafSearchSheet";
import Tools from "../../src/components/mushaf/ReaderToolsSheet";
import Actions from "../../src/components/mushaf/AyahActionSheet";
import Audio from "../../src/components/mushaf/MushafAudioBar";
import Mode from "../../src/components/mushaf/ReaderModeFab";
import Sheet from "../../src/components/mushaf/ReaderSheet";
import Page from "../../src/components/mushaf/MushafPage";
import PageFrame from "../../src/components/mushaf/MushafPageFrame";
import { loadPage, computeMushafPageFit } from "../../src/lib/mushaf/pages";
import { ensurePageFont } from "../../src/lib/mushaf/fonts";
import { installWebDesignTokens } from "../../src/lib/design-tokens";
import "../../src/index.css";
import "../../src/components/mushaf/mushaf-reader.css";

installWebDesignTokens();
const root = createRoot(document.getElementById("root")!);
const noop = () => undefined;
let calls: string[] = [];
const probe = (key: string) => () => calls.push(key);
const failures: string[] = [];
const pause = () => new Promise(resolve => setTimeout(resolve, 20));
function check(ok: unknown, text: string) { if (!ok) failures.push(text); }
function find(id: string) { return document.querySelector<HTMLElement>(`[data-testid="${id}"]`); }
async function mount(node: React.ReactNode) {
  flushSync(() => root.render(<div className="tby-reader fixed inset-0" data-mode="read" data-fit="aspect" dir="rtl">{node}</div>));
  await pause();
}
async function click(id: string) { check(find(id), `missing ${id}`); find(id)?.click(); await pause(); }
const audioProps = {
  surahName: "الفاتحة", ayahNum: 1, isPlaying: false, isLoading: false, error: null,
  repeat: 1, reciterId: "Minshawy_Murattal_128kbps" as const,
  onTogglePlay: probe("play"), onNext: probe("next"), onPrev: probe("prev"),
  onRepeatChange: (n: number) => calls.push(`repeat:${n}`), onReciterChange: noop,
  onClose: probe("close"), onClearError: probe("clear"),
};
const tools = [
  { key: "history", icon: "clock" as const, label: "سجل المراجعة", description: "العودة إلى نتائج الجلسات السابقة", onSelect: probe("history") },
  { key: "test", icon: "check-square" as const, label: "اختبار الحفظ", description: "اختبار من الموضع الحالي", onSelect: probe("test") },
  { key: "disabled", icon: "mic" as const, label: "تسميع تعليمي", description: "", disabledReason: "غير متاح أثناء جلسة أخرى", onSelect: probe("disabled") },
];
async function run() {
  await mount(<Audio {...audioProps} isLoading />);
  await click("audio-next");
  await click("audio-prev");
  check(calls.includes("next") && calls.includes("prev"), "audio skip during loading");
  check((find("audio-toggle") as HTMLButtonElement)?.disabled, "loading play must be disabled");
  calls = [];
  await mount(<Audio {...audioProps} error="تعذر تحميل الصوت" />);
  await click("audio-retry");
  check(calls.join(",") === "play", "audio retry callback");
  await mount(<Audio {...audioProps} />);
  await click("audio-repeat");
  check(calls.includes("repeat:3"), "repeat transitions");
  await mount(<Index currentPage={1} bookmarks={[1, 50]} onNavigate={p => calls.push(`page:${p}`)} onClose={probe("close")} />);
  check(find("mushaf-index-surah-1")?.getAttribute("aria-current") === "page", "current surah");
  await click("mushaf-index-surah-2");
  check(calls.includes("page:2"), "canonical surah navigation");
  await mount(<Tools tools={tools} onClose={probe("close")} />);
  const unavailable = document.querySelector<HTMLButtonElement>('button[disabled][aria-describedby]');
  check(unavailable?.textContent?.includes("غير متاح أثناء جلسة أخرى"), "disabled tool reason");
  calls = [];
  await mount(<Actions verseKey="1:1" page={1} bookmarked={false} recitationEnabled
    onReciteFromHere={probe("recite")} onListenFromHere={(s,a) => calls.push(`listen:${s}:${a}`)}
    onToggleBookmark={probe("bookmark")} onShare={probe("share")} onClose={probe("close")} />);
  await click("ayah-action-headphones");
  check(calls.includes("listen:1:1"), "canonical ayah listening callback");
  await mount(<Sheet title="فحص التركيز" onClose={probe("close")}><button id="last-focus">آخر عنصر</button></Sheet>);
  const last = document.getElementById("last-focus")!;
  last.focus();
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
  check(document.activeElement === find("reader-sheet-close"), "dialog focus trap");
  calls = [];
  await mount(<Sheet title="ورقة مقفلة" dismissible={false} onClose={probe("close")}><button>عنصر</button></Sheet>);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  check(calls.length === 0, "locked dialog Escape");
  await mount(<Mode mode="read" icon="quran" label="قراءة" state="idle" hidden={false}
    onAction={noop} onModeChange={probe("mode")} actionOpensSelector />);
  await click("mushaf-mode-fab");
  check(find("mushaf-mode-listen"), "mode picker opens");

  const [page] = await Promise.all([loadPage(3), ensurePageFont(3)]);
  await document.fonts.ready;
  function Preview() {
    const [surface, setSurface] = useState(new URLSearchParams(location.search).get("surface") ?? "");
    const [bookmarked, setBookmarked] = useState(false);
    const fit = computeMushafPageFit(innerWidth, innerHeight - 120);
    const close = () => setSurface("");
    return <div className="tby-reader fixed inset-0 flex flex-col" data-mode="read" data-fit={fit.mode} data-chrome="reserved" dir="rtl">
      <div className="tby-reader-viewport"><div className="tby-reading-stage"><PageFrame width={fit.w} height={fit.h} mode={fit.mode}><Page data={page} width={fit.w} height={fit.h} /></PageFrame></div></div>
      <Controls page={3} surahName="البقرة" surahNumber={2} juz={1} bookmarked={bookmarked} zoom={1} visible
        sessionActive={false} globalHideMode="visible_review" hideMarkers={false} onMenuOpenChange={noop}
        onClose={noop} onToggleBookmark={() => setBookmarked(v => !v)} onZoomIn={noop} onZoomOut={noop} onZoomReset={noop}
        onOpenIndex={() => setSurface("index")} onOpenSearch={() => setSurface("search")} onOpenHide={() => setSurface("tools")}
        onOpenTools={() => setSurface("tools")} onToggleHideMarkers={noop} onRevealGlobalWord={noop} onOpenListening={() => setSurface("audio")} />
      <Mode mode="read" icon="quran" label="قراءة" state="idle" hidden={false} onAction={noop} onModeChange={noop} actionOpensSelector />
      {surface === "index" && <Index currentPage={3} bookmarks={[3,50]} onNavigate={noop} onClose={close} />}
      {surface === "search" && <Search onNavigate={noop} onClose={close} />}
      {surface === "tools" && <Tools tools={tools} onClose={close} />}
      {surface === "ayah" && <Actions verseKey="2:5" page={3} bookmarked={false} recitationEnabled
        onReciteFromHere={noop} onListenFromHere={noop} onToggleBookmark={noop} onShare={noop} onClose={close} />}
      {surface === "audio" && <Audio {...audioProps} onClose={close} />}
      <output id="reader-check-result" data-failures={JSON.stringify(failures)} style={{
        position: "fixed", bottom: 8, left: 8, zIndex: 300, padding: "4px 8px", background: "var(--cream)", color: "var(--burgundy)", fontSize: 11,
      }}>{failures.length ? `FAIL: ${failures.join("; ")}` : "PASS — فحص مكونات محلي، وليس جلسة مسجّلة"}</output>
    </div>;
  }
  flushSync(() => root.render(<Preview />));
}
run().catch(error => {
  document.body.innerText = `FIXTURE ERROR: ${String(error)}`;
  console.error(error);
});
