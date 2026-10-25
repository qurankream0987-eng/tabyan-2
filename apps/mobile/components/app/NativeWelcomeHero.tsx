import { useContext, useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TABYAN_WELCOME_GREETING } from "@workspace/tabyan-domain";
import { Button } from "../ui";
import { palette, useTheme } from "../../lib/theme";
import { nativeWelcomeLayout } from "../../lib/platform/native-welcome-layout";
import { IOSWelcomeLogoVisible } from "../../lib/platform/ios-welcome-visibility";

export default function NativeWelcomeHero({ onRegister }: {
  onRegister: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = nativeWelcomeLayout(width, height, insets.top, insets.bottom);
  const { colors, isDark } = useTheme();
  const visible = useContext(IOSWelcomeLogoVisible);
  const logoOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    const fade = Animated.timing(logoOpacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? 120 : 0,
      useNativeDriver: true,
    });
    fade.start();
    return () => fade.stop();
  }, [logoOpacity, visible]);

  return (
    <View style={[styles.hero, { gap: layout.gap }]}>
      <View
        style={[
          styles.logoWrap,
          {
            width: layout.logoSize + 12,
            height: layout.logoSize + 12,
            borderRadius: (layout.logoSize + 12) / 2,
            backgroundColor: `${palette.gold}14`,
          },
        ]}
      >
        <Animated.Image
          source={isDark
            ? require("../../assets/images/logo-dark.png")
            : require("../../assets/images/logo-light.png")}
          resizeMode="contain"
          style={{ width: layout.logoSize, height: layout.logoSize, opacity: logoOpacity }}
          accessibilityLabel="شعار تبيان"
        />
      </View>

      <Text
        style={[
          styles.title,
          {
            color: isDark ? palette.gold : palette.burgundy,
            fontSize: layout.compact ? 24 : 28,
            lineHeight: layout.compact ? 33 : 39,
          },
        ]}
      >
        {TABYAN_WELCOME_GREETING}
      </Text>
      <Text
        numberOfLines={3}
        style={[
          styles.description,
          {
            color: colors.muted,
            fontSize: layout.compact ? 12 : 14,
            lineHeight: layout.compact ? 17 : 22,
          },
        ]}
      >
        منصة تصلك بالمعلمين المعتمدين — حلقات قرآن، تجويد، وعلوم شرعية
      </Text>

      <View style={[styles.actions, { gap: layout.gap }]}>
        <Button
          testID="welcome-register"
          label="ابدأ رحلتك — سجّل مجاناً"
          icon="arrow-forward"
          onPress={onRegister}
          style={[styles.action, styles.primaryAction, { minHeight: layout.actionHeight }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingBottom: 2 },
  logoWrap: { alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "IBMPlexSansArabic_700Bold", textAlign: "center", writingDirection: "rtl" },
  description: {
    maxWidth: 420,
    fontFamily: "IBMPlexSansArabic_400Regular",
    textAlign: "center",
    writingDirection: "rtl",
  },
  actions: { width: "100%" },
  action: { width: "100%" },
  primaryAction: {
    borderRadius: 999,
    shadowColor: palette.burgundy,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});
