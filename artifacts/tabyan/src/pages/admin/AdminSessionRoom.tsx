import { useNavigate, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import Icon from "@/components/Icon";
import SessionCall from "@/components/app/SessionCall";
import { authStore } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";

/* غرفة المشرف — دخول الحلقة الجارية كمراقب: استقبال فقط (مايك/كاميرا مغلقان)،
   يظهر للمشاركين كمشارك باسم «المشرف — مراقبة»، ومغادرته لا تُنهي الحلقة. */

export default function AdminSessionRoom() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: s, isLoading, error } = trpc.admin.sessionRoom.useQuery({ id }, { refetchInterval: 10000 });

  if (isLoading) return <div className="h-full flex items-center justify-center text-gold font-amiri text-xl">جارٍ الدخول إلى الحلقة…</div>;
  if (error || !s) return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-white font-readex">
      <Icon name="ban" size={40} className="text-red-400" />
      <p>{error?.message ?? "الجلسة غير موجودة"}</p>
      <button onClick={() => navigate("/admin/sessions-monitoring")} className="text-gold underline">العودة للمتابعة</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between text-white/90">
        <div>
          <div className="font-amiri text-lg text-gold">{s.typeLabel}{s.topic ? ` — ${s.topic}` : ""}</div>
          <div className="font-readex text-xs text-white/60">{s.teacherName} · {s.studentName} · {fmtDateTime(s.scheduledAt)}</div>
        </div>
        <span className="font-readex text-[11px] font-bold bg-gold/20 text-gold rounded-full px-3 py-1">وضع المراقبة</span>
      </div>

      {s.status === "in_progress" ? (
        <SessionCall
          sessionId={id}
          displayName={authStore.name ?? "المشرف"}
          observer
          onLeave={() => navigate("/admin/sessions-monitoring")}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/70 font-readex">
          <Icon name="clock" size={40} className="text-gold" />
          <p className="text-sm">
            {s.status === "completed" ? "انتهت هذه الحلقة" : s.status === "cancelled" ? "أُلغيت هذه الحلقة" : "لم تبدأ الحلقة بعد"}
          </p>
          <button onClick={() => navigate("/admin/sessions-monitoring")} className="text-gold underline text-sm">العودة للمتابعة</button>
        </div>
      )}
    </div>
  );
}
