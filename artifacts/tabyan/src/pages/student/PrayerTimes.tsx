import { useState, useEffect, useRef, useCallback } from "react";
import Icon, { type IconName } from "@/components/app/Icon";
import { getCalcMethod, FALLBACK_METHOD } from "@/lib/prayer-calc-method";

// ── Makkah al-Mukarramah fallback ───────────────────────────────────
const MAKKAH_LAT = 21.3891;
const MAKKAH_LNG = 39.8579;

// ── Prayers list ────────────────────────────────────────────────────
const PRAYERS: { key: string; label: string; icon: IconName; arabic: string }[] = [
  { key: "Fajr",    label: "الفجر",  icon: "moon",  arabic: "فجر"    },
  { key: "Sunrise", label: "الشروق", icon: "sun",   arabic: "شروق"   },
  { key: "Dhuhr",   label: "الظهر",  icon: "sun",   arabic: "ظهر"    },
  { key: "Asr",     label: "العصر",  icon: "sun",   arabic: "عصر"    },
  { key: "Maghrib", label: "المغرب", icon: "moon",  arabic: "مغرب"   },
  { key: "Isha",    label: "العشاء", icon: "moon",  arabic: "عشاء"   },
];

interface Timings { [k: string]: string; }
interface HijriDate { day: string; month: { ar: string }; year: string; }

// ── Helpers ─────────────────────────────────────────────────────────
function toArabicDigits(input: string | number): string {
  const map = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
  return String(input).replace(/[0-9]/g, (d) => map[Number(d)]);
}

function to12hArabic(raw: string): string {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return raw;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const suffix = h < 12 ? "ص" : "م";
  h = h % 12;
  if (h === 0) h = 12;
  return `${toArabicDigits(h)}:${toArabicDigits(min)} ${suffix}`;
}

function toMinutes(raw: string): number {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function gregorianArabic(d: Date): string {
  try {
    return new Intl.DateTimeFormat("ar", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(d);
  } catch {
    return d.toLocaleDateString("ar");
  }
}

function fmtCountdown(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => toArabicDigits(String(n).padStart(2, "0"));
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

type Status = "idle" | "loading" | "ok" | "error";
interface Coords { lat: number; lng: number; }

export default function PrayerTimes() {
  const [status, setStatus]   = useState<Status>("idle");
  const [timings, setTimings] = useState<Timings | null>(null);
  const [hijri, setHijri]     = useState<HijriDate | null>(null);
  const [city, setCity]       = useState<string>("");
  const [methodLabel, setMethodLabel] = useState<string>("");
  const [now, setNow]         = useState(() => Date.now());
  const dayRef                = useRef<string>(dayKey(new Date()));
  const coordsRef             = useRef<Coords | null>(null);
  const methodRef             = useRef<number>(FALLBACK_METHOD);

  const fetchTimings = useCallback(async (c: Coords, method: number) => {
    setStatus("loading");
    coordsRef.current = c;
    methodRef.current = method;
    try {
      const unix = Math.floor(Date.now() / 1000);
      const res = await fetch(
        `https://api.aladhan.com/v1/timings/${unix}?latitude=${c.lat}&longitude=${c.lng}&method=${method}`
      );
      const data = await res.json();
      if (!data?.data?.timings) throw new Error("no data");
      setTimings(data.data.timings as Timings);
      setHijri((data.data.date?.hijri as HijriDate) ?? null);
      dayRef.current = dayKey(new Date());
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, []);

  // يحدد البلد من الإحداثيات ثم يجلب المواقيت بطريقة الحساب المناسبة له
  const loadFor = useCallback(async (c: Coords, known?: { city?: string; countryCode?: string | null }) => {
    setStatus("loading");
    coordsRef.current = c;
    let calc = getCalcMethod(known?.countryCode);
    if (known?.countryCode) {
      if (known.city) setCity(known.city);
    } else {
      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${c.lat}&longitude=${c.lng}&localityLanguage=ar`
        );
        const data = await res.json();
        setCity(data.city || data.locality || data.principalSubdivision || "");
        calc = getCalcMethod(data.countryCode ?? null);
      } catch { /* يبقى الأسلوب الاحتياطي */ }
    }
    setMethodLabel(calc.label);
    await fetchTimings(c, calc.method);
  }, [fetchTimings]);

  const locate = useCallback(() => {
    if (!navigator.geolocation) { setStatus("error"); return; }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        void loadFor(c);
      },
      () => setStatus("error"),
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [loadFor]);

  const useMakkah = useCallback(() => {
    const c = { lat: MAKKAH_LAT, lng: MAKKAH_LNG };
    void loadFor(c, { city: "مكة المكرمة", countryCode: "SA" });
  }, [loadFor]);

  useEffect(() => {
    let cancelled = false;
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((res) => { if (!cancelled && res.state === "granted") locate(); })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [locate]);

  useEffect(() => {
    if (status !== "ok") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status !== "ok") return;
    const id = window.setInterval(() => {
      const k = dayKey(new Date());
      if (k !== dayRef.current && coordsRef.current) void fetchTimings(coordsRef.current, methodRef.current);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [status, fetchTimings]);

  useEffect(() => {
    if (status !== "ok") return;
    const onFocus = () => {
      const k = dayKey(new Date());
      if (k !== dayRef.current && coordsRef.current) void fetchTimings(coordsRef.current, methodRef.current);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [status, fetchTimings]);

  // ── Next prayer ───────────────────────────────────────────────────
  const nowDate    = new Date(now);
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const nowSeconds = nowMinutes * 60 + nowDate.getSeconds();

  let nextKey = "";
  let nextLabel = "";
  let countdownSeconds = 0;

  if (timings) {
    const prayers = PRAYERS.filter((p) => p.key !== "Sunrise");
    const upcoming = prayers.find((p) => toMinutes(timings[p.key]) > nowMinutes);
    if (upcoming) {
      nextKey = upcoming.key;
      nextLabel = upcoming.label;
      countdownSeconds = toMinutes(timings[upcoming.key]) * 60 - nowSeconds;
    } else {
      const fajr = prayers[0];
      nextKey = fajr.key;
      nextLabel = fajr.label;
      countdownSeconds = (24 * 60 - nowMinutes) * 60 + toMinutes(timings[fajr.key]) * 60 - nowDate.getSeconds();
    }
  }

  return (
    <div className="mushaf-prayer-surface space-y-4 page-enter pb-32">
      {/* Header */}
      <div className="text-center pt-1">
        <h1 className="font-amiri text-2xl text-burgundy flex items-center justify-center gap-2">
          <Icon name="mosque" size={20} />
          مواقيت الصلاة
        </h1>
        <p className="font-readex text-xs text-muted-foreground mt-0.5">
          {status === "ok" && methodLabel ? `بتوقيت منطقتك — طريقة ${methodLabel}` : "بتوقيت منطقتك"}
        </p>
      </div>

      {/* ── Idle ── */}
      {status === "idle" && (
        <div className="max-w-sm mx-auto px-2">
          <div
            className="mushaf-prayer-panel rounded-3xl overflow-hidden"
          >
            {/* Decorative arch top */}
            <div
              className="mushaf-prayer-panel-arch w-full h-24 flex items-center justify-center"
            >
              <div
                className="mushaf-prayer-icon-shell w-16 h-16 rounded-2xl flex items-center justify-center"
              >
                <Icon name="mosque" size={32} className="text-gold" />
              </div>
            </div>
            <div className="p-6 text-center space-y-4">
              <p className="font-readex text-sm text-muted-foreground leading-relaxed">
                نحتاج إلى موقعك لعرض مواقيت الصلاة الدقيقة في منطقتك
              </p>
                <button
                onClick={locate}
                  className="mushaf-prayer-brand-button w-full inline-flex items-center justify-center gap-2 font-readex text-sm font-bold px-6 py-3.5 rounded-2xl btn-press shadow-lg hover:opacity-90 transition"
              >
                <Icon name="map-pin" size={16} />
                تحديد موقعي لعرض المواقيت
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {status === "loading" && (
        <div className="max-w-sm mx-auto px-2 space-y-3">
          <div className="h-44 skeleton rounded-3xl" />
          <div className="grid grid-cols-3 gap-2.5">
            {[0,1,2,3,4,5].map((i) => <div key={i} className="h-28 skeleton rounded-2xl" />)}
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {status === "error" && (
        <div className="max-w-sm mx-auto px-2">
          <div
            className="mushaf-prayer-panel rounded-3xl p-6 text-center space-y-4"
          >
            <div
              className="mushaf-prayer-icon-default w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
            >
              <Icon name="alert-triangle" size={26} className="text-burgundy" />
            </div>
            <div>
              <h3 className="font-amiri text-lg text-burgundy mb-1">تعذّر تحديد موقعك</h3>
              <p className="font-readex text-xs text-muted-foreground leading-relaxed">
                يرجى السماح بالوصول للموقع من إعدادات المتصفح، أو استخدم توقيت مكة المكرمة
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={useMakkah}
                className="mushaf-prayer-brand-button w-full inline-flex items-center justify-center gap-2 font-readex text-sm font-bold px-5 py-3 rounded-2xl btn-press shadow hover:opacity-90 transition"
              >
                <Icon name="mosque" size={15} />
                استخدام توقيت مكة المكرمة
              </button>
              <button
                onClick={locate}
                className="w-full inline-flex items-center justify-center gap-2 bg-burgundy/10 dark:bg-gold/10 text-burgundy font-readex text-sm font-bold px-5 py-3 rounded-2xl btn-press hover:opacity-80 transition"
              >
                <Icon name="refresh" size={15} />
                إعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success ── */}
      {status === "ok" && timings && (
        <div className="max-w-sm mx-auto px-2 space-y-3">

          {/* Date header */}
          <div
            className="mushaf-prayer-hero rounded-3xl overflow-hidden"
          >
            {/* Countdown hero */}
            <div className="px-5 pt-5 pb-3 text-center">
              <p className="font-readex text-xs text-burgundy/70/70 mb-1 inline-flex items-center gap-1.5 justify-center">
                <Icon name="clock" size={12} />
                المتبقي على صلاة {nextLabel}
              </p>
              <div
                dir="ltr"
                className="mushaf-prayer-hero-countdown font-readex text-5xl font-black tracking-widest tabular-nums"
              >
                {fmtCountdown(countdownSeconds)}
              </div>
            </div>

            {/* Divider line */}
            <div className="mushaf-prayer-hero-divider mx-5 h-px" />

            {/* Dates row */}
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="text-right">
                {hijri && (
                  <p className="font-amiri text-sm text-burgundy leading-tight">
                    {toArabicDigits(hijri.day)} {hijri.month.ar} {toArabicDigits(hijri.year)} هـ
                  </p>
                )}
                <p className="font-readex text-[10px] text-burgundy/60/60 mt-0.5">{gregorianArabic(nowDate)}</p>
              </div>
              {city && (
                <div className="flex items-center gap-1 text-burgundy/70/70">
                  <Icon name="map-pin" size={11} />
                  <span className="font-readex text-xs">{city}</span>
                </div>
              )}
            </div>
          </div>

          {/* Prayer grid */}
          <div className="grid grid-cols-3 gap-2.5">
            {PRAYERS.map((p) => {
              const isNext = p.key === nextKey;
              const isSunrise = p.key === "Sunrise";
              return (
                <div
                  key={p.key}
                  className={`rounded-2xl p-3 text-center transition-all duration-300 relative overflow-hidden ${
                    isNext ? "mushaf-prayer-card-next" : "mushaf-prayer-card"
                  }`}
                >
                  {isNext && (
                    <div
                      className="absolute inset-0 opacity-30"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2 ${
                        isNext ? "mushaf-prayer-icon-next" : "mushaf-prayer-icon-default"
                      }`}
                    >
                      <Icon
                        name={p.icon}
                        size={16}
                        className={isNext ? "text-gold-dark dark:text-gold" : "text-burgundy"}
                      />
                    </div>
                    <div
                      className={`font-readex text-xs mb-1 ${
                        isNext ? "text-gold-dark dark:text-gold font-bold" : "text-muted-foreground"
                      }`}
                    >
                      {p.label}
                    </div>
                    <div
                      className={`font-readex text-sm font-bold tabular-nums ${
                        isNext ? "text-gold-dark dark:text-gold" : isSunrise ? "text-muted-foreground" : "text-burgundy"
                      }`}
                      dir="ltr"
                    >
                      {to12hArabic(timings[p.key])}
                    </div>
                    {isNext && (
                      <div
                        className="mushaf-prayer-indicator mt-1.5 mx-auto w-6 h-1 rounded-full opacity-70"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Refresh */}
          <div className="text-center pt-1">
            <button
              onClick={() => coordsRef.current && void fetchTimings(coordsRef.current, methodRef.current)}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-burgundy dark:hover:text-gold font-readex text-xs transition btn-press"
            >
              <Icon name="refresh" size={12} />
              تحديث المواقيت
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
