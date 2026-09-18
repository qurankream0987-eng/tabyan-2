import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import Icon from "@/components/app/Icon";
import { SURAHS, JUZ_LIST, TOTAL_PAGES } from "@/lib/quran-data";
import MushafReader from "@/components/mushaf/MushafReader";
import { cachedPageCount, clearMushafCache, purgeLegacyMushafCaches } from "@/lib/mushaf/pages";
import { toArabicDigits } from "@/lib/mushaf/format";

// ── مفاتيح التخزين المحلي ────────────────────────────────────────────
const LS_LAST_PAGE = "tabyan.mushaf.lastPage";
const LS_BOOKMARKS = "tabyan.mushaf.bookmarks";

// اسم السورة لأول آية في الصفحة
function surahNameForPage(page: number): string {
  let name = SURAHS[0].name;
  for (const s of SURAHS) {
    if (s.startPage <= page) name = s.name;
    else break;
  }
  return name;
}

// ═══════════════════════════════════════════════════════════════════
// عارض الصفحة (القارئ) — قارئ بخطوط QCF v2 متجهة (src/components/mushaf)
// ═══════════════════════════════════════════════════════════════════
function ReaderView({
  page,
  onClose,
  onNavigate,
  bookmarks,
  toggleBookmark,
}: {
  page: number;
  onClose: () => void;
  onNavigate: (p: number) => void;
  bookmarks: number[];
  toggleBookmark: (p: number) => void;
}) {
  // آخر صفحة مقروءة — نفس مفتاح التخزين السابق، تُحدَّث عند كل تنقل
  useEffect(() => {
    try { localStorage.setItem(LS_LAST_PAGE, String(page)); } catch { /* */ }
  }, [page]);
  return (
    <MushafReader
      page={page}
      onClose={onClose}
      onNavigate={onNavigate}
      bookmarks={bookmarks}
      toggleBookmark={toggleBookmark}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// الصفحة الرئيسية — الفهرس
// ═══════════════════════════════════════════════════════════════════
export default function MushafFahd() {
  const [tab, setTab]             = useState<"surahs" | "juz" | "bookmarks">("surahs");
  const [search, setSearch]       = useState("");
  const [reader, setReader]       = useState<number | null>(null);
  const [lastPage, setLastPage]   = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    purgeLegacyMushafCaches();
    try {
      const lp = localStorage.getItem(LS_LAST_PAGE);
      if (lp) { const n = parseInt(lp, 10); if (!isNaN(n)) setLastPage(n); }
      // رابط مباشر لصفحة: /student/mushaf-fahd?page=250
      const qp = new URLSearchParams(window.location.search).get("page");
      if (qp) {
        const n = parseInt(qp, 10);
        if (!isNaN(n) && n >= 1 && n <= TOTAL_PAGES) { setReader(n); setLastPage(n); }
      }
      const bm = localStorage.getItem(LS_BOOKMARKS);
      if (bm) {
        const arr = JSON.parse(bm);
        if (Array.isArray(arr)) setBookmarks(arr.filter((x) => typeof x === "number"));
      }
    } catch { /* */ }
    cachedPageCount().then(setSavedCount).catch(() => {});
  }, []);

  useEffect(() => {
    if (reader === null) cachedPageCount().then(setSavedCount).catch(() => {});
  }, [reader]);

  const persistBookmarks = useCallback((next: number[]) => {
    setBookmarks(next);
    try { localStorage.setItem(LS_BOOKMARKS, JSON.stringify(next)); } catch { /* */ }
  }, []);

  const toggleBookmark = useCallback((p: number) => {
    persistBookmarks(
      bookmarks.includes(p)
        ? bookmarks.filter((b) => b !== p)
        : [...bookmarks, p].sort((a, b) => a - b)
    );
  }, [bookmarks, persistBookmarks]);

  const openPage = useCallback((p: number) => {
    setReader(p);
    setLastPage(p);
  }, []);

  const filteredSurahs = useMemo(
    () => (search ? SURAHS.filter((s) => s.name.includes(search.trim())) : SURAHS),
    [search]
  );

  async function handleClearOffline() {
    await clearMushafCache();
    setSavedCount(0);
  }

  // ── عرض القارئ — ملء الشاشة كاملاً عبر portal ──
  if (reader !== null) {
    return createPortal(
      <ReaderView
        page={reader}
        onClose={() => setReader(null)}
        onNavigate={openPage}
        bookmarks={bookmarks}
        toggleBookmark={toggleBookmark}
      />,
      document.body
    );
  }

  // ── الفهرس ──
  return (
    <div className="space-y-4 page-enter pb-32" dir="rtl">
      {/* العنوان */}
      <div className="text-center">
        <div className="w-14 h-14 mx-auto icon-bubble text-burgundy mb-3">
          <Icon name="quran" size={26} />
        </div>
        <h1 className="font-amiri text-2xl font-bold text-burgundy">
          مصحف
        </h1>
        <p className="font-readex text-sm text-muted-foreground mt-1">
          رواية حفص — الطبعة المدنية ٦٠٤ صفحات
        </p>
      </div>

      {/* بطاقات المزايا */}
      <div className="grid grid-cols-3 gap-2.5">
        {([
          { icon: "quran"   as const, label: "القرآن الكريم",  to: null },
          { icon: "mosque"  as const, label: "مواقيت الصلاة",  to: "/student/prayer-times" },
          { icon: "map-pin" as const, label: "اتجاه القبلة",   to: "/student/qibla" },
        ]).map((f) => {
          const body = (
            <>
              <span className="w-11 h-11 icon-bubble text-burgundy transition-transform duration-300 group-hover:scale-110">
                <Icon name={f.icon} size={22} />
              </span>
              <span className="font-readex text-xs font-bold leading-tight text-burgundy">{f.label}</span>
            </>
          );
          const cls = "group glass rounded-[1.25rem] py-4 px-2 flex flex-col items-center gap-2 text-center shadow-card border transition-all duration-300 hover:-translate-y-0.5";
          return f.to ? (
            <Link key={f.label} to={f.to}
              className={`${cls} border-border text-foreground hover:border-gold/50`}>
              {body}
            </Link>
          ) : (
            <div key={f.label}
              className={`${cls} border-gold/60 dark:border-gold/50 text-burgundy ring-1 ring-gold/40`}>
              {body}
            </div>
          );
        })}
      </div>

      {/* حالة القراءة دون اتصال */}
      {savedCount > 0 && (
        <div className="flex items-center gap-2.5 glass rounded-2xl border border-gold/30 dark:border-gold/25 bg-gold/5 dark:bg-gold/10 px-4 py-2.5">
          <Icon name="download" size={16} className="text-gold-dark dark:text-gold shrink-0" />
          <span className="flex-1 font-readex text-xs text-foreground">
            {toArabicDigits(savedCount)} صفحة محفوظة للقراءة دون اتصال
          </span>
          <button
            onClick={handleClearOffline}
            className="font-readex text-[11px] text-muted-foreground hover:text-burgundy dark:hover:text-gold transition btn-press"
          >
            تفريغ
          </button>
        </div>
      )}

      {/* التبويبات */}
      <div className="flex rounded-xl bg-burgundy/5 dark:bg-gold/5 p-1 gap-1">
        {([ ["surahs","السور"], ["juz","الأجزاء"], ["bookmarks","العلامات"] ] as const).map(([key,label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 rounded-lg font-readex text-sm font-bold transition ${
              tab === key
                ? "bg-burgundy text-white dark:bg-gold dark:text-burgundy shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* بطاقة متابعة القراءة */}
      {tab === "surahs" && lastPage !== null && (
        <button
          onClick={() => openPage(lastPage)}
          className="w-full text-right glass rounded-[1.5rem] shadow-card border border-gold/40 dark:border-gold/30 bg-gold/5 dark:bg-gold/10 p-4 btn-press transition hover:-translate-y-[2px] hover:shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gold/15 dark:bg-gold/20 flex items-center justify-center text-gold-dark dark:text-gold shrink-0">
              <Icon name="clock" size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-readex text-[11px] text-muted-foreground">آخر قراءة</div>
              <div className="font-amiri text-lg font-bold text-burgundy leading-tight">
                متابعة القراءة من صفحة {toArabicDigits(lastPage)}
              </div>
              <div className="font-readex text-xs text-muted-foreground mt-0.5">
                {surahNameForPage(lastPage)}
              </div>
            </div>
            <Icon name="arrow-left" size={16} className="text-gold-dark dark:text-gold shrink-0" />
          </div>
        </button>
      )}

      {/* ── تبويب السور ── */}
      {tab === "surahs" && (
        <div className="space-y-3">
          <div className="relative">
            <Icon name="search" size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن سورة بالاسم…"
              className="w-full rounded-xl bg-burgundy/5 dark:bg-gold/5 px-4 py-3 pr-10 font-readex text-sm text-foreground placeholder:text-muted-foreground outline-none border border-transparent focus:border-burgundy/30 dark:focus:border-gold/30 transition"
              dir="rtl"
            />
          </div>
          {filteredSurahs.length === 0 ? (
            <div className="text-center py-10">
              <p className="font-amiri text-xl text-foreground mb-1.5">لا توجد نتائج</p>
              <p className="font-readex text-sm text-muted-foreground">جرّب اسمًا آخر للسورة</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredSurahs.map((s) => (
                <button key={s.n} onClick={() => openPage(s.startPage)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-burgundy/5 dark:hover:bg-gold/5 transition btn-press text-right">
                  <div className="w-10 h-10 rounded-full bg-burgundy/10 dark:bg-gold/10 flex items-center justify-center shrink-0">
                    <span className="font-readex text-base text-burgundy">{toArabicDigits(s.n)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-amiri text-lg text-burgundy leading-tight">{s.name}</div>
                    <div className="font-readex text-xs text-muted-foreground">
                      {toArabicDigits(s.ayahs)} آية · صفحة {toArabicDigits(s.startPage)}
                    </div>
                  </div>
                  <Icon name="arrow-left" size={14} className="text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── تبويب الأجزاء ── */}
      {tab === "juz" && (
        <div className="space-y-1">
          {JUZ_LIST.map((j) => (
            <button key={j.n} onClick={() => openPage(j.startPage)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-burgundy/5 dark:hover:bg-gold/5 transition btn-press text-right">
              <div className="w-10 h-10 rounded-full bg-burgundy/10 dark:bg-gold/10 flex items-center justify-center shrink-0">
                <span className="font-readex text-base text-burgundy">{toArabicDigits(j.n)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-amiri text-lg text-burgundy leading-tight">{j.name}</div>
                <div className="font-readex text-xs text-muted-foreground">صفحة {toArabicDigits(j.startPage)}</div>
              </div>
              <Icon name="arrow-left" size={14} className="text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* ── تبويب العلامات ── */}
      {tab === "bookmarks" && (
        <div>
          {bookmarks.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-16 h-16 rounded-3xl icon-bubble flex items-center justify-center mx-auto mb-3 text-burgundy">
                <Icon name="bookmark" size={26} />
              </div>
              <p className="font-amiri text-xl text-foreground mb-1.5">لا توجد علامات بعد</p>
              <p className="font-readex text-sm text-muted-foreground">أضف علامة من داخل القارئ لتظهر هنا</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bookmarks.map((p) => (
                <div key={p} className="flex items-center gap-2 glass rounded-[1.5rem] shadow-card border border-border p-3">
                  <button onClick={() => openPage(p)} className="flex-1 flex items-center gap-3 text-right btn-press min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gold/15 dark:bg-gold/20 flex items-center justify-center shrink-0">
                      <Icon name="bookmark" size={18} className="text-gold-dark dark:text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-amiri text-lg text-burgundy leading-tight">{surahNameForPage(p)}</div>
                      <div className="font-readex text-xs text-muted-foreground">صفحة {toArabicDigits(p)}</div>
                    </div>
                  </button>
                  <button onClick={() => toggleBookmark(p)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-burgundy dark:hover:text-gold hover:bg-burgundy/5 dark:hover:bg-gold/5 transition btn-press shrink-0">
                    <Icon name="x" size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
