import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { nativeWelcomeLayout } from "../lib/platform/native-welcome-layout";
import { isThemePreference, resolveThemeMode } from "../lib/platform/theme-preference";

test("The theme follows the device until the user picks light or dark in settings", () => {
  assert.equal(resolveThemeMode("system", "dark"), "dark");
  assert.equal(resolveThemeMode("system", "light"), "light");
  assert.equal(resolveThemeMode("system", null), "light");
  for (const system of ["dark", "light", null]) {
    assert.equal(resolveThemeMode("light", system), "light");
    assert.equal(resolveThemeMode("dark", system), "dark");
  }
  assert.equal(isThemePreference("system"), true);
  assert.equal(isThemePreference("auto"), false);
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

test("Native welcome stacks the three web calls to action and preserves splash handoff", () => {
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
  // Web order: register, login, then the in-app mushaf reader (no external link).
  const register = hero.indexOf('testID="welcome-register"');
  const login = hero.indexOf('testID="welcome-login"');
  const mushaf = hero.indexOf('testID="welcome-open-mushaf"');
  assert.ok(register >= 0 && login > register && mushaf > login);
  assert.ok(hero.includes("useReducedMotion"));
  assert.ok(!hero.includes("Platform.OS"));
  assert.ok(!/minHeight: layout\\.usableHeight|flexGrow: 1/.test(hero));

  assert.ok(guest.includes("<NativeWelcomeHero onRegister={openRegister} onLogin={openLogin} onBrowseMushaf={openMushaf} />"));
  assert.ok(guest.includes('router.push("/student/mushaf"'));
  assert.ok(!guest.includes("MUSHAF_URL"));
  assert.ok(!guest.includes("Linking.openURL"));
  assert.ok(!guest.includes("Platform.OS ==="));
  assert.ok(guest.indexOf("<View style={styles.cards}>") < guest.indexOf("<View style={styles.why}>"));
  assert.ok(guest.indexOf("<View style={styles.why}>") < guest.indexOf("<View style={[styles.footer"));
  for (const href of ["/privacy", "/terms", "/support"]) assert.ok(guest.includes(`"${href}"`));
  assert.ok(root.includes('showStartupSplash || isDark ? "light" : "dark"'));
  assert.ok(root.includes("IOSWelcomeLogoVisible.Provider value={!showStartupSplash}"));
  assert.ok(splash.includes("callbacks.current.fadeLogoFirst ? Animated.sequence("));
  assert.ok(theme.includes("if (isThemePreference(saved))"));
});
