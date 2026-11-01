import { StyleSheet, Text, View } from "react-native";
import { Card, StudentScreen } from "../../components/student/student-screen";
import { Button } from "../../components/ui";
import { useTheme } from "../../lib/theme";
import { useRouter } from "expo-router";
import SectionIcon from "../../components/ui/section-icon";

export default function Tilawah() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <StudentScreen title="تصحيح التلاوة" subtitle="مسار مخصص لتصحيح وتحسين التلاوة فقط، متاح لجميع الأعمار">
      <Card style={styles.heroCard}>
        <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}12` }]}>
          <SectionIcon name="tilawah" size={34} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.primary }]}>عن المسار</Text>
        <Text style={[styles.text, { color: colors.muted }]}>
          صحح تلاوتك مع شيخ متقن ضمن خطة منهجية متكاملة.
        </Text>
      </Card>
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>وصف المسار</Text>
        {["وجه واحد في الحلقة", "حصتان أسبوعياً"].map((item) => (
          <View key={item} style={styles.bulletRow}>
            <View style={styles.bullet} />
            <Text style={[styles.text, styles.bulletText, { color: colors.text }]}>{item}</Text>
          </View>
        ))}
      </Card>
      <Button
        label="سجل في الحلقة"
        icon="mic-outline"
        style={styles.button}
        onPress={() => router.push("/student/booking?path=tajweed_correction" as never)}
      />
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: { alignItems: "center" },
  heroIcon: { width: 64, height: 64, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  heroTitle: { fontFamily: "Amiri_700Bold", fontSize: 22, textAlign: "center", marginBottom: 6 },
  sectionTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right", marginBottom: 12 },
  text: { fontFamily: "IBMPlexSansArabic_400Regular", textAlign: "right", lineHeight: 24 },
  bulletText: { flex: 1 },
  bulletRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 10, marginTop: 8 },
  bullet: { width: 8, height: 8, marginTop: 8, borderRadius: 2, backgroundColor: "#D4AF37", transform: [{ rotate: "45deg" }] },
  button: { marginTop: 18 },
});