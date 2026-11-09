import { Pressable, StyleSheet } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgIcon } from "../ui";
import { mushafStorage } from "../../lib/storage";
import { palette, useTheme } from "../../lib/theme";

/** Screens with the floating tab bar: the button sits above it. */
const TAB_SCREENS = new Set(["/student/home", "/student/account", "/student/fatwa", "/student/library", "/student/mushaf-tab", "/student/recordings", "/student/schedule"]);

/**
 * Where the button would be in the way: reciting already, the Mushaf reader (its own button sits
 * under the text), and screens recording video or in a live lesson.
 */
function hiddenOn(pathname: string) {
  return pathname.startsWith("/student/recitation")
    || pathname.startsWith("/student/mushaf") && pathname !== "/student/mushaf-tab"
    || pathname.startsWith("/student/placement")
    || pathname.startsWith("/student/session");
}

/**
 * Recite from anywhere, from every student screen: listening starts at once and the Mushaf
 * opens where the reader is (shown first: the page last read).
 */
export function ReciteAnywhereButton() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  if (hiddenOn(pathname)) return null;
  const bottom = TAB_SCREENS.has(pathname) || pathname === "/student" ? 112 : insets.bottom + 24;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="سمّع من أي موضع"
      onPress={() => {
        void mushafStorage.getLastPage().catch(() => null).then((page) => {
          router.push({ pathname: "/student/recitation", params: { anywhere: "1", page: String(page ?? 1) } } as never);
        });
      }}
      style={({ pressed }) => [styles.button, { bottom, backgroundColor: isDark ? palette.gold : palette.burgundy, opacity: pressed ? 0.85 : 1 }]}
    >
      <SvgIcon name="mic" size={26} color={isDark ? palette.night : "#FFFFFF"} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { position: "absolute", left: 18, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 6, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
});
