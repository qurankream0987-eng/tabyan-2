import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TRPCProvider } from "@/providers/trpc";
import { lazy, Suspense, useState, useCallback, useEffect } from "react";
import ToastHost from "@/components/app/Toast";
import SplashScreen from "@/components/app/SplashScreen";
import { initPrayerNotifications } from "@/lib/prayer-notifications";
import { authStore } from "@/lib/auth";

// layouts & shared
const GuestHome = lazy(() => import("@/pages/GuestHome"));
const NotFound = lazy(() => import("@/pages/not-found"));
const StudentShell = lazy(() => import("@/components/app/layouts/StudentShell"));
const TeacherShell = lazy(() => import("@/components/app/layouts/TeacherShell"));
const AdminShell = lazy(() => import("@/components/app/layouts/AdminShell"));
const SessionRoomLayout = lazy(() => import("@/components/app/layouts/SessionRoomLayout"));
const Notifications = lazy(() => import("@/pages/shared/Notifications"));
const NotificationDetails = lazy(() => import("@/pages/shared/NotificationDetails"));
const NotificationSettings = lazy(() => import("@/pages/shared/NotificationSettings"));

// student
const Placement = lazy(() => import("@/pages/student/Placement"));
const QuranMenu = lazy(() => import("@/pages/student/QuranMenu"));
const Tilawah = lazy(() => import("@/pages/student/Tilawah"));
const Pending = lazy(() => import("@/pages/student/Pending"));
const PathSelection = lazy(() => import("@/pages/student/PathSelection"));
const Levels = lazy(() => import("@/pages/student/Levels"));
const ShariaSubjects = lazy(() => import("@/pages/student/ShariaSubjects"));
const ShariaLevel = lazy(() => import("@/pages/student/ShariaLevel"));
const ShariaExam = lazy(() => import("@/pages/student/ShariaExam"));
const ShariaViewer = lazy(() => import("@/pages/student/ShariaViewer"));
const ShariaCertificate = lazy(() => import("@/pages/student/ShariaCertificate"));
const Booking = lazy(() => import("@/pages/student/Booking"));
const StudentSchedule = lazy(() => import("@/pages/student/StudentSchedule"));
const StudentHome = lazy(() => import("@/pages/student/StudentHome"));
const StudentSessionRoom = lazy(() => import("@/pages/student/StudentSessionRoom"));
const StudentRecordings = lazy(() => import("@/pages/student/StudentRecordings"));
const Library = lazy(() => import("@/pages/student/Library"));
const BookDetails = lazy(() => import("@/pages/student/BookDetails"));
const FatwaAsk = lazy(() => import("@/pages/student/FatwaAsk"));
const FatwaPublic = lazy(() => import("@/pages/student/FatwaPublic"));
const StudentAccount = lazy(() => import("@/pages/student/StudentAccount"));
const StudentProgress = lazy(() => import("@/pages/student/StudentProgress"));
const StudentIjazat = lazy(() => import("@/pages/student/StudentIjazat"));
const StudentHelp = lazy(() => import("@/pages/student/StudentHelp"));
const MushafFahd = lazy(() => import("@/pages/student/MushafFahd"));
const PrayerTimes = lazy(() => import("@/pages/student/PrayerTimes"));
const Qibla = lazy(() => import("@/pages/student/Qibla"));
const RecitationHistory = lazy(() => import("@/pages/student/RecitationHistory"));
const RecitationConnectivityGate = lazy(() => import("@/pages/student/RecitationConnectivityGate"));

// teacher
const TeacherOnboarding = lazy(() => import("@/pages/teacher/TeacherOnboarding"));
const TeacherHome = lazy(() => import("@/pages/teacher/TeacherHome"));
const TeacherSchedule = lazy(() => import("@/pages/teacher/TeacherSchedule"));
const TeacherSessionRoom = lazy(() => import("@/pages/teacher/TeacherSessionRoom"));
const Evaluate = lazy(() => import("@/pages/teacher/Evaluate"));
const PendingEvaluations = lazy(() => import("@/pages/teacher/PendingEvaluations"));
const MyStudents = lazy(() => import("@/pages/teacher/MyStudents"));
const StudentProfile = lazy(() => import("@/pages/teacher/StudentProfile"));
const TeacherRecordings = lazy(() => import("@/pages/teacher/TeacherRecordings"));
const TeacherFatwas = lazy(() => import("@/pages/teacher/TeacherFatwas"));
const TeacherSettings = lazy(() => import("@/pages/teacher/TeacherSettings"));
const TeacherBroadcast = lazy(() => import("@/pages/teacher/TeacherBroadcast"));

// admin
const AdminHome = lazy(() => import("@/pages/admin/AdminHome"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminAccounts = lazy(() => import("@/pages/admin/AdminAccounts"));
const AdminSchedules = lazy(() => import("@/pages/admin/AdminSchedules"));
const AdminLibrary = lazy(() => import("@/pages/admin/AdminLibrary"));
const AdminQiraat = lazy(() => import("@/pages/admin/AdminQiraat"));
const AdminPromotions = lazy(() => import("@/pages/admin/AdminPromotions"));
const AdminLevels = lazy(() => import("@/pages/admin/AdminLevels"));
const AdminSharia = lazy(() => import("@/pages/admin/AdminSharia"));
const AdminTeachersReview = lazy(() => import("@/pages/admin/AdminTeachersReview"));
const AdminStudentsReview = lazy(() => import("@/pages/admin/AdminStudentsReview"));
const AdminFatwas = lazy(() => import("@/pages/admin/AdminFatwas"));
const AdminMuftis = lazy(() => import("@/pages/admin/AdminMuftis"));
const AdminAssessments = lazy(() => import("@/pages/admin/AdminAssessments"));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminNotifications = lazy(() => import("@/pages/admin/AdminNotifications"));
const AdminSessionsMonitoring = lazy(() => import("@/pages/admin/AdminSessionsMonitoring"));
const AdminSessionRoom = lazy(() => import("@/pages/admin/AdminSessionRoom"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminAuditLog = lazy(() => import("@/pages/admin/AdminAuditLog"));

export default function App() {
  // شاشة الترحيب للمستخدم الجديد فقط: القرار يعتمد على حالة الحساب لا على الجهاز وحده —
  // من له جلسة، أو سبق لحساب حقيقي الدخول على هذا الجهاز (يبقى بعد Logout)، أو رآها سابقاً، لا تُعرض له
  const [showSplash, setShowSplash] = useState(() => {
    try {
      // الضيف يبدأ من شاشة الترحيب؛ فتح الدخول الصريح أصبح من زرها أو من الهيدر.
      if (new URLSearchParams(window.location.search).get("auth") === "login") return false;
      // المصحف صفحة قراءة عامة؛ لا نغطيه بشاشة البداية عند فتح رابطه مباشرة.
      const path = window.location.pathname.replace(/\/+$/, "");
      if (path.endsWith("/student/mushaf-fahd")) return false;
      return !authStore.token && !authStore.hasKnownAccount && !localStorage.getItem("tabyan.splashSeen");
    } catch {
      return true;
    }
  });
  const onSplashDone = useCallback(() => {
    try { localStorage.setItem("tabyan.splashSeen", "1"); } catch { /* التخزين ممتلئ/محظور */ }
    setShowSplash(false);
  }, []);

  // تنبيهات مواقيت الصلاة: تعيد الجدولة عند الإقلاع إن كانت الميزة مفعّلة والإذن ممنوحاً
  useEffect(() => { void initPrayerNotifications(); }, []);

  return (
    <TRPCProvider>
      <TooltipProvider>
        {showSplash && <SplashScreen onDone={onSplashDone} />}
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center"><div className="w-10 h-10 border-4 border-burgundy dark:border-gold border-t-transparent rounded-full animate-spin"></div></div>}>
            <Routes>
              <Route path="/" element={<GuestHome />} />

              {/* student */}
              <Route path="/student" element={<StudentShell />}>
                <Route index element={<Navigate to="/student/home" replace />} />
                <Route path="home" element={<StudentHome />} />
                <Route path="placement" element={<Placement />} />
                <Route path="quran" element={<QuranMenu />} />
                <Route path="tilawah" element={<Tilawah />} />
                <Route path="pending" element={<Pending />} />
                <Route path="path" element={<PathSelection />} />
                <Route path="levels/:pathId" element={<Levels />} />
                <Route path="sharia" element={<ShariaSubjects />} />
                <Route path="sharia/:subject" element={<ShariaLevel />} />
                <Route path="sharia/level/:levelId" element={<ShariaLevel />} />
                <Route path="sharia/exam/:levelId" element={<ShariaExam />} />
                <Route path="sharia/content/:contentId" element={<ShariaViewer />} />
                <Route path="sharia/certificate/:levelId" element={<ShariaCertificate />} />
                <Route path="booking" element={<Booking />} />
                <Route path="schedule" element={<StudentSchedule />} />
                <Route path="recordings" element={<StudentRecordings />} />
                <Route path="library" element={<Library />} />
                <Route path="library/book/:id" element={<BookDetails />} />
                <Route path="library/book/:id/read" element={<BookDetails />} />
                <Route path="fatwa" element={<FatwaAsk />} />
                <Route path="fatwa/:id" element={<FatwaAsk />} />
                <Route path="fatwas" element={<FatwaPublic />} />
                <Route path="notifications" element={<Notifications base="/student" />} />
                <Route path="notifications/settings" element={<NotificationSettings base="/student" />} />
                <Route path="notifications/:id" element={<NotificationDetails base="/student" />} />
                <Route path="account" element={<StudentAccount />} />
                <Route path="progress" element={<StudentProgress />} />
                <Route path="ijazat" element={<StudentIjazat />} />
                <Route path="help" element={<StudentHelp />} />
                <Route path="mushaf-fahd" element={<MushafFahd />} />
                <Route path="recitation/history" element={<RecitationHistory />} />
                <Route path="recitation/connectivity-gate" element={<RecitationConnectivityGate />} />
                <Route path="prayer-times" element={<PrayerTimes />} />
                <Route path="qibla" element={<Qibla />} />
              </Route>
              <Route path="/student/session/:id" element={<SessionRoomLayout />}>
                <Route index element={<StudentSessionRoom />} />
              </Route>

              {/* teacher */}
              <Route path="/teacher/onboarding" element={<TeacherOnboarding />} />
              <Route path="/teacher" element={<TeacherShell />}>
                <Route index element={<TeacherHome />} />
                <Route path="schedule" element={<TeacherSchedule />} />
                <Route path="evaluate/:sessionId" element={<Evaluate />} />
                <Route path="evaluations" element={<PendingEvaluations />} />
                <Route path="students" element={<MyStudents />} />
                <Route path="students/:id" element={<StudentProfile />} />
                <Route path="recordings" element={<TeacherRecordings />} />
                <Route path="fatwas" element={<TeacherFatwas />} />
                <Route path="notifications" element={<Notifications base="/teacher" />} />
                <Route path="notifications/settings" element={<NotificationSettings base="/teacher" />} />
                <Route path="notifications/:id" element={<NotificationDetails base="/teacher" />} />
                <Route path="broadcast" element={<TeacherBroadcast />} />
                <Route path="settings" element={<TeacherSettings />} />
              </Route>
              <Route path="/teacher/session/:id" element={<SessionRoomLayout />}>
                <Route index element={<TeacherSessionRoom />} />
              </Route>
              <Route path="/admin/session/:id" element={<SessionRoomLayout />}>
                <Route index element={<AdminSessionRoom />} />
              </Route>

              {/* admin */}
              <Route path="/admin" element={<AdminShell />}>
                <Route index element={<AdminHome />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="accounts" element={<AdminAccounts />} />
                <Route path="schedules" element={<AdminSchedules />} />
                <Route path="sessions-monitoring" element={<AdminSessionsMonitoring />} />
                <Route path="library" element={<AdminLibrary />} />
                <Route path="qiraat" element={<AdminQiraat />} />
                <Route path="promotions" element={<AdminPromotions />} />
                <Route path="levels" element={<AdminLevels />} />
                <Route path="sharia" element={<AdminSharia />} />
                <Route path="teachers-review" element={<AdminTeachersReview />} />
                <Route path="students-review" element={<AdminStudentsReview />} />
                <Route path="fatwas" element={<AdminFatwas />} />
                <Route path="muftis" element={<AdminMuftis />} />
                <Route path="assessments" element={<AdminAssessments />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="inbox" element={<Notifications base="/admin" navPath="/admin/inbox" />} />
                <Route path="inbox/settings" element={<NotificationSettings base="/admin" navPath="/admin/inbox" />} />
                <Route path="inbox/:id" element={<NotificationDetails base="/admin" navPath="/admin/inbox" />} />
                <Route path="audit-log" element={<AdminAuditLog />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
        <ToastHost />
      </TooltipProvider>
    </TRPCProvider>
  );
}
