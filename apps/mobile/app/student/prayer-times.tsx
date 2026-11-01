import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import * as Location from "expo-location";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { ErrorState, StudentScreen } from "../../components/student/student-screen";
import { Button, SoftPressable, SvgIcon, type SvgIconName } from "../../components/ui";
import { Skeleton } from "../../components/ui/skeleton";
import { palette, useTheme } from "../../lib/theme";
import { toast } from "../../lib/toast";

// Port of apps/web/src/pages/student/PrayerTimes.tsx + lib/prayer-calc-method.ts.

// ── Makkah al-Mukarramah fallback ───────────────────────────────────
const MAKKAH = { lat: 21.3891, lng: 39.8579 };

const PRAYERS: { key: string; label: string; icon: SvgIconName }[] = [
  { key: "Fajr", label: "الفجر", icon: "moon" },
  { key: "Sunrise", label: "الشروق", icon: "sun" },
  { key: "Dhuhr", label: "الظهر", icon: "sun" },
  { key: "Asr", label: "العصر", icon: "sun" },
  { key: "Maghrib", label: "المغرب", icon: "moon" },
  { key: "Isha", label: "العشاء", icon: "moon" },
];

// ── Calculation method by country (Aladhan method ids, same map as the web) ──
const METHOD_LABELS: Record<number, string> = {
  1: "جامعة العلوم الإسلامية — كراتشي", 2: "الجمعية الإسلامية لأمريكا الشمالية", 3: "رابطة العالم الإسلامي", 4: "أم القرى — مكة المكرمة",
  5: "الهيئة المصرية العامة للمساحة", 7: "معهد الجيوفيزياء — جامعة طهران", 8: "منطقة الخليج", 9: "الكويت", 10: "قطر", 11: "سنغافورة",
  12: "الاتحاد الإسلامي بفرنسا", 13: "رئاسة الشؤون الدينية التركية", 14: "الإدارة الروحية لمسلمي روسيا", 16: "الإمارات — دبي", 17: "ماليزيا (JAKIM)",
  18: "تونس", 19: "الجزائر", 20: "إندونيسيا (Kemenag)", 21: "المغرب", 22: "البرتغال", 23: "الأردن",
};
const COUNTRY_METHODS: Record<string, number> = {
  SA: 4, KW: 9, QA: 10, AE: 16, BH: 8, OM: 8, YE: 8,
  EG: 5, JO: 23, MA: 21, TN: 18, DZ: 19,
  TR: 13, IR: 7, PK: 1, IN: 1, BD: 1, AF: 1, SG: 11, BN: 11, MY: 17, ID: 20,
  US: 2, CA: 2, FR: 12, PT: 22, RU: 14, GB: 3,
};
const FALLBACK_METHOD = 3;
function getCalcMethod(countryCode?: string | null) {
  const method = COUNTRY_METHODS[(countryCode ?? "").trim().toUpperCase()] ?? FALLBACK_METHOD;
  return { method, label: METHOD_LABELS[method] ?? METHOD_LABELS[FALLBACK_METHOD] };
}

// ── Helpers ─────────────────────────────────────────────────────────
const DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const toArabicDigits = (input: string | number) => String(input).replace(/[0-9]/g, (d) => DIGITS[Number(d)]);

function to12hArabic(raw: string) {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return raw;
  let h = parseInt(m[1], 10);
  const suffix = h < 12 ? "ص" : "م";
  h = h % 12 || 12;
  return `${toArabicDigits(h)}:${toArabicDigits(m[2])} ${suffix}`;
}
function toMinutes(raw: string) {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
}
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
function gregorianArabic(d: Date) {
  try { return new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d); }
  catch { return d.toLocaleDateString("ar"); }
}
function fmtCountdown(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const pad = (n: number) => toArabicDigits(String(n).padStart(2, "0"));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

type Timings = Record<string, string>;
type HijriDate = { day: string; month: { ar: string }; year: string };
type Coords = { lat: number; lng: number };
/** `location`: no fix/permission (web "error" panel); `network`: the API failed. */
type Status = "idle" | "loading" | "ok" | "location" | "network";

async function deviceCoords(): Promise<Coords | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return null;
  // A fresh fix can take long indoors; the last known position is accurate enough for prayer times.
  const last = await Location.getLastKnownPositionAsync();
  const { latitude, longitude } = (last ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })).coords;
  return { lat: latitude, lng: longitude };
}

/** Web `.mushaf-prayer-panel-arch`: a tinted band topped by a mihrab arch, with the mosque icon in its shell. */
function ArchBand({ width }: { width: number }) {
  const { isDark } = useTheme();
  const h = 96, cx = width / 2;
  const tint = isDark ? "212,175,55" : "128,0,32";
  return (
    <View style={{ height: h }}>
      <Svg width={width} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="arch-band" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={isDark ? palette.gold : palette.burgundy} stopOpacity={0.08} />
            <Stop offset="1" stopColor={palette.gold} stopOpacity={0.12} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={h} fill="url(#arch-band)" />
        {/* Pointed arch outline around the icon shell. */}
        <Path d={`M ${cx - 46} ${h} V 50 Q ${cx - 46} 16 ${cx} 6 Q ${cx + 46} 16 ${cx + 46} 50 V ${h}`} fill="none" stroke={palette.gold} strokeOpacity={0.55} strokeWidth={1.5} />
        <Path d={`M ${cx - 54} ${h} V 52 Q ${cx - 54} 10 ${cx} -2 Q ${cx + 54} 10 ${cx + 54} 52 V ${h}`} fill="none" stroke={`rgba(${tint},0.18)`} strokeWidth={1} />
      </Svg>
      <View style={styles.archShell}><SvgIcon name="mosque" size={32} color={palette.gold} /></View>
    </View>
  );
}

export default function PrayerTimes() {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(width - 36, 820);
  const [status, setStatus] = useState<Status>("idle");
  const [timings, setTimings] = useState<Timings | null>(null);
  const [hijri, setHijri] = useState<HijriDate | null>(null);
  const [city, setCity] = useState("");
  const [methodLabel, setMethodLabel] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const dayRef = useRef(dayKey(new Date()));
  const coordsRef = useRef<Coords | null>(null);
  const methodRef = useRef(FALLBACK_METHOD);

  const fetchTimings = useCallback(async (c: Coords, method: number, silent = false) => {
    if (!silent) setStatus("loading");
    coordsRef.current = c;
    methodRef.current = method;
    try {
      const unix = Math.floor(Date.now() / 1000);
      const res = await fetch(`https://api.aladhan.com/v1/timings/${unix}?latitude=${c.lat}&longitude=${c.lng}&method=${method}`);
      const data = await res.json() as { data?: { timings?: Timings; date?: { hijri?: HijriDate } } };
      if (!data?.data?.timings) throw new Error("no data");
      setTimings(data.data.timings);
      setHijri(data.data.date?.hijri ?? null);
      dayRef.current = dayKey(new Date());
      setStatus("ok");
      if (silent) toast("تم تحديث المواقيت", "success");
    } catch {
      if (silent) toast("تعذّر تحديث المواقيت. تحقق من الاتصال.", "error");
      else setStatus("network");
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
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${c.lat}&longitude=${c.lng}&localityLanguage=ar`);
        const data = await res.json() as { city?: string; locality?: string; principalSubdivision?: string; countryCode?: string };
        setCity(data.city || data.locality || data.principalSubdivision || "");
        calc = getCalcMethod(data.countryCode ?? null);
      } catch { /* يبقى الأسلوب الاحتياطي */ }
    }
    setMethodLabel(calc.label);
    await fetchTimings(c, calc.method);
  }, [fetchTimings]);

  const locate = useCallback(() => {
    setStatus("loading");
    deviceCoords().then((c) => { if (c) void loadFor(c); else setStatus("location"); }).catch(() => setStatus("location"));
  }, [loadFor]);

  const useMakkah = useCallback(() => { void loadFor(MAKKAH, { city: "مكة المكرمة", countryCode: "SA" }); }, [loadFor]);

  // Like the web: only auto-locate when permission was already granted.
  useEffect(() => {
    let cancelled = false;
    Location.getForegroundPermissionsAsync().then((p) => { if (!cancelled && p.granted) locate(); }).catch(() => {});
    return () => { cancelled = true; };
  }, [locate]);

  useEffect(() => {
    if (status !== "ok") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  // Refetch when the day rolls over (every 30s, and when the app comes back to the foreground).
  useEffect(() => {
    if (status !== "ok") return;
    const check = () => { if (dayKey(new Date()) !== dayRef.current && coordsRef.current) void fetchTimings(coordsRef.current, methodRef.current); };
    const id = setInterval(check, 30_000);
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") check(); });
    return () => { clearInterval(id); sub.remove(); };
  }, [status, fetchTimings]);

  // ── Next prayer ───────────────────────────────────────────────────
  const nowDate = new Date(now);
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const nowSeconds = nowMinutes * 60 + nowDate.getSeconds();
  let nextKey = "", nextLabel = "", countdownSeconds = 0;
  if (timings) {
    const prayers = PRAYERS.filter((p) => p.key !== "Sunrise");
    const upcoming = prayers.find((p) => toMinutes(timings[p.key]) > nowMinutes);
    if (upcoming) {
      nextKey = upcoming.key; nextLabel = upcoming.label;
      countdownSeconds = toMinutes(timings[upcoming.key]) * 60 - nowSeconds;
    } else {
      nextKey = prayers[0].key; nextLabel = prayers[0].label;
      countdownSeconds = (24 * 60 - nowMinutes) * 60 + toMinutes(timings[prayers[0].key]) * 60 - nowDate.getSeconds();
    }
  }

  const brand = isDark ? palette.gold : palette.burgundy;
  const panelBg = isDark ? "rgba(212,175,55,0.05)" : "rgba(128,0,32,0.04)";
  const panelBorder = isDark ? "rgba(212,175,55,0.22)" : "rgba(128,0,32,0.14)";
  const heroBg = isDark ? palette.maroon : "#FBF4E3";
  const heroFg = isDark ? "rgba(241,210,122,0.85)" : "rgba(128,0,32,0.7)";

  return (
    <StudentScreen title="مواقيت الصلاة" subtitle={status === "ok" && methodLabel ? `بتوقيت منطقتك — طريقة ${methodLabel}` : "بتوقيت منطقتك"}>
      {/* ── Idle ── */}
      {status === "idle" ? (
        <View style={[styles.panel, { backgroundColor: panelBg, borderColor: panelBorder }]}>
          <ArchBand width={panelWidth} />
          <View style={styles.panelBody}>
            <Text style={[styles.panelText, { color: colors.muted }]}>نحتاج إلى موقعك لعرض مواقيت الصلاة الدقيقة في منطقتك</Text>
            <Button label="تحديد موقعي لعرض المواقيت" icon="location-outline" onPress={locate} />
          </View>
        </View>
      ) : null}

      {/* ── Loading ── */}
      {status === "loading" ? (
        <View style={styles.stack}>
          <Skeleton height={176} radius={24} />
          <View style={styles.grid}>{PRAYERS.map((p) => <Skeleton key={p.key} height={112} radius={16} style={styles.cell} />)}</View>
        </View>
      ) : null}

      {/* ── Location error ── */}
      {status === "location" ? (
        <View style={[styles.panel, styles.panelBody, { backgroundColor: panelBg, borderColor: panelBorder }]}>
          <View style={[styles.alertShell, { backgroundColor: isDark ? "rgba(212,175,55,0.12)" : "rgba(128,0,32,0.07)" }]}><SvgIcon name="alert-triangle" size={26} color={brand} /></View>
          <Text style={[styles.panelTitle, { color: brand }]}>تعذّر تحديد موقعك</Text>
          <Text style={[styles.panelText, { color: colors.muted }]}>يرجى السماح بالوصول للموقع من إعدادات الجهاز، أو استخدم توقيت مكة المكرمة</Text>
          <Button label="استخدام توقيت مكة المكرمة" icon="business-outline" onPress={useMakkah} style={styles.fullWidth} />
          <Button label="إعادة المحاولة" icon="refresh-outline" variant="secondary" onPress={locate} style={styles.fullWidth} />
        </View>
      ) : null}

      {/* ── Network error ── */}
      {status === "network" ? <ErrorState message="تعذّر جلب المواقيت. تحقق من الاتصال وحاول مرة أخرى." onRetry={() => coordsRef.current && void fetchTimings(coordsRef.current, methodRef.current)} /> : null}

      {/* ── Success ── */}
      {status === "ok" && timings ? (
        <View style={styles.stack}>
          <View style={[styles.hero, { backgroundColor: heroBg, borderColor: isDark ? "rgba(212,175,55,0.22)" : "rgba(128,0,32,0.14)", shadowColor: isDark ? "#000" : palette.burgundy }]}>
            <View style={styles.heroTop}>
              <View style={styles.inlineRow}>
                <SvgIcon name="clock" size={12} color={heroFg} />
                <Text style={[styles.heroLabel, { color: heroFg }]}>المتبقي على صلاة {nextLabel}</Text>
              </View>
              <Text style={[styles.countdown, { color: brand, textShadowColor: `${palette.gold}${isDark ? "66" : "4D"}` }]}>{fmtCountdown(countdownSeconds)}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: `${palette.gold}33` }]} />
            <View style={styles.datesRow}>
              <View style={styles.datesText}>
                {hijri ? <Text style={[styles.hijri, { color: brand }]}>{toArabicDigits(hijri.day)} {hijri.month.ar} {toArabicDigits(hijri.year)} هـ</Text> : null}
                <Text style={[styles.gregorian, { color: heroFg }]}>{gregorianArabic(nowDate)}</Text>
              </View>
              {city ? (
                <View style={styles.inlineRow}>
                  <SvgIcon name="map-pin" size={11} color={heroFg} />
                  <Text numberOfLines={1} style={[styles.city, { color: heroFg }]}>{city}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Prayer grid */}
          <View style={styles.grid}>
            {PRAYERS.map((p) => {
              const isNext = p.key === nextKey;
              const isSunrise = p.key === "Sunrise";
              const fg = isNext ? (isDark ? palette.gold : palette.goldDark) : brand;
              return (
                <View key={p.key} style={[styles.cell, styles.prayerCard, isNext
                  ? { backgroundColor: `${palette.gold}${isDark ? "2E" : "24"}`, borderColor: `${palette.gold}8C`, borderWidth: 1.5, shadowColor: palette.gold, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 }
                  : { backgroundColor: colors.card, borderColor: panelBorder }]}>
                  <View style={[styles.prayerIcon, { backgroundColor: isNext ? `${palette.gold}40` : isDark ? "rgba(212,175,55,0.1)" : "rgba(128,0,32,0.07)" }]}>
                    <SvgIcon name={p.icon} size={16} color={fg} />
                  </View>
                  <Text style={[styles.prayerLabel, { color: isNext ? fg : colors.muted, fontFamily: isNext ? "IBMPlexSansArabic_700Bold" : "IBMPlexSansArabic_400Regular" }]}>{p.label}</Text>
                  <Text style={[styles.prayerTime, { color: isNext ? fg : isSunrise ? colors.muted : brand }]}>{to12hArabic(timings[p.key])}</Text>
                  {isNext ? <View style={[styles.indicator, { backgroundColor: palette.gold }]} /> : null}
                </View>
              );
            })}
          </View>

          <SoftPressable accessibilityRole="button" onPress={() => coordsRef.current && void fetchTimings(coordsRef.current, methodRef.current, true)} style={styles.refresh}>
            <SvgIcon name="refresh" size={12} color={colors.muted} />
            <Text style={[styles.refreshText, { color: colors.muted }]}>تحديث المواقيت</Text>
          </SoftPressable>
        </View>
      ) : null}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  fullWidth: { alignSelf: "stretch" },
  panel: { borderRadius: 24, borderWidth: 1, overflow: "hidden" },
  panelBody: { padding: 22, alignItems: "center", gap: 14 },
  panelTitle: { fontFamily: "Amiri_700Bold", fontSize: 20, lineHeight: 32, textAlign: "center" },
  panelText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 22, textAlign: "center" },
  archShell: { position: "absolute", top: 16, alignSelf: "center", width: 64, height: 64, borderRadius: 18, backgroundColor: palette.maroon, alignItems: "center", justifyContent: "center" },
  alertShell: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  hero: { borderRadius: 24, borderWidth: 1, overflow: "hidden", shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  heroTop: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, alignItems: "center", gap: 4 },
  inlineRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  heroLabel: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 18 },
  countdown: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 44, lineHeight: 60, letterSpacing: 3, fontVariant: ["tabular-nums"], writingDirection: "ltr", textShadowRadius: 16, textShadowOffset: { width: 0, height: 2 } },
  divider: { height: StyleSheet.hairlineWidth * 2, marginHorizontal: 20 },
  datesRow: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  datesText: { flexShrink: 1, alignItems: "flex-end" },
  hijri: { fontFamily: "Amiri_700Bold", fontSize: 15, lineHeight: 22, textAlign: "right" },
  gregorian: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10.5, lineHeight: 16, textAlign: "right", marginTop: 2 },
  city: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 18, maxWidth: 120 },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 },
  cell: { flexBasis: "30%", flexGrow: 1 },
  prayerCard: { borderRadius: 16, borderWidth: 1, padding: 12, alignItems: "center", minHeight: 112 },
  prayerIcon: { width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  prayerLabel: { fontSize: 12, lineHeight: 18, marginBottom: 2 },
  prayerTime: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13.5, lineHeight: 20, fontVariant: ["tabular-nums"], writingDirection: "ltr" },
  indicator: { marginTop: 6, width: 24, height: 4, borderRadius: 2, opacity: 0.7 },
  refresh: { alignSelf: "center", flexDirection: "row-reverse", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 12 },
  refreshText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 18 },
});
