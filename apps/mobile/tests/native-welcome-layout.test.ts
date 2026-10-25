import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { initialThemeMode, nativeWelcomeLayout } from "../lib/platform/native-welcome-layout";

test("Native first appearance is light, while web still follows the system theme", () => {
  for (const system of ["dark", "light", null]) {
    assert.equal(initialThemeMode("ios", system), "light");
    assert.equal(initialThemeMode("android", system), "light");
  }
  assert.equal(initialThemeMode("web", "dark"), "dark");
  assert.equal(initialThemeMode("web", "light"), "light");
});

const devices = [
  { name: "small iPhone", width: 320, height: 568, top: 20, bottom: 0 },
  { name: "standard iPhone", width: 390, height: 844, top: 47, bottom: 34 },
  { name: "large iPhone", width: 430, height: 932, top: 59, bottom: 34 },
  { name: "narrow Android", width: 360, height: 640, top: 24, bottom: 24 },
  { name: "standard Android", width: 412, height: 915, top: 24, bottom: 24 },
] as const;

for (const device of devices) {
  test(`welcome sizing fits ${device.name} without clipping controls`, () => {
    const layout = nativeWelcomeLayout(device.width, device.height, device.top, device.bottom);
    assert.equal(layout.usableHeight, device.height - device.top - device.bottom);
    assert.ok(layout.logoSize >= 76 && layout.logoSize <= 120);
    assert.ok(layout.logoSize <= device.width - 36);
    assert.ok(layout.actionHeight >= 42 && layout.actionHeight <= 48);
    assert.ok(layout.gap === 6 || layout.gap === 12);
  });
}

test("Native welcome omits the external Mushaf link and preserves splash handoff", () => {
  const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
  const hero = source("../components/app/NativeWelcomeHero.tsx");
  const guest = source("../app/guest.tsx");
  const root = source("../app/_layout.tsx");
  const theme = source("../lib/theme.tsx");
  const splash = source("../components/app/IOSSplash.tsx");

  assert.ok(hero.includes("nativeWelcomeLayout"));
  assert.ok(hero.includes("TABYAN_WELCOME_GREETING"));
  assert.ok(hero.includes("IOSWelcomeLogoVisible"));
  assert.ok(hero.includes('resizeMode="contain"'));
  assert.ok(hero.includes('testID="welcome-register"'));
  assert.ok(!hero.includes('testID="welcome-open-mushaf"'));
  assert.ok(!hero.includes("Platform.OS"));
  assert.ok(!/minHeight: layout\\.usableHeight|flexGrow: 1|translateY/.test(hero));

  assert.ok(guest.includes("<NativeWelcomeHero onRegister={openRegister} />"));
  assert.ok(!guest.includes("MUSHAF_URL"));
  assert.ok(!guest.includes("openMushaf"));
  assert.ok(!guest.includes("Linking.openURL"));
  assert.ok(!guest.includes("Platform.OS ==="));
  assert.ok(guest.indexOf("<View style={styles.cards}>") < guest.indexOf("<View style={styles.accountActions}>"));
  assert.ok(guest.includes('testID="welcome-login"'));
  assert.ok(root.includes('showStartupSplash || isDark ? "light" : "dark"'));
  assert.ok(root.includes("IOSWelcomeLogoVisible.Provider value={!showStartupSplash}"));
  assert.ok(splash.includes("callbacks.current.fadeLogoFirst ? Animated.sequence("));
  assert.ok(theme.includes('if (saved === "light" || saved === "dark") setMode(saved)'));
});
