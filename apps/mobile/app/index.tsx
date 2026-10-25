import { Redirect } from "expo-router";
import { LoadingState } from "../components/ui";
import { useAuth } from "../lib/auth";

export default function Index() {
  const { ready, token, role } = useAuth();
  if (!ready) return <LoadingState label="جارٍ استعادة الجلسة…" />;
  if (!token || !role) return <Redirect href="/guest" />;
  if (role === "teacher") return <Redirect href="/teacher" />;
  if (role === "admin") return <Redirect href="/admin" />;
  return <Redirect href="/student/home" />;
}
