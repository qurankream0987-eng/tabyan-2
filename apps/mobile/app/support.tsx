import { SUPPORT_CONTACT, SUPPORT_FAQS, SUPPORT_INTRO, SUPPORT_SAFETY_NOTICE } from "@workspace/tabyan-domain";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Button, Card, Header, Icon, Screen } from "../components/ui";
import { useAuth } from "../lib/auth";
import { palette, useTheme } from "../lib/theme";

export default function SupportScreen() {
  const { colors } = useTheme();
  const { role, token } = useAuth();
  const router = useRouter();
  const [expandedFaqs, setExpandedFaqs] = useState<number[]>([]);
  const [copyStatus, setCopyStatus] = useState("");

  const toggleFaq = (index: number) => {
    setExpandedFaqs((current) => current.includes(index)
      ? current.filter((item) => item !== index)
      : [...current, index]);
  };
  const openLink = (url: string) => {
    void Linking.openURL(url).catch(() => {
      Alert.alert("تعذر فتح التطبيق", "يمكنك الاتصال برقم الدعم أو مراسلته عبر البريد الإلكتروني.");
    });
  };
  const copyContact = async (value: string, label: string) => {
    try {
      await Clipboard.setStringAsync(value);
      setCopyStatus(`تم نسخ ${label}.`);
    } catch {
      Alert.alert("تعذر النسخ", "يمكنك تحديد بيانات التواصل ونسخها يدويًا.");
    }
  };

  return (
    <>
      <Header title="فريق دعم تبيان" back />
      <Screen contentStyle={styles.screenContent}>
        <Card accent style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>تبيان · مركز الدعم</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>فريق دعم تبيان</Text>
          <Text style={styles.heroCopy}>{SUPPORT_INTRO}</Text>
        </Card>

        <Card style={styles.contactCard}>
          <View style={styles.sectionLead}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.selected }]}>
              <Icon name="headphones" size={21} color={colors.primary} />
            </View>
            <View style={styles.sectionLeadCopy}>
              <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.primary }]}>تواصل مع فريق الدعم</Text>
              <Text style={[styles.copy, { color: colors.muted }]}>اختر الطريقة الأنسب لك، ولا تشارك معلومات الدخول السرية.</Text>
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
            <Button label="اتصال" icon="phone" variant="secondary" onPress={() => openLink(SUPPORT_CONTACT.phoneHref)} testID="button-support-call" style={styles.contactButton} />
            <Button label="واتساب" icon="send" variant="secondary" onPress={() => openLink(SUPPORT_CONTACT.whatsappHref)} testID="button-support-whatsapp" style={styles.contactButton} />
            <Button label="البريد الإلكتروني" icon="mail" variant="secondary" onPress={() => openLink(SUPPORT_CONTACT.emailHref)} testID="button-support-email" style={styles.contactButton} />
            <Button
              label="نسخ الرقم"
              icon={copyStatus.startsWith("تم نسخ رقم") ? "check" : "clipboard"}
              variant="secondary"
              onPress={() => void copyContact(SUPPORT_CONTACT.displayPhone, "رقم الدعم")}
              testID="button-copy-phone"
              style={styles.contactButton}
            />
            <Button
              label="نسخ البريد"
              icon={copyStatus.startsWith("تم نسخ البريد") ? "check" : "clipboard"}
              variant="secondary"
              onPress={() => void copyContact(SUPPORT_CONTACT.email, "البريد الإلكتروني")}
              testID="button-copy-email"
              style={styles.contactButton}
            />
          </View>
          {copyStatus ? <Text accessibilityLiveRegion="polite" style={[styles.copyStatus, { color: colors.muted }]}>{copyStatus}</Text> : null}
        </Card>

        <Card style={[styles.warningCard, { backgroundColor: colors.selected, borderColor: colors.primary }]}>
          <View style={styles.warningHeading}>
            <Icon name="shield" size={22} color={colors.danger} />
            <Text accessibilityRole="header" style={[styles.warningTitle, { color: colors.primary }]}>حافظ على أمان حسابك</Text>
          </View>
          <Text style={[styles.safetyCopy, { color: colors.text }]}>{SUPPORT_SAFETY_NOTICE}</Text>
        </Card>

        {role === "student" && token ? (
          <Card>
            <Text accessibilityRole="header" style={[styles.accountHeading, { color: colors.text }]}>إدارة الحساب</Text>
            <Text style={[styles.copy, { color: colors.muted, marginBottom: 12 }]}>يمكنك الوصول إلى مسار حذف الحساب من إعدادات حساب الطالب.</Text>
            <Button label="الانتقال إلى حذف الحساب" icon="trash" variant="danger" onPress={() => router.push("/student/account?focus=delete" as never)} />
          </Card>
        ) : null}

        <View style={styles.faqTitleRow}>
          <View>
            <Text style={[styles.faqEyebrow, { color: colors.muted }]}>إجابات واضحة، خطوة بخطوة</Text>
            <Text accessibilityRole="header" style={[styles.faqTitle, { color: colors.primary }]}>الأسئلة الشائعة</Text>
          </View>
          <View style={[styles.faqCountBadge, { backgroundColor: colors.selected }]}>
            <Text accessibilityLabel={`${SUPPORT_FAQS.length} سؤالًا`} style={[styles.faqCountText, { color: colors.primary }]}>
              {SUPPORT_FAQS.length} سؤالًا
            </Text>
          </View>
        </View>
        <Text style={[styles.faqHint, { color: colors.muted }]}>اضغط على السؤال لعرض الإجابة.</Text>
        <Card style={styles.faqList}>
          {SUPPORT_FAQS.map((faq, index) => {
            const expanded = expandedFaqs.includes(index);
            return (
              <View key={`${index}-${faq.question}`}>
                {index > 0 ? <View style={[styles.faqDivider, { backgroundColor: colors.border }]} /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  accessibilityHint={expanded ? "إخفاء الإجابة" : "عرض الإجابة"}
                  onPress={() => toggleFaq(index)}
                  style={styles.faqTrigger}
                  testID={`button-faq-${index + 1}`}
                >
                  <Text style={[styles.question, { color: colors.text }]}>{faq.question}</Text>
                  <Icon name={expanded ? "chevron-up" : "chevron-down"} size={19} color={colors.primary} />
                </Pressable>
                {expanded ? <Text accessibilityLiveRegion="polite" style={[styles.answer, { color: colors.muted }]}>{faq.answer}</Text> : null}
              </View>
            );
          })}
        </Card>

        <Card style={styles.privacyCard}>
          <View style={styles.privacyLead}>
            <View style={[styles.privacyIcon, { backgroundColor: colors.selected }]}>
              <Icon name="books" size={20} color={colors.primary} />
            </View>
            <View style={styles.privacyLeadCopy}>
              <Text accessibilityRole="header" style={[styles.privacyTitle, { color: colors.text }]}>مزيد من التفاصيل حول بياناتك</Text>
              <Text style={[styles.privacyDescription, { color: colors.muted }]}>اطّلع على سياسة الخصوصية ومسودة المراجعة.</Text>
            </View>
          </View>
          <Button
            label="اقرأ سياسة الخصوصية"
            icon="file-text"
            variant="secondary"
            onPress={() => router.push("/privacy" as never)}
            testID="button-support-privacy"
            style={styles.privacyButton}
          />
        </Card>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingTop: 12 },
  heroCard: { backgroundColor: palette.burgundy, borderColor: palette.burgundy, padding: 19, borderRadius: 24 },
  heroEyebrow: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, lineHeight: 19, textAlign: "right", color: palette.gold },
  heroTitle: { fontFamily: "Amiri_700Bold", fontSize: 28, lineHeight: 39, textAlign: "right", color: palette.cream, marginTop: 5 },
  heroCopy: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 24, textAlign: "right", color: palette.cream, marginTop: 7 },
  contactCard: { padding: 15 },
  sectionLead: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  sectionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sectionLeadCopy: { flex: 1, alignItems: "flex-end" },
  sectionTitle: { fontFamily: "Amiri_700Bold", fontSize: 20, lineHeight: 29, textAlign: "right" },
  copy: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 23, textAlign: "right", marginTop: 2 },
  contactDetails: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 15, padding: 12, gap: 10, marginTop: 14 },
  contactLabel: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, lineHeight: 17, textAlign: "right" },
  contactValue: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13, lineHeight: 21, textAlign: "left", writingDirection: "ltr", marginTop: 2 },
  contactDivider: { height: StyleSheet.hairlineWidth },
  contactActions: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginTop: 12 },
  contactButton: { flexGrow: 1, flexBasis: "43%", minHeight: 46, paddingHorizontal: 10 },
  warningCard: { borderWidth: 1 },
  warningHeading: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 8 },
  warningTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, lineHeight: 24, textAlign: "right" },
  safetyCopy: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 14, lineHeight: 26, textAlign: "right" },
  copyStatus: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 21, textAlign: "right", marginTop: 8 },
  accountHeading: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right", marginBottom: 6 },
  faqTitleRow: { flexDirection: "row-reverse", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginTop: 7 },
  faqEyebrow: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, lineHeight: 17, textAlign: "right" },
  faqTitle: { fontFamily: "Amiri_700Bold", fontSize: 24, lineHeight: 34, textAlign: "right", marginTop: 1 },
  faqCountBadge: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5, marginBottom: 3 },
  faqCountText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 11, lineHeight: 17 },
  faqHint: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", marginTop: 4, marginBottom: 7 },
  faqList: { padding: 0, overflow: "hidden" },
  faqDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  faqTrigger: { minHeight: 62, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  question: { flex: 1, fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 14, lineHeight: 23, textAlign: "right" },
  answer: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 14, lineHeight: 25, textAlign: "right", paddingHorizontal: 14, paddingBottom: 16 },
  privacyCard: { padding: 15 },
  privacyLead: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  privacyIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  privacyLeadCopy: { flex: 1, alignItems: "flex-end" },
  privacyTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, lineHeight: 22, textAlign: "right" },
  privacyDescription: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "right", marginTop: 2 },
  privacyButton: { marginTop: 12 },
});