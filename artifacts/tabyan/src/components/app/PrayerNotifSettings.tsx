import { useCallback, useEffect, useRef, useState } from "react";
import GlassCard from "@/components/GlassCard";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import {
  PRAYER_DEFS,
  clearPrayerCoords,
  fetchTodayPrayerTimes,
  fetchTomorrowFajr,
  getNextPrayer,
  getNotifPermission,
  getPrayerCoords,
  loadPrayerNotifSettings,
  requestNotifPermission,
  reschedulePrayerNotifications,
  savePrayerNotifSettings,
  type NotifPermission,
  type PrayerNotifSettings,
  type PrayerTime,
} from "@/lib/prayer-notifications";

function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={`flex items-center justify-between py-2 ${disabled ? "opacity-45 pointer-events-none" : ""}`}>
      <div className="font-readex text-sm font-bold">{label}</div>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} aria-label={label}
        className={`w-12 h-6 rounded-full transition relative ${checked ? "bg-gold" : "bg-burgundy/20"}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? "right-0.5" : "right-6"}`} />
      </button>
    </div>
  );
}

function pad(n: number): string { return String(n).padStart(2, "0"); }

function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

function fmtTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PrayerNotifSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PrayerNotifSettings>(() => loadPrayerNotifSettings());
  const [perm, setPerm] = useState<NotifPermission>(() => getNotifPermission());
  const [times, setTimes] = useState<PrayerTime[] | null>(null);
  const [tomorrowFajr, setTomorrowFajr] = useState<PrayerTime | null>(null);
  const [locating, setLocating] = useState(false);
  const [, setTick] = useState(0);
  const dayRef = useRef(new Date().getDate());
  const mountedRef = useRef(true);
  const seqRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // جلب مواقيت اليوم لعرض «الصلاة القادمة» — بتسلسل طلبات يمنع الكتابة فوق الأحدث أو بعد فك التركيب
  const loadTimes = useCallback(async (forceLocation = false) => {
    const seq = ++seqRef.current;
    try {
      const coords = await getPrayerCoords(forceLocation);
      const today = await fetchTodayPrayerTimes(coords);
      // بعد العشاء: اجلب فجر الغد حتى يستمر العداد
      const fajr = getNextPrayer(today) ? null : await fetchTomorrowFajr(coords);
      if (!mountedRef.current || seq !== seqRef.current) return;
      setTimes(today);
      setTomorrowFajr(fajr);
      dayRef.current = new Date().getDate();
    } catch {
      if (!mountedRef.current || seq !== seqRef.current) return;
      setTimes(null);
      setTomorrowFajr(null);
    }
  }, []);

  useEffect(() => {
    if (settings.enabled) void loadTimes();
  }, [settings.enabled, loadTimes]);

  // عدّاد تنازلي حي + إعادة جلب عند تغيّر اليوم
  useEffect(() => {
    if (!settings.enabled) return;
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
      if (new Date().getDate() !== dayRef.current) void loadTimes();
    }, 1000);
    return () => window.clearInterval(id);
  }, [settings.enabled, loadTimes]);

  const apply = (next: PrayerNotifSettings) => {
    setSettings(next);
    savePrayerNotifSettings(next);
  };

  const onMasterToggle = async (v: boolean) => {
    if (!v) {
      apply({ ...settings, enabled: false });
      clearPrayerCoords(); // خصوصية: لا يبقى موقع مخزّن بعد إيقاف الميزة
      setTimes(null);
      setTomorrowFajr(null);
      return;
    }
    const p = await requestNotifPermission();
    setPerm(p);
    if (p === "unsupported") {
      toast("متصفحك لا يدعم إشعارات النظام", "error");
      return;
    }
    apply({ ...settings, enabled: true });
    setLocating(true);
    await loadTimes();
    if (mountedRef.current) setLocating(false);
    if (p === "granted") {
      toast("فُعّلت تنبيهات مواقيت الصلاة", "success");
    } else {
      toast("الإشعارات مرفوضة من المتصفح — سيعمل العداد دون تنبيهات نظام", "error");
    }
  };

  const onRefreshLocation = async () => {
    setLocating(true);
    await loadTimes(true);
    if (!mountedRef.current) return;
    void reschedulePrayerNotifications();
    setLocating(false);
    toast("حُدّثت المواقيت بحسب موقعك الحالي", "success");
  };

  const next = times ? (getNextPrayer(times) ?? tomorrowFajr) : null;
  const isTomorrow = !!next && next.at.getDate() !== new Date().getDate();

  return (
    <GlassCard className="p-4">
      <div className="font-amiri text-lg text-burgundy mb-1 flex items-center gap-2">
        مواقيت الصلاة<Icon name="bell" size={20} />
      </div>

      <Toggle label="تنبيهات الصلاة" checked={settings.enabled} onChange={(v) => void onMasterToggle(v)} />
      {settings.enabled && perm === "denied" && (
        <p className="font-readex text-[11px] text-muted-foreground -mt-1 mb-1">
          إشعارات النظام مرفوضة من إعدادات المتصفح — يعمل العداد أدناه دون تنبيهات.
        </p>
      )}

      {settings.enabled && (
        <>
          <div className="border-t border-border mt-1 pt-1">
            {PRAYER_DEFS.map((p) => (
              <Toggle
                key={p.key}
                label={`تنبيه ${p.label}`}
                checked={settings.prayers[p.key]}
                onChange={(v) => apply({ ...settings, prayers: { ...settings.prayers, [p.key]: v } })}
              />
            ))}
          </div>

          {/* الصلاة القادمة */}
          <div className="mt-3 rounded-xl bg-burgundy/5 dark:bg-white/5 p-3 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center text-gold-dark dark:text-gold shrink-0">
              <Icon name="clock" size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-readex text-[11px] text-muted-foreground">الصلاة القادمة</div>
              {next ? (
                <div className="font-readex text-sm font-bold flex items-baseline gap-2 flex-wrap">
                  <span>{next.label}{isTomorrow ? " · غداً" : ""}</span>
                  <span dir="ltr" className="text-gold-dark dark:text-gold font-extrabold">{fmtTime(next.at)}</span>
                  <span dir="ltr" className="text-[11px] text-muted-foreground tabular-nums">
                    -{fmtCountdown(next.at.getTime() - Date.now())}
                  </span>
                </div>
              ) : (
                <div className="font-readex text-sm font-bold">
                  {locating ? "جارٍ تحديد الموقع…" : "تعذّر جلب المواقيت"}
                </div>
              )}
            </div>
            <button type="button" onClick={() => void onRefreshLocation()} disabled={locating}
              className="shrink-0 text-[11px] font-readex font-bold text-gold-dark dark:text-gold bg-gold/10 hover:bg-gold/20 rounded-full px-3 py-1.5 transition disabled:opacity-50">
              {locating ? "…" : "تحديث الموقع"}
            </button>
          </div>
          <p className="mt-2 font-readex text-[10px] text-muted-foreground leading-relaxed">
            يُستخدم موقع جهازك لحساب المواقيت عبر خدمة aladhan.com، ويُحفظ على جهازك فقط ولا يُرسل إلى خوادم تبيان.
            تصل التنبيهات والتطبيق مفتوح أو يعمل في الخلفية.
          </p>
        </>
      )}
    </GlassCard>
  );
}
