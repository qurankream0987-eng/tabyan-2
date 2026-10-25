export type PermissionReturnSubscription = {
  remove: () => void;
};

export type PermissionReturnWatcher = {
  markSettingsOpened: () => void;
  cancelSettingsReturn: () => void;
  reset: () => void;
  onScreenFocus: () => void;
  dispose: () => void;
};

/**
 * Re-check permission state only after Settings was opened and Native returns
 * to the foreground. Screen focus is a secondary recovery path for navigation.
 */
export function createPermissionSettingsReturnWatcher({
  subscribe,
  refresh,
  getGeneration,
  isCurrentGeneration,
  initialAppState,
}: {
  subscribe: (listener: (state: string) => void) => PermissionReturnSubscription;
  refresh: () => Promise<void>;
  getGeneration: () => number;
  isCurrentGeneration: (generation: number) => boolean;
  initialAppState: string | null;
}): PermissionReturnWatcher {
  let previousAppState = initialAppState ?? "active";
  let settingsGeneration: number | null = null;
  let refreshPromise: Promise<void> | null = null;
  let refreshGeneration: number | null = null;
  let disposed = false;

  const refreshAfterSettings = () => {
    const generation = settingsGeneration;
    if (disposed || generation === null) return;
    settingsGeneration = null;
    if (!isCurrentGeneration(generation)) return;
    if (refreshPromise && refreshGeneration === generation) return;

    refreshGeneration = generation;
    let currentPromise: Promise<void>;
    currentPromise = Promise.resolve()
      .then(refresh)
      .finally(() => {
        if (refreshPromise === currentPromise) {
          refreshPromise = null;
          refreshGeneration = null;
        }
      });
    refreshPromise = currentPromise;
  };

  const subscription = subscribe((nextAppState) => {
    const returnedToForeground =
      previousAppState !== "active" && nextAppState === "active";
    previousAppState = nextAppState;
    if (returnedToForeground) refreshAfterSettings();
  });

  return {
    markSettingsOpened: () => {
      if (!disposed) settingsGeneration = getGeneration();
    },
    cancelSettingsReturn: () => {
      settingsGeneration = null;
    },
    reset: () => {
      settingsGeneration = null;
    },
    onScreenFocus: () => {
      if (previousAppState === "active") refreshAfterSettings();
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      settingsGeneration = null;
      subscription.remove();
    },
  };
}

export async function readPlacementPermissionStatus<CameraPermission, MicrophonePermission>(
  getCameraPermission: () => Promise<CameraPermission>,
  getMicrophonePermission: () => Promise<MicrophonePermission>,
): Promise<{ camera: CameraPermission; microphone: MicrophonePermission }> {
  const [camera, microphone] = await Promise.all([
    getCameraPermission(),
    getMicrophonePermission(),
  ]);
  return { camera, microphone };
}
