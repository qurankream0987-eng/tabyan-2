/** File inspection, not the player's optional language-selection menu. */
export type PlacementVideoInspection = {
  uri: string;
  videoTrackCount: number;
  audioTrackCount: number;
  durationSeconds: number;
  fileSizeBytes: number;
  mimeType: "video/quicktime" | "video/mp4";
  videoCodecs: string[];
  audioCodecs: string[];
};

export type PlacementMediaValidation = {
  fileReadable: boolean;
  videoValid: boolean;
  audioValid: boolean;
  durationValid: boolean;
  submissionReady: boolean;
  failureMessage: string | null;
};

export type PlacementPreviewPhase =
  | "READY"
  | "COUNTDOWN"
  | "STARTING"
  | "RECORDING"
  | "FINALIZING"
  | "VALIDATING"
  | "PREVIEW_VALID"
  | "PREVIEW_INVALID_VIDEO"
  | "PREVIEW_INVALID_AUDIO"
  | "PREVIEW_INVALID_DURATION"
  | "PREVIEW_INVALID_FILE"
  | "UPLOADING"
  | "SUCCESS"
  | "ERROR";

export type PlacementPreviewViewModel = PlacementMediaValidation & {
  phase: PlacementPreviewPhase;
  durationSeconds: number;
  attemptsUsed: number;
  attemptsMax: number;
  attemptsRemaining: number;
  canRerecord: boolean;
  primaryAction: "SUBMIT" | "RERECORD";
};

const SUPPORTED_VIDEO_MIME_TYPES = ["video/quicktime", "video/mp4"];

export function hasPlacementCapturePermissions(cameraGranted: boolean, microphoneGranted: boolean): boolean {
  return cameraGranted && microphoneGranted;
}

export function validateIOSPlacementMedia(
  uri: string | null,
  media: PlacementVideoInspection | null,
  minSeconds = 45,
  maxSeconds = 300,
): PlacementMediaValidation {
  const fileReadable = !!uri
    && !!media
    && media.uri === uri
    && Number.isFinite(media.fileSizeBytes)
    && media.fileSizeBytes > 0;
  const supportedFormat = !!media && SUPPORTED_VIDEO_MIME_TYPES.includes(media.mimeType);
  const videoValid = !!media
    && fileReadable
    && supportedFormat
    && Number.isFinite(media.videoTrackCount)
    && media.videoTrackCount > 0;
  const audioMetadataValid = !!media
    && Number.isFinite(media.audioTrackCount)
    && media.audioTrackCount >= 0;
  const audioValid = !!media
    && fileReadable
    && audioMetadataValid
    && media.audioTrackCount > 0;
  const durationValid = !!media
    && fileReadable
    && Number.isFinite(media.durationSeconds)
    && media.durationSeconds >= minSeconds
    && media.durationSeconds <= maxSeconds;

  let failureMessage: string | null = null;
  if (
    !uri
    || !media
    || media.uri !== uri
    || !Number.isFinite(media.fileSizeBytes)
    || media.fileSizeBytes <= 0
  ) {
    failureMessage = "تعذر قراءة ملف التسجيل أو أنه فارغ.";
  } else if (!SUPPORTED_VIDEO_MIME_TYPES.includes(media.mimeType)) {
    failureMessage = "صيغة ملف الفيديو غير مدعومة.";
  } else if (!Number.isFinite(media.videoTrackCount)) {
    failureMessage = "تعذر التحقق من مسار الصورة في الملف.";
  } else if (media.videoTrackCount < 1) {
    failureMessage = "لم يتم حفظ الصورة داخل ملف الفيديو.";
  } else if (!audioMetadataValid) {
    failureMessage = "تعذر التحقق من مسارات الصوت.";
  } else if (media.audioTrackCount === 0) {
    failureMessage = "لم يتم حفظ الصوت داخل التسجيل.";
  } else if (!durationValid) {
    failureMessage = `مدة ملف التسجيل خارج النطاق المسموح (${minSeconds}–${maxSeconds} ثانية).`;
  }

  return {
    fileReadable,
    videoValid,
    audioValid,
    durationValid,
    submissionReady: videoValid && audioValid && durationValid && fileReadable,
    failureMessage,
  };
}

export function placementMediaFailure(
  media: PlacementVideoInspection,
  minSeconds = 45,
  maxSeconds = 300,
): string | null {
  return validateIOSPlacementMedia(media.uri, media, minSeconds, maxSeconds).failureMessage;
}

export function canSubmitIOSPlacementMedia(
  uri: string | null,
  media: PlacementVideoInspection | null,
  minSeconds = 45,
  maxSeconds = 300,
): boolean {
  return validateIOSPlacementMedia(uri, media, minSeconds, maxSeconds).submissionReady;
}

export function deriveIOSPlacementPreviewViewModel(input: {
  flowState: string;
  uri: string | null;
  media: PlacementVideoInspection | null;
  fallbackDurationSeconds: number;
  minSeconds: number;
  maxSeconds: number;
  attemptsUsed: number;
  attemptsMax: number;
}): PlacementPreviewViewModel {
  const validation = validateIOSPlacementMedia(
    input.uri,
    input.media,
    input.minSeconds,
    input.maxSeconds,
  );
  const attemptsUsed = Number.isFinite(input.attemptsUsed) ? Math.max(0, Math.floor(input.attemptsUsed)) : 0;
  const attemptsMax = Number.isFinite(input.attemptsMax) ? Math.max(0, Math.floor(input.attemptsMax)) : 0;
  const attemptsRemaining = Math.max(0, attemptsMax - attemptsUsed);
  const hasPreviewFile = !!input.uri && ["PREVIEW", "RECORDED", "ERROR"].includes(input.flowState);

  let phase: PlacementPreviewPhase;
  if (input.flowState === "SUBMITTED") {
    phase = "SUCCESS";
  } else if (input.flowState === "UPLOADING") {
    phase = "UPLOADING";
  } else if (input.flowState === "RECORDING") {
    phase = "RECORDING";
  } else if (["STOPPING", "FINALIZING"].includes(input.flowState)) {
    phase = "FINALIZING";
  } else if (input.flowState === "VALIDATING") {
    phase = "VALIDATING";
  } else if (input.flowState === "COUNTDOWN") {
    phase = "COUNTDOWN";
  } else if (input.flowState === "STARTING") {
    phase = "STARTING";
  } else if (hasPreviewFile) {
    if (!validation.fileReadable) phase = "PREVIEW_INVALID_FILE";
    else if (!validation.videoValid) phase = "PREVIEW_INVALID_VIDEO";
    else if (!validation.audioValid) phase = "PREVIEW_INVALID_AUDIO";
    else if (!validation.durationValid) phase = "PREVIEW_INVALID_DURATION";
    else phase = "PREVIEW_VALID";
  } else if (input.flowState === "ERROR") {
    phase = "ERROR";
  } else {
    phase = "READY";
  }

  const inspectedDuration = input.media?.uri === input.uri
    && Number.isFinite(input.media.durationSeconds)
    ? input.media.durationSeconds
    : Number.isFinite(input.fallbackDurationSeconds) ? input.fallbackDurationSeconds : 0;

  return {
    ...validation,
    phase,
    durationSeconds: Math.max(0, inspectedDuration),
    attemptsUsed,
    attemptsMax,
    attemptsRemaining,
    canRerecord: attemptsRemaining > 0,
    primaryAction: validation.submissionReady ? "SUBMIT" : "RERECORD",
  };
}

export function isIOSPlacementPreviewPhase(phase: PlacementPreviewPhase): boolean {
  return phase.startsWith("PREVIEW_") || phase === "UPLOADING";
}

export function placementPreviewStep(phase: PlacementPreviewPhase): number {
  if (phase === "UPLOADING") return 3;
  return phase.startsWith("PREVIEW_") ? 2 : 1;
}

export function placementVideoUploadMetadata(media: PlacementVideoInspection) {
  return {
    name: `placement-${Date.now()}.${media.mimeType === "video/quicktime" ? "mov" : "mp4"}`,
    contentType: media.mimeType,
  };
}
