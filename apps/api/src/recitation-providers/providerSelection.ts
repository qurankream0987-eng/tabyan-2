import type { SpeechRecognitionProvider } from "./types";

export interface ProviderSelectionEnvironment {
  provider: string | undefined;
  nodeEnv: string | undefined;
  tarteelTrialEnabled: string | undefined;
  nabrEnabled?: string | undefined;
  nabrShadowMode?: string | undefined;
  nabrOneShotTest?: string | undefined;
}

/** Tarteel is selectable only in development and remains explicitly opt-in. */
export function selectSpeechRecognitionProvider(
  environment: ProviderSelectionEnvironment,
): SpeechRecognitionProvider["name"] | null {
  const { provider, nodeEnv, tarteelTrialEnabled } = environment;
  if (provider === "tarteel") {
    return nodeEnv === "development" && tarteelTrialEnabled === "true" ? "tarteel" : null;
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