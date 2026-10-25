export const splashColors = {
  background: "#4C091B",
  gold: "#D4AF37",
  goldLight: "#F1D27A",
  goldDark: "#B8860B",
  warmText: "#E6D5B8",
  homeText: "#F5EFE0",
  dotOff: "rgba(230,213,184,0.25)",
  loaderTrack: "rgba(255,255,255,0.12)",
  tagline: "rgba(230,213,184,0.45)",
  shineColor: "#FFF0C8",
  shineOpacity: 0.55,
} as const;

export const splashLayout = {
  logoWidth: 360,
  logoWidthRatio: 0.84,
  logoAspectRatio: 1196 / 639,
  nativeLogoWidth: 260,
  nativeLogoVerticalOffset: 83,
  logoBottomGap: 46,
  textStageHeight: 120,
  haloSize: 560,
  bottomDots: 96,
  bottomLoader: 56,
  bottomTagline: 22,
} as const;

export const splashTiming = {
  logoDelay: 200,
  logoDuration: 1400,
  logoFloatDelay: 1800,
  haloHalfCycle: 2250,
  shineDelay: 1600,
  shineCycle: 3200,
  loaderCycle: 1600,
  verseIn: 450,
  verseOut: 1150,
  homeIn: 1300,
  dots: [120, 450, 1150] as const,
  fadeStart: 2250,
  fadeDuration: 550,
  total: 2800,
} as const;