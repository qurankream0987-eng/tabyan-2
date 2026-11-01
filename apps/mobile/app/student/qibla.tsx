import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import * as Location from "expo-location";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from "react-native-svg";
import { StudentScreen } from "../../components/student/student-screen";
import { Button, SoftPressable, SvgIcon } from "../../components/ui";
import { palette, useTheme } from "../../lib/theme";

// Port of apps/web/src/pages/student/Qibla.tsx. Heading comes from expo-location's
// watchHeadingAsync (no expo-sensors installed); without a compass the dial stays
// north-up and the marker shows the bearing from north.

const KAABA_LAT = 21.42251, KAABA_LNG = 39.826168;
const DEFAULT_LAT = 21.3891, DEFAULT_LNG = 39.8579;

function calcQibla(lat: number, lng: number): number {
  const φ = (lat * Math.PI) / 180, φK = (KAABA_LAT * Math.PI) / 180, Δλ = ((KAABA_LNG - lng) * Math.PI) / 180;
  const x = Math.sin(Δλ) * Math.cos(φK);
  const y = Math.cos(φ) * Math.sin(φK) - Math.sin(φ) * Math.cos(φK) * Math.cos(Δλ);
  return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
}
const DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const toArabicDigits = (input: string | number) => String(input).replace(/[0-9]/g, (d) => DIGITS[Number(d)]);
const angleDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

type LocState = "idle" | "loading" | "ok" | "default";

/** The dial face that turns with the heading: ticks, cardinal letters and the Kaaba marker. */
function Dial({ size, qibla, aligned }: { size: number; qibla: number; aligned: boolean }) {
  const { isDark } = useTheme();
  const c = size / 2;
  const tick = isDark ? "212,175,55" : "128,0,32";
  const letter = isDark ? "rgba(212,175,55,0.5)" : "rgba(128,0,32,0.45)";
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="face" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={isDark ? "#4A1522" : "#FFFCF5"} stopOpacity={0.95} />
          <Stop offset="1" stopColor={isDark ? palette.maroonDeep : palette.cream} stopOpacity={0.9} />
        </RadialGradient>
        <LinearGradient id="kaaba-shell" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={palette.burgundy} />
          <Stop offset="1" stopColor={palette.maroon} />
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={c - 3} fill="url(#face)" />
      {/* Degree ticks every 5° */}
      {Array.from({ length: 72 }, (_, i) => {
        const deg = i * 5, major = deg % 90 === 0, mid = deg % 45 === 0 && !major;
        const len = major ? 20 : mid ? 14 : 8;
        return <Line key={deg} x1={c} y1={6} x2={c} y2={6 + len} stroke={`rgba(${tick},${major ? 0.7 : mid ? 0.35 : 0.18})`} strokeWidth={major ? 2 : 1} transform={`rotate(${deg} ${c} ${c})`} />;
      })}
      {/* Cardinal letters, as on the web */}
      {[{ label: "N", deg: 0, color: isDark ? palette.gold : palette.burgundy }, { label: "E", deg: 90 }, { label: "S", deg: 180 }, { label: "W", deg: 270 }].map((d) => (
        <SvgText key={d.label} x={c} y={46} fontSize={13} fontWeight="900" fontFamily="IBMPlexSansArabic_700Bold" fill={d.color ?? letter} textAnchor="middle" transform={`rotate(${d.deg} ${c} ${c}) rotate(${-d.deg} ${c} 41)`}>{d.label}</SvgText>
      ))}
      {/* Kaaba marker at the qibla bearing */}
      <G transform={`rotate(${qibla} ${c} ${c})`}>
        <Path d={`M ${c} 2 L ${c + 6} 16 L ${c - 6} 16 Z`} fill={palette.gold} />
        {aligned ? <Path d={`M ${c} -1 L ${c + 9} 18 L ${c - 9} 18 Z`} fill={palette.gold} opacity={0.35} /> : null}
        <G transform={`rotate(${-qibla} ${c} 36)`}>
          <Rect x={c - 18} y={18} width={36} height={36} rx={12} fill="url(#kaaba-shell)" stroke={aligned ? palette.gold : "transparent"} strokeWidth={2} />
          {/* A drawn Kaaba: black cube with the gold band (kiswa) and door */}
          <Rect x={c - 9} y={27} width={18} height={18} rx={2} fill="#111" />
          <Rect x={c - 9} y={31} width={18} height={3} fill={palette.gold} />
          <Rect x={c + 2} y={37} width={4} height={8} rx={1} fill={palette.gold} opacity={0.9} />
        </G>
      </G>
    </Svg>
  );
}

/** Fixed overlay: north needle and the centre hub. */
function Needle({ size }: { size: number }) {
  const { isDark } = useTheme();
  const c = size / 2;
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="hub" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={isDark ? "#5A1A2B" : "#FFFCF5"} stopOpacity={0.95} />
          <Stop offset="1" stopColor={isDark ? palette.maroon : palette.cream} stopOpacity={0.9} />
        </LinearGradient>
        <RadialGradient id="pin" cx="35%" cy="35%" r="65%">
          <Stop offset="0" stopColor={palette.burgundyLight} />
          <Stop offset="1" stopColor={palette.burgundy} />
        </RadialGradient>
      </Defs>
      <Path d={`M ${c} 6 L ${c + 5} 32 L ${c - 5} 32 Z`} fill={isDark ? palette.gold : palette.burgundy} />
      <Path d={`M ${c - 5} 32 L ${c + 5} 32 L ${c} 52 Z`} fill={isDark ? "rgba(212,175,55,0.25)" : "rgba(128,0,32,0.2)"} />
      <Circle cx={c} cy={c} r={24} fill="url(#hub)" stroke={isDark ? "rgba(212,175,55,0.3)" : "rgba(128,0,32,0.12)"} strokeWidth={2} />
      <Circle cx={c} cy={c} r={7} fill="url(#pin)" />
    </Svg>
  );
}

export default function Qibla() {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const size = Math.min(288, width - 72);
  const [qibla, setQibla] = useState(() => calcQibla(DEFAULT_LAT, DEFAULT_LNG));
  const [heading, setHeading] = useState(0);
  const [locState, setLocState] = useState<LocState>("idle");
  const [sensorActive, setSensorActive] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [calibrate, setCalibrate] = useState(false);
  const headingSub = useRef<Location.LocationSubscription | null>(null);
  // The dial turns by -heading; the accumulated value avoids a full spin at the 359°→0° wrap.
  const [dialAnim] = useState(() => new Animated.Value(0));
  const dialRotate = useMemo(() => dialAnim.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] }), [dialAnim]);
  const dialValue = useRef(0);

  const disposed = useRef(false);
  const attachSensors = useCallback(() => {
    if (headingSub.current) return;
    Location.watchHeadingAsync(({ trueHeading, magHeading, accuracy }) => {
      const h = trueHeading >= 0 ? trueHeading : magHeading;
      if (h < 0) return;
      setHeading(((h % 360) + 360) % 360);
      setSensorActive(true);
      setCalibrate(accuracy >= 0 && accuracy < 2);
    }).then((sub) => {
      // The screen may be gone before the sensor answers (permission prompt); drop it then.
      if (disposed.current) sub.remove(); else headingSub.current = sub;
    }).catch(() => {});
  }, []);

  const locate = useCallback(async () => {
    setLocState("loading");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error("denied");
      setNeedsPermission(false);
      attachSensors();
      const last = await Location.getLastKnownPositionAsync();
      const { latitude, longitude } = (last ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })).coords;
      setQibla(calcQibla(latitude, longitude));
      setLocState("ok");
    } catch {
      setQibla(calcQibla(DEFAULT_LAT, DEFAULT_LNG));
      setLocState("default");
    }
  }, [attachSensors]);

  // Like the web: start right away when permission is already granted, otherwise ask with a button.
  useEffect(() => {
    let cancelled = false;
    Location.getForegroundPermissionsAsync().then((p) => {
      if (cancelled) return;
      if (p.granted) void locate(); else setNeedsPermission(true);
    }).catch(() => { if (!cancelled) setNeedsPermission(true); });
    return () => { cancelled = true; disposed.current = true; headingSub.current?.remove(); headingSub.current = null; };
  }, [locate]);

  useEffect(() => {
    const target = -heading;
    const delta = ((((target - (dialValue.current % 360)) % 360) + 540) % 360) - 180;
    dialValue.current += delta;
    Animated.timing(dialAnim, { toValue: dialValue.current, duration: 150, easing: Easing.linear, useNativeDriver: true }).start();
  }, [heading, dialAnim]);

  const diff = angleDiff(qibla, heading);
  const aligned = sensorActive && diff < 5;
  const brand = isDark ? palette.gold : palette.burgundy;
  const goldText = isDark ? palette.gold : palette.goldDark;
  const glassBorder = isDark ? "rgba(212,175,55,0.15)" : "rgba(128,0,32,0.12)";

  return (
    <StudentScreen title="اتجاه القبلة" subtitle="وجّه الجهاز نحو الكعبة المشرّفة">
      {/* ── Compass permission ── */}
      {needsPermission ? (
        <View style={[styles.glass, styles.centered, { backgroundColor: colors.card, borderColor: glassBorder }]}>
          <Text style={[styles.muted, { color: colors.muted }]}>فعّل البوصلة للحصول على اتجاه دقيق</Text>
          <Button label="تفعيل البوصلة" icon="refresh-outline" onPress={() => void locate()} />
        </View>
      ) : null}

      {/* ── Location strip ── */}
      {locState === "idle" && !needsPermission ? (
        <View style={[styles.glass, styles.strip, { backgroundColor: colors.card, borderColor: glassBorder }]}>
          <Text style={[styles.muted, styles.stripText, { color: colors.muted }]}>لتحديد اتجاه القبلة من موقعك</Text>
          <Button label="تحديد موقعي" icon="location-outline" onPress={() => void locate()} style={styles.smallButton} />
        </View>
      ) : null}
      {locState === "loading" ? (
        <View style={[styles.inline, styles.centered]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.muted, { color: colors.muted }]}>جاري تحديد موقعك…</Text>
        </View>
      ) : null}
      {locState === "default" ? (
        <View style={[styles.glass, styles.strip, { backgroundColor: colors.card, borderColor: `${palette.gold}4D` }]}>
          <View style={[styles.inline, styles.stripText]}>
            <SvgIcon name="alert-triangle" size={13} color={goldText} />
            <Text style={[styles.muted, { color: colors.muted, flexShrink: 1 }]}>اتجاه تقريبي — تعذّر تحديد موقعك</Text>
          </View>
          <SoftPressable accessibilityRole="button" onPress={() => void locate()} style={styles.retry}><Text style={[styles.retryText, { color: brand }]}>إعادة المحاولة</Text></SoftPressable>
        </View>
      ) : null}

      {/* ── Status badge ── */}
      <View style={[styles.glass, styles.centered, aligned
        ? { backgroundColor: `${palette.gold}1A`, borderColor: palette.gold, borderWidth: 2 }
        : { backgroundColor: colors.card, borderColor: glassBorder }]}>
        <Text style={[styles.degrees, { color: brand }]}>{toArabicDigits(Math.round(qibla))}° من الشمال</Text>
        <Text style={[styles.muted, { color: aligned ? goldText : colors.muted }]}>
          {aligned ? "✓ أنت متجه نحو القبلة" : sensorActive ? "استدر حتى تتطابق إبرة البوصلة مع الذهبية" : "في انتظار قراءة البوصلة…"}
        </Text>
      </View>

      {/* ── Calibration hint ── */}
      {calibrate && sensorActive ? (
        <View style={[styles.inline, styles.centered, styles.hintRow]}>
          <SvgIcon name="refresh" size={13} color={goldText} />
          <Text style={[styles.muted, { color: goldText }]}>البوصلة تحتاج معايرة — حرّك الجهاز على شكل رقم ٨</Text>
        </View>
      ) : null}

      {/* ══ Compass ══ */}
      <View style={styles.compassWrap}>
        <View style={{ width: size, height: size }}>
          <View style={[styles.ring, { borderRadius: size / 2 }, aligned
            ? { borderWidth: 4, borderColor: palette.gold, shadowColor: palette.gold, shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 8 }
            : { borderWidth: 2, borderColor: isDark ? "rgba(212,175,55,0.2)" : "rgba(128,0,32,0.15)" }]} />
          <Animated.View style={{ transform: [{ rotate: dialRotate }] }}>
            <Dial size={size} qibla={qibla} aligned={aligned} />
          </Animated.View>
          <Needle size={size} />
        </View>
      </View>

      <Text style={[styles.footnote, { color: colors.muted }]}>للحصول على أدقّ اتجاه، ضع الجهاز على سطح مستوٍ بعيدًا عن المعادن والأجهزة الإلكترونية</Text>
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  glass: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12 },
  centered: { alignItems: "center", justifyContent: "center", gap: 6 },
  strip: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10 },
  stripText: { flexShrink: 1 },
  smallButton: { minHeight: 38, paddingHorizontal: 14 },
  inline: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingVertical: 6 },
  hintRow: { marginBottom: 6 },
  muted: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12.5, lineHeight: 20, textAlign: "center" },
  degrees: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, lineHeight: 23 },
  retry: { minHeight: 40, justifyContent: "center", paddingHorizontal: 6 },
  retryText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12.5 },
  compassWrap: { alignItems: "center", paddingVertical: 12 },
  ring: { ...StyleSheet.absoluteFillObject },
  footnote: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11.5, lineHeight: 20, textAlign: "center", paddingHorizontal: 16, marginTop: 8 },
});
