/**
 * useAudioPlayer — يدير مشغّل صوت تلاوة القرآن.
 * المصدر: EveryAyah — بلا مفتاح API، مع اختيار القارئ (يُحفظ محلياً).
 * الانتقال التلقائي للآية التالية عند انتهاء الآية الحالية.
 *
 * تصميم الحالة:
 * - isPlaying / isLoading: ما يُعرضه الـ UI فقط (مشتق من أحداث DOM).
 * - shouldPlayRef: "نية المستخدم" للتشغيل — لا تتأثر بأحداث pause العابرة
 *   (مثل pause الذي يُطلقه بعض المتصفحات قبل ended). هذا هو المصدر الوحيد
 *   المُستخدَم في effect تبديل المسار لتقرير إكمال التشغيل.
 *
 * فصل المواضع (§45): آخر موضع استماع يُحفظ في tabyan.mushaf.lastListen —
 * مستقل عن آخر صفحة قراءة (tabyan.mushaf.lastPage) وعن جلسات التسميع (خادم).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { SURAHS } from "@/lib/quran-data";

/** قرّاء EveryAyah المتاحون — أسماء المجلدات الرسمية للمصدر */
export const RECITERS = [
  { id: "Alafasy_128kbps",               name: "مشاري راشد العفاسي" },
  { id: "Husary_128kbps",                name: "محمود خليل الحصري" },
  { id: "Abdul_Basit_Murattal_192kbps",  name: "عبد الباسط عبد الصمد" },
  { id: "Minshawy_Murattal_128kbps",     name: "محمد صديق المنشاوي" },
  { id: "Ghamadi_40kbps",                name: "سعد الغامدي" },
] as const;
export type ReciterId = (typeof RECITERS)[number]["id"];

const LS_RECITER     = "tabyan.mushaf.reciter";
const LS_LAST_LISTEN = "tabyan.mushaf.lastListen";
const DEFAULT_RECITER: ReciterId = "Alafasy_128kbps";

function loadReciter(): ReciterId {
  try {
    const v = localStorage.getItem(LS_RECITER);
    if (v && RECITERS.some(r => r.id === v)) return v as ReciterId;
  } catch { /* تجاهل */ }
  return DEFAULT_RECITER;
}

/** آخر موضع استماع محفوظ ("سورة:آية") أو null */
export function loadLastListen(): { surahId: number; ayahNum: number } | null {
  try {
    const v = localStorage.getItem(LS_LAST_LISTEN);
    if (!v) return null;
    const [s, a] = v.split(":").map(Number);
    if (s >= 1 && s <= SURAHS.length && a >= 1 && a <= (SURAHS[s - 1]?.ayahs ?? 0)) {
      return { surahId: s, ayahNum: a };
    }
  } catch { /* تجاهل */ }
  return null;
}

function audioUrl(reciter: string, surahId: number, ayahNum: number): string {
  return `https://everyayah.com/data/${reciter}/${String(surahId).padStart(3, "0")}${String(ayahNum).padStart(3, "0")}.mp3`;
}

export interface AudioTrack {
  surahId: number;
  ayahNum: number;
}

/** الآية التالية في ترتيب المصحف، أو null عند نهاية سورة الناس. */
export function nextAudioTrack({ surahId, ayahNum }: AudioTrack): AudioTrack | null {
  const maxAyahs = SURAHS[surahId - 1]?.ayahs ?? 0;
  if (ayahNum < maxAyahs) return { surahId, ayahNum: ayahNum + 1 };
  if (surahId < SURAHS.length) return { surahId: surahId + 1, ayahNum: 1 };
  return null;
}

export function getAudioUrl(reciter: string, track: AudioTrack): string {
  return audioUrl(reciter, track.surahId, track.ayahNum);
}

export interface AudioPlayerState {
  surahId: number;
  ayahNum: number;
  surahName: string;
  currentVerseKey: string;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  /** عدد مرات تكرار الآية الحالية (1 = بلا تكرار) */
  repeat: number;
  /** القارئ الحالي (مجلد EveryAyah) */
  reciterId: ReciterId;
}

export interface AudioPlayerControls {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  jumpTo: (surahId: number, ayahNum: number) => void;
  playFrom: (surahId: number, ayahNum: number) => void;
  setRepeat: (n: number) => void;
  setReciter: (id: ReciterId) => void;
  clearError: () => void;
}

export function useAudioPlayer(initSurahId = 1, initAyah = 1): AudioPlayerState & AudioPlayerControls {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [surahId, setSurahId] = useState(initSurahId);
  const [ayahNum, setAyahNum] = useState(initAyah);
  const [reciterId, setReciterId] = useState<ReciterId>(loadReciter);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Refs للقيم الحالية ────────────────────────────────────────────────────
  const surahIdRef = useRef(surahId);
  const ayahNumRef = useRef(ayahNum);
  const reciterRef = useRef(reciterId);
  surahIdRef.current = surahId;
  ayahNumRef.current = ayahNum;
  reciterRef.current = reciterId;

  /**
   * shouldPlayRef — نية المستخدم للتشغيل.
   * تُعيَّن true فقط بـ play() / togglePlay() / jumpTo()+wasPlaying.
   * تُعيَّن false فقط بـ pause() / togglePlay() عند التوقف.
   * لا تتأثر بأحداث DOM (pause, ended) — هذا يمنع race condition:
   * بعض المتصفحات (Safari) تُطلق `pause` قبل `ended` مما يُفسد isPlayingRef.
   */
  const shouldPlayRef = useRef(false);
  /**
   * لكل محاولة تشغيل رقم مستقل. تغيير المسار أو الإيقاف يبطل المحاولة السابقة،
   * فلا يستطيع رفض play() متأخر من الآية السابقة إيقاف الآية التالية.
   */
  const playAttemptRef = useRef(0);
  const activeSourceRef = useRef("");
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryNeedsReloadRef = useRef(false);

  // ── تكرار الآية (1x/3x/5x/10x) — refs حتى لا يُعاد ربط مستمعات DOM ────────
  const [repeat, setRepeatState] = useState(1);
  const repeatRef     = useRef(1); // العدد المطلوب
  const repeatLeftRef = useRef(1); // المتبقي للآية الحالية

  const clearStallTimer = useCallback(() => {
    if (stallTimerRef.current !== null) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  }, []);

  const failActivePlayback = useCallback((message: string, attempt = playAttemptRef.current) => {
    if (attempt !== playAttemptRef.current || !shouldPlayRef.current) return;
    shouldPlayRef.current = false;
    retryNeedsReloadRef.current = true;
    clearStallTimer();
    setError(message);
    setIsPlaying(false);
    setIsLoading(false);
  }, [clearStallTimer]);

  const armStallTimer = useCallback((audio: HTMLAudioElement, attempt: number) => {
    clearStallTimer();
    const expectedSource = activeSourceRef.current;
    stallTimerRef.current = setTimeout(() => {
      if (
        attempt !== playAttemptRef.current
        || !shouldPlayRef.current
        || audio.currentSrc !== expectedSource
      ) return;
      audio.pause();
      failActivePlayback("تأخر تحميل التلاوة من مزود الصوت. تحقق من الاتصال ثم أعد المحاولة.", attempt);
    }, 15_000);
  }, [clearStallTimer, failActivePlayback]);

  /**
   * HTMLMediaElement.play() ينتظر تلقائياً حتى يصبح المصدر قابلاً للتشغيل.
   * استدعاؤه مباشرةً يحافظ على صلاحية نقرة المستخدم، بينما رقم المحاولة يحمي
   * من رفض Promise قديم بعد تغيير src إلى آية جديدة.
   */
  const startPlayback = useCallback((audio: HTMLAudioElement) => {
    const attempt = ++playAttemptRef.current;
    setError(null);
    setIsLoading(true);
    void audio.play().catch(() => {
      failActivePlayback("تعذّر تشغيل التلاوة من مزود الصوت. أعد المحاولة.", attempt);
    });
    armStallTimer(audio, attempt);
  }, [armStallTimer, failActivePlayback]);

  // ── إنشاء عنصر الصوت مرة واحدة ─────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.preload = "auto";

    const onPlaying = () => {
      retryNeedsReloadRef.current = false;
      clearStallTimer();
      setIsLoading(false);
      setIsPlaying(true);
      setError(null);
    };
    const onPause = () => {
      // لا نُغيّر shouldPlayRef هنا — فقط الـ UI state
      setIsPlaying(false);
    };
    const onWaiting = () => {
      if (!shouldPlayRef.current) return;
      setIsLoading(true);
      armStallTimer(audio, playAttemptRef.current);
    };
    const onError   = () => {
      // لا تسمح لحدث خطأ من مصدر أُلغي للتو بأن يوقف المصدر الجديد.
      if (audio.currentSrc && audio.currentSrc !== activeSourceRef.current) return;
      failActivePlayback("تعذّر تحميل التلاوة من مزود الصوت. أعد المحاولة.");
    };
    const onEnded = () => {
      clearStallTimer();
      // shouldPlayRef.current لا يزال true — المستخدم لم يطلب التوقف
      if (!shouldPlayRef.current) return;
      // تكرار الآية: إعادة تشغيلها في مكانها دون تقدّم حتى يستنفد العدد
      if (repeatLeftRef.current > 1) {
        repeatLeftRef.current -= 1;
        audio.currentTime = 0;
        startPlayback(audio);
        return;
      }
      repeatLeftRef.current = repeatRef.current;
      const nextTrack = nextAudioTrack({
        surahId: surahIdRef.current,
        ayahNum: ayahNumRef.current,
      });
      if (nextTrack) {
        setSurahId(nextTrack.surahId);
        setAyahNum(nextTrack.ayahNum);
      } else {
        // وصل نهاية المصحف — أوقف
        shouldPlayRef.current = false;
        setIsPlaying(false);
        setIsLoading(false);
      }
    };

    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause",   onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("error",   onError);
    audio.addEventListener("ended",   onEnded);

    return () => {
      ++playAttemptRef.current;
      clearStallTimer();
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [armStallTimer, clearStallTimer, failActivePlayback, startPlayback]);

  // ── effect تبديل المسار — يعتمد shouldPlayRef لا isPlayingRef ──────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // قراءة النية قبل أي عملية، ثم إبطال كل Promise تشغيل للمصدر السابق.
    const wantPlay = shouldPlayRef.current;
    const source = getAudioUrl(reciterId, { surahId, ayahNum });
    // playFrom حمّل المصدر وبدأ التشغيل داخل نقرة المستخدم. لا نعيد تهيئة
    // العنصر هنا، وإلا قد يلغي Safari التشغيل الأول بسبب setState غير المتزامن.
    if (wantPlay && activeSourceRef.current === source && audio.src === source) return;
    ++playAttemptRef.current;
    clearStallTimer();

    // نوقف/نحمّل المصدر صراحةً حتى لا يبقى المتصفح على حالة ended للمسار السابق.
    audio.pause();
    activeSourceRef.current = source;
    audio.src = source;
    audio.load();
    retryNeedsReloadRef.current = false;

    // فصل المواضع (§45): حفظ آخر موضع استماع — مستقل عن موضع القراءة
    try { localStorage.setItem(LS_LAST_LISTEN, `${surahId}:${ayahNum}`); } catch { /* تجاهل */ }

    if (wantPlay) {
      startPlayback(audio);
    } else {
      // لا تشغيل — تحميل مسبق فقط
      setIsLoading(false);
    }
  }, [surahId, ayahNum, reciterId, clearStallTimer, startPlayback]);

  // ── الـ API ───────────────────────────────────────────────────────────────

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    shouldPlayRef.current = true;
    if (!audio.src || retryNeedsReloadRef.current) {
      const source = getAudioUrl(reciterRef.current, {
        surahId: surahIdRef.current,
        ayahNum: ayahNumRef.current,
      });
      activeSourceRef.current = source;
      audio.src = source;
      audio.load();
    }
    startPlayback(audio);
  }, [startPlayback]);

  const pause = useCallback(() => {
    shouldPlayRef.current = false;
    ++playAttemptRef.current;
    clearStallTimer();
    audioRef.current?.pause();
  }, [clearStallTimer]);

  const togglePlay = useCallback(() => {
    if (shouldPlayRef.current) pause();
    else play();
  }, [play, pause]);

  const next = useCallback(() => {
    repeatLeftRef.current = repeatRef.current;
    const max = SURAHS[surahIdRef.current - 1]?.ayahs ?? 0;
    if (ayahNumRef.current < max) {
      setAyahNum(n => n + 1);
    } else if (surahIdRef.current < SURAHS.length) {
      setSurahId(s => s + 1);
      setAyahNum(1);
    }
    // shouldPlayRef يبقى كما هو — next يحتفظ بنية التشغيل
  }, []);

  const prev = useCallback(() => {
    repeatLeftRef.current = repeatRef.current;
    if (ayahNumRef.current > 1) {
      setAyahNum(n => n - 1);
    } else if (surahIdRef.current > 1) {
      const prevId = surahIdRef.current - 1;
      setSurahId(prevId);
      setAyahNum(SURAHS[prevId - 1]?.ayahs ?? 1);
    }
    // shouldPlayRef يبقى كما هو — prev يحتفظ بنية التشغيل
  }, []);

  const jumpTo = useCallback((sId: number, aNum: number) => {
    repeatLeftRef.current = repeatRef.current;
    setSurahId(sId);
    setAyahNum(aNum);
    // shouldPlayRef يبقى كما هو — jumpTo يحتفظ بنية التشغيل
  }, []);

  /**
   * يغيّر الآية ويبدأها من داخل حدث نقرة المستخدم نفسه.
   * هذا هو المسار المستخدم عند الضغط على زر «اقرأ»؛ الاعتماد على effect
   * بعد setState وحده قد يفقد user activation في Safari/الموقع المنشور.
   */
  const playFrom = useCallback((sId: number, aNum: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    repeatLeftRef.current = repeatRef.current;
    shouldPlayRef.current = true;
    surahIdRef.current = sId;
    ayahNumRef.current = aNum;
    setSurahId(sId);
    setAyahNum(aNum);

    ++playAttemptRef.current;
    clearStallTimer();
    const source = getAudioUrl(reciterRef.current, { surahId: sId, ayahNum: aNum });
    activeSourceRef.current = source;
    retryNeedsReloadRef.current = false;
    audio.pause();
    audio.src = source;
    audio.load();
    startPlayback(audio);
  }, [clearStallTimer, startPlayback]);

  const setRepeat = useCallback((n: number) => {
    const v = Math.max(1, Math.min(10, Math.round(n)));
    repeatRef.current = v;
    repeatLeftRef.current = v;
    setRepeatState(v);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  /** تغيير القارئ — يُحفظ محلياً، والمسار يُعاد تحميله تلقائياً (effect) */
  const setReciter = useCallback((id: ReciterId) => {
    if (!RECITERS.some(r => r.id === id)) return;
    setReciterId(id);
    try { localStorage.setItem(LS_RECITER, id); } catch { /* تجاهل */ }
  }, []);

  return {
    surahId, ayahNum,
    surahName: SURAHS[surahId - 1]?.name ?? "",
    currentVerseKey: `${surahId}:${ayahNum}`,
    isPlaying, isLoading, error, repeat, reciterId,
    play, pause, togglePlay, next, prev, jumpTo, playFrom, setRepeat, setReciter, clearError,
  };
}
