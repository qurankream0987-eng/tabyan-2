/**
 * Supervision → Library (إدارة الكتب): one source of truth shared by Web and Native.
 *
 * Option values mirror the `admin.library*` tRPC input enums exactly; the server
 * remains the authority and re-validates every field. This module only shapes
 * drafts, client-side validation, list filtering and the copy shown to admins.
 */

export const LIBRARY_CATEGORIES = [
  ["aqeedah", "عقيدة"], ["fiqh", "فقه"], ["seerah", "سيرة"], ["quran", "قرآن"],
  ["qiraat", "قراءات"], ["tajweed", "تجويد"], ["fatwa", "فتاوى"], ["hadith", "حديث"],
] as const;
export const LIBRARY_SECTIONS = [["curriculum", "المنهج"], ["hadith", "الحديث"], ["fatwa", "الفتاوى"], ["general", "عام"]] as const;
export const LIBRARY_CONTENT_TYPES = [["pdf", "PDF"], ["text", "نص"], ["audio", "صوت"], ["video", "فيديو"], ["link", "رابط"]] as const;
export const LIBRARY_STATUSES = [["published", "منشور"], ["hidden", "مخفي"], ["archived", "مؤرشف"]] as const;

export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number][0];
export type LibrarySection = (typeof LIBRARY_SECTIONS)[number][0];
export type LibraryContentType = (typeof LIBRARY_CONTENT_TYPES)[number][0];
export type LibraryStatus = (typeof LIBRARY_STATUSES)[number][0];
export type LibrarySourceType = "uploaded" | "external";

const labelOf = (pairs: readonly (readonly [string, string])[], value: unknown) =>
  pairs.find(([key]) => key === value)?.[1] ?? "";
export const libraryCategoryLabel = (value: unknown) => labelOf(LIBRARY_CATEGORIES, value);
export const librarySectionLabel = (value: unknown) => labelOf(LIBRARY_SECTIONS, value);
export const libraryContentTypeLabel = (value: unknown) => labelOf(LIBRARY_CONTENT_TYPES, value);
export const libraryStatusLabel = (value: unknown) => labelOf(LIBRARY_STATUSES, value);

/** Row shape returned by `admin.libraryList` (fields the supervision UI reads). */
export type LibraryBookRow = {
  id: string; title: string; author: string | null; category: string; section: string;
  contentType: string; sourceType?: string | null; fileObjectKey?: string | null;
  fileUrl: string | null; externalUrl: string | null; textContent: string | null;
  coverUrl?: string | null; description?: string | null; audioUrl?: string | null;
  levelIds: unknown; status: string; createdAt?: unknown;
};

export type LibraryBookDraft = {
  id?: string;
  title: string; author: string; category: LibraryCategory; section: LibrarySection;
  contentType: LibraryContentType; sourceType: LibrarySourceType; status: LibraryStatus;
  fileObjectKey: string | null; fileUrl: string; externalUrl: string; textContent: string;
  coverUrl: string; description: string; audioUrl: string; levelIds: number[];
};

const isUploadedPath = (value: unknown) => typeof value === "string" && value.startsWith("/objects/");
const oneOf = <T extends string>(pairs: readonly (readonly [T, string])[], value: unknown, fallback: T): T =>
  (pairs.some(([key]) => key === value) ? value : fallback) as T;

export function emptyLibraryDraft(): LibraryBookDraft {
  return {
    title: "", author: "", category: "aqeedah", section: "general", contentType: "pdf", sourceType: "external",
    status: "published", fileObjectKey: null, fileUrl: "", externalUrl: "", textContent: "", coverUrl: "",
    description: "", audioUrl: "", levelIds: [],
  };
}

export function libraryDraftFromBook(book: LibraryBookRow): LibraryBookDraft {
  const uploaded = book.sourceType === "uploaded" || isUploadedPath(book.fileObjectKey) || isUploadedPath(book.fileUrl);
  return {
    id: book.id,
    title: book.title ?? "", author: book.author ?? "",
    category: oneOf(LIBRARY_CATEGORIES, book.category, "aqeedah"),
    section: oneOf(LIBRARY_SECTIONS, book.section, "general"),
    contentType: oneOf(LIBRARY_CONTENT_TYPES, book.contentType, "pdf"),
    sourceType: book.contentType === "pdf" && uploaded ? "uploaded" : "external",
    status: oneOf(LIBRARY_STATUSES, book.status, "published"),
    fileObjectKey: book.fileObjectKey ?? (isUploadedPath(book.fileUrl) ? book.fileUrl : null),
    fileUrl: book.fileUrl ?? "", externalUrl: book.externalUrl ?? "", textContent: book.textContent ?? "",
    coverUrl: book.coverUrl ?? "", description: book.description ?? "", audioUrl: book.audioUrl ?? "",
    levelIds: Array.isArray(book.levelIds) ? book.levelIds.map(Number).filter((value) => Number.isInteger(value) && value > 0) : [],
  };
}

export type LibraryDraftErrors = Partial<Record<"title" | "author" | "externalUrl" | "fileUrl" | "textContent" | "file", string>>;

const isHttpUrl = (value: string) => /^https?:\/\/\S+$/i.test(value.trim());

/** Mirrors the server's zod limits and content rules so admins see field errors before submitting. */
export function validateLibraryDraft(draft: LibraryBookDraft): LibraryDraftErrors {
  const errors: LibraryDraftErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = "العنوان مطلوب";
  else if (title.length < 2) errors.title = "العنوان قصير جداً (حرفان على الأقل)";
  else if (title.length > 200) errors.title = "العنوان أطول من 200 حرف";
  if (draft.author.trim().length > 150) errors.author = "اسم المؤلف أطول من 150 حرفاً";
  if (draft.contentType === "pdf") {
    if (draft.sourceType === "uploaded" && !isUploadedPath(draft.fileObjectKey)) errors.file = "ارفع ملف PDF الكتاب أولاً";
    if (draft.sourceType === "external" && draft.externalUrl.trim() && !isHttpUrl(draft.externalUrl)) errors.externalUrl = "أدخل رابطاً يبدأ بـ https://";
  }
  if (draft.contentType === "link") {
    if (!draft.externalUrl.trim()) errors.externalUrl = "رابط الكتاب مطلوب";
    else if (!isHttpUrl(draft.externalUrl)) errors.externalUrl = "أدخل رابطاً يبدأ بـ https://";
  }
  if ((draft.contentType === "audio" || draft.contentType === "video") && draft.fileUrl.trim()
    && !isUploadedPath(draft.fileUrl) && !isHttpUrl(draft.fileUrl)) errors.fileUrl = "أدخل رابطاً صالحاً أو ارفع الملف";
  if (draft.contentType === "text" && !draft.textContent.trim()) errors.textContent = "محتوى الكتاب النصي مطلوب";
  return errors;
}

const optional = (value: string) => (value.trim() ? value.trim() : undefined);
const nullable = (value: string) => (value.trim() ? value.trim() : null);

/**
 * Content fields exactly as the existing Web editor sends them: stored values are
 * preserved (legacy rows keep their file/link), and only an explicit source switch
 * (`withLibrarySource`) clears the other source. An uploaded PDF's fileUrl is its object key.
 */
function contentFields(draft: LibraryBookDraft) {
  const uploadedPdf = draft.contentType === "pdf" && draft.sourceType === "uploaded";
  return {
    sourceType: (uploadedPdf ? "uploaded" : "external") as LibrarySourceType,
    fileObjectKey: draft.fileObjectKey,
    fileUrl: uploadedPdf ? draft.fileObjectKey : nullable(draft.fileUrl),
    externalUrl: uploadedPdf ? null : nullable(draft.externalUrl),
    textContent: draft.textContent.trim() ? draft.textContent : null,
  };
}

/** PDF source switch: clears the fields of the source being left (same rule as the Web editor). */
export function withLibrarySource(draft: LibraryBookDraft, sourceType: LibrarySourceType): LibraryBookDraft {
  return sourceType === "uploaded"
    ? { ...draft, sourceType, externalUrl: "" }
    : { ...draft, sourceType, fileObjectKey: null, fileUrl: isUploadedPath(draft.fileUrl) ? "" : draft.fileUrl };
}

/** Result of a successful PDF upload. */
export function withUploadedPdf(draft: LibraryBookDraft, objectPath: string): LibraryBookDraft {
  return { ...draft, contentType: "pdf", sourceType: "uploaded", fileObjectKey: objectPath, fileUrl: objectPath, externalUrl: "" };
}

export function libraryCreateInput(draft: LibraryBookDraft) {
  const content = contentFields(draft);
  return {
    title: draft.title.trim(), author: optional(draft.author),
    category: draft.category, section: draft.section, contentType: draft.contentType,
    sourceType: content.sourceType,
    fileObjectKey: content.fileObjectKey ?? undefined,
    fileUrl: content.fileUrl ?? undefined, externalUrl: content.externalUrl ?? undefined,
    textContent: content.textContent ?? undefined,
    levelIds: draft.section === "curriculum" && draft.levelIds.length ? draft.levelIds : undefined,
    coverUrl: optional(draft.coverUrl), description: optional(draft.description), audioUrl: optional(draft.audioUrl),
    status: draft.status,
  };
}

export function libraryUpdateInput(draft: LibraryBookDraft & { id: string }) {
  const content = contentFields(draft);
  return {
    id: draft.id, title: draft.title.trim(), author: draft.author.trim(),
    category: draft.category, section: draft.section, contentType: draft.contentType, status: draft.status,
    ...content,
    levelIds: draft.section === "curriculum" ? draft.levelIds : [],
    coverUrl: nullable(draft.coverUrl), description: nullable(draft.description), audioUrl: nullable(draft.audioUrl),
  };
}

export type LibraryFilters = { status: string; section: string; category: string; contentType: string };
export const EMPTY_LIBRARY_FILTERS: LibraryFilters = { status: "", section: "", category: "", contentType: "" };
export const LIBRARY_FILTER_GROUPS = [
  { key: "status", label: "الحالة", options: LIBRARY_STATUSES },
  { key: "section", label: "القسم", options: LIBRARY_SECTIONS },
  { key: "category", label: "التصنيف", options: LIBRARY_CATEGORIES },
  { key: "contentType", label: "نوع المحتوى", options: LIBRARY_CONTENT_TYPES },
] as const;

export const activeFilterCount = (filters: Record<string, string>) => Object.values(filters).filter(Boolean).length;

/** Client-side refinement of the (server-searched) list; search is also matched locally for instant feedback. */
export function filterLibraryBooks<T extends LibraryBookRow>(rows: readonly T[], query: string, filters: LibraryFilters): T[] {
  const needle = query.trim().toLowerCase();
  return rows.filter((book) =>
    (!needle || book.title.toLowerCase().includes(needle) || (book.author ?? "").toLowerCase().includes(needle))
    && (!filters.status || book.status === filters.status)
    && (!filters.section || book.section === filters.section)
    && (!filters.category || book.category === filters.category)
    && (!filters.contentType || book.contentType === filters.contentType));
}

/** Secondary metadata line used by both platforms' list rows. */
export function libraryBookMeta(book: LibraryBookRow, levelName?: (id: number) => string | undefined): string {
  const parts = [book.author || "مؤلف غير محدد", librarySectionLabel(book.section), libraryCategoryLabel(book.category), libraryContentTypeLabel(book.contentType)].filter(Boolean);
  if (book.section === "curriculum" && Array.isArray(book.levelIds) && book.levelIds.length) {
    const names = book.levelIds.map((id) => levelName?.(Number(id)) ?? String(id));
    parts.push(`المستويات: ${names.join("، ")}`);
  }
  return parts.join(" · ");
}

export const LIBRARY_DELETE_IMPACT = "سيُحذف الكتاب نهائياً من المكتبة ومن محفوظات الطلاب، ويُرسل إشعار لمن حفظه. لا يمكن التراجع عن هذا الإجراء.";
export const LIBRARY_ARCHIVE_IMPACT = "سيختفي الكتاب من مكتبة الطلاب ويبقى محفوظاً هنا، ويمكنك استعادته لاحقاً.";

/** `librarySetStatus` only moves published ⇄ archived; hidden books change status through edit. */
export function libraryStatusToggle(status: string): { next: "archived" | "published"; label: string; icon: string } | null {
  if (status === "published") return { next: "archived", label: "أرشفة", icon: "archive" };
  if (status === "archived") return { next: "published", label: "استعادة", icon: "archive-restore" };
  return null;
}

export const LIBRARY_MAX_PDF_BYTES = 500 * 1024 * 1024;
