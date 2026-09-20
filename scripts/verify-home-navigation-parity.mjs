import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(root, relative));
const registry = JSON.parse(read("lib/tabyan-domain/product-registry.json"));
const webHome = read("artifacts/tabyan/src/pages/student/StudentHome.tsx");
const mobileHome = read("artifacts/mobile/app/student/(tabs)/home.tsx");
const webNav = read("artifacts/tabyan/src/components/app/StudentBottomNav.tsx");
const mobileNav = read("artifacts/mobile/app/student/(tabs)/_layout.tsx");
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

// Mobile's section order/intent is unchanged (greeting > verse > duty >
// unenrolled paths > placement reminder), only the comment wording was
// tightened during the visual redesign.
orderedMarkers(mobileHome, [
  "{/* 1. التحية",
  "{/* 2. آية اليوم",
  "{/* 3. الواجب",
  "{/* 4. بطاقات المسارات",
  "{/* 5. تذكير اختبار تحديد المستوى",
], "Mobile Home");

expect(webHome.includes("productRegistry.learningFeatureOrder"), "Web Home does not use shared learning order");
// Mobile Home no longer imports the registry module directly (a Metro/
// workspace-boundary simplification from the visual redesign) — it hardcodes
// its own PATH_ORDER instead. Verify that local order still agrees with the
// registry's canonical order/labels rather than requiring the literal import.
for (const [index, key] of registry.learningFeatureOrder.entries()) {
  expect(mobileHome.includes(`"${key}"`), `Mobile Home PATH_ORDER is missing registry learning feature "${key}"`);
  const path = registry.paths[key];
  expect(path && mobileHome.includes(path.homeLabel), `Mobile Home does not render the registry label for "${key}" (${path?.homeLabel})`);
  if (index > 0) {
    const previousKey = registry.learningFeatureOrder[index - 1];
    expect(
      mobileHome.indexOf(`"${previousKey}"`) < mobileHome.lastIndexOf(`"${key}"`),
      `Mobile Home PATH_ORDER order differs from the registry at "${key}"`,
    );
  }
}
expect(webHome.includes("student.settings.useQuery"), "Web Home does not enforce the Ayah visibility setting");
// Mobile Home deliberately shows no fallback: the verse card is real,
// complete server data or nothing at all (no cached/placeholder text ever
// shown) — a stricter behavior than a settings-gated toggle, not a gap.
expect(!/const\s+FALLBACK_VERSE/.test(mobileHome), "Mobile Home must not reintroduce a hardcoded fallback verse");
expect(!mobileHome.includes("mushaf"), "Mobile Home exposes blocked Mushaf");
expect(!mobileHome.includes("recitation"), "Mobile Home exposes blocked recitation");

const mobileHomeDestinations = {
  "/student/quran": "artifacts/mobile/app/student/quran.tsx",
  "/student/levels/tajweed": "artifacts/mobile/app/student/levels/[pathId].tsx",
  "/student/sharia": "artifacts/mobile/app/student/sharia.tsx",
  "/student/placement": "artifacts/mobile/app/student/placement.tsx",
};
for (const [destination, file] of Object.entries(mobileHomeDestinations)) {
  expect(mobileHome.includes(destination), `Mobile Home does not map ${destination}`);
  expect(exists(file), `Mobile Home destination is missing: ${file}`);
}

expect(webNav.includes("productRegistry.features[t.feature].label"), "Web nav labels are not registry-driven");
// Mobile's tab bar now hardcodes its Arabic labels directly in _layout.tsx
// (no runtime registry import) after the visual redesign, and its tab set
// mirrors Web's student bottom bar minus Mushaf. Verify the hardcoded labels
// still agree with the registry's canonical labels for each registered tab.
for (const key of registry.navigation.mobileStudentBottomNav) {
  const feature = registry.features[key];
  expect(feature, `Mobile nav tab "${key}" has no matching registry feature`);
  expect(mobileNav.includes(`"${feature?.label}"`), `Mobile nav label is not registry-consistent: ${key} (${feature?.label})`);
}
expect(!/<Tabs\.Screen\s+name="mushaf/.test(mobileNav), "Mushaf must not be registered as a student bottom tab yet");
expect(exists("artifacts/mobile/app/student/(tabs)/mushaf-fahd.tsx"), "Mushaf route file must stay reachable even while hidden from the tab bar");
expect(mobileUi.includes("useSafeAreaInsets()"), "Mobile screens do not use native safe-area insets");

if (errors.length) {
  console.error(`Home/navigation parity: FAIL\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Home/navigation parity: PASS");
console.log("Home structure: greeting > verse > duty > learning paths > placement");
console.log(`Mobile Home destinations: ${Object.keys(mobileHomeDestinations).join(", ")}`);
console.log(`Mobile student tabs: ${registry.navigation.mobileStudentBottomNav.join(", ")}`);
console.log(`Intentional platform differences: ${registry.navigation.intentionalOrderExceptions.length}`);
