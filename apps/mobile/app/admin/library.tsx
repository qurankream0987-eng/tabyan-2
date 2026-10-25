import { useMemo, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Image, StyleSheet, Text, View } from "react-native";
import {
  EMPTY_LIBRARY_FILTERS, LIBRARY_ARCHIVE_IMPACT, LIBRARY_CATEGORIES, LIBRARY_CONTENT_TYPES, LIBRARY_DELETE_IMPACT,
  LIBRARY_FILTER_GROUPS, LIBRARY_MAX_PDF_BYTES, LIBRARY_SECTIONS, LIBRARY_STATUSES, activeFilterCount, emptyLibraryDraft,
  filterLibraryBooks, libraryBookMeta, libraryCategoryLabel, libraryContentTypeLabel, libraryCreateInput, libraryDraftFromBook,
  librarySectionLabel, libraryStatusLabel, libraryStatusToggle, libraryUpdateInput, validateLibraryDraft, withLibrarySource,
  withUploadedPdf, type LibraryBookDraft, type LibraryBookRow, type LibraryDraftErrors, type LibraryFilters,
} from "@workspace/tabyan-domain/admin-library";
import { AdminFrame, safeError } from "../../components/admin/admin-common";
import { Badge, Button, EmptyState, ErrorState } from "../../components/ui";
import {
  ActiveFilters, AdminRow, AdminSearchBar, AdminSheet, AdminToolbar, ChoiceChips, ConfirmAction, FilterSheet, FormError,
  FormField, FormInput, HeaderAction, IconAction, ListSkeleton, MobileActionSheet, MultiChoiceChips, SheetFooter, useAdminFeedback, useDirtyState, useSheetChain,
} from "../../components/admin-ui";
import { trpc } from "../../lib/trpc";
import { useTheme } from "../../lib/theme";
import { useAuth } from "../../lib/auth";
import { resolveLibraryAsset } from "../../lib/library-media";
import { uploadNativeFile } from "../../lib/mobile-upload";

const options = (pairs: readonly (readonly [string, string])[]) => pairs.map(([value, label]) => ({ value, label }));
const TYPE_ICON: Record<string, string> = { pdf: "document-text-outline", text: "reader-outline", audio: "headset-outline", video: "videocam-outline", link: "link-outline" };

export default function Library() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const notify = useAdminFeedback();
  const utils = trpc.useUtils();
  const q = trpc.admin.libraryList.useQuery({ query: undefined });
  const levels = trpc.admin.levelThresholds.useQuery();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<LibraryFilters>(EMPTY_LIBRARY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<LibraryBookDraft | null>(null);
  const [errors, setErrors] = useState<LibraryDraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<LibraryBookRow | null>(null);
  const [menuFor, setMenuFor] = useState<LibraryBookRow | null>(null);
  const [deleting, setDeleting] = useState<LibraryBookRow | null>(null);
  const [archiving, setArchiving] = useState<LibraryBookRow | null>(null);
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"file" | "cover" | null>(null);
  const dirty = useDirtyState(draft);
  const { chain, onDismissed } = useSheetChain();

  const levelRows = (Array.isArray(levels.data) ? levels.data : []) as Array<{ id: number; name: string }>;
  const levelName = (id: number) => levelRows.find((level) => level.id === id)?.name;
  const all = useMemo(() => (Array.isArray(q.data) ? q.data : []) as LibraryBookRow[], [q.data]);
  const rows = useMemo(() => filterLibraryBooks(all, search, filters), [all, search, filters]);
  const filterCount = activeFilterCount(filters);

  const invalidate = () => utils.admin.libraryList.invalidate();
  const closeForm = () => { setDraft(null); setErrors({}); setFormError(null); };
  const create = trpc.admin.libraryCreate.useMutation({
    onSuccess: () => { closeForm(); notify("أُضيف الكتاب"); void invalidate(); },
    onError: (error) => setFormError(safeError(error, "تعذر إضافة الكتاب، حاول مرة أخرى.")),
  });
  const update = trpc.admin.libraryUpdate.useMutation({
    onSuccess: () => { closeForm(); notify("حُفظت تعديلات الكتاب"); void invalidate(); },
    onError: (error) => setFormError(safeError(error, "تعذر حفظ التعديلات، حاول مرة أخرى.")),
  });
  const remove = trpc.admin.libraryDelete.useMutation({
    onSuccess: () => { setDeleting(null); setViewing(null); notify("حُذف الكتاب وأُشعر من حفظه"); void invalidate(); },
    onError: (error) => { setDeleting(null); notify(safeError(error, "تعذر حذف الكتاب، حاول مرة أخرى."), "error"); },
  });
  const setStatus = trpc.admin.librarySetStatus.useMutation({
    onMutate: (vars) => setStatusPendingId(vars.id),
    onSuccess: (_data, vars) => { setArchiving(null); setViewing((current) => current?.id === vars.id ? { ...current, status: vars.status } : current); notify(vars.status === "archived" ? "أُرشف الكتاب" : "استُعيد الكتاب"); void invalidate(); },
    onError: (error) => { setArchiving(null); notify(safeError(error, "تعذر تغيير حالة الكتاب."), "error"); },
    onSettled: () => setStatusPendingId(null),
  });
  const saving = create.isPending || update.isPending;

  const patch = (next: Partial<LibraryBookDraft>) => {
    setDraft((current) => (current ? { ...current, ...next } : current));
    setFormError(null);
    setErrors((current) => { const copy = { ...current }; for (const key of Object.keys(next)) delete copy[key as keyof LibraryDraftErrors]; if ("fileObjectKey" in next) delete copy.file; return copy; });
  };

  const save = () => {
    if (!draft) return;
    const found = validateLibraryDraft(draft);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) { setFormError("راجع الحقول المظللة قبل الحفظ."); return; }
    if (draft.id) update.mutate(libraryUpdateInput({ ...draft, id: draft.id }));
    else create.mutate(libraryCreateInput(draft));
  };

  const pickPdf = async () => {
    if (!draft) return;
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    const file = result.canceled ? null : result.assets[0];
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) || (file.mimeType && file.mimeType !== "application/pdf")) { setErrors((e) => ({ ...e, file: "نوع الملف غير مدعوم — اختر ملف PDF" })); return; }
    if (file.size && file.size > LIBRARY_MAX_PDF_BYTES) { setErrors((e) => ({ ...e, file: "حجم الملف أكبر من المسموح (500 ميجابايت)" })); return; }
    setUploading("file");
    try {
      const objectPath = await uploadNativeFile(file.uri, { name: file.name, contentType: "application/pdf", purpose: "book_pdf" });
      setDraft((current) => (current ? withUploadedPdf(current, objectPath) : current));
      setErrors((e) => ({ ...e, file: undefined }));
      notify("رُفع ملف الكتاب — احفظ لإكمال العملية", "info");
    } catch (error) {
      setErrors((e) => ({ ...e, file: safeError(error, "تعذر رفع الملف، حاول مرة أخرى.") }));
    } finally { setUploading(null); }
  };

  const pickMedia = async () => {
    if (!draft) return;
    const result = await DocumentPicker.getDocumentAsync({ type: draft.contentType === "audio" ? "audio/*" : "video/*", copyToCacheDirectory: true });
    const file = result.canceled ? null : result.assets[0];
    if (!file) return;
    setUploading("file");
    try {
      const objectPath = await uploadNativeFile(file.uri, { name: file.name, contentType: file.mimeType ?? "application/octet-stream" });
      patch({ fileUrl: objectPath });
      notify("رُفع الملف — احفظ لإكمال العملية", "info");
    } catch (error) {
      setErrors((e) => ({ ...e, fileUrl: safeError(error, "تعذر رفع الملف، حاول مرة أخرى.") }));
    } finally { setUploading(null); }
  };

  const pickCover = async () => {
    if (!draft) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    const image = result.canceled ? null : result.assets[0];
    if (!image) return;
    setUploading("cover");
    try {
      const objectPath = await uploadNativeFile(image.uri, { name: image.fileName ?? "cover.jpg", contentType: image.mimeType ?? "image/jpeg" });
      patch({ coverUrl: objectPath });
    } catch (error) {
      setFormError(safeError(error, "تعذر رفع الغلاف، حاول مرة أخرى."));
    } finally { setUploading(null); }
  };

  const toggleStatus = (book: LibraryBookRow) => {
    const toggle = libraryStatusToggle(book.status);
    if (!toggle) return;
    if (toggle.next === "archived") setArchiving(book);
    else setStatus.mutate({ id: book.id, status: "published" });
  };

  const menuActions = (book: LibraryBookRow) => {
    const toggle = libraryStatusToggle(book.status);
    return [
      { key: "view", label: "عرض التفاصيل", icon: "eye-outline", onPress: () => setViewing(book) },
      { key: "edit", label: "تعديل الكتاب", icon: "create-outline", onPress: () => setDraft(libraryDraftFromBook(book)) },
      ...(toggle ? [{ key: "status", label: toggle.next === "archived" ? "أرشفة الكتاب" : "استعادة الكتاب", icon: toggle.next === "archived" ? "archive-outline" : "refresh-outline", hint: toggle.next === "archived" ? "يختفي من مكتبة الطلاب" : "يعود للظهور للطلاب", onPress: () => toggleStatus(book), disabled: statusPendingId === book.id }] : []),
      { key: "delete", label: "حذف نهائي", icon: "trash-outline", danger: true, onPress: () => setDeleting(book) },
    ];
  };

  const coverSource = draft?.coverUrl ? resolveLibraryAsset(draft.coverUrl, token) : "";
  const uploadedPdf = draft?.contentType === "pdf" && draft.sourceType === "uploaded";

  return (
    <AdminFrame title="المكتبة" right={<HeaderAction label="إضافة" accessibilityLabel="إضافة كتاب" onPress={() => setDraft(emptyLibraryDraft())} />}>
      <AdminToolbar count={q.isLoading ? undefined : rows.length} countLabel={rows.length === all.length ? "كتاباً" : `من ${all.length} كتاباً`} />
      <AdminSearchBar value={search} onChange={setSearch} placeholder="ابحث بالعنوان أو المؤلف" filterCount={filterCount} onOpenFilters={() => setFiltersOpen(true)} />
      <ActiveFilters count={filterCount} onClear={() => setFilters(EMPTY_LIBRARY_FILTERS)} />

      {q.isLoading || levels.isLoading ? <ListSkeleton /> : q.error || levels.error ? (
        <ErrorState message="تعذر تحميل الكتب. تحقق من الاتصال وحاول مرة أخرى." onRetry={() => { void q.refetch(); void levels.refetch(); }} />
      ) : !all.length ? (
        <EmptyState title="المكتبة فارغة" description="ابدأ بإضافة أول كتاب ليظهر للطلاب." icon="library-outline" action="إضافة كتاب" onAction={() => setDraft(emptyLibraryDraft())} />
      ) : !rows.length ? (
        <EmptyState title="لا نتائج مطابقة" description="غيّر عبارة البحث أو امسح الفلاتر." icon="search-outline" action={filterCount ? "مسح الفلاتر" : undefined} onAction={() => setFilters(EMPTY_LIBRARY_FILTERS)} />
      ) : rows.map((book) => (
        <AdminRow key={book.id} title={book.title} subtitle={libraryBookMeta(book, levelName)} leadingIcon={TYPE_ICON[book.contentType] ?? "book-outline"}
          muted={book.status === "archived"} onPress={() => setViewing(book)}
          badges={book.status !== "published" ? <Badge label={libraryStatusLabel(book.status)} tone="muted" /> : undefined}
          actions={<>
            <IconAction icon="create-outline" label={`تعديل ${book.title}`} onPress={() => setDraft(libraryDraftFromBook(book))} />
            <IconAction icon="ellipsis-horizontal" label={`خيارات ${book.title}`} loading={statusPendingId === book.id} onPress={() => setMenuFor(book)} />
          </>} />
      ))}

      <FilterSheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} resultCount={rows.length}
        groups={LIBRARY_FILTER_GROUPS.map((group) => ({ key: group.key, label: group.label, options: options(group.options) }))}
        values={filters} onChange={(values) => setFilters(values as LibraryFilters)} />

      <MobileActionSheet visible={!!menuFor} title={menuFor?.title ?? ""} subtitle={menuFor ? libraryBookMeta(menuFor, levelName) : undefined} actions={menuFor ? menuActions(menuFor) : []} onClose={() => setMenuFor(null)} />

      <AdminSheet visible={!!draft} title={draft?.id ? "تعديل كتاب" : "إضافة كتاب"} subtitle={draft?.id ? draft.title : "يظهر الكتاب للطلاب بعد الحفظ حسب حالته"} onClose={closeForm} dirty={dirty} busy={saving || !!uploading}
        footer={(requestClose) => <SheetFooter primaryLabel={draft?.id ? "حفظ التعديلات" : "إضافة الكتاب"} onPrimary={save} loading={saving} disabled={!!uploading} onSecondary={requestClose} />}>
        {draft ? <>
          <FormError message={formError} />
          <FormInput label="العنوان" required value={draft.title} onChangeText={(title) => patch({ title })} error={errors.title} maxLength={200} />
          <FormInput label="المؤلف" value={draft.author} onChangeText={(author) => patch({ author })} error={errors.author} maxLength={150} />
          <ChoiceChips label="القسم" options={options(LIBRARY_SECTIONS)} value={draft.section} onChange={(section) => patch({ section: section as LibraryBookDraft["section"] })} />
          <ChoiceChips label="التصنيف" options={options(LIBRARY_CATEGORIES)} value={draft.category} onChange={(category) => patch({ category: category as LibraryBookDraft["category"] })} />
          <ChoiceChips label="نوع المحتوى" options={options(LIBRARY_CONTENT_TYPES)} value={draft.contentType} onChange={(contentType) => patch({ contentType: contentType as LibraryBookDraft["contentType"] })} />

          {draft.contentType === "pdf" ? <>
            <ChoiceChips label="مصدر الملف" options={[{ value: "uploaded", label: "رفع PDF من الجهاز" }, { value: "external", label: "رابط PDF خارجي" }]} value={draft.sourceType}
              onChange={(source) => setDraft((current) => (current ? withLibrarySource(current, source as LibraryBookDraft["sourceType"]) : current))} />
            {uploadedPdf ? (
              <FormField label="ملف الكتاب" required error={errors.file} helper={draft.fileObjectKey ? "الملف الحالي موجود — يمكنك استبداله" : "PDF حتى 500 ميجابايت"}>
                <Button label={uploading === "file" ? "جارٍ رفع الملف…" : draft.fileObjectKey ? "استبدال ملف PDF" : "اختيار ملف PDF"} variant="secondary" icon="cloud-upload-outline" loading={uploading === "file"} disabled={!!uploading} onPress={() => void pickPdf()} />
              </FormField>
            ) : <FormInput label="رابط PDF" value={draft.externalUrl} onChangeText={(externalUrl) => patch({ externalUrl })} placeholder="https://…" ltr keyboardType="url" error={errors.externalUrl} />}
          </> : null}
          {draft.contentType === "link" ? <FormInput label="الرابط الخارجي" required value={draft.externalUrl} onChangeText={(externalUrl) => patch({ externalUrl })} placeholder="https://…" ltr keyboardType="url" error={errors.externalUrl} /> : null}
          {draft.contentType === "audio" || draft.contentType === "video" ? <>
            <FormInput label={draft.contentType === "audio" ? "رابط الملف الصوتي" : "رابط الفيديو"} value={draft.fileUrl} onChangeText={(fileUrl) => patch({ fileUrl })} placeholder="https://… أو ارفع الملف" ltr keyboardType="url" error={errors.fileUrl} />
            <Button label={uploading === "file" ? "جارٍ رفع الملف…" : "رفع ملف من الجهاز"} variant="secondary" icon="cloud-upload-outline" loading={uploading === "file"} disabled={!!uploading} onPress={() => void pickMedia()} />
            <View style={styles.gap} />
          </> : null}
          {draft.contentType === "text" ? <FormInput label="محتوى الكتاب" required multiline value={draft.textContent} onChangeText={(textContent) => patch({ textContent })} error={errors.textContent} /> : null}

          <FormInput label="الوصف" helper="يظهر للطالب في صفحة الكتاب" multiline value={draft.description} onChangeText={(description) => patch({ description })} />
          <FormField label="الغلاف" helper="صورة من الجهاز أو رابط جاهز">
            <View style={styles.coverRow}>
              {coverSource ? <Image source={{ uri: coverSource }} style={[styles.cover, { borderColor: colors.border }]} accessibilityLabel="معاينة الغلاف" /> : null}
              <Button label={uploading === "cover" ? "جارٍ رفع الغلاف…" : draft.coverUrl ? "تغيير الغلاف" : "اختيار صورة"} variant="secondary" icon="image-outline" style={styles.flex} loading={uploading === "cover"} disabled={!!uploading} onPress={() => void pickCover()} />
            </View>
          </FormField>
          <FormInput label="رابط الغلاف" value={draft.coverUrl} onChangeText={(coverUrl) => patch({ coverUrl })} placeholder="https://…" ltr keyboardType="url" />
          <FormInput label="تسجيل صوتي مرافق" helper="اختياري" value={draft.audioUrl} onChangeText={(audioUrl) => patch({ audioUrl })} placeholder="https://…" ltr keyboardType="url" />
          {draft.section === "curriculum" ? (
            <MultiChoiceChips label="المستويات" helper="بلا اختيار = متاح لكل المستويات" options={levelRows.map((level) => ({ value: String(level.id), label: level.name }))}
              values={draft.levelIds.map(String)} onChange={(values) => patch({ levelIds: values.map(Number) })} />
          ) : null}
          {draft.id ? <ChoiceChips label="الحالة" options={options(LIBRARY_STATUSES)} value={draft.status} onChange={(status) => patch({ status: status as LibraryBookDraft["status"] })} /> : null}
        </> : null}
      </AdminSheet>

      <AdminSheet visible={!!viewing} title={viewing?.title ?? ""} subtitle={viewing ? libraryStatusLabel(viewing.status) : undefined} onClose={() => setViewing(null)} onDismissed={onDismissed}
        footer={viewing ? <View style={styles.viewFooter}>
          <Button label="حذف" variant="danger" icon="trash-outline" style={styles.flex} onPress={() => { const book = viewing; chain(() => setViewing(null), () => setDeleting(book)); }} />
          <Button label="تعديل" icon="create-outline" style={styles.flexWide} onPress={() => { const book = viewing; chain(() => setViewing(null), () => setDraft(libraryDraftFromBook(book))); }} />
        </View> : null}>
        {viewing ? <>
          {viewing.coverUrl ? <Image source={{ uri: resolveLibraryAsset(viewing.coverUrl, token) }} style={[styles.viewCover, { borderColor: colors.border }]} accessibilityLabel="غلاف الكتاب" /> : null}
          {[
            ["المؤلف", viewing.author || "غير محدد"], ["القسم", librarySectionLabel(viewing.section)], ["التصنيف", libraryCategoryLabel(viewing.category)],
            ["نوع المحتوى", libraryContentTypeLabel(viewing.contentType)], ["الحالة", libraryStatusLabel(viewing.status)],
            ["المصدر", viewing.contentType === "pdf" ? (viewing.sourceType === "uploaded" || viewing.fileObjectKey ? "ملف مرفوع" : "رابط خارجي") : viewing.contentType === "text" ? "نص داخلي" : "رابط / ملف"],
            ...(viewing.section === "curriculum" ? [["المستويات", Array.isArray(viewing.levelIds) && viewing.levelIds.length ? viewing.levelIds.map((id) => levelName(Number(id)) ?? String(id)).join("، ") : "كل المستويات"]] : []),
          ].map(([label, value]) => (
            <View key={label} style={[styles.detail, { borderBottomColor: colors.border }]}><Text style={[styles.detailLabel, { color: colors.muted }]}>{label}</Text><Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text></View>
          ))}
          {viewing.description ? <Text style={[styles.description, { color: colors.text }]}>{viewing.description}</Text> : null}
          {libraryStatusToggle(viewing.status) ? <Button label={libraryStatusToggle(viewing.status)!.next === "archived" ? "أرشفة الكتاب" : "استعادة الكتاب"} variant="secondary" icon="archive-outline" loading={statusPendingId === viewing.id} onPress={() => { const book = viewing; if (book.status === "published") chain(() => setViewing(null), () => setArchiving(book)); else toggleStatus(book); }} /> : null}
        </> : null}
      </AdminSheet>

      <ConfirmAction visible={!!deleting} title="هل تريد حذف هذا الكتاب نهائياً؟" itemName={deleting?.title} impact={LIBRARY_DELETE_IMPACT} confirmLabel="حذف نهائي"
        loading={remove.isPending} onCancel={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate({ id: deleting.id })} />
      <ConfirmAction visible={!!archiving} tone="primary" title="أرشفة الكتاب؟" itemName={archiving?.title} impact={LIBRARY_ARCHIVE_IMPACT} confirmLabel="أرشفة"
        loading={setStatus.isPending} onCancel={() => setArchiving(null)} onConfirm={() => archiving && setStatus.mutate({ id: archiving.id, status: "archived" })} />
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexWide: { flex: 1.6 },
  gap: { height: 12 },
  coverRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  cover: { width: 52, height: 52, borderRadius: 12, borderWidth: 1 },
  viewCover: { width: 120, height: 160, borderRadius: 14, borderWidth: 1, alignSelf: "center", marginBottom: 12 },
  viewFooter: { flexDirection: "row-reverse", gap: 10 },
  detail: { flexDirection: "row-reverse", justifyContent: "space-between", gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  detailLabel: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 13, textAlign: "right" },
  detailValue: { flex: 1, fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 13, textAlign: "left" },
  description: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 14, lineHeight: 24, textAlign: "right", marginVertical: 12 },
});
