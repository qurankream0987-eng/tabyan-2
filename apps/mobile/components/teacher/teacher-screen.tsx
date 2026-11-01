import { StyleSheet, Text } from "react-native";
import { Card, EmptyState, ErrorState, Header, LoadingState, Screen } from "../ui";
import { palette, useTheme } from "../../lib/theme";

export function TeacherScreen({ title, right, children, loading, error, retry, back = false, home = false }: { title: string; right?: React.ReactNode; back?: boolean; home?: boolean; children?: React.ReactNode; loading?: boolean; error?: boolean; retry?: () => void }) {
  if (loading) return <><Header title={title} right={right} back={back} home={home} menu={back ? undefined : "teacher"} /><Screen><LoadingState /></Screen></>;
  if (error) return <><Header title={title} right={right} back={back} home={home} menu={back ? undefined : "teacher"} /><Screen><ErrorState onRetry={retry} /></Screen></>;
  return <><Header title={title} right={right} back={back} home={home} menu={back ? undefined : "teacher"} /><Screen>{children}</Screen></>;
}
export function OfflineNotice() { const { colors } = useTheme(); return <Card style={[styles.offline, { borderColor: `${palette.gold}88`, backgroundColor: `${palette.gold}12` }]}><Text style={[styles.text, { color: colors.muted }]}>قد تكون البيانات غير محدثة — تحقق من الاتصال بالإنترنت.</Text></Card>; }
export function Row({ title, detail }: { title: string; detail?: string }) { const { colors } = useTheme(); return <Card><Text style={[styles.title, { color: colors.text }]}>{title}</Text>{detail ? <Text style={[styles.text, { color: colors.muted }]}>{detail}</Text> : null}</Card>; }
export { EmptyState };
const styles = StyleSheet.create({ title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, textAlign: "right" }, text: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 12, textAlign: "right", lineHeight: 21 }, offline: {} });