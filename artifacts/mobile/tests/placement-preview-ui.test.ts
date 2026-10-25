import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const placementScreen = readFileSync(new URL("../app/student/placement.tsx", import.meta.url), "utf8");
const previewComponent = readFileSync(new URL("../components/placement-preview.tsx", import.meta.url), "utf8");
const localVideoPlayer = readFileSync(new URL("../components/library-media-player.tsx", import.meta.url), "utf8");

describe("iOS placement preview presentation contract", () => {
  it("clears the old file, validation, duration, attempt, and choice before re-recording", () => {
    const start = placementScreen.indexOf("const resetRecording = () => {");
    const end = placementScreen.indexOf("const uploadAndSubmit = async () =>", start);
    const reset = placementScreen.slice(start, end);
    expect(start).toBeGreaterThanOrEqual(0);
    for (const resetOperation of [
      "setDraftVideoUri(null)",
      "setDurationSeconds(0)",
      "setElapsedSeconds(0)",
      "setMaxDurationReached(false)",
      "setUploadProgress(0)",
      "setError(null)",
      "setActiveAttemptId(null)",
      "setAttemptReserved(false)",
      "setStudyTuhfa(null)",
    ]) {
      expect(reset).toContain(resetOperation);
    }
  });

  it("does not render a send action for invalid media", () => {
    expect(previewComponent).toContain('model.primaryAction === "SUBMIT"');
    expect(previewComponent).toContain("disabled={!model.submissionReady || !workflowReady");
    expect(previewComponent).toContain('testID="placement-rerecord-button"');
  });

  it("keeps the video full-width, portrait, and centered with a compact centered play control", () => {
    expect(previewComponent).toContain("maxWidth: 480");
    expect(previewComponent).toContain("aspectRatio: 3 / 4");
    expect(previewComponent).toContain('alignSelf: "center"');
    expect(previewComponent).toContain("model.fileReadable && model.videoValid");
    expect(localVideoPlayer).toContain("placementPreviewFrame:");
    expect(localVideoPlayer).toContain("localPreviewPlayLayer:");
    expect(localVideoPlayer).not.toContain("placementControls && isPlaying");
    expect(localVideoPlayer).not.toContain("الصوت مكتوم في المعاينة");
  });

  it("keeps pre-record guidance out of the preview component", () => {
    expect(previewComponent).not.toContain("ضع الهاتف بشكل مستقيم");
    expect(previewComponent).not.toContain("ارفع صوتك بوضوح");
    expect(previewComponent).toContain('testID="ios-placement-preview"');
  });
});
