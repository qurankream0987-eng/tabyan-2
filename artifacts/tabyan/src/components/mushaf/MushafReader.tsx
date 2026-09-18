/**
 * MushafReader — قارئ مصحف تبيان (ملء الشاشة، مطابق للمرجع البصري).
 *
 * مزايا هذا الإصدار:
 * - صفحة المصحف تملأ الشاشة بلا shadow أو card (ورق مباشر على الخلفية).
 * - Focus Mode: الأدوات تختفي تلقائياً بعد 4 ثوانٍ — ضغطة تُعيدها.
 * - شريط سفلي: pill عائمة (فهرس · صوت · تسميع · إخفاء · علامة).
 * - الفهرس / البحث / وضع الإخفاء: Sheets خارج منطقة اللمس/الإيماء.
 * - مشغّل صوت بسيط (EveryAyah) مع تمييز الآية الحالية.
 * - وضع إخفاء عام مستقل (بدون جلسة تسميع) للحفظ الذاتي.
 * - Phase 1A.2: طبقة التسميع مدمجة كاملاً.
 *
 * بنية الطبقات:
 * ┌─ mushaf-reader-shell (fixed inset-0)
 * │  ├─ containerRef (relative flex-1 touch-none)  ← إيماءات + صفحة المصحف
 * │  │   ├─ MushafPage
 * │  │   ├─ RecitationSetupSheet / RecitationResultSheet
 * │  │   └─ (لا sheets أخرى هنا)
 * │  ├─ MushafControls        (absolute — خارج touch-none)
 * │  ├─ MushafAudioBar        (absolute — خارج touch-none)
 * │  ├─ RecitationSessionBar  (absolute — خارج touch-none)
 * │  ├─ MushafIndexSheet      (absolute inset-0 — خارج touch-none: تمرير لمسي يعمل)
 * │  ├─ MushafSearchSheet     (absolute inset-0 — خارج touch-none)
 * │  └─ MushafHideModeSheet   (absolute inset-0 — خارج touch-none)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MushafPage from "./MushafPage";
import MushafControls from "./MushafControls";
import MushafAudioBar from "./MushafAudioBar";
import MushafIndexSheet from "./MushafIndexSheet";
import MushafSearchSheet from "./MushafSearchSheet";
import MushafHideModeSheet from "./MushafHideModeSheet";
import RecitationSetupSheet from "./RecitationSetupSheet";
import RecitationSessionBar from "./RecitationSessionBar";
import RecitationResultSheet from "./RecitationResultSheet";
import RecitationAiCanaryOverlay from "./RecitationAiCanaryOverlay";
import AyahActionSheet from "./AyahActionSheet";
import { loadPage, prefetchAround, computeMushafPageFit, TOTAL_PAGES } from "@/lib/mushaf/pages";
import { pageOfAyah } from "@/lib/mushaf/page-index";
import { ensurePageFont, retainPageFonts } from "@/lib/mushaf/fonts";
import { useZoomPan } from "@/lib/mushaf/useZoomPan";
import { useAudioPlayer, loadLastListen } from "@/lib/mushaf/useAudioPlayer";
import { RecitationCuePlayer } from "@/lib/mushaf/recitation-cues";
import { SURAHS } from "@/lib/quran-data";
import type { MushafPageData } from "@/lib/mushaf/types";
import type { HideMode } from "@/lib/recitation-types";
import {
  useRecitationSession,
  buildRangeKeys,
  type RecitationRange,
  type RecitationStartRequest,
} from "@/lib/mushaf/useRecitationSession";
import { useOpenAiRealtimeTranscription } from "@/lib/recitation-ai/useOpenAiRealtimeTranscription";
import {
  loadCanonicalWordsForPage,
  loadCanonicalWordsForRange,
  type CanonicalQuranWord,
} from "@/lib/recitation-ai/canonicalWords";
import { QuranLiveMatcher, type MatcherDiagnostics } from "@/lib/recitation-ai/QuranLiveMatcher";
import type { LiveRevealLatencyMetrics } from "@/lib/recitation-ai/types";

const FOCUS_DELAY = 4000; // ms قبل إخفاء الأدوات تلقائياً
const LS_HIDE_MODE = "tabyan.mushaf.hideMode";
const QURAN_MATCHER_READY = true;
const PAGE_FOLLOW_NEAR_END_WORDS = 12;

type ActiveSheet = "index" | "search" | "hide" | null;

const EMPTY_LIVE_LATENCY: LiveRevealLatencyMetrics = {
  matcherP50Ms: null, matcherP95Ms: null, matcherMaxMs: null,
  renderP50Ms: null, renderP95Ms: null,
  visualCompletionP50Ms: null,
  totalP50Ms: null, totalP95Ms: null,
};
const EMPTY_MATCHER_DIAGNOSTICS: MatcherDiagnostics = {
  matcherUpdateCount: 0, matcherMatchCount: 0, matcherNoMatchCount: 0,
  provisionalRevealCount: 0, committedRevealCount: 0, provisionalRollbackCount: 0,
  trackingModeMatches: 0, recoveryModeEntries: 0, recoverySuccesses: 0, falseForwardJumps: 0, backtracks: 0,
};

function percentile(values: number[], fraction: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)]);
}

function traceAi(event: string, metadata: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.info(`[TABYAN_AI_TRACE] ${event}`, metadata);
}

function surahOfChapter(chapter: number): string {
  return SURAHS[chapter - 1]?.name ?? "";
}

/** نطاق محلي للعرض فقط؛ GENERAL لا يرسله كـ expectedRange إلى الخادم. */
function localRangeForPage(data: MushafPageData): RecitationRange | null {
  if (!data.v.length) return null;
  const first = data.v[0];
  const sameSurah = data.v.filter((verse) => verse.c === first.c);
  const startAyah = Math.min(...sameSurah.map((verse) => verse.n));
  const endAyah = Math.max(...sameSurah.map((verse) => verse.n));
  return {
    surahId: first.c,
    surahName: surahOfChapter(first.c),
    startAyah,
    endAyah,
  };
}

interface Props {
  page: number;
  onClose: () => void;
  onNavigate: (page: number) => void;
  bookmarks: number[];
  toggleBookmark: (page: number) => void;
}

export default function MushafReader({ page, onClose, onNavigate, bookmarks, toggleBookmark }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageBoxRef   = useRef<HTMLDivElement>(null);
  const [size, setSize]     = useState({ w: 0, h: 0 });
  const [data, setData]     = useState<MushafPageData | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [barsVisible, setBarsVisible] = useState(true);
  const seq    = useRef(0);
  const navDir = useRef<"next" | "prev" | null>(null);

  // ── Sheets & Audio ───────────────────────────────────────────────────────
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [showAudio, setShowAudio]     = useState(false);

  // قائمة الضغط المطوّل على آية (§27) + الآية المحددة لإعداد التسميع
  const [ayahMenu, setAyahMenu]       = useState<string | null>(null); // verseKey
  const [recitePreset, setRecitePreset] = useState<{ surahId: number; ayahNum: number } | null>(null);

  // وضع الإخفاء العام — مستقل عن جلسة التسميع، يُحفظ محلياً
  const [globalHideMode, setGlobalHideModeState] = useState<HideMode>(() => {
    try { return (localStorage.getItem(LS_HIDE_MODE) as HideMode) ?? "visible_review"; }
    catch { return "visible_review"; }
  });
  const setGlobalHideMode = useCallback((mode: HideMode) => {
    setGlobalHideModeState(mode);
    try { localStorage.setItem(LS_HIDE_MODE, mode); } catch {}
  }, []);

  // كشف تدريجي مستقل (بدون جلسة) — خريطة verseKey → عدد الكلمات المكشوفة
  const [revealedGlobalWords, setRevealedGlobalWords] = useState<Map<string, number>>(new Map());

  // إعادة ضبط عند تغيير الصفحة أو الخروج من وضع الكشف التدريجي
  useEffect(() => { setRevealedGlobalWords(new Map()); }, [page]);
  useEffect(() => {
    if (globalHideMode !== "progressive_reveal") setRevealedGlobalWords(new Map());
  }, [globalHideMode]);

  /** كشف الكلمة التالية المخفية على الصفحة الحالية */
  const revealNextGlobalWord = useCallback(() => {
    // حارس السباق: أثناء تحميل صفحة جديدة لا يزال data يمثل الصفحة السابقة —
    // كشف كلمة هنا يسرّب حالة الكشف إلى آية مشتركة عبر حد الصفحتين.
    if (globalHideMode !== "progressive_reveal") return;
    if (!data || data.p !== page) return;
    setRevealedGlobalWords(prev => {
      const next = new Map(prev);
      for (const v of data.v) {
        // فقط الكلمات من النوع 0 (كلمات القرآن) تُعدّ في الكشف
        const wordCount = v.w.filter(w => w[2] === 0).length;
        const revealed  = next.get(v.k) ?? 0;
        if (revealed < wordCount) {
          next.set(v.k, revealed + 1);
          return next;
        }
      }
      return prev; // كل الكلمات مكشوفة بالفعل
    });
  }, [data, page, globalHideMode]);

  // ── مشغّل الصوت ──────────────────────────────────────────────────────────
  const audio = useAudioPlayer();

  // ── جلسة التسميع ─────────────────────────────────────────────────────────
  const rec = useRecitationSession();
  const live = useOpenAiRealtimeTranscription();
  const sessionActive = rec.phase === "active" || rec.phase === "paused";
  // الخادم هو مصدر الحقيقة: لا يُفتح هذا المسار إلا عندما تكون أعلام
  // التسميع الحي مفعّلة ومزوّد ASR مهيأً في البيئة الحالية.
  const aiCanaryAvailable = rec.realtimeEnabled;
  const matcherRef = useRef<QuranLiveMatcher | null>(null);
  const matcherSessionIdRef = useRef<string | null>(null);
  const cuePlayerRef = useRef<RecitationCuePlayer | null>(null);
  if (!cuePlayerRef.current) cuePlayerRef.current = new RecitationCuePlayer();
  useEffect(() => () => cuePlayerRef.current?.dispose(), []);
  const [aiRevealActive, setAiRevealActive] = useState(false);
  const [liveReveal, setLiveReveal] = useState<{
    revealedWords: Map<string, number>;
    currentWord: CanonicalQuranWord | null;
  }>({ revealedWords: new Map(), currentWord: null });
  const canonicalPagesRef = useRef(new Map<number, CanonicalQuranWord[]>());
  const canonicalPreloadsRef = useRef(new Map<number, Promise<CanonicalQuranWord[]>>());
  const appendedMatcherPagesRef = useRef(new Set<number>());
  const pendingAutoFollowPageRef = useRef<number | null>(null);
  const lastStableMatchedWordRef = useRef<CanonicalQuranWord | null>(null);
  const pageVisibilityTraceRef = useRef(new Set<number>());
  const [liveLatency, setLiveLatency] = useState<LiveRevealLatencyMetrics>(EMPTY_LIVE_LATENCY);
  const [matcherDiagnostics, setMatcherDiagnostics] = useState<MatcherDiagnostics>(EMPTY_MATCHER_DIAGNOSTICS);
  const latencySamplesRef = useRef({ matcher: [] as number[], render: [] as number[], total: [] as number[] });
  const matcherCountersRef = useRef({ matches: 0, reveals: 0 });
  const [matcherActivity, setMatcherActivity] = useState<{ lastMatchAt: number | null; lastRevealAt: number | null }>({
    lastMatchAt: null,
    lastRevealAt: null,
  });

  useEffect(() => {
    if (!aiCanaryAvailable || live.state !== "listening") return;
    const emitHeartbeat = () => {
      const now = performance.now();
      const age = (value: number | null) => value === null ? null : Math.max(0, Math.round(now - value));
      traceAi("PIPELINE_HEARTBEAT", {
        recitationState: rec.phase,
        providerState: live.diagnostics.providerConnected ? "CONNECTED" : "DISCONNECTED",
        wsOpen: live.diagnostics.wsConnected,
        backendWsOpen: live.diagnostics.backendWsConnected,
        audioContextState: live.diagnostics.audioContextState,
        micTrackState: live.diagnostics.micTrackReadyState,
        workletMessageCount: live.diagnostics.workletMessageCount,
        audioChunkCount: live.diagnostics.audioChunkCount,
         audioLevelRms: live.diagnostics.audioLevelRms,
         speechActive: live.diagnostics.speechActive,
         lastSpeechActiveAgeMs: live.diagnostics.lastSpeechActiveAgeMs,
         longestActiveSpeechWithoutDeltaMs: live.diagnostics.longestActiveSpeechWithoutDeltaMs,
         providerStalledDuringActiveSpeech: live.diagnostics.providerStalledDuringActiveSpeech,
        transcriptDeltaCount: live.diagnostics.transcriptDeltaCount,
        transcriptCompletedCount: live.diagnostics.transcriptCompletedCount,
        matcherUpdateCount: matcherDiagnostics.matcherUpdateCount,
        matcherMatchCount: matcherDiagnostics.matcherMatchCount,
        matcherNoMatchCount: matcherDiagnostics.matcherNoMatchCount,
        provisionalRevealCount: matcherDiagnostics.provisionalRevealCount,
        committedRevealCount: matcherDiagnostics.committedRevealCount,
        lastAudioAgeMs: live.diagnostics.lastAudioAgeMs,
        lastDeltaAgeMs: live.diagnostics.lastDeltaAgeMs,
        lastMatchAgeMs: age(matcherActivity.lastMatchAt),
        lastRevealAgeMs: age(matcherActivity.lastRevealAt),
        recitationSessionAgeMs: live.diagnostics.recitationSessionAgeMs,
        providerSessionAgeMs: live.diagnostics.providerSessionAgeMs,
        range: rec.range ? `${rec.range.surahId}:${rec.range.startAyah}-${rec.range.endAyah}` : null,
        currentVerseKey: rec.currentVerseKey,
      });
    };
    emitHeartbeat();
    const timer = window.setInterval(emitHeartbeat, 1000);
    return () => window.clearInterval(timer);
  }, [aiCanaryAvailable, live.diagnostics, live.state, matcherActivity, matcherDiagnostics, rec.currentVerseKey, rec.phase, rec.range]);

  const rangeKeys = useMemo(
    () => rec.range ? buildRangeKeys(rec.range) : null,
    [rec.range]
  );

  const recitationPageProps = useMemo(() => {
    const visibleKeys = rec.mode === "general" && data?.p === page
      ? new Set(data.v.map((verse) => verse.k))
      : rangeKeys;
    if (!sessionActive || !visibleKeys || !rec.range) return null;
    // كشف AI يستعمل progressive_reveal فقط بعد تهيئة matcher الحقيقي؛ عند
    // فشله نرجع للنص الظاهر كي لا يبقى الطالب أمام صفحة فارغة.
    // لا نُخفي الصفحة أثناء الاتصال/إعادة الاتصال أو الإنهاء؛ إبقاء النص
    // ظاهراً يمنع شاشة فارغة عند تعطل المزوّد ويحافظ على موضع الجلسة.
    const aiReveal = aiCanaryAvailable
      && QURAN_MATCHER_READY
      && aiRevealActive
      && live.state === "listening";
    return {
      rangeKeys: visibleKeys,
      hideMode: aiReveal ? "progressive_reveal" : (aiCanaryAvailable ? "visible_review" : rec.hideMode),
      currentVerseKey: rec.currentVerseKey,
      currentWord: aiReveal ? liveReveal.currentWord : null,
      revealedWords: aiReveal ? liveReveal.revealedWords : rec.revealedWords,
    };
  }, [data, page, sessionActive, rangeKeys, rec.mode, rec.hideMode, rec.currentVerseKey, rec.revealedWords, rec.range, aiCanaryAvailable, aiRevealActive, live.state, liveReveal]);

  // ── Focus Mode — timer auto-hide ─────────────────────────────────────────
  const timerRef         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barsVisibleRef   = useRef(true);
  const sessionActiveRef = useRef(false);
  const activeSheetRef   = useRef<ActiveSheet>(null);
  barsVisibleRef.current   = barsVisible;
  sessionActiveRef.current = sessionActive;
  activeSheetRef.current   = activeSheet;

  /** يُعيد التايمر: يُظهر الأشرطة ويبدأ العدّ التنازلي */
  const resetFocusTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!barsVisibleRef.current) setBarsVisible(true);
    timerRef.current = setTimeout(() => {
      // لا تُخفِ إذا كانت جلسة نشطة أو sheet مفتوح
      if (!sessionActiveRef.current && !activeSheetRef.current) {
        setBarsVisible(false);
      }
    }, FOCUS_DELAY);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Sheet مفتوح → أوقف التايمر؛ مغلق → أعد التشغيل
  useEffect(() => {
    if (activeSheet !== null) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setBarsVisible(true);
    } else {
      resetFocusTimer();
    }
  }, [activeSheet, resetFocusTimer]);

  // بدء التايمر عند تغيّر الصفحة
  useEffect(() => { resetFocusTimer(); }, [page, resetFocusTimer]);

  // ── التنقل ───────────────────────────────────────────────────────────────
  const go = useCallback((p: number) => {
    if (p >= 1 && p <= TOTAL_PAGES && p !== page) {
      navDir.current = p > page ? "next" : "prev";
      onNavigate(p);
    }
  }, [onNavigate, page]);
  const next = useCallback(() => go(page + 1), [go, page]);
  const prev = useCallback(() => go(page - 1), [go, page]);

  // ── Zoom/Pan/Swipe ────────────────────────────────────────────────────────
  // onSwipe و onTap يقرآن activeSheetRef مباشرةً — لا swipe/tap عند sheet مفتوح
  const zoomPan = useZoomPan({
    containerRef,
    onSwipe: (dir) => {
      if (activeSheetRef.current) return; // sheet مفتوح — امنع التنقل
      dir === "next" ? next() : prev();
    },
    onTap: () => {
      if (activeSheetRef.current) return; // sheet مفتوح — لا تغيير للـ focus mode
      if (!barsVisibleRef.current) {
        resetFocusTimer(); // يُظهر + يبدأ تايمر
      } else if (!sessionActiveRef.current) {
        // إخفاء فوري — لا جلسة ولا sheet
        if (timerRef.current) clearTimeout(timerRef.current);
        setBarsVisible(false);
      } else {
        // جلسة نشطة — فقط إعادة التايمر
        resetFocusTimer();
      }
    },
  });

  // ── قياس صندوق القراءة (يستثني الـ safe-area العلوية والحافة السفلية) ────
  useEffect(() => {
    const el = pageBoxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // قفل تمرير الصفحة خلف القارئ
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── تحميل الصفحة ─────────────────────────────────────────────────────────
  const preloadRecitationPage = useCallback((targetPage: number): Promise<CanonicalQuranWord[]> => {
    if (targetPage < 1 || targetPage > TOTAL_PAGES) return Promise.resolve([]);
    const existing = canonicalPreloadsRef.current.get(targetPage);
    if (existing) return existing;

    const nextPagePreloadStartedAt = Date.now();
    traceAi("NEXT_PAGE_PRELOAD_STARTED", { targetPage, nextPagePreloadStartedAt });
    const request = Promise.all([
      loadPage(targetPage),
      ensurePageFont(targetPage),
      loadCanonicalWordsForPage(targetPage),
    ])
      .then(([, , words]) => {
        canonicalPagesRef.current.set(targetPage, words);
        traceAi("NEXT_PAGE_PRELOAD_READY", {
          targetPage,
          nextPagePreloadStartedAt,
          nextPagePreloadReadyAt: Date.now(),
          wordCount: words.length,
        });
        return words;
      })
      .catch((error) => {
        canonicalPreloadsRef.current.delete(targetPage);
        traceAi("NEXT_PAGE_PRELOAD_FAILED", { targetPage });
        throw error;
      });
    canonicalPreloadsRef.current.set(targetPage, request);
    return request;
  }, []);

  const startLoad = useCallback((p: number) => {
    const mySeq = ++seq.current;
    setStatus("loading");
    Promise.all([loadPage(p), ensurePageFont(p)])
      .then(([d]) => {
        if (seq.current !== mySeq) return;
        setData(d);
        setStatus("ok");
        prefetchAround(p);
        for (const n of [p + 1, p - 1]) {
          if (n >= 1 && n <= TOTAL_PAGES) ensurePageFont(n).catch(() => {});
        }
        void preloadRecitationPage(p + 1).catch(() => {});
        retainPageFonts(p);
      })
      .catch(() => { if (seq.current === mySeq) setStatus("error"); });
  }, [preloadRecitationPage]);

  useEffect(() => { zoomPan.reset(); startLoad(page); }, [page, startLoad]);

  // ── إغلاق ────────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    if (rec.busy) return;
    if (sessionActive) {
      if (window.confirm("لديك جلسة تسميع جارية. هل تريد إلغاءها والخروج؟")) {
        live.cancel();
        rec.cancelSession();
        onClose();
      }
    } else {
      onClose();
    }
  }, [live.cancel, rec, sessionActive, onClose]);

  // لوحة المفاتيح
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (activeSheetRef.current) return; // sheet مفتوح — تجاهل
      if (e.key === "ArrowLeft")  { next(); resetFocusTimer(); }
      else if (e.key === "ArrowRight") { prev(); resetFocusTimer(); }
      else if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [next, prev, handleClose, resetFocusTimer]);

  const retry = useCallback(() => startLoad(page), [page, startLoad]);

  // ── حساب الحجم — هاتف: العرض يضبط الخط والارتفاع يملأ الشاشة؛
  //    مكتبي/أفقي: النسبة الأصلية محفوظة مع سقف عرض (انظر computeMushafPageFit)
  const fit   = computeMushafPageFit(size.w, size.h);
  const pageW = fit.w;
  const pageH = fit.h;
  const pageReady = status === "ok" && data !== null && data.p === page;
  const surahName = pageReady && data.v[0] ? surahOfChapter(data.v[0].c) : "";
  const juz       = pageReady ? data.j : null;

  useEffect(() => {
    if (!sessionActive || !pageReady || pageVisibilityTraceRef.current.has(page)) return;
    pageVisibilityTraceRef.current.add(page);
    traceAi("NEXT_PAGE_VISIBLE", { page, nextPageVisibleAt: Date.now() });
  }, [page, pageReady, sessionActive]);

  // ── Sheet helpers ─────────────────────────────────────────────────────────
  const openSheet  = useCallback((s: Exclude<ActiveSheet, null>) => setActiveSheet(s), []);
  const closeSheet = useCallback(() => setActiveSheet(null), []);

  // ── فتح / تبديل مشغّل الصوت ─────────────────────────────────────────────
  // §45: عند الفتح — استئناف آخر موضع استماع إن كان على الصفحة الحالية،
  // وإلا البدء من أول آية في الصفحة.
  const toggleAudio = useCallback(() => {
    setShowAudio(v => {
      if (!v && data && data.v[0]) {
        const last = loadLastListen();
        const track = last && pageOfAyah(last.surahId, last.ayahNum) === data.p
          ? last
          : { surahId: data.v[0].c, ayahNum: data.v[0].n };
        audio.playFrom(track.surahId, track.ayahNum);
      }
      return !v;
    });
  }, [data, audio]);

  // ── مرافق تبيان AI (Canary فقط، لا يلمس منطق القرآن) ─────────────────────
  const startAiForSession = useCallback(async (sessionId: string) => {
    traceAi("AI_REALTIME_START_REQUESTED", { hasSessionId: true });
    const started = await live.start(sessionId);
    traceAi(started ? "AI_REALTIME_START_SUCCEEDED" : "AI_REALTIME_START_FAILED");
    return started;
  }, [live.start]);

  const appendNextGeneralPage = useCallback((sourcePage: number, sessionId: string) => {
    const nextPage = sourcePage + 1;
    void preloadRecitationPage(nextPage)
      .then((nextPageWords) => {
        if (
          matcherRef.current
          && matcherSessionIdRef.current === sessionId
          && !appendedMatcherPagesRef.current.has(nextPage)
        ) {
          matcherRef.current.appendWords(nextPageWords);
          appendedMatcherPagesRef.current.add(nextPage);
          traceAi("NEXT_PAGE_MATCHER_CONTEXT_READY", {
            sourcePage,
            nextPage,
            wordCount: nextPageWords.length,
          });
        }
      })
      .catch(() => {});
  }, [preloadRecitationPage]);

  const prepareLiveMatcher = useCallback(async (
    range: RecitationRange,
    options: {
      mode: "general" | "educational";
      sessionId: string;
      startVerseKey?: string;
      startWordPosition?: number;
    },
  ) => {
    setAiRevealActive(true);
    setLiveReveal({ revealedWords: new Map(), currentWord: null });
    setLiveLatency(EMPTY_LIVE_LATENCY);
    setMatcherDiagnostics(EMPTY_MATCHER_DIAGNOSTICS);
    matcherCountersRef.current = { matches: 0, reveals: 0 };
    setMatcherActivity({ lastMatchAt: null, lastRevealAt: null });
    latencySamplesRef.current = { matcher: [], render: [], total: [] };
    appendedMatcherPagesRef.current = new Set([page]);
    pendingAutoFollowPageRef.current = null;
    lastStableMatchedWordRef.current = null;
    pageVisibilityTraceRef.current = new Set();

    const pageWords = options.mode === "general"
      ? await loadCanonicalWordsForPage(page)
      : await loadCanonicalWordsForRange(range);
    canonicalPagesRef.current.set(page, pageWords);
    // GENERAL يبدأ بـ corpus الصفحة كاملة حتى تستطيع Local Recovery استعادة
    // موضع صحيح قبل startContext المتاح أو بعده. السياق لا يستبعد كلمات.
    const words = pageWords;
    if (!words.length) throw new Error("لم تُحمّل كلمات القرآن للنطاق المحدد");
    matcherRef.current = new QuranLiveMatcher(
      words,
      options.mode === "general"
        ? { generalPositionFollowing: true, ignoreOptionalBasmala: true }
        : undefined,
    );
    if (options.mode === "general" && options.startVerseKey) {
      const positioned = matcherRef.current.setStartPosition({
        verseKey: options.startVerseKey,
        wordPosition: options.startWordPosition,
      });
      traceAi("QURAN_MATCHER_START_POSITION", {
        startVerseKey: options.startVerseKey,
        startWordPosition: options.startWordPosition ?? null,
        positioned,
      });
    }
    matcherSessionIdRef.current = options.sessionId;
    traceAi("QURAN_MATCHER_READY", {
      wordCount: words.length,
      mode: options.mode,
      startVerseKey: options.startVerseKey ?? null,
    });
    if (options.mode === "general") {
      appendNextGeneralPage(page, options.sessionId);
    }
  }, [appendNextGeneralPage, page]);

  const startRecitationWithAi = useCallback(async (
    request: RecitationStartRequest,
    hideMode: Parameters<typeof rec.startSession>[1],
  ) => {
    traceAi("MUSHAF_START_CLICKED");
    // تهيئة اختيارية داخل user gesture؛ لا يُشغّل cue قبل نجاح إنشاء الجلسة.
    cuePlayerRef.current?.prepare();
    const sessionId = await rec.startSession(request, hideMode);
    traceAi("RECITATION_SESSION_READY", { hasSessionId: Boolean(sessionId), mode: request.mode });
    // cue الواجهة مستقل عن المزوّد: جلسة الخادم نجحت الآن، لكن أي retry لاحق
    // للـ matcher أو Speechmatics لا يمثل بدء جلسة جديدة ولا يكرر صوت البدء.
    void cuePlayerRef.current?.playCue("start");
    if (aiCanaryAvailable) {
      try {
        await prepareLiveMatcher(request.localRange, {
          mode: request.mode,
          sessionId,
          startVerseKey: request.mode === "general" ? request.startContext.startVerseKey : undefined,
          startWordPosition: request.mode === "general" ? request.startContext.startWordPosition : undefined,
        });
        await startAiForSession(sessionId);
      } catch {
        matcherRef.current = null;
        setAiRevealActive(false);
        traceAi("QURAN_MATCHER_PREPARE_FAILED");
      }
    }
    else traceAi("AI_REALTIME_SKIPPED", { reason: "feature_disabled_or_not_ready" });
  }, [aiCanaryAvailable, prepareLiveMatcher, rec.startSession, startAiForSession]);

  const startAi = useCallback(async () => {
    if (!aiCanaryAvailable || rec.phase !== "active" || !rec.sessionId) return;
    if (!matcherRef.current && rec.range) {
      await prepareLiveMatcher(rec.range, { mode: rec.mode, sessionId: rec.sessionId });
    }
    await startAiForSession(rec.sessionId);
  }, [aiCanaryAvailable, prepareLiveMatcher, rec.mode, rec.phase, rec.range, rec.sessionId, startAiForSession]);

  // عند ظهور الصفحة الجديدة نوسّع corpus فوراً بالصفحة التالية لها، بلا انتظار
  // وصول التلاوة إلى آخر سطر. يبقى دليل "قرب النهاية" شرطاً للانتقال فقط.
  useEffect(() => {
    if (!sessionActive || rec.mode !== "general" || !rec.sessionId || !matcherRef.current) return;
    appendNextGeneralPage(page, rec.sessionId);
  }, [appendNextGeneralPage, page, rec.mode, rec.sessionId, sessionActive]);

  useEffect(() => {
    if (pendingAutoFollowPageRef.current === page) pendingAutoFollowPageRef.current = null;
  }, [page]);

  useEffect(() => {
    const event = live.latestTranscriptEvent;
    if (!event || rec.phase !== "active" || !matcherRef.current) return;
    const matcher = matcherRef.current;
    const match = matcher.feed(event);
    setMatcherDiagnostics(match.diagnostics);
    const now = performance.now();
    const matched = match.diagnostics.matcherMatchCount > matcherCountersRef.current.matches;
    const revealed = match.diagnostics.committedRevealCount > matcherCountersRef.current.reveals;
    matcherCountersRef.current = {
      matches: match.diagnostics.matcherMatchCount,
      reveals: match.diagnostics.committedRevealCount,
    };
    if (matched || revealed) {
      setMatcherActivity((previous) => ({
        lastMatchAt: matched ? now : previous.lastMatchAt,
        lastRevealAt: revealed ? now : previous.lastRevealAt,
      }));
    }
    if (!match.stable) return;
    const previousStableWord = lastStableMatchedWordRef.current;
    lastStableMatchedWordRef.current = match.current;
    const matcherFinishedAt = performance.now();
    const matcherLatency = Math.max(0, matcherFinishedAt - (event.clientReceivedAt ?? event.receivedAt));
    latencySamplesRef.current.matcher.push(matcherLatency);
    setLiveReveal({ revealedWords: match.revealedWords, currentWord: match.current });
    const renderScheduledAt = performance.now();
    const renderedWord = match.current;
    requestAnimationFrame(() => {
      const wordVisibleAt = performance.now();
      const renderLatency = Math.max(0, wordVisibleAt - renderScheduledAt);
      latencySamplesRef.current.render.push(renderLatency);
      if (event.audioChunkSentAt !== undefined) {
        latencySamplesRef.current.total.push(Math.max(0, wordVisibleAt - event.audioChunkSentAt));
      }
      const sample = latencySamplesRef.current;
      setLiveLatency({
        matcherP50Ms: percentile(sample.matcher, 0.5),
        matcherP95Ms: percentile(sample.matcher, 0.95),
        matcherMaxMs: sample.matcher.length ? Math.round(Math.max(...sample.matcher)) : null,
        renderP50Ms: percentile(sample.render, 0.5),
        renderP95Ms: percentile(sample.render, 0.95),
        // wordVisibleAt يقيس أول frame بعد تحديث DOM؛ اكتمال opacity يحتاج 220ms إضافية.
        visualCompletionP50Ms: (percentile(sample.render, 0.5) ?? 0) + 220,
        totalP50Ms: percentile(sample.total, 0.5),
        totalP95Ms: percentile(sample.total, 0.95),
      });
      traceAi("QURAN_REVEAL_LATENCY", {
        matcherMs: Math.round(matcherLatency),
        renderMs: Math.round(renderLatency),
        totalMs: event.audioChunkSentAt === undefined ? null : Math.round(wordVisibleAt - event.audioChunkSentAt),
        mode: match.mode,
      });
    });
    traceAi("QURAN_POSITION_STABLE", {
      visiblePage: page,
      verseKey: match.current?.verseKey ?? null,
      wordPosition: match.current?.position ?? null,
      matchedPage: match.current?.page ?? null,
      matchedSurah: match.current?.surah ?? null,
      contextStartVerse: matcher.contextBounds().startVerseKey,
      contextEndVerse: matcher.contextBounds().endVerseKey,
      nextSurahPrefetched: appendedMatcherPagesRef.current.has(page + 1),
      confidence: Math.round(match.confidence * 100),
      stability: match.stability,
      mode: match.mode,
      matcherMs: Math.round(match.matcherMs),
      trackingMatches: match.diagnostics.trackingModeMatches,
      recoveryEntries: match.diagnostics.recoveryModeEntries,
      recoverySuccesses: match.diagnostics.recoverySuccesses,
      backtracks: match.diagnostics.backtracks,
    });

    if (match.current) rec.setCurrentPosition(match.current.verseKey);

    // GENERAL يتبع موضع القرآن الكنسي المستقر، لا رقم الصفحة الظاهرة ولا
    // اكتمال آخر كلمة. corpus يبقى بنفس matcher والجلسة عند تغيير الصفحة.
    if (rec.mode === "general" && match.current) {
      const currentWord = match.current;
      const matchedPage = currentWord.page;
      const currentPageWords = canonicalPagesRef.current.get(page) ?? [];
      const previousStableIndex = previousStableWord
        ? currentPageWords.findIndex((word) =>
            word.verseKey === previousStableWord.verseKey
            && word.position === previousStableWord.position,
          )
        : -1;
      const nearPageEnd = previousStableWord?.page === page
        && previousStableIndex >= Math.max(0, currentPageWords.length - PAGE_FOLLOW_NEAR_END_WORDS);
      const hasContinuousBoundaryEvidence = nearPageEnd && matchedPage === page + 1;
      if (
        hasContinuousBoundaryEvidence
        && pendingAutoFollowPageRef.current !== matchedPage
      ) {
        pendingAutoFollowPageRef.current = matchedPage;
        navDir.current = matchedPage > page ? "next" : "prev";
        traceAi("QURAN_POSITION_FOLLOW", {
          visiblePage: page,
          matchedPage,
          stableVerseKey: currentWord.verseKey,
          stableWordPosition: currentWord.position,
          matchedSurah: currentWord.surah,
          pageNavigationReason: "stable_canonical_position",
          pageTransitionStartedAt: Date.now(),
          confidence: Math.round(match.confidence * 100),
        });
        onNavigate(matchedPage);
      }
    } else if (
      rec.mode === "educational"
      && event.isFinal
      && match.current
      && match.current.page === page + 1
    ) {
      // كلمات EDUCATIONAL لا تُحمّل إلا من expectedRange المحلي، لذلك لا يمكن
      // دخول صفحة تالية ما لم يكن الواجب نفسه ممتداً إليها.
      navDir.current = "next";
      onNavigate(match.current.page);
    }
  }, [
    live.latestTranscriptEvent,
    onNavigate,
    page,
    rec.mode,
    rec.phase,
    rec.setCurrentPosition,
  ]);

  // حالة جلسة التسميع هي مصدر الحقيقة. عند فشل mutation يعود rec للطور
  // الصحيح تلقائياً، فيعود معه إرسال الصوت بلا تضارب مع الأزرار الأصلية.
  useEffect(() => {
    if (live.state !== "listening") return;
    if (rec.phase === "paused") live.pause();
    else if (rec.phase === "active") live.resume();
  }, [live.pause, live.resume, live.state, rec.phase]);

  // أي نهاية/إلغاء أو خروج من القارئ لا يترك ميكروفوناً أو WebSocket مفتوحاً.
  useEffect(() => {
    if (!sessionActive && live.state !== "idle") live.cancel();
    if (!sessionActive && matcherRef.current) {
      matcherRef.current = null;
      matcherSessionIdRef.current = null;
      setAiRevealActive(false);
      setLiveReveal({ revealedWords: new Map(), currentWord: null });
    }
  }, [live.cancel, live.state, sessionActive]);

  useEffect(() => () => live.cancel(), [live.cancel]);

  const endRecitationWithAi = useCallback(async () => {
    if (live.state === "listening") await live.stop();
    else if (live.state !== "idle") live.cancel();
    if (await rec.endSession()) void cuePlayerRef.current?.playCue("end");
  }, [live.cancel, live.state, live.stop, rec]);

  const cancelRecitationWithAi = useCallback(() => {
    live.cancel();
    rec.cancelSession();
  }, [live.cancel, rec]);

  const pauseRecitationWithCue = useCallback(async () => {
    if (await rec.pause()) void cuePlayerRef.current?.playCue("pause");
  }, [rec.pause]);

  const resumeRecitationWithCue = useCallback(async () => {
    if (await rec.resume()) void cuePlayerRef.current?.playCue("resume");
  }, [rec.resume]);

  // ── الضغط المطوّل على آية (§27) ─────────────────────────────────────────
  // مستمعون مستقلون عن useZoomPan: نقرة zoomPan تتطلب < 400ms فلا تداخل.
  // يُلغى عند الحركة (> 10px)، تعدد الأصابع، أو رفع الإصبع قبل 550ms.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let startX = 0, startY = 0, pointerCount = 0;

    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };

    const onDown = (e: PointerEvent) => {
      pointerCount++;
      if (pointerCount > 1 || !e.isPrimary) { cancel(); return; }
      // لا قائمة أثناء جلسة تسميع نشطة أو sheet مفتوح أو تكبير
      if (sessionActiveRef.current || activeSheetRef.current) return;
      startX = e.clientX; startY = e.clientY;
      cancel();
      timer = setTimeout(() => {
        timer = null;
        const target = document.elementFromPoint(startX, startY);
        const span = target instanceof Element ? target.closest("[data-verse]") : null;
        const verseKey = span?.getAttribute("data-verse");
        if (verseKey) {
          setAyahMenu(verseKey);
          if (navigator.vibrate) navigator.vibrate(15);
        }
      }, 550);
    };
    const onMove = (e: PointerEvent) => {
      if (timer && Math.hypot(e.clientX - startX, e.clientY - startY) > 10) cancel();
    };
    const onUp = () => { pointerCount = Math.max(0, pointerCount - 1); cancel(); };
    // منع قائمة السياق الأصلية للمتصفح على أجهزة اللمس (long-press ينشئ contextmenu)
    const onCtx = (e: Event) => {
      const t = e.target;
      if (t instanceof Element && t.closest("[data-verse]")) e.preventDefault();
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("contextmenu", onCtx);
    return () => {
      cancel();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("contextmenu", onCtx);
    };
  }, []);

  // إجراءات قائمة الآية
  const reciteFromAyah = useCallback((surahId: number, ayahNum: number) => {
    if (showAudio) { audio.pause(); setShowAudio(false); }
    const range = pageReady && data ? localRangeForPage(data) : null;
    if (!range) return;
    void startRecitationWithAi({
      mode: "general",
      localRange: range,
      startContext: {
        startPage: page,
        startVerseKey: `${surahId}:${ayahNum}`,
      },
    }, "visible_review");
  }, [showAudio, audio, data, page, pageReady, startRecitationWithAi]);

  const listenFromAyah = useCallback((surahId: number, ayahNum: number) => {
    audio.jumpTo(surahId, ayahNum);
    setShowAudio(true);
    audio.play();
  }, [audio]);

  const shareAyah = useCallback((surahId: number, ayahNum: number) => {
    const name = surahOfChapter(surahId);
    const p = pageOfAyah(surahId, ayahNum);
    const url = `${location.origin}${location.pathname}?page=${p}`;
    const text = `سورة ${name} — الآية ${ayahNum} (صفحة ${p}) · مصحف تبيان`;
    if (navigator.share) {
      navigator.share({ title: "مصحف تبيان", text, url }).catch(() => { /* ألغى المستخدم */ });
    } else {
      navigator.clipboard?.writeText(`${text}\n${url}`).catch(() => { /* غير متاح */ });
    }
  }, []);

  // «الآية الحالية» لإعداد التسميع (§26): ضغط مطوّل ← موضع الاستماع على
  // الصفحة ← أول آية في الصفحة الحالية.
  const currentAyahForSetup = useMemo(() => {
    if (recitePreset) return recitePreset;
    if (showAudio) return { surahId: audio.surahId, ayahNum: audio.ayahNum };
    const last = loadLastListen();
    if (last && pageReady && pageOfAyah(last.surahId, last.ayahNum) === data.p) return last;
    if (pageReady && data.v[0]) return { surahId: data.v[0].c, ayahNum: data.v[0].n };
    return null;
  }, [recitePreset, showAudio, audio.surahId, audio.ayahNum, pageReady, data]);

  /**
   * GENERAL يبدأ فوراً من الصفحة الحالية. السياق اختياري للمطابقة المحلية فقط،
   * ولا يتحول أبداً إلى expectedRange أو نهاية للجلسة على الخادم.
   */
  const handleStartRecitation = useCallback(() => {
    if (!pageReady || !data) return;
    if (showAudio) {
      audio.pause();
      setShowAudio(false);
    }
    setRecitePreset(null);
    const localRange = localRangeForPage(data);
    if (!localRange) return;
    const currentAyah = currentAyahForSetup
      && pageOfAyah(currentAyahForSetup.surahId, currentAyahForSetup.ayahNum) === page
      ? currentAyahForSetup
      : null;
    void startRecitationWithAi({
      mode: "general",
      localRange,
      startContext: {
        startPage: page,
        startVerseKey: currentAyah ? `${currentAyah.surahId}:${currentAyah.ayahNum}` : undefined,
      },
    }, "visible_review");
  }, [
    audio,
    currentAyahForSetup,
    data,
    page,
    pageReady,
    showAudio,
    startRecitationWithAi,
  ]);

  // عند تفعيل جلسة التسميع: أوقف الصوت إذا لا يزال شغّالاً
  useEffect(() => {
    if (sessionActive && showAudio) {
      audio.pause();
      setShowAudio(false);
    }
    // audio.pause مستقر (useCallback)، لا يسبب re-renders
  }, [sessionActive, showAudio, audio]);

  // وضع الإخفاء المُمرَّر للصفحة: الجلسة لها الأولوية
  const effectiveGlobalHideMode = sessionActive ? null : globalHideMode;

  // مفتاح الآية الصوتية (null أثناء جلسة التسميع)
  const audioVerseKey = (showAudio && !sessionActive) ? audio.currentVerseKey : null;

  return (
    <div className="mushaf-reader-shell fixed inset-0 z-[100] flex flex-col" dir="rtl">

      {/* ══ منطقة القراءة (touch-none — إيماءات فقط) ══════════════════════ */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden touch-none select-none"
        style={{ cursor: zoomPan.zoomedIn ? (zoomPan.interacting ? "grabbing" : "grab") : "default" }}
        {...zoomPan.handlers}
      >
        {/* صندوق القراءة المُقاس: يبدأ تحت الـ safe-area مباشرة وينتهي قبل
            الحافة السفلية بـ8px — الأدوات تطفو فوقه ولا تدفع الصفحة */}
        <div
          ref={pageBoxRef}
          className="absolute inset-x-0 flex items-center justify-center"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 8px)", bottom: 8 }}
        >
          {pageW > 0 && (
            <div
              style={{
                transform: `translate3d(${zoomPan.x + zoomPan.dragX}px, ${zoomPan.y}px, 0) scale(${zoomPan.zoom})`,
                transition: zoomPan.interacting ? "none" : "transform 160ms ease-out",
                willChange: "transform",
              }}
            >
              {pageReady ? (
                <div
                  key={data.p}
                  className={
                    navDir.current === "next"
                      ? "mushaf-enter-next"
                      : navDir.current === "prev"
                        ? "mushaf-enter-prev"
                        : undefined
                  }
                >
                  <MushafPage
                    data={data}
                    width={pageW}
                    height={pageH}
                    recitation={recitationPageProps}
                    globalHideMode={effectiveGlobalHideMode}
                    revealedGlobalWords={
                      globalHideMode === "progressive_reveal" && !sessionActive
                        ? revealedGlobalWords
                        : undefined
                    }
                    audioVerseKey={audioVerseKey}
                  />
                </div>
              ) : (
                <div
                  className="flex items-center justify-center"
                  style={{ width: pageW, height: pageH, background: "#fdfaf1" }}
                >
                  {status === "error" ? (
                    <div className="text-center px-6">
                      <p className="font-readex text-sm text-muted-foreground mb-3">تعذّر تحميل الصفحة، حاول مرة أخرى.</p>
                      <button
                        onClick={retry}
                        className="font-readex text-sm font-bold text-burgundy bg-burgundy/10 rounded-xl px-5 py-2.5 btn-press"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : (
                    <span className="font-amiri text-xl text-muted-foreground animate-pulse">…</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══ طبقات التسميع (داخل منطقة القراءة) ══ */}
        {rec.phase === "setup" && (
          <RecitationSetupSheet
            pageData={pageReady ? data : null}
            currentAyah={currentAyahForSetup}
            isStudent={rec.isStudent}
            educationalAvailable={rec.educationalAvailable}
            isStarting={rec.isStarting}
            onStart={startRecitationWithAi}
            onClose={() => { setRecitePreset(null); rec.closeSetup(); }}
          />
        )}
        {rec.phase === "result" && rec.result && (
          <RecitationResultSheet
            result={rec.result}
            onClose={rec.closeResult}
            onRepeat={rec.result.mode === "general" ? handleStartRecitation : rec.repeatSession}
          />
        )}
      </div>

      {/* ══ أدوات القارئ (خارج touch-none — يأخذ pointer events مباشرة) ══ */}
      <MushafControls
        page={page}
        surahName={surahName}
        juz={juz}
        bookmarked={bookmarks.includes(page)}
        zoom={zoomPan.zoom}
        visible={barsVisible}
        sessionActive={sessionActive}
        recitationEnabled={rec.enabled}
        globalHideMode={globalHideMode}
        audioActive={showAudio}
        onClose={handleClose}
        onToggleBookmark={() => toggleBookmark(page)}
        onZoomIn={zoomPan.zoomIn}
        onZoomOut={zoomPan.zoomOut}
        onZoomReset={zoomPan.reset}
        onOpenIndex={() => openSheet("index")}
        onOpenSearch={() => openSheet("search")}
        onOpenAudio={toggleAudio}
        onOpenHide={() => openSheet("hide")}
        onStartRecitation={handleStartRecitation}
        onRevealGlobalWord={revealNextGlobalWord}
      />

      {/* ══ شريط الصوت — فوق الشريط السفلي ══ */}
      {showAudio && !sessionActive && (
        <MushafAudioBar
          surahName={audio.surahName}
          ayahNum={audio.ayahNum}
          isPlaying={audio.isPlaying}
          isLoading={audio.isLoading}
          error={audio.error}
          repeat={audio.repeat}
          reciterId={audio.reciterId}
          onTogglePlay={audio.togglePlay}
          onNext={audio.next}
          onPrev={audio.prev}
          onRepeatChange={audio.setRepeat}
          onReciterChange={audio.setReciter}
          onClose={() => { audio.pause(); setShowAudio(false); }}
          onClearError={audio.clearError}
        />
      )}

      {/* ══ شريط جلسة التسميع — يحل محل الشريط السفلي ══ */}
      {sessionActive && rec.range && (
        <RecitationSessionBar
          range={rec.range}
          mode={rec.mode}
          hideMode={rec.hideMode}
          phase={rec.phase}
          elapsedSecs={rec.elapsedSecs}
          currentVerseKey={rec.currentVerseKey}
          busy={rec.busy}
          sessionError={rec.sessionError}
          aiAvailable={aiCanaryAvailable}
          aiState={live.state}
          onStartAi={() => { void startAi(); }}
           onPause={pauseRecitationWithCue}
           onResume={resumeRecitationWithCue}
          onEnd={() => { void endRecitationWithAi(); }}
          onCancel={cancelRecitationWithAi}
          onNextAyah={rec.nextAyah}
          onPrevAyah={rec.prevAyah}
          onRevealWord={rec.revealNextWord}
          onRevealAyah={rec.revealCurrentAyah}
          onClearError={rec.clearError}
        />
      )}

      {aiCanaryAvailable && (sessionActive || live.state !== "idle") && (
        <RecitationAiCanaryOverlay
          state={live.state}
          error={live.error}
          metrics={live.metrics}
          latency={liveLatency}
          diagnostics={matcherDiagnostics}
          runtimeDiagnostics={live.diagnostics}
          lastMatchAt={matcherActivity.lastMatchAt}
          lastRevealAt={matcherActivity.lastRevealAt}
          range={rec.range ? `${rec.range.surahId}:${rec.range.startAyah}–${rec.range.endAyah}` : null}
           recitationPhase={rec.phase}
        />
      )}

      {/* ══ Sheets — خارج touch-none: تمرير لمسي يعمل بالكامل ══════════════
           هذه العناصر siblings للـ containerRef — لا touch-action: none تُطبَّق عليها.
           z-30 يجعلها فوق الأدوات (z-20) وفوق شريط الصوت (z-24).           */}
      {activeSheet === "index" && (
        <MushafIndexSheet
          currentPage={page}
          bookmarks={bookmarks}
          onNavigate={(p) => { go(p); closeSheet(); }}
          onClose={closeSheet}
        />
      )}
      {activeSheet === "search" && (
        <MushafSearchSheet
          onNavigate={(p) => { go(p); closeSheet(); }}
          onClose={closeSheet}
        />
      )}
      {activeSheet === "hide" && (
        <MushafHideModeSheet
          current={globalHideMode}
          onChange={setGlobalHideMode}
          onClose={closeSheet}
        />
      )}

      {/* ══ قائمة الضغط المطوّل على آية (§27) ══ */}
      {ayahMenu && !sessionActive && (
        <AyahActionSheet
          verseKey={ayahMenu}
          page={page}
          bookmarked={bookmarks.includes(page)}
          recitationEnabled={rec.enabled}
          onReciteFromHere={reciteFromAyah}
          onListenFromHere={listenFromAyah}
          onToggleBookmark={() => toggleBookmark(page)}
          onShare={shareAyah}
          onClose={() => setAyahMenu(null)}
        />
      )}
    </div>
  );
}
