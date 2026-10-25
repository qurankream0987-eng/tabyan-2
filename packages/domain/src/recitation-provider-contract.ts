export const RECITATION_PROVIDERS = ["openai", "nvidia", "speechmatics", "tarteel", "nabr"] as const;

export type RecitationProviderName = (typeof RECITATION_PROVIDERS)[number];
export type TranscriptProviderName = Exclude<RecitationProviderName, "nabr">;

export type NormalizedMistakeType =
  | "omission"
  | "substitution"
  | "insertion"
  | "repetition"
  | "pronunciation"
  | "tajweed"
  | "unclassified";

export interface QuranPositionHint {
  surah: number;
  ayah: number;
  wordIndex: number;
}

export interface ProviderMistakeHint {
  type: NormalizedMistakeType;
  errorCode?: string;
  message?: string;
  heard?: string;
  /** Raw QRC letter coordinate; its base is undocumented and must not be mapped to a glyph. */
  providerLetterIndex?: number;
  /** A provider-neutral, already verified one-based index, when a provider contract defines one. */
  letterIndex?: number;
}

interface ProviderObservationBase {
  provider: RecitationProviderName;
  /** Provider's documented message name; kept separate from Tabyan event types. */
  providerEventType: string;
  /** Local observation time in milliseconds, not a provider word timestamp. */
  observedAt: number;
  providerEventId?: string;
  /** Connection/session identifiers are diagnostics only, never Quran identity. */
  providerRawId?: string;
  /** Stable provider utterance/segment identifier, when the provider supplies one. */
  providerUtteranceId?: string;
}

export type ProviderObservation =
  | (ProviderObservationBase & {
      observationKind: "transcript";
      transcript: string;
      completeness: "partial" | "final";
      textIsDelta?: boolean;
      confidenceHint?: number;
      confirmationEligible?: boolean;
      timingHint?: { startMs?: number; endMs?: number };
    })
  | (ProviderObservationBase & {
      observationKind: "word";
      claim: "reported_correct" | "reported_skipped";
      positionHint?: QuranPositionHint;
      mistakeHint?: ProviderMistakeHint;
    })
  | (ProviderObservationBase & {
      observationKind: "mistake";
      positionHint?: QuranPositionHint;
      mistakeHint: ProviderMistakeHint;
    })
  | (ProviderObservationBase & {
      observationKind: "position";
      positionHint?: QuranPositionHint;
    })
  | (ProviderObservationBase & {
      observationKind: "session_status";
      status: "ready" | "started" | "ended" | "error" | "heartbeat" | "result" | "unverified";
      code?: string;
      message?: string;
      exitCodeHint?: number;
      countHint?: number;
      providerTimestampSeconds?: number;
      clientSentAtMs?: number;
    })
  | (ProviderObservationBase & {
      observationKind: "unknown";
    });

interface NormalizedEventBase {
  provider: RecitationProviderName;
  providerEventType: string;
  timestamp: number;
  providerEventId?: string;
  providerRawId?: string;
  providerUtteranceId?: string;
  /** This layer is normalized structure, not authoritative Tabyan assessment. */
  evidence: "provider_observation";
}

export type NormalizedRecitationEvent =
  | (NormalizedEventBase & {
      type: "partial" | "final";
      transcript: string;
      textIsDelta: boolean;
      confidenceHint?: number;
      confirmationEligible?: boolean;
      timingHint?: { startMs?: number; endMs?: number };
    })
  | (NormalizedEventBase & {
      type: "word";
      claim: "reported_correct" | "reported_skipped";
      positionHint?: QuranPositionHint;
      mistakeHint?: ProviderMistakeHint;
    })
  | (NormalizedEventBase & {
      type: "mistake";
      positionHint?: QuranPositionHint;
      mistakeHint: ProviderMistakeHint;
    })
  | (NormalizedEventBase & {
      type: "position_hint";
      positionHint?: QuranPositionHint;
    })
  | (NormalizedEventBase & {
      type: "session_status";
      status: "ready" | "started" | "ended" | "error" | "heartbeat" | "result" | "unverified";
      code?: string;
      message?: string;
      exitCodeHint?: number;
      countHint?: number;
      providerTimestampSeconds?: number;
      clientSentAtMs?: number;
    })
  | (NormalizedEventBase & {
      type: "unknown";
    });

export interface MatcherTranscriptInput {
  text: string;
  isFinal: boolean;
  confidence?: number;
  receivedAt: number;
  itemId: string;
  confirmationEligible?: boolean;
}

/**
 * Only transcript events cross this bridge. Provider word positions, verdicts,
 * and mistake categories remain observation data and cannot enter the matcher.
 */
export class NormalizedTranscriptMatcherBridge {
  private readonly seen = new Set<string>();
  private readonly seenOrder: string[] = [];
  private readonly partialText = new Map<string, string>();

  toMatcherInput(event: NormalizedRecitationEvent): MatcherTranscriptInput | null {
    if (event.type !== "partial" && event.type !== "final") return null;
    const itemId = event.providerUtteranceId;
    if (!itemId) return null;

    const dedupeKey = event.providerEventId
      ? `${event.provider}:event:${event.providerEventId}`
      : `${event.provider}:content:${itemId}:${event.type}:${event.transcript}`;
    if (this.seen.has(dedupeKey)) return null;
    this.remember(dedupeKey);

    const previous = this.partialText.get(itemId) ?? "";
    const text = event.textIsDelta ? `${previous}${event.transcript}` : event.transcript;
    if (event.type === "partial") this.partialText.set(itemId, text);
    else this.partialText.delete(itemId);

    return {
      text,
      isFinal: event.type === "final",
      ...(event.confidenceHint === undefined ? {} : { confidence: event.confidenceHint }),
      receivedAt: event.timestamp,
      itemId,
      ...(event.confirmationEligible === undefined
        ? {}
        : { confirmationEligible: event.confirmationEligible }),
    };
  }

  reset(): void {
    this.seen.clear();
    this.seenOrder.length = 0;
    this.partialText.clear();
  }

  private remember(key: string): void {
    this.seen.add(key);
    this.seenOrder.push(key);
    if (this.seenOrder.length > 512) {
      const oldest = this.seenOrder.shift();
      if (oldest !== undefined) this.seen.delete(oldest);
    }
  }
}

export interface ConfirmedTabyanRecitationEvent {
  readonly authority: "tabyan_state_engine";
  readonly type: "mistake_confirmed" | "mistake_corrected";
  /** Tabyan-local event identity; it is not derived from a provider event ID. */
  readonly eventId: string;
  readonly canonicalWord: {
    readonly surah: number;
    readonly ayah: number;
    readonly verseKey: string;
    readonly wordIndex: number;
  };
  readonly mistake: {
    readonly kind: "OMISSION" | "WRONG_WORD" | "EXTRA_WORD" | "REPETITION" | "SKIP" | "UNEXPECTED_JUMP";
    readonly heard?: string;
  };
  readonly occurredAt: number;
}

function cleanText(value: unknown, limit: number): string | undefined {
  return typeof value === "string" && value.length > 0 ? value.slice(0, limit) : undefined;
}

function validPosition(value: QuranPositionHint | undefined): QuranPositionHint | undefined {
  if (!value
    || !Number.isSafeInteger(value.surah) || value.surah < 1 || value.surah > 114
    || !Number.isSafeInteger(value.ayah) || value.ayah < 1
    || !Number.isSafeInteger(value.wordIndex) || value.wordIndex < 1) return undefined;
  return { surah: value.surah, ayah: value.ayah, wordIndex: value.wordIndex };
}

function validMistake(value: ProviderMistakeHint | undefined): ProviderMistakeHint | undefined {
  if (!value) return undefined;
  const types: NormalizedMistakeType[] = [
    "omission", "substitution", "insertion", "repetition", "pronunciation", "tajweed", "unclassified",
  ];
  if (!types.includes(value.type)) return undefined;
  const letterIndex = Number.isSafeInteger(value.letterIndex) && (value.letterIndex ?? 0) > 0
    ? value.letterIndex
    : undefined;
  const providerLetterIndex = Number.isSafeInteger(value.providerLetterIndex)
    && (value.providerLetterIndex ?? -1) >= 0
    ? value.providerLetterIndex
    : undefined;
  return {
    type: value.type,
    ...(cleanText(value.errorCode, 80) ? { errorCode: cleanText(value.errorCode, 80) } : {}),
    ...(cleanText(value.message, 500) ? { message: cleanText(value.message, 500) } : {}),
    ...(cleanText(value.heard, 160) ? { heard: cleanText(value.heard, 160) } : {}),
    ...(providerLetterIndex === undefined ? {} : { providerLetterIndex }),
    ...(letterIndex === undefined ? {} : { letterIndex }),
  };
}

/** Structural normalization only; Quran text normalization remains at the existing matcher boundary. */
export function normalizeProviderObservation(
  observation: ProviderObservation,
): NormalizedRecitationEvent | null {
  if (!Number.isFinite(observation.observedAt)) return null;
  const base: NormalizedEventBase = {
    provider: observation.provider,
    providerEventType: observation.providerEventType.slice(0, 100),
    timestamp: observation.observedAt,
    evidence: "provider_observation",
    ...(cleanText(observation.providerEventId, 160)
      ? { providerEventId: cleanText(observation.providerEventId, 160) }
      : {}),
    ...(cleanText(observation.providerRawId, 160)
      ? { providerRawId: cleanText(observation.providerRawId, 160) }
      : {}),
    ...(cleanText(observation.providerUtteranceId, 160)
      ? { providerUtteranceId: cleanText(observation.providerUtteranceId, 160) }
      : {}),
  };

  switch (observation.observationKind) {
    case "transcript": {
      const confidenceHint = typeof observation.confidenceHint === "number"
        && Number.isFinite(observation.confidenceHint)
        && observation.confidenceHint >= 0
        && observation.confidenceHint <= 1
        ? observation.confidenceHint
        : undefined;
      const startMs = observation.timingHint?.startMs;
      const endMs = observation.timingHint?.endMs;
      return {
        ...base,
        type: observation.completeness,
        transcript: observation.transcript.slice(0, 20_000),
        textIsDelta: observation.textIsDelta ?? false,
        ...(confidenceHint === undefined ? {} : { confidenceHint }),
        ...(observation.confirmationEligible === undefined
          ? {}
          : { confirmationEligible: observation.confirmationEligible }),
        ...(Number.isFinite(startMs) || Number.isFinite(endMs)
          ? {
              timingHint: {
                ...(Number.isFinite(startMs) ? { startMs } : {}),
                ...(Number.isFinite(endMs) ? { endMs } : {}),
              },
            }
          : {}),
      };
    }
    case "word":
      return {
        ...base,
        type: "word",
        claim: observation.claim,
        ...(validPosition(observation.positionHint)
          ? { positionHint: validPosition(observation.positionHint) }
          : {}),
        ...(validMistake(observation.mistakeHint)
          ? { mistakeHint: validMistake(observation.mistakeHint) }
          : {}),
      };
    case "mistake": {
      const mistakeHint = validMistake(observation.mistakeHint);
      if (!mistakeHint) return null;
      return {
        ...base,
        type: "mistake",
        mistakeHint,
        ...(validPosition(observation.positionHint)
          ? { positionHint: validPosition(observation.positionHint) }
          : {}),
      };
    }
    case "position":
      return {
        ...base,
        type: "position_hint",
        ...(validPosition(observation.positionHint)
          ? { positionHint: validPosition(observation.positionHint) }
          : {}),
      };
    case "session_status":
      return {
        ...base,
        type: "session_status",
        status: observation.status,
        ...(cleanText(observation.code, 80) ? { code: cleanText(observation.code, 80) } : {}),
        ...(cleanText(observation.message, 500) ? { message: cleanText(observation.message, 500) } : {}),
        ...(Number.isSafeInteger(observation.exitCodeHint) ? { exitCodeHint: observation.exitCodeHint } : {}),
        ...(Number.isSafeInteger(observation.countHint) ? { countHint: observation.countHint } : {}),
        ...(Number.isFinite(observation.providerTimestampSeconds)
          ? { providerTimestampSeconds: observation.providerTimestampSeconds }
          : {}),
        ...(Number.isFinite(observation.clientSentAtMs) ? { clientSentAtMs: observation.clientSentAtMs } : {}),
      };
    case "unknown":
      return { ...base, type: "unknown" };
  }
}
