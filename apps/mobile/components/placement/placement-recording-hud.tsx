import { StyleSheet, Text, View } from "react-native";
import { Icon } from "../ui";
import { palette, useTheme } from "../../lib/theme";
import { placementCaptureMetrics } from "../../lib/placement/placement-capture-layout";

export function PlacementRecordingHUD({ elapsed, maximum, minimumReached, minimumLabel }: {
  elapsed: string; maximum: string; minimumReached: boolean; minimumLabel: string;
}) {
  const { colors } = useTheme();
  return (
    <View pointerEvents="none" testID="placement-recording-hud" style={styles.hud}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: colors.danger }]} />
        <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={styles.label}>التسجيل جارٍ</Text>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.15} accessibilityLabel={`مدة التسجيل ${elapsed}`} style={styles.timer}>
          {elapsed} / {maximum}
        </Text>
        <View accessible accessibilityLabel="الميكروفون — يُفحص مسار الصوت بعد الإيقاف">
          <Icon name="mic" size={15} color={palette.cream} />
        </View>
      </View>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={styles.minimum}>
        {minimumReached ? "✓ يمكنك إنهاء التسجيل" : `الحد الأدنى ${minimumLabel} ثانية`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: { position: "absolute", top: placementCaptureMetrics.hudTop, left: 12, right: 12, height: placementCaptureMetrics.hudHeight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, justifyContent: "center", gap: 2, backgroundColor: `${palette.burgundy}dd` },
  row: { height: 22, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  label: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, color: palette.cream, flexShrink: 1 },
  timer: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 15, color: palette.cream, writingDirection: "ltr", flexShrink: 1 },
  minimum: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 10, lineHeight: 17, textAlign: "center", color: palette.cream },
});
