import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Icon from "@/components/Icon";
import { InitialsAvatar } from "@/components/CircularUserCard";
import { DarkModeToggle } from "@/components/AppHeader";
import { useToast } from "@/hooks/useToast";
import { authStore } from "@/lib/auth";
import { api } from "@/lib/api";
import PrayerNotifSettings from "@/components/app/PrayerNotifSettings";
import { enableBiometric, hasBiometricSession, isBiometricAvailable } from "@/lib/webauthn";
import { DEMO_ME, DEMO_MY_LIBRARY, DEMO_PROGRESS, DEMO_SETTINGS, type DemoSettings } from "@/lib/demo/student-extra";
import { getRecitationCuesEnabled, setRecitationCuesEnabled } from "@/lib/mushaf/recitation-cues";

const DEMO_TOAST = "وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم";
const DEMO_SETTINGS_KEY = "tabyan.demo.studentSettings";

function loadDemoSettings(): DemoSettings {
  try {
    const raw = localStorage.getItem(DEMO_SETTINGS_KEY);
    if (!raw) {
      const legacyAyah = localStorage.getItem("tabyan.demo.ayahNotification");
      return legacyAyah === null ? DEMO_SETTINGS : { ...DEMO_SETTINGS, ayahNotification: legacyAyah !== "false" };
    }
    const stored = JSON.parse(raw) as Partial<DemoSettings>;
    return { ...DEMO_SETTINGS, ...stored };
  } catch {
    return DEMO_SETTINGS;
  }
}

function saveDemoSettings(settings: DemoSettings) {
  try {
    localStorage.setItem(DEMO_SETTINGS_KEY, JSON.stringify(settings));
    // إبقاء القيمة القديمة متوافقة مع أي تبويب تجريبي مفتوح من إصدار سابق.
    localStorage.setItem("tabyan.demo.ayahNotification", String(settings.ayahNotification));
  } catch { /* التخزين المحلي غير متاح */ }
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
  disabled = false,
  loading = false,
  showStatus = false,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  showStatus?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${label}: ${loading ? "جارٍ الحفظ" : checked ? "مفعّل" : "معطّل"}`}
      aria-busy={loading}
      disabled={disabled || loading}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 py-2.5 text-start rounded-lg transition hover:bg-burgundy/5 dark:hover:bg-gold/5 disabled:cursor-wait disabled:opacity-75"
    >
      <div className="min-w-0">
        <div className="font-readex text-sm font-bold">{label}</div>
        {desc && <div className="font-readex text-[11px] text-muted-foreground">{desc}</div>}
        {showStatus && (
          <div className="font-readex text-[11px] font-bold text-muted-foreground mt-0.5">
            {loading ? "جارٍ الحفظ…" : checked ? "مفعّل" : "معطّل"}
          </div>
        )}
      </div>
      <span
        aria-hidden="true"
        className={`relative w-12 h-6 rounded-full shrink-0 transition-colors ${
          checked ? "bg-gold" : "bg-burgundy/20 dark:bg-gold/20"
        }`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white dark:bg-night shadow transition-all ${checked ? "right-0.5" : "right-6"}`} />
      </span>
    </button>
  );
}

export default function StudentAccount() {
  const DEMO = authStore.isDemo;
  const { toast } = useToast();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery(undefined, { enabled: !DEMO });
  const settings = trpc.student.settings.useQuery(undefined, { enabled: !DEMO });
  const progress = trpc.student.progress.useQuery(undefined, { enabled: !DEMO });
  const myLib = trpc.library.myLibrary.useQuery(undefined, { enabled: !DEMO });
  const [demoSettings, setDemoSettings] = useState<DemoSettings>(() => DEMO ? loadDemoSettings() : DEMO_SETTINGS);
  const [pendingAyahNotification, setPendingAyahNotification] = useState<boolean | null>(null);
  const [recitationCuesEnabled, setRecitationCuesEnabledState] = useState(() => getRecitationCuesEnabled());
  // تفعيل البصمة خطوة اختيارية لاحقة — تظهر فقط لجهاز يدعمها ولم يفعّلها بعد (لا تُفعَّل تلقائياً أبداً)
  const [bioOk, setBioOk] = useState(false);
  useEffect(() => {
    void isBiometricAvailable().then((ok) => setBioOk(ok && !hasBiometricSession()));
  }, []);
  const update = trpc.student.updateSettings.useMutation({
    onSuccess: () => { toast("حُفظت الإعدادات", "success"); utils.student.settings.invalidate(); },
    onError: (e) => {
      setPendingAyahNotification(null);
      toast(e.message, "error");
    },
  });

  // في وضع العرض: تحديث الإعدادات محلياً فقط — بلا أي طلب للخادم
  const setSetting = (patch: Partial<DemoSettings>) => {
    if (DEMO) {
      setDemoSettings((prev) => {
        const next = { ...prev, ...patch };
        saveDemoSettings(next);
        if ("ayahNotification" in patch) {
          window.dispatchEvent(new Event("tabyan:ayah-notification-changed"));
        }
        return next;
      });
      return;
    }
    // تحديث متفائل حتى يظهر أثر الضغط مباشرة، مع إعادة الجلب عند نجاح/فشل الطلب.
    utils.student.settings.setData(undefined, (current) => current ? { ...current, ...patch } : current);
    update.mutate(patch);
  };

  const setAyahNotification = (value: boolean) => {
    if (DEMO) {
      setSetting({ ayahNotification: value });
      return;
    }
    if (update.isPending) return;
    setPendingAyahNotification(value);
    update.mutate({ ayahNotification: value });
  };

  const s = DEMO ? demoSettings : settings.data;
  const ayahNotification = pendingAyahNotification ?? s?.ayahNotification ?? true;
  useEffect(() => {
    if (pendingAyahNotification !== null && settings.data?.ayahNotification === pendingAyahNotification) {
      setPendingAyahNotification(null);
    }
  }, [pendingAyahNotification, settings.data?.ayahNotification]);

  const u = DEMO ? (DEMO_ME as typeof me.data) : me.data;
  const progressRows = DEMO ? DEMO_PROGRESS : (progress.data ?? []);
  const libData = DEMO ? DEMO_MY_LIBRARY : myLib.data;
  const student = u && "student" in u ? (u as { student?: { currentLevelId?: number | null; totalJuz?: number } | null }).student : null;
  const age = u && "age" in u ? (u as { age?: number | null }).age : null;

  const logout = async () => {
    await api.logout();
    authStore.clear();
    navigate("/");
  };

  return (
    <div className="space-y-4 page-enter">
      {/* Profile card */}
      <GlassCard hover={false} className="p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 rounded-[1.5rem] pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(212,175,55,0.10), transparent 70%)" }} />
        <div className="flex justify-center mb-3"><InitialsAvatar name={u?.fullName ?? authStore.name ?? "طالب"} size={80} /></div>
        <h1
          className="hero-greeting font-amiri text-2xl font-bold"
        >{u?.fullName ?? authStore.name}</h1>
        <p className="font-readex text-xs text-muted-foreground mt-0.5" dir="ltr">{u?.phone}</p>
        <div className="flex justify-center gap-3 mt-4 font-readex text-xs">
          {age != null && <span className="bg-burgundy/8 dark:bg-gold/8 border border-burgundy/12 dark:border-gold/12 rounded-full px-3 py-1.5 font-bold">العمر: {age} سنة</span>}
          <span className="bg-burgundy/8 dark:bg-gold/8 border border-burgundy/12 dark:border-gold/12 rounded-full px-3 py-1.5 font-bold">الأجزاء: {student?.totalJuz ?? 0}</span>
        </div>
      </GlassCard>

      {/* Progress */}
      <GlassCard className="p-4">
        <div className="font-amiri text-lg text-burgundy mb-2 flex items-center gap-2">تقدمي الدراسي<Icon name="chart" size={20} /></div>
        {!progressRows.length ? <p className="font-readex text-xs text-muted-foreground">لا تقدم مسجل بعد</p> : (
          <div className="space-y-2">
            {progressRows.map((p) => (
              <div key={p.levelId} className="rounded-xl bg-burgundy/5 dark:bg-white/5 p-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-readex text-sm font-bold">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground font-readex">
                    {p.completedSessions} حلقة · {p.completedJuz} أجزاء · متوسط {Number(p.averageScore).toFixed(0)}%
                  </div>
                </div>
                <span className={`text-[11px] font-readex px-2 py-1 rounded-full ${p.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : p.status === "in_progress" ? "bg-gold/20 text-gold-dark" : "bg-muted text-muted-foreground"}`}>
                  {p.status === "completed" ? <span className="inline-flex items-center gap-0.5">مكتمل<Icon name="check" size={11} /></span> : p.status === "in_progress" ? "جارٍ" : "مقفل"}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* My library quick view */}
      <GlassCard className="p-4">
        <div className="font-amiri text-lg text-burgundy mb-2 flex items-center gap-2">مكتبتي<Icon name="bookmark" size={20} /></div>
        <div className="grid grid-cols-2 gap-2 text-center font-readex text-sm">
          <div className="rounded-xl bg-burgundy/5 dark:bg-white/5 py-3">
            <div className="font-amiri text-xl text-burgundy">{libData?.bookmarks.length ?? 0}</div>
            <div className="text-[11px] text-muted-foreground">إشارات مرجعية</div>
          </div>
          <div className="rounded-xl bg-burgundy/5 dark:bg-white/5 py-3">
            <div className="font-amiri text-xl text-burgundy">{libData?.downloads.length ?? 0}</div>
            <div className="text-[11px] text-muted-foreground">تنزيلات</div>
          </div>
        </div>
      </GlassCard>

      {/* Settings */}
      <GlassCard className="p-4">
        <div className="font-amiri text-lg text-burgundy mb-1 flex items-center gap-2">الإعدادات<Icon name="settings" size={20} /></div>
        <div className="flex items-center justify-between py-2.5">
          <div className="font-readex text-sm font-bold">الوضع الليلي</div>
          <DarkModeToggle />
        </div>
        <div className="border-t border-border" />
        <Toggle
          label="أصوات التفاعل"
          desc="إشارات هادئة عند بدء التسميع وإيقافه واستئنافه وإنهائه"
          checked={recitationCuesEnabled}
          onChange={(enabled) => {
            setRecitationCuesEnabled(enabled);
            setRecitationCuesEnabledState(enabled);
          }}
          showStatus
        />
        <div className="border-t border-border" />
        <Toggle
          label="آية اليوم"
          desc="يومياً 6:00 صباحاً"
          checked={ayahNotification}
          onChange={setAyahNotification}
          disabled={!DEMO && update.isPending}
          loading={!DEMO && update.isPending && pendingAyahNotification !== null}
          showStatus
        />
        <Toggle label="حديث اليوم" desc="يومياً 12:00 ظهراً" checked={s?.hadithNotification ?? true} onChange={(v) => setSetting({ hadithNotification: v })} disabled={!DEMO && update.isPending} />
        <Toggle label="درر ابن القيم" desc="يومياً 9:00 مساءً" checked={s?.ibnQayyimNotification ?? true} onChange={(v) => setSetting({ ibnQayyimNotification: v })} disabled={!DEMO && update.isPending} />
        <Toggle label="تقرير النشاط الأسبوعي" checked={s?.activityNotification ?? false} onChange={(v) => setSetting({ activityNotification: v })} disabled={!DEMO && update.isPending} />
        <div className="border-t border-border mt-2 pt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="font-readex text-xs font-bold block mb-1">جودة الفيديو</label>
            <select value={s?.videoQuality ?? "720p"} onChange={(e) => setSetting({ videoQuality: e.target.value })} disabled={!DEMO && update.isPending}
              className="w-full rounded-lg border border-input bg-background px-2 py-2 font-readex text-sm" dir="ltr">
              {["360p", "480p", "720p", "1080p"].map((q) => <option key={q}>{q}</option>)}
            </select>
          </div>
          <div>
            <label className="font-readex text-xs font-bold block mb-1">تذكير قبل الحلقة</label>
            <select value={s?.sessionReminderMinutes ?? 15} onChange={(e) => setSetting({ sessionReminderMinutes: Number(e.target.value) })} disabled={!DEMO && update.isPending}
              className="w-full rounded-lg border border-input bg-background px-2 py-2 font-readex text-sm" dir="ltr">
              {[5, 10, 15, 30, 60].map((m) => <option key={m} value={m}>{m} دقيقة</option>)}
            </select>
          </div>
        </div>
        {bioOk && (
          <button
            onClick={async () => {
              const ok = await enableBiometric();
              if (ok) { toast("تم تفعيل الدخول بالبصمة على هذا الجهاز", "success"); setBioOk(false); }
              else toast("تعذّر تفعيل البصمة — يمكنك المحاولة لاحقاً", "error");
            }}
            className="w-full mt-3 py-3 rounded-xl bg-gold/10 text-gold-dark dark:text-gold font-readex font-bold text-sm hover:bg-gold/20 transition"
          >
            تفعيل الدخول بالبصمة / Face ID (اختياري)
          </button>
        )}
      </GlassCard>

      {/* Prayer time notifications — ميزة مستقلة */}
      <PrayerNotifSettings />

      <button onClick={logout} className="w-full py-3 rounded-xl bg-destructive/10 text-destructive font-readex font-bold text-sm hover:bg-destructive/20 transition">
        تسجيل الخروج
      </button>
      <p className="text-center text-[10px] text-muted-foreground font-readex pb-2">تبيان — نسخة تجريبية · مجانية 100٪ لوجه الله</p>
    </div>
  );
}
