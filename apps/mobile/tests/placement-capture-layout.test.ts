import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { placementCaptureBudget, placementCaptureMetrics, usesPlacementCameraMode } from "../lib/placement-capture-layout";

describe("iOS placement presentation modes", () => {
  it.each(["COUNTDOWN", "STARTING", "RECORDING", "STOPPING", "FINALIZING", "VALIDATING"])("simplifies the camera in %s", state => {
    expect(usesPlacementCameraMode("ios", state)).toBe(true);
  });
  it.each(["READY", "WAITING_CAMERA", "ERROR", "PREVIEW", "UPLOADING", "SUBMITTED"])("keeps regular guidance in %s", state => {
    expect(usesPlacementCameraMode("ios", state)).toBe(false);
  });
  it.each(["android", "web"])("does not activate the iOS layout on %s", platform => {
    expect(usesPlacementCameraMode(platform, "RECORDING")).toBe(false);
  });
  it.each([
    ["small iPhone", 320, 568, 20, 0],
    ["standard iPhone", 390, 844, 47, 34],
    ["Dynamic Island iPhone", 393, 852, 59, 34],
    ["Pro Max", 430, 932, 59, 34],
  ] as const)("fits the portrait layout budget on %s (%sx%s)", (_name, width, height, top, bottom) => {
    const layout = placementCaptureBudget(height, top, bottom);
    expect(layout.cameraHeight).toBeGreaterThan(300);
    expect(layout.cameraHeight / layout.contentHeight).toBeGreaterThan(0.7);
    // Center 60% is overlay-free. Controls are outside the camera entirely.
    expect(layout.hudBottom).toBeLessThanOrEqual(layout.cameraHeight * 0.15);
    expect(layout.cameraHeight + placementCaptureMetrics.controlsHeight).toBe(layout.contentHeight);
    expect(placementCaptureMetrics.hudHeight).toBeLessThanOrEqual(72);
    expect(width - 24 - 24 - 20).toBeGreaterThanOrEqual(250);
    expect(height - bottom - 8).toBeGreaterThan(top + 68 + layout.cameraHeight + 76);
  });
  it("keeps camera ancestors stable, hides explanation, and separates the stop control", () => {
    const source = readFileSync(new URL("../app/student/placement.tsx", import.meta.url), "utf8");
    const screen = readFileSync(new URL("../components/student/student-screen.tsx", import.meta.url), "utf8");
    expect(source).toContain('key="placement-capture"');
    expect(source).toContain('!cameraMode ? <Card key="placement-guidance"');
    expect(source).toContain('!cameraMode && (Platform.OS !== "ios" || !videoUri) ? <Card key="placement-instructions"');
    expect(source).toContain("cameraMode && !videoUri");
    expect(source).toContain("styles.captureFooter");
    expect(source).toMatch(/\{!cameraMode \? \(\s*<Text style=\{\[styles\.attemptsText/);
    expect(source).not.toContain("styles.recordingPanel");
    expect(screen).toContain("scrollEnabled={!cameraMode}");
    expect(screen).not.toContain("scroll={!cameraMode}");
  });
});
