import { useState } from "react";
import { useRouter } from "expo-router";
import { Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Badge, Card, EmptyState, ErrorState, Icon, LoadingState, Screen } from "../../../components/ui";
import { useAuth } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";
import { useTheme } from "../../../lib/theme";
import { resolveLibraryAsset, resolveLibrarySource } from "../../../lib/library-media";
import { downloadLibraryPdf, removeLibraryDownload } from "../../../lib/library-download";
import { userFacingErrorMessage } from "../../../lib/user-facing-error";

type Section = "" | "curriculum" | "hadith" | "fatwa" | "general";
type Book = {
  id: string;
  title: string;
  author: string | null;
  category: string;
  categoryLabel?: string;
  section: string;
  contentType: string;
  sourceType?: string | null;
  fileObjectKey?: string | null;
  fileUrl: string | null;
  externalUrl: string | null;
  textContent: string | null;
  coverUrl?: string | null;
  description?: string | null;
  audioUrl?: string | null;
  isBookmarked: boolean;
  isDownloaded: boolean;
  isAssigned?: boolean;
};

const SECTIONS: Array<{ key: Section; label: string; icon: string }> = [
  { key: "", label: "الكل", icon: "library-outline" },
  { key: "curriculum", label: "المنهج", icon: "book-outline" },
  { key: "hadith", label: "الحديث", icon: "ribbon-outline" },
  { key: "fatwa", label: "الفتاوى", icon: "scale-outline" },
  { key: "general", label: "عام", icon: "albums-outline" },
];

const TYPE_META: Record<string, { label: string; icon: string }> = {
  pdf: { label: "PDF", icon: "document-text-outline" },
  text: { label: "نص", icon: "reader-outline" },
  audio: { label: "صوت", icon: "headset-outline" },
  video: { label: "فيديو", icon: "videocam-outline" },
  link: { label: "رابط", icon: "link-outline" },
};

function ActionButton({ label, icon, onPress, active = false }: { label: string; icon: string; onPress: () => void; active?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: active ? `${colors.primary}18` : colors.input, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Icon name={icon} size={16} color={active ? colors.primary : colors.muted} />
      <Text style={[styles.actionText, { color: active ? colors.primary : colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

export default function Library() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<Section>("");
  const [downloadBusy, setDownloadBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const query = trpc.library.browse.useQuery(
    { section: section || undefined, query: search.trim() || undefined },
    { enabled: !!token },
  );
  const toggleBookmark = trpc.library.toggleBookmark.useMutation({
    onSuccess: () => void query.refetch(),
    onError: (cause) => setActionError(userFacingErrorMessage(cause, "تعذر تحديث المحفوظات. حاول مرة أخرى.")),
  });
  const toggleDownload = trpc.library.toggleDownload.useMutation({ onSuccess: () => void query.refetch(), onError: (cause) => setActionError(userFacingErrorMessage(cause, "تعذر تحديث التنزيل. حاول مرة أخرى.")) });
  const books = (query.data ?? []) as Book[];
  const downloadBook = async (book: Book, source: string) => {
    if (downloadBusy) return;
    setDownloadBusy(book.id);
    setActionError(null);
    try {
      if (book.isDownloaded) await removeLibraryDownload(book.id);
      else await downloadLibraryPdf(book.id, source);
      await toggleDownload.mutateAsync({ bookId: book.id });
    } catch (cause) {
      setActionError(userFacingErrorMessage(cause, "تعذر تنزيل الملف. حاول مرة أخرى."));
    } finally {
      setDownloadBusy(null);
    }
  };
  const openLink = async (source: string) => {
    try {
      if (!(await Linking.canOpenURL(source))) throw new Error("الرابط غير متاح.");
      await Linking.openURL(source);
    } catch (cause) {
      setActionError(userFacingErrorMessage(cause, "تعذر فتح الرابط. حاول مرة أخرى."));
    }
  };

  if (query.isLoading) return <Screen><LoadingState /></Screen>;
  if (query.error) return <Screen><ErrorState onRetry={() => void query.refetch()} /></Screen>;
  return (
    <Screen>
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}12` }]}>
          <Icon name="library-outline" size={30} color={colors.primary} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.text }]}>المكتبة</Text>
        <Text style={[styles.heroSubtitle, { color: colors.muted }]}>المنهج حسب مستواك — والمكتبة العامة للجميع</Text>
      </View>
      {actionError ? <ErrorState message={actionError} /> : null}

      <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Icon name="search-outline" size={19} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="ابحث بعنوان الكتاب أو المؤلف…"
          placeholderTextColor={colors.muted}
          style={[styles.searchInput, { color: colors.text }]}
          textAlign="right"
          returnKeyType="search"
        />
      </View>

      <View style={styles.sectionTabs}>
        {SECTIONS.map((item) => {
          const active = item.key === section;
          return (
            <Pressable
              key={item.key || "all"}
              onPress={() => setSection(item.key)}
              style={[styles.sectionTab, { backgroundColor: active ? colors.primary : colors.input, borderColor: active ? colors.primary : colors.border }]}
            >
              <Icon name={item.icon} size={16} color={active ? colors.primaryText : colors.primary} />
              <Text style={[styles.sectionTabText, { color: active ? colors.primaryText : colors.text }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {!books.length ? (
        <EmptyState
          title={search || section ? "لا نتائج" : "لا توجد كتب منشورة"}
          description={search || section ? "جرّب قسماً آخر أو كلمة بحث مختلفة." : "ستظهر الكتب بعد اعتمادها ونشرها."}
          icon="library-outline"
        />
      ) : (
        books.map((book) => {
          const meta = TYPE_META[book.contentType] ?? { label: book.contentType, icon: "book-outline" };
          const source = resolveLibrarySource(book, token);
          return (
            <Card key={book.id} style={styles.bookCard}>
              <View style={styles.bookRow}>
                {book.coverUrl ? (
                  <Image source={{ uri: resolveLibraryAsset(book.coverUrl, token) }} style={styles.cover} />
                ) : (
                  <View style={[styles.cover, styles.coverFallback, { backgroundColor: `${colors.primary}12` }]}>
                    <Icon name={meta.icon} size={27} color={colors.primary} />
                  </View>
                )}
                <View style={styles.bookCopy}>
                  <View style={styles.titleRow}>
                    <Text numberOfLines={2} style={[styles.bookTitle, { color: colors.text }]}>{book.title}</Text>
                    {book.isAssigned ? <Badge label="مقرر مسجّل" tone="gold" /> : null}
                  </View>
                  <Text numberOfLines={1} style={[styles.bookMeta, { color: colors.muted }]}>{book.author ?? "—"}</Text>
                  {book.description ? <Text numberOfLines={2} style={[styles.description, { color: colors.muted }]}>{book.description}</Text> : null}
                  <Text style={[styles.type, { color: colors.muted }]}>{book.categoryLabel ?? book.category} · {meta.label}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                {(book.contentType === "pdf" && source) || (book.contentType === "text" && book.textContent) ? (
                  <ActionButton label="قراءة" icon="book-outline" onPress={() => router.push(`/student/library/${book.id}/read` as never)} />
                ) : null}
                {["audio", "video"].includes(book.contentType) && source ? (
                  <ActionButton label={book.contentType === "audio" ? "استماع" : "تشغيل"} icon={meta.icon} onPress={() => router.push(`/student/library/${book.id}` as never)} />
                ) : book.contentType === "link" && source ? (
                   <ActionButton label="فتح الرابط" icon={meta.icon} onPress={() => void openLink(source)} />
                ) : null}
                {book.contentType === "pdf" && book.sourceType === "uploaded" && source ? (
                   <ActionButton label={downloadBusy === book.id ? "جارٍ التنزيل…" : book.isDownloaded ? "محفوظ" : "تنزيل"} icon="download-outline" active={book.isDownloaded} onPress={() => void downloadBook(book, source)} />
                ) : null}
                <ActionButton label={book.isBookmarked ? "محفوظ" : "حفظ"} icon={book.isBookmarked ? "bookmark" : "bookmark-outline"} active={book.isBookmarked} onPress={() => toggleBookmark.mutate({ bookId: book.id })} />
                <ActionButton label="تفاصيل" icon="chevron-back" onPress={() => router.push(`/student/library/${book.id}` as never)} />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingTop: 8, paddingBottom: 18 },
  heroIcon: { width: 64, height: 64, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  heroTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 25 },
  heroSubtitle: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "center", marginTop: 3 },
  search: { minHeight: 52, borderRadius: 16, borderWidth: 1, paddingHorizontal: 13, flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 13 },
  searchInput: { flex: 1, fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, height: 48 },
  sectionTabs: { flexDirection: "row-reverse", gap: 7, marginBottom: 16 },
  sectionTab: { minHeight: 38, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  sectionTabText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11 },
  bookCard: { padding: 14 },
  bookRow: { flexDirection: "row-reverse", gap: 12 },
  cover: { width: 62, height: 80, borderRadius: 16, flexShrink: 0 },
  coverFallback: { alignItems: "center", justifyContent: "center" },
  bookCopy: { flex: 1, alignItems: "flex-end", minWidth: 0 },
  titleRow: { width: "100%", flexDirection: "row-reverse", alignItems: "flex-start", gap: 6 },
  bookTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, textAlign: "right" },
  bookMeta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "right", marginTop: 5 },
  description: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 5 },
  type: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right", marginTop: 5 },
  actions: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginTop: 13, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 11, borderTopColor: "#00000014" },
  action: { minHeight: 34, borderRadius: 999, paddingHorizontal: 9, flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  actionText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 10 },
});
