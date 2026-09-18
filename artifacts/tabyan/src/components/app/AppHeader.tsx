import { useNavigate } from "react-router";
import { useEffect, useRef, useState } from "react";
import { authStore } from "@/lib/auth";
import { InitialsAvatar } from "./CircularUserCard";
import Icon from "./Icon";
import StudentDrawer from "./StudentDrawer";

export function DarkModeToggle() {
  const [dark, setDark] = useState(() => {
    try {
      const stored = localStorage.getItem("tabyan.darkMode");
      return stored === null ? document.documentElement.classList.contains("dark") : stored === "true";
    } catch {
      return document.documentElement.classList.contains("dark");
    }
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try { localStorage.setItem("tabyan.darkMode", String(dark)); } catch { /* التخزين المحلي غير متاح */ }
  }, [dark]);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={() => setDark(!dark)}
      aria-label="الوضع الليلي"
      className="w-10 h-10 rounded-full glass flex items-center justify-center text-burgundy transition-all duration-200 hover:scale-110 hover:shadow-gold active:scale-90"
    >
      <span className="transition-all duration-200">
        <Icon name={dark ? "sun" : "moon"} size={18} />
      </span>
    </button>
  );
}

export default function AppHeader({
  title, showBell = true, onMenuClick, unread = 0, homeTo = "/",
  onLoginClick, loginDropdown,
}: {
  title?: string; showBell?: boolean; onMenuClick?: () => void; unread?: number; homeTo?: string;
  onLoginClick?: () => void;
  loginDropdown?: React.ReactNode;
}) {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const isGuest = !authStore.isLoggedIn;

  const handleMenu = () => {
    if (onMenuClick) onMenuClick();
    else setDrawerOpen(true);
  };

  useEffect(() => {
    if (!dropOpen) return;
    const h = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [dropOpen]);

  const handleUserBtn = () => {
    if (isGuest && loginDropdown) { setDropOpen(v => !v); return; }
    if (isGuest && onLoginClick) { onLoginClick(); return; }
  };

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-gradient-to-b from-background/98 via-background/90 to-transparent pointer-events-none">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center gap-2 sm:gap-3 pointer-events-auto border-b border-[rgba(122,31,61,0.10)] dark:border-[rgba(212,175,55,0.14)]">
          
          {/* Menu / hamburger */}
          <button
            onClick={handleMenu}
            aria-label="القائمة"
            className="w-10 h-10 rounded-full hover:bg-burgundy/8 dark:hover:bg-gold/8 flex items-center justify-center text-burgundy transition-all active:scale-90"
          >
            <Icon name="menu" size={20} />
          </button>

          {/* Title */}
          {title && (
            <span className="font-amiri text-lg text-burgundy hidden sm:inline font-bold">
              {title}
            </span>
          )}

          {/* Demo badge */}
          {authStore.isDemo && (
            <span className="inline-flex items-center gap-1 rounded-full border border-gold/60 bg-gold/12 dark:bg-gold/18 px-2.5 py-1 text-[10px] font-readex font-bold text-burgundy shadow-sm">
              <Icon name="star" size={11} />
              وضع العرض
            </span>
          )}

          <div className="flex-1" />

          {/* Dark mode toggle */}
          <DarkModeToggle />

          {/* Bell */}
          {showBell && (
            <button
              onClick={() => navigate(`${homeTo === "/" ? "" : homeTo}/notifications`.replace("//", "/"))}
              aria-label="الإشعارات"
              className="relative w-10 h-10 rounded-full glass flex items-center justify-center text-burgundy transition-all active:scale-90"
            >
              <Icon name="bell" size={18} />
              {unread > 0 && (
                <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm animate-bounce">
                  {unread}
                </span>
              )}
            </button>
          )}

          {/* User / Login */}
          <div className="relative" ref={dropRef}>
            {isGuest && onLoginClick && !loginDropdown ? (
              <button
                onClick={onLoginClick}
                className="btn-bubble btn-primary-bubble flex items-center gap-1.5 text-sm px-4 py-2"
              >
                <Icon name="user" size={15} />
                <span>دخول</span>
              </button>
            ) : isGuest && loginDropdown ? (
              <>
                <button
                  onClick={handleUserBtn}
                  className="btn-bubble btn-primary-bubble flex items-center gap-1.5 text-sm px-4 py-2"
                >
                  <Icon name="user" size={15} />
                  <span>دخول</span>
                </button>
                {dropOpen && (
                  <div
                    className="absolute left-0 top-full mt-2 w-56 rounded-2xl shadow-xl border border-burgundy/12 dark:border-gold/15 bg-white/97 dark:bg-night-surface/97 backdrop-blur-xl z-50 overflow-hidden"
                    style={{
                      animation: "dropdown-in 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
                    }}
                  >
                    {loginDropdown}
                  </div>
                )}
              </>
            ) : (
              <button className="rounded-full active:scale-90 transition-transform" aria-label="حسابي">
                {authStore.name ? (
                  <InitialsAvatar name={authStore.name} size={40} />
                ) : (
                  <span className="w-10 h-10 rounded-full glass flex items-center justify-center text-burgundy">
                    <Icon name="user" size={18} />
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Dropdown animation keyframe */}
      <style>{`
        @keyframes dropdown-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <StudentDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
