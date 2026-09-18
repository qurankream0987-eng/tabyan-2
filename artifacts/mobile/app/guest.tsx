import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Icon, Screen } from "../components/ui";
import { palette, useTheme } from "../lib/theme";
import { useAuth } from "../lib/auth";

type ExpandableProps = {
  title: string;
  description: string;
  icon: string;
  children: React.ReactNode;
  open: boolean;
  onPress: () => void;
};

const QuranLevels = [
  ["مستوى الغرس", "حفظ وجه واحد + مراجعة من الناس", "حفظ 5 أجزاء على الأقل"],
  ["مستوى النماء", "ربع حزب + مراجعة ربع حزب", "حفظ 15 جزءاً على الأقل"],
  ["مستوى السنبلة", "حفظ وجهان + مراجعة", "حفظ 10 أجزاء على الأقل"],
  ["مستوى الثمرة", "ربع حزب + مراجعة ربع حزب", "حفظ 20 جزءاً على الأقل"],
  ["مستوى الوارثون", "ثلاثة أوجه + مراجعة حزب + تحفة", "حفظ 25 جزءاً على الأقل"],
] as const;

const TajweedLevels = [
  ["المستوى الأول", "أحكام النون الساكنة والتنوين — أحكام الميم الساكنة — القلقلة"],
  ["المستوى الثاني", "مخارج الحروف — صفات الحروف — المدود وأقسامها"],
  ["المستوى الثالث", "الوقف والابتداء — الحذف والإثبات"],
] as const;

function Expandable({ title, description, icon, children, open, onPress }: ExpandableProps) {
  const { colors } = useTheme();
  return (
    <View>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.expandHeader, { backgroundColor: colors.card, borderColor: `${palette.burgundy}20`, opacity: pressed ? 0.86 : 1 }]}>
        <View style={[styles.expandIcon, { backgroundColor: `${palette.burgundy}0D` }]}><Icon name={icon} size={24} color={palette.burgundy} /></View>
        <View style={styles.expandBody}>
          <Text style={[styles.expandTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.expandDescription, { color: colors.muted }]}>{description}</Text>
        </View>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={18} color={palette.goldDark} />
      </Pressable>
      {open ? <Card style={styles.expandContent}>{children}</Card> : null}
    </View>
  );
}

function RegisterCta({ onPress, label = "ابدأ رحلتك — سجّل مجاناً" }: { onPress: () => void; label?: string }) {
  return <Button label={label} icon="arrow-forward" onPress={onPress} style={styles.inlineCta} />;
}

export default function GuestHome() {
  const router = useRouter();
  const { ready, token, role } = useAuth();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !token || !role) return;
    router.replace(role === "teacher" ? "/teacher" : role === "admin" ? "/admin" : "/student/home");
  }, [ready, role, router, token]);

  if (ready && token && role) return null;

  const openRegister = () => router.push("/register");
  const openLogin = () => router.push("/login");

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.logoGlow} />
        <Image source={require("../assets/images/logo-gold.png")} resizeMode="contain" style={styles.logo} accessibilityLabel="تبيان" />
        <Text style={[styles.heroTitle, { color: colors.text }]}>تعلّم القرآن الكريم مع تبيان</Text>
        <Text style={[styles.heroDescription, { color: colors.muted }]}>منصة تصلك بالمعلمين المعتمدين — حلقات قرآن، تجويد، علوم شرعية، وفتاوى موثوقة</Text>
        <Button label="ابدأ رحلتك — مجاناً" icon="arrow-forward" onPress={openRegister} style={styles.primaryCta} />
        <Button label="لدي حساب بالفعل — تسجيل الدخول" variant="secondary" icon="log-in-outline" onPress={openLogin} style={styles.secondaryCta} />
        <Button label="التسجيل كمعلم" variant="quiet" icon="school-outline" onPress={() => router.push("/teacher-register" as never)} style={styles.teacherCta} />
      </View>

      <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.diamond}>◆</Text><View style={styles.dividerLine} /></View>

      <View style={styles.cards}>
        <Expandable
          title="القرآن الكريم"
          description="حفظ ومراجعة • تصحيح تلاوة • القراءات"
          icon="book-outline"
          open={expanded === "quran"}
          onPress={() => setExpanded(expanded === "quran" ? null : "quran")}
        >
          <View style={[styles.expandHeader, { backgroundColor: colors.card, borderColor: `${palette.burgundy}20` }]}>
            <View style={[styles.expandIcon, { backgroundColor: `${palette.burgundy}0D` }]}><Icon name="leaf-outline" size={24} color={palette.burgundy} /></View>
            <View style={styles.expandBody}>
              <Text style={[styles.expandTitle, { color: colors.text }]}>حفظ ومراجعة القرآن</Text>
              <Text style={[styles.expandDescription, { color: colors.muted }]}>٥ مستويات: الغرس ← السنبلة ← النماء ← الثمرة ← الوارثون</Text>
            </View>
          </View>
          {QuranLevels.map(([name, description, requirement]) => (
            <View key={name} style={styles.levelRow}>
              <Icon name="sparkles-outline" size={18} color={palette.gold} />
              <View style={styles.levelBody}>
                <Text style={[styles.levelName, { color: colors.text }]}>{name}</Text>
                <Text style={[styles.levelText, { color: colors.muted }]}>{description}</Text>
                <Text style={styles.requirement}>الشرط: {requirement}</Text>
              </View>
            </View>
          ))}
          <RegisterCta onPress={openRegister} />
          <Text style={[styles.subTitle, { color: colors.text }]}>تصحيح التلاوة</Text>
          <Text style={[styles.subDescription, { color: colors.muted }]}>تحسين التلاوة فقط بدون حفظ — لجميع الأعمار</Text>
          <Text style={[styles.bullet, { color: colors.muted }]}>• وجه واحد في كل حلقة — الشيخ يحدد المقدار</Text>
          <Text style={[styles.bullet, { color: colors.muted }]}>• مناسب لمن لا يستطيعون الحفظ</Text>
          <Text style={[styles.bullet, { color: colors.muted }]}>• تحسين مخارج الحروف والأداء</Text>
          <RegisterCta onPress={openRegister} />
          <Text style={[styles.subTitle, { color: colors.text }]}>القراءات</Text>
          <Text style={[styles.subDescription, { color: colors.muted }]}>إجازة برواية حفص عن طريق الشاطبية</Text>
          <Text style={[styles.bullet, { color: colors.muted }]}>• لديك إجازة؟ أرفق الوثيقة — مراجعة خلال ٢٤ ساعة</Text>
          <Text style={[styles.bullet, { color: colors.muted }]}>• لا إجازة؟ نوجّهك لمسار التحضير (مستوى الوارثون)</Text>
          <RegisterCta onPress={openRegister} label="قدّم إجازتك — سجّل أولاً" />
        </Expandable>

        <Expandable
          title="دروس التجويد"
          description="أساسي — متوسط — متقدم"
          icon="pulse-outline"
          open={expanded === "tajweed"}
          onPress={() => setExpanded(expanded === "tajweed" ? null : "tajweed")}
        >
          {TajweedLevels.map(([name, description]) => (
            <View key={name} style={styles.levelRow}>
              <Icon name="pulse-outline" size={20} color={palette.gold} />
              <View style={styles.levelBody}><Text style={[styles.levelName, { color: colors.text }]}>{name}</Text><Text style={[styles.levelText, { color: colors.muted }]}>{description}</Text></View>
            </View>
          ))}
          <Text style={[styles.note, { color: colors.muted }]}>متن <Text style={styles.noteAccent}>تحفة الأطفال</Text>: مقرر مستوى الوارثون، وعنصر تقييم اختياري في اختبار القبول</Text>
          <RegisterCta onPress={openRegister} />
        </Expandable>

        <Expandable
          title="الدروس الشرعية"
          description="العقيدة — الفقه — السيرة النبوية"
          icon="shield-checkmark-outline"
          open={expanded === "sharia"}
          onPress={() => setExpanded(expanded === "sharia" ? null : "sharia")}
        >
          {[
            ["الفقه", "أحكام العبادات والمعاملات", "مستوى دراسي متكامل", "scale-outline"],
            ["العقيدة", "أصول الإيمان والتوحيد", "5 مستويات: ثلاثة الأصول — كشف الشبهات", "shield-outline"],
            ["السيرة النبوية", "حياة النبي ﷺ من الميلاد إلى الوفاة", "4 مستويات: بذرة — نور — هدى — يقين", "moon-outline"],
          ].map(([name, description, levels, icon]) => (
            <View key={name} style={styles.levelRow}>
              <Icon name={icon} size={20} color={palette.burgundy} />
              <View style={styles.levelBody}><Text style={[styles.levelName, { color: colors.text }]}>{name}</Text><Text style={[styles.levelText, { color: colors.muted }]}>{description}</Text><Text style={styles.requirement}>{levels}</Text></View>
            </View>
          ))}
          <RegisterCta onPress={openRegister} />
        </Expandable>
      </View>

      <View style={styles.why}>
        <View style={styles.divider}><View style={styles.dividerLine} /><Text style={[styles.whyTitle, { color: colors.text }]}>لماذا تبيان؟</Text><View style={styles.dividerLine} /></View>
        <Card style={styles.featureCard}>
          <View style={[styles.featureIcon, { backgroundColor: `${palette.gold}20` }]}><Icon name="ribbon-outline" size={22} color={palette.gold} /></View>
          <View style={styles.featureBody}><Text style={[styles.featureTitle, { color: colors.text }]}>معلمون معتمدون</Text><Text style={[styles.featureText, { color: colors.muted }]}>قبول بفيديو تعريفي واختبار معرفي ومراجعة خلال ٢٤ ساعة</Text></View>
        </Card>
        <Card style={styles.featureCard}>
          <View style={[styles.featureIcon, { backgroundColor: `${palette.gold}20` }]}><Icon name="document-text-outline" size={22} color={palette.gold} /></View>
          <View style={styles.featureBody}><Text style={[styles.featureTitle, { color: colors.text }]}>حلقاتك محفوظة</Text><Text style={[styles.featureText, { color: colors.muted }]}>تسجيلات حلقاتك وتقييمات معلمك في مكان واحد</Text></View>
        </Card>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLine} />
        <Text style={[styles.hadith, { color: colors.muted }]}>﴿ خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ ﴾</Text>
        <Text style={[styles.source, { color: colors.muted }]}>— صحيح البخاري</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 8, paddingBottom: 24 },
  hero: { alignItems: "center", paddingTop: 20, paddingBottom: 20 },
  logoGlow: { position: "absolute", top: 28, width: 150, height: 150, borderRadius: 100, backgroundColor: `${palette.gold}18`, transform: [{ scale: 1.2 }] },
  logo: { width: 150, height: 82, marginBottom: 22 },
  heroTitle: { fontFamily: "Amiri_700Bold", fontSize: 30, textAlign: "center", lineHeight: 42 },
  heroDescription: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 15, lineHeight: 27, textAlign: "center", marginTop: 8, marginBottom: 16 },
  primaryCta: { width: "100%" },
  secondaryCta: { width: "100%", marginTop: 10 },
  teacherCta: { width: "100%", marginTop: 4 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: `${palette.burgundy}2E` },
  diamond: { color: `${palette.gold}AA`, fontSize: 13 },
  cards: { gap: 12 },
  expandHeader: { minHeight: 84, borderRadius: 22, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  expandIcon: { width: 50, height: 50, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  expandBody: { flex: 1, alignItems: "flex-end" },
  expandTitle: { fontFamily: "Amiri_700Bold", fontSize: 19, textAlign: "right" },
  expandDescription: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 19, textAlign: "right", marginTop: 2 },
  expandContent: { marginTop: -12, paddingTop: 26, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderColor: `${palette.burgundy}20` },
  levelRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: `${palette.burgundy}14` },
  levelBody: { flex: 1, alignItems: "flex-end" },
  levelName: { fontFamily: "Amiri_700Bold", fontSize: 16, textAlign: "right" },
  levelText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "right" },
  requirement: { color: palette.goldDark, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right", marginTop: 2 },
  inlineCta: { marginVertical: 12 },
  subTitle: { fontFamily: "Amiri_700Bold", fontSize: 18, textAlign: "right", marginTop: 16 },
  subDescription: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", marginTop: 2 },
  bullet: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 22, textAlign: "right", marginTop: 3 },
  note: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 22, textAlign: "right", marginVertical: 12 },
  noteAccent: { color: palette.goldDark, fontFamily: "IBMPlexSansArabic_700Bold" },
  why: { marginTop: 24 },
  whyTitle: { fontFamily: "Amiri_700Bold", fontSize: 23 },
  featureCard: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  featureIcon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  featureBody: { flex: 1, alignItems: "flex-end" },
  featureTitle: { fontFamily: "Amiri_700Bold", fontSize: 17, textAlign: "right" },
  featureText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "right" },
  footer: { alignItems: "center", marginTop: 26, marginBottom: 10 },
  footerLine: { width: 100, height: 1, backgroundColor: `${palette.gold}80`, marginBottom: 14 },
  hadith: { fontFamily: "Amiri_400Regular", fontSize: 21, lineHeight: 37, textAlign: "center" },
  source: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, marginTop: 3 },
});