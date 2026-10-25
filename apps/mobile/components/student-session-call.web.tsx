import { Text } from "react-native";
import { Card } from "./ui";
import type { StudentSessionCallProps } from "./student-session-call.native";
import { useTheme } from "../lib/theme";

export default function StudentSessionCall({ sessionStatus }: StudentSessionCallProps) {
  const { colors } = useTheme();
  return (
    <Card>
      <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 22 }}>
        دخول الحلقة الحية متاح من التطبيق الأصلي على Development Build. لا يتم عرض اتصال وهمي على الويب.
        {sessionStatus !== "in_progress" ? " هذه الحلقة ليست جارية حالياً." : ""}
      </Text>
    </Card>
  );
}