/**
 * واجبات التسميع عند المعلم: إنشاء واجب لطالب، ومتابعة واجباته، ومراجعة
 * التسليمات وتقييمها. أرقام النتيجة يحسبها التطبيق آلياً على جهاز الطالب؛
 * التقييم (الدرجة والملاحظات) يضعه المعلم وحده.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import PrimaryButton from "@/components/PrimaryButton";
import Icon from "@/components/Icon";
import PrivateMediaPlayer from "@/components/app/PrivateMediaPlayer";
import { useToast } from "@/hooks/useToast";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { SURAHS } from "@/lib/quran-data";
import { formatDuration, type HideMode } from "@/lib/recitation-types";
import { loadCanonicalWordsForRange } from "@/lib/recitation-ai/canonicalWords";
import { normalizeDigits } from "@workspace/tabyan-domain/input-normalization";
import {
  ASSIGNMENT_HIDE_MODES,
  ASSIGNMENT_STATUS_LABEL,
  FLAGGED_KIND_LABEL,
  assignmentHideModeLabel,
  assignmentRangeLabel,
  groupFlaggedByAyah,
  type AssignmentStatus,
  type FlaggedWord,
  type FlaggedWordKind,
} from "@/lib/recitation-assignments";

const inputClass = "w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold";
const labelClass = "font-readex text-[11px] text-muted-foreground mb-1 block";

const STATUS_CLASS: Record<AssignmentStatus, string> = {
  assigned: "bg-gold/20 text-gold-dark dark:text-gold",
  submitted: "bg-burgundy/10 text-burgundy dark:bg-white/10",
  reviewed: "bg-green-500/10 text-green-700 dark:text-green-400",
  cancelled: "bg-muted text-muted-foreground",
};

const KIND_CLASS: Record<FlaggedWordKind, string> = {
  mistake: "bg-red-500/10 text-red-700 dark:text-red-400",
  skipped: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  corrected: "bg-gold/15 text-gold-dark dark:text-gold",
  peeked: "bg-muted text-muted-foreground",
};

const AUTO_RESULT_NOTE = "هذه الأرقام يحسبها التطبيق آلياً على جهاز الطالب أثناء التسميع، وقد تخطئ. التقييم قرارك أنت.";

/** رقم من حقل نصي يقبل الأرقام العربية والهندية. */
function parseAyah(raw: string): number | null {
  const digits = normalizeDigits(raw).replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

/** تاريخ التسليم من حقل التاريخ: آخر اليوم بالتوقيت المحلي. */
function dueAtFromInput(value: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// ── ملف الطالب: إنشاء واجب + قائمة واجباته ─────────────────────────────────

export function StudentAssignmentsSection({ studentId }: { studentId: string }) {
  const q = trpc.recitationAssignments.forStudent.useQuery({ studentId });
  const [creating, setCreating] = useState(false);

  if (q.isLoading) return <div className="h-20 skeleton rounded-[1.5rem]" />;
  if (q.isError) return null; // المعلم غير مرتبط بالطالب أو غير معتمد — يُخفى بصمت

  const rows = q.data ?? [];
  const visible = rows.filter((a) => a.status !== "cancelled");

  return (
    <GlassCard className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-amiri text-lg text-burgundy flex items-center gap-2">
          <Icon name="mic" size={18} />
          واجبات التسميع
        </h2>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="font-readex text-xs font-bold text-burgundy dark:text-gold inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-burgundy/5 dark:bg-gold/10 hover:bg-burgundy/10 transition btn-press"
          >
            <Icon name="plus" size={13} />
            واجب جديد
          </button>
        )}
      </div>

      {creating && <CreateAssignmentForm studentId={studentId} onDone={() => setCreating(false)} />}

      {visible.length === 0 ? (
        !creating && <p className="font-readex text-xs text-muted-foreground">لا واجبات تسميع لهذا الطالب بعد</p>
      ) : (
        <div className="space-y-2">
          {visible.map((a) => <AssignmentItem key={a.id} assignment={a} studentId={studentId} />)}
        </div>
      )}
    </GlassCard>
  );
}

function CreateAssignmentForm({ studentId, onDone }: { studentId: string; onDone: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [surahId, setSurahId] = useState(67);
  const [startAyah, setStartAyah] = useState("1");
  const [endAyah, setEndAyah] = useState("10");
  const [hideMode, setHideMode] = useState<HideMode>("progressive_reveal");
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");

  const surah = SURAHS[surahId - 1] ?? SURAHS[0];
  const start = parseAyah(startAyah);
  const end = parseAyah(endAyah);
  const rangeError = !start || !end
    ? "أدخل رقم أول آية وآخر آية"
    : start < 1 || end > surah.ayahs
      ? `السورة ${surah.ayahs} آية فقط`
      : end < start
        ? "آخر آية يجب أن تكون بعد أول آية"
        : null;

  const create = trpc.recitationAssignments.create.useMutation({
    onSuccess: () => {
      toast("أُرسل الواجب للطالب", "success");
      void utils.recitationAssignments.forStudent.invalidate({ studentId });
      onDone();
    },
    onError: (e) => toast(e.message, "error"),
  });

  return (
    <div className="rounded-2xl bg-burgundy/5 dark:bg-white/5 p-3 space-y-3">
      <div>
        <label className={labelClass}>السورة</label>
        <select
          value={surahId}
          onChange={(e) => {
            const next = SURAHS[Number(e.target.value) - 1] ?? SURAHS[0];
            setSurahId(next.n);
            setStartAyah("1");
            setEndAyah(String(Math.min(10, next.ayahs)));
          }}
          className={inputClass}
          dir="rtl"
        >
          {SURAHS.map((s) => (
            <option key={s.n} value={s.n}>{s.n}. {s.name} — {s.ayahs} آية</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>من آية</label>
          <input inputMode="numeric" value={startAyah} onChange={(e) => setStartAyah(e.target.value)} className={`${inputClass} text-center`} />
        </div>
        <div>
          <label className={labelClass}>إلى آية (حتى {surah.ayahs})</label>
          <input inputMode="numeric" value={endAyah} onChange={(e) => setEndAyah(e.target.value)} className={`${inputClass} text-center`} />
        </div>
      </div>
      {rangeError && <p className="font-readex text-[11px] text-destructive">{rangeError}</p>}

      <div>
        <label className={labelClass}>وضع العرض للطالب</label>
        <div className="grid grid-cols-3 gap-1.5">
          {ASSIGNMENT_HIDE_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setHideMode(m.value)}
              className={`py-2 rounded-xl font-readex text-xs font-bold border transition btn-press ${
                hideMode === m.value
                  ? "bg-burgundy text-white dark:bg-gold dark:text-burgundy border-transparent shadow"
                  : "border-border text-muted-foreground hover:border-burgundy/30 dark:hover:border-gold/30"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="font-readex text-[10.5px] text-muted-foreground mt-1">
          {ASSIGNMENT_HIDE_MODES.find((m) => m.value === hideMode)?.hint}
        </p>
      </div>

      <div>
        <label className={labelClass}>ملاحظة للطالب (اختياري)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500}
          placeholder="مثال: ركّز على أحكام المد"
          className={`${inputClass} resize-none`} />
      </div>

      <div>
        <label className={labelClass}>موعد التسليم (اختياري)</label>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={inputClass} />
      </div>

      <div className="flex gap-2">
        <PrimaryButton
          className="flex-1"
          loading={create.isPending}
          disabled={!!rangeError}
          onClick={() => {
            if (rangeError || !start || !end) return;
            create.mutate({
              studentId,
              surahId,
              startAyah: start,
              endAyah: end,
              hideMode,
              note: note.trim() || undefined,
              dueAt: dueAtFromInput(due),
            });
          }}
        >
          <span className="inline-flex items-center gap-2"><Icon name="send" size={15} />إرسال الواجب</span>
        </PrimaryButton>
        <button
          type="button"
          onClick={onDone}
          className="px-4 rounded-xl bg-burgundy/10 dark:bg-white/10 text-burgundy font-readex font-bold text-sm btn-press transition"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}

type TrpcUtils = ReturnType<typeof trpc.useUtils>;
type AssignmentRow = NonNullable<ReturnType<TrpcUtils["recitationAssignments"]["forStudent"]["getData"]>>[number];

function AssignmentItem({ assignment: a, studentId }: { assignment: AssignmentRow; studentId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(a.status === "submitted");
  const [confirmCancel, setConfirmCancel] = useState(false);

  const refresh = () => {
    void utils.recitationAssignments.forStudent.invalidate({ studentId });
    void utils.recitationAssignments.reviewQueue.invalidate();
  };
  const cancel = trpc.recitationAssignments.cancel.useMutation({
    onSuccess: () => { toast("أُلغي الواجب", "success"); refresh(); },
    onError: (e) => toast(e.message, "error"),
  });

  return (
    <div className="rounded-xl bg-burgundy/5 dark:bg-white/5 px-3 py-2.5">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full text-right">
        <div className="flex justify-between items-start gap-2">
          <span className="font-amiri text-sm text-burgundy font-bold">{assignmentRangeLabel(a)}</span>
          <span className={`font-readex text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_CLASS[a.status]}`}>
            {ASSIGNMENT_STATUS_LABEL[a.status]}{a.status === "reviewed" && a.teacherScore != null ? ` · ${a.teacherScore}/100` : ""}
          </span>
        </div>
        <div className="font-readex text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
          <span>{assignmentHideModeLabel(a.hideMode)}</span>
          {a.dueAt && <span>التسليم قبل {fmtDate(a.dueAt)}</span>}
          {a.submittedAt && <span>سُلِّم {fmtDateTime(a.submittedAt)}</span>}
        </div>
      </button>

      {open && (
        <div className="mt-2.5 space-y-3">
          {a.note && (
            <p className="font-readex text-xs text-foreground flex items-start gap-1.5">
              <Icon name="edit" size={12} className="shrink-0 mt-0.5 text-muted-foreground" />
              {a.note}
            </p>
          )}

          {a.result ? (
            <AssignmentResultView assignment={a} />
          ) : (
            <p className="font-readex text-[11px] text-muted-foreground">لم يسلّم الطالب هذا الواجب بعد</p>
          )}

          {(a.status === "submitted" || a.status === "reviewed") && (
            <ReviewForm assignment={a} onReviewed={refresh} />
          )}

          {a.status !== "reviewed" && (
            confirmCancel ? (
              <div className="flex items-center gap-2">
                <span className="font-readex text-xs text-foreground flex-1">إلغاء هذا الواجب؟</span>
                <button
                  type="button"
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate({ assignmentId: a.id })}
                  className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive font-readex text-xs font-bold btn-press"
                >
                  {cancel.isPending ? "جارٍ الإلغاء…" : "نعم، ألغِه"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  className="px-3 py-1.5 rounded-lg bg-burgundy/10 dark:bg-white/10 text-burgundy font-readex text-xs font-bold btn-press"
                >
                  تراجع
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="font-readex text-[11px] text-muted-foreground hover:text-destructive transition inline-flex items-center gap-1"
              >
                <Icon name="x-circle" size={12} />
                إلغاء الواجب
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

function AssignmentResultView({ assignment: a }: { assignment: AssignmentRow }) {
  const result = a.result!;
  const tiles: { label: string; value: string; tone?: "error" }[] = [
    { label: "الكلمات المسمَّعة", value: `${result.wordsRecited}/${result.totalWords}` },
    { label: "أخطاء", value: String(result.confirmedMistakes), tone: result.confirmedMistakes ? "error" : undefined },
    { label: "تخطٍّ", value: String(result.skippedWords), tone: result.skippedWords ? "error" : undefined },
    { label: "صحّحها بنفسه", value: String(result.correctedWords) },
    { label: "تلميحات", value: String(result.peekedWords) },
    { label: "المدة", value: formatDuration(result.durationSeconds) },
  ];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg bg-background/70 dark:bg-white/5 border border-border/60 px-1.5 py-2 text-center">
            <div className={`font-readex text-base font-bold tabular-nums ${t.tone === "error" ? "text-destructive" : "text-foreground"}`} dir="ltr">{t.value}</div>
            <div className="font-readex text-[10px] text-muted-foreground mt-0.5">{t.label}</div>
          </div>
        ))}
      </div>
      <p className="font-readex text-[10.5px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
        <Icon name="info" size={12} className="shrink-0 mt-0.5" />
        {AUTO_RESULT_NOTE}
      </p>
      <FlaggedWordsList assignment={a} flagged={result.flaggedWords} />
      {a.audioPath && (
        <div className="space-y-1">
          <p className="font-readex text-[11px] font-bold text-foreground">تسجيل التسميع</p>
          <PrivateMediaPlayer source={a.audioPath} kind="audio" />
        </div>
      )}
    </div>
  );
}

/** الكلمات التي علّمها المحرك، مجمّعة حسب الآية، مع نص الكلمة من corpus المصحف إن تيسّر. */
function FlaggedWordsList({ assignment: a, flagged }: { assignment: AssignmentRow; flagged: FlaggedWord[] }) {
  const groups = useMemo(() => groupFlaggedByAyah(flagged), [flagged]);
  const words = useQuery({
    queryKey: ["assignment-canonical-words", a.surahId, a.startAyah, a.endAyah],
    queryFn: () => loadCanonicalWordsForRange({ surahId: a.surahId, surahName: "", startAyah: a.startAyah, endAyah: a.endAyah }),
    enabled: groups.length > 0,
    staleTime: Infinity,
    retry: 1,
  });
  const textByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of words.data ?? []) map.set(`${w.verseKey}:${w.position}`, w.displayText);
    return map;
  }, [words.data]);

  if (groups.length === 0) {
    return <p className="font-readex text-[11px] text-muted-foreground">لم يعلّم التطبيق أي كلمة في هذا التسليم</p>;
  }
  return (
    <div className="space-y-1.5">
      <h3 className="font-readex text-xs font-bold text-foreground">مواضع علّمها التطبيق</h3>
      {groups.map((g) => (
        <div key={g.verseKey} className="rounded-lg bg-background/70 dark:bg-white/5 border border-border/60 px-2.5 py-2">
          <div className="font-readex text-[11px] font-bold text-muted-foreground mb-1">
            الآية {g.ayah} <span className="font-normal" dir="ltr">({g.verseKey})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {g.words.map((w) => {
              const text = textByKey.get(`${g.verseKey}:${w.position}`);
              return (
                <span key={w.position} className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ${KIND_CLASS[w.kind]}`}>
                  {text && <span className="font-amiri text-sm leading-none">{text}</span>}
                  <span className="font-readex text-[10px]">
                    {FLAGGED_KIND_LABEL[w.kind]} · الكلمة {w.position}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewForm({ assignment: a, onReviewed }: { assignment: AssignmentRow; onReviewed: () => void }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(a.status === "submitted");
  const [score, setScore] = useState(a.teacherScore != null ? String(a.teacherScore) : "");
  const [feedback, setFeedback] = useState(a.teacherFeedback ?? "");
  const review = trpc.recitationAssignments.review.useMutation({
    onSuccess: () => { toast("أُرسل تقييمك للطالب", "success"); setEditing(false); onReviewed(); },
    onError: (e) => toast(e.message, "error"),
  });

  const digits = normalizeDigits(score).replace(/\D/g, "");
  const value = digits ? Number(digits) : null;
  const valid = value !== null && value >= 0 && value <= 100;

  if (!editing) {
    return (
      <div className="rounded-lg border border-green-500/25 bg-green-500/5 px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="font-readex text-xs font-bold">تقييمك</span>
          <span className="font-amiri text-lg font-bold text-burgundy" dir="ltr">{a.teacherScore ?? "—"}/100</span>
        </div>
        {a.teacherFeedback && <p className="font-readex text-xs mt-1 leading-relaxed">{a.teacherFeedback}</p>}
        <button type="button" onClick={() => setEditing(true)} className="font-readex text-[11px] text-burgundy dark:text-gold font-bold mt-1.5">
          تعديل التقييم
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2.5 space-y-2">
      <div className="font-readex text-xs font-bold text-foreground">تقييمك للتسميع</div>
      <div className="flex items-center gap-2">
        <input
          inputMode="numeric"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="0–100"
          aria-label="الدرجة من 100"
          className={`${inputClass} w-24 text-center`}
        />
        <span className="font-readex text-xs text-muted-foreground">/ 100</span>
      </div>
      {score && !valid && <p className="font-readex text-[11px] text-destructive">الدرجة من 0 إلى 100</p>}
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="ملاحظاتك للطالب (اختياري)"
        className={`${inputClass} resize-none`}
      />
      <div className="flex gap-2">
        <PrimaryButton
          className="flex-1 py-2.5"
          loading={review.isPending}
          disabled={!valid}
          onClick={() => valid && review.mutate({ assignmentId: a.id, score: value!, feedback: feedback.trim() || undefined })}
        >
          حفظ التقييم
        </PrimaryButton>
        {a.status === "reviewed" && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-4 rounded-xl bg-burgundy/10 dark:bg-white/10 text-burgundy font-readex font-bold text-sm btn-press transition"
          >
            إلغاء
          </button>
        )}
      </div>
    </div>
  );
}

// ── لوحة المعلم: تسميعات بانتظار المراجعة ──────────────────────────────────

export function ReviewQueueSection() {
  const q = trpc.recitationAssignments.reviewQueue.useQuery();
  if (q.isLoading || q.isError) return null; // غير معتمد بعد أو تعذّر التحميل — لا نزاحم اللوحة
  const rows = q.data ?? [];

  return (
    <section>
      <h2 className="font-amiri text-xl text-burgundy mb-3 font-bold">تسميعات بانتظار المراجعة</h2>
      {rows.length === 0 ? (
        <GlassCard hover={false} className="p-4 text-center font-readex text-xs text-muted-foreground">
          لا تسميعات بانتظار مراجعتك
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {rows.map(({ assignment: a, studentName }) => (
            <Link key={a.id} to={`/teacher/students/${a.studentId}`} className="block">
              <GlassCard hover className="px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 icon-bubble text-burgundy shrink-0">
                  <Icon name="mic" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-readex text-sm font-bold text-foreground truncate">{studentName}</div>
                  <div className="font-readex text-[11px] text-muted-foreground truncate">
                    {assignmentRangeLabel(a)}{a.submittedAt ? ` · ${fmtDateTime(a.submittedAt)}` : ""}
                  </div>
                </div>
                <Icon name="arrow-left" size={16} className="text-muted-foreground shrink-0" />
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
