import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "./ui";
import {
  LibraryMediaPlayer,
  type LibraryMediaDiagnosticEvent,
} from "./library-media-player";
import { useTheme } from "../lib/theme";

export const PLACEMENT_VIDEO_AB_DIAGNOSTIC_ENABLED =
  process.env.EXPO_PUBLIC_PLACEMENT_VIDEO_AB_DIAGNOSTIC === "true";

export const PLACEMENT_VIDEO_AB_ORIGINAL_OBJECT_ID =
  "e48f5e4d-fb73-4d51-8708-92db519ccdd9";
export const PLACEMENT_VIDEO_AB_DIAGNOSTIC_OBJECT_PATH =
  "/objects/uploads/503c9afc-1283-447f-8480-f4fd5b9d7cde";

export function isPlacementVideoAbOriginal(value: unknown) {
  return typeof value === "string" && value.includes(PLACEMENT_VIDEO_AB_ORIGINAL_OBJECT_ID);
}

type SourceChoice = "original" | "diagnostic";

export function PlacementVideoAbHarness({ originalSource }: { originalSource: string }) {
  const { colors } = useTheme();
  const [choice, setChoice] = useState<SourceChoice>("original");
  const [diagnosticEvent, setDiagnosticEvent] = useState<LibraryMediaDiagnosticEvent>({
    status: "loading",
    error: null,
  });

  const onDiagnosticEvent = useCallback((event: LibraryMediaDiagnosticEvent) => {
    setDiagnosticEvent(event);
  }, []);

  if (!PLACEMENT_VIDEO_AB_DIAGNOSTIC_ENABLED || !isPlacementVideoAbOriginal(originalSource)) {
    return null;
  }

  const source = choice === "original" ? originalSource : PLACEMENT_VIDEO_AB_DIAGNOSTIC_OBJECT_PATH;
  const sourceLabel = choice === "original" ? "الفيديو الأصلي A" : "نسخة الاختبار B";
  const errorText = diagnosticEvent.error
    ? JSON.stringify(diagnosticEvent.error)
    : "لا يوجد خطأ ملتقط";

  return (
    <Card accent style={styles.card}>
      <Text style={[styles.title, { color: colors.text }]}>اختبار فيديو Placement التشخيصي</Text>
      <Text style={[styles.note, { color: colors.muted }]}>
        أداة مؤقتة للمشرف فقط · نفس LibraryMediaPlayer ونفس مسار الوسائط الخاص.
      </Text>
      <View style={styles.sourceRow}>
        {(["original", "diagnostic"] as const).map((nextChoice) => {
          const selected = choice === nextChoice;
          return (
            <Pressable
              key={nextChoice}
              accessibilityRole="button"
              accessibilityLabel={nextChoice === "original" ? "الفيديو الأصلي A" : "نسخة الاختبار B"}
              onPress={() => {
                setChoice(nextChoice);
                setDiagnosticEvent({ status: "loading", error: null });
              }}
              style={[
                styles.sourceButton,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary : colors.input,
                },
              ]}
            >
              <Text style={{ color: selected ? colors.primaryText : colors.text }}>
                {nextChoice === "original" ? "الفيديو الأصلي A" : "نسخة الاختبار B"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.activeSource, { color: colors.primary }]}>المصدر الحالي: {sourceLabel}</Text>
      <LibraryMediaPlayer
        key={source}
        source={source}
        contentType="video"
        onDiagnosticEvent={onDiagnosticEvent}
      />
      <View style={[styles.evidence, { borderColor: colors.border, backgroundColor: colors.input }]}>
        <Text style={[styles.evidenceLabel, { color: colors.muted }]}>بيانات الالتقاط التشخيصي</Text>
        <Text selectable style={[styles.evidenceText, { color: colors.text }]}>
          status: {diagnosticEvent.status}
          {"\n"}error: {errorText}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, marginTop: 12 },
  title: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, textAlign: "right" },
  note: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 5 },
  sourceRow: { flexDirection: "row-reverse", gap: 8, marginTop: 12 },
  sourceButton: { flex: 1, minHeight: 40, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  activeSource: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 11, textAlign: "right", marginTop: 10 },
  evidence: { borderWidth: 1, borderRadius: 10, padding: 9, marginTop: 10 },
  evidenceLabel: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 11, textAlign: "right" },
  evidenceText: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10, lineHeight: 16, textAlign: "left", marginTop: 4 },
});