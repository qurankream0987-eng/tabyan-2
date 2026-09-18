import { Link, useLocation, useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { authStore } from "@/lib/auth";
import { useState } from "react";
import AdminGateModal from "./AdminGateModal";
import Icon from "./Icon";
import type { IconName } from "./Icon";

export type SidebarItem = { to: string; label: string; icon?: IconName };

export default function RoleSidebar({ open, onClose, items, title }: {
  open: boolean; onClose: () => void; items: SidebarItem[]; title: string;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [gateOpen, setGateOpen] = useState(false);
  const [shown, setShown] = useState(false);

  if (!open) return null;

  // Trigger transition on next frame
  requestAnimationFrame(() => setShown(true));

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[90] bg-black/45 backdrop-blur-sm transition-opacity duration-300",
          shown ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed top-0 right-0 bottom-0 z-[95] w-72 flex flex-col overflow-y-auto transition-transform duration-300 ease-out",
          "bg-card/97 backdrop-blur-2xl border-l border-border shadow-2xl",
          shown ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-border">
          <img
            src="/logo.png" alt="تبيان"
            className="h-10 w-auto rounded-lg logo-light dark:hidden"
          />
          <img
            src="/logo.png" alt="تبيان"
            className="h-10 w-auto rounded-lg hidden dark:block logo-dark"
          />
          <div>
            <h2 className="font-amiri text-lg text-burgundy font-bold leading-tight">{title}</h2>
            {authStore.name && (
              <p className="font-readex text-xs text-muted-foreground truncate">{authStore.name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ms-auto w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition"
            aria-label="إغلاق"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {items.map((it) => {
            const active = pathname === it.to || pathname.startsWith(it.to + "/");
            return (
              <Link
                key={it.to}
                to={it.to}
                onClick={onClose}
                className={cn(
                  "relative flex items-center gap-3 rounded-2xl px-4 py-3 font-readex font-bold text-sm transition-all",
                  active
                    ? "bg-burgundy text-white dark:bg-gold dark:text-night shadow-bubble"
                    : "text-foreground hover:bg-burgundy/5 dark:hover:bg-gold/8"
                )}
              >
                {it.icon && <Icon name={it.icon} size={18} className="shrink-0" />}
                <span className="flex-1">{it.label}</span>
                {active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-gold dark:bg-night/60" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="border-t border-border p-3 space-y-0.5">
          <button
            onClick={() => setGateOpen(true)}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 font-readex font-bold text-sm text-burgundy hover:bg-gold/8 transition btn-press"
          >
            <Icon name="shield" size={18} className="shrink-0" />
            بوابة الإشراف
          </button>
          <button
            onClick={() => { authStore.clear(); navigate("/"); onClose(); }}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 font-readex font-bold text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition btn-press"
          >
            <Icon name="logout" size={18} className="shrink-0" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <AdminGateModal open={gateOpen} onClose={() => setGateOpen(false)} />
    </>
  );
}
