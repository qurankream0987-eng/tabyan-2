import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { useTheme } from "../../lib/theme";

/**
 * Soft gold light behind a screen, like the web IslamicBg: a corner glow at the
 * top and one at the bottom. Static so it costs nothing while scrolling.
 */
export function GlowBackground() {
  const { isDark } = useTheme();
  const gold = "#D4AF37";
  const strength = isDark ? 0.22 : 0.30;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="corner" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={gold} stopOpacity={strength} />
            <Stop offset="45%" stopColor={gold} stopOpacity={strength * 0.3} />
            <Stop offset="100%" stopColor={gold} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="flow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={gold} stopOpacity={isDark ? 0.10 : 0.14} />
            <Stop offset="100%" stopColor={gold} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="0" cy="0" r="200" fill="url(#corner)" />
        <Circle cx="100%" cy="100%" r="200" fill="url(#corner)" />
        <Ellipse cx="80%" cy="18%" rx="60%" ry="22%" fill="url(#flow)" />
      </Svg>
    </View>
  );
}
