import { PRIVACY_INTRO, PRIVACY_POLICY_SECTIONS, PRIVACY_REVIEW_NOTES, PRIVACY_UPDATED_AT, SUPPORT_CONTACT } from "@workspace/tabyan-domain";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Card, Header, Icon, Screen } from "../components/ui";
import { privacySectionMatchesQuery } from "@workspace/tabyan-domain";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const { role, token } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set());
  const [reviewOpen, setReviewOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const sections = PRIVACY_POLICY_SECTIONS.filter((section) => privacySectionMatchesQuery(section, query));
  const allExpanded = PRIVACY_POLICY_SECTIONS.length > 0 && PRIVACY_POLICY_SECTIONS.every((section) => openSections.has(section.id));

  const toggleSection = (id: string) => {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const setAllSections = (expanded: boolean) => {
    setOpenSections((current) => {
      const next = new Set(current);
      PRIVACY_POLICY_SECTIONS.forEach((section) => expanded ? next.add(section.id) : next.delete(section.id));
      return next;
    });
  };
  const openLink = (url: string) => {
    void Linking.openURL(url).catch(() => {
      Alert.alert("تعذر فتح التطبيق", "يمكنك استخدام بيانات التواصل المعروضة في مركز دعم تبيان.");
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
      <Header title="سياسة الخصوصية" back />
      <View style={styles.keyboardArea}>
        <Screen contentStyle={styles.screenContent}>
          <Card accent style={styles.introCard}>
            <Text style={[styles.eyebrow, { color: colors.muted }]}>تبيان · وثائق الخدمة</Text>
            <Text style={[styles.intro, { color: colors.muted }]}>{PRIVACY_INTRO}</Text>
            <Text style={[styles.small, { color: colors.muted }]}>آخر تحديث: {PRIVACY_UPDATED_AT}</Text>
          </Card>

          <Card
            accent
            style={[styles.statusCard, { backgroundColor: colors.selected, borderColor: colors.primary }]}
          >
            <Text accessibilityRole="header" style={[styles.statusTitle, { color: colors.primary }]}>مسودة غير معتمدة</Text>
            <Text style={[styles.copy, { color: colors.text }]}>
              هذه مسودة معلوماتية وليست استشارة قانونية. يلزم استكمال مراجعة المشغّل والاختصاص قبل اعتمادها.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: reviewOpen }}
              onPress={() => setReviewOpen((value) => !value)}
              style={styles.reviewToggle}
            >
              <Text style={[styles.actionText, { color: colors.primary }]}>
                {reviewOpen ? "إخفاء ملاحظات المراجعة" : "عرض ملاحظات المراجعة"}
              </Text>
            </Pressable>
            {reviewOpen ? PRIVACY_REVIEW_NOTES.map((note) => (
              <View key={note} style={styles.bulletRow}>
                <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
                <Text style={[styles.small, styles.flexText, { color: colors.muted }]}>{note}</Text>
              </View>
            )) : null}
          </Card>

          <Card style={styles.toolsCard}>
            <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>البحث في السياسة</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="اكتب كلمة للبحث داخل نص السياسة"
              placeholderTextColor={colors.muted}
              returnKeyType="search"
              autoCapitalize="none"
              accessibilityLabel="ابحث في سياسة الخصوصية"
              style={[styles.searchInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
              testID="input-privacy-search"
            />
            <View style={styles.controls}>
              <Pressable
                accessibilityRole="button"
                disabled={allExpanded || sections.length === 0}
                onPress={() => setAllSections(true)}
                style={[styles.controlButton, { borderColor: colors.border, opacity: allExpanded || sections.length === 0 ? 0.5 : 1 }]}
                testID="button-privacy-expand-all"
              >
                <Text style={[styles.actionText, { color: colors.text }]}>عرض جميع الأقسام</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={openSections.size === 0}
                onPress={() => setAllSections(false)}
                style={[styles.controlButton, { borderColor: colors.border, opacity: openSections.size === 0 ? 0.5 : 1 }]}
                testID="button-privacy-collapse-all"
              >
                <Text style={[styles.actionText, { color: colors.text }]}>طي جميع الأقسام</Text>
              </Pressable>
            </View>
            <Text accessibilityLiveRegion="polite" style={[styles.small, { color: colors.muted }]}>
              {query.trim() ? `عدد الأقسام المطابقة: ${sections.length}` : `${PRIVACY_POLICY_SECTIONS.length} قسمًا`}
            </Text>
          </Card>

          {sections.length === 0 ? (
            <Card>
              <Text accessibilityLiveRegion="polite" style={[styles.copy, { color: colors.muted }]}>لا توجد أقسام تطابق عبارة البحث. جرّب كلمة أخرى.</Text>
            </Card>
          ) : sections.map((section) => {
            const expanded = openSections.has(section.id);
            const sectionNumber = PRIVACY_POLICY_SECTIONS.findIndex((item) => item.id === section.id) + 1;
            return (
              <Card key={section.id} style={styles.sectionCard}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  accessibilityLabel={`${expanded ? "طي" : "عرض"} قسم ${section.title}`}
                  onPress={() => toggleSection(section.id)}
                  style={styles.sectionHeader}
                  testID={`privacy-section-toggle-${section.id}`}
                >
                  <View style={styles.sectionHeaderCopy}>
                    <View style={[styles.sectionNumberBadge, { backgroundColor: colors.selected }]}>
                      <Text style={[styles.sectionNumber, { color: colors.primary }]}>{String(sectionNumber).padStart(2, "0")}</Text>
                    </View>
                    <Text style={[styles.heading, styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
                  </View>
                  <Icon name={expanded ? "chevron-up-outline" : "chevron-down-outline"} size={18} color={colors.muted} />
                </Pressable>

                {expanded ? (
                  <View style={[styles.sectionBody, { borderTopColor: colors.border }]}>
                    {section.paragraphs?.map((paragraph, index) => (
                      <Text key={`${section.id}-p-${index}`} style={[styles.copy, styles.paragraph, { color: colors.muted }]}>{paragraph}</Text>
                    ))}
                    {section.bullets?.map((bullet, index) => (
                      <View key={`${section.id}-b-${index}`} style={styles.bulletRow}>
                        <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
                        <Text style={[styles.copy, styles.flexText, { color: colors.muted }]}>{bullet}</Text>
                      </View>
                    ))}
                    {section.subsections?.map((subsection) => (
                      <View key={subsection.id} style={[styles.subsection, { borderRightColor: colors.primary }]}>
                        <Text accessibilityRole="header" style={[styles.subheading, { color: colors.text }]}>{subsection.title}</Text>
                        {subsection.paragraphs.map((paragraph, index) => (
                          <Text key={`${subsection.id}-p-${index}`} style={[styles.copy, styles.paragraph, { color: colors.muted }]}>{paragraph}</Text>
                        ))}
                        {subsection.bullets?.map((bullet, index) => (
                          <View key={`${subsection.id}-b-${index}`} style={styles.bulletRow}>
                            <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
                            <Text style={[styles.copy, styles.flexText, { color: colors.muted }]}>{bullet}</Text>
                          </View>
                        ))}
                      </View>
                    ))}

                    {section.id === "account-deletion" && role === "student" && token ? (
                      <Button
                        label="إدارة الحساب وحذفه"
                        icon="settings-outline"
                        variant="secondary"
                        style={styles.actionButton}
                        onPress={() => router.push("/student/settings?focus=delete" as never)}
                      />
                    ) : null}
                    {section.id === "contact" ? (
                      <View style={[styles.contactCard, { backgroundColor: colors.input, borderColor: colors.border }]}>
                        <Text style={[styles.contactLabel, { color: colors.text }]}>فريق دعم تبيان</Text>
                        <Text style={[styles.contactValue, { color: colors.muted }]} selectable>{`واتساب / اتصال: ${SUPPORT_CONTACT.displayPhone}`}</Text>
                        <Text style={[styles.contactValue, { color: colors.muted }]} selectable>{`البريد الإلكتروني: ${SUPPORT_CONTACT.email}`}</Text>
                        <View style={styles.contactActions}>
                          <Button label="اتصال" icon="call-outline" variant="secondary" onPress={() => openLink(SUPPORT_CONTACT.phoneHref)} style={styles.contactAction} />
                          <Button label="واتساب" icon="chatbubble-ellipses-outline" variant="secondary" onPress={() => openLink(SUPPORT_CONTACT.whatsappHref)} style={styles.contactAction} />
                          <Button label="البريد" icon="mail-outline" variant="secondary" onPress={() => openLink(SUPPORT_CONTACT.emailHref)} style={styles.contactAction} />
                          <Button label="نسخ الرقم" icon="copy-outline" variant="secondary" onPress={() => void copyContact(SUPPORT_CONTACT.displayPhone, "رقم الدعم")} style={styles.contactAction} />
                          <Button label="نسخ البريد" icon="copy-outline" variant="secondary" onPress={() => void copyContact(SUPPORT_CONTACT.email, "البريد الإلكتروني")} style={styles.contactAction} />
                        </View>
                        {copyStatus ? <Text accessibilityLiveRegion="polite" style={[styles.small, { color: colors.muted }]}>{copyStatus}</Text> : null}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </Card>
            );
          })}

          <Text style={[styles.footer, { color: colors.muted }]}>تبيان · {PRIVACY_UPDATED_AT}</Text>
        </Screen>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  keyboardArea: { flex: 1 },
  screenContent: { gap: 8, paddingHorizontal: 12, paddingTop: 10 },
  introCard: { alignItems: "flex-end", padding: 14 },
  eyebrow: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, lineHeight: 17, textAlign: "right" },
  intro: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 22, textAlign: "right", marginTop: 5 },
  statusCard: { alignItems: "flex-end", padding: 12 },
  statusTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, lineHeight: 22, textAlign: "right" },
  heading: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, lineHeight: 21, textAlign: "right", marginBottom: 4 },
  copy: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 19, textAlign: "right" },
  small: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 3 },
  actionText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 12, lineHeight: 18, textAlign: "right" },
  paragraph: { marginTop: 4 },
  bulletRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 6, marginTop: 5 },
  bullet: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, lineHeight: 19 },
  flexText: { flex: 1 },
  reviewToggle: { minHeight: 34, justifyContent: "center", alignSelf: "flex-end", marginTop: 2 },
  toolsCard: { padding: 12 },
  searchInput: { minHeight: 42, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 10, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 18, textAlign: "right" },
  controls: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7, marginTop: 8, marginBottom: 4 },
  controlButton: { minHeight: 36, justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderRadius: 9, paddingHorizontal: 9 },
  sectionCard: { padding: 0, overflow: "hidden" },
  sectionHeader: { minHeight: 50, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8, paddingHorizontal: 10, paddingVertical: 7 },
  sectionHeaderCopy: { flex: 1, flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  sectionNumberBadge: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  sectionNumber: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 10, textAlign: "center" },
  sectionTitle: { flex: 1, marginBottom: 0 },
  sectionBody: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 8 },
  subsection: { marginTop: 8, borderRightWidth: 2, paddingRight: 8 },
  subheading: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, lineHeight: 18, textAlign: "right" },
  contactCard: { marginTop: 9, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 },
  contactLabel: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, textAlign: "right" },
  contactValue: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 19, textAlign: "right", marginTop: 3 },
  contactActions: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7, marginTop: 8 },
  contactAction: { flexGrow: 1, flexBasis: "42%", minHeight: 42 },
  actionButton: { marginTop: 8, minHeight: 42 },
  footer: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "center", marginTop: 4, marginBottom: 12 },
});