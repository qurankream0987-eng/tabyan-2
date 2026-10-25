import type { CanonicalTranscriptEvent } from "./types";
import {
  normalizeProviderObservation,
  type NormalizedRecitationEvent as DomainNormalizedRecitationEvent,
  type ProviderObservation,
  type RecitationProviderName as DomainRecitationProviderName,
  type TranscriptProviderName as DomainTranscriptProviderName,
} from "@workspace/tabyan-domain";

export type {
  NormalizedMistakeType,
  NormalizedRecitationEvent,
  ProviderObservation,
} from "@workspace/tabyan-domain";

export type RecitationProviderName = DomainRecitationProviderName;

export type CapabilityState = "supported" | "not_supported" | "unverified";

export interface RecitationProviderCapabilities {
  /** "documented_only" means no live adapter is wired into the gateway. */
  integration: "integrated" | "documented_only";
  streamingAudio: CapabilityState;
  partialTranscript: CapabilityState;
  finalTranscript: CapabilityState;
  wordAlignment: CapabilityState;
  ayahAlignment: CapabilityState;
  omissionDetection: CapabilityState;
  substitutionDetection: CapabilityState;
  repetitionHandling: CapabilityState;
  tajweedDetection: CapabilityState;
  makharijDetection: CapabilityState;
  confidenceScores: CapabilityState;
}

/**
 * Capabilities describe what the current adapter or cited provider contract
 * actually exposes. "unverified" is deliberately distinct from unsupported.
 */
export const RECITATION_PROVIDER_CAPABILITIES = {
  openai: {
    integration: "integrated",
    streamingAudio: "supported",
    partialTranscript: "supported",
    finalTranscript: "supported",
    wordAlignment: "unverified",
    ayahAlignment: "unverified",
    omissionDetection: "unverified",
    substitutionDetection: "unverified",
    repetitionHandling: "unverified",
    tajweedDetection: "unverified",
    makharijDetection: "unverified",
    confidenceScores: "not_supported",
  },
  nvidia: {
    integration: "integrated",
    streamingAudio: "supported",
    partialTranscript: "supported",
    finalTranscript: "supported",
    wordAlignment: "unverified",
    ayahAlignment: "unverified",
    omissionDetection: "unverified",
    substitutionDetection: "unverified",
    repetitionHandling: "unverified",
    tajweedDetection: "unverified",
    makharijDetection: "unverified",
    confidenceScores: "supported",
  },
  speechmatics: {
    integration: "integrated",
    streamingAudio: "supported",
    partialTranscript: "supported",
    finalTranscript: "supported",
    wordAlignment: "unverified",
    ayahAlignment: "unverified",
    omissionDetection: "unverified",
    substitutionDetection: "unverified",
    repetitionHandling: "unverified",
    tajweedDetection: "unverified",
    makharijDetection: "unverified",
    confidenceScores: "supported",
  },
  tarteel: {
    integration: "integrated",
    streamingAudio: "supported",
    partialTranscript: "not_supported",
    finalTranscript: "supported",
    wordAlignment: "not_supported",
    ayahAlignment: "unverified",
    omissionDetection: "unverified",
    substitutionDetection: "unverified",
    repetitionHandling: "unverified",
    tajweedDetection: "unverified",
    makharijDetection: "unverified",
    confidenceScores: "not_supported",
  },
  nabr: {
    integration: "documented_only",
    streamingAudio: "supported",
    partialTranscript: "unverified",
    finalTranscript: "unverified",
    wordAlignment: "supported",
    ayahAlignment: "supported",
    omissionDetection: "unverified",
    substitutionDetection: "unverified",
    repetitionHandling: "unverified",
    tajweedDetection: "supported",
    makharijDetection: "unverified",
    confidenceScores: "unverified",
  },
} satisfies Record<RecitationProviderName, RecitationProviderCapabilities>;

export type TranscriptProviderName = DomainTranscriptProviderName;

export function normalizeTranscriptEvent(
  provider: TranscriptProviderName,
  event: CanonicalTranscriptEvent,
  timestamp = Date.now(),
  providerUtteranceId = event.itemId,
): Extract<DomainNormalizedRecitationEvent, { type: "partial" | "final" }> {
  const observation: ProviderObservation = {
    observationKind: "transcript",
    provider,
    providerEventType: "transcript",
    observedAt: Number.isFinite(timestamp) ? timestamp : Date.now(),
    ...(event.eventId ? { providerEventId: event.eventId, providerRawId: event.eventId } : {}),
    ...(providerUtteranceId ? { providerUtteranceId } : {}),
    transcript: event.text,
    completeness: event.isFinal ? "final" : "partial",
    ...(event.confidence === undefined ? {} : { confidenceHint: event.confidence }),
    ...(event.confirmationEligible === undefined
      ? {}
      : { confirmationEligible: event.confirmationEligible }),
    textIsDelta: event.textIsDelta ?? false,
    ...(event.startMs === undefined && event.endMs === undefined
      ? {}
      : { timingHint: { startMs: event.startMs, endMs: event.endMs } }),
  };
  const normalized = normalizeProviderObservation(observation);
  if (!normalized || (normalized.type !== "partial" && normalized.type !== "final")) {
    throw new Error("Transcript observation could not be normalized");
  }
  return normalized;
}
