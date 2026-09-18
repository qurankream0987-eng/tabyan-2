/**
 * RecitationFlow — يدير الانتقال بين خطوات التسميع الثلاث:
 * setup → session → result
 * يُعرض كـ portal فوق كل محتوى الصفحة
 */
import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import Icon from "@/components/app/Icon";
import { useToast } from "@/hooks/useToast";
import { SURAHS } from "@/lib/quran-data";
import {
  HIDE_MODE_LABELS,
  HIDE_MODE_DESC,
  toArabicNum,
  type AyahData,
  type HideMode,
  type SessionMode,
} from "@/lib/recitation-types";
import RecitationSession from "./RecitationSession";
import RecitationResult from "./RecitationResult";
import { normalizeDigits } from "@workspace/tabyan-trpc/input-normalization";

interface RecitationFlowProps {
  onClose: () => void;
  /** إذا كان role=student يُتاح وضع التسميع التعليمي */
  isStudent?: boolean;
}

type FlowState =
  | { step: "setup" }
  | { step: "loading" }
  | {
      step: "session";
      sessionId: string;
      surahId: number;
      surahName: string;
      startAyah: number;
      endAyah: number;
      hideMode: HideMode;
      mode: SessionMode;
      ayahs: AyahData[];
    }
  | {
      step: "result";
      durationSeconds: number;
      surahName: string;
      startAyah: number;
      endAyah: number;
      hideMode: HideMode;
      mode: SessionMode;
    };

export default function RecitationFlow({ onClose, isStudent = true }: RecitationFlowProps) {
  const [state, setState] = useState<FlowState>({ step: "setup" });
  const navigate = useNavigate();

  const handleSessionEnd = useCallback(
    (
      durationSeconds: number,
      surahName: string,
      startAyah: number,
      endAyah: number,
      hideMode: HideMode,
      mode: SessionMode,
    ) => {
      setState({ step: "result", durationSeconds, surahName, startAyah, endAyah, hideMode, mode });
    },
    [],
  );

  if (state.step === "setup" || state.step === "loading") {
    return (
      <SetupStep
        isLoading={state.step === "loading"}
        isStudent={isStudent}
        onConfirm={(params) => {
          setState({ step: "loading" });
          // الانتقال يتم داخل SetupStep عبر onConfirm
          // نُحدّث state داخل الـ callback
          params.then((resolved) => {
            if (resolved) setState({ step: "session", ...resolved });
            else setState({ step: "setup" }); // في حالة الخطأ
          });
        }}
        onClose={onClose}
      />
    );
  }

  if (state.step === "session") {
    const { sessionId, surahId, surahName, startAyah, endAyah, hideMode, mode, ayahs } = state;
    return (
      <RecitationSession
        sessionId={sessionId}
        surahName={surahName}
        surahId={surahId}
        startAyah={startAyah}
        endAyah={endAyah}
        hideMode={hideMode}
        ayahs={ayahs}
        onEnd={(dur) => handleSessionEnd(dur, surahName, startAyah, endAyah, hideMode, mode)}
        onAbandon={onClose}
      />
    );
  }

  if (state.step === "result") {
    const { durationSeconds, surahName, startAyah, endAyah, hideMode, mode } = state;
    return (
      <RecitationResult
        durationSeconds={durationSeconds}
        surahName={surahName}
        startAyah={startAyah}
        endAyah={endAyah}
        hideMode={hideMode}
        mode={mode}
        onClose={onClose}
        onNewSession={() => setState({ step: "setup" })}
        onViewHistory={() => {
          onClose();
          navigate("/student/recitation/history");
        }}
      />
    );
  }

  return null;
}

// ── شاشة الإعداد ─────────────────────────────────────────────────────────────
type SetupParams = Promise<{
  sessionId: string;
  surahId: number;
  surahName: string;
  startAyah: number;
  endAyah: number;
  hideMode: HideMode;
  mode: SessionMode;
  ayahs: AyahData[];
} | null>;

function SetupStep({
  isLoading,
  isStudent,
  onConfirm,
  onClose,
}: {
  isLoading: boolean;
  isStudent: boolean;
  onConfirm: (params: SetupParams) => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [surahId, setSurahId] = useState(1);
  const [startAyah, setStartAyah] = useState(1);
  const [endAyah, setEndAyah] = useState(7);
  const [hideMode, setHideMode] = useState<HideMode>("full_hide");
  const [mode, setMode] = useState<SessionMode>("general");

  const selectedSurah = SURAHS.find((s) => s.n === surahId) ?? SURAHS[0];
  const maxAyah = selectedSurah.ayahs;

  const startMut = trpc.recitation.start.useMutation();

  const handleSurahChange = (id: number) => {
    const s = SURAHS.find((x) => x.n === id);
    if (!s) return;
    setSurahId(id);
    setStartAyah(1);
    setEndAyah(Math.min(10, s.ayahs));
  };

  const handleStart = () => {
    if (startAyah < 1 || endAyah < startAyah || endAyah > maxAyah) {
      toast("تحقق من نطاق الآيات", "error");
      return;
    }
    const surahName = selectedSurah.name;

    const promise: SetupParams = (async () => {
      try {
        // نبدأ الجلسة وجلب النصوص بالتوازي
        const startInput = mode === "general"
          ? {
              mode: "general" as const,
              startContext: { startVerseKey: `${surahId}:${startAyah}` },
              hideMode,
            }
          : {
              mode: "educational" as const,
              expectedRange: {
                start: { surahId, ayah: startAyah },
                end: { surahId, ayah: endAyah },
              },
              hideMode,
            };
        const [{ sessionId }, ayahsData] = await Promise.all([
          startMut.mutateAsync(startInput),
          hideMode !== "full_hide"
            ? utils.recitation.getAyahs
                .fetch({ surahId, startAyah, endAyah })
                .catch(() => [] as AyahData[])
            : Promise.resolve([] as AyahData[]),
        ]);
        return { sessionId, surahId, surahName, startAyah, endAyah, hideMode, mode, ayahs: ayahsData };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "تعذر بدء الجلسة";
        toast(msg, "error");
        return null;
      }
    })();

    onConfirm(promise);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between px-4 pt-safe-top pt-4 pb-3 border-b border-border/40 shrink-0">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-burgundy/5 dark:hover:bg-gold/5 transition btn-press"
        >
          <Icon name="x" size={18} className="text-muted-foreground" />
        </button>
        <h1 className="font-amiri text-xl font-bold text-burgundy">إعداد جلسة التسميع</h1>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {/* نوع الجلسة */}
        {isStudent && (
          <section className="space-y-2">
            <label className="font-readex text-sm font-bold text-foreground">نوع الجلسة</label>
            <div className="grid grid-cols-2 gap-2">
              {(["general", "educational"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`py-3 rounded-xl font-readex text-sm font-bold border transition btn-press ${
                    mode === m
                      ? "bg-burgundy text-white dark:bg-gold dark:text-burgundy border-transparent shadow"
                      : "border-border text-muted-foreground hover:border-burgundy/30 dark:hover:border-gold/30"
                  }`}
                >
                  {m === "general" ? "🎙 تسميع عام" : "📚 تعليمي"}
                </button>
              ))}
            </div>
            {mode === "educational" && (
              <p className="font-readex text-[11px] text-muted-foreground">
                سيظهر هذا التسميع في ملفك عند معلمك
              </p>
            )}
          </section>
        )}

        {/* اختيار السورة */}
        <section className="space-y-2">
          <label className="font-readex text-sm font-bold text-foreground">السورة</label>
          <select
            value={surahId}
            onChange={(e) => handleSurahChange(Number(e.target.value))}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 font-readex text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-burgundy/30 dark:focus:ring-gold/30 text-right"
            dir="rtl"
          >
            {SURAHS.map((s) => (
              <option key={s.n} value={s.n}>
                {toArabicNum(s.n)}. {s.name} — {toArabicNum(s.ayahs)} آية
              </option>
            ))}
          </select>
        </section>

        {/* نطاق الآيات */}
        <section className="space-y-2">
          <label className="font-readex text-sm font-bold text-foreground">
            نطاق الآيات
            <span className="text-muted-foreground font-normal mr-2">
              (السورة تحتوي {toArabicNum(maxAyah)} آية)
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-readex text-[11px] text-muted-foreground mb-1 block">من آية</label>
              <input
                type="text"
                inputMode="numeric"
                minLength={1}
                value={startAyah}
                onChange={(e) => {
                  const raw = normalizeDigits(e.target.value).replace(/\D/g, "");
                  if (!raw) return;
                  const v = Math.max(1, Math.min(maxAyah, Number(raw)));
                  setStartAyah(v);
                  if (endAyah < v) setEndAyah(v);
                }}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 font-readex text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-burgundy/30 dark:focus:ring-gold/30 text-center"
              />
            </div>
            <div>
              <label className="font-readex text-[11px] text-muted-foreground mb-1 block">إلى آية</label>
              <input
                type="text"
                inputMode="numeric"
                minLength={1}
                value={endAyah}
                onChange={(e) => {
                  const raw = normalizeDigits(e.target.value).replace(/\D/g, "");
                  if (raw) setEndAyah(Math.max(startAyah, Math.min(maxAyah, Number(raw))));
                }}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 font-readex text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-burgundy/30 dark:focus:ring-gold/30 text-center"
              />
            </div>
          </div>
          {endAyah > startAyah && (
            <p className="font-readex text-[11px] text-muted-foreground">
              {toArabicNum(endAyah - startAyah + 1)} آية محددة
            </p>
          )}
        </section>

        {/* وضع الإخفاء */}
        <section className="space-y-2">
          <label className="font-readex text-sm font-bold text-foreground">وضع الإخفاء</label>
          <div className="space-y-2">
            {(["full_hide", "first_word", "progressive_reveal", "visible_review"] as const).map((hm) => (
              <button
                key={hm}
                onClick={() => setHideMode(hm)}
                className={`w-full text-right rounded-xl border px-4 py-3 transition btn-press ${
                  hideMode === hm
                    ? "border-burgundy dark:border-gold bg-burgundy/5 dark:bg-gold/5"
                    : "border-border hover:border-burgundy/30 dark:hover:border-gold/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                    hideMode === hm ? "border-burgundy dark:border-gold" : "border-muted-foreground/30"
                  }`}>
                    {hideMode === hm && (
                      <div className="w-2.5 h-2.5 rounded-full bg-burgundy dark:bg-gold" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-readex text-sm font-bold text-foreground">{HIDE_MODE_LABELS[hm]}</div>
                    <div className="font-readex text-[11px] text-muted-foreground mt-0.5">{HIDE_MODE_DESC[hm]}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* زر البدء */}
      <div className="shrink-0 border-t border-border/40 px-4 pb-safe-bottom pb-6 pt-4">
        <button
          onClick={handleStart}
          disabled={isLoading || startMut.isPending}
          className="w-full py-4 rounded-2xl bg-burgundy text-white font-readex font-bold text-base btn-press hover:bg-burgundy/90 transition flex items-center justify-center gap-2 shadow disabled:opacity-60"
        >
          {isLoading || startMut.isPending ? (
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
  );
}
