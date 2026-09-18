import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import AudioPlayerBar from "@/components/app/AudioPlayerBar";
import Icon from "@/components/Icon";
import { FATWA_CATEGORIES, fmtDate } from "@/lib/format";
import { authStore } from "@/lib/auth";
import { DEMO_PUBLIC_FATWAS } from "@/lib/demo/student-extra";

type Item = {
  answerId: string; answerText: string; audioUrl: string | null; audioDurationSeconds: number | null;
  createdAt: string | Date | null; questionText: string; category: string; muftiName: string | null;
  categoryLabel: string; avgRating: string; views: number;
};

export default function FatwaPublic() {
  const DEMO = authStore.isDemo;
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const list = trpc.fatwa.publicList.useQuery({ category: (category || undefined) as never, query: query || undefined }, { enabled: !DEMO });
  const detail = trpc.fatwa.publicDetail.useQuery({ answerId: openId! }, { enabled: !!openId && !DEMO });
  const rows = (DEMO
    ? DEMO_PUBLIC_FATWAS.filter((f) =>
        (!category || f.category === category) &&
        (!query || f.questionText.includes(query)))
    : list.data ?? []) as Item[];
  const det = DEMO ? (DEMO_PUBLIC_FATWAS.find((f) => f.answerId === openId) ?? null) : (detail.data ?? null);

  return (
    <div className="space-y-4 page-enter">
      <div className="text-center">
        <h1 className="font-amiri text-2xl text-burgundy flex items-center justify-center gap-2">الفتاوى المنشورة<Icon name="certificate" size={22} /></h1>
        <p className="font-readex text-sm text-muted-foreground">إجابات موثقة من مفتي المنصة</p>
      </div>

      <div className="relative">
        <Icon name="search" size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في الفتاوى…"
          className="w-full rounded-xl border border-input bg-background px-4 py-3 pr-10 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setCategory("")} className={`px-4 py-1.5 rounded-full text-sm font-readex whitespace-nowrap ${!category ? "bg-burgundy text-white" : "bg-burgundy/10 text-burgundy"}`}>الكل</button>
        {Object.entries(FATWA_CATEGORIES).map(([k, l]) => (
          <button key={k} onClick={() => setCategory(k)} className={`px-4 py-1.5 rounded-full text-sm font-readex whitespace-nowrap ${category === k ? "bg-burgundy text-white" : "bg-burgundy/10 text-burgundy"}`}>{l}</button>
        ))}
      </div>

      {!DEMO && list.isLoading ? <div className="h-28 skeleton rounded-[1.5rem]" /> :
       !rows.length ? <EmptyState title="لا فتاوى منشورة هنا بعد" /> : (
        <div className="space-y-2">
          {rows.map((f) => (
            <GlassCard key={f.answerId} className="p-4" onClick={() => setOpenId(f.answerId)}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-readex bg-gold/15 text-gold-dark dark:text-gold px-2 py-0.5 rounded-full">{f.categoryLabel}</span>
                <span className="text-[10px] text-muted-foreground font-readex inline-flex items-center gap-1"><span className="inline-flex items-center gap-0.5 text-gold-dark dark:text-gold"><Icon name="star" size={10} />{f.avgRating}</span>·<span className="inline-flex items-center gap-0.5"><Icon name="chart" size={10} />{f.views}</span></span>
              </div>
              <p className="font-readex text-sm font-bold line-clamp-2">{f.questionText}</p>
              <p className="font-readex text-xs text-muted-foreground line-clamp-2 mt-1">{f.answerText}</p>
              <div className="text-[11px] text-muted-foreground font-readex mt-1">{f.muftiName ?? "مفتي المنصة"} · {fmtDate(f.createdAt)}</div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal open={!!openId} onClose={() => setOpenId(null)} className="max-w-2xl">
        {!DEMO && detail.isLoading ? <div className="h-40 skeleton rounded-[1.5rem]" /> : det ? (
          <div className="space-y-4">
            <span className="text-[10px] font-readex bg-gold/15 text-gold-dark dark:text-gold px-2 py-0.5 rounded-full">{det.categoryLabel}</span>
            <div className="rounded-xl bg-burgundy/5 dark:bg-white/5 p-4">
              <div className="font-readex text-xs text-muted-foreground mb-1">السؤال:</div>
              <p className="font-readex text-sm leading-relaxed">{det.questionText}</p>
            </div>
            <div className="rounded-xl bg-gold/10 p-4">
              <div className="font-readex text-xs text-gold-dark dark:text-gold mb-1">الجواب — {det.muftiName ?? "مفتي المنصة"}</div>
              <p className="font-readex text-sm leading-relaxed whitespace-pre-line">{det.answerText}</p>
              {det.referenceText && <p className="font-readex text-[11px] text-muted-foreground mt-2 flex items-center gap-1"><Icon name="books" size={11} className="shrink-0" />{det.referenceText}</p>}
            </div>
            <AudioPlayerBar src={det.audioUrl ?? undefined} duration={det.audioDurationSeconds ?? undefined} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
