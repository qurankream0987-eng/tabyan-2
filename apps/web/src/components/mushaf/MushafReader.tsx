/**
 * Tabyan Mushaf: fitted physical paper inside a dedicated reading viewport.
 * App chrome and sheets remain outside the Quran page and gesture surface.
 * Phones fit the page to available width and scroll vertically; wider screens fit both axes.
 * Gestures can enlarge and pan within measured paper bounds. QCF data and font mapping stay intact.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MushafPage from "./MushafPage";
import MushafControls from "./MushafControls";
import MushafAudioBar from "./MushafAudioBar";
import MushafIndexSheet from "./MushafIndexSheet";
import MushafSearchSheet, { type VoiceSearchState } from "./MushafSearchSheet";
import { loadQuranSearchIndex, searchQuran } from "@/lib/recitation-ai/quranSearch";
import MemorizeSheet from "./MemorizeSheet";
import RecitationSetupSheet from "./RecitationSetupSheet";
import RecitationSessionBar from "./RecitationSessionBar";
import RecitationResultSheet from "./RecitationResultSheet";
import RecitationAiCanaryOverlay from "./RecitationAiCanaryOverlay";
import AyahActionSheet from "./AyahActionSheet";
import MushafPageFrame from "./MushafPageFrame";
import Icon from "@/components/app/Icon";
import "./mushaf-reader.css";
import { loadPage, prefetchAround, computeMushafPageFit, TOTAL_PAGES } from "@/lib/mushaf/pages";
import { pageOfAyah } from "@/lib/mushaf/page-index";
import { getGeneralRecitationFollowTarget } from "@/lib/mushaf/recitationPageFollow";
import { toArabicDigits } from "@/lib/mushaf/format";
import { createFrameScheduler } from "@/lib/mushaf/frame-scheduler";
import { ensurePageFont, retainPageFonts } from "@/lib/mushaf/fonts";
import { useZoomPan } from "@/lib/mushaf/useZoomPan";
import { useAudioPlayer, loadLastListen } from "@/lib/mushaf/useAudioPlayer";
import { RecitationCuePlayer, getRecitationCuesEnabled, setRecitationCuesEnabled } from "@/lib/mushaf/recitation-cues";
import { RecitationFeedback } from "@/lib/mushaf/recitation-feedback";
import { runSessionAction } from "@/lib/mushaf/session-audio-lifecycle";
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
import type { LiveRevealLatencyMetrics, TranscriptEvent } from "@/lib/recitation-ai/types";
import { normalizeQuranText } from "@/lib/recitation-ai/normalizer";
import { RollingSamples } from "@/lib/recitation-ai/latencyTelemetry";
import { RecitationStateEngine, type RecitationSummary } from "@/lib/recitation-ai/recitationStateEngine";
import { ConfirmedTabyanEventProjector } from "@/lib/recitation-ai/confirmedTabyanEventBridge";
import { loadRecitationAiOptions, saveRecitationAiOptions, type RecitationAiOptions } from "@/lib/recitation-ai/recitationPreferences";
import { deriveAiPhase, RECONNECT_DELAYS_MS, shouldAutoReconnect } from "@/lib/recitation-ai/aiSessionPhase";
import { AUDIO_QUALITY_MESSAGES } from "@/lib/recitation-ai/audioQuality";
import RecitationSessionSettingsSheet from "./RecitationSessionSettingsSheet";
import MistakePopover, { type MistakePopoverData } from "./MistakePopover";
import { TashkeelEvidenceMonitor } from "@/lib/recitation-ai/tashkeel";
import MemorizationTestSetupSheet from "./MemorizationTestSetupSheet";
import MemorizationTestScreen from "./MemorizationTestScreen";
import ReaderModeFab, { ReaderContextButton, type ReaderMode, type FabState } from "./ReaderModeFab";
import AiStatusChip from "./AiStatusChip";
import type { IconName } from "@/components/app/Icon";
import MemorizationTestResultSheet from "./MemorizationTestResultSheet";
import ReaderToolsSheet from "./ReaderToolsSheet";
import { testRevealMap, useMemorizationTestRunner, type TestRunnerDeps } from "./useMemorizationTestRunner";
import RecitationHistorySheet, { type HistoryTab } from "./RecitationHistorySheet";
import { RecitationHistoryStore, type AyahSessionResult, type HistoryData, type HistoryMistake } from "@/lib/recitation-ai/recitationHistoryStore";
import { DEFAULT_TEST_SETTINGS, type QuestionResult } from "@/lib/recitation-ai/memorizationTest";
import {
  buildAssignmentResult,
  collectRangeWords,
  type AssignmentResultPayload,
  type MushafAssignment,
} from "@/lib/recitation-assignments";
import AssignmentSubmissionNotice, { type AssignmentSubmission } from "./AssignmentSubmissionNotice";
import { trpc } from "@/providers/trpc";
import { authStore } from "@/lib/auth";
import type { WordFeedbackState } from "@/lib/mushaf/word-presentation";
import { readAccountStorage, writeAccountStorage } from "@/lib/account-storage";

const FOCUS_DELAY = 4000; // ms قبل إخفاء الأدوات تلقائياً
const LS_HIDE_MODE = "tabyan.mushaf.hideMode";
const QURAN_MATCHER_READY = true;
/** ارتفاع الشريط العلوي والشريط العائم المحجوزين (px). */

type ActiveSheet = "index" | "search" | "hide" | "test" | "tools" | "history" | null;

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

function traceAi(event: string, metadata: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.info(`[TABYAN_AI_TRACE] ${event}`, metadata);
}

/** أدوات المطور (أرقام الكمون/الثقة) لا تظهر للمستخدم العادي: DEV أو علم محلي صريح. */
function aiDevtoolsEnabled() {
  // Keep diagnostic logs active; the large graphical overlay is opt-in only.
  try { return localStorage.getItem("tabyan.ai.devtools") === "1"; } catch { return false; }
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
  accountId: string | null;
  onClose: () => void;
  onNavigate: (page: number) => void;
  bookmarks: number[];
  toggleBookmark: (page: number) => void;
  /** واجب تسميع فُتح القارئ من أجله: يبدأ منه التسميع التعليمي وتُسلَّم نتيجته. */
  assignment?: MushafAssignment | null;
}

export default function MushafReader({ page, accountId, onClose, onNavigate, bookmarks, toggleBookmark, assignment = null }: Props) {
  const isDemo = authStore.isDemo;
  const storageUserKey = isDemo ? "demo" : accountId;
  const containerRef = useRef<HTMLDivElement>(null);
  const pageBoxRef   = useRef<HTMLDivElement>(null);
  const [size, setSize]     = useState({ w: 0, h: 0 });
  const [data, setData]     = useState<MushafPageData | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  // أدوات القارئ مخفية افتراضياً (ورقة مطبوعة فقط)؛ نقرة على الورقة تُظهرها فوقها.
  const [barsVisible, setBarsVisible] = useState(false);
  const seq    = useRef(0);
  const navDir = useRef<"next" | "prev" | null>(null);

  // ── Sheets & Audio ───────────────────────────────────────────────────────
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [showAudio, setShowAudio]     = useState(false);
  /** مشغّل الاستماع الموسّع يُفتح عند الطلب فقط (الأداة السياقية في وضع الاستماع). */
  const [audioPanelOpen, setAudioPanelOpen] = useState(false);
  /** وضع الزر الرئيسي: قراءة / استماع / تسميع / اختبار (الضغط المطوّل يغيّره). */
  const [readerMode, setReaderMode] = useState<ReaderMode>("recite");
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [aiDetailsOpen, setAiDetailsOpen] = useState(false);
  /** منتقي الأوضاع مفتوح → يوقف مؤقت إخفاء الأدوات كأي ورقة */
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const modeMenuOpenRef = useRef(false);
  modeMenuOpenRef.current = modeMenuOpen;

  // قائمة الضغط المطوّل على آية (§27) + الآية المحددة لإعداد التسميع
  const [ayahMenu, setAyahMenu]       = useState<string | null>(null); // verseKey
  const [recitePreset, setRecitePreset] = useState<{ surahId: number; ayahNum: number } | null>(null);

  // وضع الإخفاء العام — مستقل عن جلسة التسميع، يُحفظ محلياً
  const [globalHideMode, setGlobalHideModeState] = useState<HideMode>(() => {
    try { return (readAccountStorage(storageUserKey, LS_HIDE_MODE) as HideMode) ?? "visible_review"; }
    catch { return "visible_review"; }
  });
  const setGlobalHideMode = useCallback((mode: HideMode) => {
    setGlobalHideModeState(mode);
    writeAccountStorage(storageUserKey, LS_HIDE_MODE, mode);
  }, [storageUserKey]);

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
  const audio = useAudioPlayer(1, 1, storageUserKey);

  // ── جلسة التسميع ─────────────────────────────────────────────────────────
  const rec = useRecitationSession();
  // القارئ يعالج الأحداث عبر subscribe؛ لا حاجة لإعادة رسمه مع كل delta.
  const live = useOpenAiRealtimeTranscription({
    trackTranscriptState: false,
    onAudioReady: () => feedbackRef.current?.providerReady(),
  });
  const sessionActive = rec.phase === "active" || rec.phase === "paused";
  // ── اختبار الحفظ: وكيل ثابت يمرّر للأحدث عبر ref (الدوال تُعرَّف لاحقاً) ──
  const testDepsRef = useRef<TestRunnerDeps | null>(null);
  const testDeps = useMemo<TestRunnerDeps>(() => ({
    get aiEnabled() { return testDepsRef.current?.aiEnabled ?? false; },
    navigate: (p) => testDepsRef.current?.navigate(p),
    installQuestionMatcher: (words, startIndex) => testDepsRef.current?.installQuestionMatcher(words, startIndex),
    startAi: (p, verseKey) => testDepsRef.current?.startAi(p, verseKey) ?? Promise.resolve(false),
    stopAi: (save) => testDepsRef.current?.stopAi(save) ?? Promise.resolve(),
    peekAi: (indices) => testDepsRef.current?.peekAi(indices),
    committedIndex: () => testDepsRef.current?.committedIndex() ?? 0,
    engineStats: () => testDepsRef.current?.engineStats() ?? { confirmed: 0, corrected: 0, peeks: 0 },
    onQuestionComplete: (result) => testDepsRef.current?.onQuestionComplete?.(result),
    onFinished: (state) => testDepsRef.current?.onFinished?.(state),
  }), []);
  const test = useMemorizationTestRunner(testDeps);

  // ── سجل التلاوة المحلي لكل مستخدم (Part 28–31) ─────────────────────────────
  const historyUserKey = storageUserKey;
  const historyStore = useMemo(() => historyUserKey ? new RecitationHistoryStore(historyUserKey) : null, [historyUserKey]);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [historyInit, setHistoryInit] = useState<{ tab: HistoryTab; verseKey: string | null }>({ tab: "review", verseKey: null });
  const refreshHistory = useCallback(() => { setHistoryData(historyStore ? historyStore.load() : null); }, [historyStore]);
  useEffect(refreshHistory, [refreshHistory]);
  /** نتائج أسئلة الاختبار الجاري للسجل (AI أو تقييم ذاتي) */
  const testRecordRef = useRef<{ ayahs: AyahSessionResult[]; mistakes: Omit<HistoryMistake, "id" | "sessionId" | "at">[]; words: number }>({ ayahs: [], mistakes: [], words: 0 });
  const testActive = test.active;
  const testRuntime = test.state?.runtime ?? null;
  // الخادم هو مصدر الحقيقة: لا يُفتح هذا المسار إلا عندما تكون أعلام
  // التسميع الحي مفعّلة ومزوّد ASR مهيأً في البيئة الحالية.
  const aiCanaryAvailable = rec.realtimeEnabled;
  const matcherRef = useRef<QuranLiveMatcher | null>(null);
  const matcherSessionIdRef = useRef<string | null>(null);
  const cuePlayerRef = useRef<RecitationCuePlayer | null>(null);
  const feedbackRef = useRef<RecitationFeedback | null>(null);
  const startFlightRef = useRef<Promise<boolean> | null>(null);
  const endFlightRef = useRef<Promise<void> | null>(null);
  const cleanlyClosedSessionRef = useRef<string | null>(null);
  if (!feedbackRef.current) feedbackRef.current = new RecitationFeedback((cue) => cuePlayerRef.current?.playCue(cue));
  const [feedbackSounds, setFeedbackSounds] = useState(() => getRecitationCuesEnabled(storageUserKey));
  useEffect(() => {
    const player = new RecitationCuePlayer(storageUserKey);
    cuePlayerRef.current = player;
    const update = () => setFeedbackSounds(getRecitationCuesEnabled(storageUserKey));
    update();
    window.addEventListener("tabyan:recitation-cues-changed", update);
    return () => {
      window.removeEventListener("tabyan:recitation-cues-changed", update);
      player.dispose();
      if (cuePlayerRef.current === player) cuePlayerRef.current = null;
      feedbackRef.current?.complete(false);
    };
  }, [storageUserKey]);
  useEffect(() => {
    if (live.state === "failed") feedbackRef.current?.providerFailed();
  }, [live.state]);
  const [aiRevealActive, setAiRevealActive] = useState(false);
  const [liveReveal, setLiveReveal] = useState<{
    revealedWords: Map<string, number>;
    currentWord: CanonicalQuranWord | null;
    wordStates: Map<string, WordFeedbackState>;
  }>({ revealedWords: new Map(), currentWord: null, wordStates: new Map() });
  // محرك حالات الكلمات/الأخطاء فوق الـ matcher؛ كلاهما يعيش خارج React state.
  const engineRef = useRef<RecitationStateEngine | null>(null);
  const confirmedEventProjectorRef = useRef(new ConfirmedTabyanEventProjector());
  const peekedRef = useRef(new Set<number>());
  const peekLevelRef = useRef<{ level: 1 | 2 | 3; at: number } | null>(null);
  const aiOptionsRef = useRef<RecitationAiOptions>(loadRecitationAiOptions(storageUserKey));
  const [aiSummary, setAiSummary] = useState<RecitationSummary | null>(null);
  // ── حالة Tabyan AI الموحّدة (Part 13): أعلام محلية صريحة تُشتق منها المرحلة ──
  const [startingRecitation, setStartingRecitation] = useState(false);
  const [aiPreparing, setAiPreparing] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [showSessionSettings, setShowSessionSettings] = useState(false);
  const [strictLive, setStrictLive] = useState(() => aiOptionsRef.current.strict);
  const [strictHoldActive, setStrictHoldActive] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const strictHoldRef = useRef(false);
  const reconnectCountRef = useRef(0);
  const devtools = useMemo(aiDevtoolsEnabled, []);
  const [popover, setPopover] = useState<MistakePopoverData | null>(null);
  // ── الحفظ (Part 22–23): تفضيل محفوظ + حالة الجلسة الجارية (قابلة للتبديل حياً) ──
  const [hideVersesPref, setHideVersesPref] = useState(() => aiOptionsRef.current.hideVerses ?? false);
  const [hideMarkersPref, setHideMarkersPref] = useState(() => aiOptionsRef.current.hideMarkers ?? false);
  const [sessionHidden, setSessionHidden] = useState(false);
  const sessionHiddenRef = useRef(false);
  sessionHiddenRef.current = sessionHidden;
  // «متابعة قارئ» (Part 33): يتبع موضع إمام/معلم/تسجيل دون أي تقييم أخطاء.
  const [followMode, setFollowMode] = useState(false);
  const followModeRef = useRef(false);
  followModeRef.current = followMode;
  // «ابحث بالتلاوة» (Part 32): جلسة قصيرة تُلغى بعد البحث؛ واجهة الجلسة لا تظهر.
  const [voiceSearch, setVoiceSearch] = useState<VoiceSearchState>({ phase: "idle", results: [] });
  const voiceSearchActiveRef = useRef(false);
  const voiceTextRef = useRef<{ finals: string[]; partials: Map<string, string>; lastSearchAt: number }>({ finals: [], partials: new Map(), lastSearchAt: 0 });
  const voiceSearchActive = voiceSearch.phase === "starting" || voiceSearch.phase === "listening" || voiceSearch.phase === "searching";
  const [searchAutoVoice, setSearchAutoVoice] = useState(false);
  const [pendingFollowStart, setPendingFollowStart] = useState<{ page: number; verseKey: string } | null>(null);
  const [sessionHideMarkers, setSessionHideMarkers] = useState(false);
  const [aiWeakest, setAiWeakest] = useState<{ verseKey: string; confirmed: number; corrected: number; peeks: number }[]>([]);
  // ── واجب التسميع: تسليم نتيجة الجلسة التعليمية للمعلم بعد إنهائها ─────────
  const [assignmentSubmission, setAssignmentSubmission] = useState<AssignmentSubmission | null>(null);
  const trpcUtils = trpc.useUtils();
  const submitAssignmentMut = trpc.recitationAssignments.submit.useMutation();
  const sendAssignmentResult = useCallback(async (sessionId: string, payload: AssignmentResultPayload) => {
    setAssignmentSubmission({ status: "submitting", sessionId, payload });
    try {
      await submitAssignmentMut.mutateAsync({ sessionId, result: payload });
      setAssignmentSubmission({ status: "submitted", sessionId, payload });
      void trpcUtils.recitationAssignments.mine.invalidate();
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "تعذّر الاتصال بالخادم";
      setAssignmentSubmission({ status: "failed", sessionId, payload, message });
    }
  }, [submitAssignmentMut, trpcUtils]);
  const [tashkeelLive, setTashkeelLive] = useState(() => aiOptionsRef.current.tashkeel ?? false);
  const tashkeelMonitorRef = useRef(new TashkeelEvidenceMonitor());
  const [tashkeelLevel, setTashkeelLevel] = useState<"unknown" | "none" | "partial" | "present">("unknown");
  /** آخر موضع مؤشر داخل منطقة القراءة — تحتاجه النقرة لمعرفة الكلمة المستهدفة. */
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  /** يُرجع true إن استهلكت النقرة (فتح نافذة كلمة) فلا يتبدل Focus Mode. */
  const wordTapRef = useRef<() => boolean>(() => false);
  const falseFlagCountRef = useRef(0);
  const tashkeelLevelRef = useRef<"unknown" | "none" | "partial" | "present">("unknown");
  const canonicalPagesRef = useRef(new Map<number, CanonicalQuranWord[]>());
  const canonicalPreloadsRef = useRef(new Map<number, Promise<CanonicalQuranWord[]>>());
  const appendedMatcherPagesRef = useRef(new Set<number>());
  const pendingAutoFollowPageRef = useRef<number | null>(null);
  const pageVisibilityTraceRef = useRef(new Set<number>());
  const [liveLatency, setLiveLatency] = useState<LiveRevealLatencyMetrics>(EMPTY_LIVE_LATENCY);
  const [matcherDiagnostics, setMatcherDiagnostics] = useState<MatcherDiagnostics>(EMPTY_MATCHER_DIAGNOSTICS);
  const latencySamplesRef = useRef({ matcher: new RollingSamples(), render: new RollingSamples(), total: new RollingSamples() });
  const diagnosticsFlushRef = useRef<{ frame: number | null; diagnostics: MatcherDiagnostics | null; lastMatchAt: number | null; lastRevealAt: number | null }>({
    frame: null, diagnostics: null, lastMatchAt: null, lastRevealAt: null,
  });
  const matcherCountersRef = useRef({ matches: 0, reveals: 0, noMatches: 0 });
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
    if (testActive) {
      // اختبار الحفظ: البداية الظاهرة + ما تُلي/كُشف فقط؛ بقية الصفحة مخفية بلا تغيير هندسة.
      if (!testRuntime || !data || data.p !== page) return null;
      const matcher = matcherRef.current;
      return {
        rangeKeys: new Set(data.v.map((verse) => verse.k)),
        hideMode: "progressive_reveal" as const,
        currentVerseKey: null,
        currentWord: test.state?.mode === "ai" && !testRuntime.answered ? liveReveal.currentWord : null,
        revealedWords: testRevealMap(
          testRuntime,
          test.state?.mode === "ai" && matcher ? matcher.committedIndex() : null,
          test.state?.mode === "ai" ? peekedRef.current : [],
        ),
        wordStates: test.state?.mode === "ai" ? liveReveal.wordStates : undefined,
        hideAyahMarkers: hideMarkersPref,
        maskHeaders: !testRuntime.locationShown,
      };
    }
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
      // إظهار الآيات = متابعة مع صبغة خافتة لما قُرئ؛ إخفاؤها = كشف تدريجي للحفظ.
      // التسميع التعليمي يعرض بوضع الواجب الذي فرضه الخادم.
      hideMode: aiReveal
        ? (rec.mode === "educational" ? rec.hideMode : sessionHidden ? "progressive_reveal" : "visible_review")
        : (aiCanaryAvailable ? "visible_review" : rec.hideMode),
      hideAyahMarkers: aiReveal && sessionHidden && sessionHideMarkers,
      currentVerseKey: rec.currentVerseKey,
      currentWord: aiReveal ? liveReveal.currentWord : null,
      revealedWords: aiReveal ? liveReveal.revealedWords : rec.revealedWords,
      wordStates: aiReveal ? liveReveal.wordStates : undefined,
    };
  }, [data, page, sessionActive, rangeKeys, rec.mode, rec.hideMode, rec.currentVerseKey, rec.revealedWords, rec.range, aiCanaryAvailable, aiRevealActive, live.state, liveReveal, sessionHidden, sessionHideMarkers, testActive, testRuntime, test.state?.mode, hideMarkersPref]);

  // التلميح عبر المحرك متاح فقط حين يكون الكشف التدريجي بالذكاء فعّالاً.
  const aiPeekAvailable = recitationPageProps?.hideMode === "progressive_reveal" && aiRevealActive && live.state === "listening";

  // ── Focus Mode — timer auto-hide ─────────────────────────────────────────
  const timerRef         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barsVisibleRef   = useRef(false);
  const sessionActiveRef = useRef(false);
  const activeSheetRef   = useRef<ActiveSheet>(null);
  const testActiveRef    = useRef(false);
  testActiveRef.current  = testActive;
  barsVisibleRef.current   = barsVisible;
  sessionActiveRef.current = sessionActive || testActive;
  activeSheetRef.current   = activeSheet;
  const chromePinned = activeSheet !== null || modeMenuOpen || settingsMenuOpen || aiDetailsOpen
    || audioPanelOpen || showSessionSettings || !!ayahMenu || !!popover
    || rec.phase === "setup" || rec.phase === "result" || !!test.state?.finished;
  const chromePinnedRef = useRef(chromePinned);
  chromePinnedRef.current = chromePinned;

  /** يُعيد التايمر: يُظهر الأشرطة ويبدأ العدّ التنازلي */
  const resetFocusTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!barsVisibleRef.current) setBarsVisible(true);
    timerRef.current = setTimeout(() => {
      // لا تُخفِ إذا كانت جلسة نشطة أو sheet مفتوح
      if (!sessionActiveRef.current && !chromePinnedRef.current) {
        setBarsVisible(false);
      }
    }, FOCUS_DELAY);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  /** يُعيد عدّ الإخفاء فقط إن كانت الأدوات ظاهرة — لا يُظهرها (الإظهار بالنقرة وحدها). */
  const nudgeFocusTimer = useCallback(() => {
    if (barsVisibleRef.current) resetFocusTimer();
  }, [resetFocusTimer]);

  // Sheet مفتوح → أوقف التايمر؛ مغلق → أعد العدّ إن كانت الأدوات ظاهرة
  useEffect(() => {
    if (chromePinned) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setBarsVisible(true);
    } else {
      nudgeFocusTimer();
    }
  }, [chromePinned, nudgeFocusTimer]);

  // تقليب الصفحة لا يُظهر الأدوات؛ يُعيد العدّ فقط إن كانت ظاهرة
  useEffect(() => { nudgeFocusTimer(); }, [page, nudgeFocusTimer]);

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
      if (chromePinnedRef.current) return; // modal open — no navigation behind it
      if (testActiveRef.current) return;  // الاختبار يحدد الصفحة؛ السحب قد يكشف الإجابة
      dir === "next" ? next() : prev();
    },
    onTap: () => {
      if (chromePinnedRef.current) return; // modal open — keep its chrome visible
      if (wordTapRef.current()) return;   // نقرة على كلمة معلَّمة → نافذة الكلمة
      if (!barsVisibleRef.current) {
        resetFocusTimer(); // يُظهر + يبدأ تايمر
      } else {
        // Hide top chrome on tap; active stop/microphone controls stay accessible.
        if (timerRef.current) clearTimeout(timerRef.current);
        setBarsVisible(false);
      }
    },
  });

  // ── قياس صندوق القراءة (يستثني الـ safe-area العلوية والحافة السفلية) ────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth, h = el.clientHeight;
      setSize(previous => previous.w === w && previous.h === h ? previous : { w, h });
    };
    const frame = createFrameScheduler(measure);
    const ro = new ResizeObserver(frame.schedule);
    ro.observe(el);
    measure();
    return () => { ro.disconnect(); frame.dispose(); };
  }, []);

  // Reserve the measured session panel height so the final printed lines remain
  // scrollable above its safe-area-aware bottom edge.
  useEffect(() => {
    const reader = containerRef.current?.closest<HTMLElement>(".tby-reader");
    if (!reader) return;
    let observedBar: HTMLElement | null = null;
    const updateBarHeight = () => {
      if (observedBar && reader.contains(observedBar)) {
        const height = `${Math.ceil(observedBar.getBoundingClientRect().height)}px`;
        if (reader.style.getPropertyValue("--reader-session-height") !== height) {
          reader.style.setProperty("--reader-session-height", height);
        }
      }
    };
    const frame = createFrameScheduler(updateBarHeight);
    const sizeObserver = new ResizeObserver(frame.schedule);
    const attachBarObserver = () => {
      const nextBar = reader.querySelector<HTMLElement>(".tby-session-bar");
      if (nextBar === observedBar) return;
      sizeObserver.disconnect();
      observedBar = nextBar;
      if (observedBar) {
        sizeObserver.observe(observedBar);
        frame.schedule();
      } else {
        reader.style.removeProperty("--reader-session-height");
      }
    };
    const mutationObserver = new MutationObserver(attachBarObserver);
    mutationObserver.observe(reader, { childList: true, subtree: true });
    attachBarObserver();
    return () => {
      mutationObserver.disconnect();
      sizeObserver.disconnect();
      frame.dispose();
      observedBar = null;
      reader.style.removeProperty("--reader-session-height");
    };
  }, [sessionActive, testActive, voiceSearchActive]);

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

  useEffect(() => {
    zoomPan.reset();
    containerRef.current?.scrollTo(0, 0);
    startLoad(page);
  }, [page, startLoad]);

  useEffect(() => {
    if (zoomPan.zoomedIn) containerRef.current?.scrollTo(0, 0);
  }, [zoomPan.zoomedIn]);

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
      if (chromePinnedRef.current || e.defaultPrevented) return; // dismiss overlays before closing reader
      if (e.key === "ArrowLeft")  { next(); nudgeFocusTimer(); }
      else if (e.key === "ArrowRight") { prev(); nudgeFocusTimer(); }
      else if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [next, prev, handleClose, nudgeFocusTimer]);

  const retry = useCallback(() => startLoad(page), [page, startLoad]);

  // Fit the measured viewport, never the content stage (which can grow).
  const fit = computeMushafPageFit(size.w, size.h);
  const pageW = fit.w;
  const pageH = fit.h;
  const pageReady = status === "ok" && data !== null && data.p === page;
  // A mixed page has more than one real Surah (e.g. 554: Al-Jumu'ah + Al-Munafiqun).
  const surahName = pageReady
    ? [...new Set(data.v.map(verse => verse.c))].map(surahOfChapter).join(" · ")
    : "";
  const surahNumber = pageReady && data.v[0] ? data.v[0].c : null;
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
        const last = loadLastListen(storageUserKey);
        const track = last && pageOfAyah(last.surahId, last.ayahNum) === data.p
          ? last
          : { surahId: data.v[0].c, ayahNum: data.v[0].n };
        audio.playFrom(track.surahId, track.ayahNum);
      }
      return !v;
    });
  }, [data, audio, storageUserKey]);

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
    setLiveReveal({ revealedWords: new Map(), currentWord: null, wordStates: new Map() });
    setAiSummary(null);
    setStrictHoldActive(false);
    setPopover(null);
    setAiWeakest([]);
    tashkeelMonitorRef.current = new TashkeelEvidenceMonitor();
    setTashkeelLevel("unknown");
    falseFlagCountRef.current = 0;
    reconnectAttemptsRef.current = 0;
    reconnectCountRef.current = 0;
    peekedRef.current = new Set();
    peekLevelRef.current = null;
    setLiveLatency(EMPTY_LIVE_LATENCY);
    setMatcherDiagnostics(EMPTY_MATCHER_DIAGNOSTICS);
    matcherCountersRef.current = { matches: 0, reveals: 0, noMatches: 0 };
    setMatcherActivity({ lastMatchAt: null, lastRevealAt: null });
    latencySamplesRef.current = { matcher: new RollingSamples(), render: new RollingSamples(), total: new RollingSamples() };
    appendedMatcherPagesRef.current = new Set([page]);
    pendingAutoFollowPageRef.current = null;
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
    const matcherForEngine = matcherRef.current;
    engineRef.current = new RecitationStateEngine({
      strict: aiOptionsRef.current.strict,
      wordAt: (index) => matcherForEngine.wordAt(index),
    });
    confirmedEventProjectorRef.current.reset();
    if (options.mode === "general" && options.startVerseKey) {
      const positioned = matcherRef.current.setStartPosition({
        verseKey: options.startVerseKey,
        wordPosition: options.startWordPosition,
      });
      if (positioned) engineRef.current.setStart(matcherRef.current.committedIndex());
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
    aiOptions?: RecitationAiOptions,
  ) => runSessionAction(startFlightRef, async () => {
    traceAi("MUSHAF_START_CLICKED");
    if (endFlightRef.current) return false;
    // استجابة بصرية فورية (< 100ms) قبل أي رحلة شبكة.
    setStartingRecitation(true);
    setLaunchError(null);
    aiOptionsRef.current = aiOptions ?? loadRecitationAiOptions(storageUserKey);
    setStrictLive(aiOptionsRef.current.strict);
    setTashkeelLive(aiOptionsRef.current.tashkeel ?? false);
    // تهيئة اختيارية داخل user gesture؛ لا يُشغّل cue قبل نجاح إنشاء الجلسة.
    cuePlayerRef.current?.prepare();
    let sessionId: string;
    try {
      sessionId = await rec.startSession(request, hideMode);
    } catch {
      setStartingRecitation(false);
      setLaunchError("تعذّر بدء الجلسة — تحقق من الاتصال ثم أعد المحاولة");
      traceAi("RECITATION_SESSION_START_FAILED");
      return false;
    }
    setStartingRecitation(false);
    traceAi("RECITATION_SESSION_READY", { hasSessionId: Boolean(sessionId), mode: request.mode });
    // Server session creation is not provider READY; stay silent until listening.
    feedbackRef.current?.begin(sessionId);
    if (aiCanaryAvailable) {
      setAiPreparing(true);
      try {
        await prepareLiveMatcher(request.localRange, {
          mode: request.mode,
          sessionId,
          startVerseKey: request.mode === "general" ? request.startContext.startVerseKey : undefined,
          startWordPosition: request.mode === "general" ? request.startContext.startWordPosition : undefined,
        });
        setAiPreparing(false);
        return await startAiForSession(sessionId);
      } catch {
        matcherRef.current = null;
        setAiRevealActive(false);
        traceAi("QURAN_MATCHER_PREPARE_FAILED");
        return false;
      } finally {
        setAiPreparing(false);
      }
    }
    traceAi("AI_REALTIME_SKIPPED", { reason: "feature_disabled_or_not_ready" });
    return false;
  }), [aiCanaryAvailable, prepareLiveMatcher, rec.startSession, startAiForSession]);

  /** بدء من ورقة الإعداد؛ جلسة الواجب تسميع لا متابعة، وتعرض بوضع الواجب. */
  const startFromSetup = useCallback((
    request: RecitationStartRequest,
    hideMode: HideMode,
    aiOptions?: RecitationAiOptions,
  ) => {
    if (request.mode === "educational") {
      setFollowMode(false);
      setSessionHidden(hideMode !== "visible_review");
      setSessionHideMarkers(false);
      setAssignmentSubmission(null);
    }
    return startRecitationWithAi(request, hideMode, aiOptions);
  }, [startRecitationWithAi]);

  // فتح القارئ من واجب: تظهر ورقة الواجب مرة واحدة بعد جاهزية التسميع.
  const assignmentSetupShownRef = useRef<string | null>(null);
  useEffect(() => {
    if (!assignment || !rec.enabled || rec.phase !== "idle") return;
    if (assignmentSetupShownRef.current === assignment.id) return;
    assignmentSetupShownRef.current = assignment.id;
    rec.openSetup();
  }, [assignment, rec.enabled, rec.phase, rec.openSetup]);

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

  /** كشف الـ matcher + كلمات التلميح + حالات المحرك في تحديث React واحد. */
  const publishLiveReveal = useCallback((
    revealed: Map<string, number>,
    current: CanonicalQuranWord | null,
    rewound: boolean,
  ) => {
    const matcher = matcherRef.current;
    const engine = engineRef.current;
    const revealedWords = rewound && matcher ? matcher.revealedSnapshot() : new Map(revealed);
    if (matcher) {
      for (const index of peekedRef.current) {
        const word = matcher.wordAt(index);
        if (word) revealedWords.set(word.verseKey, Math.max(revealedWords.get(word.verseKey) ?? 0, word.position));
      }
    }
    const wordStates = new Map<string, WordFeedbackState>();
    if (engine) {
      for (const [key, state] of engine.visibleStates(true)) {
        if (state === "HEARD_PENDING" || state === "CORRECT" || state === "POSSIBLE_ERROR" || state === "CONFIRMED_ERROR" || state === "CORRECTED" || state === "PEEKED" || state === "SKIPPED") {
          wordStates.set(key, state);
        }
      }
    }
    const currentWord = rewound && matcher ? matcher.wordAt(matcher.committedIndex() - 1) : current;
    setLiveReveal({ revealedWords, currentWord, wordStates });
  }, []);

  /**
   * تلميح متدرّج: نقرة = الكلمة التالية، نقرة ثانية خلال 4 ثوانٍ = عدة كلمات،
   * ثالثة = بقية الآية. يُسجَّل PEEK ولا يُعدّ خطأ.
   */
  const peekNext = useCallback(() => {
    const engine = engineRef.current;
    const matcher = matcherRef.current;
    if (!engine || !matcher) return;
    const now = performance.now();
    const previous = peekLevelRef.current;
    const level = (previous && now - previous.at < 4_000 ? Math.min(3, previous.level + 1) : 1) as 1 | 2 | 3;
    peekLevelRef.current = { level, at: now };
    for (const index of engine.peek(level)) peekedRef.current.add(index);
    traceAi("RECITATION_PEEK", { level });
    publishLiveReveal(matcher.revealedSnapshot(), matcher.wordAt(matcher.committedIndex() - 1), false);
  }, [publishLiveReveal]);

  const handleTranscript = useCallback((event: TranscriptEvent) => {
    const isTarteelTrial = import.meta.env.DEV && event.itemId.startsWith("tarteel-");
    const decodeSequence = /^tarteel-(\d+)-/.exec(event.itemId)?.[1] ?? null;
    const normalizedTranscript = isTarteelTrial ? normalizeQuranText(event.text) : null;
    if (isTarteelTrial) {
      traceAi("TARTEEL_MATCHER_INPUT", {
        sequence: decodeSequence === null ? null : Number(decodeSequence),
        providerUtteranceId: event.itemId,
        matcherInput: event.text,
        normalizedMatcherInput: normalizedTranscript,
        isFinal: event.isFinal,
        eligibleForMatcher: rec.phase === "active" && matcherRef.current !== null,
      });
    }
    if (rec.phase !== "active" || !matcherRef.current) return;
    const matcher = matcherRef.current;
    live.markPipelineMilestone("matcherStartMs");
    const match = matcher.feed(event);
    live.markPipelineMilestone("matcherEndMs");
    if (event.isFinal && aiOptionsRef.current.tashkeel) {
      // تجريبي: يقيس فقط هل يعيد المزوّد تشكيلاً أصلاً؛ لا يعلّم أي كلمة.
      tashkeelMonitorRef.current.observe(event.text);
      const level = tashkeelMonitorRef.current.level;
      if (level !== tashkeelLevelRef.current) { tashkeelLevelRef.current = level; setTashkeelLevel(level); }
    }
    const engine = engineRef.current;
    // جودة صوت غير موثوقة: المتابعة مستمرة، لكن لا يُؤكَّد أي خطأ اعتماداً عليها.
    // متابعة قارئ: الموضع فقط، بلا محرك أخطاء (القارئ ليس المستخدم).
    const engineUpdate = engine && !followModeRef.current ? engine.apply(match, {
      audioReliable: live.isAudioReliable(),
      confirmationEligible: event.confirmationEligible,
    }) : null;
    if (engine && engineUpdate) {
      const confirmedEvents = confirmedEventProjectorRef.current.project(
        engine.eventLog(),
        (index) => matcher.wordAt(index),
      );
      feedbackRef.current?.observeConfirmed(confirmedEvents);
      feedbackRef.current?.observeProgress(engineUpdate.changed, {
        stateAt: (index) => engine.stateAt(index),
        wordAt: (index) => matcher.wordAt(index),
      });
    }
    const holding = engine?.strictHoldAt != null;
    if (holding !== strictHoldRef.current) {
      strictHoldRef.current = holding;
      setStrictHoldActive(holding);
    }
    const rewound = engineUpdate?.rewindTo != null && matcher.rewindTo(engineUpdate.rewindTo);
    if (rewound) traceAi("STRICT_CORRECTION_HOLD", { rewindTo: engineUpdate?.rewindTo ?? null });
    const now = performance.now();
    const matched = match.diagnostics.matcherMatchCount > matcherCountersRef.current.matches;
    const revealed = match.diagnostics.committedRevealCount > matcherCountersRef.current.reveals;
    const unmatched = match.diagnostics.matcherNoMatchCount > matcherCountersRef.current.noMatches;
    matcherCountersRef.current = {
      matches: match.diagnostics.matcherMatchCount,
      reveals: match.diagnostics.committedRevealCount,
      noMatches: match.diagnostics.matcherNoMatchCount,
    };
    if (isTarteelTrial) {
      const committedIndex = matcher.committedIndex();
      const committedWord = committedIndex > 0 ? matcher.wordAt(committedIndex - 1) : null;
      traceAi("TARTEEL_MATCHER_RESULT", {
        sequence: decodeSequence === null ? null : Number(decodeSequence),
        outcome: unmatched ? "no_match" : matched ? "match" : "no_new_match",
        stable: match.stable,
        mode: match.mode,
        confidence: Math.round(match.confidence * 100),
        current: match.current ? {
          verseKey: match.current.verseKey,
          wordPosition: match.current.position,
          page: match.current.page,
          surah: match.current.surah,
        } : null,
        committedIndex,
        committedCanonicalPosition: committedWord ? {
          verseKey: committedWord.verseKey,
          wordPosition: committedWord.position,
          page: committedWord.page,
          surah: committedWord.surah,
        } : null,
        diagnostics: {
          matcherMatchCount: match.diagnostics.matcherMatchCount,
          matcherNoMatchCount: match.diagnostics.matcherNoMatchCount,
          recoveryEntries: match.diagnostics.recoveryModeEntries,
          recoverySuccesses: match.diagnostics.recoverySuccesses,
          backtracks: match.diagnostics.backtracks,
        },
      });
    }
    // تشخيص التطوير يُجمع ويُرسم مرة لكل frame على الأكثر، لا مع كل delta.
    const pending = diagnosticsFlushRef.current;
    pending.diagnostics = match.diagnostics;
    if (matched) pending.lastMatchAt = now;
    if (revealed) pending.lastRevealAt = now;
    if (pending.frame === null) {
      pending.frame = requestAnimationFrame(() => {
        const flush = diagnosticsFlushRef.current;
        flush.frame = null;
        if (flush.diagnostics) setMatcherDiagnostics(flush.diagnostics);
        if (flush.lastMatchAt !== null || flush.lastRevealAt !== null) {
          const { lastMatchAt, lastRevealAt } = flush;
          setMatcherActivity((previous) => ({
            lastMatchAt: lastMatchAt ?? previous.lastMatchAt,
            lastRevealAt: lastRevealAt ?? previous.lastRevealAt,
          }));
        }
        flush.lastMatchAt = null;
        flush.lastRevealAt = null;
      });
    }
    if (!match.stable) {
      // انتقال حالة (خطأ محتمل→مصحَّح بإعادة القراءة) قد يصل دون التزام جديد.
      if (engineUpdate?.changed.length || rewound) {
        publishLiveReveal(match.revealedWords, match.current, rewound);
        requestAnimationFrame(() => {
          live.markPipelineMilestone("uiCommitMs");
          if (event.audioChunkSentAt !== undefined) {
            live.markPipelineMilestone("totalFeedbackMs", event.audioChunkSentAt);
          }
        });
      }
      return;
    }
    const matcherFinishedAt = performance.now();
    const matcherLatency = Math.max(0, matcherFinishedAt - (event.clientReceivedAt ?? event.receivedAt));
    latencySamplesRef.current.matcher.push(matcherLatency);
    publishLiveReveal(match.revealedWords, match.current, rewound);
    test.onCommitted(match.committedIndex);
    const renderScheduledAt = performance.now();
    const renderedWord = match.current;
    requestAnimationFrame(() => {
      const wordVisibleAt = performance.now();
      live.markPipelineMilestone("uiCommitMs");
      if (event.audioChunkSentAt !== undefined) {
        live.markPipelineMilestone("totalFeedbackMs", event.audioChunkSentAt);
      }
      const renderLatency = Math.max(0, wordVisibleAt - renderScheduledAt);
      latencySamplesRef.current.render.push(renderLatency);
      if (event.audioChunkSentAt !== undefined) {
        latencySamplesRef.current.total.push(Math.max(0, wordVisibleAt - event.audioChunkSentAt));
      }
      const sample = latencySamplesRef.current;
      setLiveLatency({
        matcherP50Ms: sample.matcher.percentile(0.5),
        matcherP95Ms: sample.matcher.percentile(0.95),
        matcherMaxMs: sample.matcher.max(),
        renderP50Ms: sample.render.percentile(0.5),
        renderP95Ms: sample.render.percentile(0.95),
        // wordVisibleAt يقيس أول frame بعد تحديث DOM؛ اكتمال opacity يحتاج 220ms إضافية.
        visualCompletionP50Ms: (sample.render.percentile(0.5) ?? 0) + 220,
        // يُقاس من آخر كتلة صوت أُرسلت قبل الحدث، لا من لحظة نطق الكلمة؛
        // المزود لا يعيد طوابع كلمات، فالكمون الكلامي الحقيقي غير قابل للقياس هنا.
        totalP50Ms: sample.total.percentile(0.5),
        totalP95Ms: sample.total.percentile(0.95),
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

    // GENERAL يتبع موضع القرآن الكنسي المستقر. corpus يبقى بنفس matcher
    // والجلسة عند تغيير الصفحة؛ لا نشترط إكمال ذيل الصفحة الظاهرة.
    if (rec.mode === "general" && match.current) {
      const currentWord = match.current;
      const matchedPage = currentWord.page;
      const followTarget = getGeneralRecitationFollowTarget(page, matchedPage);
      if (followTarget !== null && pendingAutoFollowPageRef.current !== followTarget) {
        pendingAutoFollowPageRef.current = followTarget;
        navDir.current = "next";
        traceAi("QURAN_POSITION_FOLLOW", {
          visiblePage: page,
          matchedPage: followTarget,
          stableVerseKey: currentWord.verseKey,
          stableWordPosition: currentWord.position,
          matchedSurah: currentWord.surah,
          pageNavigationReason: "stable_canonical_position",
          pageTransitionStartedAt: Date.now(),
          confidence: Math.round(match.confidence * 100),
        });
        onNavigate(followTarget);
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
    test.onCommitted,
    live.isAudioReliable,
    live.markPipelineMilestone,
    onNavigate,
    page,
    publishLiveReveal,
    rec.mode,
    rec.phase,
    rec.setCurrentPosition,
  ]);

  // اشتراك واحد ثابت؛ المرجع يشير دائماً لأحدث معالج بقيم الصفحة/الجلسة الحالية.
  const handleTranscriptRef = useRef(handleTranscript);
  handleTranscriptRef.current = handleTranscript;
  useEffect(() => live.subscribe((event) => handleTranscriptRef.current(event)), [live.subscribe]);
  useEffect(() => () => {
    const frame = diagnosticsFlushRef.current.frame;
    if (frame !== null) cancelAnimationFrame(frame);
  }, []);

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
      engineRef.current = null;
      matcherSessionIdRef.current = null;
      setAiRevealActive(false);
      setLiveReveal({ revealedWords: new Map(), currentWord: null, wordStates: new Map() });
    }
  }, [live.cancel, live.state, sessionActive]);

  useEffect(() => () => live.cancel(), [live.cancel]);

  const endRecitationWithAi = useCallback(() => {
    const isTarteelTrial = import.meta.env.DEV && live.diagnostics.asrProvider === "tarteel";
    if (isTarteelTrial) {
      traceAi("TARTEEL_END_TAP", {
        actionInFlight: endFlightRef.current !== null,
        phase: rec.phase,
      });
    }
    return runSessionAction(endFlightRef, async () => {
    if (isTarteelTrial) traceAi("TARTEEL_END_ACTION_STARTED");
    const serverSessionId = rec.sessionId ?? undefined;
    if (!serverSessionId || !["active", "paused"].includes(rec.phase)) return;
    const durationSec = rec.elapsedSecs;
    const endedNormally = cleanlyClosedSessionRef.current === serverSessionId
      || (aiCanaryAvailable ? await live.stop() : false);
    if (isTarteelTrial) traceAi("TARTEEL_LIVE_STOP_RESULT", { endedNormally });
    if (aiCanaryAvailable && !endedNormally) {
      feedbackRef.current?.providerFailed();
      return;
    }
    if (endedNormally) cleanlyClosedSessionRef.current = serverSessionId;
    const engine = engineRef.current;
    const matcher = matcherRef.current;
    // واجب التسميع: النتيجة تُحسب هنا من المحرك نفسه وتُسلَّم بعد تأكيد إنهاء الجلسة.
    const assignmentRange = rec.mode === "educational" && assignment ? assignment : null;
    let assignmentPayload: AssignmentResultPayload | null = null;
    if (assignmentRange) setAssignmentSubmission(null);
    const saved = await rec.endSession(async () => {
    if (engine) {
      // انحرافات لم تتأكد تُصنَّف unconfirmed ولا تُحتسب أخطاء في الملخص.
      engine.finalize();
      const summary = engine.summary();
      setAiSummary(summary);
      setAiWeakest(engine.weakestAyahs(3));
      if (assignmentRange && matcher) {
        assignmentPayload = buildAssignmentResult(
          collectRangeWords((index) => matcher.wordAt(index), engine, assignmentRange),
          summary.wordsHeard,
        );
      }
      // الاختبار يسجّل نفسه عند انتهائه؛ هنا التلاوة/الحفظ فقط. لا صوت ولا نص.
      if (historyStore && !testActiveRef.current && !followModeRef.current && summary.wordsHeard > 0) {
        const ayahs = engine.ayahResults();
        const keys = ayahs.map((a) => a.verseKey).sort((a, b) => {
          const [sa, aa] = a.split(":").map(Number); const [sb, ab] = b.split(":").map(Number);
          return sa - sb || aa - ab;
        });
        const [firstSurah] = (keys[0] ?? "1:1").split(":").map(Number);
        historyStore.record({
          session: {
            at: Date.now(), serverSessionId, durationSec,
            mode: sessionHiddenRef.current ? "hifz" : "tilawa",
            scopeLabel: SURAHS[firstSurah - 1]?.name ?? "",
            firstVerseKey: keys[0] ?? null, lastVerseKey: keys.at(-1) ?? null,
            words: summary.wordsHeard, confirmed: summary.confirmedMistakes, corrected: summary.correctedMistakes,
            peeks: summary.peeks, accuracy: summary.accuracyPercent,
          },
          mistakes: engine.mistakeRecords(),
          ayahs,
        });
        refreshHistory();
      }
    }
    setPopover(null);
    await feedbackRef.current?.complete(endedNormally);
    if (isTarteelTrial) traceAi("TARTEEL_END_FEEDBACK_COMPLETED", { completed: endedNormally });
    });
    if (isTarteelTrial) traceAi("TARTEEL_RECITATION_END_RESULT", { saved });
    if (saved) cleanlyClosedSessionRef.current = null;
    if (saved && assignmentRange) {
      const payload = assignmentPayload as AssignmentResultPayload | null;
      if (!payload) {
        setAssignmentSubmission({ status: "unavailable", sessionId: serverSessionId, payload: null });
      } else if (payload.wordsRecited === 0) {
        setAssignmentSubmission({ status: "empty", sessionId: serverSessionId, payload });
      } else {
        await sendAssignmentResult(serverSessionId, payload);
      }
    }
    });
  }, [aiCanaryAvailable, assignment, historyStore, live.diagnostics.asrProvider, live.state, live.stop, rec, refreshHistory, sendAssignmentResult]);

  const cancelRecitationWithAi = useCallback(() => {
    feedbackRef.current?.complete(false);
    setAiSummary(null);
    live.cancel();
    rec.cancelSession();
  }, [live.cancel, rec]);

  // ── إعادة الاتصال التلقائية (Part 13: RECONNECTING) ─────────────────────
  // فقط لانقطاع نقل عابر أثناء جلسة نشطة؛ الـ matcher والمحرك يبقيان كما هما
  // فيُستأنف التتبع من الموضع الملتزم نفسه. رفض الميكروفون/الخادم لا يُعاد.
  // `reconnecting` ليس من الاعتماديات: setReconnecting(true) كان يعيد تشغيل
  // التأثير فيلغي مؤقّته ويستهلك محاولة، وعند بلوغ الحد يبقى «يعيد الاتصال» عالقاً.
  useEffect(() => {
    if (live.state === "listening") {
      setReconnecting(false);
      reconnectAttemptsRef.current = 0;
      return;
    }
    if (live.state !== "failed" || !rec.sessionId) {
      // A reconnect in flight shows as connecting; anything else ends it.
      if (live.state === "idle" || !rec.sessionId) setReconnecting(false);
      return;
    }
    if (
      reconnectCountRef.current >= 3 // Total cap per logical session, not just a retry burst.
      // Audio-file QA is opt-in and must not silently switch back to the mic.
      || live.diagnostics.audioSource === "audio-file"
      || !shouldAutoReconnect(live.failure, reconnectAttemptsRef.current, rec.phase)
    ) {
      setReconnecting(false);
      return;
    }
    const attempt = reconnectAttemptsRef.current;
    reconnectAttemptsRef.current += 1;
    reconnectCountRef.current += 1;
    setReconnecting(true);
    traceAi("AI_RECONNECT_SCHEDULED", { attempt: attempt + 1, reconnectCount: reconnectCountRef.current });
    const sessionId = rec.sessionId;
    const timer = window.setTimeout(() => { void live.start(sessionId); }, RECONNECT_DELAYS_MS[attempt]);
    return () => window.clearTimeout(timer);
  }, [live.diagnostics.audioSource, live.failure, live.start, live.state, rec.phase, rec.sessionId]);

  const retryAi = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    setReconnecting(false);
    void startAi();
  }, [startAi]);

  const runAudioFileTest = useCallback(async (file: File) => {
    if (rec.phase !== "active" || !rec.sessionId) {
      throw new Error("ابدأ جلسة تسميع نشطة قبل اختبار الملف");
    }
    const connected = await live.start(rec.sessionId, "audio-file");
    if (!connected) throw new Error("تعذر فتح اتصال المزوّد لجلسة الاختبار");
    return live.injectAudioFile(file);
  }, [live.injectAudioFile, live.start, rec.phase, rec.sessionId]);

  const setStrictMode = useCallback((strict: boolean) => {
    aiOptionsRef.current = { ...aiOptionsRef.current, strict };
    saveRecitationAiOptions(aiOptionsRef.current, storageUserKey);
    engineRef.current?.setStrict(strict);
    setStrictLive(strict);
    if (!strict) { strictHoldRef.current = false; setStrictHoldActive(false); }
  }, []);

  const aiPhase = deriveAiPhase({
    recitation: rec.phase,
    transport: live.state,
    preparing: aiPreparing || startingRecitation,
    reconnecting,
    aiEnabled: aiCanaryAvailable,
  });
  const liveQualityMessage = aiPhase !== "LISTENING"
    ? null
    : live.audioQuality.issue
      ? AUDIO_QUALITY_MESSAGES[live.audioQuality.issue]
      : live.diagnostics.providerStalledDuringActiveSpeech
        ? "استجابة التفريغ متأخرة أثناء الكلام؛ قد يكون الاتصال ضعيفًا"
        : null;

  const pauseRecitationWithCue = useCallback(async () => {
    if (await rec.pause()) void cuePlayerRef.current?.playCue("pause");
  }, [rec.pause]);

  const resumeRecitationWithCue = useCallback(async () => {
    // إعادة الاستماع لآية أثناء الإيقاف لا تبقى تعمل فيلتقطها الميكروفون.
    audio.pause();
    setPopover(null);
    if (await rec.resume()) void cuePlayerRef.current?.playCue("resume");
  }, [audio, rec.resume]);

  // ── نافذة الكلمة المعلَّمة (Part 49) ──────────────────────────────────────
  wordTapRef.current = () => {
    const point = lastPointerRef.current;
    const matcher = matcherRef.current;
    const engine = engineRef.current;
    if (!point || !matcher || !engine || !sessionActive) return false;
    const target = document.elementFromPoint(point.x, point.y);
    const span = target instanceof Element ? target.closest("[data-verse][data-pos]") : null;
    if (!span || span.getAttribute("data-type") !== "0") return false;
    const verseKey = span.getAttribute("data-verse")!;
    const position = Number(span.getAttribute("data-pos"));
    const shown = liveReveal.wordStates.get(`${verseKey}:${position}`);
    if (!shown || shown === "CORRECT") return false;
    const index = matcher.indexOfWord(verseKey, position);
    const word = index >= 0 ? matcher.wordAt(index) : null;
    if (!word) return false;
    setPopover({
      index,
      verseKey,
      position,
      expectedText: word.displayText,
      state: engine.stateAt(index),
      kind: (engine.mistakeAt(index)?.kind as MistakePopoverData["kind"]) ?? null,
      x: point.x,
      y: point.y,
    });
    return true;
  };

  const dismissMistake = useCallback((index: number) => {
    const engine = engineRef.current;
    const matcher = matcherRef.current;
    if (!engine || !matcher || !engine.dismissMistake(index)) return;
    // مقياس داخلي للإيجابيات الكاذبة (Part 42) — عدد فقط، بلا نص.
    falseFlagCountRef.current += 1;
    traceAi("MISTAKE_DISMISSED_BY_USER", { falseFlagCount: falseFlagCountRef.current });
    if (strictHoldRef.current && engine.strictHoldAt === null) { strictHoldRef.current = false; setStrictHoldActive(false); }
    publishLiveReveal(matcher.revealedSnapshot(), matcher.wordAt(matcher.committedIndex() - 1), false);
  }, [publishLiveReveal]);

  const setTashkeelMode = useCallback((enabled: boolean) => {
    aiOptionsRef.current = { ...aiOptionsRef.current, tashkeel: enabled };
    saveRecitationAiOptions(aiOptionsRef.current, storageUserKey);
    setTashkeelLive(enabled);
  }, []);

  // ── ربط مشغّل «اختبار الحفظ» بالقارئ (يُحدَّث كل رسم؛ الوكيل ثابت) ────────
  testDepsRef.current = {
    aiEnabled: aiCanaryAvailable && rec.enabled,
    navigate: (target) => {
      if (target !== page) navDir.current = target > page ? "next" : "prev";
      onNavigate(target);
    },
    installQuestionMatcher: (words, startIndex) => {
      const matcher = new QuranLiveMatcher(words.slice(), { generalPositionFollowing: true, ignoreOptionalBasmala: true });
      const start = words[startIndex];
      matcher.setStartPosition({ verseKey: start.verseKey, wordPosition: start.position });
      const engine = new RecitationStateEngine({ strict: aiOptionsRef.current.strict, wordAt: (index) => matcher.wordAt(index) });
      engine.setStart(matcher.committedIndex());
      matcherRef.current = matcher;
      engineRef.current = engine;
      for (const word of words) {
        const list = canonicalPagesRef.current.get(word.page) ?? [];
        if (!list.length) canonicalPagesRef.current.set(word.page, words.filter((w) => w.page === word.page));
      }
      appendedMatcherPagesRef.current = new Set(words.map((w) => w.page));
      peekedRef.current = new Set();
      peekLevelRef.current = null;
      strictHoldRef.current = false;
      setStrictHoldActive(false);
      setAiRevealActive(true);
      setLiveReveal({ revealedWords: new Map(), currentWord: null, wordStates: new Map() });
    },
    startAi: async (startPage, startVerseKey) => {
      const [surahId, ayah] = startVerseKey.split(":").map(Number);
      const surah = SURAHS[surahId - 1];
      if (!surah) return false;
      setFollowMode(false);
      setSessionHidden(true);
      setSessionHideMarkers(hideMarkersPref);
      return startRecitationWithAi({
        mode: "general",
        localRange: { surahId, surahName: surah.name, startAyah: ayah, endAyah: surah.ayahs },
        startContext: { startPage, startVerseKey },
      }, "progressive_reveal");
    },
    stopAi: async (save) => {
      if (save) await endRecitationWithAi();
      else cancelRecitationWithAi();
    },
    peekAi: (indices) => {
      const engine = engineRef.current, matcher = matcherRef.current;
      if (!engine || !matcher) return;
      for (const index of engine.peekIndices(indices)) peekedRef.current.add(index);
      traceAi("TEST_HINT", { wordCount: indices.length });
      publishLiveReveal(matcher.revealedSnapshot(), matcher.wordAt(matcher.committedIndex() - 1), false);
    },
    committedIndex: () => matcherRef.current?.committedIndex() ?? 0,
    engineStats: () => {
      const summary = engineRef.current?.summary();
      return { confirmed: summary?.confirmedMistakes ?? 0, corrected: summary?.correctedMistakes ?? 0, peeks: summary?.peeks ?? 0 };
    },
    onQuestionComplete: (result: QuestionResult) => {
      // AI completion is handled by the provider-aware lifecycle, never by a
      // skipped question or failed provider. Manual grading has its own cue.
      if (test.state?.mode !== "ai" && test.state?.settings.sound && result.outcome !== "skipped") {
        void cuePlayerRef.current?.playCue("ayah");
      }
      const runtime = test.state?.runtime;
      const record = testRecordRef.current;
      if (!runtime || result.outcome === "skipped") return;
      if (test.state?.mode === "ai" && engineRef.current) {
        const engine = engineRef.current;
        engine.finalize();
        record.ayahs.push(...engine.ayahResults());
        record.mistakes.push(...engine.mistakeRecords());
        record.words += engine.summary().wordsHeard;
      } else {
        // تقييم ذاتي: نتيجة مراجعة صريحة لكل آية في السؤال، بلا اختلاق أخطاء كلمات.
        const keys = [...new Set(runtime.words.slice(runtime.cueIndex, runtime.endIndex).map((w) => w.verseKey))];
        const selfReported = result.outcome === "self_wrong" ? "failed" as const : result.outcome === "self_correct" ? "success" as const : undefined;
        keys.forEach((verseKey, i) => record.ayahs.push({
          verseKey, correctWords: 0, confirmed: 0, corrected: 0, peeks: i === 0 ? result.peeks : 0, selfReported,
        }));
        record.words += result.hiddenWords;
      }
    },
    onFinished: (finished) => {
      const record = testRecordRef.current;
      testRecordRef.current = { ayahs: [], mistakes: [], words: 0 };
      if (!historyStore || finished.settings.temporary || !finished.results.some((r) => r.outcome !== "skipped")) return;
      const keys = finished.questions.map((q) => q.start.verseKey);
      historyStore.record({
        session: {
          at: Date.now(), durationSec: Math.round((Date.now() - finished.startedAt) / 1000), mode: "test",
          scopeLabel: finished.scopeLabel, firstVerseKey: keys[0] ?? null, lastVerseKey: keys.at(-1) ?? null,
          words: record.words,
          confirmed: finished.results.reduce((n, r) => n + r.confirmedMistakes, 0),
          corrected: finished.results.reduce((n, r) => n + r.correctedMistakes, 0),
          peeks: finished.results.reduce((n, r) => n + r.peeks, 0),
          accuracy: null, testScore: finished.summary?.scorePercent ?? null,
        },
        mistakes: record.mistakes,
        ayahs: record.ayahs,
      });
      refreshHistory();
    },
  };

  // ── «ابحث بالتلاوة» ────────────────────────────────────────────────────────
  const runVoiceSearch = useCallback(async (final: boolean) => {
    const text = [...voiceTextRef.current.finals, ...voiceTextRef.current.partials.values()].join(" ");
    try {
      const index = await loadQuranSearchIndex();
      const results = searchQuran(index, text, { limit: 8, openLast: !final });
      setVoiceSearch((state) => (state.phase === "idle" ? state : { ...state, results }));
    } catch {
      setVoiceSearch({ phase: "error", results: [], error: "تعذّر تحميل فهرس البحث" });
    }
  }, []);

  const stopVoiceSearch = useCallback(async () => {
    if (!voiceSearchActiveRef.current) return;
    setVoiceSearch((state) => ({ ...state, phase: "searching" }));
    if (live.state === "listening") await live.stop();
    else live.cancel();
    voiceSearchActiveRef.current = false;
    // الجلسة وُجدت لتفريغ البحث فقط: تُلغى فلا تُحفظ كجلسة تسميع.
    rec.cancelSession();
    await runVoiceSearch(true);
    setVoiceSearch((state) => ({ ...state, phase: "done" }));
  }, [live, rec, runVoiceSearch]);

  const startVoiceSearch = useCallback(async () => {
    if (!pageReady || !data || sessionActive) return;
    const localRange = localRangeForPage(data);
    if (!localRange) return;
    if (showAudio) { audio.pause(); setShowAudio(false); }
    voiceTextRef.current = { finals: [], partials: new Map(), lastSearchAt: 0 };
    setVoiceSearch({ phase: "starting", results: [] });
    void loadQuranSearchIndex().catch(() => {});
    let sessionId: string;
    try {
      sessionId = await rec.startSession({ mode: "general", localRange, startContext: { startPage: page } }, "visible_review");
    } catch {
      setVoiceSearch({ phase: "error", results: [], error: "تعذّر بدء الاستماع — تحقق من الاتصال" });
      return;
    }
    voiceSearchActiveRef.current = true;
    const started = await live.start(sessionId);
    if (!started) {
      voiceSearchActiveRef.current = false;
      rec.cancelSession();
      setVoiceSearch({ phase: "error", results: [], error: "تعذّر الوصول إلى الميكروفون أو خدمة التعرف" });
      return;
    }
    setVoiceSearch({ phase: "listening", results: [] });
  }, [audio, data, live, page, pageReady, rec, sessionActive, showAudio]);

  // تفريغ البحث: نتائج حية مخففة (كل ~٤٠٠ms) وإيقاف تلقائي بعد ١٢ ثانية.
  useEffect(() => live.subscribe((event) => {
    if (!voiceSearchActiveRef.current) return;
    const store = voiceTextRef.current;
    if (event.isFinal) { store.partials.delete(event.itemId); store.finals.push(event.text); }
    else store.partials.set(event.itemId, event.text);
    const now = performance.now();
    if (event.isFinal || now - store.lastSearchAt > 400) {
      store.lastSearchAt = now;
      void runVoiceSearch(false);
    }
  }), [live.subscribe, runVoiceSearch]);
  useEffect(() => {
    if (voiceSearch.phase !== "listening") return;
    const timer = window.setTimeout(() => { void stopVoiceSearch(); }, 12_000);
    return () => window.clearTimeout(timer);
  }, [stopVoiceSearch, voiceSearch.phase]);

  const openHistory = (tab: HistoryTab = "review", verseKey: string | null = null) => {
    refreshHistory();
    setHistoryInit({ tab, verseKey });
    setAyahMenu(null);
    openSheet("history");
  };

  // ── الضغط المطوّل على آية (§27) ─────────────────────────────────────────
  // مستمعون مستقلون عن useZoomPan: نقرة zoomPan تتطلب < 400ms فلا تداخل.
  // يُلغى عند الحركة (> 10px)، تعدد الأصابع، أو رفع الإصبع قبل 550ms.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let startX = 0, startY = 0;
    const pointers = new Set<number>();

    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };

    const onDown = (e: PointerEvent) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      pointers.add(e.pointerId);
      if (pointers.size > 1 || !e.isPrimary) { cancel(); return; }
      // لا قائمة أثناء جلسة تسميع نشطة أو sheet مفتوح أو تكبير
      if (sessionActiveRef.current || chromePinnedRef.current || testActiveRef.current) return;
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
    // The new sheet may take the release: observe it globally, not just on the
    // original viewport, or every later hold is mistaken for a second finger.
    const onUp = (event: PointerEvent) => {
      if (pointers.delete(event.pointerId)) cancel();
    };
    const onBlur = () => { pointers.clear(); cancel(); };
    // منع قائمة السياق الأصلية للمتصفح على أجهزة اللمس (long-press ينشئ contextmenu)
    const onCtx = (e: Event) => {
      const t = e.target;
      if (t instanceof Element && t.closest("[data-verse]")) e.preventDefault();
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onUp, true);
    window.addEventListener("blur", onBlur);
    el.addEventListener("contextmenu", onCtx);
    return () => {
      cancel();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
      window.removeEventListener("blur", onBlur);
      el.removeEventListener("contextmenu", onCtx);
    };
  }, []);

  // إجراءات قائمة الآية
  const reciteFromAyah = useCallback((surahId: number, ayahNum: number) => {
    setFollowMode(false);
    setSessionHidden(false);
    setSessionHideMarkers(false);
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
    const last = loadLastListen(storageUserKey);
    if (last && pageReady && pageOfAyah(last.surahId, last.ayahNum) === data.p) return last;
    if (pageReady && data.v[0]) return { surahId: data.v[0].c, ayahNum: data.v[0].n };
    return null;
  }, [recitePreset, showAudio, audio.surahId, audio.ayahNum, pageReady, data, storageUserKey]);

  /**
   * GENERAL يبدأ فوراً من الصفحة الحالية. السياق اختياري للمطابقة المحلية فقط،
   * ولا يتحول أبداً إلى expectedRange أو نهاية للجلسة على الخادم.
   */
  const handleStartRecitation = useCallback((options: { hidden?: boolean; follow?: boolean; startVerseKey?: string } = {}) => {
    if (!pageReady || !data) return;
    // «ابدأ التلاوة» من الشريط = متابعة بآيات ظاهرة؛ «الحفظ» يمرّر اختيار الإخفاء.
    const follow = aiCanaryAvailable && (options.follow ?? false);
    const hidden = aiCanaryAvailable && !follow && (options.hidden ?? false);
    setFollowMode(follow);
    setSessionHidden(hidden);
    setSessionHideMarkers(hidden && hideMarkersPref);
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
        startVerseKey: options.startVerseKey ?? (currentAyah ? `${currentAyah.surahId}:${currentAyah.ayahNum}` : undefined),
      },
    }, hidden ? "progressive_reveal" : "visible_review");
  }, [
    aiCanaryAvailable,
    hideMarkersPref,
    audio,
    currentAyahForSetup,
    data,
    page,
    pageReady,
    showAudio,
    startRecitationWithAi,
  ]);

  // «ابدأ المتابعة من هنا»: بعد الانتقال وتحميل الصفحة تبدأ التلاوة من الآية.
  useEffect(() => {
    if (!pendingFollowStart || !pageReady || data?.p !== pendingFollowStart.page || sessionActive || voiceSearchActive) return;
    const verseKey = pendingFollowStart.verseKey;
    setPendingFollowStart(null);
    setSessionHidden(false);
    setSessionHideMarkers(false);
    handleStartRecitation({ startVerseKey: verseKey });
  }, [data, handleStartRecitation, pageReady, pendingFollowStart, sessionActive, voiceSearchActive]);

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

  // ── غلاف القارئ: الزر الرئيسي أسفل اليمين + الأداة السياقية أسفل اليسار ──
  const mode: ReaderMode = readerMode === "recite" && !rec.enabled ? "read" : readerMode;
  const testScreenOpen = testActive && !!test.state;
  const shellBlocked = activeSheet !== null || rec.phase === "setup" || rec.phase === "result"
    || testScreenOpen || !!test.state?.finished || voiceSearchActive || !!ayahMenu || showSessionSettings;
  // الأزرار العائمة تتبع أدوات القارئ (نقرة تُظهرها)، إلا أثناء جلسة جارية فزر الإيقاف يبقى
  // في متناول اليد؛ وتُخفى دائماً خلف نافذة.
  const shellHidden = shellBlocked || (!barsVisible && !sessionActive);
  const reciteSession = sessionActive && !voiceSearchActive;
  const sessionWaiting = aiPhase === "PREPARING" || aiPhase === "REQUESTING_MIC" || aiPhase === "RECONNECTING" || aiPhase === "PROCESSING";

  let fabIcon: IconName | "spinner" = "quran";
  let fabLabel = "اختر وضع القارئ";
  let fabState: FabState = "ready";
  let fabDisabled = false;
  if (mode === "recite") {
    if (reciteSession) {
      const paused = aiPhase === "PAUSED";
      fabState = aiPhase === "ERROR" ? "failed" : paused ? "paused" : sessionWaiting ? "busy" : "listening";
      fabIcon = rec.busy || sessionWaiting ? "spinner" : paused ? "play" : aiPhase === "ERROR" ? "mic-off" : "pause";
      fabLabel = paused ? "استئناف التسميع" : "إيقاف التسميع مؤقتاً";
      fabDisabled = rec.busy || aiPhase === "PROCESSING";
    } else {
      fabState = startingRecitation ? "busy" : launchError ? "failed" : "ready";
      fabIcon = startingRecitation ? "spinner" : "mic";
      fabLabel = startingRecitation ? "جارٍ التحضير لبدء التسميع" : "بدء التسميع";
      fabDisabled = startingRecitation || !pageReady;
    }
  } else if (mode === "listen") {
    fabState = audio.isLoading ? "busy" : showAudio && audio.isPlaying ? "listening" : audio.error ? "failed" : "ready";
    fabIcon = audio.isLoading ? "spinner" : showAudio && audio.isPlaying ? "pause" : "play";
    fabLabel = showAudio && audio.isPlaying ? "إيقاف الاستماع مؤقتاً" : "تشغيل الاستماع";
    fabDisabled = !pageReady;
  } else if (mode === "test") {
    fabIcon = "check-square";
    fabLabel = "ابدأ اختبار الحفظ";
  }

  const handleFabAction = () => {
    if (mode === "recite") {
      if (reciteSession) {
        if (aiPhase === "PAUSED") void resumeRecitationWithCue();
        else void pauseRecitationWithCue();
      } else {
        setLaunchError(null);
        handleStartRecitation({ hidden: hideVersesPref });
      }
    } else if (mode === "listen") {
      if (!showAudio) toggleAudio();
      else audio.togglePlay();
    } else if (mode === "test") {
      openSheet("test");
    }
    // وضع القراءة: النقرة تفتح منتقي الأوضاع (actionOpensSelector).
  };

  const openListeningPanel = () => {
    // يفتح المشغّل فقط؛ التشغيل يبدأ بزر التشغيل لا بفتح الإعدادات.
    if (sessionActive || testActive) return;
    setReaderMode("listen");
    setAudioPanelOpen(true);
  };

  const startTestFromAyah = (surahId: number, ayahNum: number) => {
    if (sessionActive || testActive) return;
    const to = SURAHS[surahId - 1]?.ayahs ?? ayahNum;
    if (showAudio) { audio.pause(); setShowAudio(false); }
    setAudioPanelOpen(false);
    setReaderMode("test");
    void test.start({ kind: "ayahs", surah: surahId, from: ayahNum, to }, {
      ...DEFAULT_TEST_SETTINGS,
      questionCount: Math.max(1, Math.min(DEFAULT_TEST_SETTINGS.questionCount, to - ayahNum + 1)),
    });
  };

  const recitationToggles = aiCanaryAvailable && rec.enabled && !followMode ? [{
    key: "strict",
    label: "لا تنتقل حتى أصحح الخطأ",
    checked: strictLive,
    onChange: setStrictMode,
  }, {
    key: "tashkeel",
    label: "كشف أخطاء التشكيل",
    badge: "تجريبي",
    hint: tashkeelLive && (tashkeelLevel === "none" || tashkeelLevel === "partial")
      ? "مزوّد التعرف الحالي لا يعيد تشكيلاً كافياً، فلا يمكن كشف أخطاء التشكيل بصدق."
      : "منفصل عن أخطاء الكلمات، ولا يعلّم أي كلمة قبل التحقق من دقته صوتياً.",
    checked: tashkeelLive,
    onChange: setTashkeelMode,
  }] : [];

  const handleModeChange = (next: ReaderMode) => {
    if (sessionActive || testActive) return; // التبديل مقفل أثناء جلسة؛ الإنهاء صريح من المنتقي.
    if (next !== "listen" && showAudio) { audio.pause(); setShowAudio(false); }
    if (next !== "listen") setAudioPanelOpen(false);
    setReaderMode(next);
    if (next === "test") openSheet("test");
  };

  const hiddenPressed = reciteSession ? sessionHidden : globalHideMode !== "visible_review";
  const toggleHideAyat = () => {
    if (reciteSession) {
      const value = !sessionHidden;
      setSessionHidden(value);
      setSessionHideMarkers(value && hideMarkersPref);
      return;
    }
    const value = globalHideMode === "visible_review";
    setGlobalHideMode(value ? "progressive_reveal" : "visible_review");
    setHideVersesPref(value);
    aiOptionsRef.current = { ...aiOptionsRef.current, hideVerses: value };
    saveRecitationAiOptions(aiOptionsRef.current, storageUserKey);
  };
  const toggleHideMarkersPref = () => {
    const value = !hideMarkersPref;
    setHideMarkersPref(value);
    if (sessionHidden) setSessionHideMarkers(value);
    aiOptionsRef.current = { ...aiOptionsRef.current, hideMarkers: value };
    saveRecitationAiOptions(aiOptionsRef.current, storageUserKey);
  };
  // إخفاء الآيات أثناء الجلسة لا يعمل إلا مع الكشف الحي بتبيان AI؛ دونه نُخفي الزر بدل تزييفه.
  const hideAyatAvailable = !reciteSession || (aiCanaryAvailable && !followMode && rec.mode === "general");

  const testRevealed = testRuntime
    ? testRevealMap(
      testRuntime,
      test.state?.mode === "ai" && matcherRef.current ? matcherRef.current.committedIndex() : null,
      test.state?.mode === "ai" ? peekedRef.current : [],
    )
    : null;

  return (
    <div
      className="tby-reader fixed inset-0 z-[100] flex flex-col"
      data-fit={fit.mode}
      data-chrome={barsVisible ? "shown" : "hidden"}
      data-mode={mode}
      data-zoomed={zoomPan.zoomedIn}
      dir="rtl"
      onClick={(event) => {
        // Reserved top/bottom margins are outside the gesture viewport.
        // A tap there must also restore chrome, rather than leave the reader stuck.
        if (event.target === event.currentTarget && !chromePinnedRef.current) {
          if (barsVisibleRef.current) {
            if (timerRef.current) clearTimeout(timerRef.current);
            setBarsVisible(false);
          } else resetFocusTimer();
        }
      }}
    >

      {/* ══ منطقة القراءة (touch-none — إيماءات فقط) ══════════════════════ */}
      <div
        ref={containerRef}
        className="tby-reader-viewport select-none"
        style={{ cursor: zoomPan.zoomedIn ? (zoomPan.interacting ? "grabbing" : "grab") : "default" }}
        {...zoomPan.handlers}
      >
        {/* The measured stage reserves app chrome; physical paper scrolls within it. */}
        <div
          ref={pageBoxRef}
          className="tby-reading-stage"
        >
          {pageW > 0 && (
            <div
              style={{
                transform: `translate(${zoomPan.x + zoomPan.dragX}px, ${zoomPan.y}px) scale(${zoomPan.zoom})`,
                transition: zoomPan.interacting ? "none" : "transform 160ms ease-out",
              }}
            >
              {pageReady ? (
                <div
                  key={data.p}
                  className={
                    navDir.current === "next"
                      ? "tby-page-in-next"
                      : navDir.current === "prev"
                        ? "tby-page-in-prev"
                        : undefined
                  }
                >
                  <MushafPageFrame width={pageW} height={pageH} mode={fit.mode}>
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
                  </MushafPageFrame>
                </div>
              ) : (
                <div
                  className="tby-mushaf-paper flex items-center justify-center"
                  style={{ width: pageW, height: pageH }}
                >
                  {status === "error" ? (
                    <div className="text-center px-6">
                      <p className="font-readex text-sm text-muted-foreground mb-3">تعذّر تحميل الصفحة، حاول مرة أخرى.</p>
                      <button
                        onClick={retry}
                        className="tby-chip font-readex text-sm font-bold rounded-xl px-5 py-2.5 btn-press"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : (
                    <span className="tby-sheet-muted font-amiri text-xl animate-pulse" role="status" aria-label="جارٍ تحميل الصفحة">…</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

        {/* أسهم الصفحات الجانبية — مكتبي بمؤشر فقط (الهاتف: السحب). RTL: التالية يساراً. */}
        {!sessionActive && !testActive && (
          <>
            <button
              type="button"
              className="tby-side-nav absolute left-4 top-1/2 -translate-y-1/2 z-[15]"
              onClick={next}
              disabled={page >= TOTAL_PAGES}
              aria-label="الصفحة التالية"
              style={{ opacity: barsVisible ? 1 : 0 }}
            >
              <Icon name="chevron-left" size={20} />
            </button>
            <button
              type="button"
              className="tby-side-nav absolute right-4 top-1/2 -translate-y-1/2 z-[15]"
              onClick={prev}
              disabled={page <= 1}
              aria-label="الصفحة السابقة"
              style={{ opacity: barsVisible ? 1 : 0 }}
            >
              <Icon name="chevron-right" size={20} />
            </button>
          </>
        )}

      {/* ══ أدوات القارئ (خارج touch-none — يأخذ pointer events مباشرة) ══ */}
      <MushafControls
        page={page}
        surahName={surahName}
        surahNumber={surahNumber}
        juz={juz}
        bookmarked={bookmarks.includes(page)}
        zoom={zoomPan.zoom}
        visible={barsVisible && !testScreenOpen}
        onMenuOpenChange={setSettingsMenuOpen}
        sessionActive={sessionActive}
        titleOverride={testRuntime && !testRuntime.locationShown ? "اختبار الحفظ" : null}
        globalHideMode={globalHideMode}
        hideMarkers={hideMarkersPref}
        onOpenTools={() => openSheet("tools")}
        onClose={handleClose}
        onToggleBookmark={() => toggleBookmark(page)}
        onZoomIn={zoomPan.zoomIn}
        onZoomOut={zoomPan.zoomOut}
        onZoomReset={zoomPan.reset}
        onOpenIndex={() => openSheet("index")}
        onOpenSearch={() => openSheet("search")}
        onOpenHide={() => openSheet("hide")}
        onToggleHideMarkers={toggleHideMarkersPref}
        onRevealGlobalWord={revealNextGlobalWord}
        onOpenListening={openListeningPanel}
        recitationToggles={recitationToggles}
      />

      {/* ══ الأداة السياقية أسفل اليسار ══ */}
      {mode === "recite" && hideAyatAvailable && (
        <ReaderContextButton
          icon={hiddenPressed ? "eye" : "eye-off"}
          label={hiddenPressed ? "إظهار الآيات" : "إخفاء الآيات"}
          pressed={hiddenPressed}
          hidden={shellHidden}
          onClick={toggleHideAyat}
          testId="mushaf-context-hide-ayat"
        />
      )}
      {mode === "listen" && (
        <ReaderContextButton
          icon="headphones"
          label={audioPanelOpen ? "إخفاء مشغّل الاستماع" : "القارئ والتكرار"}
          pressed={audioPanelOpen}
          hidden={shellHidden}
          onClick={() => setAudioPanelOpen((v) => !v)}
          testId="mushaf-context-audio"
        />
      )}

      {/* ══ الزر الرئيسي أسفل اليمين (ضغط مطوّل = منتقي الأوضاع) ══ */}
      <ReaderModeFab
        mode={mode}
        icon={fabIcon}
        label={fabLabel}
        state={fabState}
        disabled={fabDisabled}
        hidden={shellHidden}
        onAction={handleFabAction}
        onModeChange={handleModeChange}
        actionOpensSelector={mode === "read"}
        onOpenChange={setModeMenuOpen}
        lock={sessionActive ? {
          reason: "أنهِ الجلسة الحالية قبل تغيير الوضع.",
          endLabel: "إنهاء الجلسة",
          onEnd: () => { void endRecitationWithAi(); },
        } : null}
        unavailable={rec.enabled ? {} : { recite: "غير متاح في هذا الحساب" }}
      />

      {/* ══ مشغّل الاستماع — عند الطلب فقط ══ */}
      {audioPanelOpen && mode === "listen" && !sessionActive && !shellBlocked && (
        <MushafAudioBar
          surahName={audio.surahName || surahName}
          ayahNum={audio.ayahNum}
          isPlaying={audio.isPlaying}
          isLoading={audio.isLoading}
          error={audio.error}
          repeat={audio.repeat}
          reciterId={audio.reciterId}
          onTogglePlay={showAudio ? audio.togglePlay : toggleAudio}
          onNext={audio.next}
          onPrev={audio.prev}
          onRepeatChange={audio.setRepeat}
          onReciterChange={audio.setReciter}
          onClose={() => { if (showAudio) { audio.pause(); setShowAudio(false); } setAudioPanelOpen(false); }}
          onClearError={audio.clearError}
        />
      )}

      {/* ══ شريط جلسة تبيان AI — يحل محل الشريط العائم ══ */}
      {sessionActive && rec.range && !testActive && !voiceSearchActive && (
        <RecitationSessionBar
          kindLabel={rec.mode === "educational" ? "تسميع تعليمي" : followMode ? "متابعة قارئ" : (aiRevealActive ? sessionHidden : rec.hideMode !== "visible_review") ? "حفظ" : "تلاوة"}
          aiPhase={aiPhase}
          aiAvailable={aiCanaryAvailable}
          elapsedSecs={rec.elapsedSecs}
          busy={rec.busy}
          sessionError={rec.sessionError ?? (aiPhase === "ERROR" ? live.error : null)}
          qualityMessage={liveQualityMessage}
          canPeek={aiPeekAvailable || (!aiRevealActive && rec.hideMode === "progressive_reveal")}
          educational={rec.mode === "educational" && !aiRevealActive ? {
            range: rec.range,
            currentAyah: rec.currentVerseKey ? Number(rec.currentVerseKey.split(":")[1]) : null,
            onPrev: rec.prevAyah,
            onNext: rec.nextAyah,
          } : null}
          positionLabel={rec.currentVerseKey
            ? `${surahOfChapter(Number(rec.currentVerseKey.split(":")[0]))} · ${toArabicDigits(rec.currentVerseKey.split(":")[1])}`
            : null}
          strictHold={strictHoldActive}
          onPeek={aiPeekAvailable ? peekNext : rec.revealNextWord}
          onPause={pauseRecitationWithCue}
          onResume={resumeRecitationWithCue}
          onEnd={() => { void endRecitationWithAi(); }}
          onRetryAi={retryAi}
          onOpenSettings={() => setShowSessionSettings(true)}
          onClearError={rec.clearError}
        />
      )}

      {popover && sessionActive && (
        <MistakePopover
          data={popover}
          canReplay={rec.phase === "paused" || !aiRevealActive}
          onDismissMistake={dismissMistake}
          onReplayAyah={(surahId, ayah) => audio.playSingleAyah(surahId, ayah)}
          onClose={() => setPopover(null)}
        />
      )}

      {sessionActive && showSessionSettings && (
        <RecitationSessionSettingsSheet
          busy={rec.busy}
          onClose={() => setShowSessionSettings(false)}
          onCancelSession={cancelRecitationWithAi}
          toggles={[{
            key: "feedback-sounds",
            label: "أصوات التنبيه أثناء التسميع",
            description: "نغمات هادئة للجاهزية والخطأ المؤكد والتصحيح وإكمال الآية.",
            checked: feedbackSounds,
            onChange: (enabled: boolean) => {
              setRecitationCuesEnabled(enabled, storageUserKey);
              setFeedbackSounds(enabled);
              if (enabled) cuePlayerRef.current?.prepare();
            },
          }, ...(aiCanaryAvailable && !followMode ? [{
            key: "hide-verses",
            label: "إخفاء الآيات",
            description: "للحفظ: تختفي الآيات وتنكشف كل كلمة حين تُتلى صحيحة.",
            checked: sessionHidden,
            onChange: (value: boolean) => { setSessionHidden(value); if (!value) setSessionHideMarkers(false); },
          }, {
            key: "hide-markers",
            label: "إخفاء علامات الآيات",
            description: "في وضع الحفظ فقط، دون تغيير مواضع الأسطر.",
            checked: sessionHideMarkers,
            disabled: !sessionHidden,
            onChange: setSessionHideMarkers,
          }, {
            key: "strict",
            label: "لا تنتقل حتى أصحح الخطأ",
            description: "عند تأكد خطأ يتوقف التقدم حتى تعيد الكلمة صحيحة، ثم تتابع تلقائياً.",
            checked: strictLive,
            onChange: setStrictMode,
          }, {
            key: "tashkeel",
            label: "كشف أخطاء التشكيل",
            badge: "تجريبي",
            description: !tashkeelLive
              ? "منفصل عن أخطاء الكلمات، ولا يعلّم أي كلمة قبل التحقق من دقته صوتياً."
              : tashkeelLevel === "unknown"
                ? "يقيس الآن هل يعيد مزوّد التعرف تشكيلاً كافياً…"
                : tashkeelLevel === "present"
                  ? "المزوّد يعيد تشكيلاً؛ النتائج تجريبية ولا تُحتسب أخطاء."
                  : "مزوّد التعرف الحالي لا يعيد تشكيلاً كافياً، فلا يمكن كشف أخطاء التشكيل بصدق.",
            checked: tashkeelLive,
            onChange: setTashkeelMode,
          }] : [])]}
          footerNote={followMode
            ? "متابعة قارئ: يتبع تبيان AI موضع التلاوة فقط ولا يقيّم أي خطأ. لا يُحفظ أي تسجيل صوتي."
            : aiCanaryAvailable
            ? "لا يُحفظ أي تسجيل صوتي. تبيان AI يقارن ما يسمعه بنص المصحف الكنسي فقط، وقد يخطئ أحياناً؛ يمكنك تصنيف أي تعليم بأنه «ليس خطأ»."
            : null}
        />
      )}

      {/* تعذّر بدء الجلسة: شارة صغيرة بجانب الزر الرئيسي، لا لافتة */}
      {launchError && !sessionActive && !shellBlocked && (
        <div className="tby-launch-chip" role="alert">
          <AiStatusChip
            kind="error"
            label="تعذّر البدء"
            message={launchError}
            onOpenChange={setAiDetailsOpen}
            onRetry={rec.enabled ? () => { setLaunchError(null); handleStartRecitation({ hidden: hideVersesPref }); } : null}
            onDismiss={() => setLaunchError(null)}
          />
        </div>
      )}

      {devtools && aiCanaryAvailable && (sessionActive || live.state !== "idle") && (
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
          reconnectCount={reconnectCountRef.current}
          audioIssue={live.audioQuality.issue}
          onAudioFileTest={import.meta.env.DEV ? runAudioFileTest : undefined}
        />
      )}

      {/* ══ أوراق التسميع — خارج منطقة الإيماءات: تمرير لمسي، ولا سحب يقلب الصفحة ══ */}
      {rec.phase === "setup" && (
        <RecitationSetupSheet
          accountId={storageUserKey}
          pageData={pageReady ? data : null}
          currentAyah={currentAyahForSetup}
          assignment={rec.isStudent ? assignment : null}
          educationalAvailable={rec.educationalAvailable}
          isStarting={rec.isStarting}
          onStart={startFromSetup}
          aiAvailable={aiCanaryAvailable}
          onClose={() => { setRecitePreset(null); rec.closeSetup(); }}
        />
      )}
      {rec.phase === "result" && rec.result && !test.state && (
        <RecitationResultSheet
          result={rec.result}
          aiSummary={aiSummary}
          weakest={aiWeakest}
          onOpenHistory={historyStore ? () => { rec.closeResult(); openHistory("review"); } : undefined}
          onClose={rec.closeResult}
          onRepeat={rec.result.mode === "general" ? () => handleStartRecitation({ hidden: sessionHidden }) : rec.repeatSession}
          kindLabel={rec.result.mode === "general" ? (sessionHidden ? "حفظ" : "تلاوة") : undefined}
          notice={assignmentSubmission && assignmentSubmission.sessionId === rec.result.sessionId ? (
            <AssignmentSubmissionNotice
              submission={assignmentSubmission}
              onRetry={assignmentSubmission.payload
                ? () => void sendAssignmentResult(assignmentSubmission.sessionId, assignmentSubmission.payload!)
                : undefined}
            />
          ) : undefined}
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
          onClose={() => {
            if (voiceSearchActiveRef.current) void stopVoiceSearch();
            setVoiceSearch({ phase: "idle", results: [] });
            setSearchAutoVoice(false);
            closeSheet();
          }}
          onFollowFrom={rec.enabled ? (verseKey, targetPage) => {
            setVoiceSearch({ phase: "idle", results: [] });
            if (targetPage !== page) go(targetPage);
            setPendingFollowStart({ page: targetPage, verseKey });
          } : undefined}
          voice={aiCanaryAvailable && rec.enabled ? {
            state: voiceSearch,
            onStart: () => { void startVoiceSearch(); },
            onStop: () => { void stopVoiceSearch(); },
          } : null}
          autoStartVoice={searchAutoVoice}
        />
      )}
      {activeSheet === "history" && historyData && (
        <RecitationHistorySheet
          data={historyData}
          initialTab={historyInit.tab}
          initialVerseKey={historyInit.verseKey}
          onMarkNotMistake={(id) => { historyStore?.markNotMistake(id); refreshHistory(); }}
          onOpenRange={(range) => { closeSheet(); testDepsRef.current?.navigate(pageOfAyah(range.surah, range.from)); }}
          onTestRange={(range) => {
            closeSheet();
            void test.start({ kind: "ayahs", surah: range.surah, from: range.from, to: range.to }, {
              ...DEFAULT_TEST_SETTINGS, questionCount: Math.min(3, range.to - range.from + 1),
            });
          }}
          onClose={closeSheet}
        />
      )}

      {activeSheet === "tools" && (
        <ReaderToolsSheet
          onClose={closeSheet}
          tools={[
            {
              key: "test",
              icon: "check-square",
              label: "اختبار الحفظ",
              description: "بداية آية ظاهرة، وأكمل الباقي من ذاكرتك — لسورة أو جزء أو صفحة أو نطاق.",
              onSelect: () => openSheet("test"),
            },
            {
              key: "voice-search",
              icon: "mic",
              label: "ابحث بالتلاوة",
              description: "اتلُ أي موضع، فيجد تبيان الموضع في المصحف.",
              onSelect: () => { setSearchAutoVoice(true); openSheet("search"); },
              disabledReason: aiCanaryAvailable && rec.enabled ? null : "يتطلب تفعيل تبيان AI",
            },
            {
              key: "follow",
              icon: "headphones",
              label: "متابعة قارئ",
              description: "يتبع تلاوة إمام أو معلم أو تسجيل على المصحف دون تقييم أخطاء.",
              onSelect: () => handleStartRecitation({ follow: true }),
              disabledReason: aiCanaryAvailable && rec.enabled ? null : "يتطلب تفعيل تبيان AI",
            },
            {
              key: "history",
              icon: "clock",
              label: "سجل التلاوة والمراجعة",
              description: "جلساتك وأخطاؤك وأضعف مواضعك، ومراجعة ذكية من سجلك الفعلي.",
              onSelect: () => openHistory("review"),
              disabledReason: historyStore ? null : "يتطلب تسجيل الدخول",
            },
          ]}
        />
      )}

      {activeSheet === "test" && (
        <MemorizationTestSetupSheet
          accountId={storageUserKey}
          currentPage={page}
          currentSurah={surahNumber ?? 1}
          currentJuz={juz ?? 1}
          aiAvailable={aiCanaryAvailable && rec.enabled}
          hideMarkers={hideMarkersPref}
          onHideMarkersChange={(value) => {
            setHideMarkersPref(value);
            aiOptionsRef.current = { ...aiOptionsRef.current, hideMarkers: value };
            saveRecitationAiOptions(aiOptionsRef.current, storageUserKey);
          }}
          busy={startingRecitation}
          onStart={(scope, settings) => {
            if (showAudio) { audio.pause(); setShowAudio(false); }
            closeSheet();
            void test.start(scope, settings);
          }}
          onClose={closeSheet}
        />
      )}

      {/* ══ اختبار الحفظ: شاشة مخصّصة ببطاقة واحدة ══ */}
      {testScreenOpen && test.state && (
        <MemorizationTestScreen
          state={test.state}
          revealed={testRevealed}
          awaitingSelfGrade={test.state.mode === "manual" && test.manualRevealAll && !testRuntime?.answered}
          aiPhase={aiPhase}
          qualityMessage={liveQualityMessage}
          busy={rec.busy}
          onHint={test.hint}
          onRevealAnswer={test.revealAnswer}
          onRevealAyah={test.revealAyah}
          onToggleLocation={test.toggleLocation}
          onSkip={() => { void test.skip(); }}
          onNext={() => { void test.next(); }}
          onSelfGrade={test.selfGrade}
          onPause={pauseRecitationWithCue}
          onResume={resumeRecitationWithCue}
          onExit={() => { void test.finish(true); }}
        />
      )}

      {test.state?.finished && test.state.summary && (
        <MemorizationTestResultSheet
          scopeLabel={test.state.scopeLabel}
          mode={test.state.mode}
          summary={test.state.summary}
          questions={test.state.questions}
          results={test.state.results}
          temporary={test.state.settings.temporary}
          onOpenQuestion={(question) => {
            test.close();
            if (rec.phase === "result") rec.closeResult();
            testDepsRef.current?.navigate(question.start.page);
          }}
          onRetryWeak={() => { if (rec.phase === "result") rec.closeResult(); void test.retryWeak(); }}
          onNewTest={() => { test.close(); if (rec.phase === "result") rec.closeResult(); openSheet("test"); }}
          onClose={() => { test.close(); if (rec.phase === "result") rec.closeResult(); }}
        />
      )}

      {activeSheet === "hide" && (
        <MemorizeSheet
          aiAvailable={aiCanaryAvailable}
          recitationEnabled={rec.enabled}
          hideVerses={hideVersesPref}
          hideMarkers={hideMarkersPref}
          onHideVersesChange={(value) => {
            setHideVersesPref(value);
            aiOptionsRef.current = { ...aiOptionsRef.current, hideVerses: value };
            saveRecitationAiOptions(aiOptionsRef.current, storageUserKey);
          }}
          onHideMarkersChange={(value) => {
            setHideMarkersPref(value);
            aiOptionsRef.current = { ...aiOptionsRef.current, hideMarkers: value };
            saveRecitationAiOptions(aiOptionsRef.current, storageUserKey);
          }}
          onStart={() => { closeSheet(); handleStartRecitation({ hidden: hideVersesPref }); }}
          onOpenTest={() => openSheet("test")}
          selfReviewMode={globalHideMode}
          onSelfReviewModeChange={(mode) => { setGlobalHideMode(mode); closeSheet(); }}
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
          onTestFromHere={!testActive ? startTestFromAyah : undefined}
          mistakeCount={historyData?.mistakes.filter((m) => m.verseKey === ayahMenu && m.status !== "dismissed").length ?? 0}
          onShowMistakes={historyStore ? () => openHistory("mistakes", ayahMenu) : undefined}
          onClose={() => setAyahMenu(null)}
        />
      )}
    </div>
  );
}
