/**
 * واجبات التسميع — الواجبات التي حددها المعلم للطالب. «ابدأ التسميع» يفتح
 * المصحف على الواجب ويبدأ منه تسميعاً تعليمياً تُرسل نتيجته للمعلم ليقيّمه.
 */
import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { authStore } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { formatDuration } from "@/lib/recitation-types";
import {
  ASSIGNMENT_STATUS_LABEL,
  assignmentHideModeLabel,
  assignmentRangeLabel,
  canRecite,
  type AssignmentStatus,
} from "@/lib/recitation-assignments";

const STATUS_CLASS: Record<AssignmentStatus, string> = {
  assigned: "bg-gold/20 text-gold-dark dark:text-gold",
  submitted: "bg-burgundy/10 text-burgundy dark:bg-white/10",
  reviewed: "bg-green-500/10 text-green-700 dark:text-green-400",
  cancelled: "bg-muted text-muted-foreground",
};

export default function RecitationAssignments() {
  const DEMO = authStore.isDemo;
  const q = trpc.recitationAssignments.mine.useQuery(undefined, { enabled: !DEMO });
  const status = trpc.recitation.status.useQuery(undefined, { enabled: !DEMO });
  const recitationReady = !!status.data?.enabled && status.data.educationalAssignmentSource === "ready";
  const rows = q.data ?? [];
  const [now] = useState(() => Date.now());

  return (
    <div className="space-y-4 page-enter max-w-lg mx-auto pb-10">
      <div className="text-center pt-2 mb-2">
        <h1 className="font-amiri text-xl font-extrabold text-burgundy mb-1.5">واجبات التسميع</h1>
        <p className="font-readex text-sm text-muted-foreground">سمّع ما حدده معلمك، وهو من يقيّم تسميعك</p>
      </div>

      {DEMO ? (
        <EmptyState title="غير متاحة في العرض التجريبي" hint="سجّل الدخول بحسابك لترى واجباتك" />
      ) : q.isLoading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-32 skeleton rounded-[1.5rem]" />)}</div>
      ) : q.isError ? (
        <GlassCard className="p-5 text-center text-muted-foreground font-readex text-sm">
          تعذّر تحميل الواجبات — تحقق من الاتصال
        </GlassCard>
      ) : rows.length === 0 ? (
        <EmptyState title="لا واجبات تسميع بعد" hint="حين يحدد لك معلمك سورة للتسميع ستظهر هنا" />
      ) : (
        <div className="space-y-3">
          {!status.isLoading && !recitationReady && (
            <GlassCard className="p-3.5 flex items-center gap-2.5 border border-gold/30">
              <Icon name="info" size={16} className="text-gold-dark dark:text-gold shrink-0" />
              <span className="font-readex text-xs text-foreground">التسميع غير متاح الآن — حاول لاحقاً</span>
            </GlassCard>
          )}
          {rows.map(({ assignment: a, teacherName }) => {
            const result = a.result;
            const overdue = a.status === "assigned" && a.dueAt && new Date(a.dueAt).getTime() < now;
            return (
              <GlassCard key={a.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-amiri text-lg font-bold text-burgundy leading-tight">{assignmentRangeLabel(a)}</div>
                    <div className="font-readex text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {teacherName && (
                        <span className="inline-flex items-center gap-1"><Icon name="user" size={11} />{teacherName}</span>
                      )}
                      <span>{assignmentHideModeLabel(a.hideMode)}</span>
                      {a.dueAt && (
                        <span className={`inline-flex items-center gap-1 ${overdue ? "text-destructive font-bold" : ""}`}>
                          <Icon name="calendar" size={11} />
                          {overdue ? "فات موعده: " : "التسليم قبل "}{fmtDate(a.dueAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`font-readex text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${STATUS_CLASS[a.status]}`}>
                    {ASSIGNMENT_STATUS_LABEL[a.status]}
                  </span>
                </div>

                {a.note && (
                  <p className="font-readex text-xs text-foreground leading-relaxed flex items-start gap-1.5 rounded-xl bg-burgundy/5 dark:bg-white/5 px-3 py-2">
                    <Icon name="edit" size={12} className="shrink-0 mt-0.5 text-muted-foreground" />
                    {a.note}
                  </p>
                )}

                {a.status === "reviewed" && (
                  <div className="rounded-xl border border-green-500/25 bg-green-500/5 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-readex text-xs font-bold text-foreground">تقييم المعلم</span>
                      <span className="font-amiri text-xl font-bold text-burgundy" dir="ltr">{a.teacherScore ?? "—"}/100</span>
                    </div>
                    {a.teacherFeedback && (
                      <p className="font-readex text-xs text-foreground leading-relaxed mt-1.5">{a.teacherFeedback}</p>
                    )}
                  </div>
                )}

                {result && a.status !== "reviewed" && (
                  <p className="font-readex text-[11px] text-muted-foreground">
                    آخر تسليم{a.submittedAt ? ` (${fmtDate(a.submittedAt)})` : ""}: {result.wordsRecited} من {result.totalWords} كلمة
                    · {result.confirmedMistakes} خطأ · {result.skippedWords} تخطٍّ · {formatDuration(result.durationSeconds)}
                  </p>
                )}

                {canRecite(a.status) && (
                  recitationReady ? (
                    <Link
                      to={`/student/mushaf-fahd?assignment=${encodeURIComponent(a.id)}`}
                      className="flex items-center justify-center gap-2 w-full py-2.5 btn-bubble btn-primary-bubble font-readex text-sm font-bold"
                    >
                      <Icon name="mic" size={16} />
                      {a.status === "submitted" ? "أعد التسميع" : "ابدأ التسميع"}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex items-center justify-center gap-2 w-full py-2.5 btn-bubble btn-primary-bubble font-readex text-sm font-bold opacity-50"
                    >
                      <Icon name="mic" size={16} />
                      ابدأ التسميع
                    </button>
                  )
                )}
                {a.status === "submitted" && (
                  <p className="font-readex text-[10.5px] text-muted-foreground text-center -mt-1">
                    إعادة التسميع تستبدل التسليم السابق ما دام معلمك لم يقيّمه
                  </p>
                )}
              </GlassCard>
            );
          })}
          <p className="font-readex text-[11px] text-muted-foreground text-center leading-relaxed px-4">
            أعداد الكلمات والأخطاء يحسبها التطبيق آلياً على جهازك أثناء التسميع، ويُحفظ تسجيل صوتك ليستمع له معلمك، والتقييم له وحده.
          </p>
        </div>
      )}
    </div>
  );
}
