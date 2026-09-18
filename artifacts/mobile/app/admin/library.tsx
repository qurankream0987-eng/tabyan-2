import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { StyleSheet, Text, View } from "react-native";
import { AdminFrame, AdminInput, AdminSelect, ConfirmButton, safeError } from "./_common";
import { Button, Card, EmptyState, ErrorState, LoadingState } from "../../components/ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";
import { uploadNativeFile } from "../../lib/mobile-upload";

const CATEGORIES = [["aqeedah", "عقيدة"], ["fiqh", "فقه"], ["seerah", "سيرة"], ["tajweed", "تجويد"], ["qiraat", "قراءات"], ["other", "أخرى"]];
const SECTIONS = [["curriculum", "منهج"], ["hadith", "حديث"], ["fatwa", "فتوى"], ["general", "عام"]];
const CONTENT_TYPES = [["pdf", "PDF"], ["text", "نص"], ["audio", "صوت"], ["video", "فيديو"], ["link", "رابط"]];

export default function Library() {
  const { colors } = useTheme();
  const utils = trpc.useUtils();
  const q = trpc.admin.libraryList.useQuery({ query: undefined });
  const levels = trpc.admin.levelThresholds.useQuery();
  const [edit, setEdit] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState("");
  const [uploading, setUploading] = useState(false);
  const done = (message: string) => ({ onSuccess: () => { setFeedback(message); setEdit(null); void utils.admin.libraryList.invalidate(); }, onError: (error: unknown) => setFeedback(safeError(error, "تعذر تنفيذ العملية.")) });
  const create = trpc.admin.libraryCreate.useMutation(done("أُضيف المحتوى"));
  const update = trpc.admin.libraryUpdate.useMutation(done("حُدّث المحتوى"));
  const remove = trpc.admin.libraryDelete.useMutation(done("حُذف المحتوى"));
  const status = trpc.admin.librarySetStatus.useMutation(done("تم تحديث الحالة"));
  if (q.isLoading || levels.isLoading) return <AdminFrame title="المكتبة"><LoadingState /></AdminFrame>;
  if (q.error || levels.error) return <AdminFrame title="المكتبة"><ErrorState onRetry={() => { void q.refetch(); void levels.refetch(); }} /></AdminFrame>;
  const all: any[] = Array.isArray(q.data) ? q.data : (q.data as any)?.items ?? [];
  const rows = all.filter((item) => !search || String(item.title ?? "").includes(search) || String(item.author ?? "").includes(search));
  const levelOptions = (Array.isArray(levels.data) ? levels.data : []).map((level: any) => ({ value: String(level.id), label: String(level.name) }));
  const field = (key: string, placeholder: string, multiline = false) => <AdminInput value={String(edit?.[key] ?? "")} onChangeText={(value) => setEdit({ ...edit, [key]: value })} placeholder={placeholder} multiline={multiline} />;
  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "audio/*", "video/*", "text/*"], copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0] || !edit) return;
    const file = result.assets[0];
    setUploading(true);
    try {
      const objectPath = await uploadNativeFile(file.uri, { name: file.name, contentType: file.mimeType ?? "application/octet-stream", purpose: file.mimeType?.includes("pdf") ? "book_pdf" : undefined });
      setEdit({ ...edit, fileUrl: objectPath, sourceType: "uploaded", contentType: file.mimeType?.includes("pdf") ? "pdf" : edit.contentType });
      setFeedback("تم رفع الملف، احفظ المادة لإكمال العملية.");
    } catch (error) {
      setFeedback(safeError(error, "تعذر رفع الملف."));
    } finally {
      setUploading(false);
    }
  };
  const pickCover = async () => {
    if (!edit) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    const image = result.assets[0];
    setUploading(true);
    try {
      const objectPath = await uploadNativeFile(image.uri, { name: image.fileName ?? "cover.jpg", contentType: image.mimeType ?? "image/jpeg" });
      setEdit({ ...edit, coverUrl: objectPath });
      setFeedback("تم رفع الغلاف، احفظ المادة لإكمال العملية.");
    } catch (error) {
      setFeedback(safeError(error, "تعذر رفع الغلاف."));
    } finally {
      setUploading(false);
    }
  };
  const save = () => {
    if (!edit?.title?.trim()) { setFeedback("العنوان مطلوب"); return; }
    const payload = {
      title: edit.title.trim(), author: edit.author || undefined, category: edit.category || "aqeedah",
      section: edit.section || "general", contentType: edit.contentType || "pdf", sourceType: edit.sourceType || "external",
      fileUrl: edit.fileUrl || undefined, externalUrl: edit.externalUrl || undefined, textContent: edit.textContent || undefined,
      coverUrl: edit.coverUrl || undefined, description: edit.description || undefined, audioUrl: edit.audioUrl || undefined,
      levelIds: edit.levelIds ? String(edit.levelIds).split(",").map(Number).filter(Boolean) : undefined,
    };
    if (edit.id) update.mutate({ id: edit.id, ...payload } as any);
    else create.mutate(payload as any);
  };
  return (
    <AdminFrame title="المكتبة">
      {feedback ? <Text style={[styles.feedback, { color: colors.primary }]}>{feedback}</Text> : null}
      <AdminInput value={search} onChangeText={setSearch} placeholder="بحث بالعنوان أو المؤلف" />
      <Button label="إضافة مادة" icon="add-outline" onPress={() => setEdit({ category: "aqeedah", section: "general", contentType: "pdf", sourceType: "external" })} />
       {!rows.length ? <EmptyState title="المكتبة فارغة" description="أضف مادة أو غيّر عبارة البحث." icon="library-outline" /> : rows.map((item) => <Card key={item.id}><Text style={[styles.title, { color: colors.text }]}>{item.title}</Text><Text style={[styles.muted, { color: colors.muted }]}>{item.author ?? "—"} · {item.category} · {item.section} · {item.contentType} · {item.status === "archived" ? "مؤرشف" : item.status}</Text><Text style={[styles.muted, { color: colors.muted }]}>{item.description ?? ""}</Text><View style={styles.actions}><Button label={item.status === "published" ? "أرشفة" : item.status === "archived" ? "استعادة" : "نشر"} variant="secondary" onPress={() => status.mutate({ id: item.id, status: item.status === "published" ? "archived" : "published" } as any)} /><Button label="تعديل" variant="secondary" onPress={() => setEdit({ ...item })} /><ConfirmButton label="حذف" danger onConfirm={() => remove.mutate({ id: item.id } as any)} /></View></Card>)}
     {edit ? <Card accent><Text style={[styles.title, { color: colors.text }]}>{edit.id ? "تعديل المحتوى" : "إضافة محتوى"}</Text>{field("title", "العنوان *")}{field("author", "المؤلف")}<AdminSelect label="التصنيف" value={edit.category ?? "aqeedah"} options={CATEGORIES.map(([value, label]) => ({ value, label }))} onChange={(value) => setEdit({ ...edit, category: value })} /><AdminSelect label="القسم" value={edit.section ?? "general"} options={SECTIONS.map(([value, label]) => ({ value, label }))} onChange={(value) => setEdit({ ...edit, section: value })} /><AdminSelect label="نوع المحتوى" value={edit.contentType ?? "pdf"} options={CONTENT_TYPES.map(([value, label]) => ({ value, label }))} onChange={(value) => setEdit({ ...edit, contentType: value })} /><AdminSelect label="مصدر المحتوى" value={edit.sourceType ?? "external"} options={[{ value: "external", label: "رابط خارجي" }, { value: "uploaded", label: "ملف مرفوع" }]} onChange={(value) => setEdit({ ...edit, sourceType: value })} /><AdminSelect label="المستويات المرتبطة" value="" options={levelOptions} onChange={(value) => setEdit({ ...edit, levelIds: String(edit.levelIds ?? "").split(",").filter(Boolean).concat(value).filter((v, i, values) => values.indexOf(v) === i).join(",") })} placeholder={edit.levelIds ? String(edit.levelIds) : "اختر لإضافة مستوى"} />{field("externalUrl", "الرابط الخارجي")}{field("fileUrl", "مسار الملف الخاص (يُملأ بالرفع)")}{field("textContent", "المحتوى النصي", true)}{field("coverUrl", "رابط الغلاف")}{field("description", "الوصف", true)}<View style={styles.actions}><Button label={uploading ? "جارٍ رفع الملف…" : "اختيار ورفع ملف"} variant="secondary" loading={uploading} disabled={uploading} icon="cloud-upload-outline" onPress={() => void pickFile()} /><Button label="اختيار غلاف" variant="secondary" loading={uploading} disabled={uploading} icon="image-outline" onPress={() => void pickCover()} /></View><Button label="حفظ" loading={create.isPending || update.isPending} onPress={save} /><Button label="إلغاء" variant="quiet" onPress={() => setEdit(null)} /></Card> : null}
    </AdminFrame>
  );
}

const styles = StyleSheet.create({ title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 16, textAlign: "right" }, muted: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", marginVertical: 4 }, actions: { gap: 7, marginTop: 8 }, feedback: { textAlign: "right", marginBottom: 8 } });