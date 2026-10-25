import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(root, relative));
const registry = JSON.parse(read("packages/domain/product-registry.json"));
const errors = [];

function expect(condition, message) {
  if (!condition) errors.push(message);
}

const screens = [
  {
    feature: "quran_tracks",
    web: "apps/web/src/pages/student/PathSelection.tsx",
    mobile: "apps/mobile/app/paths.tsx",
    data: ["student.paths"],
  },
  {
    feature: "levels",
    web: "apps/web/src/pages/student/Levels.tsx",
    mobile: "apps/mobile/app/levels.tsx",
    data: ["student.levels"],
  },
  {
    feature: "library",
    web: [
      "apps/web/src/pages/student/Library.tsx",
      "apps/web/src/pages/student/BookDetails.tsx",
    ],
    mobile: ["apps/mobile/app/library.tsx", "apps/mobile/app/book-details.tsx"],
    data: ["library.browse", "library.toggleBookmark", "library.detail"],
    checks: ["section"],
  },
  {
    feature: "fatwa_list_public",
    web: "apps/web/src/pages/student/FatwaPublic.tsx",
    mobile: ["apps/mobile/app/fatwas.tsx", "apps/mobile/app/fatwa-public.tsx"],
    data: ["fatwa.publicList", "fatwa.publicDetail"],
    checks: ["category"],
  },
  {
    feature: "fatwa_ask",
    web: "apps/web/src/pages/student/FatwaAsk.tsx",
    mobile: "apps/mobile/app/fatwa-ask.tsx",
    data: ["fatwa.ask"],
    form: true,
  },
  {
    feature: "fatwa_detail",
    web: "apps/web/src/pages/student/FatwaAsk.tsx",
    mobile: "apps/mobile/app/fatwa-detail.tsx",
    data: ["fatwa.detail", "fatwa.rate"],
  },
  {
    feature: "notification_detail",
    web: "apps/web/src/pages/shared/NotificationDetails.tsx",
    mobile: "apps/mobile/app/notification/[id].tsx",
    data: ["notifications.byId"],
  },
  {
    feature: "notification_settings",
    web: "apps/web/src/pages/shared/NotificationSettings.tsx",
    mobile: "apps/mobile/app/notification-settings.tsx",
    data: ["notifications.getSettings", "notifications.updateSettings", "notifications.clearRead"],
  },
  {
    feature: "progress",
    web: "apps/web/src/pages/student/StudentProgress.tsx",
    mobile: "apps/mobile/app/progress.tsx",
    data: ["student.progress"],
  },
  {
    feature: "teacher_dashboard",
    web: "apps/web/src/pages/teacher/TeacherHome.tsx",
    mobile: "apps/mobile/components/teacher-home.tsx",
    data: ["teacher.dashboard"],
  },
  {
    feature: "teacher_evaluations",
    web: "apps/web/src/pages/teacher/PendingEvaluations.tsx",
    mobile: "apps/mobile/app/teacher-evaluations.tsx",
    data: ["teacher.pendingEvaluations"],
  },
  {
    feature: "teacher_evaluate",
    web: "apps/web/src/pages/teacher/Evaluate.tsx",
    mobile: "apps/mobile/app/teacher-evaluate.tsx",
    data: ["teacher.sessionRoom", "teacher.evaluate"],
  },
  {
    feature: "teacher_kyc",
    web: "apps/web/src/pages/teacher/TeacherOnboarding.tsx",
    mobile: "apps/mobile/app/teacher-onboarding.tsx",
    data: ["teacher.kycStatus", "teacher.startAssessment", "teacher.submitKyc"],
    checks: ["TeacherGate"],
  },
  {
    feature: "tajweed_correction",
    web: "apps/web/src/pages/student/Placement.tsx",
    mobile: "apps/mobile/app/placement.tsx",
    data: ["student.placementStatus", "student.submitPlacement"],
  },
  {
    feature: "sharia_levels",
    web: [
      "apps/web/src/pages/student/ShariaLevel.tsx",
      "apps/web/src/pages/student/ShariaViewer.tsx",
    ],
    mobile: ["apps/mobile/app/sharia-level.tsx", "apps/mobile/app/sharia-content.tsx"],
    data: ["sharia.subjects", "sharia.levelContent", "sharia.content", "sharia.updateContentProgress"],
  },
  {
    feature: "sharia_exam",
    web: "apps/web/src/pages/student/ShariaExam.tsx",
    mobile: "apps/mobile/app/sharia-exam.tsx",
    data: ["sharia.exam", "sharia.submitExam"],
    checks: ["route", "entryPoint", "contentEntryPoint", "questionTypes", "payloadContract", "studentGate", "studentProcedure", "submitExam", "attemptsRemaining", "serverResult"],
  },
  {
    feature: "islamic_lessons",
    web: "apps/web/src/pages/student/ShariaSubjects.tsx",
    mobile: "apps/mobile/app/sharia.tsx",
    data: ["sharia.summary", "sharia.subjects"],
  },
  {
    feature: "notifications",
    web: "apps/web/src/pages/shared/Notifications.tsx",
    mobile: "apps/mobile/app/(tabs)/notifications.tsx",
    data: ["notifications.list", "notifications.unreadCount"],
  },
  {
    feature: "account",
    web: "apps/web/src/pages/student/StudentAccount.tsx",
    mobile: "apps/mobile/app/(tabs)/account.tsx",
    data: ["auth.me", "student.settings", "student.progress"],
  },
  {
    feature: "teacher_students",
    web: "apps/web/src/pages/teacher/MyStudents.tsx",
    mobile: "apps/mobile/app/(tabs)/teacher-students.tsx",
    data: ["teacher.myStudents"],
  },
  {
    feature: "teacher_schedule",
    web: "apps/web/src/pages/teacher/TeacherSchedule.tsx",
    mobile: "apps/mobile/app/(tabs)/teacher-schedule.tsx",
    data: ["teacher.schedule"],
  },
];

const files = (value) => value ? (Array.isArray(value) ? value : [value]) : [];

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
    expect(mobile.includes("isError"), `${screen.feature}: Mobile has no error state`);
    expect(mobile.includes("FormField"), `${screen.feature}: Mobile has no form surface`);
  } else {
    expect(mobile.includes("isLoading"), `${screen.feature}: Mobile has no loading state`);
    expect(mobile.includes("isError"), `${screen.feature}: Mobile has no error state`);
  }
  expect(
    screen.form || mobile.includes("EmptyBlock") || /لا (توجد|نتائج|تقدم|طلاب|دروس|إشعارات|مواد)|تعذر/.test(mobile),
    `${screen.feature}: Mobile has no explicit empty/error surface`,
  );
  for (const check of screen.checks ?? []) {
    if (check === "section") expect(mobile.includes("section"), `${screen.feature}: section filter is missing`);
    if (check === "category") expect(mobile.includes("publicCategory"), `${screen.feature}: category filter is missing`);
    if (check === "TeacherGate") expect(mobile.includes("TeacherGate") || mobile.includes("isTeacher"), `${screen.feature}: role gate is missing`);
    if (check === "route") {
      expect(read("apps/web/src/App.tsx").includes('path="sharia/exam/:levelId"'), `${screen.feature}: Web route is missing`);
    }
    if (check === "entryPoint") {
      expect(read("apps/web/src/pages/student/ShariaLevel.tsx").includes("/student/sharia/exam/"), `${screen.feature}: level entry point is missing`);
    }
    if (check === "contentEntryPoint") {
      expect(read("apps/web/src/pages/student/ShariaViewer.tsx").includes("/student/sharia/exam/"), `${screen.feature}: content entry point is missing`);
    }
    if (check === "questionTypes") {
      expect(web.includes("questionType === \"multiple_choice\"") && web.includes("questionType === \"true_false\"") && web.includes("questionType === \"fill_blank\""), `${screen.feature}: Web question type controls are incomplete`);
      expect(mobile.includes("questionType === 'true_false'") && mobile.includes("questionType === 'fill_blank'"), `${screen.feature}: Mobile question type controls are incomplete`);
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
      expect(read("packages/trpc/src/routers/sharia.ts").includes("exam: studentProcedure"), `${screen.feature}: server studentProcedure gate is missing`);
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

const levels = read("apps/mobile/app/levels.tsx");
expect(levels.includes("productRegistry.paths[path].label"), "levels: title is not Product Registry-driven");
expect(levels.includes("productRegistry.pathOrder"), "levels: path keys are not Product Registry-driven");
expect(!levels.includes("const PATH_TITLE"), "levels: local PATH_TITLE override remains");
expect(levels.includes("l.isCurrent"), "levels: current-level business state is not rendered");
expect(levels.includes("l.aqeedahRequirement"), "levels: prerequisite business state is not rendered");

const fatwa = read("apps/mobile/app/fatwas.tsx");
const fatwaDetail = read("apps/mobile/app/fatwa-detail.tsx");
expect(fatwa.includes("fatwa.myFatwas") && fatwa.includes("fatwa.publicList"), "fatwa: own/public sources are incomplete");
expect(fatwaDetail.includes("fatwa.detail") && fatwaDetail.includes("fatwa.rate"), "fatwa: detail/rating sources are incomplete");
expect(fatwaDetail.includes("enabled = !!questionId && status === 'authenticated'"), "fatwa: detail is not student-gated");

const notificationSettings = read("apps/mobile/app/notification-settings.tsx");
expect(notificationSettings.includes("confirmAr"), "notification settings: destructive confirmation is not web-safe");
expect(!notificationSettings.includes("Alert.alert('مسح المقروءة'"), "notification settings: multi-button Alert.alert remains");

const teacherScreens = [
  ["teacher_students", "apps/mobile/app/(tabs)/teacher-students.tsx"],
  ["teacher_schedule", "apps/mobile/app/(tabs)/teacher-schedule.tsx"],
];
for (const [feature, file] of teacherScreens) {
  const source = read(file);
  expect(source.includes("TeacherGate"), `${feature}: role gate is missing`);
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

if (errors.length) {
  console.error(`Screen parity: FAIL\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Screen parity: PASS");
console.log(`Audited screens: ${screens.length}`);
console.log("Data, loading/error/empty, role gates, and Native reader gate: PASS");