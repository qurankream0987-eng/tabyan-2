import { useState } from "react";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Modal from "@/components/Modal";
import PrimaryButton from "@/components/PrimaryButton";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { DAY_AR, fmtDateTime } from "@/lib/format";
import { authStore } from "@/lib/auth";
import { DEMO_BOOKINGS, DEMO_LEVELS, DEMO_SCHEDULES, DEMO_TEACHERS } from "@/lib/demo/admin-core";
import { normalizeDigits } from "@workspace/tabyan-trpc/input-normalization";

const SESSION_TYPES = [
  ["quran_hifz", "حفظ قرآن"], ["quran_review", "مراجعة قرآن"], ["qiraat", "قراءات"],
  ["tajweed_correction", "تصحيح تلاوة"], ["tajweed_level", "تجويد"],
  ["sharia_fiqh", "فقه"], ["sharia_aqeedah", "عقيدة"], ["sharia_seerah", "سيرة"],
] as const;
type SessionType = (typeof SESSION_TYPES)[number][0];
const PROGRAMS = [
  { id: "quran", label: "القرآن الكريم", sessionTypes: ["quran_hifz", "quran_review", "qiraat"], levelPaths: ["quran", "qiraat"] },
  { id: "tajweed", label: "دروس التجويد", sessionTypes: ["tajweed_correction", "tajweed_level"], levelPaths: ["tajweed", "tajweed_correction"] },
  { id: "sharia", label: "الدروس الشرعية", sessionTypes: ["sharia_fiqh", "sharia_aqeedah", "sharia_seerah"], levelPaths: ["sharia"] },
] as const;
const DAYS = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"] as const;

export default function AdminSchedules() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const schedules = trpc.admin.schedulesList.useQuery(undefined, { enabled: !DEMO });
  const bookings = trpc.admin.bookingsList.useQuery(undefined, { enabled: !DEMO });
  const teachers = trpc.admin.teachersList.useQuery(undefined, { enabled: !DEMO });
  const levels = trpc.admin.levelThresholds.useQuery(undefined, { enabled: !DEMO });
  const [open, setOpen] = useState(false);
  const [teacherId, setTeacherId] = useState("");
  const [program, setProgram] = useState<(typeof PROGRAMS)[number]["id"]>("quran");
  const [sessionType, setSessionType] = useState<SessionType>("quran_hifz");
  const [levelId, setLevelId] = useState<number | undefined>();
  const [mode, setMode] = useState<"individual" | "group">("individual");
  const [maxStudents, setMaxStudents] = useState(1);
  const [days, setDays] = useState<(typeof DAYS)[number][]>([]);
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [slotError, setSlotError] = useState("");
  const [duration, setDuration] = useState(30);
  const [del, setDel] = useState<{ kind: "schedule" | "booking"; id: string } | null>(null);

  const scheduleRows: {
    id: string; typeLabel: string; teacherName: string; levelName: string | null;
    sessionMode: string; maxStudents: number; durationMinutes: number;
    availableDays: unknown; availableTimes: unknown;
  }[] = DEMO ? DEMO_SCHEDULES : (schedules.data ?? []);
  const bookingRows: {
    id: string; typeLabel: string; studentName: string | null; teacherName: string;
    scheduledAt: string | Date; status: string;
  }[] = DEMO ? DEMO_BOOKINGS : (bookings.data ?? []);
  const teacherRows: { teacherId: string; name: string; isMufti: boolean }[] =
    DEMO ? DEMO_TEACHERS : (teachers.data ?? []);
  const levelRows: { id: number; name: string; path: string }[] = DEMO ? DEMO_LEVELS : (levels.data ?? []);
  const activeProgram = PROGRAMS.find((p) => p.id === program)!;
  const programSessionTypes = SESSION_TYPES.filter(([k]) => (activeProgram.sessionTypes as readonly string[]).includes(k));
  // «إجازة حفص» لا تُعرض في شاشة اختيار مستوى القرآن الإدارية (طلب صريح — واجهة الإدارة فقط)
  const programLevels = levelRows
    .filter((l) => (activeProgram.levelPaths as readonly string[]).includes(l.path))
    .filter((l) => l.name !== "إجازة حفص");
  const pickProgram = (p: (typeof PROGRAMS)[number]["id"]) => {
    const prog = PROGRAMS.find((x) => x.id === p)!;
    setProgram(p);
    setSessionType(prog.sessionTypes[0] as SessionType);
    setLevelId(undefined);
  };
  const addSlot = () => {
    if (!slotStart || !slotEnd) { setSlotError("حدد وقت البداية والنهاية"); return; }
    if (slotEnd <= slotStart) { setSlotError("وقت النهاية يجب أن يكون بعد البداية"); return; }
    const clash = slots.some((s) => slotStart < s.end && s.start < slotEnd);
    if (clash) { setSlotError("هذا الموعد يتعارض مع موعد موجود"); return; }
    setSlots([...slots, { start: slotStart, end: slotEnd }].sort((a, b) => a.start.localeCompare(b.start)));
    setSlotStart(""); setSlotEnd(""); setSlotError("");
  };
  const schedulesLoading = !DEMO && schedules.isLoading;
  const bookingsLoading = !DEMO && bookings.isLoading;

  const demoBlocked = () => {
    toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info");
    setOpen(false); setDel(null);
  };

  const invalidate = () => { utils.admin.schedulesList.invalidate(); utils.admin.bookingsList.invalidate(); };
  const create = trpc.admin.scheduleCreate.useMutation({
    onSuccess: () => { toast("أُنشئ الجدول — المعلم يراه الآن", "success"); setOpen(false); invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const delSchedule = trpc.admin.scheduleDelete.useMutation({
    onSuccess: () => { toast("حُذف الجدول", "success"); setDel(null); invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const cancelBooking = trpc.admin.bookingCancel.useMutation({
    onSuccess: () => { toast("أُلغي الحجز", "success"); setDel(null); invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });

  const [tab, setTab] = useState<"schedules" | "bookings">("schedules");

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-amiri text-2xl text-burgundy flex items-center gap-2"><Icon name="calendar" size={24} />الجداول والحجوزات</h1>
          <p className="font-readex text-xs text-muted-foreground">القاعدة الذهبية: المشرف فقط ينشئ الجداول</p>
        </div>
        <PrimaryButton onClick={() => setOpen(true)}>+ إنشاء جدول</PrimaryButton>
      </div>

      <div className="flex gap-2">
        {([["schedules", "الجداول الأسبوعية"], ["bookings", "الحجوزات"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2 rounded-xl font-readex text-sm transition ${tab === k ? "bg-burgundy text-white" : "bg-burgundy/10 text-burgundy"}`}>{l}</button>
        ))}
      </div>

      {tab === "schedules" ? (
        schedulesLoading ? <div className="h-40 skeleton rounded-[1.5rem]" /> :
        !scheduleRows.length ? <EmptyState title="لا جداول بعد" hint="أنشئ أول جدول لمعلميك" /> : (
          <div className="grid gap-3 lg:grid-cols-2">
            {scheduleRows.map((s) => (
              <GlassCard key={s.id} className="p-4 flex flex-col gap-2 min-w-0">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="font-readex font-bold truncate">{s.typeLabel} — {s.teacherName}</div>
                    <div className="text-xs text-muted-foreground font-readex mt-1 break-words">
                      {s.levelName ? `المستوى: ${s.levelName} · ` : ""}{s.sessionMode === "group" ? `جماعية (${s.maxStudents})` : "فردية"} · {s.durationMinutes} دقيقة
                    </div>
                    <div className="text-xs font-readex mt-1 break-words">
                      {(s.availableDays as string[]).map((d) => DAY_AR[d]).join("، ")}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-readex break-all" dir="ltr">{(s.availableTimes as string[]).join(" · ")}</div>
                  </div>
                  <button onClick={() => setDel({ kind: "schedule", id: s.id })} className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 shrink-0 flex items-center justify-center text-destructive"><Icon name="trash" size={15} /></button>
                </div>
              </GlassCard>
            ))}
          </div>
        )
      ) : (
        bookingsLoading ? <div className="h-40 skeleton rounded-[1.5rem]" /> :
        !bookingRows.length ? <EmptyState title="لا حجوزات" /> : (
          <GlassCard className="overflow-x-auto p-0">
            <table className="w-full text-sm font-readex">
              <thead>
                <tr className="bg-burgundy/5 dark:bg-white/5 text-burgundy">
                  <th className="p-3 text-right">النوع</th><th className="p-3 text-right">الطالب</th>
                  <th className="p-3 text-right">المعلم</th><th className="p-3 text-right">الموعد</th>
                  <th className="p-3 text-right">الحالة</th><th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {bookingRows.map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="p-3 font-bold">{b.typeLabel}</td>
                    <td className="p-3">{b.studentName}</td>
                    <td className="p-3">{b.teacherName}</td>
                    <td className="p-3 text-xs">{fmtDateTime(b.scheduledAt)}</td>
                    <td className="p-3"><StatusBadge status={b.status} /></td>
                    <td className="p-3">
                      {!["cancelled", "completed"].includes(b.status) && (
                        <button onClick={() => setDel({ kind: "booking", id: b.id })} className="text-xs text-destructive hover:underline">إلغاء</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        )
      )}

      {/* Create schedule modal */}
      <Modal open={open} onClose={() => setOpen(false)} className="max-w-2xl">
        <h3 className="font-amiri text-xl text-burgundy text-center mb-4">إنشاء جدول أسبوعي جديد</h3>
        <div className="space-y-3">
          <div>
            <label className="font-readex text-xs font-bold block mb-1">البرنامج *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PROGRAMS.map((p) => (
                <button key={p.id} onClick={() => pickProgram(p.id)}
                  className={`py-2.5 rounded-xl text-sm font-readex font-bold transition ${program === p.id ? "bg-burgundy text-white" : "bg-burgundy/10 text-burgundy"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="font-readex text-xs font-bold block mb-1">المعلم *</label>
              <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm">
                <option value="">اختر…</option>
                {teacherRows.map((t) => <option key={t.teacherId} value={t.teacherId}>{t.name}{t.isMufti ? " (مفتٍ)" : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="font-readex text-xs font-bold block mb-1">نوع الحصة *</label>
              <select value={sessionType} onChange={(e) => setSessionType(e.target.value as SessionType)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm">
                {programSessionTypes.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="font-readex text-xs font-bold block mb-1">المستوى ({activeProgram.label})</label>
              <select value={levelId ?? ""} onChange={(e) => setLevelId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm">
                <option value="">—</option>
                {programLevels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="font-readex text-xs font-bold block mb-1">النمط</label>
              <div className="flex gap-2">
                {([["individual", "فردية"], ["group", "جماعية"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setMode(k)} className={`flex-1 py-2 rounded-xl text-sm font-readex ${mode === k ? "bg-burgundy text-white" : "bg-burgundy/10 text-burgundy"}`}>{l}</button>
                ))}
              </div>
            </div>
          </div>
          {mode === "group" && (
            <div>
              <label className="font-readex text-xs font-bold block mb-1">أقصى عدد طلاب</label>
              <input type="text" inputMode="numeric" minLength={1} value={maxStudents} onChange={(e) => setMaxStudents(Number(normalizeDigits(e.target.value).replace(/\D/g, "")))} dir="ltr"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm" />
            </div>
          )}
          <div>
            <label className="font-readex text-xs font-bold block mb-1">الأيام المتاحة *</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <button key={d} onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}
                  className={`px-3 py-1.5 rounded-full text-xs font-readex transition ${days.includes(d) ? "bg-burgundy text-white" : "bg-burgundy/10 text-burgundy"}`}>{DAY_AR[d]}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="font-readex text-xs font-bold block mb-1">المواعيد * (بداية — نهاية)</label>
            <div className="admin-slot-row flex gap-2 items-end">
              <div className="flex-1">
                <span className="font-readex text-[10px] text-muted-foreground block mb-0.5">من</span>
                <input type="time" dir="ltr" value={slotStart} onChange={(e) => setSlotStart(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm" />
              </div>
              <div className="flex-1">
                <span className="font-readex text-[10px] text-muted-foreground block mb-0.5">إلى</span>
                <input type="time" dir="ltr" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm" />
              </div>
                <button onClick={addSlot}
                 className="px-4 py-2.5 rounded-xl bg-gold/20 hover:bg-gold/30 text-gold-dark dark:text-gold font-readex text-sm font-bold transition shrink-0">
                + إضافة
              </button>
            </div>
            {slotError && <p className="font-readex text-[11px] text-destructive mt-1">{slotError}</p>}
            {slots.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {slots.map((s, i) => (
                  <span key={i} dir="ltr" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-burgundy/10 text-burgundy font-readex text-xs font-bold">
                    {s.start} - {s.end}
                    <button onClick={() => setSlots(slots.filter((_, j) => j !== i))}
                      className="w-4 h-4 rounded-full bg-destructive/15 text-destructive flex items-center justify-center hover:bg-destructive/30">
                      <Icon name="x" size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="font-readex text-xs font-bold block mb-1">المدة (دقيقة)</label>
            <input type="text" inputMode="numeric" minLength={1} value={duration} onChange={(e) => setDuration(Number(normalizeDigits(e.target.value).replace(/\D/g, "")))} dir="ltr"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-readex text-sm" />
          </div>
          <PrimaryButton className="w-full" disabled={!teacherId || !days.length || !slots.length || create.isPending}
            onClick={() => {
              if (DEMO) { demoBlocked(); return; }
              create.mutate({
                teacherId, sessionType, levelId, sessionMode: mode, maxStudents,
                availableDays: days, availableTimes: slots.map((s) => `${s.start}-${s.end}`),
                durationMinutes: duration,
              });
            }}>
            {create.isPending ? "جارٍ الإنشاء…" : "إنشاء الجدول"}
          </PrimaryButton>
        </div>
      </Modal>

      {/* Delete/cancel confirm */}
      <Modal open={!!del} onClose={() => setDel(null)}>
        {del && (
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center text-destructive"><Icon name="alert-triangle" size={28} /></div>
            <p className="font-readex font-bold">{del.kind === "schedule" ? "حذف هذا الجدول نهائياً؟" : "إلغاء هذا الحجز؟"}</p>
            <div className="flex gap-2">
              <PrimaryButton className="flex-1 bg-destructive"
                onClick={() => {
                  if (DEMO) { demoBlocked(); return; }
                  if (del.kind === "schedule") delSchedule.mutate({ scheduleId: del.id });
                  else cancelBooking.mutate({ id: del.id });
                }}>
                تأكيد
              </PrimaryButton>
              <button onClick={() => setDel(null)} className="flex-1 py-2 rounded-xl bg-muted font-readex text-sm">تراجع</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
