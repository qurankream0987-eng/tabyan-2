import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { Card, ErrorState, LoadingState, StudentScreen } from "../../components/student/student-screen";
import { Icon } from "../../components/ui";
import { useTheme } from "../../lib/theme";
import { userFacingErrorMessage } from "../../lib/user-facing-error";

const KAABA = { latitude: 21.4225, longitude: 39.8262 };
const rad = (deg: number) => deg * Math.PI / 180;

/** Initial great-circle bearing from the user to the Kaaba, degrees clockwise from true north. */
function qiblaBearing(latitude: number, longitude: number): number {
  const lat = rad(latitude);
  const dLon = rad(KAABA.longitude - longitude);
  const deg = Math.atan2(Math.sin(dLon), Math.cos(lat) * Math.tan(rad(KAABA.latitude)) - Math.sin(lat) * Math.cos(dLon)) * 180 / Math.PI;
  return (deg + 360) % 360;
}

async function currentBearing(): Promise<number> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error("لم يتم منح إذن الموقع. فعّله من إعدادات الجهاز ثم أعد المحاولة.");
  const last = await Location.getLastKnownPositionAsync();
  const { latitude, longitude } = (last ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })).coords;
  return qiblaBearing(latitude, longitude);
}

export default function Qibla() {
  const { colors } = useTheme();
  const [bearing, setBearing] = useState<number>();
  const [heading, setHeading] = useState<number>();
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    setBearing(undefined);
    currentBearing().then(setBearing).catch((cause) => setError(userFacingErrorMessage(cause, "تعذر تحديد اتجاه القبلة.")));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    if (bearing === undefined) return;
    let subscription: Location.LocationSubscription | undefined;
    let cancelled = false;
    Location.watchHeadingAsync(({ trueHeading, magHeading }) => {
      const value = trueHeading >= 0 ? trueHeading : magHeading;
      if (value >= 0) setHeading(value);
    }).then((sub) => {
      if (cancelled) sub.remove();
      else subscription = sub;
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [bearing]);

  if (error) return <StudentScreen title="القبلة"><ErrorState message={error} onRetry={load} /></StudentScreen>;
  if (bearing === undefined) return <StudentScreen title="القبلة"><LoadingState label="نحدد اتجاه القبلة من موقعك…" /></StudentScreen>;

  // With a compass the arrow points at the Kaaba from where the phone faces; without one it is relative to north.
  const rotation = heading === undefined ? bearing : bearing - heading;
  return (
    <StudentScreen title="القبلة" subtitle="وجّه أعلى الجهاز نحو السهم">
      <Card style={styles.card}>
        <View style={[styles.dial, { borderColor: colors.border }]}>
          <Text style={[styles.north, { color: colors.muted }]}>{heading === undefined ? "ش" : ""}</Text>
          <View style={{ transform: [{ rotate: `${rotation}deg` }] }}>
            <Icon name="navigate" size={96} color={colors.primary} style={styles.arrow} />
          </View>
        </View>
        <Text style={[styles.degrees, { color: colors.text }]}>{Math.round(bearing)}°</Text>
        <Text style={[styles.hint, { color: colors.muted }]}>
          {heading === undefined
            ? "زاوية القبلة من الشمال. البوصلة غير متاحة على هذا الجهاز."
            : "زاوية القبلة من الشمال. أبعد الجهاز عن المعادن لدقة أفضل."}
        </Text>
      </Card>
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", paddingVertical: 28, gap: 10 },
  dial: { width: 220, height: 220, borderRadius: 110, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  north: { position: "absolute", top: 10, fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14 },
  // Ionicons "navigate" points to the upper right; rotate it to point straight up.
  arrow: { transform: [{ rotate: "-45deg" }] },
  degrees: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 34 },
  hint: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12.5, textAlign: "center", lineHeight: 21 },
});
