import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "../AppHeader";
import { authStore } from "@/lib/auth";
import NotificationBanner from "../NotificationBanner";
import Icon from "@/components/Icon";
import type { IconName } from "@/components/Icon";

const LINKS: { to: string; label: string; icon: IconName; exact?: boolean }[] = [
  { to: "/admin",                 label: "الرئيسية",          icon: "home",        exact: true },
  { to: "/admin/accounts",        label: "إدارة الحسابات",    icon: "shield"       },
  { to: "/admin/users",           label: "المستخدمون",        icon: "users"        },
  { to: "/admin/schedules",       label: "الجداول والمواعيد", icon: "calendar"     },
  { to: "/admin/sessions-monitoring", label: "متابعة الحلقات",  icon: "video"        },
  { to: "/admin/library",         label: "المكتبة",           icon: "library"      },
  { to: "/admin/qiraat",          label: "إجازات الشاطبية",   icon: "certificate"  },
  { to: "/admin/promotions",      label: "ترقية المستويات",   icon: "graduation"   },
  { to: "/admin/levels",          label: "إدارة المستويات",   icon: "graduation"   },
  { to: "/admin/sharia",          label: "الدروس الشرعية",    icon: "books"        },
  { to: "/admin/students-review", label: "مراجعة الطلاب",     icon: "video"        },
  { to: "/admin/teachers-review", label: "مراجعة المعلمين",   icon: "user"         },
  { to: "/admin/fatwas",          label: "الفتاوى",           icon: "scale"        },
  { to: "/admin/muftis",          label: "المفتون",           icon: "bookmark"     },
  { to: "/admin/assessments",     label: "منشئ التقييمات",    icon: "clipboard"    },
  { to: "/admin/analytics",       label: "التحليلات",         icon: "chart"        },
  { to: "/admin/notifications",   label: "مركز الإشعارات",    icon: "bell"         },
  { to: "/admin/audit-log",       label: "سجل التدقيق",       icon: "clipboard"    },
  { to: "/admin/settings",        label: "الإعدادات",         icon: "settings"     },
];

function Sidebar({ onNav }: { onNav?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="admin-sidebar w-64 shrink-0 flex flex-col h-screen sticky top-0 overflow-y-auto">

      {/* Header */}
      <div className="admin-sidebar-header flex items-center gap-3 p-4">
        <img src="/logo.png" alt="تبيان" className="h-10 w-auto rounded-lg logo-light dark:hidden" />
        <img src="/logo.png" alt="تبيان" className="h-10 w-auto rounded-lg hidden dark:block logo-dark" />
        <div className="min-w-0">
          <h1 className="admin-sidebar-brand-title">لوحة الإشراف</h1>
          <p className="admin-sidebar-brand-sub">مركز التحكم — تبيان</p>
          {authStore.isDemo && (
            <span className="admin-sidebar-demo-badge">وضع العرض</span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="admin-sidebar-nav flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
        {LINKS.map((l) => {
          const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
          return (
            <Link
              key={l.to}
              to={l.to}
              onClick={onNav}
              className={cn("admin-nav-item", active && "admin-nav-item--active")}
            >
              <span className="admin-nav-icon shrink-0">
                <Icon name={l.icon} size={16} />
              </span>
              <span className="flex-1 truncate">{l.label}</span>
              {active && <span className="admin-nav-dot shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="admin-sidebar-footer p-2 space-y-0.5">
        <div className="admin-user-badge flex items-center gap-2 mb-2">
          <span className="admin-user-badge-dot shrink-0" />
          <span className="admin-user-badge-name truncate">{authStore.name ?? "أبو تبيان"}</span>
        </div>
        <button
          onClick={() => { authStore.clear(); navigate("/"); }}
          className="admin-logout-btn w-full flex items-center gap-3"
        >
          <Icon name="logout" size={16} className="shrink-0" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}

export default function AdminShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-shell min-h-screen flex relative">
      <NotificationBanner listPath="/admin/inbox" />

      {/* Desktop sidebar */}
      <div className="hidden lg:block z-10">{<Sidebar />}</div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 z-[95]">
            <Sidebar onNav={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="admin-content flex-1 min-w-0">
        {/* Mobile topbar */}
        <header className="admin-mobile-header sticky top-0 z-40 lg:hidden">
          <div className="px-4 h-14 flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="admin-mobile-menu-btn w-9 h-9 rounded-full flex items-center justify-center transition"
              aria-label="القائمة"
            >
              <Icon name="menu" size={18} />
            </button>
            <span className="admin-mobile-brand">لوحة الإشراف</span>
            <div className="flex-1" />
            <DarkModeToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="admin-main p-4 lg:p-8 max-w-7xl mx-auto">
          <div className="hidden lg:flex justify-end mb-6">
            <DarkModeToggle />
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
