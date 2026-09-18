import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance, useColorScheme } from "react-native";
import { storage } from "./storage";
import designTokens from "./design-tokens.json";

export const palette = {
  burgundy: "#800020",
  burgundyLight: "#A02040",
  maroon: "#4C091B",
  maroonDeep: "#360512",
  gold: "#D4AF37",
  goldLight: "#F1D27A",
  goldDark: "#B8860B",
  cream: "#F5EFE0",
  night: "#2B0D12",
} as const;

export type ThemeMode = "light" | "dark";
export type ThemeColors = {
  background: string;
  card: string;
  header: string;
  text: string;
  muted: string;
  primary: string;
  primaryText: string;
  border: string;
  input: string;
  success: string;
  danger: string;
  selected: string;
  disabled: string;
  overlay: string;
};

const glassLight = "rgba(255,252,245,0.90)";
const glassDark = "rgba(66,18,31,0.84)";

const light: ThemeColors = {
  background: designTokens.modes.light.background,
  card: glassLight,
  header: "rgba(255,252,245,0.96)",
  text: designTokens.modes.light.foreground,
  muted: designTokens.modes.light.mutedForeground,
  primary: designTokens.modes.light.primary,
  primaryText: designTokens.modes.light.primaryForeground,
  border: designTokens.modes.light.border,
  input: designTokens.modes.light.input,
  success: designTokens.modes.light.success,
  danger: designTokens.modes.light.destructive,
  selected: designTokens.modes.light.burgundyBackground,
  disabled: `rgba(128,0,32,${1 - designTokens.buttonStates.disabledOpacity})`,
  overlay: designTokens.modes.light.overlay,
};

const dark: ThemeColors = {
  background: designTokens.modes.dark.background,
  card: glassDark,
  header: "rgba(66,18,31,0.92)",
  text: designTokens.modes.dark.foreground,
  muted: designTokens.modes.dark.mutedForeground,
  primary: designTokens.modes.dark.primary,
  primaryText: designTokens.modes.dark.primaryForeground,
  border: designTokens.modes.dark.border,
  input: designTokens.modes.dark.input,
  success: designTokens.modes.dark.success,
  danger: designTokens.modes.dark.destructive,
  selected: designTokens.modes.dark.burgundyBackground,
  disabled: `rgba(212,175,55,${1 - designTokens.buttonStates.disabledOpacity})`,
  overlay: designTokens.modes.dark.overlay,
};

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(system === "dark" ? "dark" : "light");

  useEffect(() => {
    storage.getTheme().then((saved) => {
      if (saved === "light" || saved === "dark") setMode(saved);
    });
  }, []);

  const value = useMemo(() => ({
    mode,
    colors: mode === "dark" ? dark : light,
    isDark: mode === "dark",
    toggleTheme: () => {
      const next = mode === "dark" ? "light" : "dark";
      setMode(next);
      void storage.setTheme(next);
      Appearance.setColorScheme?.(next);
    },
  }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
