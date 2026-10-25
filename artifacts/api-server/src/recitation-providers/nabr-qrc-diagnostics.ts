export interface NabrQrcDiagnosticLocation {
  chapter?: number;
  verse?: number;
  word?: number;
}

export interface NabrQrcDiagnosticMistake extends NabrQrcDiagnosticLocation {
  letter?: number;
  errorCode?: string;
  message?: string;
  speachLike?: string;
}

/** Whitelisted, bounded QRC packet fields; never contains URL/query credentials. */
export interface NabrQrcDiagnosticPacket {
  observedAt: number;
  eventType: string;
  providerEventId?: string;
  providerErrorCode?: string;
  chapter_index?: number;
  verse_index?: number;
  word_index?: number;
  exit_code?: number;
  confidence?: number;
  word_status?: string;
  correct_words: NabrQrcDiagnosticLocation[];
  skipped_words: NabrQrcDiagnosticLocation[];
  tajweed_mistakes: NabrQrcDiagnosticMistake[];
  letter_mistakes: NabrQrcDiagnosticMistake[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function boundedString(value: unknown, limit: number): string | undefined {
  return typeof value === "string" && value.length > 0 ? value.slice(0, limit) : undefined;
}

function location(record: Record<string, unknown>): NabrQrcDiagnosticLocation {
  const chapter = finiteNumber(record.chapter) ?? finiteNumber(record.chapter_index);
  const verse = finiteNumber(record.verse) ?? finiteNumber(record.verse_index);
  const word = finiteNumber(record.word) ?? finiteNumber(record.word_index);
  return {
    ...(chapter === undefined ? {} : { chapter }),
    ...(verse === undefined ? {} : { verse }),
    ...(word === undefined ? {} : { word }),
  };
}

function locations(value: unknown): NabrQrcDiagnosticLocation[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 512).flatMap((item) => {
    const record = asRecord(item);
    return record ? [location(record)] : [];
  });
}

function mistakes(value: unknown): NabrQrcDiagnosticMistake[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 512).flatMap((item) => {
    const record = asRecord(item);
    if (!record) return [];
    return [{
      ...location(record),
      ...(finiteNumber(record.letter) === undefined ? {} : { letter: finiteNumber(record.letter) }),
      ...(boundedString(record.errorCode, 80) ? { errorCode: boundedString(record.errorCode, 80) } : {}),
      ...(boundedString(record.message, 240) ? { message: boundedString(record.message, 240) } : {}),
      ...(boundedString(record.speachLike, 160) ? { speachLike: boundedString(record.speachLike, 160) } : {}),
    }];
  });
}

/** Keep only documented diagnostic fields from a decoded QRC packet. */
export function createNabrQrcDiagnosticPacket(
  input: unknown,
  observedAt: number,
  providerEventId?: string,
): NabrQrcDiagnosticPacket {
  const message = asRecord(input) ?? {};
  const eventType = boundedString(message.event, 100) ?? "UNKNOWN";
  return {
    observedAt,
    eventType,
    ...(providerEventId ? { providerEventId: providerEventId.slice(0, 160) } : {}),
    ...(boundedString(message.code, 80) ? { providerErrorCode: boundedString(message.code, 80) } : {}),
    ...(finiteNumber(message.chapter_index) === undefined ? {} : { chapter_index: finiteNumber(message.chapter_index) }),
    ...(finiteNumber(message.verse_index) === undefined ? {} : { verse_index: finiteNumber(message.verse_index) }),
    ...(finiteNumber(message.word_index) === undefined ? {} : { word_index: finiteNumber(message.word_index) }),
    ...(finiteNumber(message.exit_code) === undefined ? {} : { exit_code: finiteNumber(message.exit_code) }),
    ...(finiteNumber(message.confidence) === undefined ? {} : { confidence: finiteNumber(message.confidence) }),
    ...(boundedString(message.word_status, 80) ? { word_status: boundedString(message.word_status, 80) } : {}),
    correct_words: locations(message.correct_words),
    skipped_words: locations(message.skipped_words),
    tajweed_mistakes: mistakes(message.tajweed_mistakes),
    letter_mistakes: mistakes(message.letter_mistakes),
  };
}

export function qrcIntervalSummary(intervals: readonly number[]): {
  medianMs: number | null;
  p95Ms: number | null;
  enoughSamples: boolean;
} {
  if (intervals.length < 5) return { medianMs: null, p95Ms: null, enoughSamples: false };
  const sorted = [...intervals].sort((a, b) => a - b);
  const percentile = (fraction: number) => sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]!;
  const middle = Math.floor(sorted.length / 2);
  const medianMs = sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
  return { medianMs, p95Ms: percentile(0.95), enoughSamples: true };
}
