import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Button, Card, EmptyState, Header, Icon, LoadingState, Screen, SectionTitle } from "../../../components/ui";
import { arabicDigits, pageSurah, SURAHS, TOTAL_PAGES } from "../../../lib/quran";
import { useTheme, palette } from "../../../lib/theme";
import { storage } from "../../../lib/storage";
import { NativeMushafPage } from "../../../components/native-mushaf-page";
import { loadQcfPage, retainQcfFonts } from "../../../lib/mushaf-native";

export default function MushafIndex() {
  const { colors } = useTheme();
  const [readerPage, setReaderPage] = useState<number | null>(null);
  const [lastPage, setLastPage] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    void storage.getLastPage().then((value) => value && setLastPage(Number(value)));
    void storage.getBookmarks().then(setBookmarks);
  }, []);
  const filtered = useMemo(() => SURAHS.map((name, index) => ({ name, page: Math.max(1, Math.round((index / SURAHS.length) * TOTAL_PAGES)) })).filter((item) => !search.trim() || item.name.includes(search.trim())), [search]);
  const toggleBookmark = async (page: number) => {
    const next = bookmarks.includes(page) ? bookmarks.filter((item) => item !== page) : [...bookmarks, page].sort((a, b) => a - b);
    setBookmarks(next);
    await storage.setBookmarks(next);
  };
  if (readerPage !== null) return <Reader page={readerPage} bookmarks={bookmarks} onClose={() => setReaderPage(null)} onNavigate={setReaderPage} onToggleBookmark={toggleBookmark} />;
  return <Screen><Header title="المصحف الشريف" subtitle="رواية حفص — الطبعة المدنية" /><Card accent style={styles.hero}><Icon name="book-outline" size={34} color={palette.gold} /><Text style={[styles.heroTitle, { color: colors.text }]}>القرآن الكريم</Text><Text style={[styles.heroText, { color: colors.muted }]}>٦٠٤ صفحات • قراءة عربية كاملة</Text>{lastPage ? <Button label={`متابعة من صفحة ${arabicDigits(lastPage)}`} icon="play-outline" onPress={() => setReaderPage(lastPage)} /> : null}</Card><SectionTitle title="فهرس السور" /><View style={[styles.search, { backgroundColor: colors.input, borderColor: colors.border }]}><Icon name="search-outline" size={18} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="ابحث عن سورة" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.text }]} textAlign="right" /></View><FlatList data={filtered} scrollEnabled={false} keyExtractor={(item) => item.name} renderItem={({ item, index }) => <Pressable onPress={() => setReaderPage(item.page)} style={[styles.surahRow, { borderBottomColor: colors.border }]}><View style={[styles.number, { backgroundColor: `${palette.gold}22` }]}><Text style={[styles.numberText, { color: colors.primary }]}>{arabicDigits(index + 1)}</Text></View><View style={styles.surahBody}><Text style={[styles.surahName, { color: colors.text }]}>{item.name}</Text><Text style={[styles.surahMeta, { color: colors.muted }]}>الصفحة {arabicDigits(item.page)}</Text></View><Icon name="chevron-back" size={18} color={colors.muted} /></Pressable>} ListEmptyComponent={<EmptyState title="لا توجد نتائج" icon="search-outline" />} /></Screen>;
}

function Reader({ page, bookmarks, onClose, onNavigate, onToggleBookmark }: { page: number; bookmarks: number[]; onClose: () => void; onNavigate: (page: number) => void; onToggleBookmark: (page: number) => void }) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [data, setData] = useState<Awaited<ReturnType<typeof loadQcfPage>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      setError(null);
      try {
        const next = await loadQcfPage(page);
        if (alive) setData(next);
        await storage.setLastPage(page);
      } catch {
        if (alive) setError("تعذر تجهيز خط أو بيانات الصفحة. أعد فتحها من المصحف.");
      }
      retainQcfFonts(page);
    })();
    return () => { alive = false; };
  }, [page]);
  const pageWidth = Math.min(Math.max(windowWidth - 24, 280), 520);
  return <View style={[styles.reader, { backgroundColor: "#F7F2E4" }]}><Header title={`صفحة ${arabicDigits(page)}`} back right={<Pressable onPress={() => onToggleBookmark(page)} style={styles.readerAction}><Icon name={bookmarks.includes(page) ? "bookmark" : "bookmark-outline"} size={21} color={palette.goldDark} /></Pressable>} />{!data && !error ? <LoadingState label="جارٍ تجهيز صفحة QCF2…" /> : error ? <View style={styles.readerError}><Text style={[styles.readerErrorText, { color: colors.text }]}>{error}</Text><Button label="إغلاق" onPress={onClose} variant="secondary" /></View> : <View style={styles.pageStage}><NativeMushafPage data={data!} width={pageWidth} /></View>}{data ? <View style={[styles.readerNav, { backgroundColor: colors.card, borderTopColor: colors.border }]}><Button label="الصفحة السابقة" disabled={page <= 1} onPress={() => onNavigate(Math.max(1, page - 1))} variant="secondary" /><Text style={[styles.readerPage, { color: colors.text }]}>{pageSurah(page)}</Text><Button label="الصفحة التالية" disabled={page >= TOTAL_PAGES} onPress={() => onNavigate(Math.min(TOTAL_PAGES, page + 1))} variant="secondary" /></View> : null}</View>;
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: 7, paddingVertical: 24 },
  heroTitle: { fontFamily: "Amiri_700Bold", fontSize: 26 },
  heroText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, marginBottom: 5 },
  search: { minHeight: 49, borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 8 },
  searchInput: { flex: 1, height: 47, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13 },
  surahRow: { minHeight: 67, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 12 },
  number: { width: 36, height: 36, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  numberText: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12 },
  surahBody: { flex: 1, alignItems: "flex-end" },
  surahName: { fontFamily: "Amiri_700Bold", fontSize: 18 },
  surahMeta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10 },
  reader: { flex: 1 },
  readerAction: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  pageStage: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 68 },
  readerError: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 15 },
  readerErrorText: { fontFamily: "IBMPlexSansArabic_400Regular", textAlign: "center", lineHeight: 24 },
  readerNav: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth, padding: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  readerPage: { flex: 1, textAlign: "center", fontFamily: "Amiri_700Bold", fontSize: 16 },
});
