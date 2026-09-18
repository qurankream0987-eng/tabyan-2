/**
 * MushafIndexSheet — فهرس المصحف كـ Bottom Sheet داخل القارئ.
 * Tabs: السور / الأجزاء / الصفحات / العلامات
 * الاختيار ينقل للصفحة مباشرةً ويُغلق الـ sheet.
 */
import { useState, useMemo } from "react";
import Icon from "@/components/app/Icon";
import { SURAHS, JUZ_LIST, TOTAL_PAGES } from "@/lib/quran-data";
import { toArabicDigits } from "@/lib/mushaf/format";
import { normalizeDigits } from "@workspace/tabyan-trpc/input-normalization";

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
    { key: "bookmarks", label: "العلامات" },
  ];

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 bg-[var(--card)] rounded-t-3xl flex flex-col max-h-[90vh]" style={{ touchAction: "auto" }}>
        {/* مقبض + عنوان */}
        <div className="flex flex-col items-center pt-3 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20 mb-3" />
          <div className="flex items-center justify-between w-full px-4 pb-2">
            <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition">
              <Icon name="x" size={17} />
            </button>
            <h2 className="font-amiri text-lg font-bold text-burgundy">فهرس المصحف</h2>
            <div className="w-9" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-2 shrink-0">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-xl font-readex text-xs font-bold transition ${
                tab === t.key
                  ? "bg-burgundy text-white dark:bg-gold dark:text-burgundy"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* المحتوى */}
        <div className="flex-1 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">

          {/* السور */}
          {tab === "surahs" && (
            <div className="space-y-2">
              <div className="relative">
                <Icon name="search" size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ابحث عن سورة…"
                  className="w-full rounded-xl bg-muted/40 px-3 py-2.5 pr-9 font-readex text-sm text-foreground outline-none focus:ring-1 focus:ring-burgundy/30"
                  dir="rtl"
                />
              </div>
              <div className="space-y-px">
                {filteredSurahs.map(s => (
                  <button
                    key={s.n}
                    onClick={() => go(s.startPage)}
                    className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition text-right ${
                      s.startPage === currentPage || (currentPage >= s.startPage && SURAHS[s.n]?.startPage > currentPage)
                        ? "bg-burgundy/5 dark:bg-gold/5"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-burgundy/8 dark:bg-gold/8 flex items-center justify-center shrink-0">
                      <span className="font-readex text-xs text-burgundy dark:text-gold">{toArabicDigits(s.n)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-amiri text-base text-foreground leading-tight">{s.name}</div>
                      <div className="font-readex text-[10px] text-muted-foreground">
                        {toArabicDigits(s.ayahs)} آية · صفحة {toArabicDigits(s.startPage)}
                      </div>
                    </div>
                    <Icon name="arrow-left" size={13} className="text-muted-foreground/50 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* الأجزاء */}
          {tab === "juz" && (
            <div className="space-y-px">
              {JUZ_LIST.map(j => (
                <button
                  key={j.n}
                  onClick={() => go(j.startPage)}
                  className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-muted/40 transition text-right"
                >
                  <div className="w-9 h-9 rounded-full bg-burgundy/8 dark:bg-gold/8 flex items-center justify-center shrink-0">
                    <span className="font-readex text-xs text-burgundy dark:text-gold">{toArabicDigits(j.n)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-amiri text-base text-foreground leading-tight">{j.name}</div>
                    <div className="font-readex text-[10px] text-muted-foreground">صفحة {toArabicDigits(j.startPage)}</div>
                  </div>
                  <Icon name="arrow-left" size={13} className="text-muted-foreground/50 shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* الصفحات — انتقال مباشر */}
          {tab === "pages" && (
            <div className="space-y-4">
              <p className="font-readex text-sm text-muted-foreground text-center pt-2">
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
                className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 font-readex text-xl text-center outline-none focus:border-burgundy dark:focus:border-gold transition"
              />
              <button
                onClick={() => {
                  const n = parseInt(pageInput, 10);
                  if (!isNaN(n) && n >= 1 && n <= TOTAL_PAGES) go(n);
                }}
                disabled={!pageInput || parseInt(pageInput) < 1 || parseInt(pageInput) > TOTAL_PAGES}
                className="w-full py-3 rounded-2xl bg-burgundy dark:bg-gold text-white dark:text-burgundy font-readex font-bold text-sm btn-press transition disabled:opacity-40"
              >
                انتقل
              </button>
            </div>
          )}

          {/* العلامات */}
          {tab === "bookmarks" && (
            <div>
              {bookmarks.length === 0 ? (
                <div className="text-center py-12">
                  <Icon name="bookmark" size={28} className="text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-amiri text-lg text-foreground mb-1">لا توجد علامات بعد</p>
                  <p className="font-readex text-sm text-muted-foreground">اضغط زر العلامة في القارئ لحفظ صفحة</p>
                </div>
              ) : (
                <div className="space-y-px">
                  {bookmarks.map(p => (
                    <button
                      key={p}
                      onClick={() => go(p)}
                      className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-muted/40 transition text-right"
                    >
                      <div className="w-9 h-9 rounded-full bg-gold/15 dark:bg-gold/15 flex items-center justify-center shrink-0">
                        <Icon name="bookmark" size={16} className="text-gold-dark dark:text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-amiri text-base text-foreground leading-tight">{surahNameForPage(p)}</div>
                        <div className="font-readex text-[10px] text-muted-foreground">صفحة {toArabicDigits(p)}</div>
                      </div>
                      <Icon name="arrow-left" size={13} className="text-muted-foreground/50 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
