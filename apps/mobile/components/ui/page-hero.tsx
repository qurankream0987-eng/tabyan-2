import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SvgIcon, resolveIcon } from "./svg-icon";
import { palette, useTheme } from "../../lib/theme";

// Not imported from ./index: that file re-exports PageHero, so this would be a require cycle.
function Icon({ name, size, color }: { name: string; size: number; color: string }) {
  const web = resolveIcon(name);
  if (web) return <SvgIcon name={web.name} rotate={web.rotate} size={size} color={color} />;
  return <Ionicons name={name as keyof typeof Ionicons.glyphMap} size={size} color={color} />;
}

/**
 * Centred page heading like the web pages: an icon in a tinted bubble, an
 * Amiri title and a short description.
 */
export function PageHero({ icon, title, subtitle, style }: { icon?: string; title: string; subtitle?: string; style?: StyleProp<ViewStyle> }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.hero, style]}>
      {icon ? (
        <View style={[styles.bubble, { backgroundColor: isDark ? `${palette.gold}1F` : `${palette.burgundy}12` }]}>
          <Icon name={icon} size={26} color={isDark ? palette.gold : palette.burgundy} />
        </View>
      ) : null}
      <Text style={[styles.title, { color: isDark ? palette.gold : palette.burgundy }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: 6, paddingTop: 6, paddingBottom: 16 },
  bubble: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontFamily: "Amiri_700Bold", fontSize: 26, lineHeight: 40, textAlign: "center" },
  subtitle: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 13, lineHeight: 21, textAlign: "center", paddingHorizontal: 12 },
});
