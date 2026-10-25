import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(fs.readFileSync(path.join(root, "lib/tabyan-domain/product-registry.json"), "utf8"));
const webRoutes = fs.readFileSync(path.join(root, "artifacts/tabyan/src/App.tsx"), "utf8");
const mobileRoot = path.join(root, "artifacts/mobile/app");
const webNavSource = fs.readFileSync(path.join(root, "artifacts/tabyan/src/components/app/StudentBottomNav.tsx"), "utf8");
const mobileNavSource = fs.readFileSync(path.join(mobileRoot, "(tabs)/_layout.tsx"), "utf8");
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
const mobileDestinations = {
  home: "(tabs)/index.tsx", quran: "levels.tsx", halaqat: "(tabs)/halaqat.tsx",
  notifications: "(tabs)/notifications.tsx", account: "(tabs)/account.tsx", library: "library.tsx",
  fatwa: "fatwas.tsx", islamic_lessons: "sharia.tsx", quran_tracks: "paths.tsx",
  levels: "levels.tsx", placement: "placement.tsx", prayer_times: "prayer-times.tsx",
  qibla: "qibla.tsx", schedule: "(tabs)/halaqat.tsx", recordings: "recordings.tsx",
  teacher_students: "(tabs)/teacher-students.tsx", teacher_schedule: "(tabs)/teacher-schedule.tsx",
  mushaf: "(tabs)/mushaf.tsx",
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

const mobileRouteByFeature = {
  home: 'name="index"', halaqat: 'name="halaqat"',
  notifications: 'name="notifications"', account: 'name="account"',
};
let previousMobileIndex = -1;
for (const feature of registry.navigation.mobileStudentBottomNav) {
  const marker = mobileRouteByFeature[feature];
  const index = marker ? mobileNavSource.indexOf(marker) : -1;
  if (index < 0) errors.push(`Mobile navigation source is missing ${feature}`);
  else if (index <= previousMobileIndex) errors.push(`Mobile navigation order differs at ${feature}`);
  previousMobileIndex = index;
}

const webHomeSource = fs.readFileSync(path.join(root, "artifacts/tabyan/src/pages/student/StudentHome.tsx"), "utf8");
const mobileHomeSource = fs.readFileSync(path.join(mobileRoot, "(tabs)/index.tsx"), "utf8");
if (!webHomeSource.includes("productRegistry.learningFeatureOrder")) errors.push("Web Home does not consume learningFeatureOrder");
if (!mobileHomeSource.includes("productRegistry.learningFeatureOrder")) errors.push("Mobile Home does not consume learningFeatureOrder");

if (errors.length) {
  console.error(`Product registry: FAIL\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("Product registry: PASS");
console.log(`Features: ${Object.keys(registry.features).length}`);
console.log(`Path order: ${registry.pathOrder.join(" > ")}`);
console.log(`Learning order: ${registry.learningFeatureOrder.join(" > ")}`);
console.log(`Intentional order exceptions: ${registry.navigation.intentionalOrderExceptions.length}`);