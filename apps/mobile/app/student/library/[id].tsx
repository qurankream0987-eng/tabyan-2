import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, EmptyState, ErrorState, Icon, LoadingState } from "../../../components/ui";
import { LibraryMediaPlayer } from "../../../components/library-media-player";
import { useAuth } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";
import { useTheme } from "../../../lib/theme";
import { resolveLibrarySource } from "../../../lib/library-media";
import { StudentScreen } from "../_screen";
import { downloadLibraryPdf, getLibraryDownload, removeLibraryDownload } from "../../../lib/library-download";
import { userFacingErrorMessage } from "../../../lib/user-facing-error";

type Book = {
  id: string;
  title: string;
  author: string | null;
  category: string;
  categoryLabel?: string;
  contentType: string;
  sourceType?: string | null;
  fileObjectKey?: string | null;
  fileUrl: string | null;
  externalUrl: string | null;
  textContent: string | null;
  description?: string | null;
  audioUrl?: string | null;
  isBookmarked?: boolean;
  isDownloaded?: boolean;
  isAssigned?: boolean;
};

export default function Book() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookId = Array.isArray(id) ? id[0] : id;
  const { token } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const query = trpc.library.detail.useQuery({ bookId: String(bookId ?? "") }, { enabled: !!token && !!bookId });
  const book = query.data as Book | undefined;
  const toggleBookmark = trpc.library.toggleBookmark.useMutation({ onSuccess: () => void query.refetch() });
  const toggleDownload = trpc.library.toggleDownload.useMutation({ onSuccess: () => void query.refetch() });
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [localDownload, setLocalDownload] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) {
      setLocalDownload(null);
      return;
    }
    void getLibraryDownload(bookId).then(setLocalDownload).catch(() => setLocalDownload(null));
  }, [bookId]);

  if (query.isLoading) return <StudentScreen title="تفاصيل الكتاب"><LoadingState /></StudentScreen>;
  if (query.error) return <StudentScreen title="تفاصيل الكتاب"><ErrorState onRetry={() => void query.refetch()} /></StudentScreen>;
  if (!book) return <StudentScreen title="تفاصيل الكتاب"><EmptyState title="الكتاب غير موجود أو غير متاح" /></StudentScreen>;

  const source = resolveLibrarySource(book, token);
  const contentType = typeof book.contentType === "string" ? book.contentType.toLowerCase() : "";
  const openSource = async () => {
    const target = localDownload || source;
    if (!target) return;
    try {
      if (!(await Linking.canOpenURL(target))) throw new Error("الرابط غير متاح.");
      await Linking.openURL(target);
    } catch (cause) {
      setActionError(userFacingErrorMessage(cause, "تعذر فتح الملف. حاول مرة أخرى."));
    }
  };
  const downloadBook = async () => {
    if (!source || downloadBusy) return;
    setDownloadBusy(true);
    setActionError(null);
    try {
      if (book.isDownloaded) {
        await removeLibraryDownload(book.id);
        setLocalDownload(null);
      } else {
        setLocalDownload(await downloadLibraryPdf(book.id, source));
      }
      await toggleDownload.mutateAsync({ bookId: book.id });
    } catch (cause) {
      setActionError(userFacingErrorMessage(cause, "تعذر تنزيل الملف. حاول مرة أخرى."));
    } finally {
      setDownloadBusy(false);
    }
  };
  const canRead = (contentType === "pdf" && !!source) || (contentType === "text" && !!book.textContent);

  return (
    <StudentScreen title="تفاصيل الكتاب" subtitle={book.categoryLabel ?? book.category}>
      <Card style={styles.card}>
        <View style={styles.detailHeader}>
          <View style={[styles.cover, { backgroundColor: `${colors.primary}12` }]}>
            <Icon name={contentType === "pdf" ? "document-text-outline" : "book-outline"} size={36} color={colors.primary} />
          </View>
          <View style={styles.copy}>
            <Text style={[styles.type, { color: colors.muted }]}>{contentType.toUpperCase() || "محتوى"}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{book.title}</Text>
            <Text style={[styles.author, { color: colors.muted }]}>{book.author ?? "—"}</Text>
            {book.isAssigned ? <Badge label="مقرر مسجّل" tone="gold" /> : null}
          </View>
        </View>
        {book.description ? <Text style={[styles.description, { color: colors.muted }]}>{book.description}</Text> : null}
        {actionError ? <Text style={[styles.error, { color: colors.danger }]}>{actionError}</Text> : null}
        <View style={styles.metadata}>
          <Text style={[styles.metaText, { color: colors.muted }]}>القسم: {book.categoryLabel ?? book.category}</Text>
          <Text style={[styles.metaText, { color: colors.muted }]}>المصدر: {book.sourceType === "uploaded" ? "ملف مرفوع" : "محتوى منشور"}</Text>
        </View>
        <View style={styles.actions}>
          {canRead ? <Button label="قراءة الكتاب" icon="book-outline" onPress={() => router.push(`/student/library/${book.id}/read` as never)} style={styles.primaryAction} /> : null}
          {["audio", "video"].includes(contentType) && source ? <LibraryMediaPlayer contentType={contentType as "audio" | "video"} source={source} /> : null}
          {contentType === "link" && source ? <Button label="فتح الرابط" icon="link-outline" onPress={openSource} style={styles.primaryAction} /> : null}
           {contentType === "pdf" && book.sourceType === "uploaded" && source ? <Button label={downloadBusy ? "جارٍ التنزيل…" : book.isDownloaded ? "إزالة التنزيل" : "تنزيل"} variant="secondary" icon="download-outline" loading={downloadBusy} onPress={() => void downloadBook()} style={styles.primaryAction} /> : null}
          <Button label={book.isBookmarked ? "إزالة من المحفوظات" : "حفظ في مكتبتي"} variant="secondary" icon={book.isBookmarked ? "bookmark" : "bookmark-outline"} loading={toggleBookmark.isPending} onPress={() => toggleBookmark.mutate({ bookId: book.id })} style={styles.primaryAction} />
        </View>
      </Card>
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18 },
  detailHeader: { flexDirection: "row-reverse", gap: 14, alignItems: "flex-start" },
  cover: { width: 92, height: 120, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, alignItems: "flex-end" },
  type: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 10, marginBottom: 5 },
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 22, textAlign: "right" },
  author: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, marginTop: 7, textAlign: "right" },
  description: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 24, textAlign: "right", marginTop: 18 },
  metadata: { gap: 4, marginTop: 16, alignItems: "flex-end" },
  metaText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11 },
  actions: { gap: 8, marginTop: 20 },
  primaryAction: { width: "100%" },
  error: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 20, textAlign: "right", marginTop: 10 },
});