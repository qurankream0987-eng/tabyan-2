import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { Card, Header, Screen } from "../../components/ui";
import { useTheme } from "../../lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function StudentScreen({ title, subtitle, right, children, cameraMode = false, nativeHeaderSurface = "default" }: {
  title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; cameraMode?: boolean; nativeHeaderSurface?: "default" | "page";
}) {
  const insets = useSafeAreaInsets();
  // Keep the ScrollView ancestor mounted: swapping it for a View would
  // remount CameraView and interrupt an in-flight native recording.
  return <><Header title={title} subtitle={cameraMode ? undefined : subtitle} right={right} back nativeHeaderSurface={nativeHeaderSurface} /><Screen
    scrollEnabled={!cameraMode}
    scrollStyle={cameraMode ? { flex: 1 } : undefined}
    scrollContentStyle={cameraMode ? { flexGrow: 1, paddingBottom: 0 } : undefined}
    contentStyle={cameraMode ? { paddingHorizontal: 12, paddingTop: 8, paddingBottom: insets.bottom + 8 } : undefined}
  >{children}</Screen></>;
}
export function LinkCard({ title, description, href }: { title: string; description: string; href: string }) {
  const router = useRouter(); const { colors } = useTheme();
  return <Pressable onPress={() => router.push(href as never)}><Card><Text style={[styles.title, { color: colors.text }]}>{title}</Text><Text style={[styles.desc, { color: colors.muted }]}>{description}</Text></Card></Pressable>;
}
export { Badge, Card, EmptyState, ErrorState, LoadingState, SectionTitle } from "../../components/ui";
const styles = StyleSheet.create({ title: { fontFamily: "IBMPlexSansArabic_700Bold", textAlign: "right", fontSize: 16 }, desc: { fontFamily: "IBMPlexSansArabic_400Regular", textAlign: "right", fontSize: 12, marginTop: 5, lineHeight: 21 } });