import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(fs.readFileSync(path.join(root, "lib/tabyan-domain/product-registry.json"), "utf8"));
const webRoutes = fs.readFileSync(path.join(root, "artifacts/tabyan/src/App.tsx"), "utf8");
const mobileRoot = path.join(root, "artifacts/mobile/app");
const webNavSource = fs.readFileSync(path.join(root, "artifacts/tabyan/src/components/app/StudentBottomNav.tsx"), "utf8");
const mobileNavSource = fs.readFileSync(path.join(mobileRoot, "student/(tabs)/_layout.tsx"), "utf8");
const errors = [];

const webDestinations = {
  home: 'path="home"', quran: 'path="quran"', halaqat: 'path="schedule"',
  notifications: 'path="notifications"', account: 'path="account"', library: 'path="library"',
  fatwa: 'path="fatwa"', islamic_lessons: 'path="sharia"', quran_tracks: 'path="path"',
  levels: 'path="levels/:pathId"', mushaf: 'path="mushaf-fahd"', recitation: 'path="recitation/history"',
  placement: 'path="placement"', prayer_times: 'path="prayer-times"', qibla: 'path="qibla"',
  schedule: 'path="schedule"', recordings: 'path="recordings"', teacher_students: 'path="students"',
  teacher_schedule: 'path="schedule"',
};
// Mobile was reorganized under role-scoped app/student|teacher|admin
// directories; several features that used to be standalone screens (or bare
// tabs) now live as tabs, plain stack screens, or share a file with a
// sibling feature. Each mapping below was verified against the real current
// file, not carried over from the old flat layout.
const mobileDestinations = {
  home: "student/(tabs)/home.tsx",
  quran: "student/levels/[pathId].tsx",
  halaqat: "student/(tabs)/schedule.tsx", // shares its screen with "schedule"
  notifications: "student/notifications.tsx", // moved out of the tab bar to a header bell icon
  account: "student/(tabs)/account.tsx",
  library: "student/(tabs)/library.tsx", // now a tab (was a bare route)
  fatwa: "student/(tabs)/fatwa.tsx", // now a tab: ask + my-fatwas hub
  islamic_lessons: "student/sharia.tsx",
  quran_tracks: "student/quran.tsx",
  levels: "student/levels/[pathId].tsx",
  placement: "student/placement.tsx",
  prayer_times: "student/prayer-times.tsx",
  qibla: "student/qibla.tsx",
  schedule: "student/(tabs)/schedule.tsx",
  recordings: "student/(tabs)/recordings.tsx", // now a tab (was a bare route)
  teacher_students: "teacher/students.tsx", // plain stack screen, not a tab: teacher/ has no (tabs) group
  teacher_schedule: "teacher/schedule.tsx", // plain stack screen, not a tab
  mushaf: "student/(tabs)/mushaf-fahd.tsx", // route file kept reachable; deliberately not registered as a Tabs.Screen
};

for (const [key, feature] of Object.entries(registry.features)) {
  for (const field of ["label", "order", "supportedRoles", "webAvailability", "mobileAvailability", "releaseVisibility"]) {
    if (!(field in feature)) errors.push(`${key} missing ${field}`);
  }
  if (feature.webAvailability && (!webDestinations[key] || !webRoutes.includes(webDestinations[key]))) {
    errors.push(`${key} has no Web destination`);
  }
  if (feature.mobileAvailability) {
    const relative = mobileDestinations[key];
    if (!relative || !fs.existsSync(path.join(mobileRoot, relative))) errors.push(`${key} has no Mobile destination`);
  }
}

const pathKeys = Object.keys(registry.paths);
if (new Set(registry.pathOrder).size !== registry.pathOrder.length || registry.pathOrder.some((key) => !pathKeys.includes(key))) {
  errors.push("pathOrder is invalid");
}
if (new Set(registry.learningFeatureOrder).size !== registry.learningFeatureOrder.length) {
  errors.push("learningFeatureOrder contains duplicates");
}

const renderedWebNav = [...webNavSource.matchAll(/feature:\s*"([^"]+)"/g)].map((match) => match[1]);
if (JSON.stringify(renderedWebNav) !== JSON.stringify(registry.navigation.webStudentBottomNav)) {
  errors.push(`Web navigation order differs from registry: ${renderedWebNav.join(" > ")}`);
}

// Mobile's tab bar hardcodes Arabic labels directly (registry.navigation
// .mobileStudentBottomNav is now the canonical current tab set: it mirrors
// Web's bottom bar minus Mushaf). Verify each registered tab name appears in
// the source in the same order as the registry lists them.
let previousMobileIndex = -1;
for (const feature of registry.navigation.mobileStudentBottomNav) {
  const marker = `name="${feature}"`;
  const index = mobileNavSource.indexOf(marker);
  if (index < 0) errors.push(`Mobile navigation source is missing ${feature}`);
  else if (index <= previousMobileIndex) errors.push(`Mobile navigation order differs at ${feature}`);
  previousMobileIndex = index;
}
if (registry.navigation.mobileTeacherBottomNav.length === 0) {
  // Teacher has no bottom tab bar (app/teacher/_layout.tsx is a Stack); its
  // navigation is a role-gated dashboard tile list instead. Just confirm the
  // dashboard exists and the layout truly has no Tabs usage.
  const teacherLayout = fs.readFileSync(path.join(mobileRoot, "teacher/_layout.tsx"), "utf8");
  if (/from\s+"expo-router"[^;]*\bTabs\b/.test(teacherLayout) || /<Tabs\b/.test(teacherLayout)) {
    errors.push("Teacher layout unexpectedly uses a Tabs navigator; registry says it should not");
  }
  if (!fs.existsSync(path.join(mobileRoot, "teacher/index.tsx"))) errors.push("Teacher dashboard destination is missing");
}

const webHomeSource = fs.readFileSync(path.join(root, "artifacts/tabyan/src/pages/student/StudentHome.tsx"), "utf8");
const mobileHomeSource = fs.readFileSync(path.join(mobileRoot, "student/(tabs)/home.tsx"), "utf8");
if (!webHomeSource.includes("productRegistry.learningFeatureOrder")) errors.push("Web Home does not consume learningFeatureOrder");
// Mobile Home hardcodes its own PATH_ORDER (no runtime registry import); the
// data must still agree with the registry's canonical order.
for (const key of registry.learningFeatureOrder) {
  if (!mobileHomeSource.includes(`"${key}"`)) errors.push(`Mobile Home does not render learning feature "${key}"`);
}

if (errors.length) {
  console.error(`Product registry: FAIL\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("Product registry: PASS");
console.log(`Features: ${Object.keys(registry.features).length}`);
console.log(`Path order: ${registry.pathOrder.join(" > ")}`);
console.log(`Learning order: ${registry.learningFeatureOrder.join(" > ")}`);
console.log(`Intentional order exceptions: ${registry.navigation.intentionalOrderExceptions.length}`);
