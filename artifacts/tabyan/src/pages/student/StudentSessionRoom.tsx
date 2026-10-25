import { useNavigate, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import Icon from "@/components/Icon";
import SessionCall from "@/components/app/SessionCall";
import { authStore } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";

export default function StudentSessionRoom() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: s, isLoading, error } = trpc.student.sessionRoom.useQuery({ id }, { refetchInterval: 10000 });

  if (isLoading) return <div className="h-screen bg-night flex items-center justify-center text-gold font-amiri text-xl">جارٍ الدخول إلى الحلقة…</div>;
  if (error || !s) return (
    <div className="h-screen bg-night flex flex-col items-center justify-center gap-3 text-white font-readex">
      <div className="text-gold"><Icon name="x" size={40} /></div>
      <p>{error?.message ?? "الجلسة غير موجودة"}</p>
      <button onClick={() => navigate("/student/home")} className="text-gold underline">العودة</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between text-white/90">
        <div>
          <div className="font-amiri text-lg text-gold">{s.typeLabel}{s.topic ? ` — ${s.topic}` : ""}</div>
          <div className="font-readex text-xs text-white/60">{s.teacherName} · {fmtDateTime(s.scheduledAt)}</div>
        </div>
      </div>

      {s.status === "in_progress" ? (
        <SessionCall
          sessionId={id}
          displayName={authStore.name ?? "الطالب"}
          recordingEnabled={s.recordingEnabled}
          onLeave={() => navigate("/student/home")}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/70 font-readex">
          <Icon name="clock" size={40} className="text-gold" />
          <p className="text-sm">
            {s.status === "completed" ? "انتهت هذه الحلقة" : s.status === "cancelled" ? "أُلغيت هذه الحلقة" : "لم تبدأ الحلقة بعد — بانتظار بدء المعلم"}
          </p>
          <button onClick={() => navigate("/student/home")} className="text-gold underline text-sm">العودة للرئيسية</button>
        </div>
      )}

      <p className="text-center text-white/40 text-[11px] font-readex pb-2 pt-1">بث مباشر بينك وبين معلمك — يظهر المشرف أحياناً كمراقب لضمان الجودة</p>
    </div>
  );
}
