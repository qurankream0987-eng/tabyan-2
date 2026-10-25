import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  createIOSExitGate, iosDestinationReady, iosSplashLogoFrame, iosSplashMotion,
} from "../lib/platform/ios-splash-lifecycle";

function fakeClock() {
  let now = 0;
  let id = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  return {
    now: () => now,
    schedule(callback: () => void, delay: number) {
      const key = ++id;
      timers.set(key, { at: now + delay, callback });
      return key as unknown as ReturnType<typeof setTimeout>;
    },
    cancel(timer: ReturnType<typeof setTimeout>) { timers.delete(timer as unknown as number); },
    advance(ms: number) {
      const target = now + ms;
      while (true) {
        const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > target) break;
        timers.delete(next[0]);
        now = next[1].at;
        next[1].callback();
      }
      now = target;
    },
  };
}

test("fast startup has one calm entrance, short hold and one exit", () => {
  const clock = fakeClock();
  let exits = 0;
  const gate = createIOSExitGate(() => exits++, false, clock);
  gate.markReady();
  clock.advance(799);
  assert.equal(exits, 0);
  clock.advance(1);
  assert.equal(exits, 1);
  gate.markReady();
  clock.advance(10_000);
  assert.equal(exits, 1);
  assert.equal(iosSplashMotion.logoScale + iosSplashMotion.hold + iosSplashMotion.exitFade, 1100);
});

test("slow bootstrap keeps the settled logo and exits promptly when ready", () => {
  const clock = fakeClock();
  let exits = 0;
  const gate = createIOSExitGate(() => exits++, false, clock);
  clock.advance(5000);
  assert.equal(exits, 0);
  gate.markReady();
  clock.advance(0);
  assert.equal(exits, 1);
});

test("lost destination readiness cancels a pending exit", () => {
  const clock = fakeClock();
  let exits = 0;
  const gate = createIOSExitGate(() => exits++, false, clock);
  gate.setReady(true);
  clock.advance(400);
  gate.setReady(false);
  clock.advance(1000);
  assert.equal(exits, 0);
  gate.setReady(true);
  clock.advance(0);
  assert.equal(exits, 1);
});

test("reduced motion has only short fades and no long presentation delay", () => {
  const clock = fakeClock();
  let exits = 0;
  const gate = createIOSExitGate(() => exits++, true, clock);
  gate.markReady();
  clock.advance(119);
  assert.equal(exits, 0);
  clock.advance(1);
  assert.equal(exits, 1);
});

test("enabling reduced motion midway shortens the remaining hold", () => {
  const clock = fakeClock();
  let exits = 0;
  const gate = createIOSExitGate(() => exits++, false, clock);
  gate.markReady();
  clock.advance(200);
  gate.setReducedMotion(true);
  clock.advance(0);
  assert.equal(exits, 1);
});

test("unmount cancels timers and prevents late completion", () => {
  const clock = fakeClock();
  let exits = 0;
  const gate = createIOSExitGate(() => exits++, false, clock);
  gate.markReady();
  gate.dispose();
  clock.advance(10_000);
  gate.markReady();
  clock.advance(10_000);
  assert.equal(exits, 0);
});

test("restored sessions never reveal Guest or Login while routing", () => {
  for (const role of ["student", "teacher", "admin"]) {
    for (const path of ["/", "/guest", "/login", "/register"]) {
      assert.equal(iosDestinationReady(true, true, "stored-token", role, path), false);
    }
    assert.equal(iosDestinationReady(false, true, "stored-token", role, `/${role}`), false);
    assert.equal(iosDestinationReady(true, false, "stored-token", role, `/${role}`), false);
    assert.equal(iosDestinationReady(true, true, "stored-token", role, `/${role}`), true);
  }
  assert.equal(iosDestinationReady(true, true, "stored-token", "teacher", "/student/home"), false);
  assert.equal(iosDestinationReady(true, true, "stored-token", "student", "/privacy"), true);
});

test("logged-out startup waits for local restoration and preserves public links", () => {
  assert.equal(iosDestinationReady(false, true, null, null, "/guest"), false);
  assert.equal(iosDestinationReady(true, true, null, null, "/"), false);
  assert.equal(iosDestinationReady(true, true, null, null, "/guest"), true);
  assert.equal(iosDestinationReady(true, true, null, null, "/login"), true);
  assert.equal(iosDestinationReady(true, true, null, null, "/privacy"), true);
  assert.equal(iosDestinationReady(true, true, null, null, "/student/home"), false);
});

test("startup logo keeps native launch geometry at all phone widths", () => {
  for (const width of [320, 375, 390, 393, 414, 430]) {
    const frame = iosSplashLogoFrame(width);
    assert.equal(frame.width, 260);
    assert.equal(frame.height, 260 / (1196 / 639));
  }
});

test("iOS source uses native opacity/scale only, bounded failure and existing identity", () => {
  const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
  const splash = source("../components/app/IOSSplash.tsx");
  const root = source("../app/_layout.tsx");
  assert.ok(splash.includes("useNativeDriver: true"));
  assert.ok(splash.includes('addEventListener("reduceMotionChanged"'));
  assert.ok(splash.includes("isReduceMotionEnabled()"));
  assert.ok(!/Animated\.(loop|spring)|translate|rotate/.test(splash));
  assert.ok(splash.includes("if (alive && finished)"));
  assert.ok(root.includes("setTimeout(failStartup, iosSplashMotion.bootstrapTimeout)"));
  assert.ok(root.indexOf("return <IOSStartupFailure") < root.indexOf("if (!ready) return"));
  assert.ok(root.includes("paintedPath === pathname"));
  const config = JSON.parse(source("../app.json")).expo;
  assert.equal(config.ios.bundleIdentifier, "app.replit.tbyan");
  assert.equal(config.extra.eas.projectId, "bcac43ba-905a-4b13-a834-b36051da4da6");
  const nativeSplash = config.plugins.find((p: unknown) => Array.isArray(p) && p[0] === "expo-splash-screen")[1];
  assert.equal(nativeSplash.backgroundColor, "#4C091B");
  assert.equal(nativeSplash.imageWidth, 260);
});
