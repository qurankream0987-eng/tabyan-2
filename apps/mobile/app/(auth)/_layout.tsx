import { Redirect, Stack, useGlobalSearchParams, useSegments } from "expo-router";
import { useAuth } from "../../lib/auth";

export default function AuthLayout() {
  const { ready, token, role } = useAuth();
  const segments = useSegments() as readonly string[];
  const { role: wanted } = useGlobalSearchParams<{ role?: string }>();
  // A signed-in student never signs up as a teacher or signs in as a teacher or admin
  // (a notification link, the admin area's redirect): he goes back to his home.
  const screen = segments.at(-1);
  const staffEntry = screen === "teacher-register" || (screen === "login" && (wanted === "teacher" || wanted === "admin"));
  if (ready && token && role === "student" && staffEntry) return <Redirect href="/student/home" />;
  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_left" }} />;
}
