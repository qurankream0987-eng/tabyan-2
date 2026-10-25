import { splashLayout } from "../constants/splash";

export const iosSplashMotion = {
  initialScale: 0.96,
  logoFade: 420,
  logoScale: 550,
  hold: 250,
  exitFade: 300,
  nativeFade: 200,
  reducedFade: 120,
  preferenceTimeout: 800,
  bootstrapTimeout: 10_000,
} as const;

export function iosSplashLogoFrame(width: number) {
  const logoWidth = Math.min(splashLayout.nativeLogoWidth, width * splashLayout.logoWidthRatio);
  return { width: logoWidth, height: logoWidth / splashLayout.logoAspectRatio };
}

export function iosDestinationReady(
  authReady: boolean,
  themeReady: boolean,
  token: string | null,
  role: string | null,
  pathname: string,
) {
  if (!authReady || !themeReady || pathname === "/") return false;
  if (!token || !role) {
    return !/^\/(?:student|teacher|admin)(?:\/|$)/.test(pathname);
  }
  // Preserve public deep links, but never expose Welcome/Login during restoration.
  if (/^\/(?:guest|login|register)(?:\/|$)/.test(pathname)) return false;
  if (/^\/(?:student|teacher|admin)(?:\/|$)/.test(pathname)) {
    return pathname === `/${role}` || pathname.startsWith(`/${role}/`);
  }
  return true;
}

type Timer = ReturnType<typeof setTimeout>;
type Clock = {
  now: () => number;
  schedule: (callback: () => void, delay: number) => Timer;
  cancel: (timer: Timer) => void;
};

/** Readiness controls exit; animation never loops or restarts when readiness changes. */
export function createIOSExitGate(
  onExit: () => void,
  reducedMotion: boolean,
  clock: Clock = { now: Date.now, schedule: setTimeout, cancel: clearTimeout },
) {
  const startedAt = clock.now();
  let ready = false;
  let disposed = false;
  let exited = false;
  let timer: Timer | null = null;
  const scheduleExit = () => {
    if (!ready || disposed || exited) return;
    if (timer !== null) clock.cancel(timer);
    const minimum = reducedMotion
      ? iosSplashMotion.reducedFade
      : iosSplashMotion.logoScale + iosSplashMotion.hold;
    timer = clock.schedule(() => {
      timer = null;
      if (disposed || exited) return;
      exited = true;
      onExit();
    }, Math.max(0, minimum - (clock.now() - startedAt)));
  };
  return {
    markReady() { ready = true; scheduleExit(); },
    setReady(value: boolean) {
      ready = value;
      if (!value && timer !== null) {
        clock.cancel(timer);
        timer = null;
      }
      scheduleExit();
    },
    setReducedMotion(value: boolean) { reducedMotion = value; scheduleExit(); },
    dispose() {
      disposed = true;
      if (timer !== null) clock.cancel(timer);
      timer = null;
    },
  };
}
