import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/app/GlassCard";
import EmptyState from "@/components/app/EmptyState";
import Icon, { type IconName } from "@/components/app/Icon";
import Modal from "@/components/app/Modal";
import { useToast } from "@/hooks/useToast";
import { bookFileUrl, objectUrl } from "@/lib/upload";
import { authStore } from "@/lib/auth";
import { DEMO_BOOKS } from "@/lib/demo/student-extra";

const DEMO_TOAST = "وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم";

const SECTIONS: { k: "" | "curriculum" | "hadith" | "fatwa" | "general"; l: string; icon: IconName }[] = [
  { k: "", l: "الكل", icon: "books" },
  { k: "curriculum", l: "المنهج", icon: "quran" },
  { k: "hadith", l: "الحديث", icon: "certificate" },
  { k: "fatwa", l: "الفتاوى", icon: "scale" },
  { k: "general", l: "عام", icon: "library" },
];

const TYPE_ICON: Record<string, IconName> = {
  pdf: "books", text: "edit", audio: "mic", video: "video", link: "arrow-left",
};

type Book = {
  id: string; title: string; author: string | null; category: string; section: string;
  contentType: string; sourceType?: string; fileObjectKey?: string | null;
  fileUrl: string | null; externalUrl: string | null; textContent: string | null;
  coverUrl?: string | null; description?: string | null; audioUrl?: string | null;
  isBookmarked: boolean; isDownloaded: boolean; isAssigned?: boolean;
};

export default function Library() {
  const DEMO = authStore.isDemo;
  const [section, setSection] = useState<"" | "curriculum" | "hadith" | "fatwa" | "general">("");
  const [query, setQuery] = useState("");
  const [player, setPlayer] = useState<Book | null>(null);
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.library.browse.useQuery(
    { section: section || undefined, query: query || undefined },
    { enabled: !DEMO },
  );
  const rows = (DEMO
    ? DEMO_BOOKS.filter((b) =>
        (!section || b.section === section) &&
        (!query || b.title.includes(query) || (b.author ?? "").includes(query)))
    : data ?? []) as Book[];
  const toggleBookmark = trpc.library.toggleBookmark.useMutation({
    onSuccess: () => utils.library.browse.invalidate(),
    onError: (e) => toast(e.message, "error"),
  });
  return (
    <div className="space-y-4 page-enter">
      <div className="text-center pt-2 mb-6">
        <div className="w-16 h-16 icon-bubble mx-auto text-burgundy mb-3">
          <Icon name="library" size={32} />
        </div>
        <h1
          className="hero-greeting font-amiri text-4xl font-extrabold mb-1"
        >المكتبة</h1>
        <p className="font-readex text-sm text-muted-foreground">المنهج حسب مستواك — والمكتبة العامة للجميع</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Icon name="search" size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بعنوان الكتاب أو المؤلف…"
          className="w-full rounded-2xl border-2 border-border bg-card px-5 py-4 pr-12 font-readex text-sm font-bold focus:outline-none focus:border-gold transition shadow-sm"
        />
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {SECTIONS.map((s) => (
          <button
            key={s.k}
            onClick={() => setSection(s.k)}
            className={`px-5 py-2.5 rounded-full text-sm font-readex font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-2 btn-press ${
              section === s.k ? "bg-burgundy text-white dark:bg-gold dark:text-night shadow-md" : "bg-burgundy/6 dark:bg-gold/6 text-burgundy hover:bg-burgundy/12"
            }`}
          >
            <Icon name={s.icon} size={16} />
            {s.l}
          </button>
        ))}
      </div>

      {!DEMO && isLoading ? (
        <div className="h-32 skeleton rounded-[1.5rem]" />
      ) : !rows.length ? (
        <EmptyState title="لا نتائج" hint="جرّب قسماً آخر أو كلمة بحث مختلفة" />
      ) : (
        <div className="space-y-3 pb-6">
          {rows.map((b) => (
            <GlassCard key={b.id} className="p-5 flex items-center gap-4">
              {b.coverUrl ? (
                <img
                  src={b.coverUrl.startsWith("/objects/") ? objectUrl(b.coverUrl) : b.coverUrl}
                  alt={b.title}
                  className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-burgundy/10 dark:border-gold/20"
                />
              ) : (
                <div className="w-14 h-14 icon-bubble text-gold shrink-0">
                  <Icon name={TYPE_ICON[b.contentType] ?? "quran"} size={24} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-readex text-base font-bold text-foreground truncate">{b.title}</div>
                  {b.isAssigned && (
                    <span className="font-readex text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gold/15 text-gold-dark dark:text-gold shrink-0">مقرر مسجّل</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground font-readex truncate">{b.author ?? "—"}</div>
                {b.description && <div className="text-[11px] text-muted-foreground font-readex mt-1 line-clamp-2 leading-relaxed">{b.description}</div>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {b.audioUrl && (
                  <button
                    onClick={() => setPlayer({ ...b, contentType: "audio", fileUrl: b.audioUrl ?? null })}
                    className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center text-gold-dark dark:text-gold btn-press hover:bg-gold/25 transition"
                    title="استماع"
                  >
                    <Icon name="headphones" size={18} />
                  </button>
                )}
                {((b.contentType === "pdf" && (b.fileUrl || b.externalUrl || b.fileObjectKey)) || (b.contentType === "text" && b.textContent)) && (
                  <Link
                    to={`/student/library/book/${b.id}/read`}
                    className="h-10 px-3 rounded-xl bg-burgundy/10 flex items-center gap-1.5 text-burgundy btn-press hover:bg-burgundy/20 transition font-readex text-xs font-bold"
                    title="قراءة"
                  >
                    <Icon name="books" size={17} /> قراءة
                  </Link>
                )}
                {b.contentType === "video" && b.fileUrl ? (
                    <button
                      onClick={() => setPlayer(b)}
                      className="w-10 h-10 rounded-xl bg-burgundy/10 flex items-center justify-center text-burgundy btn-press hover:bg-burgundy/20 transition"
                      title="تشغيل"
                    >
                      <Icon name={b.contentType === "video" ? "video" : "mic"} size={18} />
                    </button>
                  ) : b.contentType === "link" && b.externalUrl ? (
                    <a
                      href={b.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-10 h-10 rounded-xl bg-burgundy/10 flex items-center justify-center text-burgundy btn-press hover:bg-burgundy/20 transition"
                      title="فتح الرابط"
                    >
                      <Icon name="arrow-left" size={18} /> <span className="sr-only">فتح الرابط</span>
                    </a>
                  ) : null}
                {b.contentType === "pdf" && b.sourceType === "uploaded" && (
                  <a
                    href={bookFileUrl(b.id, false)}
                    download
                    className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center text-gold-dark dark:text-gold btn-press hover:bg-gold/25 transition"
                    title="تنزيل"
                  >
                    <Icon name="download" size={18} />
                  </a>
                )}
                <button
                  onClick={() => { if (DEMO) { toast(DEMO_TOAST); return; } toggleBookmark.mutate({ bookId: b.id }); }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center btn-press transition ${b.isBookmarked ? "bg-gold/25 text-gold-dark dark:text-gold" : "bg-burgundy/5 dark:bg-white/5 text-burgundy hover:bg-burgundy/10"}`}
                  title="إشارة مرجعية"
                >
                  <Icon name="bookmark" size={18} className={b.isBookmarked ? "fill-current" : ""} />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* مشغل الفيديو / الصوت داخل التطبيق */}
      <Modal open={!!player} onClose={() => setPlayer(null)}>
        <div className="font-amiri text-xl font-extrabold text-burgundy mb-3 text-center">{player?.title}</div>
        {player?.fileUrl && (
          player.contentType === "video" ? (
            <video
              src={player.fileUrl.startsWith("/objects/") ? objectUrl(player.fileUrl) : player.fileUrl}
              controls autoPlay playsInline className="w-full rounded-xl bg-night max-h-[60vh]"
            />
          ) : (
            <audio
              src={player.fileUrl.startsWith("/objects/") ? objectUrl(player.fileUrl) : player.fileUrl}
              controls autoPlay className="w-full"
            />
          )
        )}
      </Modal>
    </div>
  );
}
