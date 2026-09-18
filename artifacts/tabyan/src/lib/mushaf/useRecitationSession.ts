/**
 * useRecitationSession — يدير دورة حياة جلسة التسميع داخل المصحف.
 * الحالات: idle → setup → active ⇌ paused → result
 *
 * قواعد الأمان:
 * - كل mutation مُنتظَرة (await) — لا fire-and-forget في عمليات حرجة.
 * - busy=true يمنع أي عملية متزامنة.
 * - الانتقال لـ result يحدث فقط بعد تأكيد الخادم (end mutation).
 * - التايمر بـ timestamps لا setInterval drift.
 * - الـ refs تضمن قراءة قيم حديثة داخل الـ async callbacks.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { authStore } from "@/lib/auth";
import type {
  ExpectedRecitationRange,
  GeneralStartContext,
  HideMode,
  SessionMode,
} from "@/lib/recitation-types";

export type RecitationPhase = "idle" | "setup" | "active" | "paused" | "result";

export interface RecitationRange {
  surahId: number;
  surahName: string;
  startAyah: number;
  endAyah: number;
}

/**
 * localRange يحدد فقط ما يرسمه المصحف ويحمله Live Reveal في هذه المرحلة.
 * لا يُرسل كـ expected range في GENERAL ولا يحدد نهاية الجلسة.
 */
export type RecitationStartRequest =
  | {
      mode: "general";
      localRange: RecitationRange;
      startContext: GeneralStartContext;
    }
  | {
      mode: "educational";
      localRange: RecitationRange;
      expectedRange: ExpectedRecitationRange;
    };

export interface SessionResult {
  surahName: string;
  startAyah: number;
  endAyah: number;
  ayahCount: number;
  durationSeconds: number;
  hideMode: HideMode;
  mode: SessionMode;
}

/** بناء مجموعة verseKeys "surahId:ayahNum" للنطاق المحدد */
export function buildRangeKeys(range: RecitationRange): Set<string> {
  const keys = new Set<string>();
  for (let i = range.startAyah; i <= range.endAyah; i++) {
    keys.add(`${range.surahId}:${i}`);
  }
  return keys;
}

interface InternalState {
  phase: RecitationPhase;
  range: RecitationRange | null;
  hideMode: HideMode;
  mode: SessionMode;
  sessionId: string | null;
  currentVerseKey: string | null;
  revealedWords: Map<string, number>; // verseKey → عدد الكلمات المكشوفة
  startTs: number | null;             // timestamp بداية الفترة النشطة الحالية
  accumulatedSecs: number;            // ثوانٍ نشطة مجمّعة من فترات سابقة
  result: SessionResult | null;
}

const IDLE_STATE: InternalState = {
  phase: "idle",
  range: null,
  hideMode: "full_hide",
  mode: "general",
  sessionId: null,
  currentVerseKey: null,
  revealedWords: new Map(),
  startTs: null,
  accumulatedSecs: 0,
  result: null,
};

export function useRecitationSession() {
  const [st, setSt] = useState<InternalState>(IDLE_STATE);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // ── Refs: قيم حديثة دائماً داخل الـ async callbacks ─────────────────────
  const phaseRef           = useRef<RecitationPhase>("idle");
  const sessionIdRef       = useRef<string | null>(null);
  const rangeRef           = useRef<RecitationRange | null>(null);
  const hideModeRef        = useRef<HideMode>("full_hide");
  const modeRef            = useRef<SessionMode>("general");
  const startTsRef         = useRef<number | null>(null);
  const accumulatedSecsRef = useRef<number>(0);
  const busyRef            = useRef(false);

  useEffect(() => {
    phaseRef.current           = st.phase;
    sessionIdRef.current       = st.sessionId;
    rangeRef.current           = st.range;
    hideModeRef.current        = st.hideMode;
    modeRef.current            = st.mode;
    startTsRef.current         = st.startTs;
    accumulatedSecsRef.current = st.accumulatedSecs;
  }, [st]);

  useEffect(() => { busyRef.current = busy; }, [busy]);

  // ── Feature flag ──────────────────────────────────────────────────────────
  const DEMO     = authStore.isDemo;
  const featureQ = trpc.recitation.status.useQuery(undefined, { enabled: !DEMO });
  const enabled  = DEMO ? false : (featureQ.data?.enabled ?? false);
  const realtimeEnabled = !DEMO && (featureQ.data?.liveTrackingEnabled ?? false);
  const educationalAvailable = !DEMO && featureQ.data?.educationalAssignmentSource === "ready";

  // ── tRPC mutations ────────────────────────────────────────────────────────
  const startMut  = trpc.recitation.start.useMutation();
  const pauseMut  = trpc.recitation.pause.useMutation();
  const resumeMut = trpc.recitation.resume.useMutation();
  const endMut    = trpc.recitation.end.useMutation();
  const cancelMut = trpc.recitation.cancel.useMutation();

  // ── إدارة التايمر ─────────────────────────────────────────────────────────
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback((startTs: number, alreadyAcc: number) => {
    stopTimer();
    intervalRef.current = setInterval(() => {
      setElapsedSecs(alreadyAcc + Math.floor((Date.now() - startTs) / 1000));
    }, 500);
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // ── مساعد: هل يمكن بدء عملية جديدة? ─────────────────────────────────────
  const canAct = useCallback(() => !busyRef.current, []);

  const lock   = useCallback(() => { setBusy(true);  busyRef.current = true;  }, []);
  const unlock = useCallback(() => { setBusy(false); busyRef.current = false; }, []);

  const clearError = useCallback(() => setSessionError(null), []);

  // ── الإجراءات ─────────────────────────────────────────────────────────────

  const openSetup = useCallback(() => {
    setSt(s => ({ ...s, phase: "setup" }));
    setSessionError(null);
  }, []);

  const closeSetup = useCallback(() => {
    setSt(s => ({ ...s, phase: "idle" }));
  }, []);

  /** بدء جلسة: GENERAL يرسل سياق البداية فقط، وEDUCATIONAL يرسل expectedRange صريحاً. */
  const startSession = useCallback(async (request: RecitationStartRequest, hideMode: HideMode) => {
    const response = request.mode === "general"
      ? await startMut.mutateAsync({
          mode: "general",
          startContext: request.startContext,
          hideMode,
        })
      : await startMut.mutateAsync({
          mode: "educational",
          expectedRange: request.expectedRange,
          hideMode,
        });
    const { sessionId } = response;
    const range = request.localRange;
    const mode = request.mode;
    const now = Date.now();
    setSt({
      phase: "active",
      range,
      hideMode,
      mode,
      sessionId,
      currentVerseKey: `${range.surahId}:${range.startAyah}`,
      revealedWords: new Map(),
      startTs: now,
      accumulatedSecs: 0,
      result: null,
    });
    setElapsedSecs(0);
    setSessionError(null);
    startTimer(now, 0);
    return sessionId;
  }, [startMut, startTimer]);

  /**
   * إيقاف مؤقت — تحديث UI فوري (optimistic)؛ الخادم يُحدَّث خلف الكواليس.
   * إذا فشل الخادم: نعود لـ active ونُظهر خطأً.
   */
  const pause = useCallback(async (): Promise<boolean> => {
    if (phaseRef.current !== "active" || !sessionIdRef.current || !canAct()) return false;
    const sessionId = sessionIdRef.current;
    const now = Date.now();
    const newAcc = accumulatedSecsRef.current +
      (startTsRef.current ? Math.floor((now - startTsRef.current) / 1000) : 0);

    lock();
    stopTimer();
    setElapsedSecs(newAcc);
    setSt(s => ({ ...s, phase: "paused", startTs: null, accumulatedSecs: newAcc }));

    try {
      await pauseMut.mutateAsync({ sessionId });
      setSessionError(null);
      return true;
    } catch {
      // رجوع للحالة النشطة
      const now2 = Date.now();
      setSt(s => ({ ...s, phase: "active", startTs: now2 }));
      startTimer(now2, newAcc);
      setSessionError("تعذّر الإيقاف المؤقت");
      return false;
    } finally {
      unlock();
    }
  }, [canAct, lock, unlock, pauseMut, stopTimer, startTimer]);

  /**
   * استئناف — تحديث UI فوري (optimistic).
   * إذا فشل الخادم: نعود لـ paused ونُظهر خطأً.
   */
  const resume = useCallback(async (): Promise<boolean> => {
    if (phaseRef.current !== "paused" || !sessionIdRef.current || !canAct()) return false;
    const sessionId = sessionIdRef.current;
    const acc = accumulatedSecsRef.current;
    const now = Date.now();

    lock();
    setSt(s => ({ ...s, phase: "active", startTs: now }));
    startTimer(now, acc);

    try {
      await resumeMut.mutateAsync({ sessionId });
      setSessionError(null);
      return true;
    } catch {
      // رجوع للحالة الموقوفة
      stopTimer();
      setSt(s => ({ ...s, phase: "paused", startTs: null }));
      setSessionError("تعذّر استئناف الجلسة");
      return false;
    } finally {
      unlock();
    }
  }, [canAct, lock, unlock, resumeMut, startTimer, stopTimer]);

  /**
   * إنهاء الجلسة — pessimistic:
   * الانتقال لـ result يحدث فقط بعد تأكيد الخادم.
   * إذا فشل: تُعاد الجلسة كما كانت ويظهر خطأ مع زر إعادة المحاولة.
   */
  const endSession = useCallback(async (): Promise<boolean> => {
    const phase = phaseRef.current;
    if (!["active", "paused"].includes(phase) || !sessionIdRef.current || !rangeRef.current || !canAct()) return false;

    const sessionId = sessionIdRef.current;
    const range     = rangeRef.current;
    const hideMode  = hideModeRef.current;
    const mode      = modeRef.current;
    const now       = Date.now();
    const extra     = phase === "active" && startTsRef.current
      ? Math.floor((now - startTsRef.current) / 1000) : 0;
    const totalActive = accumulatedSecsRef.current + extra;

    lock();
    stopTimer();

    try {
      const res = await endMut.mutateAsync({ sessionId });
      setSt({
        phase: "result",
        range,
        hideMode,
        mode,
        sessionId: null,
        currentVerseKey: null,
        revealedWords: new Map(),
        startTs: null,
        accumulatedSecs: 0,
        result: {
          surahName: range.surahName,
          startAyah: range.startAyah,
          endAyah: range.endAyah,
          ayahCount: range.endAyah - range.startAyah + 1,
          durationSeconds: res.durationSeconds,
          hideMode,
          mode,
        },
      });
      setElapsedSecs(0);
      setSessionError(null);
      return true;
    } catch {
      // أعد الجلسة لحالتها — المستخدم يمكنه المحاولة مجدداً
      if (phase === "active") {
        const now2 = Date.now();
        setSt(s => ({ ...s, startTs: now2 }));
        startTimer(now2, totalActive);
      }
      setSessionError("تعذّر حفظ الجلسة — حاول الإنهاء مرة أخرى");
      return false;
    } finally {
      unlock();
    }
  }, [canAct, lock, unlock, endMut, stopTimer, startTimer]);

  /**
   * إلغاء الجلسة — optimistic (المستخدم اختار الخروج).
   * نُرسل cancel للخادم في الخلفية دون انتظار.
   */
  const cancelSession = useCallback(() => {
    if (!canAct()) return;
    const sessionId = sessionIdRef.current;
    stopTimer();
    setSt(IDLE_STATE);
    setElapsedSecs(0);
    setSessionError(null);
    setBusy(false);
    busyRef.current = false;
    if (sessionId) cancelMut.mutate({ sessionId });
  }, [canAct, cancelMut, stopTimer]);

  const closeResult = useCallback(() => {
    setSt(s => ({ ...s, phase: "idle", result: null }));
    setSessionError(null);
  }, []);

  /** فتح إعداد جديد بنفس إعدادات الجلسة الأخيرة */
  const repeatSession = useCallback(() => {
    setSt(s => ({ ...s, phase: "setup", sessionId: null, result: null }));
    setSessionError(null);
  }, []);

  /** يحفظ آخر موضع قرآني ثابت محلياً دون تغيير عقد الجلسة على الخادم. */
  const setCurrentPosition = useCallback((verseKey: string) => {
    setSt(s => {
      if (s.phase !== "active" && s.phase !== "paused") return s;
      return s.currentVerseKey === verseKey ? s : { ...s, currentVerseKey: verseKey };
    });
  }, []);

  const nextAyah = useCallback(() => {
    setSt(s => {
      if (!s.range || !s.currentVerseKey) return s;
      const n = parseInt(s.currentVerseKey.split(":")[1], 10);
      if (n < s.range.endAyah) return { ...s, currentVerseKey: `${s.range.surahId}:${n + 1}` };
      return s;
    });
  }, []);

  const prevAyah = useCallback(() => {
    setSt(s => {
      if (!s.range || !s.currentVerseKey) return s;
      const n = parseInt(s.currentVerseKey.split(":")[1], 10);
      if (n > s.range.startAyah) return { ...s, currentVerseKey: `${s.range.surahId}:${n - 1}` };
      return s;
    });
  }, []);

  const revealNextWord = useCallback(() => {
    setSt(s => {
      if (!s.currentVerseKey) return s;
      const vk   = s.currentVerseKey;
      const next = new Map(s.revealedWords);
      next.set(vk, (next.get(vk) ?? 0) + 1);
      return { ...s, revealedWords: next };
    });
  }, []);

  const revealCurrentAyah = useCallback(() => {
    setSt(s => {
      if (!s.currentVerseKey) return s;
      const next = new Map(s.revealedWords);
      next.set(s.currentVerseKey, 9999);
      return { ...s, revealedWords: next };
    });
  }, []);

  return {
    phase: st.phase,
    range: st.range,
    hideMode: st.hideMode,
    mode: st.mode,
    sessionId: st.sessionId,
    currentVerseKey: st.currentVerseKey,
    revealedWords: st.revealedWords,
    result: st.result,
    elapsedSecs,
    busy,
    sessionError,
    enabled,
    realtimeEnabled,
    educationalAvailable,
    isStarting: startMut.isPending,
    isStudent: authStore.role === "student",
    // إجراءات
    openSetup,
    closeSetup,
    startSession,
    pause,
    resume,
    endSession,
    cancelSession,
    closeResult,
    repeatSession,
    setCurrentPosition,
    nextAyah,
    prevAyah,
    revealNextWord,
    revealCurrentAyah,
    clearError,
  };
}
