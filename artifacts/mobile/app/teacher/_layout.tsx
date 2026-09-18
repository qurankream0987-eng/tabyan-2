import { Redirect, Stack, useSegments } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "../../lib/auth";
import { LoadingState } from "../../components/ui";
import { trpc } from "../../lib/trpc";

export default function TeacherLayout() {
  const { ready, token, role } = useAuth();
  const segments = useSegments();
  const isOnboarding = (segments as readonly string[]).includes("onboarding");
  const kyc = trpc.teacher.kycStatus.useQuery(undefined, { enabled: !!token && role === "teacher", retry: false });
  if (!ready) return <LoadingState label="جارٍ التحقق من الحساب…" />;
  if (!token) return <Redirect href="/(auth)/login" />;
  if (role !== "teacher") return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}><Text>هذا القسم مخصص للحسابات المعتمدة للمعلمين.</Text></View>;
  if (!isOnboarding && kyc.data && (kyc.data as any).kycStatus !== "approved") return <Redirect href="/teacher/onboarding" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}