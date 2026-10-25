import {
  isQrcStructuredObservation,
  type QrcStructuredObservation,
} from "@workspace/tabyan-domain";
import { QURAN_TEXT_VERSION, type CanonicalQuranWord } from "./canonicalWords";

export interface CanonicalQuranCoordinate {
  surah: number;
  ayah: number;
  wordIndex: number;
}

export interface QrcSessionCoordinateScope {
  /** Server-owned session start; QRC positions before it are rejected. */
  start: CanonicalQuranCoordinate;
  /** Required for bounded educational sessions; omitted only for open-ended GENERAL sessions. */
  end?: CanonicalQuranCoordinate;
}

export interface ResolvedQrcStructuredObservation {
  readonly authority: "provider_observation";
  readonly confirmation: "unconfirmed";
  readonly kind: QrcStructuredObservation["kind"];
  readonly observedAt: number;
  readonly providerEventType: string;
  readonly providerEventId?: string;
  readonly canonicalWord: {
    surah: number;
    ayah: number;
    verseKey: string;
    wordIndex: number;
    displayText: string;
    sourceVersion: string;
  };
  /** Retained as a provider coordinate only; never treated as a Unicode/QCF offset. */
  readonly providerLetterIndex?: number;
  readonly letterMapping: "not_applicable" | "not_provided" | "unverified";
  readonly claim?: "reported_correct" | "reported_skipped";
  readonly errorCode?: string;
}

function validCoordinate(value: CanonicalQuranCoordinate): boolean {
  return Number.isSafeInteger(value.surah) && value.surah >= 1 && value.surah <= 114
    && Number.isSafeInteger(value.ayah) && value.ayah >= 1
    && Number.isSafeInteger(value.wordIndex) && value.wordIndex >= 1;
}

function compareCoordinates(a: CanonicalQuranCoordinate, b: CanonicalQuranCoordinate): number {
  return a.surah - b.surah
    || a.ayah - b.ayah
    || a.wordIndex - b.wordIndex;
}

/**
 * Resolves documented one-based QRC Quran numbers against Tabyan's already
 * loaded canonical word corpus. It returns an observation, never a learner
 * confirmation or state-engine event.
 */
export class CanonicalQuranResolver {
  constructor(
    private readonly words: readonly CanonicalQuranWord[],
    private readonly scope: QrcSessionCoordinateScope,
  ) {}

  resolve(input: unknown): ResolvedQrcStructuredObservation | null {
    if (!isQrcStructuredObservation(input)
      || !validCoordinate(this.scope.start)
      || (this.scope.end !== undefined && !validCoordinate(this.scope.end))
      || (this.scope.end !== undefined
        && compareCoordinates(this.scope.start, this.scope.end) > 0)) return null;

    const coordinate = {
      surah: input.providerCoordinate.chapterIndex,
      ayah: input.providerCoordinate.verseIndex,
      wordIndex: input.providerCoordinate.wordIndex,
    };
    if (!validCoordinate(coordinate)
      || compareCoordinates(coordinate, this.scope.start) < 0
      || (this.scope.end !== undefined && compareCoordinates(coordinate, this.scope.end) > 0)) {
      return null;
    }

    const word = this.words.find((candidate) =>
      candidate.surah === coordinate.surah
      && candidate.ayah === coordinate.ayah
      && candidate.position === coordinate.wordIndex
      && candidate.verseKey === `${coordinate.surah}:${coordinate.ayah}`
      && candidate.displayText.length > 0);
    if (!word) return null;

    const letterMapping = input.kind !== "LETTER_OBSERVATION"
      ? "not_applicable"
      : input.providerLetterIndex === undefined
        ? "not_provided"
        : "unverified";

    return {
      authority: "provider_observation",
      confirmation: "unconfirmed",
      kind: input.kind,
      observedAt: input.observedAt,
      providerEventType: input.providerEventType,
      ...(input.providerEventId ? { providerEventId: input.providerEventId } : {}),
      canonicalWord: {
        surah: word.surah,
        ayah: word.ayah,
        verseKey: word.verseKey,
        wordIndex: word.position,
        displayText: word.displayText,
        sourceVersion: QURAN_TEXT_VERSION,
      },
      ...(input.providerLetterIndex === undefined
        ? {}
        : { providerLetterIndex: input.providerLetterIndex }),
      letterMapping,
      ...(input.claim ? { claim: input.claim } : {}),
      ...(input.errorCode ? { errorCode: input.errorCode } : {}),
    };
  }
}
