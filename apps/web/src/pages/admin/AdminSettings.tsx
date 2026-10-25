import { useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import { AdminErrorState } from "@/components/admin/AdminUi";
import { AdminModal, ConfirmDialog, FormActions, useDirtyState } from "@/components/admin/AdminUi";
import PrimaryButton from "@/components/PrimaryButton";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { authStore } from "@/lib/auth";
import { userFacingErrorMessage } from "@/lib/user-facing-error";
import { api } from "@/lib/api";
import { logoutWebSession } from "@/lib/web-session";
import { DEMO_SETTINGS } from "@/lib/demo/admin-ops";
import { isNonWhitespacePassword } from "@workspace/tabyan-domain/password-validation";
import { normalizeDigits } from "@workspace/tabyan-domain/input-normalization";

const EDITABLE_KEYS = [
  "login_max_attempts", "login_block_duration_hours", "placement_video_duration_seconds",
  "placement_review_deadline_hours", "promotion_video_duration_seconds", "fatwa_reassign_hours",
  "notif_ayah_time", "notif_hadith_time", "notif_ibn_qayyim_time", "notif_review_reminder_time",
];

export default function AdminSettings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const DEMO = authStore.isDemo;
  const blocked = () => toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info");
  const settings = trpc.admin.settingsGet.useQuery(undefined, { enabled: !DEMO });
  const settingsData = DEMO ? DEMO_SETTINGS : (settings.data ?? []);
  const settingsLoading = !DEMO && settings.isLoading;
  const [editKey, setEditKey] = useState<{ key: string; value: string; description: string | null } | null>(null);
  const [newValue, setNewValue] = useState("");
  const [pwOpen, setPwOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState(false);
  const valueDirty = useDirtyState(editKey ? newValue : null);
  const pwDirty = useDirtyState(pwOpen ? { current, newPw } : null);
  const closePw = () => { setPwOpen(false); setCurrent(""); setNewPw(""); };

  const update = trpc.admin.settingsUpdate.useMutation({
    onSuccess: () => { toast("حُفظ الإعداد", "success"); setEditKey(null); utils.admin.settingsGet.invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر حفظ الإعداد، حاول مرة أخرى."), "error"),
  });
  const changePw = trpc.admin.settingsChangeMasterPassword.useMutation({
    onSuccess: async () => {
      toast("غُيّرت كلمة المرور الرئيسية — سُجّل خروج كل المشرفين", "success");
      await logoutWebSession(); navigate("/", { replace: true });
    },
    onError: (e) => { setConfirmPw(false); toast(userFacingErrorMessage(e, "تعذر تغيير كلمة المرور، حاول مرة أخرى."), "error"); },
  });

  // ── آية اليوم ──────────────────────────────────────────────────────────────
  const [surahNo, setSurahNo] = useState("");
  const [ayahNo, setAyahNo] = useState("");
  const todayVerse = trpc.dailyVerse.today.useQuery(undefined, { enabled: !DEMO });
  const versePreview = trpc.dailyVerse.preview.useQuery(
    { surahNumber: Number(surahNo), ayahNumber: Number(ayahNo) },
    { enabled: !DEMO && Number(surahNo) >= 1 && Number(surahNo) <= 114 && Number(ayahNo) >= 1, retry: 0 },
  );
  const setVerse = trpc.dailyVerse.set.useMutation({
    onSuccess: () => { toast("اعتُمدت آية اليوم", "success"); setSurahNo(""); setAyahNo(""); utils.dailyVerse.today.invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر اعتماد آية اليوم، حاول مرة أخرى."), "error"),
  });
  const clearVerse = trpc.dailyVerse.clear.useMutation({
    onSuccess: () => { toast("أُلغي التخصيص — ستُختار الآية تلقائياً", "success"); utils.dailyVerse.today.invalidate(); },
    onError: (e) => toast(userFacingErrorMessage(e, "تعذر إلغاء تخصيص الآية، حاول مرة أخرى."), "error"),
  });

  const rows = settingsData.filter((s) => EDITABLE_KEYS.includes(s.key));

  return (
    <div className="space-y-4 page-enter">
      <h1 className="font-amiri text-2xl text-burgundy flex items-center gap-2"><Icon name="settings" size={24} />إعدادات النظام</h1>

      <GlassCard className="p-5">
        <h2 className="font-amiri text-lg text-burgundy mb-2">القواعد التشغيلية</h2>
        <div className="space-y-1">
          {!DEMO && settings.isError ? <AdminErrorState onRetry={() => void settings.refetch()} /> : settingsLoading ? <div className="h-40 skeleton rounded-[1.5rem]" /> : rows.map((s) => (
            <button key={s.key} onClick={() => { setEditKey(s); setNewValue(s.value); }}
              className="w-full flex items-center gap-3 rounded-xl bg-burgundy/5 dark:bg-white/5 px-4 py-3 hover:bg-burgundy/10 transition text-right">
              <div className="flex-1 min-w-0">
                <div className="font-readex text-sm font-bold break-all" dir="ltr">{s.key}</div>
                {s.description && <div className="font-readex text-[11px] text-muted-foreground">{s.description}</div>}
              </div>
              <span className="font-amiri text-burgundy" dir="ltr">{s.key === "admin_master_password_hash" ? "••••••" : s.value}</span>
              <span className="text-muted-foreground"><Icon name="edit" size={16} /></span>
            </button>
          ))}
        </div>
      </GlassCard>

      {/* آية اليوم */}
      <GlassCard className="p-5">
        <h2 className="font-amiri text-lg text-burgundy mb-2 flex items-center gap-2"><Icon name="star" size={18} />آية اليوم</h2>
        <p className="font-readex text-xs text-muted-foreground mb-3">
          تُختار الآية تلقائياً كل يوم من المصحف بالرسم العثماني، ويمكنك تخصيص آية بعينها لليوم الحالي.
        </p>
        {!DEMO && todayVerse.data && (
          <div className="rounded-xl bg-burgundy/5 dark:bg-white/5 p-3 mb-3 text-center overflow-hidden min-w-0">
            <p className="font-amiri text-lg leading-relaxed break-words">﴿ {todayVerse.data.verse.text} ﴾</p>
            <p className="font-readex text-xs text-muted-foreground mt-1">
              سورة {todayVerse.data.verse.surahName}، آية {todayVerse.data.verse.ayahNumber}
              {todayVerse.data.verse.source === "admin" ? " — مخصصة من الإدارة" : " — اختيار تلقائي"}
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 min-[375px]:grid-cols-2 gap-2 mb-2">
           <input inputMode="numeric" value={surahNo} onChange={(e) => setSurahNo(normalizeDigits(e.target.value).replace(/\D/g, ""))}
            placeholder="رقم السورة (1-114)" className="flex-1 min-w-0 w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm text-center" />
           <input inputMode="numeric" value={ayahNo} onChange={(e) => setAyahNo(normalizeDigits(e.target.value).replace(/\D/g, ""))}
            placeholder="رقم الآية" className="flex-1 min-w-0 w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm text-center" />
        </div>
        {!DEMO && versePreview.data && (
          <div className="rounded-xl bg-gold/10 p-3 mb-2 text-center overflow-hidden min-w-0">
            <p className="font-amiri text-base leading-relaxed break-words">﴿ {versePreview.data.text} ﴾</p>
            <p className="font-readex text-[11px] text-muted-foreground mt-1">سورة {versePreview.data.surahName}، آية {versePreview.data.ayahNumber}</p>
          </div>
        )}
        {!DEMO && versePreview.isError && surahNo && ayahNo && (
          <p className="font-readex text-[11px] text-destructive mb-2">تعذر جلب الآية — تأكد من رقم السورة والآية</p>
        )}
        <div className="flex gap-2">
          <PrimaryButton className="flex-1 min-w-0" disabled={!versePreview.data || setVerse.isPending}
            onClick={() => DEMO ? blocked() : setVerse.mutate({ surahNumber: Number(surahNo), ayahNumber: Number(ayahNo) })}>
            اعتماد آية اليوم
          </PrimaryButton>
          {todayVerse.data?.verse.source === "admin" && (
            <button onClick={() => DEMO ? blocked() : clearVerse.mutate({})} disabled={clearVerse.isPending}
              className="rounded-xl border border-input px-4 font-readex text-sm text-muted-foreground hover:bg-burgundy/5 transition">
              إلغاء التخصيص
            </button>
          )}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h2 className="font-amiri text-lg text-burgundy mb-2 flex items-center gap-2"><Icon name="lock" size={18} />الأمان</h2>
        <div className="rounded-xl bg-gold/10 p-3 mb-3">
          <p className="font-readex text-xs text-muted-foreground">
            كلمة المرور الرئيسية تفتح بوابة الإشراف لأي مستخدم مسجّل. تغييرها يُسجّل خروج جميع المشرفين فوراً.
            حماية الدخول: 5 محاولات فاشلة ← حظر 48 ساعة.
          </p>
        </div>
        <PrimaryButton className="w-full" onClick={() => setPwOpen(true)}>تغيير كلمة المرور الرئيسية</PrimaryButton>
      </GlassCard>

      {/* Edit value modal */}
      <AdminModal open={!!editKey} onClose={() => setEditKey(null)} dirty={valueDirty} busy={update.isPending}
        title={editKey?.description || "تعديل الإعداد"} subtitle={editKey?.key}
        footer={(requestClose) => <FormActions onCancel={requestClose} primaryLabel="حفظ" disabled={!newValue} loading={update.isPending}
          onPrimary={() => editKey && (DEMO ? blocked() : update.mutate({ key: editKey.key, value: newValue, description: editKey.description ?? undefined }))} />}>
        {editKey && (
          <label className="block font-readex text-xs font-bold">القيمة الجديدة
            <input value={newValue} onChange={(e) => setNewValue(e.target.value)} dir="ltr" data-autofocus
              className="mt-1.5 w-full min-h-[44px] rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm text-center focus:outline-none focus:ring-2 focus:ring-gold" />
          </label>
        )}
      </AdminModal>

      {/* Change master password modal */}
      <AdminModal open={pwOpen} onClose={closePw} dirty={pwDirty} busy={changePw.isPending} title="تغيير كلمة المرور الرئيسية" subtitle="سيُسجَّل خروج جميع المشرفين بعد التغيير"
        footer={(requestClose) => <FormActions onCancel={requestClose} primaryLabel="متابعة" disabled={!isNonWhitespacePassword(current) || !isNonWhitespacePassword(newPw)} loading={changePw.isPending}
          onPrimary={() => (DEMO ? blocked() : setConfirmPw(true))} />}>
        <div className="space-y-3">
          <label className="block font-readex text-xs font-bold">كلمة المرور الحالية
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} dir="ltr" data-autofocus autoComplete="current-password"
              className="mt-1.5 w-full min-h-[44px] rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold" />
          </label>
          <label className="block font-readex text-xs font-bold">كلمة المرور الجديدة
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} dir="ltr" autoComplete="new-password"
              className="mt-1.5 w-full min-h-[44px] rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-gold" />
          </label>
          <p className="font-readex text-[11px] text-destructive flex items-center gap-1.5"><Icon name="alert-triangle" size={14} className="shrink-0" />سيُسجَّل خروج جميع المشرفين بما فيهم أنت</p>
        </div>
      </AdminModal>
      <ConfirmDialog open={confirmPw} title="تغيير كلمة المرور الرئيسية؟" confirmLabel="تغيير وتسجيل الخروج" loading={changePw.isPending}
        impact="ستُنهى جلسات جميع المشرفين فوراً، بمن فيهم أنت، وسيلزم الدخول بكلمة المرور الجديدة."
        onCancel={() => setConfirmPw(false)} onConfirm={() => changePw.mutate({ current, newPassword: newPw })} />
    </div>
  );
}
