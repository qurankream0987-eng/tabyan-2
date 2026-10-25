import { Text } from "react-native";
import { Card } from "./ui";
import type { TeacherSessionCallProps } from "./teacher-session-call.native";
import { useTheme } from "../lib/theme";

export default function TeacherSessionCall({ sessionStatus }: TeacherSessionCallProps) {
  const { colors } = useTheme();
  return (
    <Card>
      <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 22 }}>
        غرفة المعلم الحية متاحة من التطبيق الأصلي على Development Build. لا يتم عرض اتصال وهمي على الويب.
        {sessionStatus !== "in_progress" ? " هذه الحلقة ليست جارية حالياً." : ""}
      </Text>
    </Card>
  );
}