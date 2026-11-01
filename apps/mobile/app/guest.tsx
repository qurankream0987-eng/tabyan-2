import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { useReducedMotion } from "react-native-reanimated";
import { Button, Card, Icon, Screen, cardBorder } from "../components/ui";
import SectionIcon, { type SectionIconName } from "../components/ui/section-icon";
import { palette, useTheme } from "../lib/theme";
import { useAuth } from "../lib/auth";
import NativeWelcomeHero from "../components/app/NativeWelcomeHero";

type ExpandableProps = {
  title: string;
  description: string;
  icon: SectionIconName;
  children: React.ReactNode;
  open: boolean;
  onPress: () => void;
};

const QuranLevels = [
  ["مستوى الغرس", "حفظ وجه واحد + مراجعة من الناس", "حفظ 3 أجزاء فما فوق", "seed"],
  ["مستوى السنبلة", "حفظ وجهان + مراجعة", "حفظ 5 أجزاء فما فوق", "wheat"],
  ["مستوى الزرع", "ربع حزب + مراجعة ربع حزب", "حفظ 10 أجزاء فما فوق", "tree"],
  ["مستوى الثمرة", "ربع حزب + مراجعة ربع حزب", "حفظ 15 جزءاً فما فوق", "fruit"],
  ["مستوى الوارثون", "ثلاثة أوجه + مراجعة حزب + تحفة", "حفظ 20 جزءاً فما فوق", "crown"],
] as const;

const WHY_TABYAN_FEATURES = [
  { icon: "certificate", title: "معلمون معتمدون" },
  { icon: "books", title: "حلقاتك محفوظة — تسجيلات حلقاتك وتقييمات معلمك في مكان واحد." },
  { sectionIcon: "hifz", title: "حفظ منهجي مستمر ضمن خطة متكاملة." },
  { sectionIcon: "tajweed", title: "طوّر تلاوتك عبر مستويات متدرجة في التجويد." },
  { sectionIcon: "tilawah", title: "صحّح تلاوتك وأتقن قراءة القرآن الكريم." },
  { sectionIcon: "qiraat", title: "انتقل من إتقان رواية حفص إلى رحاب القراءات القرآنية الأخرى" },
  { sectionIcon: "sharia", title: "علومٌ شرعية متكاملة في الفقه والعقيدة والسيرة." },
  { icon: "file-text", title: "مصحف تبيان AI لاختبار حفظك ومراجعة أخطائك بذكاء." },
] as const;

const TajweedLevels = [
  ["المستوى الأول", "أحكام النون الساكنة والتنوين — أحكام الميم الساكنة — القلقلة", "wave1"],
  ["المستوى الثاني", "مخارج الحروف — صفات الحروف — المدود وأقسامها", "wave2"],
  ["المستوى الثالث", "الوقف والابتداء — الحذف والإثبات", "wave3"],
] as const;

const ShariaSections = [
  ["الفقه", "أحكام العبادات والمعاملات", "مستوى دراسي متكامل", "scale"],
  ["العقيدة", "أصول الإيمان والتوحيد", "5 مستويات: ثلاثة الأصول — كشف الشبهات", "shield"],
  ["السيرة النبوية", "حياة النبي ﷺ من الميلاد إلى الوفاة", "4 مستويات: بذرة — نور — هدى — يقين", "moon"],
] as const;

const FOOTER_LINKS: [string, string][] = [["سياسة الخصوصية", "/privacy"], ["الشروط والأحكام", "/terms"], ["الدعم والمساعدة", "/support"]];

/** Web `.stagger-in`: fade and rise, one after another; instant for users who asked for less motion. */
function Stagger({ delay, children, style }: { delay: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) { progress.setValue(1); return; }
    const animation = Animated.timing(progress, { toValue: 1, duration: 420, delay, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, reduceMotion]);
  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

function Expandable({ title, description, icon, children, open, onPress }: ExpandableProps) {
  const { colors, isDark } = useTheme();
  const borderColor = cardBorder(isDark);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.expandHeader,
          { backgroundColor: colors.card, borderColor, shadowColor: isDark ? "#000" : palette.burgundy, opacity: pressed ? 0.86 : 1 },
          open ? styles.expandHeaderOpen : null,
        ]}
      >
        <View style={[styles.expandIcon, { backgroundColor: isDark ? `${palette.gold}18` : `${palette.burgundy}0D` }]}>
          <SectionIcon name={icon} size={26} />
        </View>
        <View style={styles.expandBody}>
          <Text style={[styles.expandTitle, { color: isDark ? palette.gold : palette.burgundy }]}>{title}</Text>
          <Text style={[styles.expandDescription, { color: colors.muted }]}>{description}</Text>
        </View>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={18} color={isDark ? palette.gold : palette.goldDark} />
      </Pressable>
      {open ? <Card style={[styles.expandContent, { borderColor }]}>{children}</Card> : null}
    </View>
  );
}

function RegisterCta({ onPress, label = "ابدأ رحلتك — سجّل مجاناً" }: { onPress: () => void; label?: string }) {
  return <Button label={label} icon="arrow-right" onPress={onPress} style={styles.inlineCta} />;
}

function SubExpandable({
  title,
  description,
  icon,
  children,
  border = true,
}: {
  title: string;
  description: string;
  icon: SectionIconName;
  children: React.ReactNode;
  border?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.subSection,
        {
          borderTopWidth: border ? StyleSheet.hairlineWidth : 0,
          borderTopColor: isDark ? `${palette.gold}18` : `${palette.burgundy}12`,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [styles.subHeader, { opacity: pressed ? 0.86 : 1 }]}
      >
        <View style={[styles.subIcon, { backgroundColor: isDark ? `${palette.gold}18` : `${palette.burgundy}0D` }]}>
          <SectionIcon name={icon} size={20} />
        </View>
        <View style={styles.expandBody}>
          <Text style={[styles.subTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subDescription, { color: colors.muted }]}>{description}</Text>
        </View>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={16} color={isDark ? palette.gold : palette.goldDark} />
      </Pressable>
      {open ? <View style={styles.subContent}>{children}</View> : null}
    </View>
  );
}

function QuranContent({ onRegister }: { onRegister: () => void }) {
  const { colors, isDark } = useTheme();
  const rowBorder = isDark ? `${palette.gold}16` : `${palette.burgundy}10`;
  return (
    <>
      <SubExpandable
        title="حفظ ومراجعة القرآن"
        description="٥ مستويات: الغرس ← السنبلة ← الزرع ← الثمرة ← الوارثون"
        icon="hifz"
        border={false}
      >
        {QuranLevels.map(([name, description, requirement, icon], index) => (
          <View
            key={name}
            style={[
              styles.levelRow,
              {
                borderBottomColor: rowBorder,
                borderBottomWidth: index < QuranLevels.length - 1 ? StyleSheet.hairlineWidth : 0,
              },
            ]}
          >
            <View style={[styles.levelIcon, { backgroundColor: isDark ? `${palette.gold}18` : `${palette.gold}20` }]}>
              <SectionIcon name={icon} size={18} />
            </View>
            <View style={styles.levelBody}>
              <Text style={[styles.levelName, { color: colors.text }]}>{name}</Text>
              <Text style={[styles.levelText, { color: colors.muted }]}>{description}</Text>
              <Text style={[styles.requirement, { color: isDark ? palette.gold : palette.goldDark }]}>الشرط: {requirement}</Text>
            </View>
          </View>
        ))}
        <RegisterCta onPress={onRegister} />
      </SubExpandable>

      <SubExpandable title="تصحيح التلاوة" description="تحسين التلاوة فقط بدون حفظ — لجميع الأعمار" icon="tilawah">
        <View style={styles.bulletList}>
          <Text style={[styles.bullet, { color: colors.muted }]}>• وجه واحد في كل حلقة — الشيخ يحدد المقدار</Text>
          <Text style={[styles.bullet, { color: colors.muted }]}>• مناسب لمن لا يستطيعون الحفظ</Text>
          <Text style={[styles.bullet, { color: colors.muted }]}>• تحسين مخارج الحروف والأداء</Text>
        </View>
        <RegisterCta onPress={onRegister} />
      </SubExpandable>

      <SubExpandable title="القراءات" description="إجازة برواية حفص عن طريق الشاطبية" icon="qiraat">
        <View style={styles.bulletList}>
          <Text style={[styles.bullet, { color: colors.muted }]}>• لديك إجازة؟ أرفق الوثيقة — مراجعة خلال ٢٤ ساعة</Text>
          <Text style={[styles.bullet, { color: colors.muted }]}>• لا إجازة؟ نوجّهك لمسار التحضير (مستوى الوارثون)</Text>
        </View>
        <RegisterCta onPress={onRegister} label="قدّم إجازتك — سجّل أولاً" />
      </SubExpandable>
    </>
  );
}

export default function GuestHome() {
  const router = useRouter();
  const { ready, token, role } = useAuth();
  const { colors, isDark } = useTheme();
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !token || !role) return;
    router.replace(role === "teacher" ? "/teacher" : role === "admin" ? "/admin" : "/student/home");
  }, [ready, role, router, token]);

  if (ready && token && role) return null;

  const openRegister = () => router.push("/register");
  const openLogin = () => router.push("/login");
  // Guests may read the mushaf without an account (app/student/_layout.tsx lets this route through).
  const openMushaf = () => router.push("/student/mushaf" as never);
  const lineColor = `${isDark ? palette.gold : palette.burgundy}2e`;
  const rowBorder = isDark ? `${palette.gold}16` : `${palette.burgundy}10`;

  return (
    <Screen contentStyle={styles.screen}>
      <NativeWelcomeHero onRegister={openRegister} onLogin={openLogin} onBrowseMushaf={openMushaf} />

      <View style={[styles.divider, styles.heroDivider]}>
        <View style={[styles.dividerLine, { backgroundColor: lineColor }]} />
        <Text style={styles.diamond}>◆</Text>
        <View style={[styles.dividerLine, { backgroundColor: lineColor }]} />
      </View>

      <View style={styles.cards}>
        <Stagger delay={0}>
          <Expandable
            title="القرآن الكريم"
            description="حفظ ومراجعة • تصحيح تلاوة • القراءات"
            icon="quran"
            open={expanded === "quran"}
            onPress={() => setExpanded(expanded === "quran" ? null : "quran")}
          >
            <QuranContent onRegister={openRegister} />
          </Expandable>
        </Stagger>

        <Stagger delay={80}>
          <Expandable
            title="دروس التجويد"
            description="أساسي — متوسط — متقدم"
            icon="tajweed"
            open={expanded === "tajweed"}
            onPress={() => setExpanded(expanded === "tajweed" ? null : "tajweed")}
          >
            {TajweedLevels.map(([name, description, icon], index) => (
              <View
                key={name}
                style={[styles.levelRow, { borderBottomColor: rowBorder, borderBottomWidth: index < TajweedLevels.length - 1 ? StyleSheet.hairlineWidth : 0 }]}
              >
                <View style={[styles.levelIcon, { backgroundColor: isDark ? `${palette.gold}18` : `${palette.gold}20` }]}>
                  <SectionIcon name={icon} size={22} />
                </View>
                <View style={styles.levelBody}><Text style={[styles.levelName, { color: colors.text }]}>{name}</Text><Text style={[styles.levelText, { color: colors.muted }]}>{description}</Text></View>
              </View>
            ))}
            <View style={[styles.noteBox, { backgroundColor: `${palette.gold}12`, borderColor: isDark ? `${palette.gold}2e` : `${palette.gold}30` }]}>
              <SectionIcon name="sharia" size={18} />
              <Text style={[styles.note, { color: colors.muted }]}>
                متن <Text style={[styles.noteAccent, { color: isDark ? palette.gold : palette.goldDark }]}>تحفة الأطفال</Text>: مقرر مستوى الوارثون، وعنصر تقييم اختياري في اختبار القبول
              </Text>
            </View>
            <RegisterCta onPress={openRegister} />
          </Expandable>
        </Stagger>

        <Stagger delay={160}>
          <Expandable
            title="الدروس الشرعية"
            description="العقيدة — الفقه — السيرة النبوية"
            icon="sharia"
            open={expanded === "sharia"}
            onPress={() => setExpanded(expanded === "sharia" ? null : "sharia")}
          >
            {ShariaSections.map(([name, description, levels, icon], index) => (
              <View
                key={name}
                style={[styles.levelRow, styles.shariaRow, { borderBottomColor: rowBorder, borderBottomWidth: index < ShariaSections.length - 1 ? StyleSheet.hairlineWidth : 0 }]}
              >
                <View style={[styles.levelIcon, { backgroundColor: isDark ? `${palette.gold}18` : `${palette.burgundy}0D` }]}>
                  <SectionIcon name={icon} size={20} />
                </View>
                <View style={styles.levelBody}>
                  <Text style={[styles.levelName, { color: colors.text }]}>{name}</Text>
                  <Text style={[styles.levelText, { color: colors.muted }]}>{description}</Text>
                  <Text style={[styles.requirement, { color: isDark ? palette.gold : palette.goldDark }]}>{levels}</Text>
                </View>
              </View>
            ))}
            <RegisterCta onPress={openRegister} />
          </Expandable>
        </Stagger>
      </View>

      <View style={styles.why}>
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: lineColor }]} />
          <Text style={[styles.whyTitle, { color: isDark ? palette.gold : palette.burgundy }]}>لماذا تبيان؟</Text>
          <View style={[styles.dividerLine, { backgroundColor: lineColor }]} />
        </View>
        <View style={styles.trustPoints}>
          {WHY_TABYAN_FEATURES.map((feature, index) => {
            const sectionIcon = "sectionIcon" in feature ? feature.sectionIcon : null;
            const icon = "icon" in feature ? feature.icon : null;
            return (
              <Stagger key={feature.title} delay={index * 90}>
                <View style={[styles.trustPoint, { backgroundColor: colors.card, borderColor: cardBorder(isDark), shadowColor: isDark ? "#000" : palette.burgundy }]}>
                  <View style={[styles.trustIcon, { backgroundColor: isDark ? `${palette.gold}18` : `${palette.burgundy}0D` }]}>
                    {sectionIcon
                      ? <SectionIcon name={sectionIcon} size={22} />
                      : icon ? <Icon name={icon} size={22} color={isDark ? palette.gold : palette.goldDark} /> : null}
                  </View>
                  <Text style={[styles.trustText, { color: isDark ? colors.text : palette.burgundy }]}>{feature.title}</Text>
                </View>
              </Stagger>
            );
          })}
        </View>
      </View>

      <View style={styles.hadith}>
        <View style={styles.hadithRule}>
          <View style={[styles.hadithLine, { backgroundColor: `${palette.gold}80` }]} />
          <Text style={[styles.diamond, { color: palette.gold, fontSize: 16 }]}>◆</Text>
          <View style={[styles.hadithLine, { backgroundColor: `${palette.gold}80` }]} />
        </View>
        <Text style={[styles.hadithText, { color: colors.muted }]}>﴿ خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ ﴾</Text>
        <Text style={[styles.source, { color: colors.muted }]}>— صحيح البخاري</Text>
      </View>

      <View style={[styles.footer, { borderTopColor: lineColor }]}>
        <View style={styles.footerLinks} accessibilityLabel="روابط السياسات">
          {FOOTER_LINKS.map(([label, href]) => (
            <Pressable key={href} accessibilityRole="link" onPress={() => router.push(href as never)} hitSlop={6} style={styles.footerLink}>
              <Text style={[styles.footerLinkText, { color: colors.muted }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.copyright, { color: colors.muted }]}>© تبيان</Text>
      </View>
      <Button label="التسجيل كمعلم" variant="quiet" icon="clipboard" onPress={() => router.push("/teacher-register" as never)} style={styles.teacherCta} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 4, paddingBottom: 16 },
  teacherCta: { width: "100%", marginTop: 4 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 8 },
  heroDivider: { marginTop: 14, marginBottom: 10 },
  dividerLine: { flex: 1, height: 1 },
  diamond: { color: `${palette.gold}AA`, fontSize: 13 },
  cards: { gap: 12 },
  // Web GlassCard row: a 56px icon bubble, Amiri title, soft burgundy shadow.
  expandHeader: { minHeight: 84, borderRadius: 22, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 14, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  expandHeaderOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, shadowOpacity: 0, elevation: 0 },
  expandIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  expandBody: { flex: 1, alignItems: "flex-end" },
  expandTitle: { fontFamily: "Amiri_700Bold", fontSize: 21, lineHeight: 30, textAlign: "right" },
  expandDescription: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 19, textAlign: "right", marginTop: 1 },
  expandContent: { marginTop: -1, paddingTop: 10, paddingBottom: 12, borderTopLeftRadius: 0, borderTopRightRadius: 0, marginBottom: 0 },
  subSection: { borderTopWidth: StyleSheet.hairlineWidth },
  subHeader: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 8, paddingVertical: 11 },
  subIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  subContent: { paddingHorizontal: 8, paddingTop: 4, paddingBottom: 6 },
  levelRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  levelIcon: { width: 36, height: 36, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  levelBody: { flex: 1, alignItems: "flex-end" },
  levelName: { fontFamily: "Amiri_700Bold", fontSize: 17, lineHeight: 25, textAlign: "right" },
  levelText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "right" },
  requirement: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right", marginTop: 2 },
  inlineCta: { marginVertical: 12 },
  subTitle: { fontFamily: "Amiri_700Bold", fontSize: 17, lineHeight: 25, textAlign: "right" },
  subDescription: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 19, textAlign: "right", marginTop: 2 },
  bulletList: { gap: 6, paddingTop: 8, paddingHorizontal: 8 },
  bullet: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 22, textAlign: "right" },
  noteBox: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, marginHorizontal: 4, marginTop: 10, marginBottom: 4 },
  note: { flex: 1, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "right" },
  noteAccent: { fontFamily: "IBMPlexSansArabic_700Bold" },
  shariaRow: { paddingVertical: 14 },
  why: { marginTop: 24 },
  whyTitle: { fontFamily: "Amiri_700Bold", fontSize: 24, lineHeight: 36 },
  trustPoints: { width: "100%", gap: 10, marginTop: 6 },
  trustPoint: { width: "100%", minHeight: 64, flexDirection: "row-reverse", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 12, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  trustIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  trustText: { flex: 1, fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 14, lineHeight: 24, textAlign: "right" },
  hadith: { alignItems: "center", marginTop: 32, marginBottom: 8 },
  hadithRule: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  hadithLine: { width: 48, height: 1 },
  hadithText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 20, lineHeight: 36, textAlign: "center", paddingHorizontal: 8 },
  source: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, marginTop: 4, opacity: 0.7 },
  footer: { borderTopWidth: 1, marginTop: 24, paddingTop: 18, paddingBottom: 4, alignItems: "center", gap: 10 },
  footerLinks: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "center", columnGap: 22, rowGap: 6 },
  footerLink: { minHeight: 32, justifyContent: "center" },
  footerLinkText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13 },
  copyright: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, opacity: 0.7 },
});
