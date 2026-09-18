import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";
import ScoreSlider from "@/components/ScoreSlider";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { fmtDateTime } from "@/lib/format";
import { authStore } from "@/lib/auth";
import { demoSessionRoom } from "@/lib/demo/teacher";

export default function Evaluate() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const q = trpc.teacher.sessionRoom.useQuery({ id: sessionId }, { enabled: !DEMO });
  const s = DEMO ? demoSessionRoom(sessionId) : q.data;
  const isLoading = !DEMO && q.isLoading;
  const [hifz, setHifz] = useState(40);
  const [revision, setRevision] = useState(16);
  const [tajweed, setTajweed] = useState(16);
  const [commitment, setCommitment] = useState(8);
  const [notes, setNotes] = useState("");
  const [audioNotesUrl, setAudioNotesUrl] = useState("");
  const [rec, setRec] = useState<"promote" | "keep" | "review">("keep");
  const total = hifz + revision + tajweed + commitment;

  const evaluate = trpc.teacher.evaluate.useMutation({
    onSuccess: () => {
      toast("حُفظ التقييم وأُشعر الطالب", "success");
      utils.teacher.pendingEvaluations.invalidate(); utils.teacher.dashboard.invalidate();
      navigate("/teacher/evaluations");
    },
    onError: (e) => toast(e.message, "error"),
  });

  if (isLoading) return <div className="h-40 skeleton rounded-[1.5rem]" />;
  if (!s) return <EmptyStateLocal />;

  return (
    <div className="space-y-4 page-enter max-w-lg mx-auto">
      <GlassCard className="p-5 text-center">
        <h1 className="font-amiri text-2xl text-burgundy flex items-center justify-center gap-2">
          <Icon name="edit" size={22} />
          تقييم الحصة
        </h1>
        <p className="font-readex text-sm text-muted-foreground mt-1">
          الطالب: <b>{s.studentName}</b> · {s.typeLabel}{s.topic ? ` — ${s.topic}` : ""} · {fmtDateTime(s.scheduledAt)}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gold/15 px-5 py-2">
          <span className="font-readex text-sm">المجموع:</span>
          <span className={`font-amiri text-2xl ${total >= 85 ? "text-green-600" : total >= 60 ? "text-gold-dark dark:text-gold" : "text-destructive"}`}>{total}</span>
          <span className="font-readex text-xs text-muted-foreground">/100</span>
        </div>
      </GlassCard>

      <GlassCard className="p-5 space-y-5">
        <ScoreSlider label="الحفظ الجديد" max={50} value={hifz} onChange={setHifz} />
        <ScoreSlider label="المراجعة" max={20} value={revision} onChange={setRevision} />
        <ScoreSlider label="التجويد" max={20} value={tajweed} onChange={setTajweed} />
        <ScoreSlider label="الأداء" max={10} value={commitment} onChange={setCommitment} />

        <div>
          <label className="font-readex text-sm font-bold block mb-2">التوصية</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["promote", "ترشيح للترقية", "trending-up"],
              ["keep", "الاستمرار", "check-circle"],
              ["review", "يحتاج مراجعة", "refresh"],
            ] as const).map(([k, l, ic]) => (
              <button key={k} onClick={() => setRec(k)}
                className={`py-2.5 rounded-xl text-xs font-readex font-bold transition inline-flex items-center justify-center gap-1.5 ${rec === k ? "bg-burgundy text-white" : "bg-burgundy/10 text-burgundy"}`}>
                <Icon name={ic} size={14} />
                {l}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground font-readex mt-1">التوصية لا تُرقّي الطالب — القرار النهائي ل</p>
        </div>

        <div>
          <label className="font-readex text-sm font-bold block mb-1">ملاحظات للطالب</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500}
            placeholder="نقاط القوة وما يحتاج تحسيناً…"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none" />
        </div>
        <input dir="ltr" value={audioNotesUrl} onChange={(e) => setAudioNotesUrl(e.target.value)}
          placeholder="رابط ملاحظات صوتية (اختياري)"
          className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-xs focus:outline-none focus:ring-2 focus:ring-gold" />

        <PrimaryButton className="w-full" disabled={evaluate.isPending}
          onClick={() => {
            if (DEMO) { toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info"); return; }
            evaluate.mutate({
              sessionId, hifzScore: hifz, revisionScore: revision, tajweedScore: tajweed,
              commitmentScore: commitment, notes: notes || undefined, audioNotesUrl: audioNotesUrl || undefined, recommendation: rec,
            });
          }}>
          {evaluate.isPending ? "جارٍ الحفظ…" : `حفظ التقييم (${total}/100)`}
        </PrimaryButton>
      </GlassCard>
    </div>
  );
}

function EmptyStateLocal() {
  return <div className="text-center font-readex text-muted-foreground py-10">الحصة غير موجودة</div>;
}
