import { useMemo, useState } from "react";
import {
  EMPTY_LIBRARY_FILTERS, LIBRARY_ARCHIVE_IMPACT, LIBRARY_CATEGORIES, LIBRARY_CONTENT_TYPES, LIBRARY_DELETE_IMPACT,
  LIBRARY_FILTER_GROUPS, LIBRARY_MAX_PDF_BYTES, LIBRARY_SECTIONS, LIBRARY_STATUSES, emptyLibraryDraft, filterLibraryBooks,
  libraryBookMeta, libraryCategoryLabel, libraryContentTypeLabel, libraryCreateInput, libraryDraftFromBook, librarySectionLabel,
  libraryStatusLabel, libraryStatusToggle, libraryUpdateInput, validateLibraryDraft, withLibrarySource, withUploadedPdf,
  type LibraryBookDraft, type LibraryBookRow, type LibraryDraftErrors, type LibraryFilters,
} from "@workspace/tabyan-domain/admin-library";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Icon, { type IconName } from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { userFacingErrorMessage } from "@/lib/user-facing-error";
import { authStore } from "@/lib/auth";
import { DEMO_BOOKS, DEMO_LEVELS } from "@/lib/demo/admin-ops";
import { uploadFile, objectUrl } from "@/lib/upload";
import {
  ActionMenu, AdminButton, AdminDrawer, AdminEmpty, AdminErrorState, AdminFilterBar, AdminModal, AdminPageHeader, ChipGroup,
  ConfirmDialog, Field, FileButton, FormActions, FormErrorBanner, IconAction, ListSkeleton, SelectField, TextAreaField, TextField,
  useDirtyState,
} from "@/components/admin/AdminUi";

const TYPE_ICON: Record<string, IconName> = { pdf: "file-text", text: "clipboard", audio: "headphones", video: "video", link: "link" };
const chipOptions = (pairs: readonly (readonly [string, string])[]) => pairs.map(([value, label]) => ({ value, label }));
const assetUrl = (value: string) => (value.startsWith("/objects/") ? objectUrl(value) : value);

export default function AdminLibrary() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const blocked = () => toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info");

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<LibraryFilters>(EMPTY_LIBRARY_FILTERS);
  const q = trpc.admin.libraryList.useQuery(undefined, { enabled: !DEMO });
  const levels = trpc.admin.levelThresholds.useQuery(undefined, { enabled: !DEMO });
  const all = useMemo(() => (DEMO ? DEMO_BOOKS : (q.data ?? [])) as LibraryBookRow[], [DEMO, q.data]);
  const rows = useMemo(() => filterLibraryBooks(all, query, filters), [all, query, filters]);
  const levelsData = (DEMO ? DEMO_LEVELS : (levels.data ?? [])) as Array<{ id: number; name: string }>;
  const levelName = (id: number) => levelsData.find((level) => level.id === id)?.name;

  const [draft, setDraft] = useState<LibraryBookDraft | null>(null);
  const [errors, setErrors] = useState<LibraryDraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<LibraryBookRow | null>(null);
  const [deleting, setDeleting] = useState<LibraryBookRow | null>(null);
  const [archiving, setArchiving] = useState<LibraryBookRow | null>(null);
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"book" | "cover" | "media" | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const dirty = useDirtyState(draft);

  const invalidate = () => utils.admin.libraryList.invalidate();
  const closeForm = () => { setDraft(null); setErrors({}); setFormError(null); };
  const create = trpc.admin.libraryCreate.useMutation({
    onSuccess: () => { closeForm(); toast("أُضيف الكتاب", "success"); void invalidate(); },
    onError: (e) => setFormError(userFacingErrorMessage(e, "تعذر إضافة الكتاب، حاول مرة أخرى.")),
  });
  const update = trpc.admin.libraryUpdate.useMutation({
    onSuccess: () => { closeForm(); toast("حُفظت تعديلات الكتاب", "success"); void invalidate(); },
    onError: (e) => setFormError(userFacingErrorMessage(e, "تعذر حفظ التعديلات، حاول مرة أخرى.")),
  });
  const remove = trpc.admin.libraryDelete.useMutation({
    onSuccess: () => { setDeleting(null); setViewing(null); toast("حُذف الكتاب وأُشعر من حفظه", "success"); void invalidate(); },
    onError: (e) => { setDeleting(null); toast(userFacingErrorMessage(e, "تعذر حذف الكتاب، حاول مرة أخرى."), "error"); },
  });
  const setStatus = trpc.admin.librarySetStatus.useMutation({
    onMutate: (vars) => setStatusPendingId(vars.id),
    onSuccess: (_d, vars) => { setArchiving(null); toast(vars.status === "archived" ? "أُرشف الكتاب" : "استُعيد الكتاب", "success"); void invalidate(); },
    onError: (e) => { setArchiving(null); toast(userFacingErrorMessage(e, "تعذر تغيير حالة الكتاب."), "error"); },
    onSettled: () => setStatusPendingId(null),
  });
  const saving = create.isPending || update.isPending;

  const patch = (next: Partial<LibraryBookDraft>) => {
    setDraft((current) => (current ? { ...current, ...next } : current));
    setErrors((current) => { const copy = { ...current }; for (const key of Object.keys(next)) delete copy[key as keyof LibraryDraftErrors]; return copy; });
  };

  const save = () => {
    if (!draft) return;
    if (DEMO) return blocked();
    const found = validateLibraryDraft(draft);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) { setFormError("راجع الحقول المظللة قبل الحفظ."); return; }
    if (draft.id) update.mutate(libraryUpdateInput({ ...draft, id: draft.id }));
    else create.mutate(libraryCreateInput(draft));
  };

  const upload = async (kind: "book" | "cover" | "media", file: File, onDone: (path: string) => void, purpose?: "book_pdf") => {
    if (DEMO) return blocked();
    setUploading(kind);
    setUploadPct(0);
    try {
      onDone(await uploadFile(file, file.name, setUploadPct, purpose));
    } catch (error) {
      const message = userFacingErrorMessage(error, "تعذر رفع الملف، حاول مرة أخرى.");
      if (kind === "book") setErrors((e) => ({ ...e, file: message })); else setFormError(message);
    } finally { setUploading(null); }
  };

  const onBookPick = async (file: File) => {
    if (!/\.pdf$/i.test(file.name) || file.type !== "application/pdf") { setErrors((e) => ({ ...e, file: "نوع الملف غير مدعوم — اختر ملف PDF" })); return; }
    if (file.size > LIBRARY_MAX_PDF_BYTES) { setErrors((e) => ({ ...e, file: "حجم الملف أكبر من المسموح (500 ميجابايت)" })); return; }
    const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
    if (signature !== "%PDF-") { setErrors((e) => ({ ...e, file: "الملف المرفوع ليس PDF صالحاً" })); return; }
    await upload("book", file, (path) => { setDraft((current) => (current ? withUploadedPdf(current, path) : current)); setErrors((e) => ({ ...e, file: undefined })); }, "book_pdf");
  };

  const toggleStatus = (book: LibraryBookRow) => {
    if (DEMO) return blocked();
    const toggle = libraryStatusToggle(book.status);
    if (!toggle) return;
    if (toggle.next === "archived") setArchiving(book);
    else setStatus.mutate({ id: book.id, status: "published" });
  };
  const openEdit = (book: LibraryBookRow) => { setViewing(null); setDraft(libraryDraftFromBook(book)); };
  const askDelete = (book: LibraryBookRow) => (DEMO ? blocked() : setDeleting(book));

  const uploadedPdf = draft?.contentType === "pdf" && draft.sourceType === "uploaded";

  return (
    <div className="space-y-4 page-enter">
      <AdminPageHeader title="المكتبة" icon="library"
        description="إدارة الكتب والمواد التي تظهر للطلاب في المكتبة والمنهج." />

      <AdminFilterBar query={query} onQuery={setQuery} placeholder="ابحث بالعنوان أو المؤلف"
        filters={LIBRARY_FILTER_GROUPS} values={filters} onChange={(values) => setFilters(values as LibraryFilters)}
        action={<AdminButton icon="plus" aria-label="إضافة كتاب" onClick={() => setDraft(emptyLibraryDraft())}><span className="sm:hidden">إضافة</span><span className="hidden sm:inline">إضافة كتاب</span></AdminButton>}
        resultSummary={q.isLoading && !DEMO ? null : rows.length === all.length ? `${all.length} كتاباً` : `${rows.length} من ${all.length} كتاباً`} />

      {!DEMO && q.isLoading ? <ListSkeleton /> : !DEMO && q.error ? (
        <AdminErrorState message="تعذر تحميل الكتب. تحقق من الاتصال وحاول مرة أخرى." onRetry={() => void q.refetch()} />
      ) : !all.length ? (
        <AdminEmpty icon="library" title="المكتبة فارغة" description="ابدأ بإضافة أول كتاب ليظهر للطلاب."
          action={<AdminButton icon="plus" onClick={() => setDraft(emptyLibraryDraft())}>إضافة كتاب</AdminButton>} />
      ) : !rows.length ? (
        <AdminEmpty title="لا نتائج مطابقة" description="غيّر عبارة البحث أو امسح الفلاتر."
          action={<AdminButton variant="secondary" onClick={() => { setQuery(""); setFilters(EMPTY_LIBRARY_FILTERS); }}>مسح الفلاتر</AdminButton>} />
      ) : (
        <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2" aria-label="الكتب">
          {rows.map((book) => {
            const toggle = libraryStatusToggle(book.status);
            return (
              <li key={book.id}>
                <GlassCard className={`flex items-center gap-3 p-4${book.status === "archived" ? " opacity-60" : ""}`}>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-burgundy"><Icon name={TYPE_ICON[book.contentType] ?? "books"} size={20} /></div>
                  <button type="button" onClick={() => setViewing(book)} className="min-w-0 flex-1 rounded-lg text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-readex text-sm font-bold">{book.title}</span>
                      {book.status !== "published" ? <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-readex text-[10px] font-bold text-muted-foreground">{libraryStatusLabel(book.status)}</span> : null}
                    </span>
                    <span className="mt-0.5 block truncate font-readex text-[11px] text-muted-foreground">{libraryBookMeta(book, levelName)}</span>
                  </button>
                  <div className="flex shrink-0 gap-1.5">
                    <IconAction icon="edit" label={`تعديل ${book.title}`} onClick={() => openEdit(book)} />
                    <ActionMenu label={`خيارات ${book.title}`} loading={statusPendingId === book.id} actions={[
                      { key: "view", label: "عرض التفاصيل", icon: "eye", onSelect: () => setViewing(book) },
                      ...(toggle ? [{ key: "status", label: toggle.next === "archived" ? "أرشفة الكتاب" : "استعادة الكتاب", icon: toggle.icon as IconName, onSelect: () => toggleStatus(book) }] : []),
                      { key: "delete", label: "حذف نهائي", icon: "trash", danger: true, onSelect: () => askDelete(book) },
                    ]} />
                  </div>
                </GlassCard>
              </li>
            );
          })}
        </ul>
      )}

      <AdminModal open={!!draft} onClose={closeForm} dirty={dirty} busy={saving} size="lg"
        title={draft?.id ? "تعديل كتاب" : "إضافة كتاب"} subtitle={draft?.id ? draft.title : "يظهر الكتاب للطلاب بعد الحفظ حسب حالته"}
        footer={(requestClose) => <FormActions onCancel={requestClose} primaryLabel={draft?.id ? "حفظ التعديلات" : "إضافة الكتاب"} onPrimary={save} loading={saving} disabled={!!uploading} />}>
        {draft ? (
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); save(); }} noValidate>
            <FormErrorBanner message={formError} />
            <TextField label="العنوان" required value={draft.title} onChange={(e) => patch({ title: e.target.value })} error={errors.title} maxLength={200} data-autofocus />
            <TextField label="المؤلف" value={draft.author} onChange={(e) => patch({ author: e.target.value })} error={errors.author} maxLength={150} />
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField label="القسم" value={draft.section} options={LIBRARY_SECTIONS} onChange={(e) => patch({ section: e.target.value as LibraryBookDraft["section"] })} />
              <SelectField label="التصنيف" value={draft.category} options={LIBRARY_CATEGORIES} onChange={(e) => patch({ category: e.target.value as LibraryBookDraft["category"] })} />
              <SelectField label="نوع المحتوى" value={draft.contentType} options={LIBRARY_CONTENT_TYPES} onChange={(e) => patch({ contentType: e.target.value as LibraryBookDraft["contentType"] })} />
            </div>

            {draft.contentType === "pdf" ? (
              <div className="space-y-3 rounded-2xl border border-gold/40 bg-gold/5 p-4">
                <ChipGroup label="مصدر الملف" options={[{ value: "uploaded", label: "رفع PDF من الجهاز" }, { value: "external", label: "رابط PDF خارجي" }]} value={draft.sourceType}
                  onChange={(source) => setDraft((current) => (current ? withLibrarySource(current, source as LibraryBookDraft["sourceType"]) : current))} />
                {uploadedPdf ? (
                  <Field label="ملف الكتاب" required error={errors.file} helper={draft.fileObjectKey ? "الملف الحالي موجود — يمكنك استبداله" : "PDF حتى 500 ميجابايت"}>
                    <FileButton label={draft.fileObjectKey ? "استبدال ملف PDF" : "اختيار ملف PDF"} accept="application/pdf,.pdf" loading={uploading === "book"} progress={uploadPct} disabled={!!uploading} onPick={(file) => void onBookPick(file)} />
                  </Field>
                ) : <TextField label="رابط PDF" ltr type="url" placeholder="https://…" value={draft.externalUrl} onChange={(e) => patch({ externalUrl: e.target.value })} error={errors.externalUrl} />}
              </div>
            ) : null}
            {draft.contentType === "link" ? <TextField label="الرابط الخارجي" required ltr type="url" placeholder="https://…" value={draft.externalUrl} onChange={(e) => patch({ externalUrl: e.target.value })} error={errors.externalUrl} /> : null}
            {draft.contentType === "audio" || draft.contentType === "video" ? (
              <div className="space-y-2">
                <TextField label={draft.contentType === "audio" ? "رابط الملف الصوتي" : "رابط الفيديو"} ltr type="url" placeholder="https://… أو ارفع الملف" value={draft.fileUrl} onChange={(e) => patch({ fileUrl: e.target.value })} error={errors.fileUrl} />
                <FileButton label="رفع ملف من الجهاز" accept={draft.contentType === "audio" ? "audio/*" : "video/*"} loading={uploading === "media"} progress={uploadPct} disabled={!!uploading}
                  onPick={(file) => void upload("media", file, (path) => patch({ fileUrl: path }))} />
              </div>
            ) : null}
            {draft.contentType === "text" ? <TextAreaField label="محتوى الكتاب" required rows={8} value={draft.textContent} onChange={(e) => patch({ textContent: e.target.value })} error={errors.textContent} /> : null}

            <TextAreaField label="الوصف" helper="يظهر للطالب في صفحة الكتاب" rows={3} value={draft.description} onChange={(e) => patch({ description: e.target.value })} />
            <Field label="الغلاف" helper="ارفع صورة أو الصق رابطاً جاهزاً">
              <div className="flex flex-wrap items-center gap-2">
                {draft.coverUrl ? <img src={assetUrl(draft.coverUrl)} alt="معاينة الغلاف" className="h-12 w-12 shrink-0 rounded-xl border border-input object-cover" /> : null}
                <input dir="ltr" aria-label="رابط الغلاف" value={draft.coverUrl} onChange={(e) => patch({ coverUrl: e.target.value })} placeholder="https://…"
                  className="min-h-11 min-w-0 flex-1 basis-48 rounded-xl border border-input bg-background px-4 py-2.5 text-left font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold" />
                <FileButton label="رفع صورة" icon="photo" accept="image/*" loading={uploading === "cover"} disabled={!!uploading} onPick={(file) => void upload("cover", file, (path) => patch({ coverUrl: path }))} />
              </div>
            </Field>
            <TextField label="تسجيل صوتي مرافق" helper="اختياري" ltr type="url" placeholder="https://…" value={draft.audioUrl} onChange={(e) => patch({ audioUrl: e.target.value })} />
            {draft.section === "curriculum" ? (
              <ChipGroup label="المستويات" helper="بلا اختيار = متاح لكل المستويات" multiple options={levelsData.map((level) => ({ value: String(level.id), label: level.name }))}
                value={draft.levelIds.map(String)} onChange={(values) => patch({ levelIds: (values as string[]).map(Number) })} />
            ) : null}
            {draft.id ? <ChipGroup label="الحالة" options={chipOptions(LIBRARY_STATUSES)} value={draft.status} onChange={(status) => patch({ status: status as LibraryBookDraft["status"] })} /> : null}
          </form>
        ) : null}
      </AdminModal>

      <AdminDrawer open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title ?? ""} subtitle={viewing ? libraryStatusLabel(viewing.status) : undefined}
        footer={viewing ? <>
          <AdminButton variant="danger" icon="trash" onClick={() => askDelete(viewing)}>حذف</AdminButton>
          {libraryStatusToggle(viewing.status) ? <AdminButton variant="secondary" icon={libraryStatusToggle(viewing.status)!.icon as IconName} loading={statusPendingId === viewing.id} onClick={() => toggleStatus(viewing)}>{libraryStatusToggle(viewing.status)!.label}</AdminButton> : null}
          <AdminButton icon="edit" onClick={() => openEdit(viewing)}>تعديل</AdminButton>
        </> : null}>
        {viewing ? (
          <div className="space-y-4">
            {viewing.coverUrl ? <img src={assetUrl(viewing.coverUrl)} alt="غلاف الكتاب" className="mx-auto h-48 w-36 rounded-2xl border border-input object-cover" /> : null}
            <dl className="divide-y divide-burgundy/10 rounded-2xl border border-burgundy/10 font-readex text-sm dark:divide-gold/15 dark:border-gold/15">
              {[
                ["المؤلف", viewing.author || "غير محدد"], ["القسم", librarySectionLabel(viewing.section)], ["التصنيف", libraryCategoryLabel(viewing.category)],
                ["نوع المحتوى", libraryContentTypeLabel(viewing.contentType)], ["الحالة", libraryStatusLabel(viewing.status)],
                ["المصدر", viewing.contentType === "pdf" ? (viewing.sourceType === "uploaded" || viewing.fileObjectKey ? "ملف مرفوع" : "رابط خارجي") : viewing.contentType === "text" ? "نص داخلي" : "رابط / ملف"],
                ...(viewing.section === "curriculum" ? [["المستويات", Array.isArray(viewing.levelIds) && viewing.levelIds.length ? viewing.levelIds.map((id) => levelName(Number(id)) ?? String(id)).join("، ") : "كل المستويات"]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 px-4 py-3"><dt className="text-muted-foreground">{label}</dt><dd className="text-end font-semibold">{value}</dd></div>
              ))}
            </dl>
            {viewing.description ? <p className="whitespace-pre-line font-readex text-sm leading-relaxed">{viewing.description}</p> : null}
          </div>
        ) : null}
      </AdminDrawer>

      <ConfirmDialog open={!!deleting} title="حذف الكتاب نهائياً؟" itemName={deleting?.title} impact={LIBRARY_DELETE_IMPACT}
        confirmLabel="حذف نهائي" requireText="حذف" loading={remove.isPending} onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate({ id: deleting.id })} />
      <ConfirmDialog open={!!archiving} tone="primary" title="أرشفة الكتاب؟" itemName={archiving?.title} impact={LIBRARY_ARCHIVE_IMPACT}
        confirmLabel="أرشفة" loading={setStatus.isPending} onCancel={() => setArchiving(null)}
        onConfirm={() => archiving && setStatus.mutate({ id: archiving.id, status: "archived" })} />
    </div>
  );
}
