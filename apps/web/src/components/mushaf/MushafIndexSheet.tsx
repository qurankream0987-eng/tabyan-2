/**
 * MushafIndexSheet — فهرس المصحف كـ Bottom Sheet داخل القارئ.
 * Tabs: السور / الأجزاء / الصفحات / العلامات
 * الاختيار ينقل للصفحة مباشرةً ويُغلق الـ sheet.
 */
import { useState, useMemo } from "react";
import Icon from "@/components/app/Icon";
import ReaderSheet from "./ReaderSheet";
import { SURAHS, JUZ_LIST, TOTAL_PAGES } from "@/lib/quran-data";
import { toArabicDigits } from "@/lib/mushaf/format";
import { normalizeDigits } from "@workspace/tabyan-domain/input-normalization";

type Tab = "surahs" | "juz" | "pages" | "bookmarks";

interface Props {
  currentPage: number;
  bookmarks: number[];
  onNavigate: (page: number) => void;
  onClose: () => void;
}

function surahNameForPage(page: number): string {
  let name = SURAHS[0].name;
  for (const s of SURAHS) {
    if (s.startPage <= page) name = s.name;
    else break;
  }
  return name;
}

export default function MushafIndexSheet({ currentPage, bookmarks, onNavigate, onClose }: Props) {
  const [tab, setTab]     = useState<Tab>("surahs");
  const [search, setSearch] = useState("");
  const [pageInput, setPageInput] = useState("");

  const filteredSurahs = useMemo(
    () => search ? SURAHS.filter(s => s.name.includes(search.trim())) : SURAHS,
    [search]
  );

  const go = (page: number) => { onNavigate(page); onClose(); };

  const tabs: { key: Tab; label: string }[] = [
    { key: "surahs",    label: "السور"    },
    { key: "juz",       label: "الأجزاء"  },
    { key: "pages",     label: "الصفحات"  },
    { key: "bookmarks", label: "المحفوظات" },
  ];

  return (
    <ReaderSheet title="فهرس المصحف" subtitle={`صفحة ${toArabicDigits(currentPage)} من ${toArabicDigits(TOTAL_PAGES)}`} onClose={onClose}>
        {/* Tabs */}
        <div className="tby-index-tabs flex gap-1 mb-3 sticky top-0 z-10 bg-[var(--mushaf-chrome-solid)]" role="tablist" aria-label="أقسام الفهرس">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className="tby-index-tab flex-1 min-h-11 font-readex text-xs font-bold"
              data-testid={`mushaf-index-tab-${t.key}`}
              data-active={tab === t.key}
            >
              {t.label}
              {t.key === "bookmarks" && bookmarks.length > 0 && (
                <span className="tby-index-tab-count" aria-label={`${toArabicDigits(bookmarks.length)} علامة`}>{toArabicDigits(bookmarks.length)}</span>
              )}
            </button>
          ))}
        </div>

        {/* المحتوى */}
        <div>

          {/* السور */}
          {tab === "surahs" && (
            <div className="space-y-2">
              <div className="relative">
                <Icon name="search" size={15} className="tby-index-search-icon absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ابحث عن سورة…"
                  aria-label="ابحث عن سورة"
                  className="tby-index-search w-full rounded-xl px-3 py-2.5 pr-9 font-readex text-sm"
                  dir="rtl"
                  data-testid="mushaf-index-surah-search"
                />
              </div>
              {filteredSurahs.length === 0 && (
                <div className="tby-reader-empty" role="status">
                  <Icon name="search" size={22} className="tby-index-empty-icon" />
                  <p className="tby-index-label font-amiri text-lg">لا سورة بهذا الاسم</p>
                  <p className="tby-index-meta font-readex text-xs">جرّب جزءاً من الاسم دون «ال»، أو ابحث برقم الصفحة.</p>
                  <button type="button" onClick={() => setSearch("")} className="tby-chip h-9 px-4 rounded-full font-readex text-xs font-bold">مسح البحث</button>
                </div>
              )}
              <div className="space-y-px">
                {filteredSurahs.map(s => {
                  const nextSurah = SURAHS[s.n];
                  const isCurrent = s.startPage <= currentPage
                    && (!nextSurah || currentPage < nextSurah.startPage);
                  return (
                    <button
                      key={s.n}
                      type="button"
                      onClick={() => go(s.startPage)}
                      data-testid={`mushaf-index-surah-${s.n}`}
                      aria-current={isCurrent ? "page" : undefined}
                      className="tby-index-row w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition text-right"
                    >
                      <div className="tby-index-number w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                        <span className="font-readex text-xs">{toArabicDigits(s.n)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="tby-index-label font-amiri text-base leading-tight">{s.name}</div>
                        <div className="tby-index-meta font-readex text-[10px]">
                          {toArabicDigits(s.ayahs)} آية · صفحة {toArabicDigits(s.startPage)}
                        </div>
                      </div>
                      {isCurrent && <span className="tby-index-current">أنت هنا</span>}
                      <Icon name="arrow-left" size={13} className="tby-index-arrow shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* الأجزاء */}
          {tab === "juz" && (
            <div className="space-y-px">
              {JUZ_LIST.map((j, idx) => {
                const nextJuz = JUZ_LIST[idx + 1];
                const juzCurrent = j.startPage <= currentPage && (!nextJuz || currentPage < nextJuz.startPage);
                return (
                <button
                  key={j.n}
                  type="button"
                  onClick={() => go(j.startPage)}
                  aria-current={juzCurrent ? "page" : undefined}
                  data-testid={`mushaf-index-juz-${j.n}`}
                  className="tby-index-row w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition text-right"
                >
                  <div className="tby-index-number w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                    <span className="font-readex text-xs">{toArabicDigits(j.n)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="tby-index-label font-amiri text-base leading-tight">{j.name}</div>
                    <div className="tby-index-meta font-readex text-[10px]">صفحة {toArabicDigits(j.startPage)}</div>
                  </div>
                  {juzCurrent && <span className="tby-index-current">أنت هنا</span>}
                  <Icon name="arrow-left" size={13} className="tby-index-arrow shrink-0" />
                </button>
                );
              })}
            </div>
          )}

          {/* الصفحات — انتقال مباشر */}
          {tab === "pages" && (
            <div className="space-y-4">
              <p className="tby-index-meta font-readex text-sm text-center pt-2">
                الصفحة الحالية: {toArabicDigits(currentPage)} / {toArabicDigits(TOTAL_PAGES)}
              </p>
              <input
                autoFocus
                inputMode="numeric"
                value={pageInput}
                 onChange={e => setPageInput(normalizeDigits(e.target.value).replace(/[^0-9]/g, ""))}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    const n = parseInt(pageInput, 10);
                    if (!isNaN(n) && n >= 1 && n <= TOTAL_PAGES) go(n);
                  }
                }}
                placeholder={`1 – ${TOTAL_PAGES}`}
                aria-label="رقم الصفحة"
                aria-invalid={!!pageInput && (parseInt(pageInput, 10) < 1 || parseInt(pageInput, 10) > TOTAL_PAGES)}
                aria-describedby="tby-page-hint"
                data-testid="mushaf-index-page-input"
                className="tby-index-page-input w-full rounded-2xl border-2 px-4 py-3 font-readex text-xl text-center transition"
              />
              <p id="tby-page-hint" className="tby-index-meta font-readex text-xs text-center" aria-live="polite">
                {pageInput && (parseInt(pageInput, 10) < 1 || parseInt(pageInput, 10) > TOTAL_PAGES)
                  ? <span className="tby-index-invalid">اكتب رقماً بين ١ و{toArabicDigits(TOTAL_PAGES)}</span>
                  : pageInput ? `سورة ${surahNameForPage(parseInt(pageInput, 10))}` : "اكتب رقم الصفحة ثم اضغط Enter"}
              </p>
              <button
                type="button"
                data-testid="mushaf-index-page-go"
                onClick={() => {
                  const n = parseInt(pageInput, 10);
                  if (!isNaN(n) && n >= 1 && n <= TOTAL_PAGES) go(n);
                }}
                disabled={!pageInput || parseInt(pageInput) < 1 || parseInt(pageInput) > TOTAL_PAGES}
                className="tby-index-go w-full py-3 rounded-2xl font-readex font-bold text-sm btn-press transition"
              >
                انتقل
              </button>
            </div>
          )}

          {/* العلامات */}
          {tab === "bookmarks" && (
            <div>
              {bookmarks.length === 0 ? (
                <div className="tby-reader-empty" role="status">
                  <Icon name="bookmark" size={28} className="tby-index-empty-icon mx-auto mb-3" />
                  <p className="tby-index-label font-amiri text-lg mb-1">لا توجد علامات بعد</p>
                  <p className="tby-index-meta font-readex text-sm">احفظ صفحتك من «إعدادات المصحف» أو من إجراءات الآية لتعود إليها من هنا.</p>
                </div>
              ) : (
                <div className="space-y-px">
                  {bookmarks.map(p => (
                      <button
                      key={p}
                      type="button"
                      onClick={() => go(p)}
                      aria-current={p === currentPage ? "page" : undefined}
                      data-testid={`mushaf-index-bookmark-${p}`}
                        className="tby-index-row w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition text-right"
                    >
                        <div className="tby-index-number w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                          <Icon name="bookmark" size={16} className="tby-index-number-icon" />
                      </div>
                      <div className="flex-1 min-w-0">
                          <div className="tby-index-label font-amiri text-base leading-tight">{surahNameForPage(p)}</div>
                          <div className="tby-index-meta font-readex text-[10px]">صفحة {toArabicDigits(p)}</div>
                      </div>
                        <Icon name="arrow-left" size={13} className="tby-index-arrow shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
    </ReaderSheet>
  );
}
