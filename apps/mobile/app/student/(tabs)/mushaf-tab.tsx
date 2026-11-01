import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SURAHS, type SurahMeta } from "@workspace/tabyan-domain/quran-surahs";
import { normalizeDigits } from "@workspace/tabyan-domain/input-normalization";
import { EmptyState, PageHero, Screen, SoftPressable, SvgIcon, cardBorder, type SvgIconName } from "../../../components/ui";
import { JUZ_LIST, type JuzMeta, surahStartingBy } from "../../../lib/mushaf/juz";
import { mushafStorage } from "../../../lib/storage";
import { palette, useTheme } from "../../../lib/theme";

type Tab = "surahs" | "juz" | "bookmarks";
type Row = { key: string; n: number; title: string; detail: string; page: number };
const TABS: [Tab, string][] = [["surahs", "السور"], ["juz", "الأجزاء"], ["bookmarks", "العلامات"]];
const FEATURES: { icon: SvgIconName; label: string; href: string | null }[] = [
  { icon: "quran", label: "القرآن الكريم", href: null },
  { icon: "mosque", label: "مواقيت الصلاة", href: "/student/prayer-times" },
  { icon: "map-pin", label: "اتجاه القبلة", href: "/student/qibla" },
];

/** The web MushafFahd index: feature tiles, continue-reading card, and surah / juz / bookmark lists. */
export default function MushafTab() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [tab, setTab] = useState<Tab>("surahs");
  const [search, setSearch] = useState("");
  const [lastPage, setLastPage] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const accent = isDark ? palette.gold : palette.burgundy;

  // The reader changes both while this tab stays mounted; refresh on every return.
  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([mushafStorage.getLastPage(), mushafStorage.getBookmarks()]).then(([page, marks]) => {
      if (!active) return;
      setLastPage(page);
      setBookmarks(marks);
    });
    return () => { active = false; };
  }, []));

  // navigate reuses the reader already on the stack instead of stacking a new one per tap.
  const openPage = (page: number) => router.navigate(`/student/mushaf?page=${page}` as never);
  const removeBookmark = async (page: number) => setBookmarks(await mushafStorage.toggleBookmark(page));

  const rows = useMemo<Row[]>(() => {
    if (tab === "juz") return JUZ_LIST.map((juz: JuzMeta) => ({ key: `j${juz.n}`, n: juz.n, title: juz.name, detail: `صفحة ${juz.startPage}`, page: juz.startPage }));
    if (tab === "bookmarks") return bookmarks.map((page) => ({ key: `b${page}`, n: page, title: surahStartingBy(page).name, detail: `صفحة ${page}`, page }));
    const query = normalizeDigits(search).trim();
    const number = Number(query);
    const matches = (surah: SurahMeta) => !query || surah.name.includes(query) || surah.name.replace(/^ال/, "").includes(query.replace(/^ال/, "")) || (Number.isInteger(number) && surah.n === number);
    return SURAHS.filter(matches).map((surah) => ({ key: `s${surah.n}`, n: surah.n, title: surah.name, detail: `${surah.ayahs} آية · صفحة ${surah.startPage} · الجزء ${surah.juz}`, page: surah.startPage }));
  }, [tab, search, bookmarks]);

  const header = (
    <View>
      <PageHero icon="book-outline" title="المصحف" subtitle="رواية حفص — الطبعة المدنية ٦٠٤ صفحات" />

      <View style={styles.features}>
        {FEATURES.map((feature) => {
          const highlighted = feature.href === null;
          return (
            <SoftPressable
              key={feature.label}
              accessibilityRole="button"
              accessibilityLabel={feature.label}
              onPress={() => (feature.href ? router.push(feature.href as never) : openPage(lastPage ?? 1))}
              style={[styles.feature, { backgroundColor: colors.card, borderColor: highlighted ? `${palette.gold}99` : cardBorder(isDark), shadowColor: isDark ? "#000" : palette.burgundy }]}
            >
              <View style={[styles.featureIcon, { backgroundColor: isDark ? `${palette.gold}1F` : `${palette.burgundy}12` }]}>
                <SvgIcon name={feature.icon} size={22} color={accent} />
              </View>
              <Text numberOfLines={2} style={[styles.featureLabel, { color: accent }]}>{feature.label}</Text>
            </SoftPressable>
          );
        })}
      </View>

      <View style={[styles.segments, { backgroundColor: isDark ? `${palette.gold}0F` : `${palette.burgundy}0D` }]}>
        {TABS.map(([key, label]) => {
          const selected = tab === key;
          return (
            <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setTab(key)} style={[styles.segment, selected ? { backgroundColor: isDark ? palette.gold : palette.burgundy, ...styles.segmentSelected } : null]}>
              <Text style={[styles.segmentText, { color: selected ? (isDark ? palette.night : "#FFFFFF") : colors.muted }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "surahs" && lastPage !== null ? (
        <SoftPressable accessibilityRole="button" onPress={() => openPage(lastPage)} style={[styles.resume, { backgroundColor: isDark ? `${palette.gold}14` : `${palette.gold}0F`, borderColor: `${palette.gold}66`, shadowColor: isDark ? "#000" : palette.burgundy }]}>
          <View style={[styles.resumeIcon, { backgroundColor: `${palette.gold}26` }]}><SvgIcon name="clock" size={22} color={isDark ? palette.gold : palette.goldDark} /></View>
          <View style={styles.rowBody}>
            <Text style={[styles.resumeKicker, { color: colors.muted }]}>آخر قراءة</Text>
            <Text numberOfLines={1} style={[styles.resumeTitle, { color: accent }]}>متابعة القراءة من صفحة {lastPage}</Text>
            <Text style={[styles.rowDetail, { color: colors.muted }]}>{surahStartingBy(lastPage).name}</Text>
          </View>
          <SvgIcon name="arrow-left" size={16} color={isDark ? palette.gold : palette.goldDark} />
        </SoftPressable>
      ) : null}

      {tab === "surahs" ? (
        <View style={[styles.search, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <SvgIcon name="search" size={18} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث عن سورة بالاسم أو الرقم…"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            style={[styles.searchInput, { color: colors.text }]}
          />
          {search ? (
            <Pressable accessibilityLabel="مسح البحث" hitSlop={10} onPress={() => setSearch("")}><SvgIcon name="x" size={16} color={colors.muted} /></Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const empty = tab === "bookmarks"
    ? <EmptyState title="لا علامات بعد" description="أضف علامة من داخل القارئ لتظهر هنا" />
    : <EmptyState title="لا توجد نتائج" description="جرّب اسمًا آخر للسورة أو رقمها" />;

  // Screen (scroll off) gives the tab header and glow; the list scrolls itself.
  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      <FlatList
        style={styles.list}
        data={rows}
        keyExtractor={(row) => row.key}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        initialNumToRender={16}
        windowSize={7}
        // Clears the floating tab bar, like Screen's tab padding.
        contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
        renderItem={({ item }) => (
          <View style={styles.rowWrap}>
            <SoftPressable accessibilityRole="button" accessibilityLabel={`${item.title}، ${item.detail}`} onPress={() => openPage(item.page)} style={[styles.row, tab === "bookmarks" ? [styles.bookmarkRow, { backgroundColor: colors.card, borderColor: cardBorder(isDark) }] : null]}>
              <View style={[styles.rowNumber, { backgroundColor: tab === "bookmarks" ? `${palette.gold}26` : isDark ? `${palette.gold}1A` : `${palette.burgundy}14` }]}>
                {tab === "bookmarks"
                  ? <SvgIcon name="bookmark" size={18} color={isDark ? palette.gold : palette.goldDark} />
                  : <Text style={[styles.rowNumberText, { color: accent }]}>{item.n}</Text>}
              </View>
              <View style={styles.rowBody}>
                <Text numberOfLines={1} style={[styles.rowTitle, { color: accent }]}>{item.title}</Text>
                <Text numberOfLines={1} style={[styles.rowDetail, { color: colors.muted }]}>{item.detail}</Text>
              </View>
              {tab === "bookmarks" ? (
                <Pressable accessibilityLabel={`إزالة العلامة من صفحة ${item.page}`} hitSlop={8} onPress={() => void removeBookmark(item.page)} style={styles.remove}>
                  <SvgIcon name="x" size={16} color={colors.muted} />
                </Pressable>
              ) : <SvgIcon name="arrow-left" size={14} color={colors.muted} />}
            </SoftPressable>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingTop: 0 },
  list: { flex: 1 },
  content: { paddingTop: 12 },
  features: { flexDirection: "row-reverse", gap: 10, marginBottom: 14 },
  feature: { flex: 1, minHeight: 104, borderRadius: 20, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", gap: 8, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  featureIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  featureLabel: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 11.5, lineHeight: 17, textAlign: "center" },
  segments: { flexDirection: "row-reverse", borderRadius: 14, padding: 4, gap: 4, marginBottom: 14 },
  segment: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  segmentSelected: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  segmentText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13 },
  resume: { flexDirection: "row-reverse", alignItems: "center", gap: 12, borderRadius: 22, borderWidth: 1, padding: 14, marginBottom: 14, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  resumeIcon: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  resumeKicker: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right" },
  resumeTitle: { fontFamily: "Amiri_700Bold", fontSize: 18, lineHeight: 27, textAlign: "right" },
  search: { flexDirection: "row-reverse", alignItems: "center", gap: 8, minHeight: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, marginBottom: 8 },
  searchInput: { flex: 1, minHeight: 44, fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 14, textAlign: "right", paddingVertical: 0 },
  rowWrap: { marginBottom: 2 },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 16 },
  bookmarkRow: { borderWidth: 1, borderRadius: 20, marginBottom: 8, paddingVertical: 12 },
  rowNumber: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  rowNumberText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 15 },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: "Amiri_700Bold", fontSize: 19, lineHeight: 28, textAlign: "right" },
  rowDetail: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 18, textAlign: "right" },
  remove: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
