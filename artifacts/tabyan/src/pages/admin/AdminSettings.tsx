import { useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/GlassCard";
import Modal from "@/components/Modal";
import PrimaryButton from "@/components/PrimaryButton";
import Icon from "@/components/Icon";
import { useToast } from "@/hooks/useToast";
import { authStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { DEMO_SETTINGS } from "@/lib/demo/admin-ops";
import { isNonWhitespacePassword } from "@workspace/tabyan-trpc/password-validation";
import { normalizeDigits } from "@workspace/tabyan-trpc/input-normalization";

const EDITABLE_KEYS = [
  "login_max_attempts", "login_block_duration_hours", "placement_video_duration_seconds",
  "placement_review_deadline_hours", "promotion_video_duration_seconds", "fatwa_reassign_hours",
  "recording_retention_months", "notif_ayah_time", "notif_hadith_time", "notif_ibn_qayyim_time", "notif_review_reminder_time",
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

  const update = trpc.admin.settingsUpdate.useMutation({
    onSuccess: () => { toast("حُفظ الإعداد", "success"); setEditKey(null); utils.admin.settingsGet.invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const changePw = trpc.admin.settingsChangeMasterPassword.useMutation({
    onSuccess: async () => {
      toast("غُيّرت كلمة المرور الرئيسية — سُجّل خروج كل المشرفين", "success");
      await api.logout(); authStore.clear(); navigate("/");
    },
    onError: (e) => toast(e.message, "error"),
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
    onError: (e) => toast(e.message, "error"),
  });
  const clearVerse = trpc.dailyVerse.clear.useMutation({
    onSuccess: () => { toast("أُلغي التخصيص — ستُختار الآية تلقائياً", "success"); utils.dailyVerse.today.invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });

  const rows = settingsData.filter((s) => EDITABLE_KEYS.includes(s.key));

  return (
    <div className="space-y-4 page-enter">
      <h1 className="font-amiri text-2xl text-burgundy flex items-center gap-2"><Icon name="settings" size={24} />إعدادات النظام</h1>

      <GlassCard className="p-5">
        <h2 className="font-amiri text-lg text-burgundy mb-2">القواعد التشغيلية</h2>
        <div className="space-y-1">
          {settingsLoading ? <div className="h-40 skeleton rounded-[1.5rem]" /> : rows.map((s) => (
            <button key={s.key} onClick={() => { setEditKey(s); setNewValue(s.value); }}
              className="w-full flex items-center gap-3 rounded-xl bg-burgundy/5 dark:bg-white/5 px-4 py-3 hover:bg-burgundy/10 transition text-right">
              <div className="flex-1">
                <div className="font-readex text-sm font-bold" dir="ltr">{s.key}</div>
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
        <div className="flex gap-2 mb-2">
           <input inputMode="numeric" value={surahNo} onChange={(e) => setSurahNo(normalizeDigits(e.target.value).replace(/\D/g, ""))}
            placeholder="رقم السورة (1-114)" className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm text-center" />
           <input inputMode="numeric" value={ayahNo} onChange={(e) => setAyahNo(normalizeDigits(e.target.value).replace(/\D/g, ""))}
            placeholder="رقم الآية" className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm text-center" />
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
          <PrimaryButton className="flex-1" disabled={!versePreview.data || setVerse.isPending}
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
      <Modal open={!!editKey} onClose={() => setEditKey(null)}>
        {editKey && (
          <div className="space-y-3">
            <h3 className="font-amiri text-xl text-burgundy text-center" dir="ltr">{editKey.key}</h3>
            {editKey.description && <p className="font-readex text-xs text-muted-foreground text-center">{editKey.description}</p>}
            <input value={newValue} onChange={(e) => setNewValue(e.target.value)} dir="ltr"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 font-readex text-sm text-center" />
            <PrimaryButton className="w-full" disabled={!newValue || update.isPending}
              onClick={() => DEMO ? blocked() : update.mutate({ key: editKey.key, value: newValue, description: editKey.description ?? undefined })}>
              حفظ
            </PrimaryButton>
          </div>
        )}
      </Modal>

      {/* Change master password modal */}
      <Modal open={pwOpen} onClose={() => setPwOpen(false)}>
        <div className="space-y-3">
          <h3 className="font-amiri text-xl text-burgundy text-center">تغيير كلمة المرور الرئيسية</h3>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="كلمة المرور الحالية" dir="ltr"
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm" />
           <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="أدخل كلمة المرور الجديدة" dir="ltr"
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 font-readex text-sm" />
          <p className="font-readex text-[11px] text-destructive flex items-center gap-1.5"><Icon name="alert-triangle" size={14} className="shrink-0" />سيُسجَّل خروج جميع المشرفين بما فيهم أنت</p>
           <PrimaryButton className="w-full" disabled={!isNonWhitespacePassword(current) || !isNonWhitespacePassword(newPw) || changePw.isPending}
            onClick={() => DEMO ? blocked() : changePw.mutate({ current, newPassword: newPw })}>
            تأكيد التغيير
          </PrimaryButton>
        </div>
      </Modal>
    </div>
  );
}
