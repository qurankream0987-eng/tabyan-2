import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance, Platform, useColorScheme } from "react-native";
import { storage } from "./storage";
import designTokens from "../constants/colors";
import { isThemePreference, resolveThemeMode, type ThemeMode, type ThemePreference } from "./platform/theme-preference";

export const palette = {
  burgundy: designTokens.brand.burgundy,
  burgundyLight: "#A02040",
  maroon: "#4C091B",
  maroonDeep: "#360512",
  gold: "#D4AF37",
  goldLight: "#F1D27A",
  goldDark: "#B8860B",
  cream: "#F5EFE0",
  night: "#2B0D12",
} as const;

export type { ThemeMode, ThemePreference };
export type ThemeColors = {
  background: string;
  card: string;
  secondary: string;
  text: string;
  muted: string;
  primary: string;
  primaryText: string;
  border: string;
  input: string;
  success: string;
  danger: string;
  /** Opaque tint behind primary-coloured icons and text (badges, notices). */
  selected: string;
  disabled: string;
  overlay: string;
};

/** هوية بصرية ثابتة لكل مسار تعليمي — قرآن أخضر، تجويد أزرق، شرعي بنفسجي، قراءات بني.
 *  تُستخدم كلمسة تمييز خفيفة (حد جانبي/أيقونة) لا كخلفية كاملة، حفاظاً على الهوية الذهبية/الخمرية العامة. */
export type LearningCategory = "quran" | "tajweed" | "sharia" | "qiraat";
export type CategoryColors = Record<LearningCategory, string>;

const categoriesLight: CategoryColors = designTokens.categories.light;
const categoriesDark: CategoryColors = designTokens.categories.dark;

/** مقياس التباعد والانحناء الموحّد — استخدمها بدل أرقام حرة جديدة. */
export const spacing = designTokens.spacing;
export const radius = designTokens.radius;

// Android draws a card's elevation shadow through a translucent fill, which shows
// as a hard-edged rectangle inside the rounded card. Native gets the same colour
// pre-blended over the page background.
const glassLight = Platform.OS === "web" ? "rgba(255,252,245,0.90)" : "#FEFBF4";
const glassDark = Platform.OS === "web" ? "rgba(66,18,31,0.84)" : "#3F111D";

const light: ThemeColors = {
  background: designTokens.modes.light.background,
  card: glassLight,
  secondary: designTokens.modes.light.secondary,
  text: designTokens.modes.light.foreground,
  muted: designTokens.modes.light.mutedForeground,
  primary: designTokens.modes.light.primary,
  primaryText: designTokens.modes.light.primaryForeground,
  border: designTokens.modes.light.border,
  input: designTokens.modes.light.input,
  success: designTokens.modes.light.success,
  danger: designTokens.modes.light.destructive,
  selected: "#F4E7E3",
  disabled: `rgba(128,0,32,${1 - designTokens.buttonStates.disabledOpacity})`,
  overlay: designTokens.modes.light.overlay,
};

const dark: ThemeColors = {
  background: designTokens.modes.dark.background,
  card: glassDark,
  secondary: designTokens.modes.dark.secondary,
  text: designTokens.modes.dark.foreground,
  muted: designTokens.modes.dark.mutedForeground,
  primary: designTokens.modes.dark.primary,
  primaryText: designTokens.modes.dark.primaryForeground,
  border: designTokens.modes.dark.border,
  input: designTokens.modes.dark.input,
  success: designTokens.modes.dark.success,
  danger: designTokens.modes.dark.destructive,
  selected: "#5A1A2B",
  disabled: `rgba(212,175,55,${1 - designTokens.buttonStates.disabledOpacity})`,
  overlay: designTokens.modes.dark.overlay,
};

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  categories: CategoryColors;
  isDark: boolean;
  ready: boolean;
  /** What the user chose in settings; "system" follows the device. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    storage.getTheme().then((saved) => {
      if (isThemePreference(saved)) {
        setPreferenceState(saved);
        // Native views (alerts, pickers) follow the same choice; null hands it back to the device.
        Appearance.setColorScheme?.(saved === "system" ? null : saved);
      }
    }).catch(() => {}).finally(() => setReady(true));
  }, []);

  const mode = resolveThemeMode(preference, system);
  const value = useMemo(() => ({
    mode,
    ready,
    preference,
    colors: mode === "dark" ? dark : light,
    categories: mode === "dark" ? categoriesDark : categoriesLight,
    isDark: mode === "dark",
    setPreference: (next: ThemePreference) => {
      setPreferenceState(next);
      void storage.setTheme(next);
      Appearance.setColorScheme?.(next === "system" ? null : next);
    },
  }), [mode, preference, ready]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
