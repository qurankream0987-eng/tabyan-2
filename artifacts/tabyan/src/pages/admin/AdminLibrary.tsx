import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Modal from "@/components/Modal";
import PrimaryButton from "@/components/PrimaryButton";
import EmptyState from "@/components/EmptyState";
import Icon, { type IconName } from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { authStore } from "@/lib/auth";
import { DEMO_BOOKS, DEMO_LEVELS } from "@/lib/demo/admin-ops";
import { uploadFile, objectUrl } from "@/lib/upload";

const SECTIONS = [["curriculum", "المنهج"], ["hadith", "الحديث"], ["fatwa", "الفتاوى"], ["general", "عام"]] as const;
const CATS = [["aqeedah", "عقيدة"], ["fiqh", "فقه"], ["seerah", "سيرة"], ["quran", "قرآن"], ["qiraat", "قراءات"], ["tajweed", "تجويد"], ["fatwa", "فتاوى"], ["hadith", "حديث"]] as const;
const TYPES = [["pdf", "PDF"], ["text", "نص"], ["audio", "صوت"], ["video", "فيديو"], ["link", "رابط"]] as const;
const TYPE_ICON: Record<string, IconName> = { pdf: "file-text", text: "clipboard", audio: "headphones", video: "video", link: "link" };

type Book = {
  id: string; title: string; author: string | null; category: string; section: string;
  contentType: string; sourceType?: string; fileObjectKey?: string | null;
  fileUrl: string | null; externalUrl: string | null; textContent: string | null;
  coverUrl?: string | null; description?: string | null; audioUrl?: string | null;
  levelIds: unknown; status: string;
};

export default function AdminLibrary() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const blocked = () => toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info");
  const [query, setQuery] = useState("");
  const q = trpc.admin.libraryList.useQuery({ query: query || undefined }, { enabled: !DEMO });
  const levels = trpc.admin.levelThresholds.useQuery(undefined, { enabled: !DEMO });
  const demoRows = (DEMO_BOOKS as Book[]).filter((b) => !query || b.title.includes(query) || (b.author ?? "").includes(query));
  const data: Book[] | undefined = DEMO ? demoRows : (q.data as Book[] | undefined);
  const isLoading = !DEMO && q.isLoading;
  const levelsData = DEMO ? DEMO_LEVELS : (levels.data ?? []);
  const [edit, setEdit] = useState<Partial<Book> & { id?: string } | null>(null);
  const [del, setDel] = useState<Book | null>(null);
  const [confirm, setConfirm] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingBook, setUploadingBook] = useState(false);
  const [bookUploadPct, setBookUploadPct] = useState(0);

  const onCoverPick = async (e: { target: HTMLInputElement }) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (DEMO) return blocked();
    setUploadingCover(true);
    try {
      const path = await uploadFile(f, f.name);
      setEdit((cur) => (cur ? { ...cur, coverUrl: path } : cur));
      toast("رُفع الغلاف", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "فشل رفع الغلاف", "error");
    } finally {
      setUploadingCover(false);
    }
  };

  const onBookPick = async (e: { target: HTMLInputElement }) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (DEMO) return blocked();
    if (!/\.pdf$/i.test(f.name) || f.type !== "application/pdf") {
      toast("نوع الملف غير مدعوم — اختر ملف PDF", "error");
      return;
    }
    if (f.size > 500 * 1024 * 1024) {
      toast("حجم الملف أكبر من المسموح (500 ميجابايت)", "error");
      return;
    }
    const signature = new TextDecoder().decode(await f.slice(0, 5).arrayBuffer());
    if (signature !== "%PDF-") {
      toast("الملف المرفوع ليس PDF صالحاً", "error");
      return;
    }
    setUploadingBook(true);
    setBookUploadPct(0);
    try {
      const objectPath = await uploadFile(f, f.name, setBookUploadPct, "book_pdf");
      setEdit((cur) => (cur ? {
        ...cur, sourceType: "uploaded", fileObjectKey: objectPath, fileUrl: objectPath, externalUrl: null,
      } : cur));
      toast("تم رفع ملف الكتاب", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "فشل رفع الملف", "error");
    } finally {
      setUploadingBook(false);
    }
  };

  const invalidate = () => utils.admin.libraryList.invalidate();
  const create = trpc.admin.libraryCreate.useMutation({
    onSuccess: () => { toast("أُضيف الكتاب", "success"); setEdit(null); invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const update = trpc.admin.libraryUpdate.useMutation({
    onSuccess: () => { toast("حُدّث الكتاب", "success"); setEdit(null); invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const remove = trpc.admin.libraryDelete.useMutation({
    onSuccess: () => { toast("حُذف الكتاب وأُشعر من أضافه لمحفوظته", "success"); setDel(null); setConfirm(""); invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const setStatus = trpc.admin.librarySetStatus.useMutation({
    onSuccess: (_d, vars) => { toast(vars.status === "archived" ? "أُرشف الكتاب" : "استُعيد الكتاب", "success"); invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });

  const save = () => {
    if (DEMO) return blocked();
    if (!edit?.title?.trim()) return toast("العنوان مطلوب", "error");
    const levelIds = (edit.levelIds as number[] | undefined) ?? [];
    if (edit.id) {
      update.mutate({
        id: edit.id, title: edit.title, author: edit.author ?? undefined,
        category: edit.category as never, section: edit.section as never, status: edit.status as never, levelIds,
        contentType: edit.contentType as never,
        sourceType: edit.sourceType as never,
        fileObjectKey: edit.fileObjectKey ?? null,
        fileUrl: edit.fileUrl ?? null, externalUrl: edit.externalUrl ?? null, textContent: edit.textContent ?? undefined,
        coverUrl: edit.coverUrl ?? undefined, description: edit.description ?? undefined, audioUrl: edit.audioUrl ?? undefined,
      });
    } else {
      create.mutate({
        title: edit.title, author: edit.author || undefined,
        category: (edit.category ?? "aqeedah") as never, section: (edit.section ?? "general") as never,
        contentType: (edit.contentType ?? "pdf") as never,
        sourceType: (edit.sourceType ?? "external") as never,
        fileObjectKey: edit.fileObjectKey ?? undefined,
        fileUrl: edit.fileUrl || undefined, externalUrl: edit.externalUrl || undefined,
        textContent: edit.textContent || undefined, levelIds: levelIds.length ? levelIds : undefined,
        coverUrl: edit.coverUrl || undefined, description: edit.description || undefined, audioUrl: edit.audioUrl || undefined,
      });
    }
  };

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-amiri text-2xl text-burgundy flex items-center gap-2"><Icon name="library" size={24} />المكتبة</h1>
        <PrimaryButton onClick={() => setEdit({ category: "aqeedah", section: "general", contentType: "pdf", sourceType: "external", status: "published", levelIds: [] })}>+ إضافة كتاب</PrimaryButton>
      </div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث…"
        className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold" />

      {isLoading ? <div className="h-40 skeleton rounded-[1.5rem]" /> :
       !data?.length ? <EmptyState title="لا كتب" /> : (
        <div className="grid gap-2 lg:grid-cols-2">
          {(data as Book[]).map((b) => (
            <GlassCard key={b.id} className={`p-3 flex items-center gap-3${b.status === "archived" ? " opacity-60" : ""}`}>
              <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center shrink-0 text-burgundy"><Icon name={TYPE_ICON[b.contentType] ?? "books"} size={20} /></div>
              <div className="flex-1 min-w-0">
                <div className="font-readex text-sm font-bold truncate">{b.title}</div>
                <div className="text-[11px] text-muted-foreground font-readex">
                  {b.author ?? "—"} · {SECTIONS.find((s) => s[0] === b.section)?.[1]}
                  {b.status === "hidden" && " · مخفي"}
                  {b.status === "archived" && " · مؤرشف"}
                  {b.section === "curriculum" && Array.isArray(b.levelIds) && b.levelIds.length > 0 && ` · مستويات: ${(b.levelIds as number[]).join("،")}`}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {b.status === "archived" && (
                  <button title="استعادة" onClick={() => DEMO ? blocked() : setStatus.mutate({ id: b.id, status: "published" })} className="w-8 h-8 rounded-lg bg-gold/15 hover:bg-gold/25 flex items-center justify-center text-burgundy"><Icon name="archive-restore" size={15} /></button>
                )}
                {b.status === "published" && (
                  <button title="أرشفة" onClick={() => DEMO ? blocked() : setStatus.mutate({ id: b.id, status: "archived" })} className="w-8 h-8 rounded-lg bg-burgundy/10 hover:bg-burgundy/20 flex items-center justify-center text-burgundy"><Icon name="archive" size={15} /></button>
                )}
                <button onClick={() => setEdit(b)} className="w-8 h-8 rounded-lg bg-burgundy/10 hover:bg-burgundy/20 flex items-center justify-center text-burgundy"><Icon name="edit" size={15} /></button>
                <button onClick={() => { setDel(b); setConfirm(""); }} className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive"><Icon name="trash" size={15} /></button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Edit/Create modal */}
      <Modal open={!!edit} onClose={() => setEdit(null)} className="max-w-2xl">
        {edit && (
          <div className="space-y-3">
            <h3 className="font-amiri text-xl text-burgundy text-center">{edit.id ? "تعديل كتاب" : "إضافة كتاب"}</h3>
            <input value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="العنوان *"
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm" />
            <input value={edit.author ?? ""} onChange={(e) => setEdit({ ...edit, author: e.target.value })} placeholder="المؤلف"
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm" />
            <div className="grid grid-cols-3 gap-2">
              <select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} className="rounded-xl border border-input bg-background px-2 py-2.5 font-readex text-sm">
                {CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <select value={edit.section} onChange={(e) => setEdit({ ...edit, section: e.target.value })} className="rounded-xl border border-input bg-background px-2 py-2.5 font-readex text-sm">
                {SECTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <select value={edit.contentType} onChange={(e) => setEdit({ ...edit, contentType: e.target.value })} className="rounded-xl border border-input bg-background px-2 py-2.5 font-readex text-sm">
                {TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <textarea value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} rows={2} placeholder="وصف الكتاب (يظهر للطالب)…"
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm resize-none" />
            {/* الغلاف: رفع مباشر إلى التخزين أو رابط جاهز */}
            <div className="flex items-center gap-2">
              {edit.coverUrl ? (
                <img src={edit.coverUrl.startsWith("/objects/") ? objectUrl(edit.coverUrl) : edit.coverUrl} alt="" className="w-11 h-11 rounded-xl object-cover border border-input shrink-0" />
              ) : null}
              <input dir="ltr" value={edit.coverUrl ?? ""} onChange={(e) => setEdit({ ...edit, coverUrl: e.target.value })} placeholder="رابط الغلاف (أو ارفع صورة)"
                className="flex-1 min-w-0 rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm" />
              <label className={`shrink-0 px-3 py-2.5 rounded-xl bg-burgundy/10 text-burgundy font-readex text-xs font-bold cursor-pointer ${uploadingCover ? "opacity-50 pointer-events-none" : ""}`}>
                {uploadingCover ? "يُرفع…" : "رفع"}
                <input type="file" accept="image/*" className="hidden" onChange={onCoverPick} />
              </label>
            </div>
            {edit.contentType === "pdf" && (
              <>
                <select value={edit.sourceType ?? (edit.fileObjectKey || edit.fileUrl?.startsWith("/objects/") ? "uploaded" : "external")}
                  onChange={(e) => setEdit({ ...edit, sourceType: e.target.value, ...(e.target.value === "uploaded" ? { externalUrl: null } : { fileObjectKey: null, fileUrl: null }) })}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm">
                  <option value="uploaded">مصدر الملف: رفع PDF من الجهاز</option>
                  <option value="external">مصدر الملف: رابط PDF خارجي</option>
                </select>
                {(edit.sourceType ?? (edit.fileObjectKey || edit.fileUrl?.startsWith("/objects/") ? "uploaded" : "external")) === "uploaded" ? (
                  <div className="rounded-xl border border-dashed border-gold/60 bg-gold/5 p-3 space-y-2">
                    <div className="font-readex text-xs font-bold text-burgundy">
                      {edit.fileObjectKey || edit.fileUrl?.startsWith("/objects/") ? "الملف الحالي موجود — يمكنك استبداله" : "ارفع ملف PDF الكتاب"}
                    </div>
                    <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-burgundy text-white font-readex text-xs font-bold cursor-pointer ${uploadingBook ? "opacity-60 pointer-events-none" : ""}`}>
                      {uploadingBook ? `جاري الرفع… ${bookUploadPct}%` : "اختيار ملف PDF"}
                      <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={onBookPick} />
                    </label>
                    {uploadingBook && <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gold transition-all" style={{ width: `${bookUploadPct}%` }} /></div>}
                  </div>
                ) : (
                  <input dir="ltr" value={edit.externalUrl ?? ""} onChange={(e) => setEdit({ ...edit, externalUrl: e.target.value })}
                    placeholder="https://… رابط PDF الخارجي" className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm" />
                )}
              </>
            )}
            {edit.contentType !== "text" && edit.contentType !== "pdf" && (
              <input dir="ltr" value={edit.fileUrl ?? edit.externalUrl ?? ""}
                onChange={(e) => setEdit(edit.contentType === "link" ? { ...edit, externalUrl: e.target.value } : { ...edit, fileUrl: e.target.value })}
                placeholder={edit.contentType === "link" ? "https://… الرابط الخارجي" : "https://… رابط الملف (PDF/صوت/فيديو)"}
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm" />
            )}
            {edit.contentType === "text" && (
              <textarea value={edit.textContent ?? ""} onChange={(e) => setEdit({ ...edit, textContent: e.target.value })} rows={6} placeholder="محتوى الكتاب النصي نفسه (plain text)…"
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm resize-none" />
            )}
            <input dir="ltr" value={edit.audioUrl ?? ""} onChange={(e) => setEdit({ ...edit, audioUrl: e.target.value })} placeholder="رابط التسجيل الصوتي المرافق (اختياري)"
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm" />
            {edit.section === "curriculum" && (
              <div>
                <label className="font-readex text-xs font-bold block mb-1">المستويات (فارغ = للجميع)</label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {levelsData.map((l) => {
                    const ids = (edit.levelIds as number[] | undefined) ?? [];
                    const has = ids.includes(l.id);
                    return (
                      <button key={l.id} onClick={() => setEdit({ ...edit, levelIds: has ? ids.filter((x) => x !== l.id) : [...ids, l.id] })}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-readex transition ${has ? "bg-burgundy text-white" : "bg-burgundy/10 text-burgundy"}`}>
                        {l.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {edit.id && (
              <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })} className="w-full rounded-xl border border-input bg-background px-2 py-2.5 font-readex text-sm">
                <option value="published">منشور</option>
                <option value="hidden">مخفي</option>
                <option value="archived">مؤرشف</option>
              </select>
            )}
            <PrimaryButton className="w-full" onClick={save} disabled={create.isPending || update.isPending}>حفظ</PrimaryButton>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!del} onClose={() => setDel(null)}>
        {del && (
          <div className="space-y-3 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center text-destructive"><Icon name="alert-triangle" size={28} /></div>
            <p className="font-readex font-bold">حذف «{del.title}» نهائياً؟</p>
            <p className="font-readex text-xs text-muted-foreground">سيُحذف من محفوظات الطلاب مع إشعارهم. اكتب «حذف»:</p>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-destructive/40 bg-background px-4 py-2.5 font-readex text-sm" />
            <PrimaryButton className="w-full bg-destructive" disabled={confirm !== "حذف"} onClick={() => DEMO ? blocked() : remove.mutate({ id: del.id })}>حذف نهائي</PrimaryButton>
          </div>
        )}
      </Modal>
    </div>
  );
}
