import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { useToast } from "@/hooks/useToast";
import GlassCard from "@/components/app/GlassCard";
import EmptyState from "@/components/app/EmptyState";
import Modal from "@/components/app/Modal";
import PrimaryButton from "@/components/app/PrimaryButton";
import SecondaryButton from "@/components/app/SecondaryButton";
import Icon from "@/components/app/Icon";
import { objectUrl } from "@/lib/upload";
import { authStore } from "@/lib/auth";
import { parseLessonSections, type LessonSection } from "@/lib/shariaMeta";
import { demoShariaContent } from "@/lib/demo/sharia-demo";
import { CONTENT_TYPE_META } from "./ShariaLevel";
import { ShariaProgressBar } from "./ShariaSubjects";

const SPEEDS = [0.5, 0.75, 1, 1.5, 2];
const DEMO_TOAST = "وضع العرض التجريبي — حفظ التقدم يتطلب حساباً";

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** يعيد رابط عرض قابل للتشغيل: ملفات التخزين المحمية تمر عبر objectUrl مع التوكن */
function resolveUrl(u: string | null | undefined): string {
  if (!u) return "";
  return u.startsWith("/objects/ ") ? objectUrl(u) : u;
}

type ContentResp = {
  content: {
    id: string; title: string; author?: string | null; description?: string | null;
    contentType: string; fileUrl?: string | null; externalUrl?: string | null;
    textBody?: string | null; durationMinutes?: number | null; pageCount?: number | null;
  };
  level?: { id: number | string; name: string; subject?: string; subjectName?: string; order?: number } | null;
  prev?: { id: string; title: string } | null;
  next?: { id: string; title: string } | null;
  progressPercentage: number;
  lastPosition?: string | null;
  status: string;
  bookmarked: boolean;
};

function GoldBullet() {
  return <span className="mt-[9px] shrink-0 inline-block w-1.5 h-1.5 rotate-45 bg-gold rounded-[1px]" />;
}

function BulletList({ lines }: { lines: string[] }) {
  return (
    <ul className="space-y-2.5">
      {lines.map((l, i) => (
        <li key={i} className="font-readex text-sm text-foreground flex items-start gap-2.5 leading-relaxed"><GoldBullet />{l}</li>
      ))}
    </ul>
  );
}

/** بطاقة قسم من الدرس بحسب نوعه: أهداف / محتوى / ملاحظات / خلاصة */
function SectionCard({ section }: { section: LessonSection }) {
  const bullets = section.lines.filter((l) => l.startsWith("•")).map((l) => l.replace(/^•\s*/, ""));
  const paragraphs = section.lines.filter((l) => !l.startsWith("•"));

  if (section.title === "أهداف الدرس") {
    return (
      <GlassCard className="p-5 rounded-3xl border border-gold/40" hover={false}>
        <div className="font-readex text-sm font-extrabold text-gold-dark dark:text-gold mb-3 flex items-center gap-2"><Icon name="star" size={16} />{section.title}</div>
        <BulletList lines={bullets.length ? bullets : section.lines} />
      </GlassCard>
    );
  }
  if (section.title === "ملاحظات مهمة") {
    return (
      <GlassCard className="p-5 rounded-3xl bg-burgundy/5 dark:bg-gold/5" hover={false}>
        <div className="font-readex text-sm font-extrabold text-burgundy mb-3 flex items-center gap-2"><Icon name="info" size={16} />{section.title}</div>
        <BulletList lines={bullets.length ? bullets : section.lines} />
      </GlassCard>
    );
  }
  if (section.title === "خلاصة الدرس") {
    return (
      <GlassCard className="relative overflow-hidden border-none p-0" hover={false}>
        <div className="absolute inset-0 rounded-[1.5rem]" style={{ background: "linear-gradient(135deg, #800020 0%, #A02040 60%, #5F1530 100%)" }} />
        <div className="absolute inset-0 opacity-20 rounded-[1.5rem]" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,175,55,0.55) 0%, transparent 70%)" }} />
        <div className="relative z-10 p-5">
          <div className="font-readex text-sm font-extrabold text-gold mb-2 flex items-center gap-2"><Icon name="graduation" size={16} />{section.title}</div>
          {section.lines.map((l, i) => (
            <p key={i} className="font-readex text-base text-white leading-loose">{l}</p>
          ))}
        </div>
      </GlassCard>
    );
  }
  // القسم الرئيسي «الدرس» أو أي قسم آخر
  return (
    <GlassCard className="p-6 rounded-3xl" hover={false}>
      {section.title !== "الدرس" && (
        <div className="font-readex text-sm font-extrabold text-burgundy mb-3 flex items-center gap-2"><Icon name="books" size={16} />{section.title}</div>
      )}
      <article className="space-y-4">
        {paragraphs.map((l, i) => (
          <p key={i} className="text-lg leading-loose text-foreground">{l}</p>
        ))}
        {bullets.length > 0 && <BulletList lines={bullets} />}
      </article>
    </GlassCard>
  );
}

export default function ShariaViewer() {
  const { contentId = "" } = useParams();
  const nav = useNavigate();
  const { toast } = useToast();
  const DEMO = authStore.isDemo;
  const utils = trpc.useUtils();
  const q = trpc.sharia.content.useQuery({ contentId }, { enabled: !DEMO });
  const [linkConfirm, setLinkConfirm] = useState(false);

  const progressMut = trpc.sharia.updateContentProgress.useMutation();
  const bookmarkMut = trpc.sharia.toggleBookmark.useMutation({
    onSuccess: () => { if (!DEMO) utils.sharia.content.invalidate({ contentId }); },
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSaveRef = useRef(0);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const data = (DEMO ? demoShariaContent(contentId) : q.data) as ContentResp | null | undefined;
  const c = data?.content;

  const saveProgress = (pct: number, pos?: string) => {
    if (DEMO) { toast(DEMO_TOAST); return; }
    progressMut.mutate({ contentId, progressPercentage: Math.round(pct), lastPosition: pos });
  };
  const onToggleBookmark = () => {
    if (DEMO) { toast(DEMO_TOAST); return; }
    bookmarkMut.mutate({ contentId });
  };

  // حفظ التقدم كل ~10 ثوانٍ أثناء التشغيل
  const onMediaTime = (el: HTMLAudioElement | HTMLVideoElement) => {
    setCurTime(el.currentTime);
    if (el.duration) setDuration(el.duration);
    const now = Date.now();
    if (!DEMO && el.duration && now - lastSaveRef.current > 10_000) {
      lastSaveRef.current = now;
      const pct = Math.min(100, (el.currentTime / el.duration) * 100);
      progressMut.mutate({ contentId, progressPercentage: Math.round(pct), lastPosition: String(Math.floor(el.currentTime)) });
    }
  };
  const onMediaEnded = () => { setPlaying(false); saveProgress(100); };

  // استئناف من آخر موضع
  const onMediaLoaded = (el: HTMLAudioElement | HTMLVideoElement) => {
    setDuration(el.duration || 0);
    const pos = Number(data?.lastPosition ?? 0);
    if (pos > 0 && pos < (el.duration || Infinity)) el.currentTime = pos;
  };

  useEffect(() => {
    const el = audioRef.current;
    if (el) el.playbackRate = speed;
    const v = videoRef.current;
    if (v) v.playbackRate = speed;
  }, [speed, c?.id]);

  if (!DEMO && q.isLoading) {
    return <div className="space-y-3"><div className="h-16 skeleton rounded-[1.75rem]" /><div className="h-72 skeleton rounded-[1.75rem]" /></div>;
  }
  if (!c || !data) return <EmptyState title="المحتوى غير موجود" />;

  const tm = CONTENT_TYPE_META[c.contentType] ?? CONTENT_TYPE_META.text;
  const bookmarked = data.bookmarked;
  const level = data.level;
  const mediaUrl = resolveUrl(c.fileUrl) || resolveUrl(c.externalUrl);
  const sections = c.contentType === "text" && c.textBody ? parseLessonSections(c.textBody) : [];

  const openExternal = () => {
    setLinkConfirm(false);
    window.open(c.externalUrl ?? c.fileUrl ?? "", "_blank", "noopener,noreferrer");
    saveProgress(100);
  };

  return (
    <div className="space-y-4 page-enter max-w-2xl mx-auto">
      {level && (
        <Link to={`/student/sharia/level/${level.id}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-burgundy hover:underline">
          <span className="inline-block rotate-180"><Icon name="arrow-left" size={14} /></span>
          {level.subjectName} — {level.name}
        </Link>
      )}

      {/* ── ترويسة الدرس ── */}
      <GlassCard className="p-5 rounded-3xl" hover={false}>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-burgundy/10 dark:bg-gold/10 text-burgundy flex items-center justify-center shrink-0">
            <Icon name={tm.icon} size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg text-burgundy leading-snug">{c.title}</h1>
            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{tm.label}</span>
              {c.author && <span>· {c.author}</span>}
              {c.durationMinutes != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-burgundy/8 dark:bg-gold/12 text-burgundy px-2 py-px text-[10px] font-extrabold">
                  {c.durationMinutes} د
                </span>
              )}
              {c.pageCount != null && <span>· {c.pageCount} صفحة</span>}
              {c.contentType === "text" && c.pageCount != null && (
                <span className="inline-flex items-center gap-1"><Icon name="clock" size={11} /> نحو {c.pageCount * 2} دقائق قراءة</span>
              )}
            </div>
          </div>
          <button
            onClick={onToggleBookmark}
            aria-label="حفظ" className={`w-10 h-10 rounded-full flex items-center justify-center transition active:scale-90 ${bookmarked ? "bg-gold text-burgundy-dark" : "bg-burgundy/10 text-burgundy hover:bg-burgundy/20"}`}
          >
            <Icon name="star" size={18} className={bookmarked ? "fill-current" : ""} />
          </button>
        </div>
        {data.progressPercentage > 0 && data.status !== "completed" && (
          <div className="mt-4">
            <ShariaProgressBar pct={data.progressPercentage} />
            <div className="text-xs text-muted-foreground mt-1 text-left">{data.progressPercentage}%</div>
          </div>
        )}
      </GlassCard>

      {level && typeof level.id === "number" && (
        <GlassCard className="p-4 rounded-3xl border border-gold/30" hover={false}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gold/15 text-gold-dark dark:text-gold flex items-center justify-center shrink-0">
              <Icon name="edit" size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-readex text-sm font-extrabold text-burgundy">جاهز لاختبار المستوى؟</div>
              <div className="font-readex text-xs text-muted-foreground mt-1">اختبر فهمك بعد دراسة هذا الدرس</div>
            </div>
            <PrimaryButton onClick={() => nav(`/student/sharia/exam/${level.id}`)}>
              اختبار المستوى
            </PrimaryButton>
          </div>
        </GlassCard>
      )}

      {/* ── نص مقسّم: أهداف ← الدرس ← ملاحظات ← خلاصة ── */}
      {c.contentType === "text" && (
        sections.length ? (
          <div className="space-y-4">
            {sections.map((s, i) => <SectionCard key={`${s.title}-${i}`} section={s} />)}
          </div>
        ) : (
          <GlassCard className="p-6 rounded-3xl" hover={false}>
            <EmptyState title="لا يوجد نص بعد" />
          </GlassCard>
        )
      )}

      {/* ── PDF ── */}
      {c.contentType === "pdf" && (
        <GlassCard className="p-4 rounded-3xl" hover={false}>
          <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
            <Icon name="file-text" size={14} />
            يمكنك التنقل بين الصفحات من شريط أدوات العارض أدناه
          </div>
          {mediaUrl ? (
            <iframe src={mediaUrl} title={c.title} className="w-full h-[70vh] rounded-2xl border border-burgundy/10 bg-white" />
          ) : (
            <EmptyState title="لا يوجد ملف مرفق بعد" />
          )}
        </GlassCard>
      )}

      {/* ── صوت ── */}
      {c.contentType === "audio" && (
        <GlassCard className="p-6 rounded-3xl" hover={false}>
          {mediaUrl ? (
            <div className="space-y-4">
              <audio
                ref={audioRef}
                src={mediaUrl}
                preload="metadata"
                onTimeUpdate={(e) => onMediaTime(e.currentTarget)}
                onLoadedMetadata={(e) => onMediaLoaded(e.currentTarget)}
                onEnded={onMediaEnded}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const el = audioRef.current;
                    if (!el) return;
                    if (el.paused) void el.play(); else el.pause();
                  }} className="w-14 h-14 rounded-full bg-burgundy text-white flex items-center justify-center hover:bg-burgundy-light transition active:scale-95 shrink-0"
                  aria-label={playing ? "إيقاف" : "تشغيل"}
                >
                  {playing ? (
                    <span className="flex gap-1"><span className="w-1.5 h-5 bg-white rounded-full" /><span className="w-1.5 h-5 bg-white rounded-full" /></span>
                  ) : (
                    <Icon name="play" size={22} className="fill-current -mr-0.5" />
                  )}
                </button>
                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={curTime} onChange={(e) => {
                      const el = audioRef.current;
                      const v = Number(e.target.value);
                      if (el) el.currentTime = v;
                      setCurTime(v);
                    }} className="w-full accent-gold"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{fmtTime(curTime)}</span>
                    <span>{fmtTime(duration)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {SPEEDS.map((s) => (
                  <button
                    key={s} onClick={() => setSpeed(s)} className={`text-xs font-bold rounded-full px-3.5 py-1.5 transition active:scale-95 ${speed === s ? "bg-gold text-burgundy-dark" : "bg-burgundy/10 text-burgundy hover:bg-burgundy/20"}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="لا يوجد ملف صوتي بعد" />
          )}
        </GlassCard>
      )}

      {/* ── فيديو ── */}
      {c.contentType === "video" && (
        <GlassCard className="p-4 rounded-3xl" hover={false}>
          {mediaUrl ? (
            <>
              <video
                ref={videoRef}
                src={mediaUrl}
                controls
                playsInline
                className="w-full rounded-2xl bg-black"
                onTimeUpdate={(e) => onMediaTime(e.currentTarget)}
                onLoadedMetadata={(e) => onMediaLoaded(e.currentTarget)}
                onEnded={onMediaEnded}
              />
              <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                {SPEEDS.map((s) => (
                  <button
                    key={s} onClick={() => setSpeed(s)} className={`text-xs font-bold rounded-full px-3.5 py-1.5 transition active:scale-95 ${speed === s ? "bg-gold text-burgundy-dark" : "bg-burgundy/10 text-burgundy hover:bg-burgundy/20"}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="لا يوجد ملف مرئي بعد" />
          )}
        </GlassCard>
      )}

      {/* ── رابط خارجي ── */}
      {c.contentType === "link" && (
        <GlassCard className="p-6 rounded-3xl text-center" hover={false}>
          <div className="flex justify-center text-burgundy mb-3"><Icon name="link" size={36} /></div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            هذا المحتوى متاح على موقع خارجي. سيُفتح الرابط في نافذة جديدة.
          </p>
          {c.externalUrl && (
            <p className="text-xs text-muted-foreground mt-2 break-all" dir="ltr">{c.externalUrl}</p>
          )}
          <PrimaryButton className="mt-4" onClick={() => setLinkConfirm(true)}>
            فتح الرابط
          </PrimaryButton>
        </GlassCard>
      )}

      {/* وضع علامة مكتمل للأنواع المقروءة */}
      {(c.contentType === "pdf" || c.contentType === "text") && data.status !== "completed" && (
        <div className="text-center">
          <PrimaryButton onClick={() => saveProgress(100)} disabled={progressMut.isPending}>
            أنهيت القراءة — وضع علامة مكتمل
          </PrimaryButton>
        </div>
      )}

      {/* ── الدرس السابق / التالي ── */}
      {(data.prev || data.next) && (
        <div className="grid grid-cols-2 gap-3">
          {data.prev ? (
            <Link to={`/student/sharia/content/${data.prev.id}`} className="block">
              <GlassCard className="p-3.5 rounded-2xl btn-press h-full">
                <div className="font-readex text-[10px] font-bold text-muted-foreground mb-1 inline-flex items-center gap-1">
                  <span className="inline-block rotate-180"><Icon name="arrow-left" size={11} /></span> الدرس السابق
                </div>
                <div className="font-readex text-xs font-bold text-foreground leading-snug line-clamp-2">{data.prev.title}</div>
              </GlassCard>
            </Link>
          ) : <div />}
          {data.next ? (
            <Link to={`/student/sharia/content/${data.next.id}`} className="block">
              <GlassCard className="p-3.5 rounded-2xl btn-press h-full">
                <div className="font-readex text-[10px] font-bold text-gold-dark dark:text-gold mb-1 flex items-center gap-1 justify-end">
                  الدرس التالي <Icon name="arrow-left" size={11} />
                </div>
                <div className="font-readex text-xs font-bold text-foreground leading-snug line-clamp-2 text-left">{data.next.title}</div>
              </GlassCard>
            </Link>
          ) : <div />}
        </div>
      )}

      {level && (
        <Link
          to={typeof level.id === "number" ? `/student/booking?levelId=${level.id}&path=sharia` : "/student/booking?path=sharia"} className="block text-center text-sm font-bold text-gold-dark dark:text-gold hover:underline"
        >
          الشيوخ المتاحون الآن — احجز حلقتك
        </Link>
      )}

      <Modal open={linkConfirm} onClose={() => setLinkConfirm(false)}>
        <div className="text-center space-y-4 pt-2">
          <div className="flex justify-center text-burgundy"><Icon name="link" size={40} /></div>
          <h3 className="text-xl font-extrabold text-burgundy">فتح رابط خارجي</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            أنت على وشك مغادرة المنصة وفتح موقع خارجي في نافذة جديدة. هل تريد المتابعة؟
          </p>
          <div className="flex gap-3 justify-center">
            <PrimaryButton onClick={openExternal}>متابعة</PrimaryButton>
            <SecondaryButton onClick={() => setLinkConfirm(false)}>إلغاء</SecondaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
