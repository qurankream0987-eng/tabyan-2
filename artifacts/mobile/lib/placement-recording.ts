export type PlacementRecorderPhase =
  | "permission"
  | "initializing"
  | "ready"
  | "countdown"
  | "starting"
  | "recording"
  | "finalizing"
  | "validating"
  | "preview"
  | "uploading"
  | "success"
  | "error";

export type PlacementRecorderEvent =
  | "cameraReady"
  | "permissionDenied"
  | "start"
  | "startImmediately"
  | "countdownComplete"
  | "recordingStarted"
  | "stop"
  | "finalized"
  | "validated"
  | "rerecord"
  | "accept"
  | "uploadSucceeded"
  | "uploadFailed"
  | "failure"
  | "retry"
  | "cancel";

const phaseTransitions: Record<PlacementRecorderPhase, Partial<Record<PlacementRecorderEvent, PlacementRecorderPhase>>> = {
  permission: {
    cameraReady: "ready",
    permissionDenied: "error",
    cancel: "permission",
  },
  initializing: {
    cameraReady: "ready",
    permissionDenied: "error",
    retry: "initializing",
    cancel: "permission",
  },
  ready: {
    start: "countdown",
    startImmediately: "starting",
    permissionDenied: "permission",
  },
  countdown: {
    countdownComplete: "starting",
    failure: "error",
    cancel: "ready",
  },
  starting: {
    recordingStarted: "recording",
    failure: "error",
    cancel: "ready",
  },
  recording: {
    stop: "finalizing",
    failure: "error",
  },
  finalizing: {
    finalized: "validating",
    failure: "error",
    cancel: "ready",
  },
  validating: {
    validated: "preview",
    failure: "error",
    cancel: "ready",
  },
  preview: {
    rerecord: "initializing",
    accept: "uploading",
    failure: "error",
  },
  uploading: {
    uploadSucceeded: "success",
    uploadFailed: "preview",
  },
  success: {},
  error: {
    retry: "ready",
    cancel: "ready",
  },
};

export function transitionPlacementRecorderPhase(
  phase: PlacementRecorderPhase,
  event: PlacementRecorderEvent,
): PlacementRecorderPhase {
  return phaseTransitions[phase][event] ?? phase;
}

export function placementRecorderPhaseForFlow(state: string): PlacementRecorderPhase {
  switch (state) {
    case "REQUESTING_PERMISSION":
    case "IDLE":
      return "permission";
    case "WAITING_CAMERA":
      return "initializing";
    case "READY":
      return "ready";
    case "COUNTDOWN":
      return "countdown";
    case "STARTING":
      return "starting";
    case "RECORDING":
      return "recording";
    case "STOPPING":
    case "FINALIZING":
      return "finalizing";
    case "VALIDATING":
      return "validating";
    case "RECORDED":
    case "PREVIEW":
      return "preview";
    case "UPLOADING":
      return "uploading";
    case "SUBMITTED":
      return "success";
    default:
      return "error";
  }
}

export function canStartPlacementRecording(state: string, inFlight: boolean): boolean {
  return !inFlight && (state === "READY" || state === "ERROR");
}

export function canStopPlacementRecording(state: string, stopRequested: boolean): boolean {
  return state === "RECORDING" && !stopRequested;
}

export function elapsedRecordingSeconds(startedAt: number, now: number, maximumSeconds: number): number {
  if (![startedAt, now, maximumSeconds].every(Number.isFinite) || maximumSeconds < 0) return 0;
  return Math.min(maximumSeconds, Math.max(0, Math.floor((now - startedAt) / 1000)));
}

export function hasReachedMinimumDuration(elapsedSeconds: number, minimumSeconds: number): boolean {
  return elapsedSeconds >= minimumSeconds;
}

export function hasReachedMaximumDuration(elapsedSeconds: number, maximumSeconds: number): boolean {
  return elapsedSeconds >= maximumSeconds;
}

export function shouldConfirmPlacementNavigation(state: string): boolean {
  return state === "RECORDING" || state === "FINALIZING" || state === "STOPPING" || state === "VALIDATING";
}

export function hasRecordedAudioTrack(trackCount: number): boolean {
  return Number.isFinite(trackCount) && trackCount > 0;
}

export function microphoneFailureMessage(error: unknown, preciseIOSDiagnosis = false): string | null {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/E_PLACEMENT_MIC_PERMISSION|لم يتم السماح باستخدام الميكروفون/.test(message)) return "لم يتم السماح باستخدام الميكروفون.";
  return /audio|microphone|mic\b|e_audio/i.test(message)
    ? preciseIOSDiagnosis ? "تعذر بدء تسجيل الصوت." : "تعذر تسجيل الصوت. تحقق من إذن الميكروفون ثم أعد المحاولة."
    : null;
}
