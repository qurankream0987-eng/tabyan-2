import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { fmtDateTime } from "@/lib/format";
import { authStore } from "@/lib/auth";
import { DEMO_RECORDINGS } from "@/lib/demo/student-extra";
import { objectUrl } from "@/lib/upload";

type Rec = {
  id: string; sessionId: string; videoUrl: string; durationSeconds: number; quality: string;
  createdAt: string | Date; teacherName: string; topic: string | null; typeLabel: string;
  evaluation: { totalScore: number; hifzScore: number; revisionScore: number; tajweedScore: number; commitmentScore: number; notes: string | null } | null;
};

export default function StudentRecordings() {
  const DEMO = authStore.isDemo;
  const { data, isLoading } = trpc.student.myRecordings.useQuery(undefined, { enabled: !DEMO });
  const rows = (DEMO ? DEMO_RECORDINGS : data ?? []) as Rec[];
  const [open, setOpen] = useState<Rec | null>(null);

  return (
    <div className="space-y-4 page-enter">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto icon-bubble text-burgundy mb-3">
          <Icon name="video" size={26} />
        </div>
        <h1
          className="hero-greeting font-amiri text-2xl font-bold"
        >تسجيلاتي</h1>
      </div>

      {!DEMO && isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 skeleton rounded-[1.5rem]" />)}
        </div>
      ) : !rows.length ? (
        <EmptyState title="لا تسجيلات بعد" hint="ستظهر تسجيلات حلقاتك المكتملة هنا" />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <GlassCard key={r.id} className="p-4" onClick={() => setOpen(r)}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-night/90 dark:bg-night flex items-center justify-center text-gold shrink-0 shadow-sm">
                  <Icon name="play" size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-readex text-sm font-bold truncate">{r.typeLabel}{r.topic ? ` — ${r.topic}` : ""}</div>
                  <div className="text-[11px] text-muted-foreground font-readex mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="truncate">{r.teacherName} · {fmtDateTime(r.createdAt)}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-burgundy/8 dark:bg-gold/12 text-burgundy px-2 py-px text-[10px] font-extrabold shrink-0">
                      {Math.round(r.durationSeconds / 60)} د
                    </span>
                  </div>
                </div>
                {r.evaluation && (
                  <div className="text-center shrink-0">
                    <div
                      className="hero-greeting font-amiri text-xl font-bold"
                    >{r.evaluation.totalScore}</div>
                    <div className="text-[10px] text-muted-foreground font-readex">من 100</div>
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} className="max-w-2xl">
        {open && (
          <div>
            <h3 className="font-amiri text-lg font-bold text-burgundy mb-3 text-center">
              {open.typeLabel}{open.topic ? ` — ${open.topic}` : ""}
            </h3>
            <video src={objectUrl(open.videoUrl)} controls preload="metadata" className="w-full rounded-2xl bg-night max-h-80" />
            <p className="text-[11px] text-muted-foreground font-readex mt-2 flex items-center justify-center gap-1.5">
              <Icon name="x" size={12} className="shrink-0" />
              التحميل غير متاح — بث مباشر فقط
            </p>
            {open.evaluation && (
              <div className="mt-4 rounded-2xl bg-burgundy/5 dark:bg-gold/5 border border-burgundy/8 dark:border-gold/8 p-4">
                <div className="font-readex font-bold text-sm mb-3 text-foreground">تقييم المعلم</div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    ["الحفظ", open.evaluation.hifzScore, 30],
                    ["المراجعة", open.evaluation.revisionScore, 20],
                    ["التجويد", open.evaluation.tajweedScore, 40],
                    ["الالتزام", open.evaluation.commitmentScore, 10],
                  ].map(([l, v, m]) => (
                    <div key={l as string} className="rounded-xl bg-background border border-border py-3">
                      <div className="font-amiri text-lg font-bold text-burgundy">
                        {v as number}<span className="text-[10px] text-muted-foreground">/{m as number}</span>
                      </div>
                      <div className="text-[10px] font-readex text-muted-foreground">{l as string}</div>
                    </div>
                  ))}
                </div>
                {open.evaluation.notes && (
                  <p className="font-readex text-xs text-muted-foreground mt-3 flex items-start gap-1.5">
                    <Icon name="edit" size={12} className="shrink-0 mt-0.5" />
                    {open.evaluation.notes}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
