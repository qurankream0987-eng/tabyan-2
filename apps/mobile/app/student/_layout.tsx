import { Redirect, Stack, usePathname } from "expo-router";
import { useAuth } from "../../lib/auth";
import { LoadingState } from "../../components/ui";
import { isGuestStudentRoute } from "../../lib/platform/guest-routes";

export default function StudentLayout() {
  const { ready, token, role } = useAuth();
  const pathname = usePathname();
  if (!ready) return <LoadingState label="جارٍ التحقق من الحساب…" />;
  // The mushaf reader is open to guests from the landing page; the rest needs a student account.
  const guestReadable = !token && isGuestStudentRoute(pathname);
  if (!guestReadable && (!token || role !== "student")) return <Redirect href="/(auth)/login" />;
  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_left" }} />;
}
