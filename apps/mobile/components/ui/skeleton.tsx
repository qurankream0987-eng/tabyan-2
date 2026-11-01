import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../../lib/theme";

/** Grey placeholder block that breathes while data loads (web `.skeleton`). */
export function Skeleton({ width, height = 16, radius = 12, style }: { width?: number | `${number}%`; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const { isDark } = useTheme();
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.45, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ width: width ?? "100%", height, borderRadius: radius, backgroundColor: isDark ? "rgba(212,175,55,0.10)" : "rgba(128,0,32,0.09)", opacity: pulse }, style]} />;
}

/** The shape of a typical screen: a hero block and a few cards. */
export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <View accessibilityLabel="جارٍ التحميل" style={styles.page}>
      <View style={styles.hero}>
        <Skeleton width={56} height={56} radius={28} />
        <Skeleton width="60%" height={22} />
        <Skeleton width="40%" height={14} />
      </View>
      {Array.from({ length: cards }, (_, index) => (
        <View key={index} style={styles.card}>
          <Skeleton width="45%" height={16} style={styles.alignEnd} />
          <Skeleton height={12} />
          <Skeleton width="80%" height={12} style={styles.alignEnd} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 8, gap: 12 },
  hero: { alignItems: "center", gap: 10, paddingVertical: 18 },
  card: { borderRadius: 22, padding: 16, gap: 10, alignItems: "flex-end" },
  alignEnd: { alignSelf: "flex-end" },
});
