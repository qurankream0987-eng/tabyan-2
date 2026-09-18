import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../lib/auth";

export default function AdminLayout() {
  const { ready, token, role } = useAuth();
  if (!ready) return null;
  if (!token || role !== "admin") return <Redirect href="/login" />;
  return <Stack screenOptions={{ headerShown: false, animation: "fade" }} />;
}