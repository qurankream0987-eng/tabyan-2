import { describe, expect, it } from "vitest";
import {
  canSubmitIOSPlacementMedia, deriveIOSPlacementPreviewViewModel, hasPlacementCapturePermissions,
  isIOSPlacementPreviewPhase, placementMediaFailure, placementPreviewStep,
  placementVideoUploadMetadata, type PlacementVideoInspection,
} from "../lib/placement/placement-media";
import { transitionPlacementRecorderPhase, shouldConfirmPlacementNavigation } from "../lib/placement/placement-recording";

const media: PlacementVideoInspection = {
  uri: "file:///private/camera/test.mov",
  videoTrackCount: 1, audioTrackCount: 1, durationSeconds: 48, fileSizeBytes: 120_000,
  mimeType: "video/quicktime", videoCodecs: ["avc1"], audioCodecs: ["mp4a"],
};

describe("iOS placement file authority", () => {
  it.each([[false, false], [true, false], [false, true]])("blocks camera=%s mic=%s", (camera, mic) => {
    expect(hasPlacementCapturePermissions(camera, mic)).toBe(false);
  });
  it("requires both camera and microphone grants", () => {
    expect(hasPlacementCapturePermissions(true, true)).toBe(true);
  });
  it("does not equate unknown inspection or a stale URI with valid audio", () => {
    expect(canSubmitIOSPlacementMedia(media.uri, null)).toBe(false);
    expect(canSubmitIOSPlacementMedia("file:///another.mov", media)).toBe(false);
    expect(canSubmitIOSPlacementMedia(null, media)).toBe(false);
  });
  it("accepts the actual finalized audiovisual file", () => {
    expect(placementMediaFailure(media)).toBeNull();
    expect(canSubmitIOSPlacementMedia(media.uri, media)).toBe(true);
  });
  it("derives a valid preview and the send action from the inspected file", () => {
    const model = deriveIOSPlacementPreviewViewModel({
      flowState: "PREVIEW",
      uri: media.uri,
      media,
      fallbackDurationSeconds: 47,
      minSeconds: 45,
      maxSeconds: 300,
      attemptsUsed: 2,
      attemptsMax: 6,
    });
    expect(model).toMatchObject({
      phase: "PREVIEW_VALID",
      fileReadable: true,
      videoValid: true,
      audioValid: true,
      durationValid: true,
      submissionReady: true,
      primaryAction: "SUBMIT",
      attemptsUsed: 2,
      attemptsMax: 6,
      attemptsRemaining: 4,
    });
  });
  it("only diagnoses absent audio from an inspected zero audio-track count", () => {
    const silent = { ...media, audioTrackCount: 0 };
    expect(placementMediaFailure(silent)).toBe("لم يتم حفظ الصوت داخل التسجيل.");
    expect(canSubmitIOSPlacementMedia(media.uri, silent)).toBe(false);
    expect(placementMediaFailure({ ...media, audioTrackCount: NaN })).not.toBe("لم يتم حفظ الصوت داخل التسجيل.");
    const model = deriveIOSPlacementPreviewViewModel({
      flowState: "PREVIEW",
      uri: media.uri,
      media: silent,
      fallbackDurationSeconds: 48,
      minSeconds: 45,
      maxSeconds: 300,
      attemptsUsed: 1,
      attemptsMax: 5,
    });
    expect(model).toMatchObject({
      phase: "PREVIEW_INVALID_AUDIO",
      fileReadable: true,
      videoValid: true,
      audioValid: false,
      submissionReady: false,
      primaryAction: "RERECORD",
    });
    expect(model.failureMessage).toBe("لم يتم حفظ الصوت داخل التسجيل.");
    expect(placementPreviewStep(model.phase)).toBe(2);
    expect(isIOSPlacementPreviewPhase(model.phase)).toBe(true);
  });
  it.each([
    { videoTrackCount: 0 }, { durationSeconds: 0 }, { durationSeconds: NaN },
    { fileSizeBytes: 0 }, { audioTrackCount: -1 },
  ])("rejects invalid file metadata: %j", (invalid) => {
    expect(canSubmitIOSPlacementMedia(media.uri, { ...media, ...invalid })).toBe(false);
  });
  it("derives duration and file-read failures as invalid preview states", () => {
    const short = deriveIOSPlacementPreviewViewModel({
      flowState: "PREVIEW",
      uri: media.uri,
      media: { ...media, durationSeconds: 20 },
      fallbackDurationSeconds: 20,
      minSeconds: 45,
      maxSeconds: 300,
      attemptsUsed: 1,
      attemptsMax: 5,
    });
    expect(short.phase).toBe("PREVIEW_INVALID_DURATION");
    expect(short.submissionReady).toBe(false);
    expect(short.primaryAction).toBe("RERECORD");

    const unreadable = deriveIOSPlacementPreviewViewModel({
      flowState: "ERROR",
      uri: media.uri,
      media: null,
      fallbackDurationSeconds: 48,
      minSeconds: 45,
      maxSeconds: 300,
      attemptsUsed: 1,
      attemptsMax: 5,
    });
    expect(unreadable.phase).toBe("PREVIEW_INVALID_FILE");
    expect(unreadable.fileReadable).toBe(false);
    expect(unreadable.submissionReady).toBe(false);
  });
  it("uses the server-provided attempt limit rather than a preview default", () => {
    const model = deriveIOSPlacementPreviewViewModel({
      flowState: "PREVIEW",
      uri: media.uri,
      media,
      fallbackDurationSeconds: 48,
      minSeconds: 45,
      maxSeconds: 300,
      attemptsUsed: 3,
      attemptsMax: 8,
    });
    expect(model.attemptsMax).toBe(8);
    expect(model.attemptsRemaining).toBe(5);
    expect(model.canRerecord).toBe(true);
  });
  it("keeps submission closed when the video track is absent", () => {
    const model = deriveIOSPlacementPreviewViewModel({
      flowState: "PREVIEW",
      uri: media.uri,
      media: { ...media, videoTrackCount: 0 },
      fallbackDurationSeconds: 48,
      minSeconds: 45,
      maxSeconds: 300,
      attemptsUsed: 1,
      attemptsMax: 5,
    });
    expect(model.phase).toBe("PREVIEW_INVALID_VIDEO");
    expect(model.submissionReady).toBe(false);
    expect(model.primaryAction).toBe("RERECORD");
  });
  it("preserves MOV container/MIME instead of renaming it to MP4", () => {
    expect(placementVideoUploadMetadata(media).name).toMatch(/\.mov$/);
    expect(placementVideoUploadMetadata(media).contentType).toBe("video/quicktime");
    const mp4 = { ...media, mimeType: "video/mp4" as const };
    expect(placementVideoUploadMetadata(mp4).name).toMatch(/\.mp4$/);
    expect(placementVideoUploadMetadata(mp4).contentType).toBe("video/mp4");
  });
  it("requires validation after stop and finalization, and supports failure/retry", () => {
    let phase = transitionPlacementRecorderPhase("recording", "stop");
    expect(phase).toBe("finalizing");
    phase = transitionPlacementRecorderPhase(phase, "finalized");
    expect(phase).toBe("validating");
    expect(shouldConfirmPlacementNavigation("VALIDATING")).toBe(true);
    expect(transitionPlacementRecorderPhase(phase, "accept")).toBe("validating");
    expect(transitionPlacementRecorderPhase(phase, "failure")).toBe("error");
    expect(transitionPlacementRecorderPhase("error", "retry")).toBe("ready");
    phase = transitionPlacementRecorderPhase(phase, "validated");
    expect(phase).toBe("preview");
    expect(transitionPlacementRecorderPhase(phase, "accept")).toBe("uploading");
  });
});
