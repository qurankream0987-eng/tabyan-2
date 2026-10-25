import type {
  NormalizedRecitationEvent,
  QuranPositionHint,
} from "./recitation-provider-contract";

export interface QrcProviderCoordinate {
  /** QRC coordinate as supplied; documentation examples use 1-based Quran numbers. */
  chapterIndex: number;
  verseIndex: number;
  wordIndex: number;
}

export type QrcStructuredObservationKind =
  | "WORD_CURRENT"
  | "WORD_REPORTED_CORRECT"
  | "WORD_REPORTED_SKIPPED"
  | "LETTER_OBSERVATION"
  | "TAJWEED_OBSERVATION";

/**
 * A sanitized, non-authoritative QRC event. It is deliberately not compatible
 * with ConfirmedTabyanRecitationEvent and must not be applied to learner state.
 */
export interface QrcStructuredObservation {
  readonly authority: "provider_observation";
  readonly provider: "nabr";
  readonly kind: QrcStructuredObservationKind;
  readonly providerEventType: string;
  readonly observedAt: number;
  readonly providerCoordinate: QrcProviderCoordinate;
  readonly confirmation: "unconfirmed";
  readonly claim?: "reported_correct" | "reported_skipped";
  /** QRC letter coordinate retained verbatim; the base and orthographic mapping are unknown. */
  readonly providerLetterIndex?: number;
  readonly errorCode?: string;
  readonly providerEventId?: string;
}

function validCoordinate(position: QuranPositionHint | undefined): QrcProviderCoordinate | null {
  if (!position
    || !Number.isSafeInteger(position.surah) || position.surah < 1 || position.surah > 114
    || !Number.isSafeInteger(position.ayah) || position.ayah < 1
    || !Number.isSafeInteger(position.wordIndex) || position.wordIndex < 1) return null;

  return {
    chapterIndex: position.surah,
    verseIndex: position.ayah,
    wordIndex: position.wordIndex,
  };
}

/** Convert only documented QRC structured observations; never creates transcript text. */
export function toQrcStructuredObservation(
  event: NormalizedRecitationEvent,
): QrcStructuredObservation | null {
  if (event.provider !== "nabr") return null;

  const providerCoordinate = validCoordinate(
    "positionHint" in event ? event.positionHint : undefined,
  );
  if (!providerCoordinate) return null;

  const base = {
    authority: "provider_observation" as const,
    provider: "nabr" as const,
    providerEventType: event.providerEventType.slice(0, 100),
    observedAt: event.timestamp,
    providerCoordinate,
    confirmation: "unconfirmed" as const,
    ...(event.providerEventId ? { providerEventId: event.providerEventId } : {}),
  };

  if (event.type === "position_hint") {
    return { ...base, kind: "WORD_CURRENT" };
  }
  if (event.type === "word") {
    return event.claim === "reported_correct"
      ? { ...base, kind: "WORD_REPORTED_CORRECT", claim: event.claim }
      : { ...base, kind: "WORD_REPORTED_SKIPPED", claim: event.claim };
  }
  if (event.type === "mistake" && event.mistakeHint.type === "tajweed") {
    return {
      ...base,
      kind: "TAJWEED_OBSERVATION",
      ...(event.mistakeHint.errorCode ? { errorCode: event.mistakeHint.errorCode } : {}),
    };
  }
  if (event.type === "mistake" && event.mistakeHint.type === "pronunciation") {
    return {
      ...base,
      kind: "LETTER_OBSERVATION",
      ...(event.mistakeHint.providerLetterIndex === undefined
        ? {}
        : { providerLetterIndex: event.mistakeHint.providerLetterIndex }),
      ...(event.mistakeHint.errorCode ? { errorCode: event.mistakeHint.errorCode } : {}),
    };
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Runtime guard for the separate WebSocket shadow-observation channel. */
export function isQrcStructuredObservation(value: unknown): value is QrcStructuredObservation {
  if (!isRecord(value) || !isRecord(value.providerCoordinate)) return false;
  const coordinate = value.providerCoordinate;
  const kind = String(value.kind);
  const claimMatchesKind = (kind === "WORD_REPORTED_CORRECT" && value.claim === "reported_correct")
    || (kind === "WORD_REPORTED_SKIPPED" && value.claim === "reported_skipped")
    || (kind !== "WORD_REPORTED_CORRECT" && kind !== "WORD_REPORTED_SKIPPED" && value.claim === undefined);
  const letterIndexMatchesKind = value.providerLetterIndex === undefined || kind === "LETTER_OBSERVATION";
  const validCoordinateValues = Number.isSafeInteger(coordinate.chapterIndex)
    && (coordinate.chapterIndex as number) >= 1
    && (coordinate.chapterIndex as number) <= 114
    && Number.isSafeInteger(coordinate.verseIndex)
    && (coordinate.verseIndex as number) >= 1
    && Number.isSafeInteger(coordinate.wordIndex)
    && (coordinate.wordIndex as number) >= 1;
  const kinds: readonly string[] = [
    "WORD_CURRENT",
    "WORD_REPORTED_CORRECT",
    "WORD_REPORTED_SKIPPED",
    "LETTER_OBSERVATION",
    "TAJWEED_OBSERVATION",
  ];
  return value.authority === "provider_observation"
    && value.provider === "nabr"
    && kinds.includes(kind)
    && value.confirmation === "unconfirmed"
    && typeof value.providerEventType === "string"
    && value.providerEventType.length <= 100
    && typeof value.observedAt === "number"
    && Number.isFinite(value.observedAt)
    && validCoordinateValues
    && claimMatchesKind
    && letterIndexMatchesKind
    && (value.providerLetterIndex === undefined
      || (Number.isSafeInteger(value.providerLetterIndex)
        && (value.providerLetterIndex as number) >= 0))
    && (value.errorCode === undefined
      || (typeof value.errorCode === "string" && value.errorCode.length <= 80))
    && (value.providerEventId === undefined
      || (typeof value.providerEventId === "string" && value.providerEventId.length <= 160));
}
