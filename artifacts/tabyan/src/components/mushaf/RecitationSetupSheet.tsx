/**
 * RecitationSetupSheet — bottom sheet لاختيار نطاق التسميع ووضع الإخفاء
 * يعمل داخل MushafReader مباشرةً — لا يخرج المستخدم من الصفحة.
 */
import { useState, useCallback } from "react";
import Icon from "@/components/app/Icon";
import { SURAHS } from "@/lib/quran-data";
import {
  HIDE_MODE_LABELS,
  HIDE_MODE_DESC,
  toArabicNum,
  type HideMode,
  type SessionMode,
} from "@/lib/recitation-types";
import type { MushafPageData } from "@/lib/mushaf/types";
import type { RecitationRange, RecitationStartRequest } from "@/lib/mushaf/useRecitationSession";
import { normalizeDigits } from "@workspace/tabyan-trpc/input-normalization";

type RangeMode = "page" | "fromCurrent" | "surah" | "custom";

interface Props {
  pageData: MushafPageData | null;
  /** الآية الحالية (§26 «من الآية الحالية») — من ضغط مطوّل أو موضع الاستماع أو أول آية بالصفحة */
  currentAyah?: { surahId: number; ayahNum: number } | null;
  isStudent: boolean;
  educationalAvailable: boolean;
  isStarting: boolean;
  onStart: (request: RecitationStartRequest, hideMode: HideMode) => Promise<void>;
  onClose: () => void;
}

/** يحسب النطاق من الصفحة الحالية — السورة الأكثر آيات في الصفحة */
function computePageRange(data: MushafPageData): RecitationRange | null {
  if (!data.v.length) return null;
  const map = new Map<number, { name: string; min: number; max: number; count: number }>();
  for (const v of data.v) {
    const e = map.get(v.c);
    if (!e) {
      map.set(v.c, { name: SURAHS[v.c - 1]?.name ?? "", min: v.n, max: v.n, count: 1 });
    } else {
      e.min = Math.min(e.min, v.n);
      e.max = Math.max(e.max, v.n);
      e.count++;
    }
  }
  let best: { id: number; name: string; min: number; max: number } | null = null;
  let bestCount = 0;
  for (const [id, e] of map) {
    if (e.count > bestCount) { bestCount = e.count; best = { id, ...e }; }
  }
  if (!best) return null;
  return { surahId: best.id, surahName: best.name, startAyah: best.min, endAyah: best.max };
}

export default function RecitationSetupSheet({
  pageData, currentAyah, isStudent, educationalAvailable, isStarting, onStart, onClose,
}: Props) {
  const pageRange = pageData ? computePageRange(pageData) : null;

  // «من الآية الحالية» (§26): من الآية المحددة إلى آخر سورتها
  const fromCurrentRange: RecitationRange | null = (() => {
    if (!currentAyah) return null;
    const s = SURAHS[currentAyah.surahId - 1];
    if (!s || currentAyah.ayahNum < 1 || currentAyah.ayahNum > s.ayahs) return null;
    return { surahId: s.n, surahName: s.name, startAyah: currentAyah.ayahNum, endAyah: s.ayahs };
  })();
  const defaultSurahId = pageRange?.surahId ?? 1;
  const defaultSurah = SURAHS.find(s => s.n === defaultSurahId) ?? SURAHS[0];

  const [rangeMode, setRangeMode]   = useState<RangeMode>(pageRange ? "page" : "custom");
  // يبدأ كل من GENERAL وEDUCATIONAL بالنص المخفي؛ يمكن للمستخدم اختيار
  // المراجعة بالنص صراحةً من قائمة وضع الإخفاء.
  const [hideMode, setHideMode]     = useState<HideMode>("full_hide");
  const [mode, setMode]             = useState<SessionMode>("general");
  const [hideModeChosen, setHideModeChosen] = useState(false);
  const [surahId, setSurahId]       = useState(defaultSurahId);
  const [startAyah, setStartAyah]   = useState(1);
  const [endAyah, setEndAyah]       = useState(Math.min(10, defaultSurah.ayahs));
  const [busy, setBusy]             = useState(false);

  const selectedSurah = SURAHS.find(s => s.n === surahId) ?? SURAHS[0];
  const maxAyah = selectedSurah.ayahs;

  const getRange = useCallback((): RecitationRange | null => {
    if (rangeMode === "page" && pageRange) return pageRange;
    if (rangeMode === "fromCurrent" && fromCurrentRange) return fromCurrentRange;
    if (rangeMode === "surah") {
      const s = SURAHS.find(x => x.n === (pageRange?.surahId ?? 1)) ?? SURAHS[0];
      return { surahId: s.n, surahName: s.name, startAyah: 1, endAyah: s.ayahs };
    }
    if (startAyah < 1 || endAyah < startAyah || endAyah > maxAyah) return null;
    return { surahId, surahName: selectedSurah.name, startAyah, endAyah };
  }, [rangeMode, pageRange, fromCurrentRange, surahId, selectedSurah, startAyah, endAyah, maxAyah]);
  const selectedRange = getRange();

  const handleStart = async () => {
    const range = getRange();
    if (!range) return;
    if (mode === "educational" && !educationalAvailable) return;
    const request: RecitationStartRequest = mode === "general"
      ? {
          mode: "general",
          localRange: range,
          startContext: {
            startPage: pageData?.p,
            startVerseKey: currentAyah ? `${currentAyah.surahId}:${currentAyah.ayahNum}` : undefined,
          },
        }
      : {
          mode: "educational",
          localRange: range,
          expectedRange: {
            start: { surahId: range.surahId, ayah: range.startAyah },
            end: { surahId: range.surahId, ayah: range.endAyah },
          },
        };
    setBusy(true);
    try { await onStart(request, hideMode); }
    finally { setBusy(false); }
  };

  const rangeModes: { key: RangeMode; label: string; sub: string; disabled?: boolean }[] = [
    {
      key: "page",
      label: "الصفحة الحالية",
      sub: pageRange ? `${pageRange.surahName} — آية ${toArabicNum(pageRange.startAyah)}–${toArabicNum(pageRange.endAyah)}` : "غير متاحة",
      disabled: !pageRange,
    },
    {
      key: "fromCurrent",
      label: "من الآية الحالية",
      sub: fromCurrentRange
        ? `${fromCurrentRange.surahName} — من آية ${toArabicNum(fromCurrentRange.startAyah)} إلى ${toArabicNum(fromCurrentRange.endAyah)}`
        : "غير متاحة",
      disabled: !fromCurrentRange,
    },
    {
      key: "surah",
      label: "السورة كاملة",
      sub: pageRange ? `${pageRange.surahName} — ${toArabicNum(SURAHS.find(s => s.n === pageRange.surahId)?.ayahs ?? 0)} آية` : "غير متاحة",
      disabled: !pageRange,
    },
    { key: "custom", label: "نطاق مخصص", sub: "اختر السورة والآيات" },
  ];

  return (
    /* طبقة الغطاء */
    <div className="absolute inset-0 z-30 flex flex-col justify-end" dir="rtl">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />

      {/* لوحة الإعداد */}
      <div className="relative z-10 bg-[var(--card)] rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col">
        {/* مقبض + عنوان */}
        <div className="flex flex-col items-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/25 mb-3" />
          <div className="flex items-center justify-between w-full px-4 pb-1">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition btn-press"
              aria-label="إغلاق"
            >
              <Icon name="x" size={18} />
            </button>
            <h2 className="font-amiri text-lg font-bold text-burgundy">إعداد التسميع</h2>
            <div className="w-9" />
          </div>
        </div>

        {/* المحتوى القابل للتمرير */}
        <div className="overflow-y-auto flex-1 px-4 pb-3 space-y-5">

          {/* ── نطاق التسميع ── */}
          <section className="space-y-2">
            <p className="font-readex text-sm font-bold text-foreground">نطاق التسميع</p>
            <div className="space-y-1.5">
              {rangeModes.map(rm => (
                <button
                  key={rm.key}
                  disabled={rm.disabled}
                  onClick={() => setRangeMode(rm.key)}
                  className={`w-full text-right flex items-center gap-3 px-3.5 py-3 rounded-2xl border transition btn-press disabled:opacity-40 disabled:pointer-events-none ${
                    rangeMode === rm.key
                      ? "border-burgundy dark:border-gold bg-burgundy/5 dark:bg-gold/5"
                      : "border-border hover:border-burgundy/30 dark:hover:border-gold/30"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                    rangeMode === rm.key ? "border-burgundy dark:border-gold" : "border-muted-foreground/40"
                  }`}>
                    {rangeMode === rm.key && <div className="w-2 h-2 rounded-full bg-burgundy dark:bg-gold" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-readex text-sm font-bold text-foreground leading-tight">{rm.label}</div>
                    <div className="font-readex text-[11px] text-muted-foreground mt-0.5 truncate">{rm.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* ── نطاق مخصص ── */}
          {rangeMode === "custom" && (
            <section className="space-y-3 bg-muted/30 rounded-2xl p-3">
              {/* اختيار السورة */}
              <div>
                <label className="font-readex text-[11px] text-muted-foreground mb-1.5 block">السورة</label>
                <select
                  value={surahId}
                  onChange={e => {
                    const id = Number(e.target.value);
                    const s = SURAHS.find(x => x.n === id) ?? SURAHS[0];
                    setSurahId(id);
                    setStartAyah(1);
                    setEndAyah(Math.min(10, s.ayahs));
                  }}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-burgundy/30 dark:focus:ring-gold/30"
                  dir="rtl"
                >
                  {SURAHS.map(s => (
                    <option key={s.n} value={s.n}>
                      {toArabicNum(s.n)}. {s.name} — {toArabicNum(s.ayahs)} آية
                    </option>
                  ))}
                </select>
              </div>
              {/* نطاق الآيات */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-readex text-[11px] text-muted-foreground mb-1 block">من آية</label>
                  <input
                    type="text" inputMode="numeric" minLength={1} value={startAyah}
                    onChange={e => {
                       const raw = normalizeDigits(e.target.value).replace(/\D/g, "");
                       if (!raw) return;
                       const v = Math.max(1, Math.min(maxAyah, Number(raw)));
                      setStartAyah(v);
                      if (endAyah < v) setEndAyah(v);
                    }}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-burgundy/30 dark:focus:ring-gold/30 text-center"
                  />
                </div>
                <div>
                  <label className="font-readex text-[11px] text-muted-foreground mb-1 block">إلى آية</label>
                  <input
                    type="text" inputMode="numeric" minLength={1} value={endAyah}
                     onChange={e => {
                       const raw = normalizeDigits(e.target.value).replace(/\D/g, "");
                       if (raw) setEndAyah(Math.max(startAyah, Math.min(maxAyah, Number(raw))));
                     }}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-burgundy/30 dark:focus:ring-gold/30 text-center"
                  />
                </div>
              </div>
              {endAyah > startAyah && (
                <p className="font-readex text-[11px] text-muted-foreground text-center">
                  {toArabicNum(endAyah - startAyah + 1)} آية محددة
                </p>
              )}
            </section>
          )}

          {/* ── وضع الإخفاء ── */}
          <section className="space-y-2">
            <p className="font-readex text-sm font-bold text-foreground">وضع الإخفاء</p>
            <div className="space-y-1.5">
              {(["full_hide", "first_word", "progressive_reveal", "visible_review"] as const).map(hm => (
                <button
                  key={hm}
                   onClick={() => { setHideMode(hm); setHideModeChosen(true); }}
                  className={`w-full text-right flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border transition btn-press ${
                    hideMode === hm
                      ? "border-burgundy dark:border-gold bg-burgundy/5 dark:bg-gold/5"
                      : "border-border hover:border-burgundy/30 dark:hover:border-gold/30"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                    hideMode === hm ? "border-burgundy dark:border-gold" : "border-muted-foreground/40"
                  }`}>
                    {hideMode === hm && <div className="w-2 h-2 rounded-full bg-burgundy dark:bg-gold" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-readex text-sm font-bold text-foreground leading-tight">{HIDE_MODE_LABELS[hm]}</div>
                    <div className="font-readex text-[11px] text-muted-foreground mt-0.5 leading-tight">{HIDE_MODE_DESC[hm]}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* ── نوع الجلسة (للطلاب فقط) ── */}
          {isStudent && (
            <section className="space-y-2">
              <p className="font-readex text-sm font-bold text-foreground">نوع الجلسة</p>
              <div className="grid grid-cols-2 gap-2">
                {(["general", "educational"] as const).map(m => (
                  <button
                    key={m}
                    disabled={m === "educational" && !educationalAvailable}
                     onClick={() => {
                       setMode(m);
                       if (!hideModeChosen) setHideMode("full_hide");
                     }}
                    className={`py-2.5 rounded-xl font-readex text-sm font-bold border transition btn-press disabled:opacity-45 disabled:pointer-events-none ${
                      mode === m
                        ? "bg-burgundy text-white dark:bg-gold dark:text-burgundy border-transparent shadow"
                        : "border-border text-muted-foreground hover:border-burgundy/30 dark:hover:border-gold/30"
                    }`}
                  >
                    {m === "general" ? "🎙 عام" : "📚 تعليمي"}
                  </button>
                ))}
              </div>
              {mode === "educational" && (
                educationalAvailable && selectedRange ? (
                  <div className="rounded-2xl border border-gold/45 bg-gold/10 px-3.5 py-3">
                    <div className="font-readex text-[11px] font-bold text-burgundy dark:text-gold">
                      النطاق التعليمي
                    </div>
                    <div className="font-readex text-sm font-bold text-foreground mt-1">
                      {selectedRange.surahName} · آيات {toArabicNum(selectedRange.startAyah)}–{toArabicNum(selectedRange.endAyah)}
                    </div>
                    <div className="font-readex text-[10px] text-muted-foreground mt-1">
                      سيظهر هذا التسميع في ملفك عند معلمك
                    </div>
                  </div>
                ) : (
                  <p className="font-readex text-[11px] text-muted-foreground">
                    التسميع التعليمي يتطلب واجبًا معتمدًا من المعلم، وهو غير متاح بعد
                  </p>
                )
              )}
            </section>
          )}
        </div>

        {/* زر البدء */}
        <div className="shrink-0 px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
          <button
            onClick={handleStart}
            disabled={busy || isStarting || (!getRange()) || (mode === "educational" && !educationalAvailable)}
            className="w-full py-4 rounded-2xl bg-burgundy text-white font-readex font-bold text-base btn-press hover:bg-burgundy/90 transition flex items-center justify-center gap-2 shadow disabled:opacity-55"
          >
            {busy || isStarting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جارٍ التحضير…
              </>
            ) : (
              <>
                <Icon name="mic" size={18} />
                ابدأ التسميع
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
