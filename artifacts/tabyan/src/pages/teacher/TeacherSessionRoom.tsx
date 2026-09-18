import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import PrimaryButton from "@/components/PrimaryButton";
import Icon from "@/components/Icon";
import SessionCall, { type SessionCallHandle } from "@/components/app/SessionCall";
import { useToast } from "@/hooks/useToast";
import { authStore } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { finalizeLiveSessionRecording, uploadFile } from "@/lib/upload";

export default function TeacherSessionRoom() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const callRef = useRef<SessionCallHandle | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const { data: s, isLoading, error } = trpc.teacher.sessionRoom.useQuery({ id }, { refetchInterval: 10000 });

  const start = trpc.teacher.startSession.useMutation({
    onSuccess: () => { toast("بدأت الحلقة — يمكن للطالب الانضمام الآن", "success"); utils.teacher.sessionRoom.invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const end = trpc.teacher.endSession.useMutation({
    onSuccess: () => {
      toast("انتهت الحلقة — قيّم الطالب الآن", "success");
      navigate(`/teacher/evaluate/${id}`);
    },
    onError: (e) => toast(e.message, "error"),
  });

  const saveRecording = async (file: Blob, durationSeconds: number) => {
    toast("جارٍ رفع التسجيل بشكل خاص…", "success");
    const extension = file.type.includes("mp4") ? "mp4" : "webm";
    const objectPath = await uploadFile(
      file,
      `live-session-${id}.${extension}`,
      undefined,
      "live_session_recording",
    );
    await finalizeLiveSessionRecording(id, objectPath, durationSeconds);
    await utils.teacher.myRecordings.invalidate();
    toast("حُفظ تسجيل الحلقة بشكل خاص لمدة ستة أشهر", "success");
  };

  const finishSession = async () => {
    if (!window.confirm("إنهاء الحلقة لجميع المشاركين؟")) return;
    setIsEnding(true);
    try {
      // Failure is rendered inside SessionCall and deliberately does not block
      // the completion/evaluation flow.
      await callRef.current?.stopRecording();
      await end.mutateAsync({ id });
    } finally {
      setIsEnding(false);
    }
  };

  if (isLoading) return <div className="h-full flex items-center justify-center text-gold font-amiri text-xl">جارٍ الدخول…</div>;
  if (error || !s) return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-white font-readex">
      <Icon name="ban" size={40} className="text-red-400" />
      <p>{error?.message ?? "الجلسة غير موجودة"}</p>
      <button onClick={() => navigate("/teacher")} className="text-gold underline">العودة</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between text-white/90">
        <div>
          <div className="font-amiri text-lg text-gold">{s.typeLabel}{s.topic ? ` — ${s.topic}` : ""}</div>
          <div className="font-readex text-xs text-white/60">الطالب: {s.studentName} · {fmtDateTime(s.scheduledAt)}</div>
        </div>
      </div>

      {s.status === "in_progress" ? (
        <SessionCall
          sessionId={id}
          displayName={authStore.name ?? "المعلم"}
          ref={callRef}
          isTeacher
          recordingEnabled={s.recordingEnabled}
          onRecordingReady={saveRecording}
          onLeave={() => navigate("/teacher")}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/70 font-readex">
          <Icon name="clock" size={40} className="text-gold" />
          <p className="text-sm">
            {s.status === "completed" ? "انتهت هذه الحلقة" : s.status === "cancelled" ? "أُلغيت هذه الحلقة" : "اضغط «بدء الحلقة» عندما يحين الموعد"}
          </p>
        </div>
      )}

      {s.status !== "in_progress" && s.status !== "completed" && s.status !== "cancelled" && (
        <PrimaryButton className="w-full mb-3" disabled={start.isPending} onClick={() => start.mutate({ id })}>
          {start.isPending ? "جارٍ البدء…" : (
            <span className="inline-flex items-center gap-2"><Icon name="play" size={18} />بدء الحلقة</span>
          )}
        </PrimaryButton>
      )}
      {s.status === "in_progress" && (
        <button onClick={finishSession} disabled={end.isPending || isEnding}
          className="w-full mb-3 py-3 rounded-xl bg-red-600 text-white font-readex font-bold hover:bg-red-500 transition inline-flex items-center justify-center gap-2">
          <Icon name="stop" size={18} />
          {end.isPending || isEnding ? "جارٍ إنهاء الحلقة…" : "إنهاء الحلقة وتقييم الطالب"}
        </button>
      )}
      {s.status === "completed" && (
        <PrimaryButton className="w-full mb-3" onClick={() => navigate(`/teacher/evaluate/${id}`)}>
          <span className="inline-flex items-center gap-2"><Icon name="edit" size={18} />تقييم الطالب</span>
        </PrimaryButton>
      )}
    </div>
  );
}
