import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../lib/auth";
import { AdminFeedbackProvider } from "../../components/admin/admin-ui";

export default function AdminLayout() {
  const { ready, token, role } = useAuth();
  if (!ready) return null;
  if (!token || role !== "admin") return <Redirect href="/login?role=admin" />;
  return <AdminFeedbackProvider><Stack screenOptions={{ headerShown: false, animation: "slide_from_left" }} /></AdminFeedbackProvider>;
}
