import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";

type Phase = "init" | "ready" | "recording" | "preview" | "denied";

export interface VideoRecorderProps {
  maxSeconds?: number;
  minSeconds?: number;
  maxAttempts?: number;
  onRecorded: (blob: Blob, durationSeconds: number) => void;
  attemptsUsed?: number;
  onAttemptUsed?: () => void;
}

/* mp4 first where the browser supports it (Safari/iOS), webm fallback for Chrome/Firefox */
const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const toAr = (n: number): string => String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);
const mmss = (s: number): string =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/* FaceDetector is not in the TS DOM lib — minimal structural typing */
interface DetectedFace {
  boundingBox: { x: number; y: number; width: number; height: number };
}
interface FaceDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedFace[]>;
}
type FaceDetectorCtor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike;

const RING_R = 46;
const RING_C = 2 * Math.PI * RING_R;

/**
 * Advanced in-browser video recorder for the placement test.
 * Front camera + mic, hard max cutoff, min-duration guard, attempts system,
 * circular countdown ring, live audio meter, lighting check, and a face-framing guide.
 */
export default function VideoRecorder({
  maxSeconds = 60,
  minSeconds = 45,
  maxAttempts = 5,
  onRecorded,
  attemptsUsed = 0,
  onAttemptUsed,
}: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const levelBarRef = useRef<HTMLDivElement>(null);

  const lightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lightIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const faceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phaseRef = useRef<Phase>("init");
  const mountedRef = useRef(true);
  const recordGenRef = useRef(0);

  const [phase, setPhaseState] = useState<Phase>("init");
  const [remaining, setRemaining] = useState(maxSeconds);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const [tooShort, setTooShort] = useState(false);
  const [invalidFile, setInvalidFile] = useState(false);
  const [lowAudio, setLowAudio] = useState(false);
  const [dimLight, setDimLight] = useState(false);
  const [faceSupported, setFaceSupported] = useState(false);
  const [faceOk, setFaceOk] = useState(false);

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const locked = attemptsUsed >= maxAttempts;
  const attemptsLeft = Math.max(0, maxAttempts - attemptsUsed);

  /* ── teardown helpers ─────────────────────────────────────────── */

  const teardownAudio = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setLowAudio(false);
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    /* امسح srcObject من العنصر فوراً: التيار المتوقف يظل متقدماً على أي src
       يُضبط لاحقاً على العنصر نفسه، فيظهر إطار مجمّد بدل المعاينة */
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /* ── live audio level meter (AudioContext + AnalyserNode) ─────── */

  const setupAudioMeter = useCallback((stream: MediaStream) => {
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      audioCtxRef.current = ctx;

      const data = new Uint8Array(analyser.frequencyBinCount);
      let smoothed = 0;
      let lowSince: number | null = null;

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        smoothed += (Math.min(1, rms * 3.2) - smoothed) * 0.35;

        /* direct DOM update — avoids a re-render every frame */
        if (levelBarRef.current) {
          levelBarRef.current.style.width = `${Math.round(smoothed * 100)}%`;
        }

        if (phaseRef.current === "recording") {
          if (rms < 0.015) {
            if (lowSince === null) lowSince = performance.now();
            else if (performance.now() - lowSince > 4000) setLowAudio(true);
          } else {
            lowSince = null;
            setLowAudio(false);
          }
        } else {
          lowSince = null;
          setLowAudio(false);
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      /* meter is best-effort — recording must never break because of it */
    }
  }, []);

  /* ── camera ───────────────────────────────────────────────────── */

  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }
      setupAudioMeter(stream);
      setRemaining(maxSeconds);
      setPhase("ready");
    } catch {
      setPhase("denied");
    }
  }, [maxSeconds, setPhase, setupAudioMeter]);

  /* ── recorded-file integrity probe ──────────────────────────────
     Verifies the actual recorded bytes decode as video (metadata +
     real dimensions) before the file can be sent for review. A
     truncated/corrupt recording (e.g. 512-byte stub) is discarded
     WITHOUT consuming an attempt and WITHOUT being uploaded. No
     minimum-size rule — a small but valid video always passes. */

  const probeBlob = useCallback(async (b: Blob): Promise<boolean> => {
    if (b.size === 0) return false;
    return new Promise((resolve) => {
      const url = URL.createObjectURL(b);
      const v = document.createElement("video");
      v.preload = "auto";
      v.muted = true;
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        v.onloadedmetadata = null;
        v.onseeked = null;
        v.onerror = null;
        v.removeAttribute("src");
        v.load();
        URL.revokeObjectURL(url);
        resolve(ok);
      };
      const timer = window.setTimeout(() => finish(false), 10000);
      v.onerror = () => finish(false);
      v.onloadedmetadata = () => {
        if (v.videoWidth <= 0 || v.videoHeight <= 0) {
          finish(false);
          return;
        }
        if (Number.isFinite(v.duration) && v.duration <= 0) {
          finish(false);
          return;
        }
        /* إثبات الاكتمال: اطلب قراءة نهاية الملف فعلياً. ملف مبتور الذيل
           يفشل هنا (خطأ أو تجمد حتى انتهاء المهلة). فيديوهات MediaRecorder
           (webm) تبلّغ مدة Infinity؛ الطلب عند وقت ضخم يجعل المتصفح يكشف
           المدة الحقيقية ويقرأ آخر الملف. */
        v.currentTime = Number.isFinite(v.duration) && v.duration > 0
          ? Math.max(0, v.duration - 0.25)
          : 1e7;
      };
      v.onseeked = () => finish(v.currentTime > 0);
      v.src = url;
    });
  }, []);

  const finalizeRecording = useCallback(
    async (b: Blob, dur: number, gen: number) => {
      const valid = await probeBlob(b);
      /* المكوّن أُلغي أو بدأ تسجيل أحدث أثناء الفحص — تجاهل النتيجة تماماً */
      if (!mountedRef.current || gen !== recordGenRef.current) return;
      if (!valid) {
        /* invalid/truncated file: warn, keep the attempt, release the old
           capture fully, then re-open the camera */
        chunksRef.current = [];
        teardownAudio();
        stopStream();
        setInvalidFile(true);
        setRemaining(maxSeconds);
        setPhase("init");
        await openCamera();
        return;
      }
      setInvalidFile(false);
      setBlob(b);
      setDuration(dur);
      setPoster(null);
      setPreviewUrl(URL.createObjectURL(b));
      teardownAudio();
      stopStream();
      setPhase("preview");
      onAttemptUsed?.();
      onRecorded(b, dur);
    },
    [probeBlob, maxSeconds, openCamera, teardownAudio, stopStream, setPhase, onAttemptUsed, onRecorded],
  );

  /* mount: open camera (unless attempts exhausted), start lighting + face-detection loops */
  useEffect(() => {
    /* StrictMode يعيد تشغيل التأثير بعد cleanup — أعد تفعيل الحارس دائماً
       حتى لا تُهمل نتيجة فحص ملف صالح بدأ قبل إعادة التركيب */
    mountedRef.current = true;
    if (!locked) openCamera();

    /* lighting check — sample a tiny frame every 2s, compute average luminance */
    lightIntervalRef.current = setInterval(() => {
      if (phaseRef.current !== "ready" && phaseRef.current !== "recording") return;
      const v = videoRef.current;
      if (!v || v.readyState < 2 || !v.videoWidth) return;
      const c = lightCanvasRef.current ?? (lightCanvasRef.current = document.createElement("canvas"));
      c.width = 32;
      c.height = 18;
      const g = c.getContext("2d", { willReadFrequently: true });
      if (!g) return;
      try {
        g.drawImage(v, 0, 0, 32, 18);
        const d = g.getImageData(0, 0, 32, 18).data;
        let lum = 0;
        for (let i = 0; i < d.length; i += 4) {
          lum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        }
        setDimLight(lum / (d.length / 4) < 45);
      } catch {
        /* ignore frame sampling errors */
      }
    }, 2000);

    /* face framing — only where the browser exposes FaceDetector */
    const FD = (window as unknown as { FaceDetector?: FaceDetectorCtor }).FaceDetector;
    if (FD) {
      setFaceSupported(true);
      try {
        const detector = new FD({ fastMode: true, maxDetectedFaces: 1 });
        faceIntervalRef.current = setInterval(() => {
          if (phaseRef.current !== "ready") return;
          const v = videoRef.current;
          if (!v || v.readyState < 2 || !v.videoWidth) return;
          detector
            .detect(v)
            .then((faces) => setFaceOk(faces.length > 0))
            .catch(() => {});
        }, 1000);
      } catch {
        /* static guide only */
      }
    }

    return () => {
      mountedRef.current = false;
      recordGenRef.current += 1; /* يُبطل أي فحص ملف جارٍ */
      clearTimer();
      teardownAudio();
      stopStream();
      if (lightIntervalRef.current) clearInterval(lightIntervalRef.current);
      if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
      if (recRef.current && recRef.current.state !== "inactive") {
        try {
          recRef.current.onstop = null;
          recRef.current.stop();
        } catch {
          /* ignore */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* revoke preview object URL when replaced / unmounted */
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  /* ── recording ────────────────────────────────────────────────── */

  const stopRecording = useCallback(() => {
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    clearTimer();
  }, [clearTimer]);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    recordGenRef.current += 1;
    setTooShort(false);
    setInvalidFile(false);
    setLowAudio(false);
    chunksRef.current = [];

    let rec: MediaRecorder;
    try {
      const mime = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
      rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      rec = new MediaRecorder(stream);
    }
    recRef.current = rec;

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      clearTimer();
      const dur = Math.min(
        maxSeconds,
        Math.round((Date.now() - startedAtRef.current) / 1000),
      );

      /* shorter than the minimum — discard, warn, stay ready, no attempt consumed */
      if (dur < minSeconds) {
        setTooShort(true);
        setRemaining(maxSeconds);
        setPhase("ready");
        return;
      }

      const b = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
      void finalizeRecording(b, dur, recordGenRef.current);
    };

    startedAtRef.current = Date.now();
    setRemaining(maxSeconds);
    rec.start(1000);
    setPhase("recording");

    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil(maxSeconds - (Date.now() - startedAtRef.current) / 1000));
      setRemaining(left);
      if (left <= 0) stopRecording();
    }, 250);
  }, [maxSeconds, minSeconds, clearTimer, teardownAudio, stopStream, stopRecording, setPhase, onRecorded, onAttemptUsed]);

  const reRecord = useCallback(async () => {
    setBlob(null);
    setPoster(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPhase("init");
    await openCamera();
  }, [openCamera, previewUrl, setPhase]);

  /* ── auto-generated thumbnail from the first preview frame ────── */

  const capturePoster = useCallback((v: HTMLVideoElement) => {
    try {
      if (!v.videoWidth) return;
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const g = c.getContext("2d");
      if (!g) return;
      g.drawImage(v, 0, 0, c.width, c.height);
      setPoster(c.toDataURL("image/jpeg", 0.72));
    } catch {
      /* poster is cosmetic */
    }
  }, []);

  /* ── render ───────────────────────────────────────────────────── */

  if (locked) {
    return (
      <div className="rounded-3xl border border-[rgba(212,175,55,0.3)] bg-gradient-to-b from-[rgba(128,0,32,0.05)] to-[rgba(212,175,55,0.05)] dark:from-white/5 dark:to-[rgba(212,175,55,0.1)] p-8 text-center stagger-in">
        <div className="w-20 h-20 mx-auto rounded-full bg-[rgba(128,0,32,0.1)] dark:bg-[rgba(212,175,55,0.15)] flex items-center justify-center text-burgundy mb-5 spring-pop">
          <Icon name="shield" size={38} />
        </div>
        <p className="font-amiri text-2xl font-extrabold text-burgundy">انتهت المحاولات</p>
        <p className="font-tajawal text-sm text-muted-foreground mt-2 leading-relaxed">
          استُخدمت جميع المحاولات المتاحة لاختبار القبول ({toAr(maxAttempts)} محاولات).
          <br />
          للحصول على محاولة إضافية، يرجى التواصل مع الإدارة.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[rgba(212,175,55,0.15)] text-gold-dark dark:text-gold font-tajawal text-xs font-bold px-4 py-2">
          <Icon name="help" size={15} />
          تواصل مع الإدارة لإعادة فتح المحاولات
        </div>
      </div>
    );
  }

  if (phase === "denied") {
    return (
      <div className="rounded-3xl bg-destructive/10 border border-destructive/30 p-7 text-center stagger-in">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-destructive/15 flex items-center justify-center text-destructive mb-4">
          <Icon name="video-off" size={30} />
        </div>
        <p className="font-amiri text-xl font-extrabold text-destructive">لم نتمكن من الوصول إلى الكاميرا</p>
        <p className="font-tajawal text-sm text-muted-foreground mt-2 leading-relaxed">
          اسمح للتطبيق باستخدام الكاميرا والميكروفون من إعدادات المتصفح، ثم أعد المحاولة
        </p>
        <button
          onClick={openCamera}
          className="mt-5 inline-flex items-center gap-2 bg-burgundy text-white dark:bg-gold dark:text-night font-tajawal text-sm font-extrabold px-6 py-2.5 rounded-full btn-press transition"
        >
          <Icon name="camera" size={16} />
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const ringProgress = remaining / maxSeconds;

  return (
    <div className="stagger-in">
      {/* attempts pill — تظهر فقط بعد استهلاك أول محاولة (عند الحاجة) */}
      {attemptsUsed > 0 && (
        <div className="mb-3 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(128,0,32,0.07)] dark:bg-[rgba(212,175,55,0.1)] border border-[rgba(128,0,32,0.15)] dark:border-[rgba(212,175,55,0.25)] text-burgundy font-tajawal text-xs font-extrabold px-4 py-1.5">
            <Icon name="video" size={14} />
            المحاولات المتبقية: {toAr(attemptsLeft)} من {toAr(maxAttempts)}
          </span>
        </div>
      )}

      {/* preview area — مساحة أكبر قليلاً بإطار ذهبي متناسق مع الهوية */}
      <div className="relative rounded-3xl overflow-hidden bg-[#1a1a2e] aspect-[3/4] shadow-2xl ring-2 ring-[rgba(212,175,55,0.35)]" /* check-colors-ignore */>
        {phase === "preview" && previewUrl ? (
          /* key مختلف عن عنصر الكاميرا الحيّة: بلا مفتاح يعيد React استخدام
             نفس عقدة DOM، فيبقى srcObject (البث الحي) عالقاً عليها — وهو
             يتقدّم على src فيتجمد إطار الكاميرا ويصمت صوت المعاينة (muted) */
          <video
            key="recorded-preview"
            src={previewUrl}
            poster={poster ?? undefined}
            controls
            playsInline
            preload="metadata"
            onLoadedData={(e) => {
              if (!poster) capturePoster(e.currentTarget);
            }}
            className="w-full h-full object-contain"
          />
        ) : (
          <video key="live-camera" ref={videoRef} playsInline muted className="w-full h-full object-cover -scale-x-100" />
        )}

        {/* camera hint chip — visible before recording only (clean real-camera preview, no center guide) */}
        {phase === "ready" && (
          <div className="absolute inset-x-0 top-3 flex justify-center pointer-events-none">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-sm font-tajawal text-xs font-bold px-3.5 py-1.5 transition-colors duration-500 ${
                faceSupported && faceOk ? "text-emerald-300" : "text-gold"
              }`}
            >
              {faceSupported && faceOk && <Icon name="check" size={13} />}
              {faceSupported && faceOk ? "رائع — وجهك واضح في الكاميرا" : "تأكد أن وجهك ظاهر بوضوح"}
            </span>
          </div>
        )}

        {/* REC badge */}
        {phase === "recording" && (
          <div className="absolute top-3 start-3">
            <span className="recording-banner flex items-center gap-1.5 text-red-400 font-tajawal text-xs font-extrabold px-3 py-1.5 rounded-full backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              REC — جارٍ التسجيل
            </span>
          </div>
        )}

        {/* floating warning chips */}
        {(phase === "ready" || phase === "recording") && (lowAudio || dimLight) && (
          <div className="absolute bottom-3 inset-x-3 flex flex-col items-center gap-2 pointer-events-none">
            {lowAudio && phase === "recording" && (
              <span className="animate-in slide-in-from-bottom-2 inline-flex items-center gap-1.5 rounded-full bg-black/65 backdrop-blur-sm text-amber-300 font-tajawal text-xs font-bold px-3.5 py-1.5">
                <Icon name="mic" size={13} />
                الصوت منخفض — ارفع صوتك أو قرّب الهاتف
              </span>
            )}
            {dimLight && (
              <span className="animate-in slide-in-from-bottom-2 inline-flex items-center gap-1.5 rounded-full bg-black/65 backdrop-blur-sm text-gold font-tajawal text-xs font-bold px-3.5 py-1.5">
                <Icon name="sun" size={13} />
                الإضاءة منخفضة — انتقل لمكان أكثر إضاءة
              </span>
            )}
          </div>
        )}

        {/* watermark on preview */}
        {phase === "preview" && (
          <span dir="ltr" className="absolute bottom-3 left-3 text-white/50 font-tajawal text-[10px] font-bold tracking-wide pointer-events-none">
            Tabyan © 2026
          </span>
        )}

        {phase === "init" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
            <div className="w-10 h-10 rounded-full border-2 border-[rgba(212,175,55,0.4)] border-t-gold animate-spin" />
            <span className="font-tajawal text-sm font-bold">جارٍ تشغيل الكاميرا…</span>
          </div>
        )}
      </div>

      {/* live audio level bar */}
      {(phase === "ready" || phase === "recording") && (
        <div className="mt-3 flex items-center gap-2.5 px-1">
          <Icon name="mic" size={14} className="text-muted-foreground shrink-0" />
          <div className="flex-1 h-1.5 rounded-full bg-[rgba(128,0,32,0.1)] dark:bg-white/10 overflow-hidden">
            <div
              ref={levelBarRef}
              className="h-full rounded-full bg-gradient-to-l from-gold via-amber-400 to-emerald-400 transition-[width] duration-100"
              style={{ width: "0%" }}
            />
          </div>
        </div>
      )}

      {/* too-short inline warning */}
      {tooShort && phase === "ready" && (
        <div className="mt-3 animate-in slide-in-from-bottom-2 flex items-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-tajawal text-xs font-bold px-4 py-2.5">
          <Icon name="clock" size={15} className="shrink-0" />
          التسجيل أقصر من {toAr(minSeconds)} ثانية — أعد التسجيل
        </div>
      )}

      {/* corrupt/truncated file warning — the recording bytes were discarded
          before upload; the attempt is preserved */}
      {invalidFile && phase === "ready" && (
        <div className="mt-3 animate-in slide-in-from-bottom-2 flex items-center gap-2 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive font-tajawal text-xs font-bold px-4 py-2.5">
          <Icon name="alert-triangle" size={15} className="shrink-0" />
          تعذّر قراءة التسجيل — قد يكون انقطع أثناء الحفظ. أعد التسجيل من جديد (لم تُحتسب محاولة).
        </div>
      )}

      {/* controls */}
      <div className="mt-5 flex flex-col items-center gap-3">
        {phase === "ready" && (
          <>
            <button
              onClick={startRecording}
              aria-label="ابدأ التسجيل"
              className="group relative w-[68px] h-[68px] rounded-full btn-press transition-transform duration-200 active:scale-90"
            >
              {/* هالة ذهبية خفيفة */}
              <span className="absolute -inset-2 rounded-full border border-[rgba(212,175,55,0.35)] group-hover:border-[rgba(212,175,55,0.65)] transition-colors duration-300" />
              {/* حلقة زجاجية خارجية بنمط زر كاميرا آيفون */}
              <span className="absolute inset-0 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-md border-[3.5px] border-white/90 dark:border-white/70 shadow-[0_10px_28px_-8px_rgba(0,0,0,0.45)] transition-transform duration-300 group-hover:scale-105" />
              {/* قرص التسجيل الداخلي مع أيقونة كاميرا واضحة */}
              <span className="absolute inset-[7px] rounded-full bg-gradient-to-br from-[#E5484D] to-[#A71B25] shadow-[inset_0_2px_5px_rgba(255,255,255,0.35),inset_0_-3px_6px_rgba(0,0,0,0.35)] flex items-center justify-center" /* check-colors-ignore */>
                <Icon name="video" size={18} className="text-white drop-shadow-sm" />
              </span>
            </button>
            <p className="font-tajawal text-xs font-bold text-muted-foreground">
              اضغط لبدء التسجيل — المدة من {toAr(minSeconds)} إلى {toAr(maxSeconds)} ثانية
            </p>
          </>
        )}

        {phase === "recording" && (
          <button onClick={stopRecording} aria-label="إيقاف التسجيل" className="relative w-[104px] h-[104px] btn-press">
            <svg width="104" height="104" viewBox="0 0 104 104" className="absolute inset-0 -rotate-90">
              <circle cx="52" cy="52" r={RING_R} fill="none" strokeWidth="6" className="stroke-[rgba(128,0,32,0.12)] dark:stroke-[rgba(212,175,55,0.16)]" />
              <circle
                cx="52"
                cy="52"
                r={RING_R}
                fill="none"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - ringProgress)}
                className={`transition-all duration-300 ${remaining <= 10 ? "stroke-red-500" : "stroke-[var(--svg-primary)]"}`}
              />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <span className="w-5 h-5 rounded-[5px] bg-white shadow" />
              <span
                dir="ltr"
                className={`font-tajawal text-xs font-extrabold tabular-nums ${remaining <= 10 ? "text-red-500" : "text-foreground"}`}
              >
                {mmss(remaining)}
              </span>
            </span>
          </button>
        )}

        {phase === "preview" && blob && (
          <div className="w-full space-y-3">
            <div className="flex items-center justify-center gap-4 text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-tajawal text-xs font-bold">
                <Icon name="clock" size={14} />
                المدة: <span dir="ltr">{mmss(duration)}</span>
              </span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              <span className="inline-flex items-center gap-1.5 font-tajawal text-xs font-bold">
                <Icon name="download" size={14} />
                الحجم: ≈ {(blob.size / 1048576).toFixed(1)} م.ب
              </span>
            </div>
            {attemptsLeft > 0 && (
              <div className="flex justify-center">
                <button
                  onClick={reRecord}
                  className="inline-flex items-center gap-2 bg-[rgba(128,0,32,0.1)] dark:bg-white/10 text-burgundy font-tajawal text-sm font-extrabold px-6 py-2.5 rounded-full btn-press transition hover:bg-[rgba(128,0,32,0.15)] dark:hover:bg-white/15"
                >
                  <Icon name="camera" size={16} />
                  إعادة التسجيل
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
