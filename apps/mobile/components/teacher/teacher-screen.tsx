import { StyleSheet, Text } from "react-native";
import { Card, EmptyState, ErrorState, Header, LoadingState, Screen } from "../ui";
import { palette, useTheme } from "../../lib/theme";
import { SidebarLayout, useSidebarLayout } from "../ui/navigation-menu";

export function TeacherScreen({ title, right, children, loading, error, retry, back = false, home = false }: { title: string; right?: React.ReactNode; back?: boolean; home?: boolean; children?: React.ReactNode; loading?: boolean; error?: boolean; retry?: () => void }) {
  // Tablets show the permanent sidebar instead of the hamburger; back screens keep their back arrow.
  const wide = useSidebarLayout();
  const body = loading ? <LoadingState /> : error ? <ErrorState onRetry={retry} /> : children;
  const page = <><Header title={title} right={right} back={back} home={home} menu={back || wide ? undefined : "teacher"} /><Screen>{body}</Screen></>;
  return wide ? <SidebarLayout role="teacher">{page}</SidebarLayout> : page;
}
export function OfflineNotice() { const { colors } = useTheme(); return <Card style={[styles.offline, { borderColor: `${palette.gold}88`, backgroundColor: `${palette.gold}12` }]}><Text style={[styles.text, { color: colors.muted }]}>قد تكون البيانات غير محدثة — تحقق من الاتصال بالإنترنت.</Text></Card>; }
export function Row({ title, detail }: { title: string; detail?: string }) { const { colors } = useTheme(); return <Card><Text style={[styles.title, { color: colors.text }]}>{title}</Text>{detail ? <Text style={[styles.text, { color: colors.muted }]}>{detail}</Text> : null}</Card>; }
export { EmptyState };
const styles = StyleSheet.create({ title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, textAlign: "right" }, text: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", lineHeight: 21 }, offline: {} });