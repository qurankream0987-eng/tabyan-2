import { useCallback, useState } from "react";
import Icon from "@/components/app/Icon";
import { trpc } from "@/providers/trpc";
import { useOpenAiRealtimeTranscription } from "@/lib/recitation-ai/useOpenAiRealtimeTranscription";

function metric(value: number | null) {
  return value === null ? "—" : `${value} ms`;
}

export default function RecitationConnectivityGate() {
  const status = trpc.recitation.status.useQuery();
  const startSession = trpc.recitation.start.useMutation();
  const endSession = trpc.recitation.end.useMutation();
  const cancelSession = trpc.recitation.cancel.useMutation();
  const live = useOpenAiRealtimeTranscription();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);

  const begin = useCallback(async () => {
    if (!status.data?.liveTrackingEnabled) {
      setGateError("بوابة التفريغ الحي غير مفعّلة في هذه البيئة");
      return;
    }
    setGateError(null);
    try {
      const created = await startSession.mutateAsync({
        mode: "general",
        startContext: { startPage: 1, startVerseKey: "1:1" },
        hideMode: "visible_review",
      });
      const ok = await live.start(created.sessionId);
      if (!ok) {
        await cancelSession.mutateAsync({ sessionId: created.sessionId });
        return;
      }
      setSessionId(created.sessionId);
    } catch {
      setGateError("تعذر بدء جلسة اختبار الاتصال");
    }
  }, [cancelSession, live, startSession, status.data?.liveTrackingEnabled]);

  const finish = useCallback(async () => {
    if (!sessionId) return;
    setGateError(null);
    try {
      await live.stop();
      await endSession.mutateAsync({ sessionId });
      setSessionId(null);
    } catch {
      setGateError("انتهى التقاط الصوت لكن تعذر إنهاء جلسة الاختبار");
    }
  }, [endSession, live, sessionId]);

  const cancel = useCallback(async () => {
    live.cancel();
    if (sessionId) await cancelSession.mutateAsync({ sessionId }).catch(() => {});
    setSessionId(null);
  }, [cancelSession, live, sessionId]);

  const active = live.state === "connecting" || live.state === "listening" || live.state === "stopping";
  const error = gateError ?? live.error;

  return (
    <div className="max-w-2xl mx-auto space-y-5 page-enter pb-12" dir="rtl">
      <div className="glass rounded-[1.75rem] border border-gold/35 p-5 shadow-card">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gold/15 flex items-center justify-center text-gold-dark dark:text-gold shrink-0">
            <Icon name="mic" size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="font-amiri text-2xl font-bold text-burgundy">بوابة اتصال التفريغ الحي</h1>
            <p className="font-readex text-xs text-muted-foreground leading-6 mt-1">
              اختبار محدود لميكروفون حقيقي مع OpenAI. لا تُحفظ أي ملفات صوتية، ولا توجد مطابقة قرآن أو تقييم أخطاء في هذه الصفحة.
            </p>
          </div>
        </div>
      </div>

      {!active ? (
        <button
          onClick={() => void begin()}
          disabled={startSession.isPending || status.isLoading}
          className="w-full rounded-2xl bg-burgundy dark:bg-gold text-white dark:text-burgundy py-4 font-readex text-sm font-bold flex items-center justify-center gap-2 btn-press disabled:opacity-50"
        >
          <Icon name="mic" size={18} />
          <span>{startSession.isPending ? "جاري تجهيز الاختبار…" : "ابدأ اختبار الميكروفون"}</span>
        </button>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => void finish()} disabled={live.state !== "listening"} className="flex-1 rounded-2xl bg-burgundy dark:bg-gold text-white dark:text-burgundy py-4 font-readex text-sm font-bold btn-press disabled:opacity-50">
            أوقف الصوت واعرض النتيجة النهائية
          </button>
          <button onClick={() => void cancel()} className="rounded-2xl border border-border px-4 text-muted-foreground font-readex text-sm btn-press">
            إلغاء
          </button>
        </div>
      )}

      <div className="glass rounded-[1.5rem] border border-border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-readex text-sm font-bold text-foreground">النص الخام الوارد</h2>
          <span className={`font-readex text-[10px] rounded-full px-2 py-1 ${live.state === "listening" ? "bg-green-500/15 text-green-700 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>
            {live.state === "listening" ? "يستمع الآن" : live.state === "connecting" ? "يتصل…" : live.state === "stopping" ? "يعالج النهاية…" : "متوقف"}
          </span>
        </div>
        <p className="min-h-16 rounded-xl bg-burgundy/5 dark:bg-gold/5 p-3 font-readex text-sm leading-7 text-foreground whitespace-pre-wrap">
          {live.partial || "ستظهر deltas الحقيقية هنا أثناء القراءة."}
        </p>
        <div>
          <div className="font-readex text-[11px] font-bold text-muted-foreground mb-1">النتيجة النهائية</div>
          <p className="min-h-12 font-readex text-sm leading-7 text-foreground whitespace-pre-wrap">
            {live.finalTranscript || "تظهر بعد إيقاف الصوت وإرسال commit."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[
          ["اتصال المزود", live.metrics.connectionMs],
          ["أول كتلة صوت", live.metrics.firstAudioMs],
          ["أول partial", live.metrics.firstPartialMs],
          ["النتيجة النهائية", live.metrics.finalMs],
          ["p50", live.metrics.p50Ms],
          ["p95", live.metrics.p95Ms],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-border bg-card p-3">
            <div className="font-readex text-[10px] text-muted-foreground">{label}</div>
            <div className="font-readex text-sm font-bold text-burgundy dark:text-gold mt-1">{metric(value as number | null)}</div>
          </div>
        ))}
      </div>

      {error && <div className="rounded-xl bg-red-500/10 text-red-700 dark:text-red-300 p-3 font-readex text-xs">{error}</div>}
    </div>
  );
}