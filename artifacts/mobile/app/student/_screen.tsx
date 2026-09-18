import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { Card, EmptyState, ErrorState, Header, LoadingState, Screen, SectionTitle } from "../../components/ui";
import { useTheme } from "../../lib/theme";

export function StudentScreen({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return <><Header title={title} subtitle={subtitle} right={right} back /><Screen>{children}</Screen></>;
}
export function LinkCard({ title, description, href }: { title: string; description: string; href: string }) {
  const router = useRouter(); const { colors } = useTheme();
  return <Pressable onPress={() => router.push(href as never)}><Card><Text style={[styles.title, { color: colors.text }]}>{title}</Text><Text style={[styles.desc, { color: colors.muted }]}>{description}</Text></Card></Pressable>;
}
export { Badge, Card, EmptyState, ErrorState, LoadingState, SectionTitle } from "../../components/ui";
const styles = StyleSheet.create({ title: { fontFamily: "IBMPlexSansArabic_700Bold", textAlign: "right", fontSize: 16 }, desc: { fontFamily: "IBMPlexSansArabic_400Regular", textAlign: "right", fontSize: 12, marginTop: 5, lineHeight: 21 } });