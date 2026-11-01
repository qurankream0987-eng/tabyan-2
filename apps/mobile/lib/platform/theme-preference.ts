export type ThemeMode = "light" | "dark";
/** "system" follows the device's light/dark setting. */
export type ThemePreference = "system" | ThemeMode;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function resolveThemeMode(preference: ThemePreference, system: string | null | undefined): ThemeMode {
  if (preference !== "system") return preference;
  return system === "dark" ? "dark" : "light";
}
