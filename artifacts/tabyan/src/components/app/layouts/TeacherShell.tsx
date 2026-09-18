import { Navigate, Outlet } from "react-router";
import { useState } from "react";
import AppHeader from "../AppHeader";
import RoleSidebar from "../RoleSidebar";
import NotificationBanner from "../NotificationBanner";
import type { IconName } from "@/components/Icon";
import { trpc } from "@/providers/trpc";
import { authStore } from "@/lib/auth";

const ITEMS: { to: string; label: string; icon: IconName }[] = [
  { to: "/teacher", label: "لوحة التحكم", icon: "home" },
  { to: "/teacher/schedule", label: "جدولي", icon: "calendar" },
  { to: "/teacher/students", label: "طلابي", icon: "users" },
  { to: "/teacher/recordings", label: "حلقاتي المُسجَّلة", icon: "video" },
  { to: "/teacher/fatwas", label: "فتاواي", icon: "scale" },
  { to: "/teacher/evaluations", label: "تقييماتي", icon: "chart" },
  { to: "/teacher/broadcast", label: "الإشعارات الجماعية", icon: "bell" },
  { to: "/teacher/settings", label: "الإعدادات", icon: "settings" },
];

export default function TeacherShell() {
  const [open, setOpen] = useState(false);
  const DEMO = authStore.isDemo;
  // بوابة الاعتماد: المعلم غير المُجاز يُوجَّه لصفحة قبول المعلم قبل استخدام أي صفحة تشغيلية
  const kyc = trpc.teacher.kycStatus.useQuery(undefined, { enabled: !DEMO, retry: false });
  if (!DEMO && kyc.data && kyc.data.kycStatus !== "approved") {
    return <Navigate to="/teacher/onboarding" replace />;
  }
  return (
    <div className="min-h-screen relative">
      <AppHeader title="لوحة المعلم" homeTo="/teacher" unread={3} onMenuClick={() => setOpen(true)} />
      <RoleSidebar open={open} onClose={() => setOpen(false)} items={ITEMS} title="لوحة المعلم" />
      <NotificationBanner listPath="/teacher/notifications" />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
