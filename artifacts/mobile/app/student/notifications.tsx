import { Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { StudentScreen } from "./_screen";
import { Icon } from "../../components/ui";
import { useTheme } from "../../lib/theme";
import { NotificationFeed } from "../../components/notification-feed";

export default function Notifications() {
  const router = useRouter();
  const { colors } = useTheme();
  const settingsButton = <Pressable accessibilityLabel="إعدادات الإشعارات" onPress={() => router.push("/student/notifications/settings" as never)} style={styles.settingsButton}><Icon name="settings-outline" size={20} color={colors.primary} /></Pressable>;
  return (
    <StudentScreen title="الإشعارات" right={settingsButton}>
      <NotificationFeed listPath="/student/notifications" settingsPath="/student/notifications/settings" />
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  settingsButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
});