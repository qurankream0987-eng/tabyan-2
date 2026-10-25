import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import GlassCard from "@/components/app/GlassCard";
import EmptyState from "@/components/app/EmptyState";
import Icon from "@/components/app/Icon";
import { useToast } from "@/hooks/useToast";
import { authStore } from "@/lib/auth";
import { DEMO_NOTIF_FEED } from "@/lib/demo/student-extra";
import { NOTIF_TYPE_META, getMeetingUrl, relTime } from "./notification-meta";

type Period = "all" | "today" | "week" | "month";
type ReadStatus = "all" | "read" | "unread";

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "all", label: "الكل" },
  { value: "today", label: "اليوم" },
  { value: "week", label: "أسبوع" },
  { value: "month", label: "شهر" },
];
const READ_STATUSES: Array<{ value: ReadStatus; label: string }> = [
  { value: "all", label: "الكل" },
  { value: "unread", label: "غير مقروءة" },
  { value: "read", label: "مقروءة" },
];

/** شاشة الإشعارات الكاملة — أقسام (مثبتة / اليوم / سابقة) + فلاتر */
export default function Notifications({ base, navPath }: { base: string; navPath?: string }) {
  const listPath = navPath ?? `${base}/notifications`;
  const navigate = useNavigate();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [filterOpen, setFilterOpen] = useState(false);
  const [types, setTypes] = useState<string[]>([]);
  const [period, setPeriod] = useState<Period>("all");
  const [readStatus, setReadStatus] = useState<ReadStatus>("all");
  // مسودة التصفية داخل الشاشة المنبثقة — تُطبَّق عند الضغط على «تطبيق التصفية»
  const [draftTypes, setDraftTypes] = useState<string[]>([]);
  const [draftPeriod, setDraftPeriod] = useState<Period>("all");
  const [draftReadStatus, setDraftReadStatus] = useState<ReadStatus>("all");

  const openFilter = () => {
    setDraftTypes(types); setDraftPeriod(period); setDraftReadStatus(readStatus);
    setFilterOpen(true);
  };
  const applyFilter = () => {
    setTypes(draftTypes); setPeriod(draftPeriod); setReadStatus(draftReadStatus);
    setFilterOpen(false);
  };
  const resetFilter = () => {
    setDraftTypes([]); setDraftPeriod("all"); setDraftReadStatus("all");
  };

  const query = useMemo(() => ({
    types: types.length ? types : undefined,
    period, readStatus,
  }), [types, period, readStatus]);

  const DEMO = authStore.isDemo;
  const blocked = () => toast("وضع العرض التجريبي — هذا الإجراء يتطلب تشغيل الخادم", "info");

  const listQuery = trpc.notifications.list.useQuery(query, { enabled: !DEMO });

  const demoData = useMemo(() => {
    if (!DEMO) return undefined;
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const cutoff = period === "today" ? startOfToday.getTime()
      : period === "week" ? Date.now() - 7 * 86_400_000
      : period === "month" ? Date.now() - 30 * 86_400_000
      : 0;
    const items = DEMO_NOTIF_FEED.filter((n) =>
      (!types.length || types.includes(n.type)) &&
      (readStatus === "all" || (readStatus === "read" ? n.isRead : !n.isRead)) &&
      (cutoff === 0 || new Date(n.createdAt).getTime() >= cutoff),
    );
    return {
      pinned: items.filter((n) => n.isPinned),
      today: items.filter((n) => !n.isPinned && new Date(n.createdAt).getTime() >= startOfToday.getTime()),
      earlier: items.filter((n) => !n.isPinned && new Date(n.createdAt).getTime() < startOfToday.getTime()),
      unreadCount: DEMO_NOTIF_FEED.filter((n) => !n.isRead).length,
    };
  }, [DEMO, types, period, readStatus]);

  const data = DEMO ? demoData : listQuery.data;
  const isLoading = DEMO ? false : listQuery.isLoading;

  const invalidate = () => {
    utils.notifications.list.invalidate();
    utils.notifications.unreadCount.invalidate();
  };
  const markAll = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => { toast("تم تعليم الكل كمقروء", "success"); invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const togglePin = trpc.notifications.togglePin.useMutation({
    onSuccess: (r) => { toast(r.isPinned ? "تم تثبيت الإشعار" : "أُلغي التثبيت", "success"); invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const remove = trpc.notifications.remove.useMutation({
    onSuccess: () => { toast("تم حذف الإشعار", "success"); invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: invalidate,
  });
  // الانضمام المباشر — يفتح رابط الجلسة في تبويب جديد ويعلّم الإشعار كمقروء (مطابق لسلوك البانر)
  const joinMeeting = (n: NotifRow, url: string) => {
    window.open(url, "_blank", "noopener");
    if (!DEMO && !n.isRead) markRead.mutate({ id: n.id });
  };

  const hasFilters = types.length > 0 || period !== "all" || readStatus !== "all";
  const isEmpty = !data || (data.pinned.length === 0 && data.today.length === 0 && data.earlier.length === 0);

  const toggleDraftType = (t: string) =>
    setDraftTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <div className="space-y-5 page-enter max-w-2xl mx-auto">
      {/* الترويسة */}
      <div className="flex items-center justify-between gap-2">
        <h1
          className="hero-greeting font-amiri text-2xl font-bold flex items-center gap-2"
        >
          الإشعارات
          {(data?.unreadCount ?? 0) > 0 && (
            <span className="text-xs font-readex font-extrabold bg-gold text-night rounded-full px-2.5 py-0.5" style={{ WebkitTextFillColor: "unset", color: "#2B0D12" }}>
              {data?.unreadCount}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => (filterOpen ? setFilterOpen(false) : openFilter())}
            aria-label="فلترة"
            className={`w-10 h-10 rounded-full flex items-center justify-center btn-press transition ${
              filterOpen || hasFilters
                ? "bg-burgundy text-white dark:bg-gold dark:text-night shadow-md"
                : "glass text-burgundy hover:shadow-gold"
            }`}
          >
            <Icon name="filter" size={17} />
          </button>
          <button
            onClick={() => navigate(`${listPath}/settings`)}
            aria-label="إعدادات الإشعارات"
            className="w-10 h-10 rounded-full glass flex items-center justify-center text-burgundy hover:shadow-gold btn-press transition"
          >
            <Icon name="settings" size={17} />
          </button>
        </div>
      </div>

      {/* شاشة تصفية الإشعارات — طبقة سفلية منبثقة */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-label="تصفية الإشعارات">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setFilterOpen(false)} />
          <div className="relative w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-card border border-[rgba(212,175,55,0.25)] shadow-2xl p-5 space-y-5 animate-in slide-in-from-bottom-4">
            {/* الترويسة */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setFilterOpen(false)}
                aria-label="إغلاق"
                className="w-9 h-9 rounded-full glass flex items-center justify-center text-burgundy btn-press"
              >
                <Icon name="arrow-right" size={16} />
              </button>
              <h2 className="font-amiri text-xl font-bold text-burgundy">تصفية الإشعارات</h2>
              <button
                onClick={resetFilter}
                className="font-readex text-xs font-bold text-muted-foreground hover:text-destructive btn-press"
              >
                إعادة
              </button>
            </div>

            {/* حسب النوع */}
            <div>
              <FilterSectionTitle icon="filter" title="حسب النوع" />
              <GlassCard hover={false} className="p-3 space-y-1">
                {Object.entries(NOTIF_TYPE_META).filter(([k]) => !["general", "session", "activity"].includes(k)).map(([key, meta]) => {
                  const active = draftTypes.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleDraftType(key)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gold/5 transition btn-press text-start"
                    >
                      <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                        active ? "bg-gold border-gold text-night" : "border-border text-transparent"
                      }`}>
                        <Icon name="check" size={12} />
                      </span>
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                        <Icon name={meta.icon} size={15} />
                      </span>
                      <span className="font-readex text-sm font-bold text-foreground">{meta.label}</span>
                    </button>
                  );
                })}
              </GlassCard>
            </div>

            {/* حسب الفترة */}
            <div>
              <FilterSectionTitle icon="calendar" title="حسب الفترة" />
              <GlassCard hover={false} className="p-3 space-y-1">
                {PERIODS.map((p) => (
                  <RadioRow key={p.value} label={p.label} active={draftPeriod === p.value} onClick={() => setDraftPeriod(p.value)} />
                ))}
              </GlassCard>
            </div>

            {/* حسب الحالة */}
            <div>
              <FilterSectionTitle icon="check-circle" title="حسب الحالة" />
              <GlassCard hover={false} className="p-3 space-y-1">
                {READ_STATUSES.map((s) => (
                  <RadioRow key={s.value} label={s.label} active={draftReadStatus === s.value} onClick={() => setDraftReadStatus(s.value)} />
                ))}
              </GlassCard>
            </div>

            {/* تطبيق التصفية — زر ذهبي كامل */}
            <button
              onClick={applyFilter}
              className="w-full py-3.5 rounded-2xl font-readex text-sm font-extrabold text-night btn-press transition shadow-md"
              style={{ background: "linear-gradient(158deg, #EBCB5C, #D4AF37, #B8962A)", color: "#12080D" }}
            >
              تطبيق التصفية
            </button>
          </div>
        </div>
      )}

      {/* تعليم الكل كمقروء */}
      {(data?.unreadCount ?? 0) > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => (DEMO ? blocked() : markAll.mutate())}
            disabled={markAll.isPending}
            className="font-readex text-xs font-bold text-gold-dark dark:text-gold hover:underline btn-press inline-flex items-center gap-1.5"
          >
            <Icon name="check-circle" size={14} />
            تعليم الكل كمقروء
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 skeleton rounded-[1.5rem]" />)}
        </div>
      ) : isEmpty ? (
        <GlassCard className="p-10 text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-[rgba(212,175,55,0.12)] border border-[rgba(212,175,55,0.25)] flex items-center justify-center text-gold-dark dark:text-gold mb-4">
            <Icon name="bell" size={40} />
          </div>
          <p className="font-amiri text-xl font-bold text-burgundy">
            {hasFilters ? "لا نتائج مطابقة للفلاتر" : "لا توجد إشعارات حالياً"}
          </p>
          <p className="font-readex text-sm text-muted-foreground mt-1 leading-relaxed">
            {hasFilters ? "جرّب تعديل الفلاتر أو مسحها" : "سيتم إعلامك عند وجود تحديثات جديدة في حلقاتك ومحتواك"}
          </p>
          <button
            onClick={() => (DEMO ? undefined : invalidate())}
            className="mt-5 inline-flex items-center gap-2 font-readex text-xs font-extrabold px-6 py-2.5 rounded-full border border-gold/40 text-gold-dark dark:text-gold bg-gold/10 hover:bg-gold/20 btn-press transition"
          >
            <Icon name="refresh" size={14} />
            تحديث
          </button>
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {data!.today.length > 0 && (
            <Section title="اليوم" icon="clock">
              {data!.today.map((n) => (
                <NotifCard key={n.id} n={n} listPath={listPath}
                  onJoin={(url) => joinMeeting(n, url)}
                  onPin={() => (DEMO ? blocked() : togglePin.mutate({ id: n.id }))}
                  onDelete={() => (DEMO ? blocked() : remove.mutate({ id: n.id }))} />
              ))}
            </Section>
          )}
          {data!.pinned.length > 0 && (
            <Section title="مثبتة" icon="pin">
              {data!.pinned.map((n) => (
                <NotifCard key={n.id} n={n} listPath={listPath}
                  onJoin={(url) => joinMeeting(n, url)}
                  onPin={() => (DEMO ? blocked() : togglePin.mutate({ id: n.id }))}
                  onDelete={() => (DEMO ? blocked() : remove.mutate({ id: n.id }))} />
              ))}
            </Section>
          )}
          {data!.earlier.length > 0 && (
            <Section title="سابقة" icon="hourglass">
              {data!.earlier.map((n) => (
                <NotifCard key={n.id} n={n} listPath={listPath}
                  onJoin={(url) => joinMeeting(n, url)}
                  onPin={() => (DEMO ? blocked() : togglePin.mutate({ id: n.id }))}
                  onDelete={() => (DEMO ? blocked() : remove.mutate({ id: n.id }))} />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function FilterSectionTitle({ icon, title }: { icon: "filter" | "calendar" | "check-circle"; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon name={icon} size={14} className="text-gold-dark dark:text-gold" />
      <span className="font-readex text-xs font-extrabold text-burgundy">{title}</span>
      <span className="flex-1 h-px bg-gradient-to-l from-[rgba(212,175,55,0.4)] to-transparent" />
    </div>
  );
}

function RadioRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gold/5 transition btn-press text-start"
    >
      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
        active ? "border-gold" : "border-border"
      }`}>
        {active && <span className="w-2.5 h-2.5 rounded-full bg-gold" />}
      </span>
      <span className={`font-readex text-sm font-bold ${active ? "text-burgundy" : "text-foreground"}`}>{label}</span>
    </button>
  );
}

function Section({ title, icon, children }: { title: string; icon: "pin" | "clock" | "hourglass"; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <Icon name={icon} size={15} className="text-gold-dark dark:text-gold" />
        <span className="font-readex text-sm font-extrabold text-burgundy">{title}</span>
        <span className="flex-1 h-px bg-gradient-to-l from-[rgba(212,175,55,0.4)] to-transparent" />
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

type NotifRow = {
  id: string; title: string; body: string | null; type: string; priority: string;
  isRead: boolean; isPinned: boolean; createdAt: Date | string | null;
  payload?: unknown;
};

function NotifCard({ n, listPath, onJoin, onPin, onDelete }: { n: NotifRow; listPath: string; onJoin: (url: string) => void; onPin: () => void; onDelete: () => void }) {
  const navigate = useNavigate();
  const meta = NOTIF_TYPE_META[n.type] ?? NOTIF_TYPE_META.general;
  const meetingUrl = getMeetingUrl(n);
  return (
    <GlassCard
      className={`p-4 flex gap-3 cursor-pointer transition hover:shadow-md ${!n.isRead ? "ring-1 ring-gold/50" : "opacity-80"} ${
        n.priority === "high" && !n.isRead ? "border-s-4 border-s-burgundy dark:border-s-gold" : ""
      }`}
      onClick={() => navigate(`${listPath}/${n.id}`)}
    >
      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${meta.bg}`}>
        <Icon name={meta.icon} size={19} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="font-readex text-sm font-extrabold flex items-center gap-2 min-w-0">
            <span className="truncate">{n.title}</span>
            {!n.isRead && <span className="w-2 h-2 rounded-full bg-gold shrink-0 shadow-[0_0_6px_rgba(212,175,55,.8)] animate-pulse" />}
          </div>
          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onPin}
              aria-label={n.isPinned ? "إلغاء التثبيت" : "تثبيت"}
              className={`w-8 h-8 rounded-full flex items-center justify-center btn-press transition ${
                n.isPinned ? "text-gold-dark dark:text-gold bg-gold/10" : "text-muted-foreground hover:text-gold-dark dark:hover:text-gold hover:bg-gold/10"
              }`}
            >
              <Icon name="pin" size={14} />
            </button>
            <button
              onClick={onDelete}
              aria-label="حذف"
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 btn-press transition"
            >
              <Icon name="trash" size={14} />
            </button>
          </div>
        </div>
        {n.body && <p className="font-readex text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>}
        {meetingUrl && (
          <button
            onClick={(e) => { e.stopPropagation(); onJoin(meetingUrl); }}
            className="mt-2 inline-flex items-center gap-1.5 font-readex text-xs font-extrabold px-4 py-2 rounded-xl btn-press transition shadow-sm"
            style={{ background: "#D4AF37", color: "#12080D" }}
          >
            <Icon name="video" size={13} />
            انضم الآن
          </button>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`font-readex text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.chipBg}`}>{meta.label}</span>
          <span className="text-[10px] text-muted-foreground font-readex">{relTime(n.createdAt ?? new Date())}</span>
        </div>
      </div>
    </GlassCard>
  );
}
