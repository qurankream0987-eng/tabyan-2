import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { authStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import Icon, { type IconName } from "./Icon";
import AdminGateModal from "./AdminGateModal";
import TeacherRegisterFlow from "./TeacherRegisterFlow";
import { InitialsAvatar } from "./CircularUserCard";

type DrawerItem = { to: string; label: string; icon: IconName };

const MAIN_ITEMS: DrawerItem[] = [
  { to: "/student/account",    label: "الملف الشخصي",     icon: "user"        },
  { to: "/student/schedule",   label: "الجدول الأسبوعي", icon: "calendar"    },
  { to: "/student/progress",   label: "تقدمي",             icon: "chart"       },
  { to: "/student/recordings", label: "حلقاتي المسجلة",   icon: "video"       },
  { to: "/student/library",    label: "مكتبتي",            icon: "library"     },
  { to: "/student/fatwa",      label: "فتاواي",            icon: "scale"       },
  { to: "/student/ijazat",     label: "إجازاتي",           icon: "certificate" },
];

const SECONDARY_ITEMS: DrawerItem[] = [
  { to: "/student/account",       label: "الإعدادات",      icon: "settings" },
  { to: "/student/notifications", label: "الإشعارات",      icon: "bell"     },
  { to: "/student/help",          label: "المساعدة والدعم", icon: "help"     },
];

export default function StudentDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [gateOpen, setGateOpen] = useState(false);
  const [teacherAuthOpen, setTeacherAuthOpen] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("keydown", onKey);
      setShown(false);
    };
  }, [open, onClose]);

  // قفل تمرير الخلفية أثناء فتح القائمة: تقنية position:fixed تُخرج body من سياق التمرير
  // تماماً (يمنع body/document/touch scroll والحركة الأفقية) مع حفظ موضع الصفحة واستعادته
  // عند الإغلاق — والقائمة نفسها تبقى قابلة للتمرير لأنها حاوية fixed مستقلة بـ overflow-y-auto
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position, top: body.style.top, width: body.style.width,
      overflow: body.style.overflow, overscroll: body.style.overscrollBehavior,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      body.style.overscrollBehavior = prev.overscroll;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open) return null;

  const logout = async () => {
    onClose();
    await api.logout();
    authStore.clear();
    navigate("/");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) => cn(
    "flex items-center gap-3 rounded-2xl px-4 py-3 font-readex font-bold text-sm transition-all",
    isActive
      ? "bg-burgundy text-white dark:bg-gold dark:text-night shadow-bubble"
      : "text-foreground hover:bg-burgundy/5 dark:hover:bg-gold/8"
  );

  return (
    <>
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-300",
            shown ? "opacity-100" : "opacity-0"
          )}
          onClick={onClose}
        />

        {/* Panel */}
        <aside className={cn(
          "absolute top-0 right-0 bottom-0 w-72 flex flex-col transition-transform duration-300 ease-out overflow-y-auto",
          "bg-card/97 backdrop-blur-2xl border-l border-border shadow-2xl",
          shown ? "translate-x-0" : "translate-x-full"
        )}>

          {/* Header — user info */}
          <div className="p-5 border-b border-border">
            <div className="flex items-center gap-3 mb-0">
              {authStore.name
                ? <InitialsAvatar name={authStore.name} size={44} />
                : (
                  <div className="w-11 h-11 rounded-full icon-bubble text-burgundy">
                    <Icon name="user" size={20} />
                  </div>
                )
              }
              <div className="min-w-0 flex-1">
                <p className="font-amiri text-lg text-burgundy font-bold leading-tight truncate">
                  {authStore.name ?? "زائر"}
                </p>
                <p className="text-xs text-muted-foreground font-readex truncate">
                  {authStore.isDemo ? "وضع العرض" : "طالب"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition shrink-0"
                aria-label="إغلاق"
              >
                <Icon name="x" size={15} />
              </button>
            </div>

            {authStore.isDemo && (
              <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-gold/10 border border-gold/20 px-3 py-2">
                <Icon name="star" size={12} className="text-gold shrink-0" />
                <span className="font-readex text-xs text-burgundy font-bold">وضع العرض التجريبي</span>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {MAIN_ITEMS.map((it) => (
              <NavLink key={it.label} to={it.to} onClick={onClose} className={linkClass}>
                <span className="w-7 flex items-center justify-center shrink-0 text-current opacity-70">
                  <Icon name={it.icon} size={18} />
                </span>
                {it.label}
              </NavLink>
            ))}

            <div className="border-t border-border my-2" />

            {SECONDARY_ITEMS.map((it) => (
              <NavLink key={it.label} to={it.to} onClick={onClose} className={linkClass}>
                <span className="w-7 flex items-center justify-center shrink-0 text-current opacity-70">
                  <Icon name={it.icon} size={18} />
                </span>
                {it.label}
              </NavLink>
            ))}

            <div className="border-t border-border my-2" />

            <button
              onClick={() => { onClose(); setTeacherAuthOpen(true); }}
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 font-readex font-bold text-sm text-burgundy hover:bg-burgundy/6 dark:hover:bg-gold/8 transition btn-press"
            >
              <span className="w-7 flex items-center justify-center shrink-0 opacity-70">
                <Icon name="clipboard" size={18} />
              </span>
              التسجيل كمعلم
            </button>

            <button
              onClick={() => setGateOpen(true)}
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 font-readex font-bold text-sm text-burgundy hover:bg-gold/10 transition btn-press"
            >
              <span className="w-7 flex items-center justify-center shrink-0 opacity-70">
                <Icon name="shield" size={18} />
              </span>
              بوابة الإشراف
            </button>
          </nav>

          {/* Footer logout */}
          <div className="border-t border-border p-3">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 font-readex font-bold text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition btn-press"
            >
              <span className="w-7 flex items-center justify-center shrink-0">
                <Icon name="logout" size={18} />
              </span>
              تسجيل الخروج
            </button>
          </div>
        </aside>
      </div>

      <AdminGateModal open={gateOpen} onClose={() => setGateOpen(false)} />
      <TeacherRegisterFlow open={teacherAuthOpen} onClose={() => setTeacherAuthOpen(false)} />
    </>
  );
}
