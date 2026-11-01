import { SUPPORT_CONTACT } from "@workspace/tabyan-domain";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Animated, Easing, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Card, Icon, PageHero, SvgIcon } from "../../components/ui";
import { StudentScreen } from "../../components/student/student-screen";
import { toast } from "../../lib/toast";
import { palette, useTheme } from "../../lib/theme";

// نفس أسئلة صفحة «المساعدة والدعم» على الموقع (StudentHelp).
const FAQS = [
  { q: "كيف أحجز حصة؟", a: "من الصفحة الرئيسية افتح قسم «حلقاتي» ثم اضغط «عرض المواعيد المتاحة»، اختر المعلم والوقت المناسب وأكّد الحجز — سيصلك إشعار بالموعد." },
  { q: "كيف أطلب ترقية؟", a: "بعد إتمام متطلبات مستواك الحالي، افتح «الفئات» من الرئيسية وادخل مسارك، ثم أرسل طلب الترقية من صفحة المستويات وستراجعه اللجنة." },
  { q: "أين تسجيلاتي؟", a: "كل حلقاتك المسجلة محفوظة في صفحة «تسجيلاتي» — يمكنك إعادة مشاهدتها ومراجعة تقييمك في أي وقت." },
  { q: "كيف أرسل فتوى؟", a: "افتح صفحة «أرسل فتواك»، اختر التصنيف المناسب واكتب سؤالك بوضوح، وسيجيبك مفتٍ معتمد بإذن الله." },
];

export default function Help() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  // iOS: صفحة الدعم الكاملة (/support) هي المعتمدة لمراجعة المتجر؛ أندرويد يعرض هذه الصفحة.
  useEffect(() => {
    if (Platform.OS === "ios") router.replace("/support" as never);
  }, [router]);
  if (Platform.OS === "ios") return null;

  const openLink = (url: string) => {
    void Linking.openURL(url).catch(() => {
      Alert.alert("تعذر فتح التطبيق", "يمكنك الاتصال برقم الدعم أو مراسلته عبر البريد الإلكتروني.");
    });
  };
  const copy = async (value: string, label: string) => {
    try { await Clipboard.setStringAsync(value); toast(`تم نسخ ${label}.`, "success"); }
    catch { toast("تعذر النسخ. يمكنك تحديد بيانات التواصل ونسخها يدويًا.", "error"); }
  };

  return (
    <StudentScreen title="المساعدة" subtitle="أسئلة شائعة وطرق التواصل">
      <PageHero icon="help-circle-outline" title="المساعدة والدعم" subtitle="إجابات عن أكثر الأسئلة شيوعاً" />

      {FAQS.map((faq, index) => <FaqCard key={faq.q} question={faq.q} answer={faq.a} testID={`button-faq-${index + 1}`} />)}

      {/* الدعم الفني — نفس إجراءات صفحة الدعم (app/support.tsx) بدل فتح المتصفح */}
      <Card style={styles.supportCard}>
        <View style={styles.supportLead}>
          <View style={[styles.supportIcon, { backgroundColor: isDark ? `${palette.gold}1F` : `${palette.burgundy}14` }]}>
            <SvgIcon name="phone" size={20} color={isDark ? palette.gold : palette.burgundy} />
          </View>
          <View style={styles.supportCopy}>
            <Text style={[styles.supportTitle, { color: colors.text }]}>الدعم الفني</Text>
            <Text style={[styles.supportHint, { color: colors.muted }]}>اختر الطريقة الأنسب لك، ولا تشارك معلومات الدخول السرية.</Text>
          </View>
        </View>
        <View style={[styles.contactDetails, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <View>
            <Text style={[styles.contactLabel, { color: colors.muted }]}>رقم الدعم</Text>
            <Text selectable style={[styles.contactValue, { color: colors.text }]}>{SUPPORT_CONTACT.displayPhone}</Text>
          </View>
          <View style={[styles.contactDivider, { backgroundColor: colors.border }]} />
          <View>
            <Text style={[styles.contactLabel, { color: colors.muted }]}>البريد الإلكتروني</Text>
            <Text selectable style={[styles.contactValue, { color: colors.text }]}>{SUPPORT_CONTACT.email}</Text>
          </View>
        </View>
        <View style={styles.contactActions}>
          <Button label="اتصال" icon="call-outline" variant="secondary" onPress={() => openLink(SUPPORT_CONTACT.phoneHref)} testID="button-support-call" style={styles.contactButton} />
          <Button label="واتساب" icon="chatbubble-ellipses-outline" variant="secondary" onPress={() => openLink(SUPPORT_CONTACT.whatsappHref)} testID="button-support-whatsapp" style={styles.contactButton} />
          <Button label="البريد الإلكتروني" icon="mail-outline" variant="secondary" onPress={() => openLink(SUPPORT_CONTACT.emailHref)} testID="button-support-email" style={styles.contactButton} />
          <Button label="نسخ الرقم" icon="copy-outline" variant="secondary" onPress={() => void copy(SUPPORT_CONTACT.displayPhone, "رقم الدعم")} testID="button-copy-phone" style={styles.contactButton} />
        </View>
        <Button label="مركز الدعم الكامل" icon="help-buoy-outline" variant="quiet" onPress={() => router.push("/support" as never)} />
      </Card>
    </StudentScreen>
  );
}

/** Web `<details>` card: tap the header to expand; the chevron turns while it opens. */
function FaqCard({ question, answer, testID }: { question: string; answer: string; testID: string }) {
  const { colors, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));
  const toggle = () => {
    const next = !open;
    setOpen(next);
    Animated.timing(progress, { toValue: next ? 1 : 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-90deg"] });
  return (
    <Card style={styles.faqCard}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityHint={open ? "إخفاء الإجابة" : "عرض الإجابة"} onPress={toggle} testID={testID} style={({ pressed }) => [styles.faqHeader, { opacity: pressed ? 0.82 : 1 }]}>
        <View style={[styles.faqIcon, { backgroundColor: `${palette.gold}26` }]}>
          <SvgIcon name="help" size={16} color={isDark ? palette.gold : palette.goldDark} />
        </View>
        <Text style={[styles.faqQuestion, { color: colors.text }]}>{question}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Icon name="chevron-back" size={18} color={colors.muted} />
        </Animated.View>
      </Pressable>
      {open ? <Text style={[styles.faqAnswer, { color: colors.muted }]}>{answer}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  faqCard: { padding: 0, overflow: "hidden" },
  faqHeader: { minHeight: 60, flexDirection: "row-reverse", alignItems: "center", gap: 12, padding: 14 },
  faqIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  faqQuestion: { flex: 1, fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, lineHeight: 22, textAlign: "right" },
  faqAnswer: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 24, textAlign: "right", paddingHorizontal: 16, paddingBottom: 16 },
  supportCard: { padding: 16, marginTop: 4 },
  supportLead: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  supportIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  supportCopy: { flex: 1, minWidth: 0 },
  supportTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right" },
  supportHint: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 19, textAlign: "right", marginTop: 2 },
  contactDetails: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 15, padding: 12, gap: 10, marginTop: 14 },
  contactLabel: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, lineHeight: 17, textAlign: "right" },
  contactValue: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13, lineHeight: 21, textAlign: "left", writingDirection: "ltr", marginTop: 2 },
  contactDivider: { height: StyleSheet.hairlineWidth },
  contactActions: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginTop: 12, marginBottom: 6 },
  contactButton: { flexGrow: 1, flexBasis: "43%", minHeight: 46, paddingHorizontal: 10 },
});
