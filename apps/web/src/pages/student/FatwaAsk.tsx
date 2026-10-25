import { useState } from "react";
import { Link, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import AudioPlayerBar from "@/components/app/AudioPlayerBar";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { FATWA_CATEGORIES, fmtDateTime, hoursSince } from "@/lib/format";
import { authStore } from "@/lib/auth";
import { DEMO_FATWA_DETAILS, DEMO_MY_FATWAS } from "@/lib/demo/student-extra";

const DEMO_TOAST = "وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم";

const CATS = Object.entries(FATWA_CATEGORIES);

export default function FatwaAsk() {
  const DEMO = authStore.isDemo;
  const { id } = useParams();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<"ask" | "mine">(id ? "mine" : "ask");
  const [text, setText] = useState("");
  const [category, setCategory] = useState("fiqh");
  const [imageUrl, setImageUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [rating, setRating] = useState(0);
  const myFatwas = trpc.fatwa.myFatwas.useQuery(undefined, { enabled: !DEMO });
  const detail = trpc.fatwa.detail.useQuery({ questionId: id! }, { enabled: !!id && !DEMO });
  const myRows = DEMO ? DEMO_MY_FATWAS : (myFatwas.data ?? []);
  const ask = trpc.fatwa.ask.useMutation({
    onSuccess: () => {
      toast("أُرسل سؤالك — سيجيبك المفتي بإذن الله", "success");
      setText(""); setImageUrl(""); setAudioUrl(""); setTab("mine");
      utils.fatwa.myFatwas.invalidate();
    },
    onError: (e) => toast(e.message, "error"),
  });
  const rate = trpc.fatwa.rate.useMutation({
    onSuccess: () => { toast("شكراً لتقييمك", "success"); utils.fatwa.detail.invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });

  const d = DEMO ? (id ? (DEMO_FATWA_DETAILS[id] ?? null) : null) : detail.data;

  return (
    <div className="space-y-4 page-enter">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto icon-bubble text-burgundy mb-3">
          <Icon name="scale" size={26} />
        </div>
        <h1
          className="hero-greeting font-amiri text-2xl font-bold"
        >الفتاوى</h1>
        <p className="font-readex text-sm text-muted-foreground">مفتون معتمدون — بإشراف المسؤول</p>
      </div>

      <div className="flex gap-2">
        {([["ask", "اسأل"], ["mine", `فتاواي${myRows.length ? ` (${myRows.length})` : ""}`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 py-2.5 rounded-2xl font-readex text-sm font-bold transition-all ${tab === k ? "bg-burgundy text-white dark:bg-gold dark:text-night shadow-bubble" : "bg-burgundy/8 dark:bg-gold/8 text-burgundy hover:bg-burgundy/15"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "ask" ? (
        <GlassCard className="p-5 space-y-3">
          <label className="font-readex text-sm font-bold block text-foreground">التصنيف</label>
          <div className="flex flex-wrap gap-2">
            {CATS.map(([k, l]) => (
              <button key={k} onClick={() => setCategory(k)}
                className={`px-3 py-1.5 rounded-full text-xs font-readex font-bold transition ${category === k ? "bg-burgundy text-white dark:bg-gold dark:text-night" : "bg-burgundy/8 text-burgundy hover:bg-burgundy/15"}`}>
                {l}
              </button>
            ))}
          </div>
          <label className="font-readex text-sm font-bold block text-foreground">سؤالك <span className="text-muted-foreground font-normal">(10–500 حرف)</span></label>
          <textarea
            value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={500}
            placeholder="اكتب سؤالك بوضوح…"
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none transition"
          />
          <div className="text-left text-[11px] text-muted-foreground font-readex" dir="ltr">{text.length}/500</div>
          <input dir="ltr" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="رابط صورة (اختياري — حتى 5MB)"
            className="w-full rounded-2xl border border-input bg-background px-4 py-2.5 font-readex text-xs focus:outline-none focus:ring-2 focus:ring-gold transition" />
          <input dir="ltr" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="رابط تسجيل صوتي للسؤال (اختياري)"
            className="w-full rounded-2xl border border-input bg-background px-4 py-2.5 font-readex text-xs focus:outline-none focus:ring-2 focus:ring-gold transition" />
          <PrimaryButton className="w-full" disabled={text.trim().length < 10 || ask.isPending}
            onClick={() => {
              if (DEMO) { toast(DEMO_TOAST); return; }
              ask.mutate({ questionText: text.trim(), category: category as never, imageUrl: imageUrl || undefined, audioUrl: audioUrl || undefined });
            }}>
            {ask.isPending ? "جارٍ الإرسال…" : <span className="inline-flex items-center gap-1.5">إرسال السؤال<Icon name="arrow-left" size={16} /></span>}
          </PrimaryButton>
        </GlassCard>
      ) : id && d ? (
        /* Single fatwa detail */
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={d.question.status} />
            <span className="text-[11px] font-readex text-muted-foreground">{d.question.categoryLabel}</span>
          </div>
          <div className="rounded-xl bg-burgundy/5 dark:bg-white/5 p-4">
            <div className="font-readex text-xs text-muted-foreground mb-1">سؤالك:</div>
            <p className="font-readex text-sm leading-relaxed">{d.question.questionText}</p>
          </div>
          {d.answer ? (
            <>
              <div className="rounded-xl bg-gold/10 p-4">
                <div className="font-readex text-xs text-gold-dark dark:text-gold mb-1 flex items-center gap-1">إجابة المفتي<Icon name="check" size={12} /></div>
                <p className="font-readex text-sm leading-relaxed whitespace-pre-line">{d.answer.answerText}</p>
                {d.answer.referenceText && <p className="font-readex text-[11px] text-muted-foreground mt-2 flex items-center gap-1"><Icon name="books" size={11} className="shrink-0" />المرجع: {d.answer.referenceText}</p>}
              </div>
              <AudioPlayerBar src={d.answer.audioUrl ?? undefined} duration={d.answer.audioDurationSeconds ?? undefined} />
              <div className="border-t border-border pt-3">
                <div className="font-readex text-sm font-bold mb-2">قيّم الإجابة:</div>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => { if (DEMO) { setRating(s); return; } setRating(s); rate.mutate({ answerId: d.answer!.id, starRating: s }); }}
                      className={`transition ${((d.myRating as { starRating?: number } | null)?.starRating ?? rating) >= s ? "text-gold" : "text-muted-foreground/30"}`}>
                      <Icon name="star" size={26} />
                    </button>
                  ))}
                </div>
                {d.myRating && <p className="text-center text-[11px] text-muted-foreground font-readex mt-1">تقييمك محفوظ — التقييمات تظهر للإدارة فقط</p>}
              </div>
            </>
          ) : (
            <p className="text-center font-readex text-sm text-muted-foreground py-4 flex items-center justify-center gap-1.5"><Icon name="clock" size={14} className="shrink-0" />لم تُنشر الإجابة بعد — سيصلك إشعار فور الإجابة</p>
          )}
        </GlassCard>
      ) : (
        /* My fatwas list */
        !myRows.length ? <EmptyState title="لا أسئلة بعد" hint="أرسل أول سؤال من تبويب «اسأل»" /> : (
          <div className="space-y-2">
            {myRows.map((q) => (
              <Link key={q.id} to={`/student/fatwa/${q.id}`}>
                <GlassCard className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={q.status} />
                    <span className="text-[10px] font-readex bg-gold/15 text-gold-dark dark:text-gold px-2 py-0.5 rounded-full">{q.categoryLabel}</span>
                  </div>
                  <p className="font-readex text-sm line-clamp-2">{q.questionText}</p>
                  <div className="text-[11px] text-muted-foreground font-readex mt-1">{fmtDateTime(q.createdAt)} · منذ {hoursSince(q.createdAt)} ساعة</div>
                </GlassCard>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}
