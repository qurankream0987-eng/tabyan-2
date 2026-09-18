import { useCallback, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Card, EmptyState, ErrorState, Icon, LoadingState, ProgressBar } from "../../../../components/ui";
import { LibraryMediaPlayer } from "../../../../components/library-media-player";
import { StudentScreen } from "../../_screen";
import { useAuth } from "../../../../lib/auth";
import { trpc } from "../../../../lib/trpc";
import { resolveLibraryAsset } from "../../../../lib/library-media";
import { useTheme, palette } from "../../../../lib/theme";
import { userFacingErrorMessage } from "../../../../lib/user-facing-error";

type ContentResponse = {
  content: {
    id: string;
    title: string;
    author: string | null;
    description: string | null;
    contentType: "pdf" | "text" | "audio" | "video" | "link" | string;
    fileUrl: string | null;
    externalUrl: string | null;
    textBody: string | null;
    durationMinutes: number | null;
    pageCount: number | null;
  };
  level: { id: number; name: string; subjectName: string } | null;
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
  progressPercentage: number;
  lastPosition: string | null;
  status: string;
  bookmarked: boolean;
};

function lessonSections(text: string) {
  const parts = text.split(/\n(?=(?:أهداف الدرس|الدرس|ملاحظات مهمة|خلاصة الدرس)\s*:?)\s*/g);
  return parts.map((part) => {
    const match = part.match(/^(أهداف الدرس|الدرس|ملاحظات مهمة|خلاصة الدرس)\s*:?\s*([\s\S]*)$/);
    return match ? { title: match[1], body: match[2].trim() } : { title: "الدرس", body: part.trim() };
  }).filter((part) => part.body);
}

export default function Content() {
  const { subject, contentId, levelId } = useLocalSearchParams<{ subject?: string; contentId?: string; levelId?: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { colors } = useTheme();
  const id = String(contentId ?? "");
  const query = trpc.sharia.content.useQuery({ contentId: id }, { enabled: !!token && !!id });
  const progress = trpc.sharia.updateContentProgress.useMutation();
  const bookmark = trpc.sharia.toggleBookmark.useMutation();
  const data = query.data as ContentResponse | null | undefined;
  const source = data?.content.fileUrl ?? data?.content.externalUrl ?? "";
  const media = data?.content.contentType === "audio" || data?.content.contentType === "video";
  const lastSavedSecond = useRef(0);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleMediaTimeUpdate = useCallback((currentTime: number, duration: number) => {
    if (!media || !source || !id || data?.status === "completed") return;
    const second = Math.floor(currentTime);
    if (second < 1 || second - lastSavedSecond.current < 10) return;
    lastSavedSecond.current = second;
    const percentage = duration > 0 ? Math.round((currentTime / duration) * 100) : data.progressPercentage;
    progress.mutate({
      contentId: id,
      progressPercentage: Math.max(0, Math.min(99, percentage)),
      lastPosition: String(second),
    }, { onError: (cause) => setActionError(userFacingErrorMessage(cause, "تعذر مزامنة تقدم الدرس. سيُعاد المحاولة لاحقاً.")) });
  }, [data?.progressPercentage, data?.status, id, media, progress, source]);

  const saveProgress = (value: number) => {
    if (!id || progress.isPending) return;
    progress.mutate({ contentId: id, progressPercentage: Math.max(0, Math.min(100, Math.round(value))) }, { onSuccess: () => void query.refetch() });
  };

  if (!id) return <StudentScreen title="المحتوى"><EmptyState title="المحتوى غير صالح" /></StudentScreen>;
  if (query.isLoading) return <StudentScreen title="المحتوى"><LoadingState /></StudentScreen>;
  if (query.error) return <StudentScreen title="المحتوى"><ErrorState message={userFacingErrorMessage(query.error, "تعذر تحميل الدرس. حاول مرة أخرى.")} onRetry={() => void query.refetch()} /></StudentScreen>;
  if (!data) return <StudentScreen title="المحتوى"><EmptyState title="المحتوى غير موجود" description="لم نتمكن من العثور على هذا الدرس." /></StudentScreen>;

  const content = data.content;
  const sections = content.contentType === "text" && content.textBody ? lessonSections(content.textBody) : [];
  const typeLabel = content.contentType === "pdf" ? "ملف PDF" : content.contentType === "audio" ? "صوتيات" : content.contentType === "video" ? "مرئيات" : content.contentType === "link" ? "رابط خارجي" : "نص مقروء";

  return (
    <StudentScreen title="درس شرعي">
      {data.level ? <Pressable onPress={() => router.replace(`/student/sharia/${subject}/${levelId ?? data.level?.id}` as never)}><Text style={[styles.back, { color: colors.primary }]}>‹ {data.level.subjectName} — {data.level.name}</Text></Pressable> : null}
      <Card style={styles.header}>
        <View style={[styles.typeIcon, { backgroundColor: colors.input }]}><Icon name={content.contentType === "video" ? "videocam-outline" : content.contentType === "audio" ? "headset-outline" : "book-outline"} size={27} color={colors.primary} /></View>
        <Text style={[styles.title, { color: colors.primary }]}>{content.title}</Text>
        <Text style={[styles.meta, { color: colors.muted }]}>{typeLabel}{content.author ? ` · ${content.author}` : ""}{content.durationMinutes ? ` · ${content.durationMinutes} دقيقة` : ""}</Text>
        {content.description ? <Text style={[styles.description, { color: colors.muted }]}>{content.description}</Text> : null}
        <View style={styles.progressHeader}><Text style={[styles.meta, { color: colors.muted }]}>{data.progressPercentage}%</Text><Text style={[styles.meta, { color: colors.text }]}>التقدم</Text></View>
        <ProgressBar value={data.progressPercentage} />
        {data.lastPosition ? <Text style={[styles.resume, { color: colors.muted }]}>آخر موضع محفوظ: {data.lastPosition}</Text> : null}
        <Button label={data.bookmarked ? "إزالة الحفظ" : "حفظ الدرس"} icon={data.bookmarked ? "star" : "star-outline"} variant="secondary" onPress={() => bookmark.mutate({ contentId: id }, { onSuccess: () => void query.refetch() })} loading={bookmark.isPending} />
      </Card>

      {content.contentType === "text" ? (
        sections.length ? sections.map((section, index) => (
          <Card key={`${section.title}-${index}`} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>{section.title}</Text>
            <Text style={[styles.body, { color: colors.text }]}>{section.body}</Text>
          </Card>
        )) : <Card><Text style={[styles.body, { color: colors.text }]}>{content.textBody ?? "لا يوجد نص لهذا الدرس."}</Text></Card>
      ) : null}

      {media && source ? (
        <>
          <LibraryMediaPlayer
            source={source}
            contentType={content.contentType === "audio" ? "audio" : "video"}
            initialPositionSeconds={Number(data.lastPosition ?? 0)}
            onTimeUpdate={handleMediaTimeUpdate}
          />
          <Card>
            <Button label="فتح المشغل الخارجي" icon="open-outline" variant="secondary" onPress={() => {
              const target = resolveLibraryAsset(source, token);
              return void Linking.openURL(target).catch((cause) => setActionError(userFacingErrorMessage(cause, "تعذر فتح الملف. حاول مرة أخرى.")));
            }} />
          </Card>
        </>
      ) : null}
       {content.contentType === "pdf" || content.contentType === "link" ? (
         source ? <Card><Button label={content.contentType === "pdf" ? "فتح ملف PDF" : "فتح الرابط"} icon="open-outline" onPress={() => {
           const target = resolveLibraryAsset(source, token);
           return void Linking.openURL(target).catch((cause) => setActionError(userFacingErrorMessage(cause, "تعذر فتح الملف. حاول مرة أخرى.")));
         }} /></Card> : <EmptyState title="لا يوجد ملف قابل للفتح" description="لم يتم إرفاق ملف لهذا الدرس بعد." />
      ) : null}
       {actionError ? <Text style={[styles.completed, { color: colors.danger }]}>{actionError}</Text> : null}
      {!media && content.contentType !== "text" && content.contentType !== "pdf" && content.contentType !== "link" ? <EmptyState title="نوع المحتوى غير مدعوم" /> : null}

      {data.status !== "completed" ? <Button label={progress.isPending ? "جارٍ الحفظ…" : "أنهيت الدرس — وضع علامة مكتمل"} icon="checkmark-circle-outline" onPress={() => saveProgress(100)} loading={progress.isPending} /> : <Text style={[styles.completed, { color: colors.success }]}><Icon name="checkmark-circle" size={16} color={colors.success} /> مكتمل</Text>}

      {(data.prev || data.next) ? (
        <View style={styles.navigation}>
          {data.prev ? <Button label={`السابق: ${data.prev.title}`} variant="secondary" onPress={() => router.replace(`/student/sharia/${subject}/content?contentId=${encodeURIComponent(data.prev?.id ?? "")}&levelId=${levelId ?? ""}` as never)} /> : <View />}
          {data.next ? <Button label={`التالي: ${data.next.title}`} variant="secondary" onPress={() => router.replace(`/student/sharia/${subject}/content?contentId=${encodeURIComponent(data.next?.id ?? "")}&levelId=${levelId ?? ""}` as never)} /> : <View />}
        </View>
      ) : null}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  back: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, textAlign: "right", marginBottom: 8 },
  header: { alignItems: "center" },
  typeIcon: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Amiri_700Bold", fontSize: 24, textAlign: "center", marginTop: 8 },
  meta: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, textAlign: "center", marginTop: 3 },
  description: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, lineHeight: 22, textAlign: "right", marginTop: 12 },
  progressHeader: { width: "100%", flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  resume: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, textAlign: "right", alignSelf: "stretch", marginTop: 6 },
  section: { marginTop: 10 },
  sectionTitle: { fontFamily: "Amiri_700Bold", fontSize: 18, textAlign: "right", marginBottom: 8 },
  body: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 15, lineHeight: 30, textAlign: "right" },
  player: { width: "100%", height: 230, backgroundColor: palette.maroon },
  completed: { fontFamily: "IBMPlexSansArabic_700Bold", textAlign: "center", marginVertical: 8 },
  navigation: { flexDirection: "row-reverse", gap: 8, marginTop: 8 },
});