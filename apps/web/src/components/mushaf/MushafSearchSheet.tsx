/**
 * MushafSearchSheet — البحث داخل القارئ (Part 32, 37).
 *
 * يدعم: السورة / الصفحة / رقم السورة / الآية ("٢:٢٥٥" أو "البقرة ٢٥٥")،
 * والبحث في نص القرآن الكنسي (فهرس مولّد من بيانات المصحف، يُحمَّل كسولاً)،
 * و«ابحث بالتلاوة»: تتلو أي موضع فيُعاد الموضع الكنسي المطابق.
 * النتائج تعرض نص الآية من المصحف كما هو، لا نص التفريغ الصوتي.
 */
import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/app/Icon";
import ReaderSheet from "./ReaderSheet";
import { SURAHS, TOTAL_PAGES } from "@/lib/quran-data";
import { toArabicDigits } from "@/lib/mushaf/format";
import { pageOfAyah } from "@/lib/mushaf/page-index";
import { normalizeDigits } from "@workspace/tabyan-domain/input-normalization";
import { loadCanonicalWordsForPage } from "@/lib/recitation-ai/canonicalWords";
import { loadQuranSearchIndex, queryTokens, searchQuran, type QuranSearchResult } from "@/lib/recitation-ai/quranSearch";

export type VoiceSearchPhase = "idle" | "starting" | "listening" | "searching" | "done" | "error";

export interface VoiceSearchState {
  phase: VoiceSearchPhase;
  results: QuranSearchResult[];
  error?: string | null;
}

interface Props {
  onNavigate: (page: number) => void;
  onClose: () => void;
  /** «ابدأ المتابعة من هنا» — يبدأ تلاوة متابعة من الآية */
  onFollowFrom?: (verseKey: string, page: number) => void;
  voice?: {
    state: VoiceSearchState;
    onStart: () => void;
    onStop: () => void;
  } | null;
  /** يبدأ البحث بالتلاوة فور فتح الورقة */
  autoStartVoice?: boolean;
}

interface RefResult {
  type: "surah" | "page" | "ayah";
  label: string;
  sub: string;
  page: number;
}

/** نتيجة آية واحدة إن كانت (سورة، آية) صحيحة */
function ayahResult(surahN: number, ayahN: number): RefResult | null {
  const s = SURAHS[surahN - 1];
  if (!s || ayahN < 1 || ayahN > s.ayahs) return null;
  const page = pageOfAyah(surahN, ayahN);
  return { type: "ayah", label: `${s.name} — الآية ${toArabicDigits(ayahN)}`, sub: `صفحة ${toArabicDigits(page)}`, page };
}

function buildRefResults(qRaw: string): RefResult[] {
  const trimmed = normalizeDigits(qRaw.trim());
  if (!trimmed) return [];
  const results: RefResult[] = [];
  const refMatch = trimmed.match(/^(\d{1,3})\s*[:\s]\s*(\d{1,3})$/);
  if (refMatch) {
    const r = ayahResult(Number(refMatch[1]), Number(refMatch[2]));
    if (r) results.push(r);
  }
  const nameAyah = trimmed.match(/^(.+?)\s+(\d{1,3})$/);
  if (nameAyah) {
    const namePart = nameAyah[1].trim();
    const s = SURAHS.find(
      (x) => x.name === namePart || x.name.includes(namePart) || x.englishName.toLowerCase() === namePart.toLowerCase(),
    );
    if (s) {
      const r = ayahResult(s.n, Number(nameAyah[2]));
      if (r) results.push(r);
    }
  }
  const asNum = parseInt(trimmed, 10);
  if (!isNaN(asNum) && String(asNum) === trimmed && asNum >= 1 && asNum <= TOTAL_PAGES) {
    results.push({ type: "page", label: `صفحة ${toArabicDigits(asNum)}`, sub: "الانتقال المباشر", page: asNum });
  }
  const lq = trimmed.toLowerCase();
  for (const s of SURAHS) {
    if (s.name.includes(trimmed) || s.englishName.toLowerCase().includes(lq) || String(s.n) === trimmed) {
      results.push({ type: "surah", label: s.name, sub: `${toArabicDigits(s.ayahs)} آية · صفحة ${toArabicDigits(s.startPage)}`, page: s.startPage });
    }
    if (results.length >= 6) break;
  }
  return results;
}

/** نص الآيات الكنسي للنتائج (Uthmani كما هو) — تحميل كسول لصفحات النتائج فقط. */
function useAyahTexts(results: QuranSearchResult[]) {
  const [texts, setTexts] = useState<Map<string, string>>(new Map());
  const key = results.map((r) => r.verseKey).join(",");
  useEffect(() => {
    let cancelled = false;
    const pages = [...new Set(results.slice(0, 10).map((r) => r.page))];
    Promise.all(pages.map((p) => Promise.all([loadCanonicalWordsForPage(p), p < TOTAL_PAGES ? loadCanonicalWordsForPage(p + 1) : []]).catch(() => [[], []])))
      .then((lists) => {
        if (cancelled) return;
        const byVerse = new Map<string, string[]>();
        for (const word of lists.flat(2)) {
          const words = byVerse.get(word.verseKey) ?? [];
          words[word.position - 1] = word.displayText;
          byVerse.set(word.verseKey, words);
        }
        setTexts(new Map([...byVerse].map(([k, words]) => [k, words.filter(Boolean).join(" ")])));
      });
    return () => { cancelled = true; };
  }, [key]);
  return texts;
}

function surahAyah(verseKey: string) {
  const [s, a] = verseKey.split(":").map(Number);
  return `${SURAHS[s - 1]?.name ?? ""} · الآية ${toArabicDigits(a)}`;
}

export default function MushafSearchSheet({ onNavigate, onClose, onFollowFrom, voice, autoStartVoice }: Props) {
  const [q, setQ] = useState("");
  const refResults = useMemo(() => buildRefResults(q), [q]);
  const [textResults, setTextResults] = useState<QuranSearchResult[]>([]);
  const [textState, setTextState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [retryCount, setRetryCount] = useState(0);

  const isTextQuery = useMemo(() => {
    const normalized = normalizeDigits(q);
    return !/\d/.test(normalized) && queryTokens(q).join("").length >= 3;
  }, [q]);

  useEffect(() => {
    if (!isTextQuery) { setTextResults([]); setTextState("idle"); return; }
    let cancelled = false;
    setTextState("loading");
    const timer = window.setTimeout(() => {
      loadQuranSearchIndex()
        .then((index) => {
          if (cancelled) return;
          setTextResults(searchQuran(index, q, { limit: 10, openLast: true }));
          setTextState("ready");
        })
        .catch(() => { if (!cancelled) setTextState("error"); });
    }, 220);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [q, isTextQuery, retryCount]);

  useEffect(() => {
    if (autoStartVoice && voice && voice.state.phase === "idle") voice.onStart();
  }, []);

  const voiceActive = !!voice && (voice.state.phase === "starting" || voice.state.phase === "listening" || voice.state.phase === "searching");
  const shownQuranResults = voice && voice.state.phase !== "idle" ? voice.state.results : textResults;
  const texts = useAyahTexts(shownQuranResults);
  const go = (page: number) => { onNavigate(page); onClose(); };

  return (
    <ReaderSheet title="بحث" onClose={onClose}>
      <div className="tby-search-head pb-3 sticky top-0 z-10 bg-[var(--mushaf-chrome-solid)] space-y-2">
        <div className="relative">
          <Icon name="search" size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 tby-sheet-muted pointer-events-none" />
          <input
            autoFocus={!autoStartVoice}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="سورة، صفحة، آية، أو كلمات من القرآن…"
            aria-label="البحث في المصحف"
            className="tby-search-input w-full h-12 rounded-2xl px-4 pr-10 pl-11 font-readex text-sm"
            dir="rtl"
            type="search"
            data-testid="mushaf-search-input"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} className="tby-icon-btn tby-search-clear" aria-label="مسح البحث" data-testid="mushaf-search-clear">
              <Icon name="x" size={15} />
            </button>
          )}
        </div>
        {voice && (
          <button
            type="button"
            onClick={voiceActive ? voice.onStop : voice.onStart}
            data-testid="mushaf-search-voice"
            aria-pressed={voiceActive}
            aria-busy={voice.state.phase === "searching"}
            className={`${voiceActive ? "tby-primary-action" : "tby-chip"} tby-search-voice w-full h-11 rounded-2xl font-readex text-sm font-bold inline-flex items-center justify-center gap-2`}
            aria-live="polite"
          >
            {voiceActive
              ? <span className="tby-mic-dot" data-kind={voice.state.phase === "listening" ? "listening" : "pending"} aria-hidden />
              : <Icon name="mic" size={16} />}
            {voice.state.phase === "starting" ? "يستعد…"
              : voice.state.phase === "listening" ? "يستمع — اتلُ أي موضع، ثم اضغط للانتهاء"
                : voice.state.phase === "searching" ? "يبحث…"
                  : "ابحث بالتلاوة"}
          </button>
        )}
        {voice?.state.phase === "error" && (
          <p className="tby-search-alert font-readex text-[12px]" role="alert"><Icon name="x" size={12} />{voice.state.error}</p>
        )}
      </div>

      {refResults.length > 0 && !voiceActive && (
        <section aria-label="المواضع" className="mb-3">
          <ul className="space-y-px">
            {refResults.map((r, i) => (
              <li key={i}>
                <button type="button" onClick={() => go(r.page)} className="tby-index-row w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-right">
                  <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-[color-mix(in_srgb,var(--mushaf-primary)_9%,transparent)] text-[var(--mushaf-primary)]">
                    <Icon name={r.type === "surah" ? "books" : r.type === "ayah" ? "bookmark" : "file-text"} size={15} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-amiri text-base font-bold leading-tight">{r.label}</span>
                    <span className="tby-sheet-muted block font-readex text-[11px]">{r.sub}</span>
                  </span>
                  <Icon name="chevron-left" size={14} className="tby-sheet-muted shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(isTextQuery || (voice && voice.state.phase !== "idle")) && (
        <section aria-label="في نص القرآن" aria-busy={textState === "loading" || voice?.state.phase === "searching"}>
          <h3 className="tby-search-heading font-readex text-[11px] font-bold mb-1.5">
            {voice && voice.state.phase !== "idle" ? "المواضع المطابقة لتلاوتك" : "في نص القرآن"}
          </h3>
          {(textState === "loading" || voice?.state.phase === "searching") && shownQuranResults.length === 0 && (
            <div className="space-y-1.5" role="status" aria-label="جارٍ البحث">
              {[0, 1, 2].map((i) => <div key={i} className="tby-search-skeleton" aria-hidden />)}
            </div>
          )}
          {textState === "error" && !voice?.state.results.length && (
            <div className="tby-reader-empty" role="alert">
              <p className="tby-sheet-muted font-readex text-sm">تعذّر تحميل فهرس البحث — تحقق من الاتصال.</p>
              <button type="button" onClick={() => setRetryCount(v => v + 1)} className="tby-chip h-9 px-4 rounded-full font-readex text-xs font-bold" data-testid="mushaf-search-retry">إعادة المحاولة</button>
            </div>
          )}
          {shownQuranResults.length === 0 && (textState === "ready" || voice?.state.phase === "done") && (
            <div className="tby-reader-empty" role="status"><p className="tby-sheet-muted font-readex text-sm">لا موضع مطابق. جرّب عبارة أطول أو أوضح.</p></div>
          )}
          <ul className="space-y-1.5">
            {shownQuranResults.map((r) => (
              <li key={r.verseKey} className="tby-sheet-card tby-search-result px-3 py-2.5">
                <button type="button" onClick={() => go(r.page)} className="w-full text-right">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-readex text-[12px] font-bold" style={{ color: "var(--mushaf-primary)" }}>{surahAyah(r.verseKey)}</span>
                    <span className="tby-sheet-muted font-readex text-[11px]">صفحة {toArabicDigits(r.page)}</span>
                  </span>
                  <span className="block font-quran text-lg leading-[2] mt-1 line-clamp-2" style={{ color: "var(--mushaf-ink)" }}>
                    {texts.get(r.verseKey) ?? "…"}
                  </span>
                </button>
                <span className="flex gap-2 mt-1.5">
                  <button type="button" onClick={() => go(r.page)} className="tby-chip h-9 px-3 rounded-full font-readex text-[12px] font-bold">
                    فتح الموضع
                  </button>
                  {onFollowFrom && (
                    <button
                      type="button"
                      onClick={() => { onClose(); onFollowFrom(r.verseKey, r.page); }}
                      className="tby-chip h-9 px-3 rounded-full font-readex text-[12px] font-bold inline-flex items-center gap-1.5"
                    >
                      <Icon name="mic" size={13} />
                      ابدأ المتابعة من هنا
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!q.trim() && (!voice || voice.state.phase === "idle") && (
        <div className="tby-reader-empty">
          <Icon name="search" size={26} className="tby-index-empty-icon" />
          <p className="tby-sheet-muted font-readex text-sm leading-relaxed">
            اكتب اسم سورة، رقم صفحة، آية مثل «البقرة ٢٥٥»، أو كلمات من القرآن
            {voice ? " — أو اضغط «ابحث بالتلاوة»" : ""}.
          </p>
        </div>
      )}
    </ReaderSheet>
  );
}
