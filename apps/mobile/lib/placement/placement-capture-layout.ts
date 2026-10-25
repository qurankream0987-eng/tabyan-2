/** Only presentation policy; never changes recorder/attempt/media semantics. */
export function usesPlacementCameraMode(platform: string, state: string): boolean {
  return platform === "ios" && ["COUNTDOWN", "STARTING", "RECORDING", "STOPPING", "FINALIZING", "VALIDATING"].includes(state);
}

export const placementCaptureMetrics = {
  hudTop: 2,
  hudHeight: 52,
  controlsHeight: 104,
  contentVerticalPadding: 16,
} as const;

/** Local portrait layout budget, not evidence of physical iPhone testing. */
export function placementCaptureBudget(viewportHeight: number, topInset: number, bottomInset: number, headerHeight = 68) {
  const contentHeight = viewportHeight - topInset - bottomInset - headerHeight - placementCaptureMetrics.contentVerticalPadding;
  const cameraHeight = contentHeight - placementCaptureMetrics.controlsHeight;
  return { contentHeight, cameraHeight, hudBottom: placementCaptureMetrics.hudTop + placementCaptureMetrics.hudHeight };
}
