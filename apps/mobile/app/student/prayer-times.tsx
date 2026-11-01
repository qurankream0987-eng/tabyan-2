import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { Card, ErrorState, LoadingState, StudentScreen } from "../../components/student/student-screen";
import { useTheme } from "../../lib/theme";
import { userFacingErrorMessage } from "../../lib/user-facing-error";

const PRAYERS = [
  ["Fajr", "الفجر"],
  ["Sunrise", "الشروق"],
  ["Dhuhr", "الظهر"],
  ["Asr", "العصر"],
  ["Maghrib", "المغرب"],
  ["Isha", "العشاء"],
] as const;

type State = { timings?: Record<string, string>; error?: string };

async function currentCoords() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error("لم يتم منح إذن الموقع. فعّله من إعدادات الجهاز ثم أعد المحاولة.");
  // A fresh fix can take long indoors; the last known position is accurate enough for prayer times.
  const last = await Location.getLastKnownPositionAsync();
  return (last ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })).coords;
}

async function fetchTimings(): Promise<Record<string, string>> {
  const { latitude, longitude } = await currentCoords();
  const today = new Date();
  const date = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
  const response = await fetch(`https://api.aladhan.com/v1/timings/${date}?latitude=${latitude}&longitude=${longitude}&method=4`);
  if (!response.ok) throw new Error("تعذر جلب المواقيت");
  const payload = await response.json() as { data?: { timings?: Record<string, string> } };
  return payload.data?.timings ?? {};
}

export default function PrayerTimes() {
  const { colors } = useTheme();
  const [state, setState] = useState<State>({});
  const load = useCallback(() => {
    setState({});
    fetchTimings()
      .then((timings) => setState({ timings }))
      .catch((error) => setState({ error: userFacingErrorMessage(error, "تعذر جلب المواقيت") }));
  }, []);
  useEffect(load, [load]);

  return (
    <StudentScreen title="مواقيت الصلاة" subtitle="حسب موقعك الحالي — طريقة أم القرى">
      {state.error ? <ErrorState message={state.error} onRetry={load} />
        : !state.timings ? <LoadingState label="نحدد موقعك ونحضر المواقيت…" />
        : (
          <Card>
            {PRAYERS.map(([key, label], index) => (
              <View key={key} style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                <Text numberOfLines={1} style={[styles.label, { color: colors.text }]}>{label}</Text>
                <Text numberOfLines={1} style={[styles.time, { color: colors.primary }]}>{state.timings?.[key] ?? "—"}</Text>
              </View>
            ))}
          </Card>
        )}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  label: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 15 },
  time: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15 },
});
