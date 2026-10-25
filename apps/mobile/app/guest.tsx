import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Icon, Screen } from "../components/ui";
import SectionIcon, { type SectionIconName } from "../components/ui/section-icon";
import { palette, useTheme } from "../lib/theme";
import { useAuth } from "../lib/auth";
import NativeWelcomeHero from "../components/app/NativeWelcomeHero";

type ExpandableProps = {
  title: string;
  description: string;
  icon: string;
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
  { icon: "ribbon-outline", title: "معلمون معتمدون" },
  { icon: "book-outline", title: "حلقاتك محفوظة — تسجيلات حلقاتك وتقييمات معلمك في مكان واحد." },
  { sectionIcon: "hifz", title: "حفظ منهجي مستمر ضمن خطة متكاملة." },
  { sectionIcon: "tajweed", title: "طوّر تلاوتك عبر مستويات متدرجة في التجويد." },
  { sectionIcon: "tilawah", title: "صحّح تلاوتك وأتقن قراءة القرآن الكريم." },
  { sectionIcon: "qiraat", title: "انتقل من إتقان رواية حفص إلى رحاب القراءات القرآنية الأخرى" },
  { sectionIcon: "sharia", title: "علومٌ شرعية متكاملة في الفقه والعقيدة والسيرة." },
  { icon: "document-text-outline", title: "مصحف تبيان AI لاختبار حفظك ومراجعة أخطائك بذكاء." },
] as const;

const TajweedLevels = [
  ["المستوى الأول", "أحكام النون الساكنة والتنوين — أحكام الميم الساكنة — القلقلة"],
  ["المستوى الثاني", "مخارج الحروف — صفات الحروف — المدود وأقسامها"],
  ["المستوى الثالث", "الوقف والابتداء — الحذف والإثبات"],
] as const;

function Expandable({ title, description, icon, children, open, onPress }: ExpandableProps) {
  const { colors, isDark } = useTheme();
  const borderColor = isDark ? `${palette.gold}24` : `${palette.burgundy}20`;
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onPress}
        style={({ pressed }) => [styles.expandHeader, { backgroundColor: colors.card, borderColor, opacity: pressed ? 0.86 : 1 }]}
      >
        <View style={[styles.expandIcon, { backgroundColor: isDark ? `${palette.gold}18` : `${palette.burgundy}0D` }]}>
          <Icon name={icon} size={26} color={isDark ? palette.gold : palette.burgundy} />
        </View>
        <View style={styles.expandBody}>
          <Text style={[styles.expandTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.expandDescription, { color: colors.muted }]}>{description}</Text>
        </View>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={18} color={isDark ? palette.gold : palette.goldDark} />
      </Pressable>
      {open ? <Card style={[styles.expandContent, { borderColor }]}>{children}</Card> : null}
    </View>
  );
}

function RegisterCta({ onPress, label = "ابدأ رحلتك — سجّل مجاناً" }: { onPress: () => void; label?: string }) {
  return <Button label={label} icon="arrow-forward" onPress={onPress} style={styles.inlineCta} />;
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

  return (
    <Screen contentStyle={styles.screen}>
      <NativeWelcomeHero onRegister={openRegister} />

      <View style={[styles.divider, styles.heroDivider]}>
        <View style={[styles.dividerLine, { backgroundColor: `${isDark ? palette.gold : palette.burgundy}2e` }]} />
        <Text style={styles.diamond}>◆</Text>
        <View style={[styles.dividerLine, { backgroundColor: `${isDark ? palette.gold : palette.burgundy}2e` }]} />
      </View>

      <View style={styles.cards}>
        <Expandable
          title="القرآن الكريم"
          description="حفظ ومراجعة • تصحيح تلاوة • القراءات"
          icon="book-outline"
          open={expanded === "quran"}
          onPress={() => setExpanded(expanded === "quran" ? null : "quran")}
        >
          <QuranContent onRegister={openRegister} />
        </Expandable>

        <Expandable
          title="دروس التجويد"
          description="أساسي — متوسط — متقدم"
          icon="pulse-outline"
          open={expanded === "tajweed"}
          onPress={() => setExpanded(expanded === "tajweed" ? null : "tajweed")}
        >
          {TajweedLevels.map(([name, description], index) => (
            <View
              key={name}
              style={[
                styles.levelRow,
                {
                  borderBottomColor: isDark ? `${palette.gold}16` : `${palette.burgundy}10`,
                  borderBottomWidth: index < TajweedLevels.length - 1 ? StyleSheet.hairlineWidth : 0,
                },
              ]}
            >
              <View style={[styles.levelIcon, { backgroundColor: isDark ? `${palette.gold}18` : `${palette.gold}20` }]}>
                <Icon name="pulse-outline" size={20} color={isDark ? palette.gold : palette.goldDark} />
              </View>
              <View style={styles.levelBody}><Text style={[styles.levelName, { color: colors.text }]}>{name}</Text><Text style={[styles.levelText, { color: colors.muted }]}>{description}</Text></View>
            </View>
          ))}
          <View style={[styles.noteBox, { backgroundColor: isDark ? `${palette.gold}12` : `${palette.gold}12`, borderColor: isDark ? `${palette.gold}2e` : `${palette.gold}30` }]}>
            <SectionIcon name="sharia" size={18} />
            <Text style={[styles.note, { color: colors.muted }]}>
              متن <Text style={[styles.noteAccent, { color: isDark ? palette.gold : palette.goldDark }]}>تحفة الأطفال</Text>: مقرر مستوى الوارثون، وعنصر تقييم اختياري في اختبار القبول
            </Text>
          </View>
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
          ].map(([name, description, levels, icon], index) => (
            <View
              key={name}
              style={[
                styles.levelRow,
                styles.shariaRow,
                {
                  borderBottomColor: isDark ? `${palette.gold}16` : `${palette.burgundy}10`,
                  borderBottomWidth: index < 2 ? StyleSheet.hairlineWidth : 0,
                },
              ]}
            >
              <View style={[styles.levelIcon, { backgroundColor: isDark ? `${palette.gold}18` : `${palette.burgundy}0D` }]}>
                <Icon name={icon} size={20} color={isDark ? palette.gold : palette.burgundy} />
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
      </View>

      <View style={styles.accountActions}>
        <Text style={[styles.loginPrompt, { color: colors.muted }]}>لديك حساب بالفعل؟</Text>
        <Button
          testID="welcome-login"
          label="تسجيل الدخول"
          variant="secondary"
          icon="person-outline"
          onPress={openLogin}
          style={styles.loginCta}
        />
      </View>

      <View style={styles.why}>
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: `${isDark ? palette.gold : palette.burgundy}2e` }]} />
          <Text style={[styles.whyTitle, { color: colors.text }]}>لماذا تبيان؟</Text>
          <View style={[styles.dividerLine, { backgroundColor: `${isDark ? palette.gold : palette.burgundy}2e` }]} />
        </View>
        <View style={styles.trustPoints}>
          {WHY_TABYAN_FEATURES.map((feature) => {
            const sectionIcon = "sectionIcon" in feature ? feature.sectionIcon : null;
            const icon = "icon" in feature ? feature.icon : null;
            return (
              <View key={feature.title} style={[styles.trustPoint, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.trustIcon, { backgroundColor: isDark ? `${palette.gold}18` : `${palette.burgundy}0D` }]}>
                  {sectionIcon
                    ? <SectionIcon name={sectionIcon} size={20} />
                    : icon ? <Icon name={icon} size={20} color={isDark ? palette.gold : palette.burgundy} /> : null}
                </View>
                <Text style={[styles.trustText, { color: colors.text }]}>{feature.title}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLine} />
        <Text style={[styles.hadith, { color: colors.muted }]}>﴿ خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ ﴾</Text>
        <Text style={[styles.source, { color: colors.muted }]}>— صحيح البخاري</Text>
      </View>
      <Button label="التسجيل كمعلم" variant="quiet" icon="school-outline" onPress={() => router.push("/teacher-register" as never)} style={styles.teacherCta} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 4, paddingBottom: 16 },
  teacherCta: { width: "100%", marginTop: 6 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 8 },
  heroDivider: { marginVertical: 5 },
  dividerLine: { flex: 1, height: 1, backgroundColor: `${palette.burgundy}2E` },
  diamond: { color: `${palette.gold}AA`, fontSize: 13 },
  cards: { gap: 6 },
  expandHeader: { minHeight: 56, borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 10 },
  expandIcon: { width: 36, height: 36, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  expandBody: { flex: 1, alignItems: "flex-end" },
  expandTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 17, textAlign: "right" },
  expandDescription: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 18, textAlign: "right", marginTop: 1 },
  expandContent: { marginTop: -12, paddingTop: 20, paddingBottom: 12, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderColor: `${palette.burgundy}20` },
  subSection: { borderTopWidth: StyleSheet.hairlineWidth },
  subHeader: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 8, paddingVertical: 11 },
  subIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  subContent: { paddingHorizontal: 8, paddingTop: 4, paddingBottom: 6 },
  levelRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: `${palette.burgundy}14` },
  levelIcon: { width: 36, height: 36, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  levelBody: { flex: 1, alignItems: "flex-end" },
  levelName: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right" },
  levelText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "right" },
  requirement: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right", marginTop: 2 },
  inlineCta: { marginVertical: 12 },
  subTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right" },
  subDescription: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 19, textAlign: "right", marginTop: 2 },
  bulletList: { gap: 6, paddingTop: 8, paddingHorizontal: 8 },
  bullet: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 22, textAlign: "right" },
  noteBox: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, marginHorizontal: 4, marginTop: 10, marginBottom: 4 },
  note: { flex: 1, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "right" },
  noteAccent: { fontFamily: "IBMPlexSansArabic_700Bold" },
  shariaRow: { paddingVertical: 14 },
  accountActions: { alignItems: "center", gap: 4, marginTop: 2 },
  loginPrompt: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "center" },
  loginCta: { width: "100%", minHeight: 42, borderRadius: 999, borderColor: `${palette.burgundy}20` },
  why: { marginTop: 8 },
  whyTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16 },
  trustPoints: { width: "100%", gap: 8 },
  trustPoint: { width: "100%", minHeight: 58, flexDirection: "row-reverse", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10 },
  trustIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  trustText: { flex: 1, fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 13, lineHeight: 21, textAlign: "right" },
  footer: { alignItems: "center", marginTop: 24, marginBottom: 8 },
  footerLine: { width: 100, height: 1, backgroundColor: `${palette.gold}80`, marginBottom: 14 },
  hadith: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 18, lineHeight: 31, textAlign: "center" },
  source: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, marginTop: 3 },
});