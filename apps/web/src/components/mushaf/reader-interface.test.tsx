import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Audio from "./MushafAudioBar";
import Index from "./MushafIndexSheet";
import Tools from "./ReaderToolsSheet";
import Actions from "./AyahActionSheet";
import Controls from "./MushafControls";
import Sheet from "./ReaderSheet";

vi.mock("@/lib/theme-preference", () => ({
  useDarkMode: () => [false, () => undefined, () => undefined],
}));
const noop = () => undefined;
const audioProps = {
  surahName: "الفاتحة", ayahNum: 1, isPlaying: false, isLoading: false, error: null,
  repeat: 1, reciterId: "Minshawy_Murattal_128kbps" as const,
  onTogglePlay: noop, onNext: noop, onPrev: noop, onRepeatChange: noop,
  onReciterChange: noop, onClose: noop, onClearError: noop,
};
describe("reader presentation contracts", () => {
  it("blocks duplicate play while loading but keeps skip and close available", () => {
    const html = renderToStaticMarkup(<Audio {...audioProps} isLoading />);
    const button = (id: string) => html.match(new RegExp(`<button[^>]*data-testid="${id}"[^>]*>`))?.[0];
    expect(button("audio-toggle")).toContain(' disabled=""');
    for (const id of ["audio-next", "audio-prev", "audio-close"]) {
      expect(button(id)).toBeTruthy();
      expect(button(id)).not.toContain(' disabled=""');
    }
  });
  it("shows retry errors and the real repeat state", () => {
    const html = renderToStaticMarkup(<Audio {...audioProps} error="تعذر تحميل الصوت" repeat={3} />);
    expect(html).toContain("تعذر تحميل الصوت");
    expect(html).toContain('data-testid="audio-retry"');
    expect(html).toMatch(/aria-pressed="true"[^>]*data-testid="audio-repeat"/);
  });
  it("keeps 114 canonical surah navigation choices and identifies the current one", () => {
    const html = renderToStaticMarkup(<Index currentPage={1} bookmarks={[1]} onNavigate={noop} onClose={noop} />);
    expect(html.match(/data-testid="mushaf-index-surah-\d+"/g)).toHaveLength(114);
    expect(html).toMatch(/data-testid="mushaf-index-surah-1"[^>]*aria-current="page"|aria-current="page"[^>]*data-testid="mushaf-index-surah-1"/);
    expect(html).toContain("أنت هنا");
  });
  it("preserves masked test location instead of revealing a chapter or page", () => {
    const html = renderToStaticMarkup(<Controls page={500} surahName="الدخان" surahNumber={44} juz={25} titleOverride="اختبار الحفظ"
      bookmarked={false} zoom={1} visible sessionActive globalHideMode="full_hide" hideMarkers={false}
      onMenuOpenChange={noop} onClose={noop} onToggleBookmark={noop} onZoomIn={noop} onZoomOut={noop} onZoomReset={noop}
      onOpenIndex={noop} onOpenSearch={noop} onOpenHide={noop} onOpenTools={noop} onToggleHideMarkers={noop}
      onRevealGlobalWord={noop} onOpenListening={noop} />);
    expect(html).toContain("اختبار الحفظ");
    expect(html).not.toContain("الدخان");
    expect(html).not.toContain("٥٠٠");
    expect(html).toMatch(/disabled=""[^>]*data-testid="mushaf-menu-index"/);
    expect(html).toMatch(/disabled=""[^>]*data-testid="mushaf-top-bookmark"/);
  });
  it("exposes the page bookmark in the header with its persisted state", () => {
    const html = renderToStaticMarkup(<Controls page={3} surahName="البقرة" surahNumber={2} juz={1}
      bookmarked zoom={1} visible sessionActive={false} globalHideMode="visible_review" hideMarkers={false}
      onMenuOpenChange={noop} onClose={noop} onToggleBookmark={noop} onZoomIn={noop} onZoomOut={noop} onZoomReset={noop}
      onOpenIndex={noop} onOpenSearch={noop} onOpenHide={noop} onOpenTools={noop} onToggleHideMarkers={noop}
      onRevealGlobalWord={noop} onOpenListening={noop} />);
    expect(html).toMatch(/aria-pressed="true"[^>]*data-testid="mushaf-top-bookmark"/);
    expect(html).toContain('aria-label="إزالة علامة الصفحة"');
  });
  it("shows accessible Quran-wide page progress without replacing the page indicator", () => {
    const html = renderToStaticMarkup(<Controls page={302} surahName="البقرة" surahNumber={2} juz={16}
      bookmarked={false} zoom={1} visible sessionActive={false} globalHideMode="visible_review" hideMarkers={false}
      onMenuOpenChange={noop} onClose={noop} onToggleBookmark={noop} onZoomIn={noop} onZoomOut={noop} onZoomReset={noop}
      onOpenIndex={noop} onOpenSearch={noop} onOpenHide={noop} onOpenTools={noop} onToggleHideMarkers={noop}
      onRevealGlobalWord={noop} onOpenListening={noop} />);
    expect(html).toMatch(/role="progressbar"[^>]*aria-valuemin="1"[^>]*aria-valuemax="604"[^>]*aria-valuenow="302"/);
    expect(html).toContain('aria-valuetext="الصفحة ٣٠٢ من ٦٠٤"');
    expect(html).toContain('data-testid="mushaf-title"');
  });
  it("does not expose unsupported recitation or test actions", () => {
    const html = renderToStaticMarkup(<Actions verseKey="1:1" page={1} bookmarked={false} recitationEnabled={false}
      onReciteFromHere={noop} onListenFromHere={noop} onToggleBookmark={noop} onShare={noop} onClose={noop} />);
    expect(html).toContain('data-testid="ayah-action-headphones"');
    expect(html).not.toContain('data-testid="ayah-action-mic"');
    expect(html).not.toContain('data-testid="ayah-action-check-square"');
  });
  it("announces tool unavailability and prevents closing a locked sheet", () => {
    const html = renderToStaticMarkup(<Tools tools={[{
      key: "test", icon: "mic", label: "تسميع", description: "", onSelect: noop, disabledReason: "أنهِ الجلسة الحالية أولاً",
    }]} onClose={noop} />);
    expect(html).toContain("أنهِ الجلسة الحالية أولاً");
    expect(html).toContain("aria-describedby");
    expect(html).toContain("disabled");
    expect(renderToStaticMarkup(<Sheet title="مقفلة" dismissible={false} onClose={noop}>فحص</Sheet>))
      .toMatch(/disabled=""[^>]*data-testid="reader-sheet-close"/);
  });
});
