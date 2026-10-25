export function initialThemeMode(platform: string, system: string | null | undefined): "light" | "dark" {
  return platform === "ios" || platform === "android" ? "light" : system === "dark" ? "dark" : "light";
}

export function nativeWelcomeLayout(width: number, height: number, top: number, bottom: number) {
  const usableHeight = Math.max(0, height - top - bottom);
  const compact = usableHeight < 700 || width < 360;
  const logoSize = Math.max(76, Math.min(width - 48, compact ? 84 : 120));

  return {
    usableHeight,
    compact,
    logoSize,
    actionHeight: compact ? 42 : 48,
    gap: compact ? 6 : 12,
  };
}
