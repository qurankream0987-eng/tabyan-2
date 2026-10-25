import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { DAY_AR } from "@/lib/format";
import { authStore } from "@/lib/auth";

const DEMO_TOAST = "وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم";
const TITLE_MAX = 200;
const BODY_MAX = 2000;

const asStrArr = (v: unknown): string[] => (Array.isArray(v) ? (v as unknown[]).map(String) : []);
const fmtDays = (days: unknown) => asStrArr(days).map((d) => DAY_AR[d] ?? d).join("، ");
const fmtDateTime = (d: string | Date | null) =>
  new Date(d ?? 0).toLocaleString("ar-SA", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

export default function TeacherBroadcast() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;

  const audiencesQ = trpc.teacher.broadcastAudiences.useQuery(undefined, { enabled: !DEMO });
  const historyQ = trpc.teacher.broadcastHistory.useQuery(undefined, { enabled: !DEMO });

  const [scheduleId, setScheduleId] = useState<string | null>(null); // null = all
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const send = trpc.teacher.sendBroadcast.useMutation({
    onSuccess: (res) => {
      toast(`أُرسل الإشعار إلى ${res.recipientCount} طالباً`, "success");
      setTitle("");
      setBody("");
      setScheduleId(null);
      setConfirmOpen(false);
      utils.teacher.broadcastHistory.invalidate();
      utils.teacher.broadcastAudiences.invalidate();
    },
    onError: (e) => {
      setConfirmOpen(false);
      toast(e.message, "error");
    },
  });

  const audiences = audiencesQ.data;
  const audiencesLoading = !DEMO && audiencesQ.isLoading;
  const history = historyQ.data;
  const historyLoading = !DEMO && historyQ.isLoading;

  const canSend = title.trim().length > 0 && body.trim().length > 0;

  const onSendClick = () => {
    if (DEMO) { toast(DEMO_TOAST, "info"); return; }
    if (!title.trim()) { toast("العنوان مطلوب", "error"); return; }
    if (!body.trim()) { toast("نص الإشعار مطلوب", "error"); return; }
    setConfirmOpen(true);
  };

  const onConfirmSend = () => {
    send.mutate({
      title: title.trim(),
      body: body.trim(),
      scheduleId: scheduleId ?? undefined,
    });
  };

  const selectedLabel =
    scheduleId == null
      ? `جميع طلابي (${audiences?.allCount ?? 0} طالب)`
      : (() => {
          const s = audiences?.schedules.find((x) => x.id === scheduleId);
          return s ? `${s.typeLabel} (${s.studentCount} طالب)` : "حلقة محددة";
        })();

  return (
    <div className="space-y-5 page-enter">
      {/* ── Header ── */}
      <div className="text-center">
        <div className="w-14 h-14 mx-auto icon-bubble text-burgundy mb-3">
          <Icon name="bell" size={26} />
        </div>
        <h1
          className="hero-greeting font-amiri text-2xl font-bold"
        >
          الإشعارات الجماعية
        </h1>
        <p className="font-readex text-xs text-muted-foreground">أرسل إشعاراً لطلابك المسجلين في حلقاتك</p>
      </div>

      {/* ── Compose card ── */}
      <GlassCard hover={false} className="p-5 space-y-4">
        {audiencesLoading ? (
          <div className="space-y-2">
            <div className="h-16 skeleton rounded-2xl" />
            <div className="h-16 skeleton rounded-2xl" />
          </div>
        ) : (
          <>
            {/* Audience picker */}
            <div>
              <label className="font-readex text-sm font-bold text-burgundy mb-2 block">المستهدفون</label>
              <div className="space-y-2">
                {/* All students */}
                <button
                  type="button"
                  onClick={() => setScheduleId(null)}
                  className={`w-full text-right rounded-2xl p-3 border transition flex items-center gap-3 ${
                    scheduleId == null
                      ? "bg-burgundy/10 dark:bg-gold/10 border-burgundy/40 dark:border-gold/40"
                      : "bg-burgundy/4 dark:bg-gold/4 border-burgundy/8 dark:border-gold/8 hover:bg-burgundy/8 dark:hover:bg-gold/8"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${scheduleId == null ? "border-burgundy dark:border-gold bg-burgundy dark:bg-gold" : "border-muted-foreground/40"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-readex text-sm font-bold text-foreground">
                      جميع طلابي ({audiences?.allCount ?? 0} طالب)
                    </div>
                  </div>
                  <Icon name="users" size={18} className="text-gold shrink-0" />
                </button>

                {/* Per-schedule */}
                {audiences?.schedules.map((s) => {
                  const disabled = s.studentCount === 0;
                  const selected = scheduleId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && setScheduleId(s.id)}
                      className={`w-full text-right rounded-2xl p-3 border transition flex items-center gap-3 ${
                        disabled
                          ? "bg-muted/20 border-transparent opacity-60 cursor-not-allowed"
                          : selected
                          ? "bg-burgundy/10 dark:bg-gold/10 border-burgundy/40 dark:border-gold/40"
                          : "bg-burgundy/4 dark:bg-gold/4 border-burgundy/8 dark:border-gold/8 hover:bg-burgundy/8 dark:hover:bg-gold/8"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${selected ? "border-burgundy dark:border-gold bg-burgundy dark:bg-gold" : "border-muted-foreground/40"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-readex text-sm font-bold text-foreground truncate">{s.typeLabel}</div>
                        <div className="text-[11px] text-muted-foreground font-readex mt-0.5 truncate">
                          {fmtDays(s.availableDays)} — {asStrArr(s.availableTimes).join("، ")}
                        </div>
                      </div>
                      <span className={`text-[11px] font-readex font-bold shrink-0 px-2 py-0.5 rounded-full ${disabled ? "bg-muted-foreground/10 text-muted-foreground" : "bg-gold/15 text-burgundy"}`}>
                        {disabled ? "لا طلاب" : `${s.studentCount} طالب`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title input */}
            <div>
              <label className="font-readex text-sm font-bold text-burgundy mb-1.5 block">العنوان</label>
              <input
                type="text"
                value={title}
                maxLength={TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان الإشعار"
                className="w-full rounded-2xl bg-burgundy/4 dark:bg-gold/4 border border-burgundy/10 dark:border-gold/10 px-4 py-3 font-readex text-sm text-foreground outline-none focus:border-burgundy/40 dark:focus:border-gold/40 transition"
              />
              <div className="text-[10px] text-muted-foreground font-readex text-left mt-1" dir="ltr">{title.length}/{TITLE_MAX}</div>
            </div>

            {/* Body textarea */}
            <div>
              <label className="font-readex text-sm font-bold text-burgundy mb-1.5 block">نص الإشعار</label>
              <textarea
                value={body}
                maxLength={BODY_MAX}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="اكتب رسالتك لطلابك…"
                className="w-full rounded-2xl bg-burgundy/4 dark:bg-gold/4 border border-burgundy/10 dark:border-gold/10 px-4 py-3 font-readex text-sm text-foreground outline-none focus:border-burgundy/40 dark:focus:border-gold/40 transition resize-none"
              />
              <div className="text-[10px] text-muted-foreground font-readex text-left mt-1" dir="ltr">{body.length}/{BODY_MAX}</div>
            </div>

            {/* Explainer */}
            <div className="rounded-2xl bg-gold/8 dark:bg-gold/6 border border-gold/20 p-3 flex items-start gap-2">
              <Icon name="bell" size={15} className="text-gold shrink-0 mt-0.5" />
              <p className="font-readex text-[11.5px] text-muted-foreground leading-relaxed">
                يصل الإشعار فقط إلى طلابك المسجلين في حلقاتك — لا يمكن إرساله لغيرهم.
              </p>
            </div>

            {/* Send button */}
            <button
              type="button"
              onClick={onSendClick}
              disabled={!canSend || send.isPending}
              className="flex items-center justify-center gap-2 w-full py-3 btn-bubble btn-primary-bubble font-readex text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="send" size={16} />
              {send.isPending ? "جارٍ الإرسال…" : "إرسال الإشعار"}
            </button>
          </>
        )}
      </GlassCard>

      {/* ── History section ── */}
      <section>
        <h2 className="font-amiri text-xl text-burgundy mb-3 font-bold">الإشعارات المرسلة</h2>
        {historyLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 skeleton rounded-[1.5rem]" />)}
          </div>
        ) : !history?.length ? (
          <EmptyState title="لا إشعارات سابقة" hint="أول إشعار جماعي ترسله سيظهر هنا" />
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <GlassCard key={h.id} hover={false} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-readex text-sm font-bold text-foreground truncate">{h.title}</div>
                    <p className="font-readex text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{h.body}</p>
                  </div>
                </div>
                <div className="flex items-center flex-wrap gap-2 mt-3">
                  <span className={`text-[10.5px] font-readex font-bold px-2.5 py-0.5 rounded-full ${
                    h.audience === "all" ? "bg-gold/15 text-gold" : "bg-burgundy/12 text-burgundy dark:bg-gold/12"
                  }`}>
                    {h.audience === "all" ? "الكل" : "حلقة محددة"}
                  </span>
                  <span className="text-[10.5px] font-readex font-bold px-2.5 py-0.5 rounded-full bg-burgundy/8 dark:bg-gold/8 text-muted-foreground inline-flex items-center gap-1">
                    <Icon name="users" size={11} />
                    {h.recipientCount} طالباً
                  </span>
                  <span className="text-[10.5px] font-readex text-muted-foreground mr-auto">{fmtDateTime(h.createdAt)}</span>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      {/* ── Confirm modal ── */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto icon-bubble text-burgundy">
            <Icon name="send" size={24} />
          </div>
          <h3 className="font-amiri text-xl font-bold text-burgundy">تأكيد الإرسال</h3>
          <p className="font-readex text-sm text-muted-foreground leading-relaxed">
            سيُرسل الإشعار إلى: <span className="font-bold text-foreground">{selectedLabel}</span>
          </p>
          <div className="rounded-2xl bg-burgundy/4 dark:bg-gold/4 border border-burgundy/8 dark:border-gold/8 p-3 text-right">
            <div className="font-readex text-sm font-bold text-foreground truncate">{title}</div>
            <p className="font-readex text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">{body}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={send.isPending}
              className="flex-1 py-2.5 rounded-2xl bg-burgundy/8 dark:bg-gold/8 text-burgundy font-readex text-sm font-bold transition hover:bg-burgundy/12 dark:hover:bg-gold/12 disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={onConfirmSend}
              disabled={send.isPending}
              className="flex-1 py-2.5 btn-bubble btn-primary-bubble font-readex text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Icon name="send" size={15} />
              {send.isPending ? "جارٍ الإرسال…" : "إرسال"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
