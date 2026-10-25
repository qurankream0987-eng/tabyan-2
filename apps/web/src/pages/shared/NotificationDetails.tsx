import { useNavigate, useParams, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/app/GlassCard";
import Icon from "@/components/app/Icon";
import { useToast } from "@/hooks/useToast";
import { authStore } from "@/lib/auth";
import { DEMO_NOTIF_FEED } from "@/lib/demo/student-extra";
import { NOTIF_TYPE_META, getMeetingUrl, fullTime } from "./notification-meta";

/** شاشة تفاصيل الإشعار — تعليم مقروء تلقائيًا + أزرار الإجراء */
export default function NotificationDetails({ base, navPath }: { base: string; navPath?: string }) {
  const listPath = navPath ?? `${base}/notifications`;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const DEMO = authStore.isDemo;
  const blocked = () => toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info");

  const byIdQuery = trpc.notifications.byId.useQuery(
    { id: id ?? "" },
    { enabled: !!id && !DEMO },
  );
  const n = DEMO ? DEMO_NOTIF_FEED.find((x) => x.id === id) : byIdQuery.data;
  const isLoading = DEMO ? false : byIdQuery.isLoading;
  const error = DEMO ? null : byIdQuery.error;

  const invalidate = () => {
    utils.notifications.list.invalidate();
    utils.notifications.unreadCount.invalidate();
  };
  const togglePin = trpc.notifications.togglePin.useMutation({
    onSuccess: (r) => {
      toast(r.isPinned ? "تم تثبيت الإشعار" : "أُلغي التثبيت", "success");
      utils.notifications.byId.invalidate({ id: id ?? "" });
      invalidate();
    },
    onError: (e) => toast(e.message, "error"),
  });
  const remove = trpc.notifications.remove.useMutation({
    onSuccess: () => {
      toast("تم حذف الإشعار", "success");
      invalidate();
      navigate(listPath);
    },
    onError: (e) => toast(e.message, "error"),
  });

  if (isLoading) {
    return <div className="max-w-lg mx-auto h-60 skeleton rounded-[1.5rem]" />;
  }
  if (error || !n) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 page-enter">
        <GlassCard className="p-8">
          <Icon name="alert-triangle" size={36} className="mx-auto text-destructive mb-3" />
          <p className="font-readex text-base font-bold">الإشعار غير موجود أو تم حذفه</p>
          <Link to={listPath} className="font-readex text-sm text-gold-dark dark:text-gold hover:underline mt-3 inline-block">
            العودة للإشعارات
          </Link>
        </GlassCard>
      </div>
    );
  }

  const meta = NOTIF_TYPE_META[n.type] ?? NOTIF_TYPE_META.general;
  // بيانات اختيارية — تظهر فقط عند توفرها في الإشعار (demo أو backend مستقبلاً)
  const extra = n as typeof n & {
    payload?: {
      date?: string; time?: string; durationMinutes?: number; sessionKind?: string;
      teacherName?: string; subject?: string;
    } | null;
    attachments?: Array<{ name: string; kind: "pdf" | "audio" | "file"; url?: string }> | null;
  };
  const payload = extra.payload ?? null;
  const attachments = extra.attachments ?? [];
  const meetingUrl = getMeetingUrl(n);
  // توجيه آمن: الروابط الخارجية في تبويب جديد، والداخلية تُطبَّع لمسار موجود فعلاً —
  // إشعارات قديمة قد تحمل مسارات ناقصة (مثل /session/xyz) فتُصحَّح بدل فتح 404
  const go = (url: string) => {
    if (/^https?:\/\//.test(url)) { window.open(url, "_blank", "noopener"); return; }
    navigate(resolveInternalUrl(url, base));
  };

  return (
    <div className="space-y-4 page-enter max-w-lg mx-auto">
      <Link
        to={listPath}
        className="font-readex text-sm font-bold text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1.5"
      >
        <Icon name="arrow-right" size={16} />
        الإشعارات
      </Link>

      <GlassCard className="p-6 overflow-hidden relative text-center">
        {/* أيقونة كبيرة 80px */}
        <div
          className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-md"
          style={{ background: "linear-gradient(135deg, #800020, #A02040)" }}
        >
          <Icon name={meta.icon} size={36} className="text-gold" />
        </div>

        <div className="flex items-center justify-center gap-2 flex-wrap mt-4">
          <span className={`font-readex text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.chipBg}`}>{meta.label}</span>
          {n.priority === "high" && (
            <span className="font-readex text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">هام</span>
          )}
          {n.isPinned && (
            <span className="font-readex text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/15 text-gold-dark dark:text-gold inline-flex items-center gap-1">
              <Icon name="pin" size={10} /> مثبت
            </span>
          )}
        </div>

        <h1 className="font-amiri text-2xl font-extrabold text-burgundy mt-2 leading-snug">{n.title}</h1>
        <p className="font-readex text-[11px] text-muted-foreground mt-1">{fullTime(n.createdAt ?? new Date())}</p>

        {n.body && (
          <p className="font-readex text-sm leading-loose text-foreground mt-4 whitespace-pre-wrap">{n.body}</p>
        )}

        {/* بيانات الموعد (إن وُجدت) */}
        {payload && (
          <>
            <div className="h-px bg-gradient-to-l from-transparent via-[rgba(212,175,55,0.4)] to-transparent my-5" />
            <div className="space-y-2.5 text-start">
              {payload.teacherName && <InfoRow icon="user" label="المعلم" value={payload.teacherName} />}
              {payload.subject && <InfoRow icon="quran" label="المادة" value={payload.subject} />}
              {payload.date && <InfoRow icon="calendar" label="الموعد" value={payload.date} />}
              {payload.time && <InfoRow icon="clock" label="الساعة" value={payload.time} />}
              {payload.durationMinutes != null && <InfoRow icon="timer" label="المدة" value={`${payload.durationMinutes} دقيقة`} />}
              {payload.sessionKind && <InfoRow icon="map-pin" label="نوع الحلقة" value={payload.sessionKind} />}
            </div>
          </>
        )}

        {(meetingUrl || n.primaryActionUrl || n.secondaryActionUrl) && (
          <>
            <div className="h-px bg-gradient-to-l from-transparent via-[rgba(212,175,55,0.4)] to-transparent my-5" />
            <div className="space-y-2.5">
              {/* الانضمام المباشر للجلسة — يفتح في تبويب جديد (مطابق لسلوك البانر) */}
              {meetingUrl && (
                <a
                  href={meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 rounded-2xl font-readex text-sm font-extrabold btn-press transition shadow-md inline-flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(158deg, #EBCB5C, #D4AF37, #B8962A)", color: "#12080D" }}
                >
                  <Icon name="video" size={16} />
                  انضم الآن
                </a>
              )}
              {n.primaryActionUrl && (
                <button
                  onClick={() => go(n.primaryActionUrl!)}
                  className="w-full py-3.5 rounded-2xl font-readex text-sm font-extrabold btn-press transition shadow-md inline-flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(158deg, #EBCB5C, #D4AF37, #B8962A)", color: "#12080D" }}
                >
                  {n.primaryActionLabel ?? "عرض"}
                  <Icon name="arrow-left" size={16} />
                </button>
              )}
              {n.secondaryActionUrl && (
                <button
                  onClick={() => go(n.secondaryActionUrl!)}
                  className="w-full py-3 rounded-2xl border-2 border-burgundy/25 dark:border-gold/25 font-readex text-sm font-extrabold text-burgundy hover:bg-burgundy/5 dark:hover:bg-gold/10 btn-press transition"
                >
                  {n.secondaryActionLabel ?? "تفاصيل أخرى"}
                </button>
              )}
            </div>
          </>
        )}
      </GlassCard>

      {/* المرفقات (إن وُجدت) */}
      {attachments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Icon name="link" size={15} className="text-gold-dark dark:text-gold" />
            <span className="font-readex text-sm font-extrabold text-burgundy">مرفقات</span>
            <span className="flex-1 h-px bg-gradient-to-l from-[rgba(212,175,55,0.4)] to-transparent" />
          </div>
          <GlassCard className="p-3 space-y-1" hover={false}>
            {attachments.map((a, i) => (
              <button
                key={i}
                onClick={() => (a.url ? window.open(a.url, "_blank", "noopener") : blocked())}
                className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-gold/5 transition btn-press text-start"
              >
                <span className="w-9 h-9 rounded-xl bg-burgundy/8 dark:bg-gold/10 flex items-center justify-center text-burgundy shrink-0">
                  <Icon name={a.kind === "audio" ? "headphones" : "file-text"} size={16} />
                </span>
                <span className="font-readex text-sm font-bold text-foreground flex-1 truncate" dir="ltr">{a.name}</span>
                <Icon name="arrow-left" size={14} className="text-muted-foreground shrink-0" />
              </button>
            ))}
          </GlassCard>
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => (DEMO ? blocked() : togglePin.mutate({ id: n.id }))}
          disabled={togglePin.isPending}
          className="inline-flex items-center gap-2 font-readex text-xs font-extrabold px-5 py-2.5 rounded-full glass text-burgundy hover:shadow-gold btn-press transition"
        >
          <Icon name="pin" size={14} />
          {n.isPinned ? "إلغاء التثبيت" : "تثبيت"}
        </button>
        <button
          onClick={() => (DEMO ? blocked() : remove.mutate({ id: n.id }))}
          disabled={remove.isPending}
          className="inline-flex items-center gap-2 font-readex text-xs font-extrabold px-5 py-2.5 rounded-full border border-destructive/30 text-destructive hover:bg-destructive/10 btn-press transition"
        >
          <Icon name="trash" size={14} />
          حذف الإشعار
        </button>
      </div>
    </div>
  );
}

/** تطبيع رابط داخلي إلى مسار مسجَّل في التطبيق حتى لا يفتح صفحة 404 */
function resolveInternalUrl(url: string, base: string): string {
  const clean = url.startsWith("/") ? url : `/${url}`;
  // مسارات قديمة بلا بادئة دور: /session/xyz → /student/session/xyz أو /teacher/session/xyz
  if (clean.startsWith("/session/")) return `${base}${clean}`;
  // الروابط التي تبدأ بأحد الجذور المعروفة تمر كما هي
  if (/^\/(student|teacher|admin)(\/|$)/.test(clean)) return clean;
  // أي رابط داخلي آخر يُلحق ببادئة الدور الحالي
  return `${base}${clean}`;
}

function InfoRow({ icon, label, value }: { icon: "user" | "quran" | "calendar" | "clock" | "timer" | "map-pin"; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 h-8 rounded-lg bg-burgundy/8 dark:bg-gold/10 flex items-center justify-center text-burgundy shrink-0">
        <Icon name={icon} size={14} />
      </span>
      <span className="font-readex text-xs font-bold text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="font-readex text-sm font-extrabold text-foreground">{value}</span>
    </div>
  );
}
