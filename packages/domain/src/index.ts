export { TABYAN_WELCOME_GREETING } from "./welcome-copy";
export { isUserScopedQueryKey } from "./user-query-scope";
export {
  canonicalWordIndicesToNabr,
  canonicalWordKeyToNabrIndices,
  nabrIndicesToCanonicalWordKey,
  nabrProviderIndicesToCanonicalWordKey,
  nabrWireIndicesToProviderObservation,
  nabrWireWordIndicesToProviderObservation,
  nabrWordIndicesToCanonical,
  type CanonicalWordPosition,
  type NabrQrcIndices,
} from "./nabr-index-conversion";
export {
  type NabrQrcGatewayClientMessage,
  type NabrQrcGatewayMistake,
  type NabrQrcGatewayObservation,
  type NabrQrcGatewayServerMessage,
  type NabrQrcGatewayStart,
} from "./nabr-qrc-gateway-contract";
export {
  RECITATION_GATEWAY_SILENCE_TIMEOUT_MS,
  RECITATION_KEEPALIVE_INTERVAL_MS,
  RECITATION_PROVIDERS,
  NormalizedTranscriptMatcherBridge,
  normalizeProviderObservation,
  providerAcknowledgesFinalization,
  providerFinalizationTimeoutMs,
  type ConfirmedTabyanRecitationEvent,
  type MatcherTranscriptInput,
  type NormalizedMistakeType,
  type NormalizedRecitationEvent,
  type ProviderMistakeHint,
  type ProviderObservation,
  type QuranPositionHint,
  type RecitationProviderName,
  type TranscriptProviderName,
} from "./recitation-provider-contract";
export {
  isQrcStructuredObservation,
  toQrcStructuredObservation,
  type QrcProviderCoordinate,
  type QrcStructuredObservation,
  type QrcStructuredObservationKind,
} from "./qrc-structured-observation";

export {
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_INTRO,
  PRIVACY_REVIEW_NOTES,
  PRIVACY_UPDATED_AT,
  privacySectionMatchesQuery,
  SUPPORT_CONTACT,
  SUPPORT_FAQS,
  SUPPORT_INTRO,
  SUPPORT_SAFETY_NOTICE,
  type PrivacyPolicySection,
  type PrivacyPolicySubsection,
  type SupportFaq,
} from "./privacy-support-content";