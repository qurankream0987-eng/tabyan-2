import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(root, relative));
const registry = JSON.parse(read("lib/tabyan-domain/product-registry.json"));
const errors = [];

function expect(condition, message) {
  if (!condition) errors.push(message);
}

// Mobile's error-state convention is `if (query.error) ...` (a truthy check on
// the query/mutation result's `error` field), not React Query's separate
// `isError` boolean — confirmed across every current mobile screen.
const hasErrorState = (source) => /\.error\b/.test(source) || source.includes("isError");
const hasFormSurface = (source) => source.includes("FormField") || source.includes("TextInput");
const questionTypeCheck = (source, type) => new RegExp(`questionType\\s*===\\s*["']${type}["']`).test(source);

const screens = [
  {
    feature: "quran_tracks",
    web: "artifacts/tabyan/src/pages/student/PathSelection.tsx",
    mobile: "artifacts/mobile/app/student/quran.tsx",
    data: ["student.paths"],
    noEmptyState: true, // fixed 3-item path menu, never empty
  },
  {
    feature: "levels",
    web: "artifacts/tabyan/src/pages/student/Levels.tsx",
    mobile: "artifacts/mobile/app/student/levels/[pathId].tsx",
    data: ["student.levels"],
  },
  {
    feature: "library",
    web: [
      "artifacts/tabyan/src/pages/student/Library.tsx",
      "artifacts/tabyan/src/pages/student/BookDetails.tsx",
    ],
    mobile: ["artifacts/mobile/app/student/(tabs)/library.tsx", "artifacts/mobile/app/student/library/[id].tsx"],
    data: ["library.browse", "library.toggleBookmark", "library.detail"],
    checks: ["section"],
  },
  {
    feature: "fatwa_list_public",
    web: "artifacts/tabyan/src/pages/student/FatwaPublic.tsx",
    mobile: ["artifacts/mobile/app/student/fatwas.tsx", "artifacts/mobile/app/student/fatwa/[id].tsx"],
    data: ["fatwa.publicList", "fatwa.publicDetail"],
    checks: ["category"],
  },
  {
    feature: "fatwa_ask",
    web: "artifacts/tabyan/src/pages/student/FatwaAsk.tsx",
    mobile: "artifacts/mobile/app/student/(tabs)/fatwa.tsx",
    data: ["fatwa.ask"],
    form: true,
  },
  {
    feature: "notification_detail",
    web: "artifacts/tabyan/src/pages/shared/NotificationDetails.tsx",
    mobile: ["artifacts/mobile/app/student/notifications/[id].tsx", "artifacts/mobile/components/notification-detail.tsx"],
    data: ["notifications.byId"],
  },
  {
    feature: "notification_settings",
    web: "artifacts/tabyan/src/pages/shared/NotificationSettings.tsx",
    mobile: ["artifacts/mobile/app/student/notifications/settings.tsx", "artifacts/mobile/components/notification-settings.tsx"],
    data: ["notifications.getSettings", "notifications.updateSettings", "notifications.clearRead"],
  },
  {
    feature: "progress",
    web: "artifacts/tabyan/src/pages/student/StudentProgress.tsx",
    mobile: "artifacts/mobile/app/student/progress.tsx",
    data: ["student.progress"],
  },
  {
    feature: "teacher_dashboard",
    web: "artifacts/tabyan/src/pages/teacher/TeacherHome.tsx",
    mobile: "artifacts/mobile/app/teacher/index.tsx",
    data: ["teacher.dashboard"],
    noEmptyState: true, // hero/stats/nav-tile dashboard, never empty
  },
  {
    feature: "teacher_evaluations",
    web: "artifacts/tabyan/src/pages/teacher/PendingEvaluations.tsx",
    mobile: "artifacts/mobile/app/teacher/evaluations.tsx",
    data: ["teacher.pendingEvaluations"],
  },
  {
    feature: "teacher_evaluate",
    web: "artifacts/tabyan/src/pages/teacher/Evaluate.tsx",
    mobile: "artifacts/mobile/app/teacher/evaluate/[sessionId].tsx",
    data: ["teacher.sessionRoom", "teacher.evaluate"],
  },
  {
    feature: "teacher_kyc",
    web: "artifacts/tabyan/src/pages/teacher/TeacherOnboarding.tsx",
    mobile: "artifacts/mobile/app/teacher/onboarding.tsx",
    data: ["teacher.kycStatus", "teacher.startAssessment", "teacher.submitKyc"],
    checks: ["teacherRoleGate"],
  },
  {
    feature: "tajweed_correction",
    web: "artifacts/tabyan/src/pages/student/Placement.tsx",
    mobile: "artifacts/mobile/app/student/placement.tsx",
    data: ["student.placementStatus", "student.submitPlacement"],
  },
  {
    feature: "sharia_levels",
    web: [
      "artifacts/tabyan/src/pages/student/ShariaLevel.tsx",
      "artifacts/tabyan/src/pages/student/ShariaViewer.tsx",
    ],
    mobile: [
      "artifacts/mobile/app/student/sharia/[subject].tsx",
      "artifacts/mobile/app/student/sharia/[subject]/[level].tsx",
      "artifacts/mobile/app/student/sharia/[subject]/content.tsx",
    ],
    data: ["sharia.subjects", "sharia.levelContent", "sharia.content", "sharia.updateContentProgress"],
  },
  {
    feature: "sharia_exam",
    web: "artifacts/tabyan/src/pages/student/ShariaExam.tsx",
    mobile: "artifacts/mobile/app/student/sharia/[subject]/exam.tsx",
    data: ["sharia.exam", "sharia.submitExam"],
    checks: ["route", "entryPoint", "contentEntryPoint", "questionTypes", "payloadContract", "studentGate", "studentProcedure", "submitExam", "attemptsRemaining", "serverResult"],
  },
  {
    feature: "islamic_lessons",
    web: "artifacts/tabyan/src/pages/student/ShariaSubjects.tsx",
    mobile: "artifacts/mobile/app/student/sharia.tsx",
    data: ["sharia.summary", "sharia.subjects"],
  },
  {
    feature: "notifications",
    web: "artifacts/tabyan/src/pages/shared/Notifications.tsx",
    mobile: ["artifacts/mobile/app/student/notifications.tsx", "artifacts/mobile/components/notification-feed.tsx"],
    data: ["notifications.list", "notifications.unreadCount"],
  },
  {
    feature: "account",
    web: "artifacts/tabyan/src/pages/student/StudentAccount.tsx",
    mobile: "artifacts/mobile/app/student/(tabs)/account.tsx",
    data: ["auth.me"],
    noEmptyState: true, // fixed profile card + navigation tiles, never empty
  },
  {
    feature: "teacher_students",
    web: "artifacts/tabyan/src/pages/teacher/MyStudents.tsx",
    mobile: "artifacts/mobile/app/teacher/students.tsx",
    data: ["teacher.myStudents"],
  },
  {
    feature: "teacher_schedule",
    web: "artifacts/tabyan/src/pages/teacher/TeacherSchedule.tsx",
    mobile: "artifacts/mobile/app/teacher/schedule.tsx",
    data: ["teacher.schedule"],
  },
];

const files = (value) => value ? (Array.isArray(value) ? value : [value]) : [];
const teacherLayout = read("artifacts/mobile/app/teacher/_layout.tsx");

for (const screen of screens) {
  const webFiles = files(screen.web);
  const mobileFiles = files(screen.mobile);
  for (const file of webFiles) expect(exists(file), `${screen.feature}: Web screen missing (${file})`);
  for (const file of mobileFiles) expect(exists(file), `${screen.feature}: Mobile screen missing (${file})`);
  if (mobileFiles.some((file) => !exists(file)) || webFiles.some((file) => !exists(file))) continue;
  if (!webFiles.length && !screen.allowWebMissing) {
    errors.push(`${screen.feature}: Web screen missing`);
    continue;
  }

  const web = webFiles.map(read).join("\n");
  const mobile = mobileFiles.map(read).join("\n");
  for (const source of screen.data) {
    const [namespace, procedure] = source.split(".");
    if (webFiles.length) expect(web.includes(`${namespace}.${procedure}`), `${screen.feature}: Web missing ${source}`);
    expect(mobile.includes(`${namespace}.${procedure}`), `${screen.feature}: Mobile missing ${source}`);
  }
  if (screen.form) {
    expect(mobile.includes("isPending"), `${screen.feature}: Mobile has no pending state`);
    expect(hasErrorState(mobile), `${screen.feature}: Mobile has no error state`);
    expect(hasFormSurface(mobile), `${screen.feature}: Mobile has no form surface`);
  } else {
    expect(mobile.includes("isLoading"), `${screen.feature}: Mobile has no loading state`);
    expect(hasErrorState(mobile), `${screen.feature}: Mobile has no error state`);
  }
  expect(
    screen.form || screen.noEmptyState || mobile.includes("EmptyBlock") || mobile.includes("EmptyState") || /لا (توجد|نتائج|تقدم|طلاب|دروس|إشعارات|مواد)|تعذر/.test(mobile),
    `${screen.feature}: Mobile has no explicit empty/error surface`,
  );
  for (const check of screen.checks ?? []) {
    if (check === "section") expect(mobile.includes("section"), `${screen.feature}: section filter is missing`);
    if (check === "category") expect(mobile.includes("categoryLabel"), `${screen.feature}: category label is missing`);
    if (check === "teacherRoleGate") {
      expect(
        /role\s*!==\s*["']teacher["']|role\s*===\s*["']teacher["']/.test(teacherLayout),
        `${screen.feature}: teacher role gate is missing from app/teacher/_layout.tsx`,
      );
    }
    if (check === "route") {
      expect(read("artifacts/tabyan/src/App.tsx").includes('path="sharia/exam/:levelId"'), `${screen.feature}: Web route is missing`);
    }
    if (check === "entryPoint") {
      expect(read("artifacts/tabyan/src/pages/student/ShariaLevel.tsx").includes("/student/sharia/exam/"), `${screen.feature}: level entry point is missing`);
    }
    if (check === "contentEntryPoint") {
      expect(read("artifacts/tabyan/src/pages/student/ShariaViewer.tsx").includes("/student/sharia/exam/"), `${screen.feature}: content entry point is missing`);
    }
    if (check === "questionTypes") {
      expect(questionTypeCheck(web, "multiple_choice") && questionTypeCheck(web, "true_false") && questionTypeCheck(web, "fill_blank"), `${screen.feature}: Web question type controls are incomplete`);
      expect(questionTypeCheck(mobile, "true_false") && questionTypeCheck(mobile, "fill_blank"), `${screen.feature}: Mobile question type controls are incomplete`);
    }
    if (check === "payloadContract") {
      const submitStart = web.indexOf("submitExam.mutate");
      const submitBlock = submitStart >= 0 ? web.slice(submitStart, submitStart + 600) : "";
      expect(submitBlock.includes("levelId") && submitBlock.includes("answers: questions.map"), `${screen.feature}: answer payload does not match the server contract`);
      expect(!submitBlock.includes("score:"), `${screen.feature}: client-supplied score must not be submitted`);
    }
    if (check === "studentGate") {
      expect(web.includes("isStudentSession") && web.includes("enabled: canQuery"), `${screen.feature}: Web student gate is missing`);
    }
    if (check === "studentProcedure") {
      expect(read("lib/tabyan-trpc/src/routers/sharia.ts").includes("exam: studentProcedure"), `${screen.feature}: server studentProcedure gate is missing`);
    }
    if (check === "submitExam") {
      expect(web.includes("submitExam.mutate"), `${screen.feature}: Web submit flow is missing`);
    }
    if (check === "attemptsRemaining") {
      expect(web.includes("attemptsRemaining") && mobile.includes("attemptsRemaining"), `${screen.feature}: attempt limits are not rendered`);
    }
    if (check === "serverResult") {
      expect(web.includes("setResult(nextResult)") && web.includes("onSuccess"), `${screen.feature}: server result is not consumed`);
    }
  }
}

// Levels: canonical path order/labels now live in a local PATH_META map
// (registry-literal binding was removed during the Mobile visual redesign),
// but the data must still agree with the shared registry's path order.
const levels = read("artifacts/mobile/app/student/levels/[pathId].tsx");
for (const key of registry.pathOrder) {
  expect(levels.includes(`${key}:`), `levels: PATH_META is missing the registry path "${key}"`);
}
expect(levels.includes("l.isCurrent"), "levels: current-level business state is not rendered");
expect(levels.includes("l.aqeedahRequirement"), "levels: prerequisite business state is not rendered");

// Fatwa: "ask + my own questions" and "public list" now live in two files.
const fatwaTab = read("artifacts/mobile/app/student/(tabs)/fatwa.tsx");
const fatwaPublicList = read("artifacts/mobile/app/student/fatwas.tsx");
const fatwaDetail = read("artifacts/mobile/app/student/fatwa/[id].tsx");
expect(fatwaTab.includes("fatwa.myFatwas"), "fatwa: own-question source is missing");
expect(fatwaPublicList.includes("fatwa.publicList"), "fatwa: public list source is missing");
expect(fatwaDetail.includes("fatwa.publicDetail"), "fatwa: detail source is missing");
expect(fatwaDetail.includes("!!token") && fatwaDetail.includes("!!id"), "fatwa: detail is not gated on an authenticated session and a valid id");

const teacherScreens = [
  ["teacher_students", "artifacts/mobile/app/teacher/students.tsx"],
  ["teacher_schedule", "artifacts/mobile/app/teacher/schedule.tsx"],
];
for (const [feature] of teacherScreens) {
  // Role gating for the whole /teacher subtree is centralized once in
  // app/teacher/_layout.tsx; individual screens no longer re-check the role.
  expect(
    /role\s*!==\s*["']teacher["']|role\s*===\s*["']teacher["']/.test(teacherLayout),
    `${feature}: role gate is missing from app/teacher/_layout.tsx`,
  );
}

expect(
  registry.features.mushaf.mobileAvailability === true &&
    registry.features.mushaf.releaseVisibility === "current",
  "mushaf: Native reader must be enabled after the Stage 6 gate",
);
expect(
  registry.features.recitation.mobileAvailability === false &&
    registry.features.recitation.releaseVisibility === "blocked_until_native_reader",
  "recitation: Mobile availability must remain blocked until the Native reader/recitation gate",
);
// Mushaf is deliberately excluded from the student bottom tab bar until the
// QCF/native-reader assets return, but the route itself must stay reachable
// (Expo Router file kept, just not registered as a Tabs.Screen).
expect(exists("artifacts/mobile/app/student/(tabs)/mushaf-fahd.tsx"), "mushaf: Native route file must stay reachable even while hidden from the tab bar");
const studentTabsLayout = read("artifacts/mobile/app/student/(tabs)/_layout.tsx");
expect(!/<Tabs\.Screen\s+name="mushaf/.test(studentTabsLayout), "mushaf: must not be registered as a student bottom tab yet");

if (errors.length) {
  console.error(`Screen parity: FAIL\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Screen parity: PASS");
console.log(`Audited screens: ${screens.length}`);
console.log("Data, loading/error/empty, role gates, and Native reader gate: PASS");
