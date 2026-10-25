import { Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { AdminFrame } from "./_common";
import { Icon } from "../../components/ui";
import { useTheme } from "../../lib/theme";
import { NotificationFeed } from "../../components/notification-feed";

export default function Inbox() {
  const router = useRouter();
  const { colors } = useTheme();
  const settingsButton = <Pressable accessibilityLabel="إعدادات الإشعارات" onPress={() => router.push("/admin/inbox/settings" as never)} style={styles.settingsButton}><Icon name="settings-outline" size={20} color={colors.primary} /></Pressable>;
  return (
    <AdminFrame title="صندوق الوارد" right={settingsButton}>
      <NotificationFeed listPath="/admin/inbox" settingsPath="/admin/inbox/settings" />
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  settingsButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
});