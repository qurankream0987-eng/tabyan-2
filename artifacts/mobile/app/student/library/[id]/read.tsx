import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Button, Card, EmptyState, ErrorState, LoadingState } from "../../../../components/ui";
import { LibraryMediaPlayer } from "../../../../components/library-media-player";
import { useAuth } from "../../../../lib/auth";
import { trpc } from "../../../../lib/trpc";
import { useTheme } from "../../../../lib/theme";
import { resolveLibrarySource } from "../../../../lib/library-media";
import { StudentScreen } from "../../_screen";
import { getLibraryDownload } from "../../../../lib/library-download";
import { userFacingErrorMessage } from "../../../../lib/user-facing-error";

export default function Read() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const { colors } = useTheme();
  const [fontSize, setFontSize] = useState(18);
  const [localDownload, setLocalDownload] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const query = trpc.library.detail.useQuery({ bookId: String(id) }, { enabled: !!token && !!id });
  useEffect(() => { if (id) void getLibraryDownload(String(id)).then(setLocalDownload).catch(() => setLocalDownload(null)); }, [id]);
  const book = query.data as {
    title: string;
    author: string | null;
    contentType: string;
    textContent: string | null;
    fileUrl: string | null;
    externalUrl: string | null;
    fileObjectKey?: string | null;
  } | undefined;

  if (query.isLoading) return <StudentScreen title="قراءة الكتاب"><LoadingState /></StudentScreen>;
  if (query.error) return <StudentScreen title="قراءة الكتاب"><ErrorState onRetry={() => void query.refetch()} /></StudentScreen>;
  if (!book) return <StudentScreen title="قراءة الكتاب"><EmptyState title="الكتاب غير موجود أو غير متاح" /></StudentScreen>;

  if (book.contentType !== "text" || !book.textContent) {
     const source = localDownload || resolveLibrarySource({ id: String(id), ...book }, token);
    if (book.contentType === "audio" || book.contentType === "video") {
      return (
        <StudentScreen title="قراءة الكتاب">
          <Text style={[styles.title, { color: colors.text }]}>{book.title}</Text>
          {source ? <LibraryMediaPlayer contentType={book.contentType} source={source} /> : <EmptyState title="لا يوجد ملف قابل للتشغيل" />}
        </StudentScreen>
      );
    }
    return (
      <StudentScreen title="قراءة الكتاب">
        <Card style={styles.center}>
          <Text style={[styles.title, { color: colors.text }]}>{book.title}</Text>
          <Text style={[styles.description, { color: colors.muted }]}>سيُفتح ملف PDF في عارض النظام المدمج مع التطبيق مع الحفاظ على صلاحية الوصول.</Text>
           {openError ? <Text style={[styles.description, { color: colors.danger }]}>{openError}</Text> : null}
           {source ? <Button label="فتح عارض PDF" icon="document-text-outline" onPress={() => void WebBrowser.openBrowserAsync(source).catch((cause) => setOpenError(userFacingErrorMessage(cause, "تعذر فتح ملف PDF. حاول مرة أخرى.")))} /> : <EmptyState title="لا يوجد ملف قابل للفتح" />}
        </Card>
      </StudentScreen>
    );
  }

  return (
    <StudentScreen title="قراءة الكتاب" subtitle={book.author ?? undefined}>
      <Card style={styles.reader}>
        <Text style={[styles.title, { color: colors.text }]}>{book.title}</Text>
        <Text style={[styles.author, { color: colors.muted }]}>{book.author ?? "—"}</Text>
        <Text style={[styles.controlsLabel, { color: colors.muted }]}>حجم النص</Text>
        <Text style={[styles.controls, { color: colors.primary }]} onPress={() => setFontSize((value) => Math.min(28, value + 2))}>A+ </Text>
        <Text style={[styles.controls, { color: colors.primary }]} onPress={() => setFontSize((value) => Math.max(14, value - 2))}>A−</Text>
        <Text style={[styles.article, { color: colors.text, fontSize }]}>{book.textContent}</Text>
      </Card>
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  reader: { padding: 20 },
  center: { padding: 20, alignItems: "center", gap: 14 },
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 24, textAlign: "right", width: "100%" },
  author: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", width: "100%", marginTop: 5 },
  description: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 23, textAlign: "right", width: "100%" },
  controlsLabel: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11, textAlign: "right", width: "100%", marginTop: 22 },
  controls: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, alignSelf: "flex-end", marginTop: 5 },
  article: { fontFamily: "IBMPlexSansArabic_400Regular", lineHeight: 40, textAlign: "right", marginTop: 18 },
});