import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, Icon } from "./ui";
import { LocalVideoPreview } from "./library-media-player";
import { useTheme } from "../lib/theme";
import {
  placementPreviewStep,
  type PlacementPreviewViewModel,
} from "../lib/placement-media";

const DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const toArabicDigits = (value: number) => String(value).replace(/\d/g, (digit) => DIGITS[Number(digit)]);
const formatDuration = (seconds: number) => {
  const rounded = Math.floor(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return `${toArabicDigits(minutes).padStart(2, "٠")}:${toArabicDigits(remainder).padStart(2, "٠")}`;
};

type PlacementPreviewProps = {
  model: PlacementPreviewViewModel;
  uri: string;
  error: string | null;
  attemptReserved: boolean;
  reservingAttempt: boolean;
  isUploading: boolean;
  submitPending: boolean;
  uploadProgress: number;
  workflowReady: boolean;
  canReset: boolean;
  hasAttemptId: boolean;
  accessory?: ReactNode;
  onSubmit: () => void;
  onRerecord: () => void;
  onResyncAttempt?: () => void;
};

const VALIDATION_ROWS = [
  ["videoValid", "مسار الصورة"],
  ["audioValid", "مسار الصوت"],
  ["durationValid", "المدة"],
  ["fileReadable", "قراءة الملف"],
] as const;

export function PlacementPreview({
  model,
  uri,
  error,
  attemptReserved,
  reservingAttempt,
  isUploading,
  submitPending,
  uploadProgress,
  workflowReady,
  canReset,
  hasAttemptId,
  accessory,
  onSubmit,
  onRerecord,
  onResyncAttempt,
}: PlacementPreviewProps) {
  const { colors } = useTheme();
  const currentStep = placementPreviewStep(model.phase);
  const invalidAudio = !model.audioValid;

  return (
    <View testID="ios-placement-preview" style={styles.root}>
      <View accessibilityLabel="خطوات اختبار القبول" style={styles.steps}>
        {["التعليمات", "التسجيل", "المعاينة", "الإرسال"].map((label, index) => {
          const state = index < currentStep ? "done" : index === currentStep ? "active" : "next";
          return (
            <View key={label} style={styles.step}>
              <View style={[
                styles.stepDot,
                { borderColor: state === "next" ? colors.border : colors.primary },
                state === "done" && { backgroundColor: colors.primary },
                state === "active" && { backgroundColor: colors.primary },
              ]}>
                {state === "done"
                  ? <Icon name="checkmark" size={13} color={colors.primaryText} />
                  : <Text style={[styles.stepNumber, { color: state === "next" ? colors.muted : colors.primaryText }]}>
                      {toArabicDigits(index + 1)}
                    </Text>}
              </View>
              <Text style={[styles.stepLabel, { color: state === "next" ? colors.muted : colors.text }]} numberOfLines={1}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      <Text
        accessibilityRole={model.submissionReady ? "text" : "alert"}
        style={[
          styles.status,
          { color: model.submissionReady ? colors.text : colors.danger },
        ]}
      >
        {model.submissionReady
          ? model.phase === "UPLOADING" ? "جارٍ إرسال الاختبار…" : "راجع وضوح الصورة والصوت قبل الإرسال."
          : "التسجيل غير صالح للإرسال."}
      </Text>

      <View
        testID="ios-placement-video-frame"
        style={[styles.videoFrame, { backgroundColor: colors.background, borderColor: colors.border }]}
      >
        {model.fileReadable && model.videoValid ? (
          <LocalVideoPreview
            uri={uri}
            style={styles.video}
            placementControls
          />
        ) : (
          <View style={styles.unavailable}>
            <Icon name="videocam-off-outline" size={28} color={colors.muted} />
            <Text style={[styles.unavailableText, { color: colors.muted }]}>
              تعذرت معاينة الفيديو لأن الملف غير قابل للقراءة أو لا يحتوي على صورة صالحة.
            </Text>
          </View>
        )}
      </View>

      <Card style={styles.validationCard}>
        <View style={styles.validationGrid}>
          {VALIDATION_ROWS.map(([key, label]) => {
            const passed = model[key];
            return (
              <View key={key} style={styles.validationRow}>
                <Icon
                  name={passed ? "checkmark-circle-outline" : "alert-circle-outline"}
                  size={17}
                  color={passed ? colors.success : colors.danger}
                />
                <Text style={[styles.validationText, { color: colors.text }]}>
                  {label}: {passed ? "مؤكد" : "غير مؤكد"}
                </Text>
              </View>
            );
          })}
        </View>
        {!model.submissionReady ? (
          <View style={styles.issue}>
            <Text style={[styles.issueTitle, { color: colors.danger }]}>
              {model.failureMessage ?? "تعذر التحقق من ملف التسجيل."}
            </Text>
            <Text style={[styles.issueHint, { color: colors.muted }]}>
              {invalidAudio
                ? "تحقق من إذن الميكروفون وأعد التسجيل."
                : "أعد التسجيل قبل الإرسال."}
            </Text>
          </View>
        ) : null}
        <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.metaText, { color: colors.text }]}>
            مدة الملف: {formatDuration(model.durationSeconds)}
          </Text>
          <Text style={[styles.metaText, { color: colors.muted }]}>
            المحاولات: {toArabicDigits(model.attemptsUsed)} من {toArabicDigits(model.attemptsMax)}
          </Text>
        </View>
        {isUploading ? (
          <Text style={[styles.progress, { color: colors.primary }]}>
            جارٍ الرفع والتحقق… {toArabicDigits(uploadProgress)}٪
          </Text>
        ) : null}
        {!attemptReserved && hasAttemptId && onResyncAttempt ? (
          <Button
            testID="placement-attempt-resync"
            label={reservingAttempt ? "جارٍ تثبيت المحاولة…" : "إعادة مزامنة المحاولة"}
            icon="sync-outline"
            loading={reservingAttempt}
            disabled={reservingAttempt || isUploading || submitPending}
            onPress={onResyncAttempt}
          />
        ) : null}
        {model.submissionReady && error ? (
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
        ) : null}
      </Card>

      {model.submissionReady && accessory ? <View style={styles.accessory}>{accessory}</View> : null}

      {model.primaryAction === "SUBMIT" ? (
        <Button
          testID="placement-submit-button"
          label={isUploading ? "جارٍ الإرسال…" : "إرسال الاختبار"}
          icon="cloud-upload-outline"
          loading={isUploading || submitPending}
          disabled={!model.submissionReady || !workflowReady || isUploading || submitPending}
          onPress={onSubmit}
        />
      ) : (
        <Button
          testID="placement-rerecord-button"
          label="إعادة التسجيل"
          icon="refresh-outline"
          disabled={!model.canRerecord || !canReset || isUploading || submitPending}
          onPress={onRerecord}
        />
      )}
      {!model.canRerecord && !model.submissionReady ? (
        <Text style={[styles.noAttempts, { color: colors.muted }]}>
          انتهت المحاولات المتاحة؛ لا يمكن بدء محاولة جديدة حتى يفتحها المشرف.
        </Text>
      ) : null}
      {model.submissionReady && model.canRerecord ? (
        <Button
          label="حذف التسجيل وإعادة المحاولة"
          icon="refresh-outline"
          variant="secondary"
          disabled={!canReset || isUploading || submitPending}
          onPress={onRerecord}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: "100%", alignSelf: "stretch", alignItems: "center", gap: 10 },
  steps: { width: "100%", flexDirection: "row-reverse", alignItems: "flex-start", marginBottom: 2 },
  step: { flex: 1, alignItems: "center", gap: 4 },
  stepDot: { width: 27, height: 27, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  stepNumber: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 10 },
  stepLabel: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 9, textAlign: "center" },
  status: { width: "100%", fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 13, lineHeight: 20, textAlign: "center" },
  videoFrame: {
    width: "100%",
    maxWidth: 480,
    aspectRatio: 3 / 4,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  video: { width: "100%", aspectRatio: 3 / 4, alignSelf: "center" },
  unavailable: { alignItems: "center", justifyContent: "center", gap: 8, padding: 18 },
  unavailableText: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 12, lineHeight: 19, textAlign: "center" },
  validationCard: { width: "100%", gap: 8, padding: 12, marginBottom: 0 },
  validationGrid: { width: "100%", flexDirection: "row-reverse", flexWrap: "wrap", rowGap: 8, columnGap: 6 },
  validationRow: { width: "48%", minHeight: 22, flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  validationText: { flexShrink: 1, fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 10.5, textAlign: "right" },
  issue: { alignItems: "flex-end", gap: 2 },
  issueTitle: { fontFamily: "IBMPlexSansArabic_700Bold", fontSize: 12, lineHeight: 18, textAlign: "right" },
  issueHint: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 10.5, lineHeight: 16, textAlign: "right" },
  metaRow: { width: "100%", flexDirection: "row-reverse", justifyContent: "space-between", gap: 8, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 7 },
  metaText: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 10.5, textAlign: "right" },
  progress: { fontFamily: "IBMPlexSansArabic_600SemiBold", fontSize: 11, textAlign: "center" },
  error: { fontFamily: "IBMPlexSansArabic_400Regular", fontSize: 11, lineHeight: 18, textAlign: "right" },
  accessory: { width: "100%" },
  noAttempts: { fontFamily: "IBMPlexSansArabic_500Medium", fontSize: 11, lineHeight: 18, textAlign: "center" },
});
