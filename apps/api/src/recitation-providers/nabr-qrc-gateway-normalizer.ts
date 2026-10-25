import {
  canonicalWordKeyToNabrIndices,
  type NabrQrcGatewayMistake,
  type NabrQrcGatewayObservation,
  type NabrQrcIndices,
} from "@workspace/tabyan-domain";

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as RecordValue
    : null;
}

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

function qrcPosition(
  chapter: unknown,
  verse: unknown,
  word: unknown,
): NabrQrcIndices | null {
  const surah = positiveInteger(chapter);
  const ayah = positiveInteger(verse);
  const wordIndex = positiveInteger(word);
  if (surah === null || surah > 114 || ayah === null || wordIndex === null) return null;
  return canonicalWordKeyToNabrIndices({ surah, ayah, wordIndex });
}

function boundedString(value: unknown, maxLength: number): string | undefined {
  return typeof value === "string" && value.length > 0 ? value.slice(0, maxLength) : undefined;
}

function normalizeLocations(value: unknown): NabrQrcIndices[] {
  if (!Array.isArray(value)) return [];
  const positions: NabrQrcIndices[] = [];
  for (const item of value.slice(0, 512)) {
    const record = asRecord(item);
    const position = record ? qrcPosition(record.chapter, record.verse, record.word) : null;
    if (position) positions.push(position);
  }
  return positions;
}

function normalizeMistakes(value: unknown): NabrQrcGatewayMistake[] {
  if (!Array.isArray(value)) return [];
  const mistakes: NabrQrcGatewayMistake[] = [];
  for (const item of value.slice(0, 512)) {
    const record = asRecord(item);
    if (!record) continue;
    const position = qrcPosition(record.chapter, record.verse, record.word);
    if (!position) continue;
    const letterIndex = typeof record.letter === "number"
      && Number.isSafeInteger(record.letter) && record.letter >= 0
      ? record.letter
      : undefined;
    const errorCode = boundedString(record.errorCode, 80);
    const description = boundedString(record.message, 500);
    const heard = boundedString(record.speachLike, 160);
    const ruleName = boundedString(record.ruleName ?? record.rule_name, 120);
    mistakes.push({
      position,
      ...(errorCode ? { errorCode } : {}),
      ...(description ? { description } : {}),
      ...(heard ? { heard } : {}),
      ...(letterIndex === undefined ? {} : { providerLetterIndex: letterIndex }),
      ...(ruleName ? { ruleName } : {}),
    });
  }
  return mistakes;
}

/**
 * Convert a decoded QRC result into a bounded, whitelisted gateway observation.
 * The QRC one-based coordinate convention is retained on the wire to the client;
 * no raw packet, audio, API key, or provider error text is returned.
 */
export function normalizeNabrQrcGatewayResult(
  input: unknown,
  observedAt = Date.now(),
): NabrQrcGatewayObservation | null {
  const message = asRecord(input);
  if (!message || message.event !== "TILAWA_RESULT") return null;
  const currentPosition = qrcPosition(
    message.chapter_index,
    message.verse_index,
    message.word_index,
  );
  if (!currentPosition) return null;

  const providerTimestamp = typeof message.timestamp === "number"
    && Number.isFinite(message.timestamp)
    ? message.timestamp
    : undefined;
  const confidence = typeof message.confidence === "number"
    && Number.isFinite(message.confidence)
    && message.confidence >= 0
    && message.confidence <= 1
    ? message.confidence
    : undefined;
  const providerEventId = boundedString(message.event_id ?? message.result_id, 128);

  return Object.freeze({
    currentPosition,
    correctWords: Object.freeze(normalizeLocations(message.correct_words)),
    skippedWords: Object.freeze(normalizeLocations(message.skipped_words)),
    letterMistakes: Object.freeze(normalizeMistakes(message.letter_mistakes)),
    tajweedMistakes: Object.freeze(normalizeMistakes(message.tajweed_mistakes)),
    observedAt: Number.isFinite(observedAt) ? observedAt : Date.now(),
    ...(providerTimestamp === undefined ? {} : { providerTimestamp }),
    ...(providerEventId ? { providerEventId } : {}),
    ...(confidence === undefined ? {} : { confidence }),
  });
}
