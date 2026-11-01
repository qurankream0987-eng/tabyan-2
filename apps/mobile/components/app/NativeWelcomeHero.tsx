import { useContext, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "react-native-reanimated";
import { TABYAN_WELCOME_GREETING } from "@workspace/tabyan-domain";
import { Button } from "../ui";
import { palette, useTheme } from "../../lib/theme";
import { nativeWelcomeLayout } from "../../lib/platform/native-welcome-layout";
import { IOSWelcomeLogoVisible } from "../../lib/platform/ios-welcome-visibility";

/**
 * Web GuestHome hero: the logo floats over a soft gold glow, an Amiri headline,
 * then three stacked calls to action in the web order.
 */
export default function NativeWelcomeHero({ onRegister, onLogin, onBrowseMushaf }: {
  onRegister: () => void;
  onLogin: () => void;
  onBrowseMushaf: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = nativeWelcomeLayout(width, height, insets.top, insets.bottom);
  const { colors, isDark } = useTheme();
  const visible = useContext(IOSWelcomeLogoVisible);
  const reduceMotion = useReducedMotion();
  const logoOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fade = Animated.timing(logoOpacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? 120 : 0,
      useNativeDriver: true,
    });
    fade.start();
    return () => fade.stop();
  }, [logoOpacity, visible]);

  // Web `.float`: a slow up-and-down drift; still for users who asked for less motion.
  useEffect(() => {
    if (reduceMotion) { float.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: -6, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [float, reduceMotion]);

  const glowSize = layout.logoSize + 56;
  const glowAlpha = isDark ? ["14", "1A", "26"] : ["1F", "2E", "40"];
  return (
    <View style={[styles.hero, { gap: layout.gap }]}>
      <Animated.View style={[styles.logoWrap, { width: glowSize, height: glowSize, transform: [{ translateY: float }] }]}>
        {/* Web `bg-gold/25 blur-3xl`: no blur filter here, so three soft rings fake the falloff. */}
        {glowAlpha.map((alpha, index) => {
          const size = glowSize - index * 18;
          return <View key={alpha} style={[styles.glow, { width: size, height: size, borderRadius: size / 2, backgroundColor: `${palette.gold}${alpha}` }]} />;
        })}
        <Animated.Image
          source={isDark
            ? require("../../assets/images/logo-dark.png")
            : require("../../assets/images/logo-light.png")}
          resizeMode="contain"
          style={{ width: layout.logoSize, height: layout.logoSize, opacity: logoOpacity }}
          accessibilityLabel="شعار تبيان"
        />
      </Animated.View>

      <Text
        style={[
          styles.title,
          {
            color: isDark ? palette.gold : palette.burgundy,
            fontSize: layout.compact ? 28 : 34,
            lineHeight: layout.compact ? 42 : 51,
          },
        ]}
      >
        {TABYAN_WELCOME_GREETING}
      </Text>
      <Text
        style={[
          styles.description,
          {
            color: colors.muted,
            fontSize: layout.compact ? 13 : 15,
            lineHeight: layout.compact ? 21 : 25,
          },
        ]}
      >
        منصة تصلك بالمعلمين المعتمدين — حلقات قرآن، تجويد، علوم شرعية، وفتاوى موثوقة
      </Text>

      <View style={[styles.actions, { gap: layout.compact ? 8 : 10 }]}>
        <Button
          testID="welcome-register"
          label="ابدأ رحلتك — مجاناً"
          icon="arrow-forward"
          onPress={onRegister}
          style={[styles.action, { minHeight: layout.actionHeight + 2 }]}
        />
        <Button
          testID="welcome-login"
          label="تسجيل الدخول"
          variant="secondary"
          icon="person-outline"
          onPress={onLogin}
          style={[styles.action, { minHeight: layout.actionHeight }]}
        />
        <Button
          testID="welcome-open-mushaf"
          label="تصفّح المصحف مباشرة"
          variant="quiet"
          icon="book-outline"
          onPress={onBrowseMushaf}
          style={[styles.action, { minHeight: layout.actionHeight }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingTop: 8, paddingBottom: 2 },
  logoWrap: { alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute" },
  title: { fontFamily: "Amiri_700Bold", textAlign: "center", writingDirection: "rtl", paddingHorizontal: 8 },
  description: {
    maxWidth: 400,
    fontFamily: "IBMPlexSansArabic_400Regular",
    textAlign: "center",
    writingDirection: "rtl",
    paddingHorizontal: 8,
  },
  actions: { width: "100%", marginTop: 6 },
  action: { width: "100%" },
});
