import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { fmtDateTime } from "@/lib/format";
import { authStore } from "@/lib/auth";
import { DEMO_MY_RECORDINGS } from "@/lib/demo/teacher";
import { objectUrl } from "@/lib/upload";

type Rec = {
  id: string; sessionId: string; videoUrl: string; durationSeconds: number;
  createdAt: string | Date; studentName: string; topic: string | null; typeLabel: string; hasEvaluation: boolean;
};

export default function TeacherRecordings() {
  const DEMO = authStore.isDemo;
  const q = trpc.teacher.myRecordings.useQuery(undefined, { enabled: !DEMO });
  const rows = (DEMO ? DEMO_MY_RECORDINGS : (q.data ?? [])) as Rec[];
  const isLoading = !DEMO && q.isLoading;
  const [open, setOpen] = useState<Rec | null>(null);

  return (
    <div className="space-y-4 page-enter">
      <div className="text-center">
        <h1 className="font-amiri text-2xl text-burgundy flex items-center justify-center gap-2">
          <Icon name="video" size={22} />
          تسجيلات حصصي
        </h1>
        <p className="font-readex text-sm text-muted-foreground">مشاهدة فقط — الحذف صلاحية  حصراً</p>
      </div>
      {isLoading ? <div className="h-28 skeleton rounded-[1.5rem]" /> :
       !rows.length ? <EmptyState title="لا تسجيلات بعد" hint="تظهر التسجيلات بعد إنهاء الحصص" /> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <GlassCard key={r.id} className="p-4">
              <div className="flex items-center gap-3" onClick={() => setOpen(r)}>
                <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #800020 0%, #A02040 60%, #D4AF37 100%)" }}>
                  <Icon name="play" size={20} className="teacher-recording-play-icon" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-readex text-sm font-bold truncate">{r.typeLabel}{r.topic ? ` — ${r.topic}` : ""}</div>
                  <div className="text-[11px] text-muted-foreground font-readex">{r.studentName} · {fmtDateTime(r.createdAt)} · {Math.round(r.durationSeconds / 60)} د</div>
                </div>
                {r.hasEvaluation
                  ? <span className="text-[10px] font-readex bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-1 rounded-full shrink-0 inline-flex items-center gap-1"><Icon name="check" size={11} />مُقيَّمة</span>
                  : <Link to={`/teacher/evaluate/${r.sessionId}`} onClick={(e) => e.stopPropagation()}
                      className="text-[10px] font-readex bg-gold/20 text-gold-dark dark:text-gold px-2 py-1 rounded-full shrink-0 inline-flex items-center gap-1"><Icon name="edit" size={11} />قيّم</Link>}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} className="max-w-2xl">
        {open && (
          <div>
            <h3 className="font-amiri text-lg text-burgundy mb-2">{open.typeLabel}{open.topic ? ` — ${open.topic}` : ""}</h3>
            <video src={objectUrl(open.videoUrl)} controls preload="metadata" className="w-full rounded-xl bg-night max-h-80" />
            <p className="text-[11px] text-muted-foreground font-readex mt-1 text-center">بث مباشر فقط — يُحذف تلقائياً بعد 6 أشهر</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
