/**
 * RecitationHistory — سجل جلسات التسميع للطالب
 */
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { HIDE_MODE_LABELS, formatDuration, toArabicNum, type HideMode } from "@/lib/recitation-types";

function fmtDate(d: Date | null | string): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_LABEL: Record<string, string> = {
  completed: "مكتملة",
  paused: "موقوفة",
  listening: "نشطة",
  failed: "فشلت",
};
const STATUS_COLOR: Record<string, string> = {
  completed: "text-green-600 dark:text-green-400 bg-green-500/10",
  paused: "text-gold-dark dark:text-gold bg-gold/15",
  listening: "text-burgundy bg-burgundy/10",
  failed: "text-destructive bg-destructive/10",
};

export default function RecitationHistory() {
  const q = trpc.recitation.myHistory.useQuery({ limit: 50 });
  const rows = q.data ?? [];
  const isLoading = q.isLoading;

  const completedCount = rows.filter((r) => r.status === "completed").length;
  const totalSeconds = rows
    .filter((r) => r.status === "completed" && r.durationSeconds)
    .reduce((acc, r) => acc + (r.durationSeconds ?? 0), 0);

  return (
    <div className="space-y-5 page-enter pb-16" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex items-center gap-3">
        <Link to="/student/mushaf-fahd" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-burgundy/5 dark:hover:bg-gold/5 transition btn-press shrink-0">
          <Icon name="arrow-right" size={18} className="text-muted-foreground" />
        </Link>
        <div>
          <h1 className="font-amiri text-2xl font-bold text-burgundy">سجل التسميع</h1>
          <p className="font-readex text-xs text-muted-foreground">تاريخ جلساتك</p>
        </div>
      </div>

      {/* ملخص سريع */}
      {!isLoading && completedCount > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <GlassCard className="p-4 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-burgundy/10 flex items-center justify-center mb-2">
              <Icon name="mic" size={20} className="text-burgundy" />
            </div>
            <div className="font-amiri text-2xl text-burgundy font-bold">{toArabicNum(completedCount)}</div>
            <div className="font-readex text-xs text-muted-foreground">جلسة مكتملة</div>
          </GlassCard>
          <GlassCard className="p-4 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center mb-2">
              <Icon name="timer" size={20} className="text-gold-dark dark:text-gold" />
            </div>
            <div className="font-amiri text-2xl text-burgundy font-bold">{formatDuration(totalSeconds)}</div>
            <div className="font-readex text-xs text-muted-foreground">إجمالي وقت التسميع</div>
          </GlassCard>
        </div>
      )}

      {/* القائمة */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 skeleton rounded-[1.5rem]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="لا جلسات بعد"
          hint="ابدأ تسميعك الأول من صفحة المصحف"
        />
      ) : (
        <div className="space-y-2.5">
          {rows.map((row) => {
            const statusLabel = STATUS_LABEL[row.status] ?? row.status;
            const statusColor = STATUS_COLOR[row.status] ?? "text-muted-foreground bg-muted";
            const ayahRange =
              row.startAyah && row.endAyah
                ? row.startAyah === row.endAyah
                  ? `آية ${toArabicNum(row.startAyah)}`
                  : `${toArabicNum(row.startAyah)}–${toArabicNum(row.endAyah)}`
                : null;

            return (
              <GlassCard key={row.id} className="p-4">
                <div className="flex items-start gap-3">
                  {/* أيقونة */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    row.status === "completed" ? "bg-green-500/10" : "bg-burgundy/10"
                  }`}>
                    <Icon
                      name={row.status === "completed" ? "check-circle" : "mic"}
                      size={20}
                      className={row.status === "completed" ? "text-green-600 dark:text-green-400" : "text-burgundy"}
                    />
                  </div>

                  {/* تفاصيل */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-amiri text-lg text-burgundy font-bold leading-tight truncate">
                        {row.surahName ?? `سورة #${row.surahId}`}
                      </div>
                      <span className={`font-readex text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      {ayahRange && (
                        <span className="font-readex text-xs text-muted-foreground">{ayahRange}</span>
                      )}
                      {row.hideMode && (
                        <span className="font-readex text-xs text-muted-foreground">
                          {HIDE_MODE_LABELS[row.hideMode as HideMode] ?? row.hideMode}
                        </span>
                      )}
                      {row.mode === "educational" && (
                        <span className="font-readex text-[11px] text-gold-dark dark:text-gold bg-gold/10 px-1.5 py-0.5 rounded-md">
                          تعليمي
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1.5">
                      {row.durationSeconds != null && (
                        <span className="font-readex text-xs text-foreground font-bold inline-flex items-center gap-1">
                          <Icon name="timer" size={12} className="text-muted-foreground" />
                          {formatDuration(row.durationSeconds)}
                        </span>
                      )}
                      <span className="font-readex text-[11px] text-muted-foreground">
                        {fmtDate(row.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* رابط العودة للمصحف */}
      {!isLoading && rows.length > 0 && (
        <Link
          to="/student/mushaf-fahd"
          className="flex items-center justify-center gap-2 py-3 font-readex text-sm text-muted-foreground hover:text-burgundy dark:hover:text-gold transition"
        >
          <Icon name="mic" size={15} />
          بدء جلسة تسميع جديدة
        </Link>
      )}
    </div>
  );
}
