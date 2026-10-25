import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/theme";

export type AdminSessionMonitorProps = {
  sessionId: string;
  sessionStatus: string;
};

export default function AdminSessionMonitor({ sessionStatus }: AdminSessionMonitorProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>المراقبة الحية</Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        المراقبة الحية receive-only متاحة في نسخة Native الفعلية فقط. لا يتم عرض اتصال وهمي في Expo Web.
      </Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        حالة الجلسة الحالية: {sessionStatus === "in_progress" ? "جارية" : "غير متاحة للمراقبة"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 14 },
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right" },
  body: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 22, textAlign: "right", marginTop: 8 },
});