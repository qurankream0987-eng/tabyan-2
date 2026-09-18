import { Outlet } from "react-router";
import AppHeader from "../AppHeader";
import StudentBottomNav from "../StudentBottomNav";
import NotificationBanner from "../NotificationBanner";

export default function StudentShell() {
  return (
    <div className="min-h-screen relative">
      <AppHeader homeTo="/student/home" unread={2} />
      <NotificationBanner listPath="/student/notifications" />
      <main className="max-w-lg mx-auto px-4 pt-5 pb-32">
        <Outlet />
      </main>
      <StudentBottomNav />
    </div>
  );
}
