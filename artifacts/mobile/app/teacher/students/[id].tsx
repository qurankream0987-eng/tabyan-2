import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Card } from "../../../components/ui";
import { trpc } from "../../../lib/trpc";
import { TeacherScreen } from "../_components";
export default function StudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = trpc.teacher.studentDetail.useQuery({ studentId: String(id) }, { enabled: !!id });
  const d = q.data as any;
  const progress = d?.progress ?? d?.stats;
  const rows = Array.isArray(progress) ? progress : Object.entries(progress ?? {}).map(([label, value]) => ({ label, value }));
  return (
    <TeacherScreen title="ملف الطالب" loading={q.isLoading} error={!!q.error} retry={() => void q.refetch()}>
      {d ? <Card>
        <Text style={{ textAlign: "right", fontWeight: "bold", fontSize: 20 }}>{d.name ?? d.student?.name ?? "الطالب"}</Text>
        {rows.length ? rows.slice(0, 12).map((row: any, index: number) => (
          <View key={String(row.id ?? row.levelId ?? row.label ?? index)} style={{ marginTop: 10 }}>
            <Text style={{ textAlign: "right", fontWeight: "600" }}>{String(row.name ?? row.label ?? "مؤشر التقدم")}</Text>
            <Text style={{ textAlign: "right", marginTop: 3, color: "#6b7280" }}>{typeof row.value === "object" ? String(row.value?.value ?? row.value?.count ?? "—") : String(row.value ?? row.completedSessions ?? row.status ?? "—")}</Text>
          </View>
        )) : <Text style={{ textAlign: "right", marginTop: 10, color: "#6b7280" }}>لا يوجد تقدم مسجل بعد.</Text>}
      </Card> : null}
    </TeacherScreen>
  );
}