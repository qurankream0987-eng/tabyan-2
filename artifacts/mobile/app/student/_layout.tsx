import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../lib/auth";
import { LoadingState } from "../../components/ui";

export default function StudentLayout() {
  const { ready, token, role } = useAuth();
  if (!ready) return <LoadingState label="جارٍ التحقق من الحساب…" />;
  if (!token || role !== "student") return <Redirect href="/(auth)/login" />;
  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_left" }} />;
}
