import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette, useTheme } from "./theme";

export type ToastTone = "success" | "error" | "info";
type ToastMessage = { id: number; message: string; tone: ToastTone };

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => {});
let showGlobal: (message: string, tone?: ToastTone) => void = () => {};

/** Short notice at the top of the screen, like the web ToastHost. */
export function toast(message: string, tone: ToastTone = "info") {
  showGlobal(message, tone);
}

export function useToast() {
  return useContext(ToastContext);
}

const VISIBLE_MS = 3200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastMessage | null>(null);
  const counter = useRef(0);
  const show = useCallback((message: string, tone: ToastTone = "info") => {
    counter.current += 1;
    setCurrent({ id: counter.current, message, tone });
  }, []);
  useEffect(() => {
    showGlobal = show;
    return () => { showGlobal = () => {}; };
  }, [show]);
  const value = useMemo(() => show, [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      {current ? <ToastView key={current.id} item={current} onDone={() => setCurrent((c) => (c?.id === current.id ? null : c))} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ item, onDone }: { item: ToastMessage; onDone: () => void }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const hide = useCallback(() => {
    Animated.timing(progress, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }) => { if (finished) onDone(); });
  }, [onDone, progress]);
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const timer = setTimeout(hide, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [hide, progress]);
  const edge = item.tone === "success" ? palette.gold : item.tone === "error" ? colors.danger : colors.primary;
  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 10 }]}>
      <Animated.View style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }}>
        <Pressable accessibilityRole="alert" onPress={hide} style={[styles.toast, { backgroundColor: colors.card, borderColor: colors.border, borderRightColor: edge, shadowColor: isDark ? "#000" : palette.burgundy }]}>
          <Text style={[styles.text, { color: colors.text }]}>{item.message}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: 16, right: 16, alignItems: "center", zIndex: 1000, elevation: 1000 },
  toast: { maxWidth: 520, minWidth: 200, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderRightWidth: 4, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  text: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 14, lineHeight: 22, textAlign: "right" },
});
