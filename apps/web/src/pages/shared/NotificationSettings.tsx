import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/app/GlassCard";
import Icon, { type IconName } from "@/components/app/Icon";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/useToast";
import { authStore } from "@/lib/auth";
import { DEMO_NOTIF_SETTINGS } from "@/lib/demo/student-extra";

const AYAH_TIME_OPTIONS: Array<{ value: string; label: string; icon: IconName }> = [
  { value: "05:00", label: "الفجر", icon: "moon" },
  { value: "12:00", label: "الظهر", icon: "sun" },
  { value: "18:30", label: "المغرب", icon: "sun" },
  { value: "20:00", label: "العشاء", icon: "moon" },
];

const REMINDER_OPTIONS = [
  { value: 15, label: "قبل ١٥ دقيقة" },
  { value: 30, label: "قبل ٣٠ دقيقة" },
  { value: 60, label: "قبل ساعة" },
  { value: 1440, label: "قبل يوم" },
] as const;

type ToggleKey =
  | "sessionReminders" | "sessionChanges" | "evaluations" | "achievements"
  | "announcements" | "ayahOfDay" | "payments"
  | "dndDuringPrayer" | "dndDuringSession"
  | "pushEnabled" | "soundEnabled" | "vibrationEnabled";

const TYPE_TOGGLES: Array<{ key: ToggleKey; label: string; hint: string; icon: IconName }> = [
  { key: "sessionReminders", label: "تذكير الجلسات", hint: "تنبيه قبل بدء كل جلسة", icon: "clock" },
  { key: "sessionChanges", label: "تغييرات المواعيد", hint: "عند تعديل أو إلغاء موعد", icon: "calendar" },
  { key: "evaluations", label: "التقييمات", hint: "عند وصول تقييم جديد من المعلم", icon: "star" },
  { key: "achievements", label: "الإنجازات", hint: "الشهادات وإتمام المستويات", icon: "certificate" },
  { key: "announcements", label: "إعلانات الإدارة", hint: "التعميمات والأخبار", icon: "bell" },
  { key: "ayahOfDay", label: "آية اليوم", hint: "آية يومية للتدبر", icon: "quran" },
  { key: "payments", label: "المدفوعات", hint: "الفواتير والاشتراكات", icon: "file-text" },
];

const DND_TOGGLES: Array<{ key: ToggleKey; label: string; hint: string; icon: IconName }> = [
  { key: "dndDuringPrayer", label: "صامت وقت الصلاة", hint: "إيقاف التنبيهات في أوقات الصلاة", icon: "mosque" },
  { key: "dndDuringSession", label: "صامت أثناء الجلسة", hint: "إيقاف التنبيهات أثناء جلساتك", icon: "mic-off" },
];

const CHANNEL_TOGGLES: Array<{ key: ToggleKey; label: string; hint: string; icon: IconName }> = [
  { key: "pushEnabled", label: "الإشعارات الفورية", hint: "استلام التنبيهات داخل المنصة", icon: "bell" },
  { key: "soundEnabled", label: "الصوت", hint: "نغمة عند وصول إشعار", icon: "headphones" },
  { key: "vibrationEnabled", label: "الاهتزاز", hint: "اهتزاز الجهاز عند التنبيه", icon: "phone" },
];

/** شاشة إعدادات الإشعارات — أنواع، توقيت، عدم الإزعاج، القنوات */
export default function NotificationSettings({ base, navPath }: { base: string; navPath?: string }) {
  const listPath = navPath ?? `${base}/notifications`;
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const blocked = () => toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info");

  const settingsQuery = trpc.notifications.getSettings.useQuery(undefined, { enabled: !DEMO });
  const s = DEMO ? DEMO_NOTIF_SETTINGS : settingsQuery.data;
  const isLoading = DEMO ? false : settingsQuery.isLoading;

  const update = trpc.notifications.updateSettings.useMutation({
    onSuccess: () => utils.notifications.getSettings.invalidate(),
    onError: (e) => { toast(e.message, "error"); utils.notifications.getSettings.invalidate(); },
  });

  const clearRead = trpc.notifications.clearRead.useMutation({
    onSuccess: () => {
      toast("تم مسح الإشعارات المقروءة", "success");
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
    onError: (e) => toast(e.message, "error"),
  });

  const setToggle = (key: ToggleKey, value: boolean) =>
    DEMO ? blocked() : update.mutate({ [key]: value });

  if (isLoading || !s) {
    return (
      <div className="max-w-lg mx-auto space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-40 skeleton rounded-[1.5rem]" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4 page-enter max-w-lg mx-auto">
      <Link
        to={listPath}
        className="font-readex text-sm font-bold text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1.5"
      >
        <Icon name="arrow-right" size={16} />
        الإشعارات
      </Link>

      <h1 className="font-amiri text-2xl text-burgundy flex items-center gap-2">
        إعدادات الإشعارات
        <Icon name="settings" size={22} />
      </h1>

      {/* أنواع الإشعارات */}
      <GlassCard className="p-5">
        <p className="font-readex text-sm font-extrabold text-burgundy mb-4 flex items-center gap-2">
          <Icon name="bell" size={17} />
          أنواع الإشعارات
        </p>
        <div className="space-y-4">
          {TYPE_TOGGLES.map((t) => (
            <SettingRow key={t.key} icon={t.icon} label={t.label} hint={t.hint}
              checked={Boolean(s[t.key])} onChange={(v) => setToggle(t.key, v)} />
          ))}
        </div>
      </GlassCard>

      {/* التوقيت */}
      <GlassCard className="p-5 space-y-5">
        <p className="font-readex text-sm font-extrabold text-burgundy flex items-center gap-2">
          <Icon name="clock" size={17} />
          التوقيت
        </p>
        <div>
          <p className="font-readex text-xs font-bold text-muted-foreground mb-2">موعد تذكير الجلسة</p>
          <div className="flex flex-wrap gap-1.5">
            {REMINDER_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => (DEMO ? blocked() : update.mutate({ reminderBeforeMinutes: o.value }))}
                className={`font-readex text-xs font-bold px-3.5 py-2 rounded-full border transition btn-press ${
                  s.reminderBeforeMinutes === o.value
                    ? "bg-burgundy text-white border-burgundy dark:bg-gold dark:text-night dark:border-gold shadow-sm"
                    : "bg-transparent border-border text-foreground hover:border-gold"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="font-readex text-xs font-bold text-muted-foreground mb-2">وقت وصول آية اليوم</p>
          <div className="grid grid-cols-2 gap-1.5">
            {AYAH_TIME_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => (DEMO ? blocked() : update.mutate({ ayahDeliveryTime: o.value }))}
                className={`font-readex text-xs font-bold px-3 py-2.5 rounded-xl border transition btn-press inline-flex items-center justify-center gap-1.5 ${
                  s.ayahDeliveryTime === o.value
                    ? "bg-burgundy text-white border-burgundy dark:bg-gold dark:text-night dark:border-gold shadow-sm"
                    : "bg-transparent border-border text-foreground hover:border-gold"
                }`}
              >
                <Icon name={o.icon} size={13} />
                {o.label}
              </button>
            ))}
          </div>
          <p className="font-readex text-[10px] text-muted-foreground mt-1.5" dir="ltr">{s.ayahDeliveryTime}</p>
        </div>
      </GlassCard>

      {/* عدم الإزعاج */}
      <GlassCard className="p-5">
        <p className="font-readex text-sm font-extrabold text-burgundy mb-4 flex items-center gap-2">
          <Icon name="moon" size={17} />
          عدم الإزعاج
        </p>
        <div className="space-y-4">
          {DND_TOGGLES.map((t) => (
            <SettingRow key={t.key} icon={t.icon} label={t.label} hint={t.hint}
              checked={Boolean(s[t.key])} onChange={(v) => setToggle(t.key, v)} />
          ))}
        </div>
      </GlassCard>

      {/* القنوات */}
      <GlassCard className="p-5">
        <p className="font-readex text-sm font-extrabold text-burgundy mb-4 flex items-center gap-2">
          <Icon name="send" size={17} />
          قنوات التنبيه
        </p>
        <div className="space-y-4">
          {CHANNEL_TOGGLES.map((t) => (
            <SettingRow key={t.key} icon={t.icon} label={t.label} hint={t.hint}
              checked={Boolean(s[t.key])} onChange={(v) => setToggle(t.key, v)} />
          ))}
        </div>
      </GlassCard>

      {/* مسح الإشعارات المقروءة — زر أحمر شفاف */}
      <button
        onClick={() => (DEMO ? blocked() : clearRead.mutate())}
        disabled={clearRead.isPending}
        className="w-full py-3 rounded-2xl border border-destructive/30 bg-destructive/5 font-readex text-sm font-extrabold text-destructive hover:bg-destructive/10 btn-press transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Icon name="trash" size={15} />
        مسح الإشعارات المقروءة
      </button>
    </div>
  );
}

function SettingRow({ icon, label, hint, checked, onChange }: {
  icon: IconName; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-burgundy/8 dark:bg-gold/10 flex items-center justify-center text-burgundy shrink-0">
        <Icon name={icon} size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-readex text-sm font-extrabold text-foreground">{label}</p>
        <p className="font-readex text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <Switch dir="ltr" checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-gold" />
    </div>
  );
}
