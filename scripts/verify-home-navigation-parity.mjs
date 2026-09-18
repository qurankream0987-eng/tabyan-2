import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(root, relative));
const registry = JSON.parse(read("lib/tabyan-domain/product-registry.json"));
const webHome = read("artifacts/tabyan/src/pages/student/StudentHome.tsx");
const mobileHome = read("artifacts/mobile/app/(tabs)/index.tsx");
const webNav = read("artifacts/tabyan/src/components/app/StudentBottomNav.tsx");
const mobileNav = read("artifacts/mobile/app/(tabs)/_layout.tsx");
const mobileUi = read("artifacts/mobile/components/ui.tsx");
const errors = [];

function expect(condition, message) {
  if (!condition) errors.push(message);
}

function orderedMarkers(source, markers, label) {
  let previous = -1;
  for (const marker of markers) {
    const index = source.indexOf(marker);
    if (index < 0) errors.push(`${label} is missing ${marker}`);
    else if (index <= previous) errors.push(`${label} order differs at ${marker}`);
    previous = index;
  }
}

orderedMarkers(webHome, [
  "{/* 1. Greeting */}",
  "{/* 2. آية اليوم",
  "{/* 3. بطاقات مواعيد",
  "{/* 4. بطاقات اختيار المسارات",
  "{/* 5. Placement reminder */}",
], "Web Home");

orderedMarkers(mobileHome, [
  "{/* 1. التحية والتقدم",
  "{/* 2. آية اليوم",
  "{/* 3. الجلسات القادمة",
  "{/* 4. بطاقات المسارات",
  "{/* 5. تذكير اختبار تحديد المستوى",
], "Mobile Home");

expect(webHome.includes("productRegistry.learningFeatureOrder"), "Web Home does not use shared learning order");
expect(mobileHome.includes("productRegistry.learningFeatureOrder"), "Mobile Home does not use shared learning order");
expect(webHome.includes("student.settings.useQuery"), "Web Home does not enforce the Ayah visibility setting");
expect(mobileHome.includes("student.settings.useQuery"), "Mobile Home does not enforce the Ayah visibility setting");
expect(mobileHome.includes("FALLBACK_VERSE"), "Mobile Home has no verse fallback");
expect(!mobileHome.includes("router.push('/(tabs)/mushaf')"), "Mobile Home exposes blocked Mushaf");
expect(!mobileHome.includes("recitation"), "Mobile Home exposes blocked recitation");

const mobileHomeDestinations = {
  "/paths": "artifacts/mobile/app/paths.tsx",
  "/sharia": "artifacts/mobile/app/sharia.tsx",
  "/placement": "artifacts/mobile/app/placement.tsx",
  "/(tabs)/halaqat": "artifacts/mobile/app/(tabs)/halaqat.tsx",
};
for (const [destination, file] of Object.entries(mobileHomeDestinations)) {
  expect(mobileHome.includes(destination), `Mobile Home does not map ${destination}`);
  expect(exists(file), `Mobile Home destination is missing: ${file}`);
}

expect(webNav.includes("productRegistry.features[t.feature].label"), "Web nav labels are not registry-driven");
for (const key of registry.navigation.mobileStudentBottomNav) {
  expect(mobileNav.includes(`productRegistry.features.${key}.label`), `Mobile nav label is not registry-driven: ${key}`);
}
expect(mobileNav.includes('name="mushaf"') && mobileNav.includes("href: undefined"), "Classic Mobile Mushaf tab is not enabled");
expect(mobileNav.includes('<NativeTabs.Trigger name="mushaf">'), "Native Mobile Mushaf tab is not enabled");
expect(mobileUi.includes("useSafeAreaInsets()"), "Mobile screens do not use native safe-area insets");
expect(mobileNav.includes("Platform.OS === 'web' ? { height: 84 }"), "Web tab fallback has no bottom inset");

for (const route of ["artifacts/mobile/app/library.tsx", "artifacts/mobile/app/fatwas.tsx", "artifacts/mobile/app/recordings.tsx"]) {
  expect(exists(route), `Documented non-tab destination is missing: ${route}`);
}

if (errors.length) {
  console.error(`Home/navigation parity: FAIL\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Home/navigation parity: PASS");
console.log("Home structure: greeting > verse > upcoming > learning paths > placement");
console.log(`Mobile Home destinations: ${Object.keys(mobileHomeDestinations).join(", ")}`);
console.log(`Intentional platform differences: ${registry.navigation.intentionalOrderExceptions.length}`);