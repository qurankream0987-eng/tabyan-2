import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/app/Icon";

// ── Kaaba coordinates ───────────────────────────────────────────────
const KAABA_LAT = 21.42251;
const KAABA_LNG = 39.826168;

// ── Makkah default (used when location unavailable) ─────────────────
const DEFAULT_LAT = 21.3891;
const DEFAULT_LNG = 39.8579;

function calcQibla(lat: number, lng: number): number {
  const φ = (lat * Math.PI) / 180;
  const φK = (KAABA_LAT * Math.PI) / 180;
  const Δλ = ((KAABA_LNG - lng) * Math.PI) / 180;
  const x = Math.sin(Δλ) * Math.cos(φK);
  const y = Math.cos(φ) * Math.sin(φK) - Math.sin(φ) * Math.cos(φK) * Math.cos(Δλ);
  return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
}

function toArabicDigits(input: string | number): string {
  const map = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(input).replace(/[0-9]/g, (d) => map[Number(d)]);
}

function angleDiff(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

interface OrientationEventExtended extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}
type OrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

type LocState = "idle" | "loading" | "ok" | "default";

export default function Qibla() {
  const [qibla, setQibla] = useState<number>(() => calcQibla(DEFAULT_LAT, DEFAULT_LNG));
  const [heading, setHeading] = useState<number>(0);
  const [locState, setLocState] = useState<LocState>("idle");
  const [sensorActive, setSensorActive] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [calibrate, setCalibrate] = useState(false);
  const [, forceLayout] = useState(0);
  const listenersRef = useRef<(() => void) | null>(null);

  const hasOrientationAPI = typeof DeviceOrientationEvent !== "undefined";
  const iOSNeedsPermission =
    hasOrientationAPI &&
    typeof (DeviceOrientationEvent as OrientationCtor).requestPermission === "function";

  const handleOrientation = useCallback((raw: DeviceOrientationEvent) => {
    const e = raw as OrientationEventExtended;
    let h: number | null = null;
    if (typeof e.webkitCompassHeading === "number") {
      h = e.webkitCompassHeading;
    } else if (e.alpha !== null && e.alpha !== undefined) {
      h = 360 - e.alpha;
    }
    if (h === null) return;
    setHeading(((h % 360) + 360) % 360);
    setSensorActive(true);
    const inaccurate =
      e.absolute === false ||
      (typeof e.webkitCompassAccuracy === "number" && e.webkitCompassAccuracy > 25);
    setCalibrate(inaccurate);
  }, []);

  const attachSensors = useCallback(() => {
    if (listenersRef.current) return;
    const absHandler = (e: DeviceOrientationEvent) => handleOrientation(e);
    const relHandler = (e: DeviceOrientationEvent) => handleOrientation(e);
    window.addEventListener("deviceorientationabsolute", absHandler, true);
    window.addEventListener("deviceorientation", relHandler, true);
    listenersRef.current = () => {
      window.removeEventListener("deviceorientationabsolute", absHandler, true);
      window.removeEventListener("deviceorientation", relHandler, true);
    };
  }, [handleOrientation]);

  const enableCompass = useCallback(async () => {
    if (typeof DeviceOrientationEvent === "undefined") return;
    const Ctor = DeviceOrientationEvent as OrientationCtor;
    if (typeof Ctor.requestPermission === "function") {
      try {
        const res = await Ctor.requestPermission();
        if (res !== "granted") return;
      } catch {
        return;
      }
    }
    setNeedsPermission(false);
    attachSensors();
  }, [attachSensors]);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setQibla(calcQibla(DEFAULT_LAT, DEFAULT_LNG));
      setLocState("default");
      return;
    }
    setLocState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setQibla(calcQibla(pos.coords.latitude, pos.coords.longitude));
        setLocState("ok");
      },
      () => {
        setQibla(calcQibla(DEFAULT_LAT, DEFAULT_LNG));
        setLocState("default");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((res) => {
          if (res.state === "granted") locate();
        })
        .catch(() => {});
    }
    if (iOSNeedsPermission) {
      setNeedsPermission(true);
    } else {
      attachSensors();
    }
    return () => {
      if (listenersRef.current) {
        listenersRef.current();
        listenersRef.current = null;
      }
    };
  }, [locate, attachSensors, iOSNeedsPermission]);

  useEffect(() => {
    const relayout = () => forceLayout((n) => n + 1);
    window.addEventListener("orientationchange", relayout);
    window.addEventListener("resize", relayout);
    return () => {
      window.removeEventListener("orientationchange", relayout);
      window.removeEventListener("resize", relayout);
    };
  }, []);

  const diff = angleDiff(qibla, heading);
  const aligned = sensorActive && diff < 5;

  // The dial rotates by -heading so North stays at the top of the device
  const dialRotation = -heading;
  // The Kaaba arrow is fixed at `qibla` bearing relative to North on the dial
  const kaabaOnDial = qibla; // already in compass degrees from North

  return (
    <div className="space-y-5 page-enter pb-32">
      {/* Header */}
      <div className="text-center pt-1">
        <h1 className="font-amiri text-2xl text-burgundy flex items-center justify-center gap-2">
          <Icon name="map-pin" size={20} />
          اتجاه القبلة
        </h1>
        <p className="font-readex text-xs text-muted-foreground mt-0.5">وجّه الجهاز نحو الكعبة المشرّفة</p>
      </div>

      <div className="max-w-sm mx-auto space-y-4 px-2">

        {/* ── iOS compass permission ── */}
        {needsPermission && (
          <div className="glass rounded-2xl border border-[rgba(128,0,32,0.12)] dark:border-[rgba(212,175,55,0.15)] p-4 text-center space-y-2">
            <p className="font-readex text-sm text-muted-foreground">فعّل البوصلة للحصول على اتجاه دقيق</p>
            <button
              onClick={enableCompass}
              className="inline-flex items-center justify-center gap-2 bg-burgundy text-white dark:bg-gold dark:text-burgundy font-readex text-sm font-bold px-6 py-2.5 rounded-full btn-press shadow hover:opacity-90 transition"
            >
              <Icon name="refresh" size={15} />
              تفعيل البوصلة
            </button>
          </div>
        )}

        {/* ── Location strip ── */}
        {locState === "idle" && (
          <div className="flex items-center justify-between glass rounded-2xl border border-[rgba(128,0,32,0.12)] dark:border-[rgba(212,175,55,0.15)] px-4 py-3">
            <p className="font-readex text-xs text-muted-foreground">لتحديد اتجاه القبلة من موقعك</p>
            <button
              onClick={locate}
              className="inline-flex items-center gap-1.5 bg-burgundy text-white dark:bg-gold dark:text-burgundy font-readex text-xs font-bold px-4 py-2 rounded-full btn-press shadow hover:opacity-90 transition"
            >
              <Icon name="map-pin" size={13} />
              تحديد موقعي
            </button>
          </div>
        )}
        {locState === "loading" && (
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="w-4 h-4 rounded-full border-2 border-burgundy/30 border-t-burgundy dark:border-gold/30 dark:border-t-gold animate-spin" />
            <span className="font-readex text-xs text-muted-foreground">جاري تحديد موقعك…</span>
          </div>
        )}
        {locState === "default" && (
          <div className="flex items-center justify-between glass rounded-2xl border border-gold/30 px-4 py-3">
            <p className="font-readex text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <Icon name="alert-triangle" size={13} className="text-gold-dark dark:text-gold shrink-0" />
              اتجاه تقريبي — تعذّر تحديد موقعك
            </p>
            <button onClick={locate} className="font-readex text-xs text-burgundy font-bold btn-press hover:opacity-80 transition">
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* ── Status badge ── */}
        <div className={`rounded-2xl border px-4 py-3 text-center transition-all ${
          aligned
            ? "bg-gold/10 border-gold ring-1 ring-gold"
            : "glass border-[rgba(128,0,32,0.12)] dark:border-[rgba(212,175,55,0.15)]"
        }`}>
          <p className="font-readex text-sm font-bold text-burgundy">
            {toArabicDigits(Math.round(qibla))}° من الشمال
          </p>
          <p className="font-readex text-xs text-muted-foreground mt-0.5">
            {aligned
              ? "✓ أنت متجه نحو القبلة"
              : sensorActive
              ? "استدر حتى تتطابق إبرة البوصلة مع الذهبية"
              : "في انتظار قراءة البوصلة…"}
          </p>
        </div>

        {/* ── Calibration hint ── */}
        {calibrate && sensorActive && (
          <div className="flex items-center justify-center gap-1.5 py-1">
            <Icon name="refresh" size={13} className="text-gold-dark dark:text-gold shrink-0" />
            <p className="font-readex text-xs text-gold-dark dark:text-gold">
              البوصلة تحتاج معايرة — حرّك الجهاز على شكل رقم ٨
            </p>
          </div>
        )}

        {/* ══ Compass ══ */}
        <div className="flex items-center justify-center py-2">
          <div className="relative" style={{ width: 288, height: 288 }}>

            {/* Outer decorative ring */}
            <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
              aligned
                ? "ring-4 ring-gold shadow-[0_0_40px_rgba(212,175,55,0.5)]"
                : "ring-2 ring-burgundy/15 dark:ring-gold/20"
            }`}
              style={{
                background: "radial-gradient(circle at 50% 30%, rgba(212,175,55,0.06) 0%, transparent 70%)",
              }}
            />

            {/* Dial — rotates with heading */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                transform: `rotate(${dialRotation}deg)`,
                transition: "transform 150ms linear",
              }}
            >
              {/* Dial face */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "radial-gradient(circle at 50% 50%, rgba(255,252,245,0.95) 0%, rgba(245,239,224,0.88) 100%)",
                  boxShadow: "inset 0 2px 8px rgba(128,0,32,0.08), inset 0 -2px 4px rgba(0,0,0,0.04)",
                }}
              />

              {/* Degree ticks */}
              {Array.from({ length: 72 }).map((_, i) => {
                const deg = i * 5;
                const major = deg % 90 === 0;
                const mid = deg % 45 === 0 && !major;
                const minor5 = deg % 10 === 0 && !major && !mid;
                return (
                  <div
                    key={deg}
                    className="absolute top-0 left-1/2"
                    style={{
                      transform: `translateX(-50%) rotate(${deg}deg)`,
                      transformOrigin: "50% 144px",
                    }}
                  >
                    <div
                      style={{
                        width: major ? 2 : minor5 ? 1 : 1,
                        height: major ? 20 : mid ? 14 : 8,
                        background: major
                          ? "rgba(128,0,32,0.7)"
                          : mid
                          ? "rgba(128,0,32,0.35)"
                          : "rgba(128,0,32,0.18)",
                        marginTop: 4,
                      }}
                    />
                  </div>
                );
              })}

              {/* Cardinal letters */}
              {[
                { label: "N", deg: 0, color: "#800020" },
                { label: "E", deg: 90 },
                { label: "S", deg: 180 },
                { label: "W", deg: 270 },
              ].map((c) => (
                <div
                  key={c.label}
                  className="absolute top-0 left-1/2"
                  style={{
                    transform: `translateX(-50%) rotate(${c.deg}deg)`,
                    transformOrigin: "50% 144px",
                  }}
                >
                  <span
                    className="block font-readex text-xs font-black mt-6"
                    style={{
                      transform: `rotate(${-c.deg}deg)`,
                      color: c.color ?? "rgba(128,0,32,0.45)",
                      letterSpacing: 1,
                    }}
                  >
                    {c.label}
                  </span>
                </div>
              ))}

              {/* Kaaba marker at Qibla bearing */}
              <div
                className="absolute top-0 left-1/2"
                style={{
                  transform: `translateX(-50%) rotate(${kaabaOnDial}deg)`,
                  transformOrigin: "50% 144px",
                }}
              >
                <div
                  style={{ transform: `rotate(${-kaabaOnDial}deg)` }}
                  className="flex flex-col items-center"
                >
                  {/* Gold arrow pointing to Kaaba */}
                  <div
                    className="mt-0"
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent",
                      borderBottom: "14px solid #D4AF37",
                      filter: aligned ? "drop-shadow(0 0 6px rgba(212,175,55,0.9))" : undefined,
                    }}
                  />
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg mt-0.5 ${
                      aligned ? "ring-2 ring-gold shadow-gold/50" : ""
                    }`}
                    style={{ background: "linear-gradient(135deg, #800020 0%, #4C091B 100%)" }}
                  >
                    <span className="text-lg leading-none">🕋</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed North needle */}
            <div className="absolute inset-0 flex flex-col items-center pointer-events-none">
              {/* Red north tip */}
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderBottom: "26px solid #800020",
                  marginTop: 6,
                  filter: "drop-shadow(0 0 3px rgba(128,0,32,0.5))",
                }}
              />
              {/* White south tip */}
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: "20px solid rgba(128,0,32,0.2)",
                }}
              />
            </div>

            {/* Center hub */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(255,252,245,0.95) 0%, rgba(245,239,224,0.9) 100%)",
                  boxShadow: "0 2px 8px rgba(128,0,32,0.15), inset 0 1px 0 rgba(255,255,255,0.8)",
                  border: "2px solid rgba(128,0,32,0.12)",
                }}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full"
                  style={{
                    background: "radial-gradient(circle at 35% 35%, #A02040 0%, #800020 100%)",
                    boxShadow: "0 1px 4px rgba(128,0,32,0.4)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <p className="font-readex text-[11px] text-muted-foreground text-center leading-relaxed px-4">
          للحصول على أدقّ اتجاه، ضع الجهاز على سطح مستوٍ بعيدًا عن المعادن والأجهزة الإلكترونية
        </p>
      </div>
    </div>
  );
}
