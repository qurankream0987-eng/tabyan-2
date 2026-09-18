import { Linking, StyleSheet, Text } from "react-native";
import { Button, Card, SectionTitle } from "../../components/ui";
import { useTheme } from "../../lib/theme";
import { StudentScreen } from "./_screen";

const questions = [
  ["كيف أبدأ الدراسة؟", "ابدأ باختبار القبول، ثم ستظهر لك الخطة والجلسات المناسبة بعد اعتماد النتيجة."],
  ["أين أجد تسجيلاتي؟", "من تبويب التسجيلات يمكنك مراجعة الجلسات والملاحظات المتاحة لحسابك."],
  ["كيف أغيّر التنبيهات؟", "افتح الحساب ثم الإشعارات لتحديد أنواع التنبيهات التي تريد استقبالها."],
];

export default function Help() {
  const { colors } = useTheme();
  return (
    <StudentScreen title="المساعدة" subtitle="أسئلة شائعة وطرق التواصل">
      <SectionTitle title="الأسئلة الشائعة" />
      {questions.map(([title, answer]) => (
        <Card key={title}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.answer, { color: colors.muted }]}>{answer}</Text>
        </Card>
      ))}
      <SectionTitle title="تواصل معنا" />
      <Card>
        <Text style={[styles.answer, { color: colors.muted }]}>إذا لم تجد إجابتك، افتح صفحة الدعم الآمنة في المتصفح.</Text>
        <Button label="فتح مركز الدعم" icon="help-buoy-outline" onPress={() => void Linking.openURL("https://tibyanquran.com/support")} />
      </Card>
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, textAlign: "right" },
  answer: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 22, textAlign: "right", marginTop: 6, marginBottom: 10 },
});