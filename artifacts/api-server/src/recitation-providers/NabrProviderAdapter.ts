import {
  nabrIndicesToCanonicalWordKey,
  normalizeProviderObservation,
  type NormalizedMistakeType,
  type NormalizedRecitationEvent,
  type ProviderObservation,
  type QuranPositionHint,
} from "@workspace/tabyan-domain";
import { RECITATION_PROVIDER_CAPABILITIES } from "./recitation-contracts";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

function nonnegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function location(value: unknown): QuranPositionHint | null {
  const record = asRecord(value);
  if (!record) return null;
  const surah = positiveInteger(record.chapter);
  const ayah = positiveInteger(record.verse);
  const wordIndex = positiveInteger(record.word);
  if (surah === null || surah > 114 || ayah === null || wordIndex === null) return null;
  return nabrIndicesToCanonicalWordKey({
    chapter_index: surah,
    verse_index: ayah,
    word_index: wordIndex,
  });
}

/**
 * The official QRC example labels values 1 as the Surah number, starting verse,
 * and starting word. Preserve that documented one-based numbering directly.
 */
function currentPosition(message: UnknownRecord): QuranPositionHint | undefined {
  const chapter = positiveInteger(message.chapter_index);
  const ayah = positiveInteger(message.verse_index);
  const wordIndex = positiveInteger(message.word_index);
  if (chapter === null || chapter > 114 || ayah === null || wordIndex === null) return undefined;
  return nabrIndicesToCanonicalWordKey({
    chapter_index: chapter,
    verse_index: ayah,
    word_index: wordIndex,
  });
}

function boundedString(value: unknown, maxLength: number): string | undefined {
  return typeof value === "string" && value.length > 0
    ? value.slice(0, maxLength)
    : undefined;
}

/**
 * Offline-only parser for documented Nabr/QRC event shapes. It has no socket,
 * endpoint, API key, or audio side effects. Positions and assessments remain
 * provider hints; this adapter never produces a learner-facing verdict.
 */
export class NabrProviderAdapter {
  readonly name = "nabr" as const;
  readonly capabilities = RECITATION_PROVIDER_CAPABILITIES.nabr;

  observeServerMessage(
    input: unknown,
    timestamp = Date.now(),
  ): ProviderObservation[] {
    const message = asRecord(input);
    if (!message || typeof message.event !== "string") return [];
    const receivedAt = Number.isFinite(timestamp) ? timestamp : Date.now();
    const providerRawId = boundedString(message.session_id ?? message.websocket_id, 160);
    const base = {
      provider: this.name,
      providerEventType: message.event.slice(0, 100),
      observedAt: receivedAt,
      ...(providerRawId ? { providerRawId } : {}),
    } as const;

    if (message.event === "QRC_CLIENT_CONNECTED") {
      return [{ ...base, observationKind: "session_status", status: "ready" }];
    }
    if (message.event === "TILAWA_SESSION_STARTED") {
      const exitCode = nonnegativeInteger(message.exit_code);
      return [{
        ...base,
        observationKind: "session_status",
        status: exitCode === 6 ? "started" : "unverified",
        ...(exitCode === null ? {} : { exitCodeHint: exitCode }),
        ...(exitCode !== null && exitCode !== 6 ? { code: `EXIT_CODE_${exitCode}` } : {}),
      }];
    }
    if (message.event === "TILAWA_SESSION_ENDED") {
      const count = nonnegativeInteger(message.asr_call_count);
      return [{
        ...base,
        observationKind: "session_status",
        status: "ended",
        ...(count === null ? {} : { countHint: count }),
      }];
    }
    if (message.event === "KEEP_ALIVE") {
      return [{
        ...base,
        observationKind: "session_status",
        status: "heartbeat",
        ...(Number.isFinite(message.timestamp)
          ? { providerTimestampSeconds: message.timestamp as number }
          : {}),
        ...(Number.isFinite(message.client_sent_at_ms)
          ? { clientSentAtMs: message.client_sent_at_ms as number }
          : {}),
      }];
    }
    if (message.event === "QRC_ERROR") {
      return [{
        ...base,
        observationKind: "session_status",
        status: "error",
        ...(boundedString(message.code, 80) ? { code: boundedString(message.code, 80) } : {}),
        ...(boundedString(message.message, 500) ? { message: boundedString(message.message, 500) } : {}),
      }];
    }
    if (message.event !== "TILAWA_RESULT") {
      return [{ ...base, observationKind: "unknown" }];
    }

    const observations: ProviderObservation[] = [];
    const positionHint = currentPosition(message);
    if (positionHint) observations.push({ ...base, observationKind: "position", positionHint });

    const appendWords = (items: unknown, claim: "reported_correct" | "reported_skipped") => {
      if (!Array.isArray(items)) return;
      for (const item of items.slice(0, 512)) {
        const hint = location(item);
        if (!hint) continue;
        observations.push({
          ...base,
          observationKind: "word",
          claim,
          positionHint: hint,
          ...(claim === "reported_skipped" ? { mistakeHint: { type: "unclassified" } } : {}),
        });
      }
    };

    const appendMistakes = (
      items: unknown,
      mistakeType: Extract<NormalizedMistakeType, "tajweed" | "pronunciation">,
    ) => {
      if (!Array.isArray(items)) return;
      for (const item of items.slice(0, 512)) {
        const record = asRecord(item);
        const hint = location(record);
        if (!record || !hint) continue;
        observations.push({
          ...base,
          observationKind: "mistake",
          positionHint: hint,
          mistakeHint: {
            type: mistakeType,
            ...(boundedString(record.errorCode, 80) ? { errorCode: boundedString(record.errorCode, 80) } : {}),
            ...(boundedString(record.message, 500) ? { message: boundedString(record.message, 500) } : {}),
            // The documented QRC type currently spells this "speachLike".
            ...(boundedString(record.speachLike, 160)
              ? { heard: boundedString(record.speachLike, 160) }
              : {}),
            ...(nonnegativeInteger(record.letter) === null
              ? {}
              : { providerLetterIndex: nonnegativeInteger(record.letter)! }),
          },
        });
      }
    };

    appendWords(message.correct_words, "reported_correct");
    // QRC combines omissions, skips, substitutions, and severe misreads here.
    // Preserve only the provider claim; do not choose one of those meanings.
    appendWords(message.skipped_words, "reported_skipped");
    appendMistakes(message.tajweed_mistakes, "tajweed");
    appendMistakes(message.letter_mistakes, "pronunciation");

    const exitCode = nonnegativeInteger(message.exit_code);
    if (exitCode === 8) {
      observations.push({
        ...base,
        observationKind: "session_status",
        status: "ended",
        code: "SURAH_FINISHED",
        exitCodeHint: exitCode,
      });
    } else if (exitCode === 6) {
      observations.push({
        ...base,
        observationKind: "session_status",
        status: "result",
        code: "SUCCESS",
        exitCodeHint: exitCode,
      });
    } else if (exitCode !== null) {
      // QRC itself documents meanings for 6 and 8; other values stay opaque.
      observations.push({
        ...base,
        observationKind: "session_status",
        status: "unverified",
        code: `EXIT_CODE_${exitCode}`,
        exitCodeHint: exitCode,
      });
    }
    return observations;
  }

  normalizeServerMessage(input: unknown, timestamp = Date.now()): NormalizedRecitationEvent[] {
    return this.observeServerMessage(input, timestamp)
      .map(normalizeProviderObservation)
      .filter((event): event is NormalizedRecitationEvent => event !== null);
  }
}
