/**
 * RecitationSession — الجلسة النشطة (Phase 1A)
 * أوضاع الإخفاء الأربعة: full_hide / first_word / progressive_reveal / visible_review
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { trpc } from "@/providers/trpc";
import Icon from "@/components/app/Icon";
import { useToast } from "@/hooks/useToast";
import {
  HIDE_MODE_LABELS,
  formatDuration,
  toArabicNum,
  type AyahData,
  type HideMode,
} from "@/lib/recitation-types";

interface RecitationSessionProps {
  sessionId: string;
  surahName: string;
  surahId: number;
  startAyah: number;
  endAyah: number;
  hideMode: HideMode;
  ayahs: AyahData[];          // نصوص الآيات مُجلَبة مسبقاً
  onEnd: (durationSeconds: number) => void;
  onAbandon: () => void;      // إلغاء بدون حفظ (نادراً ما يُستخدم)
}

export default function RecitationSession({
  sessionId,
  surahName,
  startAyah,
  endAyah,
  hideMode,
  ayahs,
  onEnd,
  onAbandon,
}: RecitationSessionProps) {
  const { toast } = useToast();
  const [elapsed, setElapsed] = useState(0);       // ثواني منذ بدء الجلسة (يتوقف عند pause)
  const [isPaused, setIsPaused] = useState(false);
  const [showAbandon, setShowAbandon] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // للكشف التدريجي: عدد الكلمات المكشوفة لكل آية
  const [revealedWords, setRevealedWords] = useState<Record<number, number>>(() =>
    Object.fromEntries(ayahs.map((a) => [a.numberInSurah, 0]))
  );

  // المؤقت
  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPaused]);

  const pauseMut = trpc.recitation.pause.useMutation({
    onError: (e) => toast(e.message, "error"),
  });
  const resumeMut = trpc.recitation.resume.useMutation({
    onError: (e) => toast(e.message, "error"),
  });
  const endMut = trpc.recitation.end.useMutation({
    onSuccess: (data) => onEnd(data.durationSeconds),
    onError: (e) => toast(e.message, "error"),
  });

  const handlePause = useCallback(async () => {
    setIsPaused(true);
    await pauseMut.mutateAsync({ sessionId });
  }, [pauseMut, sessionId]);

  const handleResume = useCallback(async () => {
    setIsPaused(false);
    await resumeMut.mutateAsync({ sessionId });
  }, [resumeMut, sessionId]);

  const handleEnd = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    endMut.mutate({ sessionId });
  }, [endMut, sessionId]);

  const revealNextWord = useCallback((ayahNum: number, totalWords: number) => {
    setRevealedWords((prev) => {
      const current = prev[ayahNum] ?? 0;
      if (current >= totalWords) return prev;
      return { ...prev, [ayahNum]: current + 1 };
    });
  }, []);

  const revealAll = useCallback((ayahNum: number) => {
    setRevealedWords((prev) => {
      const ayah = ayahs.find((a) => a.numberInSurah === ayahNum);
      if (!ayah) return prev;
      return { ...prev, [ayahNum]: ayah.words.length };
    });
  }, [ayahs]);

  const ayahRange =
    startAyah === endAyah
      ? `آية ${toArabicNum(startAyah)}`
      : `${toArabicNum(startAyah)}–${toArabicNum(endAyah)}`;

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-background" dir="rtl">
      {/* شريط أعلى — معلومات الجلسة والمؤقت */}
      <div className="flex items-center justify-between px-4 pt-safe-top pt-4 pb-3 border-b border-border/40 bg-background/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          {/* أيقونة الميكروفون */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition ${isPaused ? "bg-muted text-muted-foreground" : "bg-burgundy/10 text-burgundy animate-pulse"}`}>
            <Icon name="mic" size={15} />
          </div>
          <div>
            <div className="font-amiri text-base font-bold text-burgundy leading-tight">{surahName}</div>
            <div className="font-readex text-[11px] text-muted-foreground">{ayahRange} · {HIDE_MODE_LABELS[hideMode]}</div>
          </div>
        </div>

        {/* المؤقت */}
        <div className={`font-mono text-xl font-bold transition ${isPaused ? "text-muted-foreground" : "text-burgundy"}`} dir="ltr">
          {formatDuration(elapsed)}
        </div>
      </div>

      {/* منطقة الآيات */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {ayahs.length === 0 ? (
          /* وضع إخفاء كامل بدون نص */
          <div className="space-y-4 pt-8">
            {Array.from({ length: endAyah - startAyah + 1 }, (_, i) => (
              <div key={i} className="space-y-2">
                <div className="font-readex text-xs text-muted-foreground text-center">
                  الآية {toArabicNum(startAyah + i)}
                </div>
                <div className="flex justify-center gap-2">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-1 w-10 rounded-full bg-burgundy/20 dark:bg-gold/20" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          ayahs.map((ayah) => (
            <AyahDisplay
              key={ayah.numberInSurah}
              ayah={ayah}
              hideMode={hideMode}
              revealedCount={revealedWords[ayah.numberInSurah] ?? 0}
              onRevealNext={() => revealNextWord(ayah.numberInSurah, ayah.words.length)}
              onRevealAll={() => revealAll(ayah.numberInSurah)}
            />
          ))
        )}

        {/* مساحة في الأسفل فوق الأزرار */}
        <div className="h-32" />
      </div>

      {/* شريط أسفل — أزرار التحكم */}
      <div className="shrink-0 border-t border-border/40 bg-background/95 backdrop-blur-sm px-4 pb-safe-bottom pb-6 pt-4 space-y-2">
        {/* pause / resume */}
        {isPaused ? (
          <button
            onClick={handleResume}
            disabled={resumeMut.isPending}
            className="w-full py-4 rounded-2xl bg-gold text-burgundy font-readex font-bold text-base btn-press hover:bg-gold/90 transition flex items-center justify-center gap-2 shadow"
          >
            <Icon name="play" size={18} />
            {resumeMut.isPending ? "جارٍ الاستئناف…" : "استئناف التسميع"}
          </button>
        ) : (
          <button
            onClick={handlePause}
            disabled={pauseMut.isPending}
            className="w-full py-4 rounded-2xl bg-burgundy/10 dark:bg-gold/10 text-burgundy font-readex font-bold text-base btn-press hover:bg-burgundy/15 dark:hover:bg-gold/15 transition flex items-center justify-center gap-2"
          >
            <Icon name="pause" size={18} />
            {pauseMut.isPending ? "جارٍ الإيقاف…" : "إيقاف مؤقت"}
          </button>
        )}

        {/* إنهاء الجلسة */}
        <button
          onClick={handleEnd}
          disabled={endMut.isPending}
          className="w-full py-3.5 rounded-2xl bg-burgundy text-white font-readex font-bold text-sm btn-press hover:bg-burgundy/90 transition flex items-center justify-center gap-2"
        >
          <Icon name="check-circle" size={16} />
          {endMut.isPending ? "جارٍ الحفظ…" : "إنهاء الجلسة"}
        </button>

        {/* رابط الإلغاء الهادئ */}
        <button
          onClick={() => setShowAbandon(true)}
          className="w-full py-2 text-muted-foreground font-readex text-xs hover:text-destructive transition text-center"
        >
          إلغاء الجلسة بدون حفظ
        </button>
      </div>

      {/* نافذة تأكيد الإلغاء */}
      {showAbandon && (
        <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowAbandon(false)}>
          <div className="w-full max-w-sm glass rounded-[1.5rem] p-5 space-y-3 mb-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-amiri text-xl text-burgundy text-center font-bold">إلغاء الجلسة؟</h3>
            <p className="font-readex text-sm text-muted-foreground text-center">
              لن يُحفظ التسميع هذا في سجلك
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { if (intervalRef.current) clearInterval(intervalRef.current); onAbandon(); }}
                className="flex-1 py-3 rounded-2xl bg-destructive text-white font-readex font-bold text-sm btn-press"
              >
                إلغاء الجلسة
              </button>
              <button
                onClick={() => setShowAbandon(false)}
                className="flex-1 py-3 rounded-2xl bg-burgundy/10 dark:bg-white/10 text-burgundy font-readex font-bold text-sm btn-press"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── مكوّن عرض آية واحدة مع وضع الإخفاء ─────────────────────────────────────
function AyahDisplay({
  ayah,
  hideMode,
  revealedCount,
  onRevealNext,
  onRevealAll,
}: {
  ayah: AyahData;
  hideMode: HideMode;
  revealedCount: number;
  onRevealNext: () => void;
  onRevealAll: () => void;
}) {
  const allRevealed = revealedCount >= ayah.words.length;

  return (
    <div className="rounded-2xl bg-burgundy/3 dark:bg-gold/3 border border-border/30 p-4 space-y-3">
      {/* رقم الآية */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-burgundy/10 dark:bg-gold/10 flex items-center justify-center shrink-0">
          <span className="font-readex text-xs text-burgundy">{toArabicNum(ayah.numberInSurah)}</span>
        </div>
        <div className="flex-1 h-px bg-border/30" />
      </div>

      {/* محتوى الآية حسب وضع الإخفاء */}
      {hideMode === "full_hide" && (
        <div className="flex flex-wrap gap-2 justify-center py-2">
          {[...Array(Math.min(ayah.words.length, 6))].map((_, i) => (
            <div key={i} className="h-1.5 rounded-full bg-burgundy/15 dark:bg-gold/15"
              style={{ width: `${28 + (i % 3) * 16}px` }} />
          ))}
        </div>
      )}

      {hideMode === "first_word" && (
        <div className="text-center space-y-1">
          <p className="font-amiri text-2xl text-foreground leading-loose tracking-wide">
            {ayah.words[0] ?? ""}
            {ayah.words.length > 1 && (
              <span className="text-muted-foreground/50 text-lg ml-2">· · ·</span>
            )}
          </p>
          {ayah.words.length <= 1 && (
            <p className="font-readex text-xs text-muted-foreground">آية من كلمة واحدة</p>
          )}
        </div>
      )}

      {hideMode === "progressive_reveal" && (
        <div className="space-y-3">
          {/* الكلمات المكشوفة */}
          {revealedCount > 0 && (
            <p className="font-amiri text-2xl text-foreground leading-loose tracking-wide text-center">
              {ayah.words.slice(0, revealedCount).join(" ")}
              {!allRevealed && (
                <span className="text-muted-foreground/40 text-lg ml-2">· · ·</span>
              )}
            </p>
          )}
          {revealedCount === 0 && (
            <div className="flex flex-wrap gap-2 justify-center py-1">
              {[...Array(Math.min(ayah.words.length, 5))].map((_, i) => (
                <div key={i} className="h-1.5 rounded-full bg-burgundy/15 dark:bg-gold/15"
                  style={{ width: `${32 + (i % 3) * 12}px` }} />
              ))}
            </div>
          )}
          {/* أزرار الكشف */}
          {!allRevealed && (
            <div className="flex gap-2">
              <button
                onClick={onRevealNext}
                className="flex-1 py-2 rounded-xl bg-burgundy/10 dark:bg-gold/10 text-burgundy font-readex text-xs font-bold btn-press hover:bg-burgundy/15 dark:hover:bg-gold/15 transition"
              >
                أظهر كلمة
                <span className="text-muted-foreground mr-1">
                  ({toArabicNum(revealedCount + 1)}/{toArabicNum(ayah.words.length)})
                </span>
              </button>
              <button
                onClick={onRevealAll}
                className="px-3 py-2 rounded-xl border border-burgundy/20 dark:border-gold/20 text-muted-foreground font-readex text-xs btn-press hover:text-burgundy dark:hover:text-gold transition"
              >
                أظهر الكل
              </button>
            </div>
          )}
          {allRevealed && (
            <div className="flex items-center gap-1.5 justify-center">
              <Icon name="check" size={13} className="text-green-600 dark:text-green-400" />
              <span className="font-readex text-xs text-green-600 dark:text-green-400">الآية كاملة</span>
            </div>
          )}
        </div>
      )}

      {hideMode === "visible_review" && (
        <p className="font-amiri text-2xl text-foreground leading-loose tracking-wide text-center">
          {ayah.text}
        </p>
      )}
    </div>
  );
}
