import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";
import { DarkModeToggle } from "@/components/AppHeader";
import { InitialsAvatar } from "@/components/CircularUserCard";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { authStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { DEMO_KYC, DEMO_ME, DEMO_TEACHER_SETTINGS, type DemoTeacherSettings } from "@/lib/demo/teacher";

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <div className="font-readex text-sm font-bold">{label}</div>
        {desc && <div className="font-readex text-[11px] text-muted-foreground">{desc}</div>}
      </div>
      <button onClick={() => onChange(!checked)} className={`w-12 h-6 rounded-full transition relative ${checked ? "bg-gold" : "bg-burgundy/20"}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? "right-0.5" : "right-6"}`} />
      </button>
    </div>
  );
}

export default function TeacherSettings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const meQ = trpc.auth.me.useQuery(undefined, { enabled: !DEMO });
  const settingsQ = trpc.teacher.settings.useQuery(undefined, { enabled: !DEMO });
  const kycQ = trpc.teacher.kycStatus.useQuery(undefined, { enabled: !DEMO });
  const meData: unknown = DEMO ? DEMO_ME : meQ.data;
  const kyc = DEMO ? DEMO_KYC : kycQ.data;
  const [bio, setBio] = useState("");
  const [fullName, setFullName] = useState("");
  const [demoSettings, setDemoSettings] = useState<DemoTeacherSettings>(DEMO_TEACHER_SETTINGS);

  useEffect(() => {
    const d = meData as Record<string, unknown> | null | undefined;
    if (d && "fullName" in d) setFullName(d.fullName as string);
    if (d && "teacher" in d) {
      const t = (d as { teacher?: { bio?: string | null } | null }).teacher;
      setBio(t?.bio ?? "");
    }
  }, [meData]);

  const update = trpc.teacher.updateSettings.useMutation({
    onSuccess: () => { toast("حُفظت الإعدادات", "success"); utils.teacher.settings.invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const saveProfile = trpc.teacher.updateProfile.useMutation({
    onSuccess: () => { toast("حُفظ ملفك", "success"); authStore.setName(fullName); utils.auth.me.invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const applySettings = (patch: Partial<DemoTeacherSettings>) => {
    if (DEMO) { setDemoSettings((p) => ({ ...p, ...patch })); toast("وضع العرض التجريبي — حُفظ محلياً فقط", "info"); return; }
    update.mutate(patch);
  };
  const onSaveProfile = () => {
    if (DEMO) { authStore.setName(fullName); toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info"); return; }
    saveProfile.mutate({ fullName: fullName || undefined, bio: bio || undefined });
  };

  const s = DEMO ? demoSettings : settingsQ.data;
  const logout = async () => { await api.logout(); authStore.clear(); navigate("/"); };

  return (
    <div className="space-y-4 page-enter">
      <GlassCard className="p-5 text-center">
        <div className="flex justify-center"><InitialsAvatar name={fullName || authStore.name || "معلم"} size={72} /></div>
        <h1 className="font-amiri text-xl text-burgundy mt-2">{fullName || authStore.name}</h1>
        <p className="font-readex text-xs text-muted-foreground" dir="ltr">{meData && typeof meData === "object" && "phone" in meData ? String((meData as { phone?: string }).phone ?? "") : ""}</p>
        <div className="flex justify-center gap-2 mt-2">
          <span className={`text-[11px] font-readex px-3 py-1 rounded-full inline-flex items-center gap-1.5 ${kyc?.kycStatus === "approved" ? "bg-green-100 text-green-700" : kyc?.kycStatus === "rejected" ? "bg-destructive/15 text-destructive" : "bg-gold/20 text-gold-dark dark:text-gold"}`}>
            <Icon name={kyc?.kycStatus === "approved" ? "check-circle" : kyc?.kycStatus === "rejected" ? "x-circle" : "hourglass"} size={13} />
            {kyc?.kycStatus === "approved" ? "موثّق" : kyc?.kycStatus === "rejected" ? "مرفوض" : kyc?.kycStatus === "awaiting_assessment" ? "بانتظار اختبار القبول" : kyc?.kycStatus === "in_progress" ? "الاختبار قيد التنفيذ" : "قيد المراجعة"}
          </span>
          {kyc?.isMufti && <span className="text-[11px] font-readex px-3 py-1 rounded-full bg-gold/20 text-gold-dark dark:text-gold inline-flex items-center gap-1.5"><Icon name="mosque" size={13} />مفتٍ</span>}
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <h2 className="font-amiri text-lg text-burgundy mb-2">الملف الشخصي</h2>
        <label className="font-readex text-xs font-bold block mb-1">الاسم</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold mb-2" />
        <label className="font-readex text-xs font-bold block mb-1">نبذة تعريفية</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500}
          className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none" />
        <PrimaryButton className="w-full mt-2" disabled={saveProfile.isPending}
          onClick={onSaveProfile}>حفظ الملف</PrimaryButton>
      </GlassCard>

      <GlassCard className="p-4">
        <h2 className="font-amiri text-lg text-burgundy mb-1">إعدادات الحصص</h2>
        <Toggle label="التسجيل التلقائي" desc="بدء التسجيل فور بدء الحصة" checked={s?.autoRecord ?? false} onChange={(v) => applySettings({ autoRecord: v })} />
        <Toggle label="الكاميرا مفعّلة افتراضياً" checked={s?.defaultCameraOn ?? true} onChange={(v) => applySettings({ defaultCameraOn: v })} />
        <Toggle label="المايك مفعّل افتراضياً" checked={s?.defaultMicOn ?? true} onChange={(v) => applySettings({ defaultMicOn: v })} />
        <div className="border-t border-border mt-2 pt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="font-readex text-xs font-bold block mb-1">جودة الفيديو</label>
            <select value={s?.videoQuality ?? "720p"} onChange={(e) => applySettings({ videoQuality: e.target.value as DemoTeacherSettings["videoQuality"] })}
              className="w-full rounded-lg border border-input bg-background px-2 py-2 font-readex text-sm" dir="ltr">
              {["360p", "480p", "720p", "1080p"].map((q) => <option key={q}>{q}</option>)}
            </select>
          </div>
          <div>
            <label className="font-readex text-xs font-bold block mb-1">جودة الصوت</label>
            <select value={s?.audioQuality ?? "high"} onChange={(e) => applySettings({ audioQuality: e.target.value as DemoTeacherSettings["audioQuality"] })}
              className="w-full rounded-lg border border-input bg-background px-2 py-2 font-readex text-sm" dir="ltr">
              {[["low", "منخفضة"], ["medium", "متوسطة"], ["high", "عالية"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <h2 className="font-amiri text-lg text-burgundy mb-1">الإشعارات والمظهر</h2>
        <div className="flex items-center justify-between py-2.5">
          <div className="font-readex text-sm font-bold">الوضع الليلي</div>
          <DarkModeToggle />
        </div>
        <div className="border-t border-border" />
        <Toggle label="الإشعارات" checked={s?.notificationsEnabled ?? true} onChange={(v) => applySettings({ notificationsEnabled: v })} />
        <Toggle label="الصوت" checked={s?.soundEnabled ?? true} onChange={(v) => applySettings({ soundEnabled: v })} />
        <Toggle label="الاهتزاز" checked={(s as { vibrationEnabled?: boolean } | null)?.vibrationEnabled ?? true} onChange={(v) => applySettings({ vibrationEnabled: v })} />
        <div className="pt-2">
          <label className="font-readex text-xs font-bold block mb-1">تذكير قبل الحصة</label>
          <select value={s?.reminderMinutes ?? 15} onChange={(e) => applySettings({ reminderMinutes: Number(e.target.value) })}
            className="w-full rounded-lg border border-input bg-background px-2 py-2 font-readex text-sm" dir="ltr">
            {[5, 10, 15, 30, 60].map((m) => <option key={m} value={m}>{m} دقيقة</option>)}
          </select>
        </div>
      </GlassCard>

      <button onClick={logout} className="w-full py-3 rounded-xl bg-destructive/10 text-destructive font-readex font-bold text-sm hover:bg-destructive/20 transition">تسجيل الخروج</button>
    </div>
  );
}
