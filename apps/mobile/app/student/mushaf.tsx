import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewToken,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { SURAHS, TOTAL_PAGES } from "@workspace/tabyan-domain/quran-surahs";
import { PAGE_FIRST_VERSE, pageOfAyah } from "@workspace/tabyan-domain/mushaf-page-index";
import { searchQuran, type QuranSearchResult } from "@workspace/tabyan-domain/quran-search";
import { StudentScreen } from "../../components/student/student-screen";
import { Button, Icon, LoadingState } from "../../components/ui";
import MushafPage, { PAGE_ASPECT } from "../../components/mushaf/mushaf-page";
import { ensurePageFont, loadMushafPage, loadSearchIndex } from "../../lib/mushaf/mushaf-assets";
import { JUZ_START_PAGES, juzOfPage } from "../../lib/mushaf/juz";
import { AyahAudioPlayer, DEFAULT_RECITER, RECITERS, type AyahRef, type ReciterId } from "../../lib/mushaf/ayah-audio";
import { mushafStorage } from "../../lib/storage";
import { toast } from "../../lib/toast";
import { useTheme } from "../../lib/theme";

const PAGES = Array.from({ length: TOTAL_PAGES }, (_, index) => index + 1);
const RECITER_KEY = "tabyan.mushaf.reciter";

type Colors = ReturnType<typeof useTheme>["colors"];

function parseVerseKey(verseKey: string): AyahRef {
  const [surah, ayah] = verseKey.split(":").map(Number);
  return { surah, ayah };
}

/** `?page=N` or `?surah=N` from the index; null when absent or out of range. */
function requestedPage(params: { page?: string; surah?: string }) {
  const page = Number(params.page);
  if (Number.isInteger(page) && page >= 1 && page <= TOTAL_PAGES) return page;
  const surah = Number(params.surah);
  if (Number.isInteger(surah) && surah >= 1 && surah <= SURAHS.length) return SURAHS[surah - 1].startPage;
  return null;
}

function surahOfPage(page: number) {
  return SURAHS[Number(PAGE_FIRST_VERSE[page - 1].split(":")[0]) - 1];
}

/** One page of the pager: loads its data and font, and fits the paper to the space. */
function PagerPage({
  page,
  width,
  height,
  highlightVerseKey,
  onPressVerse,
  colors,
}: {
  page: number;
  width: number;
  height: number;
  highlightVerseKey: string | null;
  onPressVerse: (verseKey: string) => void;
  colors: Colors;
}) {
  const query = useQuery({
    queryKey: ["mushaf-page", page],
    queryFn: async () => {
      const [data] = await Promise.all([loadMushafPage(page), ensurePageFont(page)]);
      return data;
    },
    staleTime: Infinity,
  });
  // Fit the whole page on screen when it is tall; otherwise use the width and scroll.
  const paperWidth = Math.min(width - 16, height * PAGE_ASPECT);
  return (
    <ScrollView style={{ width }} contentContainerStyle={styles.pageScroll}>
      {query.data ? (
        <MushafPage data={query.data} width={paperWidth} highlightVerseKey={highlightVerseKey} onPressVerse={onPressVerse} />
      ) : query.error ? (
        <View style={styles.pageMessage}>
          <Text style={[styles.messageText, { color: colors.danger }]}>تعذر تحميل الصفحة {page}.</Text>
          <Button label="إعادة المحاولة" variant="secondary" icon="refresh-outline" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <View style={styles.pageMessage}><LoadingState label={`جارٍ تحميل الصفحة ${page}…`} /></View>
      )}
    </ScrollView>
  );
}

export default function MushafReaderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ page?: string; surah?: string }>();
  const { colors } = useTheme();
  const listRef = useRef<FlatList<number>>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [page, setPage] = useState<number | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<string | null>(null);
  const [playingAyah, setPlayingAyah] = useState<AyahRef | null>(null);
  const [audioError, setAudioError] = useState(false);
  const [reciter, setReciter] = useState<ReciterId>(DEFAULT_RECITER);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [sheet, setSheet] = useState<"index" | "search" | "reciter" | null>(null);
  const playerRef = useRef<AyahAudioPlayer | null>(null);
  // `?page=` / `?surah=` from the index; read through a ref so the mount effect stays mount-only.
  const linkedPage = requestedPage(params);
  const linkedPageRef = useRef(linkedPage);
  linkedPageRef.current = linkedPage;

  useEffect(() => {
    let active = true;
    // A page or surah in the link wins over the saved page.
    const wanted = linkedPageRef.current;
    void Promise.all([mushafStorage.getLastPage(), AsyncStorage.getItem(RECITER_KEY), mushafStorage.getBookmarks()]).then(([savedPage, savedReciter, savedBookmarks]) => {
      if (!active) return;
      setPage(wanted ?? savedPage ?? 1);
      setBookmarks(savedBookmarks);
      if (RECITERS.some((item) => item.id === savedReciter)) setReciter(savedReciter as ReciterId);
    }).catch(() => { if (active) setPage(wanted ?? 1); });
    const player = new AyahAudioPlayer({
      onAyah: (ayah) => setPlayingAyah(ayah),
      onError: () => setAudioError(true),
    });
    playerRef.current = player;
    return () => {
      active = false;
      player.dispose();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    playerRef.current?.setReciter(reciter);
  }, [reciter]);

  useEffect(() => {
    if (page !== null) void mushafStorage.setLastPage(page);
  }, [page]);

  // A link to another page while the reader is already open (e.g. from the index tab).
  useEffect(() => {
    if (linkedPage !== null && page !== null && size.width > 0) goToPage(linkedPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedPage]);

  async function toggleBookmark() {
    if (!page) return;
    const next = await mushafStorage.toggleBookmark(page);
    setBookmarks(next);
    toast(next.includes(page) ? `أُضيفت علامة على صفحة ${page}` : `أُزيلت العلامة من صفحة ${page}`, "success");
  }

  // Playback follows onto the next page, like the web reader.
  const playingPage = playingAyah ? pageOfAyah(playingAyah.surah, playingAyah.ayah) : null;
  useEffect(() => {
    if (playingPage !== null) goToPage(playingPage, true);
  }, [playingPage]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<number>[] }) => {
    const visible = viewableItems[0]?.item;
    if (typeof visible === "number") setPage(visible);
  }).current;

  function goToPage(target: number, animated = false) {
    const clamped = Math.max(1, Math.min(TOTAL_PAGES, target));
    setPage(clamped);
    listRef.current?.scrollToIndex({ index: clamped - 1, animated });
  }

  function playFrom(ayah: AyahRef) {
    setAudioError(false);
    setSelectedVerse(null);
    playerRef.current?.play(ayah);
  }

  function chooseReciter(id: ReciterId) {
    setReciter(id);
    void AsyncStorage.setItem(RECITER_KEY, id).catch(() => undefined);
    setSheet(null);
    if (playingAyah) playerRef.current?.play(playingAyah);
  }

  const highlightVerseKey = playingAyah ? `${playingAyah.surah}:${playingAyah.ayah}` : selectedVerse;
  const currentSurah = page ? surahOfPage(page) : null;
  const selected = selectedVerse ? parseVerseKey(selectedVerse) : null;
  const reciterName = RECITERS.find((item) => item.id === reciter)?.name ?? "";

  return (
    <StudentScreen title="المصحف" subtitle="مصحف المدينة النبوية" cameraMode>
      <View style={styles.root}>
        <View style={[styles.infoBar, { borderBottomColor: colors.border }]}>
          <Text style={[styles.infoText, { color: colors.primary }]} numberOfLines={1}>
            {currentSurah ? `سورة ${currentSurah.name}` : ""}
          </Text>
          <Text style={[styles.infoText, { color: colors.muted }]} numberOfLines={1}>
            {page ? `الجزء ${juzOfPage(page)} · صفحة ${page}` : ""}
          </Text>
        </View>

        <View style={styles.pager} onLayout={(event) => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
          {size.width > 0 && page !== null ? (
            <FlatList
              ref={listRef}
              data={PAGES}
              keyExtractor={(item) => String(item)}
              horizontal
              // Mushaf order: the next page is on the left.
              inverted
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={page - 1}
              getItemLayout={(_, index) => ({ length: size.width, offset: size.width * index, index })}
              windowSize={3}
              initialNumToRender={1}
              maxToRenderPerBatch={2}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
              renderItem={({ item }) => (
                <PagerPage
                  page={item}
                  width={size.width}
                  height={size.height}
                  highlightVerseKey={highlightVerseKey}
                  onPressVerse={setSelectedVerse}
                  colors={colors}
                />
              )}
            />
          ) : <LoadingState label="جارٍ فتح المصحف…" />}
        </View>

        {selected ? (
          <View style={[styles.panel, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <View style={styles.panelHeader}>
              <Text style={[styles.panelTitle, { color: colors.text }]}>
                سورة {SURAHS[selected.surah - 1]?.name} · الآية {selected.ayah}
              </Text>
              <Pressable accessibilityLabel="إغلاق" onPress={() => setSelectedVerse(null)} hitSlop={10}>
                <Icon name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>
            <View style={styles.panelActions}>
              <View style={styles.flex}><Button label="استمع من هنا" icon="play-outline" variant="secondary" onPress={() => playFrom(selected)} /></View>
              <View style={styles.flex}>
                <Button
                  label="سمّع من هنا"
                  icon="mic-outline"
                  onPress={() => {
                    setSelectedVerse(null);
                    playerRef.current?.stop();
                    router.push({ pathname: "/student/recitation", params: { surah: String(selected.surah), ayah: String(selected.ayah) } } as never);
                  }}
                />
              </View>
            </View>
          </View>
        ) : null}

        {playingAyah || audioError ? (
          <View style={[styles.audioBar, { backgroundColor: colors.selected, borderTopColor: colors.border }]}>
            <Pressable accessibilityLabel="إيقاف التلاوة" onPress={() => { playerRef.current?.stop(); setAudioError(false); }} hitSlop={10}>
              <Icon name="stop-circle" size={30} color={colors.primary} />
            </Pressable>
            <Text style={[styles.audioText, { color: audioError ? colors.danger : colors.text }]} numberOfLines={1}>
              {audioError
                ? "تعذر تشغيل التلاوة. تحقق من الاتصال."
                : `${reciterName} · سورة ${SURAHS[playingAyah!.surah - 1]?.name} · الآية ${playingAyah!.ayah}`}
            </Text>
          </View>
        ) : null}

        <View style={[styles.toolbar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <ToolbarButton icon="list-outline" label="الفهرس" onPress={() => setSheet("index")} colors={colors} />
          <ToolbarButton icon="search-outline" label="بحث" onPress={() => setSheet("search")} colors={colors} />
          <ToolbarButton
            icon={playingAyah ? "pause-outline" : "play-outline"}
            label={playingAyah ? "إيقاف" : "استماع"}
            onPress={() => {
              if (playingAyah) playerRef.current?.stop();
              else if (page) playFrom(parseVerseKey(PAGE_FIRST_VERSE[page - 1]));
            }}
            colors={colors}
          />
          <ToolbarButton icon="person-outline" label="القارئ" onPress={() => setSheet("reciter")} colors={colors} />
          <ToolbarButton
            icon={page !== null && bookmarks.includes(page) ? "bookmark" : "bookmark-outline"}
            label="علامة"
            onPress={() => void toggleBookmark()}
            colors={colors}
          />
          <ToolbarButton
            icon="mic-outline"
            label="تسميع"
            onPress={() => {
              if (!page) return;
              const start = parseVerseKey(PAGE_FIRST_VERSE[page - 1]);
              playerRef.current?.stop();
              router.push({ pathname: "/student/recitation", params: { surah: String(start.surah), ayah: String(start.ayah) } } as never);
            }}
            colors={colors}
          />
        </View>
      </View>

      <IndexSheet
        visible={sheet === "index"}
        onClose={() => setSheet(null)}
        onPick={(target) => { setSheet(null); goToPage(target); }}
        colors={colors}
      />
      <SearchSheet
        visible={sheet === "search"}
        onClose={() => setSheet(null)}
        onPick={(result) => {
          setSheet(null);
          goToPage(result.page);
          setSelectedVerse(result.verseKey);
        }}
        colors={colors}
      />
      <SheetModal visible={sheet === "reciter"} title="اختر القارئ" onClose={() => setSheet(null)} colors={colors}>
        {RECITERS.map((item) => (
          <ListRow key={item.id} title={item.name} selected={item.id === reciter} onPress={() => chooseReciter(item.id)} colors={colors} />
        ))}
      </SheetModal>
    </StudentScreen>
  );
}

function ToolbarButton({ icon, label, onPress, colors }: { icon: string; label: string; onPress: () => void; colors: Colors }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.toolbarButton}>
      <Icon name={icon} size={22} color={colors.primary} />
      <Text style={[styles.toolbarLabel, { color: colors.text }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function SheetModal({
  visible,
  title,
  onClose,
  colors,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  colors: Colors;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* A modal window does not resize for the keyboard; lift the sheet above it. */}
      <KeyboardAvoidingView behavior="padding" style={styles.sheetHost}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.panelHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
            <Pressable accessibilityLabel="إغلاق" onPress={onClose} hitSlop={10}>
              <Icon name="close" size={24} color={colors.muted} />
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ListRow({ title, detail, selected, onPress, colors }: { title: string; detail?: string; selected?: boolean; onPress: () => void; colors: Colors }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.listRow, { borderBottomColor: colors.border, backgroundColor: selected ? colors.selected : "transparent" }]}
    >
      <Text style={[styles.listTitle, { color: selected ? colors.primary : colors.text }]} numberOfLines={1}>{title}</Text>
      {detail ? <Text style={[styles.listDetail, { color: colors.muted }]} numberOfLines={1}>{detail}</Text> : null}
    </Pressable>
  );
}

function IndexSheet({ visible, onClose, onPick, colors }: { visible: boolean; onClose: () => void; onPick: (page: number) => void; colors: Colors }) {
  const [tab, setTab] = useState<"surahs" | "juz">("surahs");
  const [pageInput, setPageInput] = useState("");
  const target = Number(pageInput);
  const validPage = Number.isInteger(target) && target >= 1 && target <= TOTAL_PAGES;
  return (
    <SheetModal visible={visible} title="الفهرس" onClose={onClose} colors={colors}>
      <View style={styles.goRow}>
        <TextInput
          value={pageInput}
          onChangeText={(text) => setPageInput(text.replace(/\D/g, ""))}
          keyboardType="number-pad"
          maxLength={3}
          placeholder="رقم الصفحة (1–604)"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]}
        />
        <Button label="اذهب" variant="secondary" disabled={!validPage} onPress={() => { onPick(target); setPageInput(""); }} />
      </View>
      <View style={styles.tabs}>
        {(["surahs", "juz"] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setTab(value)}
            style={[styles.tab, { borderColor: tab === value ? colors.primary : colors.border, backgroundColor: tab === value ? colors.selected : colors.input }]}
          >
            <Text style={[styles.tabLabel, { color: tab === value ? colors.primary : colors.text }]}>{value === "surahs" ? "السور" : "الأجزاء"}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        style={styles.sheetList}
        data={tab === "surahs" ? SURAHS.map((surah) => ({ key: `s${surah.n}`, title: `سورة ${surah.name}`, detail: `السورة ${surah.n} · ${surah.ayahs} آية · ص ${surah.startPage}`, page: surah.startPage }))
          : JUZ_START_PAGES.map((start, index) => ({ key: `j${index}`, title: `الجزء ${index + 1}`, detail: `ص ${start}`, page: start }))}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => <ListRow title={item.title} detail={item.detail} onPress={() => onPick(item.page)} colors={colors} />}
      />
    </SheetModal>
  );
}

function SearchSheet({
  visible,
  onClose,
  onPick,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (result: QuranSearchResult) => void;
  colors: Colors;
}) {
  const [text, setText] = useState("");
  const index = useQuery({ queryKey: ["quran-search-index"], queryFn: loadSearchIndex, enabled: visible, staleTime: Infinity, retry: 1 });
  const results = useMemo(
    () => (index.data && text.trim().length >= 2 ? searchQuran(index.data, text, { limit: 30, openLast: true }) : []),
    [index.data, text],
  );
  const rowText = useMemo(() => new Map(index.data?.rows.map((row) => [row[0], row[2]]) ?? []), [index.data]);
  return (
    <SheetModal visible={visible} title="البحث في القرآن" onClose={onClose} colors={colors}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="اكتب كلمات من الآية"
        placeholderTextColor={colors.muted}
        autoFocus
        style={[styles.input, styles.searchInput, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]}
      />
      {index.isLoading ? <LoadingState label="جارٍ تحميل فهرس البحث…" /> : null}
      {index.error ? <Text style={[styles.messageText, { color: colors.danger }]}>تعذر تحميل فهرس البحث.</Text> : null}
      {index.data && text.trim().length >= 2 && results.length === 0 ? (
        <Text style={[styles.messageText, { color: colors.muted }]}>لا توجد نتائج.</Text>
      ) : null}
      <FlatList
        style={styles.sheetList}
        keyboardShouldPersistTaps="handled"
        data={results}
        keyExtractor={(item) => `${item.verseKey}:${item.startPosition}`}
        renderItem={({ item }) => {
          const { surah, ayah } = parseVerseKey(item.verseKey);
          return (
            <ListRow
              title={rowText.get(item.verseKey) ?? item.verseKey}
              detail={`سورة ${SURAHS[surah - 1]?.name} · الآية ${ayah} · ص ${item.page}`}
              onPress={() => onPick(item)}
              colors={colors}
            />
          );
        }}
      />
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  infoBar: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13, flexShrink: 1 },
  pager: { flex: 1 },
  pageScroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  pageMessage: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  messageText: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 13, textAlign: "center", marginVertical: 8 },
  panel: { borderTopWidth: StyleSheet.hairlineWidth, padding: 12, gap: 10 },
  panelHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: 12 },
  panelTitle: { flex: 1, fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 14, textAlign: "right" },
  panelActions: { flexDirection: "row-reverse", gap: 10 },
  audioBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  audioText: { flex: 1, fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12, textAlign: "right" },
  toolbar: { flexDirection: "row-reverse", borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 6 },
  toolbarButton: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 4 },
  toolbarLabel: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11 },
  sheetHost: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { maxHeight: "80%", borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  sheetTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 17 },
  sheetList: { flexGrow: 0 },
  listRow: { minHeight: 52, justifyContent: "center", paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
  listTitle: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 14, textAlign: "right" },
  listDetail: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 2 },
  goRow: { flexDirection: "row-reverse", gap: 10, alignItems: "center" },
  input: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 14, textAlign: "right" },
  searchInput: { flex: 0 },
  tabs: { flexDirection: "row-reverse", gap: 8 },
  tab: { flex: 1, minHeight: 40, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tabLabel: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13 },
});

