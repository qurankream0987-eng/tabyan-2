import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import Icon from "@/components/app/Icon";
import { authStore } from "@/lib/auth";
import { DEMO_NOTIF_FEED } from "@/lib/demo/student-extra";
import { NOTIF_TYPE_META } from "@/pages/shared/notification-meta";

const DISMISS_KEY = "notifBannerDismissed";
const FRESH_MS = 2 * 60 * 60 * 1000; // إشعار «طازج» خلال آخر ساعتين

function dismissed(): string[] {
  try { return JSON.parse(sessionStorage.getItem(DISMISS_KEY) ?? "[]"); } catch { return []; }
}
function dismiss(id: string) {
  sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...dismissed(), id]));
}

/** البانر العائم المنبثق — يظهر لأحدث إشعار عالي الأولوية غير مقروء */
export default function NotificationBanner({ listPath }: { listPath: string }) {
  const navigate = useNavigate();
  const DEMO = authStore.isDemo;
  const [dismissVersion, setDismissVersion] = useState(0);

  const listQuery = trpc.notifications.list.useQuery(
    { period: "today", readStatus: "unread" },
    { enabled: !DEMO, staleTime: 60_000 },
  );

  const n = useMemo(() => {
    const skip = dismissed();
    const pool = DEMO
      ? DEMO_NOTIF_FEED
      : [...(listQuery.data?.pinned ?? []), ...(listQuery.data?.today ?? []), ...(listQuery.data?.earlier ?? [])];
    return pool.find((x) =>
      !x.isRead &&
      (x.priority === "high" || x.priority === "urgent") &&
      !skip.includes(x.id) &&
      !!x.createdAt && Date.now() - new Date(x.createdAt).getTime() < FRESH_MS,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DEMO, listQuery.data, dismissVersion]);

  if (!n) return null;
  const meta = NOTIF_TYPE_META[n.type] ?? NOTIF_TYPE_META.general;
  const close = () => { dismiss(n.id); setDismissVersion((v) => v + 1); };

  return (
    <div className="fixed top-16 inset-x-0 z-40 px-4 pointer-events-none">
      <div
        className="pointer-events-auto max-w-lg mx-auto rounded-3xl border-[1.5px] border-[rgba(212,175,55,0.4)] shadow-2xl p-4 animate-in slide-in-from-top-4 bg-[linear-gradient(135deg,#FAF9F6,#F0E8E0)] dark:bg-[linear-gradient(135deg,#1A0A10,#2D1218)]" // check-colors-ignore
        role="alert"
      >
        <div className="flex items-start gap-3">
          {/* أيقونة نابضة */}
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.35)]"
            style={{ background: "linear-gradient(135deg, #800020, #A02040)" }}
          >
            <Icon name={meta.icon} size={19} className="text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-amiri text-lg font-bold text-burgundy leading-snug truncate">{n.title}</p>
            {n.body && <p className="font-readex text-xs text-muted-foreground leading-relaxed line-clamp-2">{n.body}</p>}
          </div>
          <button
            onClick={close}
            aria-label="إغلاق"
            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground btn-press shrink-0"
          >
            <Icon name="x" size={13} />
          </button>
        </div>
        {(() => {
          const meetingUrl =
            n.type === "session_reminder" &&
            n.payload != null &&
            typeof n.payload === "object" &&
            "meetingUrl" in n.payload &&
            typeof (n.payload as Record<string, unknown>).meetingUrl === "string"
              ? (n.payload as Record<string, unknown>).meetingUrl as string
              : null;

          return (
            <div className="flex gap-2 mt-3">
              {meetingUrl ? (
                <a
                  href={meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={close}
                  className="flex-1 py-2.5 rounded-xl font-readex text-xs font-extrabold btn-press transition shadow-sm text-center"
                  style={{ background: "#D4AF37", color: "#12080D" }}
                >
                  انضم الآن
                </a>
              ) : (
                <button
                  onClick={() => { close(); navigate(`${listPath}/${n.id}`); }}
                  className="flex-1 py-2.5 rounded-xl font-readex text-xs font-extrabold btn-press transition shadow-sm"
                  style={{ background: "#D4AF37", color: "#12080D" }}
                >
                  {("primaryActionLabel" in n && n.primaryActionLabel) || "عرض التفاصيل"}
                </button>
              )}
              <button
                onClick={close}
                className="flex-1 py-2.5 rounded-xl border border-gold/50 font-readex text-xs font-extrabold text-burgundy hover:bg-gold/10 btn-press transition"
              >
                تأجيل
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
