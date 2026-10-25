import { describe, expect, it } from "vitest";
import {
  canStartPlacementRecording,
  canStopPlacementRecording,
  elapsedRecordingSeconds,
  hasReachedMaximumDuration,
  hasReachedMinimumDuration,
  hasRecordedAudioTrack,
  microphoneFailureMessage,
  shouldConfirmPlacementNavigation,
  transitionPlacementRecorderPhase,
} from "../lib/placement/placement-recording";

describe("Native Placement recording flow", () => {
  it("moves from ready through countdown and starts timing only after recorder start", () => {
    let phase = transitionPlacementRecorderPhase("ready", "start");
    expect(phase).toBe("countdown");
    phase = transitionPlacementRecorderPhase(phase, "countdownComplete");
    expect(phase).toBe("starting");
    phase = transitionPlacementRecorderPhase(phase, "recordingStarted");
    expect(phase).toBe("recording");

    // The elapsed clock begins at the recorder start timestamp, not at countdown.
    expect(elapsedRecordingSeconds(10_000, 10_000, 300)).toBe(0);
  });

  it("does not permit a duplicate start or duplicate stop", () => {
    expect(canStartPlacementRecording("READY", false)).toBe(true);
    expect(canStartPlacementRecording("READY", true)).toBe(false);
    expect(canStartPlacementRecording("COUNTDOWN", false)).toBe(false);
    expect(canStopPlacementRecording("RECORDING", false)).toBe(true);
    expect(canStopPlacementRecording("RECORDING", true)).toBe(false);
    expect(canStopPlacementRecording("FINALIZING", false)).toBe(false);
  });

  it("uses elapsed recording time for the 45-second minimum", () => {
    expect(hasReachedMinimumDuration(44, 45)).toBe(false);
    expect(hasReachedMinimumDuration(45, 45)).toBe(true);
  });

  it("caps elapsed time at the configured maximum and signals auto-stop once reached", () => {
    expect(elapsedRecordingSeconds(1_000, 299_999, 300)).toBe(298);
    expect(hasReachedMaximumDuration(299, 300)).toBe(false);
    expect(hasReachedMaximumDuration(300, 300)).toBe(true);
    expect(elapsedRecordingSeconds(1_000, 400_000, 300)).toBe(300);
  });

  it("handles a denied camera or microphone permission as an error", () => {
    expect(transitionPlacementRecorderPhase("permission", "permissionDenied")).toBe("error");
    expect(transitionPlacementRecorderPhase("initializing", "permissionDenied")).toBe("error");
  });

  it("blocks navigation while recording or finalizing, but not while ready", () => {
    expect(shouldConfirmPlacementNavigation("RECORDING")).toBe(true);
    expect(shouldConfirmPlacementNavigation("FINALIZING")).toBe(true);
    expect(shouldConfirmPlacementNavigation("READY")).toBe(false);
  });

  it("only reports audio as available when the preview exposes an audio track", () => {
    expect(hasRecordedAudioTrack(1)).toBe(true);
    expect(hasRecordedAudioTrack(0)).toBe(false);
  });

  it("provides microphone-specific guidance for recorder audio errors", () => {
    expect(microphoneFailureMessage(new Error("E_PLACEMENT_MIC_PERMISSION"))).toBe("لم يتم السماح باستخدام الميكروفون.");
    expect(microphoneFailureMessage(new Error("audio input unavailable"), true)).toBe("تعذر بدء تسجيل الصوت.");
    expect(microphoneFailureMessage(new Error("لم يتم السماح باستخدام الميكروفون."), true)).toBe("لم يتم السماح باستخدام الميكروفون.");
    expect(microphoneFailureMessage(new Error("camera device unavailable"))).toBeNull();
  });

  it("finalizes to preview, supports re-recording, and only uploads after acceptance", () => {
    let phase = transitionPlacementRecorderPhase("recording", "stop");
    expect(phase).toBe("finalizing");
    phase = transitionPlacementRecorderPhase(phase, "finalized");
    expect(phase).toBe("validating");
    expect(transitionPlacementRecorderPhase(phase, "accept")).toBe("validating");
    phase = transitionPlacementRecorderPhase(phase, "validated");
    expect(phase).toBe("preview");
    expect(transitionPlacementRecorderPhase(phase, "rerecord")).toBe("initializing");
    expect(transitionPlacementRecorderPhase(phase, "accept")).toBe("uploading");
  });

  it("returns to preview when upload fails and marks success only after confirmation", () => {
    expect(transitionPlacementRecorderPhase("uploading", "uploadFailed")).toBe("preview");
    expect(transitionPlacementRecorderPhase("uploading", "uploadSucceeded")).toBe("success");
  });
});
