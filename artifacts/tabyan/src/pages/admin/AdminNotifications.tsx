import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { fmtDateTime } from "@/lib/format";
import { authStore } from "@/lib/auth";
import { DEMO_LEVELS, DEMO_NOTIFICATIONS_LOG, DEMO_NOTIFICATIONS_RECURRING, DEMO_NOTIFICATION_TEMPLATES } from "@/lib/demo/admin-ops";

const AUDIENCES = [["all_students", "كل الطلاب"], ["all_teachers", "كل المعلمين"], ["specific_level", "مستوى محدد"], ["specific_user", "مستخدم محدد"]] as const;
const TYPE_LABEL: Record<string, string> = {
  general: "عام", reminder: "تذكير", result: "نتيجة", activity: "نشاط", ayah_day: "آية اليوم",
  hadith_day: "حديث اليوم", ibn_qayyim: "درر ابن القيم", session: "حصة", fatwa: "فتوى", recording: "تسجيل",
};

export default function AdminNotifications() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const blocked = () => toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info");
  const [tab, setTab] = useState<"create" | "log" | "recurring">("create");
  const templates = trpc.admin.notificationsTemplates.useQuery(undefined, { enabled: !DEMO });
  const log = trpc.admin.notificationsLog.useQuery(undefined, { enabled: !DEMO });
  const recurring = trpc.admin.notificationsRecurring.useQuery(undefined, { enabled: !DEMO });
  const levels = trpc.admin.levelThresholds.useQuery(undefined, { enabled: !DEMO });
  const templatesData = DEMO ? DEMO_NOTIFICATION_TEMPLATES : (templates.data ?? []);
  const logData = DEMO ? DEMO_NOTIFICATIONS_LOG : (log.data ?? []);
  const logLoading = !DEMO && log.isLoading;
  const recurringData = DEMO ? DEMO_NOTIFICATIONS_RECURRING : (recurring.data ?? []);
  const levelsData = DEMO ? DEMO_LEVELS : (levels.data ?? []);

  const [audience, setAudience] = useState<(typeof AUDIENCES)[number][0]>("all_students");
  const [target, setTarget] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("general");
  const [isRecurring, setIsRecurring] = useState(false);
  const [pattern, setPattern] = useState<"daily_morning" | "daily_noon" | "daily_evening" | "weekly">("daily_morning");

  const create = trpc.admin.notificationCreate.useMutation({
    onSuccess: (r) => {
      toast(`أُرسل الإشعار إلى ${r.sentCount} مستخدم`, "success");
      setTitle(""); setBody(""); setTarget("");
      utils.admin.notificationsLog.invalidate(); utils.admin.notificationsRecurring.invalidate();
    },
    onError: (e) => toast(e.message, "error"),
  });
  const toggleRecurring = trpc.admin.notificationToggleRecurring.useMutation({
    onSuccess: () => utils.admin.notificationsRecurring.invalidate(),
    onError: (e) => toast(e.message, "error"),
  });

  return (
    <div className="space-y-4 page-enter">
      <h1 className="font-amiri text-2xl text-burgundy flex items-center gap-2"><Icon name="bell" size={24} />مركز الإشعارات</h1>
      <div className="flex gap-2">
        {([["create", "إنشاء"], ["log", "السجل"], ["recurring", "المجدولة"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2 rounded-xl font-readex text-sm transition ${tab === k ? "bg-burgundy text-white" : "bg-burgundy/10 text-burgundy"}`}>{l}</button>
        ))}
      </div>

      {tab === "create" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassCard className="p-5 space-y-3">
            <h2 className="font-amiri text-lg text-burgundy">إشعار جديد</h2>
            <div>
              <label className="font-readex text-xs font-bold block mb-1">الجمهور</label>
              <div className="grid grid-cols-2 gap-2">
                {AUDIENCES.map(([k, l]) => (
                  <button key={k} onClick={() => setAudience(k)} className={`py-2 rounded-xl text-xs font-readex transition ${audience === k ? "bg-burgundy text-white" : "bg-burgundy/10 text-burgundy"}`}>{l}</button>
                ))}
              </div>
            </div>
            {audience === "specific_level" && (
              <select value={target} onChange={(e) => setTarget(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm">
                <option value="">اختر المستوى…</option>
                {levelsData.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            )}
            {audience === "specific_user" && (
              <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="معرّف المستخدم (ID)" dir="ltr"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm" />
            )}
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="العنوان *" maxLength={200}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="النص…" maxLength={1000}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm resize-none" />
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm">
              {Object.entries(TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <label className="flex items-center gap-2 font-readex text-sm">
              <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="w-4 h-4 accent-burgundy" />
              إشعار متكرر (FCM مجدول)
            </label>
            {isRecurring && (
              <select value={pattern} onChange={(e) => setPattern(e.target.value as typeof pattern)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm">
                <option value="daily_morning">يومي صباحاً (06:00)</option>
                <option value="daily_noon">يومي ظهراً (12:00)</option>
                <option value="daily_evening">يومي مساءً (21:00)</option>
                <option value="weekly">أسبوعي</option>
              </select>
            )}
            <PrimaryButton className="w-full" disabled={title.trim().length < 3 || create.isPending}
              onClick={() => DEMO ? blocked() : create.mutate({
                audienceType: audience, audienceTarget: target || undefined,
                title: title.trim(), body: body || undefined, type: type as never,
                isRecurring, recurrencePattern: isRecurring ? pattern : undefined,
              })}>
              {create.isPending ? "جارٍ الإرسال…" : "إرسال"}
            </PrimaryButton>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="font-amiri text-lg text-burgundy mb-2">قوالب جاهزة</h2>
            <div className="space-y-2">
              {(templatesData).map((t) => (
                <button key={t.key} onClick={() => { setTitle(t.title); setBody(t.body); setType(t.type); }}
                  className="w-full text-right rounded-xl bg-burgundy/5 dark:bg-white/5 p-3 hover:bg-burgundy/10 transition">
                  <div className="font-readex text-sm font-bold">{t.title}</div>
                  <div className="font-readex text-xs text-muted-foreground line-clamp-1">{t.body}</div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground font-readex mt-2">الإشعارات اليومية التلقائية: آية 06:00 · حديث 12:00 · درر ابن القيم 21:00 (FCM فقط)</p>
          </GlassCard>
        </div>
      )}

      {tab === "log" && (
        logLoading ? <div className="h-40 skeleton rounded-[1.5rem]" /> :
        !logData.length ? <EmptyState title="لا إشعارات مرسلة" /> : (
          <div className="space-y-2">
            {logData.map((n) => (
              <GlassCard key={n.id} className="p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-readex text-sm font-bold">{n.title}</span>
                  <span className="text-[10px] font-readex bg-burgundy/10 text-burgundy px-2 py-0.5 rounded-full">{TYPE_LABEL[n.notificationType] ?? n.notificationType}</span>
                  <span className="text-[10px] font-readex bg-gold/15 text-gold-dark dark:text-gold px-2 py-0.5 rounded-full">
                    {AUDIENCES.find((a) => a[0] === n.audienceType)?.[1] ?? n.audienceType}
                  </span>
                  {n.isRecurring && <span className="text-muted-foreground inline-flex"><Icon name="refresh" size={12} /></span>}
                </div>
                {n.body && <p className="font-readex text-xs text-muted-foreground mt-1 line-clamp-2">{n.body}</p>}
                <div className="text-[11px] text-muted-foreground font-readex mt-1">{fmtDateTime(n.sentAt)} · بواسطة {n.adminName ?? "—"}</div>
              </GlassCard>
            ))}
          </div>
        )
      )}

      {tab === "recurring" && (
        !recurringData.length ? <EmptyState title="لا إشعارات مجدولة" hint="أنشئ إشعاراً متكرراً من تبويب «إنشاء»" /> : (
          <div className="space-y-2">
            {recurringData.map((n) => (
              <GlassCard key={n.id} className="p-4 flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-readex text-sm font-bold flex items-center gap-1.5">{n.title} <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1"><Icon name="refresh" size={11} /><span dir="ltr">{n.recurrencePattern}</span></span></div>
                  {n.body && <p className="font-readex text-xs text-muted-foreground line-clamp-1">{n.body}</p>}
                </div>
                <button onClick={() => DEMO ? blocked() : toggleRecurring.mutate({ id: n.id, isRecurring: false })}
                  className="text-xs font-readex text-destructive hover:underline shrink-0">إيقاف التكرار</button>
              </GlassCard>
            ))}
          </div>
        )
      )}
    </div>
  );
}
