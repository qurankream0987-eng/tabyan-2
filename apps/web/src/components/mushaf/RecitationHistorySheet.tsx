/**
 * سجل التلاوة والأخطاء والمراجعة الذكية (Part 28–31) داخل القارئ.
 *
 * تبويبات: المراجعة (توصيات من السجل الفعلي) · الجلسات · الأخطاء.
 * الأخطاء: حسب الجلسة/السورة/الآية/الحالة، مع «ليست خطأ» (إعادة تصنيف لا حذف).
 * الكلمة المعروضة من نص المصحف الكنسي كما هو.
 */
import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/app/Icon";
import { SURAHS } from "@/lib/quran-data";
import { toArabicDigits } from "@/lib/mushaf/format";
import { formatDuration } from "@/lib/recitation-types";
import { pageOfAyah } from "@/lib/mushaf/page-index";
import { loadCanonicalWordsForPage } from "@/lib/recitation-ai/canonicalWords";
import {
  filterMistakes, HISTORY_MODE_LABEL, mistakesBySurah,
  type HistoryData, type HistoryMistake, type MistakeStatus,
} from "@/lib/recitation-ai/recitationHistoryStore";
import { rangeLabel, rankWeakness, recommend, type ReviewRange } from "@/lib/recitation-ai/weaknessEngine";
import ReaderSheet from "./ReaderSheet";

export type HistoryTab = "review" | "sessions" | "mistakes";

interface Props {
  data: HistoryData;
  initialTab?: HistoryTab;
  initialVerseKey?: string | null;
  onMarkNotMistake: (mistakeId: string) => void;
  onOpenRange: (range: ReviewRange) => void;
  onTestRange: (range: ReviewRange) => void;
  onClose: () => void;
}

const KIND_LABEL: Record<HistoryMistake["kind"], string> = {
  WRONG_WORD: "كلمة مختلفة",
  OMISSION: "سقوط كلمة",
  EXTRA_WORD: "زيادة",
  REPETITION: "تكرار",
  SKIP: "تخطي آية",
  UNEXPECTED_JUMP: "انتقال غير متوقع",
};

const STATUS_LABEL: Record<MistakeStatus, string> = {
  confirmed: "مؤكد",
  corrected: "صُحّح",
  dismissed: "ليست خطأ",
};

function fmtDate(at: number) {
  return new Date(at).toLocaleDateString("ar", { day: "numeric", month: "short", year: "numeric" });
}

function ayahLabel(verseKey: string) {
  const [surah, ayah] = verseKey.split(":").map(Number);
  return `${SURAHS[surah - 1]?.name ?? ""} ${toArabicDigits(ayah)}`;
}

/** نص الكلمة الكنسي لمواضع الأخطاء (تحميل كسول للصفحات المعنية فقط). */
function useCanonicalWordText(mistakes: HistoryMistake[]) {
  const [texts, setTexts] = useState<Map<string, string>>(new Map());
  const pages = useMemo(() => [...new Set(mistakes.slice(0, 40).map((m) => {
    const [s, a] = m.verseKey.split(":").map(Number);
    return pageOfAyah(s, a);
  }))], [mistakes]);
  useEffect(() => {
    let cancelled = false;
    Promise.all(pages.map((p) => loadCanonicalWordsForPage(p).catch(() => [])))
      .then((lists) => {
        if (cancelled) return;
        const map = new Map<string, string>();
        for (const word of lists.flat()) map.set(`${word.verseKey}:${word.position}`, word.displayText);
        setTexts(map);
      });
    return () => { cancelled = true; };
  }, [pages]);
  return texts;
}

export default function RecitationHistorySheet({
  data, initialTab = "review", initialVerseKey = null, onMarkNotMistake, onOpenRange, onTestRange, onClose,
}: Props) {
  const [tab, setTab] = useState<HistoryTab>(initialVerseKey ? "mistakes" : initialTab);
  const [status, setStatus] = useState<MistakeStatus | "all">("all");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [verseKey, setVerseKey] = useState<string | null>(initialVerseKey);
  const [surah, setSurah] = useState<number | null>(null);
  const now = Date.now();
  const recommendations = useMemo(() => recommend(data, now), [data, now]);
  const weakest = useMemo(() => rankWeakness(data, now, 5), [data, now]);
  const sessions = useMemo(() => [...data.sessions].sort((a, b) => b.at - a.at), [data]);
  const mistakes = useMemo(
    () => filterMistakes(data, { status, sessionId: sessionId ?? undefined, verseKey: verseKey ?? undefined, surah: surah ?? undefined }),
    [data, status, sessionId, verseKey, surah],
  );
  const groups = useMemo(() => mistakesBySurah(data), [data]);
  const wordText = useCanonicalWordText(mistakes);
  const activeFilter = sessionId ? "جلسة محددة" : verseKey ? ayahLabel(verseKey) : surah ? `سورة ${SURAHS[surah - 1]?.name}` : null;

  const tabs: { key: HistoryTab; label: string }[] = [
    { key: "review", label: "المراجعة" },
    { key: "sessions", label: "الجلسات" },
    { key: "mistakes", label: "الأخطاء" },
  ];

  return (
    <ReaderSheet title="سجل التلاوة" subtitle="محفوظ على هذا الجهاز · بلا تسجيلات صوتية" onClose={onClose}>
      <div className="flex gap-1 pb-3 sticky top-0 z-10 bg-[var(--mushaf-chrome-solid)]" role="tablist" aria-label="أقسام السجل">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            data-active={tab === t.key}
            onClick={() => setTab(t.key)}
            className="tby-chip flex-1 min-h-10 rounded-xl font-readex text-xs font-bold"
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "review" && (
        <div className="space-y-3">
          {recommendations.length === 0 ? (
            <EmptyNote text="لا توجد توصيات بعد. بعد جلسات تلاوة أو حفظ مع تبيان AI ستظهر هنا مواضع مراجعتك الفعلية." />
          ) : recommendations.map((rec) => (
            <section key={rec.kind} className="tby-sheet-card px-3.5 py-3" aria-label={rec.title}>
              <h3 className="font-readex text-sm font-bold" style={{ color: "var(--mushaf-primary)" }}>{rec.title}</h3>
              <p className="tby-sheet-muted font-readex text-[11px] mt-0.5 leading-snug">{rec.description}</p>
              <ul className="mt-2 space-y-1.5">
                {rec.ranges.map((range) => (
                  <li key={`${range.surah}:${range.from}`} className="flex items-center gap-2">
                    <span className="flex-1 min-w-0 font-amiri text-base font-bold truncate">{rangeLabel(range)}</span>
                    <button type="button" onClick={() => onOpenRange(range)} className="tby-chip h-9 px-3 rounded-full font-readex text-[12px] font-bold">
                      افتح
                    </button>
                    <button type="button" onClick={() => onTestRange(range)} className="tby-chip h-9 px-3 rounded-full font-readex text-[12px] font-bold">
                      اختبرني
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {weakest.length > 0 && (
            <details className="tby-sheet-card px-3.5 py-3">
              <summary className="font-readex text-[12px] font-bold cursor-pointer select-none">لماذا هذه المواضع؟</summary>
              <ul className="mt-2 space-y-1.5">
                {weakest.map((w) => (
                  <li key={w.verseKey} className="font-readex text-[11px] leading-snug">
                    <b className="font-amiri text-sm">{ayahLabel(w.verseKey)}</b>
                    <span className="tby-sheet-muted"> — درجة {toArabicDigits(w.score)}: {w.reasons.join("، ")}</span>
                  </li>
                ))}
              </ul>
              <p className="tby-sheet-muted font-readex text-[10px] mt-2 leading-relaxed">
                الدرجة = ٣×الأخطاء المؤكدة + ١٫٥×المصحَّحة + ١×التلميحات + ٢×المراجعات غير المكتملة − ١٫٥×المراجعات المتقنة، مع زيادة محدودة كلما طال انقطاع مراجعة موضع ضعيف.
              </p>
            </details>
          )}
        </div>
      )}

      {tab === "sessions" && (
        sessions.length === 0 ? <EmptyNote text="لا جلسات محفوظة على هذا الجهاز بعد." /> : (
          <ul className="space-y-1.5">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => { setSessionId(s.id); setVerseKey(null); setSurah(null); setStatus("all"); setTab("mistakes"); }}
                  className="tby-sheet-card w-full px-3.5 py-3 text-right"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-readex text-sm font-bold truncate">{HISTORY_MODE_LABEL[s.mode]} · {s.scopeLabel}</span>
                    <span className="tby-sheet-muted font-readex text-[11px] shrink-0">{fmtDate(s.at)}</span>
                  </div>
                  <div className="tby-sheet-muted font-readex text-[11px] mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>المدة {formatDuration(s.durationSec)}</span>
                    <span>{toArabicDigits(s.words)} كلمة</span>
                    <span style={s.confirmed ? { color: "var(--mushaf-error)" } : undefined}>{toArabicDigits(s.confirmed)} خطأ</span>
                    <span>{toArabicDigits(s.corrected)} مصحَّح</span>
                    <span>{toArabicDigits(s.peeks)} تلميح</span>
                    <span>{s.testScore !== undefined && s.testScore !== null ? `النتيجة ${toArabicDigits(s.testScore)}٪` : s.accuracy === null ? "الدقة —" : `الدقة ${toArabicDigits(s.accuracy)}٪`}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )
      )}

      {tab === "mistakes" && (
        <div>
          <div className="flex flex-wrap gap-1.5 pb-2" role="radiogroup" aria-label="حالة الخطأ">
            {(["all", "confirmed", "corrected", "dismissed"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={status === value}
                onClick={() => setStatus(value)}
                className="tby-option h-8 px-3 font-readex text-[11px] font-bold"
              >
                {value === "all" ? "الكل" : value === "confirmed" ? "المؤكدة" : value === "corrected" ? "المصحَّحة" : "ليست أخطاء"}
              </button>
            ))}
          </div>
          {groups.length > 0 && !sessionId && !verseKey && (
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1" aria-label="حسب السورة">
              <button type="button" onClick={() => setSurah(null)} data-active={surah === null} className="tby-chip h-8 px-3 rounded-full font-readex text-[11px] font-bold shrink-0">كل السور</button>
              {groups.map((g) => (
                <button key={g.surah} type="button" onClick={() => setSurah(g.surah)} data-active={surah === g.surah} className="tby-chip h-8 px-3 rounded-full font-readex text-[11px] font-bold shrink-0">
                  {SURAHS[g.surah - 1]?.name} ({toArabicDigits(g.count)})
                </button>
              ))}
            </div>
          )}
          {activeFilter && (
            <button
              type="button"
              onClick={() => { setSessionId(null); setVerseKey(null); setSurah(null); }}
              className="tby-chip h-8 px-3 rounded-full font-readex text-[11px] font-bold inline-flex items-center gap-1 mb-2"
              data-active
            >
              {activeFilter}
              <Icon name="x" size={12} />
            </button>
          )}
          {mistakes.length === 0 ? <EmptyNote text="لا أخطاء مطابقة لهذا المرشح." /> : (
            <ul className="space-y-1.5">
              {mistakes.map((m) => (
                <li key={m.id} className="tby-sheet-card px-3 py-2.5 flex items-center gap-3">
                  <span className="font-quran text-xl leading-[1.7] shrink-0 min-w-[3.5rem] text-center" style={{ color: "var(--mushaf-ink)" }}>
                    {wordText.get(`${m.verseKey}:${m.position}`) ?? "…"}
                  </span>
                  <span className="flex-1 min-w-0">
                    <button type="button" onClick={() => { setVerseKey(m.verseKey); setSessionId(null); setSurah(null); }} className="block font-amiri text-sm font-bold text-right">
                      {ayahLabel(m.verseKey)} · الكلمة {toArabicDigits(m.position)}
                    </button>
                    <span className="block font-readex text-[11px] mt-0.5" style={{ color: m.status === "confirmed" ? "var(--mushaf-error)" : "var(--mushaf-chrome-muted)" }}>
                      {KIND_LABEL[m.kind]} · {STATUS_LABEL[m.status]} · {fmtDate(m.at)}
                    </span>
                  </span>
                  {m.status !== "dismissed" && (
                    <button type="button" onClick={() => onMarkNotMistake(m.id)} className="tby-chip h-9 px-2.5 rounded-full font-readex text-[11px] font-bold shrink-0">
                      ليست خطأ
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </ReaderSheet>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="text-center py-10 px-4">
      <Icon name="clock" size={26} className="tby-sheet-muted mx-auto mb-2" />
      <p className="tby-sheet-muted font-readex text-sm leading-relaxed">{text}</p>
    </div>
  );
}
