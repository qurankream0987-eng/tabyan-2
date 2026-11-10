import type { SpeechRecognitionProvider } from "./types";

export interface ProviderSelectionEnvironment {
  provider: string | undefined;
  nodeEnv: string | undefined;
  tarteelTrialEnabled: string | undefined;
  nabrEnabled?: string | undefined;
  nabrShadowMode?: string | undefined;
  nabrOneShotTest?: string | undefined;
}

/**
 * Tarteel stays opt-in. The trial flag may be set in production so the APK
 * can try the Whisper model; Tilawi remains selectable by changing the provider.
 */
export function selectSpeechRecognitionProvider(
  environment: ProviderSelectionEnvironment,
): SpeechRecognitionProvider["name"] | null {
  const { provider, nodeEnv, tarteelTrialEnabled } = environment;
  if (provider === "tarteel") {
    const trial = tarteelTrialEnabled === "true";
    const allowedEnv = nodeEnv === "development" || nodeEnv === "production";
    return trial && allowedEnv ? "tarteel" : null;
  }
  if (provider === "nabr") {
    return nodeEnv === "development"
      && environment.nabrEnabled === "true"
      && environment.nabrShadowMode === "true"
      && environment.nabrOneShotTest === "true"
      ? "nabr"
      : null;
  }
  return provider === "openai" || provider === "nvidia" || provider === "speechmatics" || provider === "tilawi"
    ? provider
    : null;
}