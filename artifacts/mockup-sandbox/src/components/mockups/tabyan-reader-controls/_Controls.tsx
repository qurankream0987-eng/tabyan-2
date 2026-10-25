/**
 * MushafControls — الشريط العلوي المضغوط لقارئ المصحف (ويب).
 *
 * RTL: يمين = القائمة (فهرس المصحف: السور/الأجزاء/الصفحات/العلامات) ·
 * الوسط = اسم السورة + «الجزء · الصفحة» · يسار = بحث + إعدادات.
 * الإعدادات قائمة مضغوطة بأقسام مطبَّقة فقط: المصحف · التلاوة · الحفظ.
 * الزر الرئيسي والأداة السياقية في ReaderModeFab (أسفل الشاشة)، لا شريط سفلي دائم.
 */
import { useEffect, useRef, useState } from "react";
import Icon from "./_Icon";
import { toArabicDigits } from "./_format";
import { useDarkMode } from "./_theme";
import type { HideMode } from "./_types";

interface ControlsProps {
  page: number;
  surahName: string;
  /** يستبدل العنوان والموضع (اختبار الحفظ قبل «إظهار الموضع») */
  titleOverride?: string | null;
  surahNumber: number | null;
  juz: number | null;
  bookmarked: boolean;
  zoom: number;
  visible: boolean;
  onMenuOpenChange: (open: boolean) => void;
  sessionActive: boolean;
  globalHideMode: HideMode;
  hideMarkers: boolean;
  onClose: () => void;
  onToggleBookmark: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onOpenIndex: () => void;
  onOpenSearch: () => void;
  onOpenHide: () => void;
  onOpenTools: () => void;
  onToggleHideMarkers: () => void;
  onRevealGlobalWord: () => void;
  /** يفتح مشغّل الاستماع (القارئ/التكرار) دون بدء التشغيل */
  onOpenListening: () => void;
  /** إعدادات تبيان AI المحفوظة الحقيقية فقط (صارم/تشكيل) */
  recitationToggles?: { key: string; label: string; badge?: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }[];
}

export default function MushafControls({
  page, surahName: rawSurahName, titleOverride = null, juz: rawJuz, bookmarked, zoom, visible,
  sessionActive, globalHideMode, hideMarkers, onMenuOpenChange,
  onClose, onToggleBookmark, onZoomIn, onZoomOut, onZoomReset,
  onOpenIndex, onOpenSearch, onOpenHide, onOpenTools, onToggleHideMarkers, onRevealGlobalWord, onOpenListening, recitationToggles = [],
}: ControlsProps) {
  const [dark, , toggleDark] = useDarkMode();
  const masked = titleOverride !== null;
  const surahName = masked ? titleOverride : rawSurahName;
  const juz = masked ? null : rawJuz;
  const isZoomed = zoom > 1.05;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { onMenuOpenChange(menuOpen); }, [menuOpen, onMenuOpenChange]);
  useEffect(() => () => onMenuOpenChange(false), [onMenuOpenChange]);
  useEffect(() => { if (!visible || masked) setMenuOpen(false); }, [visible, masked]);
  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const run = (action: () => void) => { setMenuOpen(false); action(); };
  const tab = !visible ? -1 : 0;

  return (
    <div
      className="tby-topbar tby-shell-topbar absolute inset-x-0 top-0 z-20"
      data-hidden={!visible}
      inert={!visible}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      dir="rtl"
    >
      <div className="tby-shell-toolbar">
        {/* يمين: القائمة / التنقل */}
        <button
          type="button"
          onClick={onOpenIndex}
          disabled={masked}
          className="tby-icon-btn"
          aria-label="فهرس المصحف"
          tabIndex={tab}
          data-testid="mushaf-menu-index"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <path d="M3 5.5h16M3 11h16M3 16.5h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {/* الوسط: السورة + الجزء/الصفحة */}
        <button
          type="button"
          onClick={onOpenIndex}
          className="tby-shell-title"
          aria-label={masked ? surahName ?? "" : `سورة ${surahName || "المصحف"}، صفحة ${page}${juz !== null ? `، الجزء ${toArabicDigits(juz)}` : ""} — فتح الفهرس`}
          disabled={masked}
          tabIndex={tab}
          data-testid="mushaf-title"
        >
          <span className="tby-shell-title-name font-amiri">
            {surahName ? (masked ? surahName : `سورة ${surahName}`) : "المصحف"}
          </span>
          {!masked && (
            <span className="tby-shell-title-meta">
              {juz !== null ? `الجزء ${toArabicDigits(juz)} · ` : ""}الصفحة {toArabicDigits(page)}
            </span>
          )}
        </button>

        {/* يسار: بحث + إعدادات */}
        <div className="tby-shell-actions" ref={menuRef}>
          <button
            type="button"
            onClick={onOpenSearch}
            disabled={masked}
            className="tby-icon-btn"
            aria-label="البحث في المصحف"
            tabIndex={tab}
            data-testid="mushaf-menu-search"
          >
            <Icon name="search" size={19} />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="tby-icon-btn"
            aria-label="إعدادات المصحف"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            tabIndex={tab}
            data-testid="mushaf-more-menu-trigger"
          >
            <Icon name="settings" size={20} />
          </button>
          {menuOpen && (
            <div className="tby-reader-more-menu tby-shell-settings" role="menu" aria-label="إعدادات المصحف">
              <p className="tby-settings-section">المصحف</p>
              <button type="button" role="menuitemcheckbox" aria-checked={dark} onClick={() => run(toggleDark)} className="tby-reader-more-item" data-testid="mushaf-menu-dark-mode">
                <Icon name={dark ? "sun" : "moon"} size={17} /><span>الوضع الليلي</span>
              </button>
              <button type="button" role="menuitemcheckbox" aria-checked={bookmarked} onClick={() => run(onToggleBookmark)} className="tby-reader-more-item" data-testid="mushaf-menu-bookmark">
                <Icon name="bookmark" size={17} /><span>{bookmarked ? "إزالة علامة الصفحة" : "علامة على الصفحة"}</span>
              </button>
              <div className="tby-zoom-row">
                <button type="button" onClick={onZoomOut} disabled={zoom <= 1.01} className="tby-icon-btn" aria-label="تصغير الصفحة" data-testid="mushaf-menu-zoom-out">
                  <Icon name="minus" size={17} />
                </button>
                <button type="button" onClick={onZoomReset} disabled={!isZoomed} className="tby-zoom-value" aria-label="إعادة التكبير" data-testid="mushaf-menu-zoom-reset">
                  {toArabicDigits(Math.round(zoom * 100))}٪
                </button>
                <button type="button" onClick={onZoomIn} className="tby-icon-btn" aria-label="تكبير الصفحة" data-testid="mushaf-menu-zoom-in">
                  <Icon name="plus" size={17} />
                </button>
              </div>

              <div className="tby-reader-more-separator" aria-hidden="true" />
              <p className="tby-settings-section">التلاوة</p>
              <button type="button" role="menuitemcheckbox" aria-checked={hideMarkers} onClick={onToggleHideMarkers} className="tby-reader-more-item" data-testid="mushaf-menu-hide-markers">
                <Icon name="eye-off" size={17} /><span>إخفاء علامات الآيات عند الإخفاء</span>
              </button>
              <button type="button" role="menuitem" onClick={() => run(onOpenHide)} className="tby-reader-more-item" aria-pressed={globalHideMode !== "visible_review"} data-testid="mushaf-menu-hide-mode">
                <Icon name="settings" size={17} /><span>إعداد الإخفاء والتسميع</span>
              </button>
              {recitationToggles.map((t) => (
                <button key={t.key} type="button" role="menuitemcheckbox" aria-checked={t.checked} onClick={() => t.onChange(!t.checked)} className="tby-reader-more-item" title={t.hint} data-testid={`mushaf-menu-${t.key}`}>
                  <Icon name="check-square" size={17} className="tby-settings-check" />
                  <span>{t.label}{t.badge ? <span className="tby-settings-badge">{t.badge}</span> : null}</span>
                </button>
              ))}
              {globalHideMode === "progressive_reveal" && !sessionActive && (
                <button type="button" role="menuitem" onClick={() => run(onRevealGlobalWord)} className="tby-reader-more-item" data-testid="mushaf-menu-reveal-word">
                  <Icon name="chevron-left" size={17} /><span>كشف الكلمة التالية</span>
                </button>
              )}

              <div className="tby-reader-more-separator" aria-hidden="true" />
              <p className="tby-settings-section">الاستماع</p>
              <button type="button" role="menuitem" onClick={() => run(onOpenListening)} disabled={sessionActive} className="tby-reader-more-item" data-testid="mushaf-menu-listening">
                <Icon name="headphones" size={17} /><span>القارئ والتكرار</span>
              </button>

              <div className="tby-reader-more-separator" aria-hidden="true" />
              <p className="tby-settings-section">الحفظ</p>
              <button type="button" role="menuitem" onClick={() => run(onOpenTools)} className="tby-reader-more-item" data-testid="mushaf-menu-tools">
                <Icon name="clock" size={17} /><span>الحفظ والمراجعة والسجل</span>
              </button>

              <div className="tby-reader-more-separator" aria-hidden="true" />
              <button type="button" role="menuitem" onClick={() => run(onClose)} className="tby-reader-more-item" data-testid="mushaf-menu-close">
                <Icon name="arrow-left" size={17} /><span>إغلاق المصحف</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
