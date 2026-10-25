import { z } from "zod";

const qrcFlag = z.enum(["true", "false"]).optional();

export const NabrQrcEnvironmentSchema = z.object({
  NABR_QRC_ENABLED: qrcFlag,
  NABR_QRC_DRY_RUN: qrcFlag,
  NABR_QRC_SHADOW_MODE: qrcFlag,
  NABR_QRC_HAFZ_LEVEL: z.enum(["1", "2", "3"]).optional(),
  NABR_QRC_TAJWEED_LEVEL: z.enum(["1", "2", "3", "4", "5"]).optional(),
});

export type NabrQrcConfig = {
  enabled: boolean;
  dryRun: boolean;
  shadowMode?: boolean;
  hafzLevel?: number;
  tajweedLevel?: number;
};

/**
 * The API key is deliberately excluded from this public configuration schema;
 * read it from the server secret manager only when live use is explicitly enabled.
 */
export function parseNabrQrcConfig(
  environment: Record<string, string | undefined>,
): NabrQrcConfig {
  const parsed = NabrQrcEnvironmentSchema.safeParse(environment);
  if (!parsed.success) return { enabled: false, dryRun: true, shadowMode: false };
  const flags = parsed.data;
  return {
    enabled: flags.NABR_QRC_ENABLED === "true",
    // Dry run is the safe default, even if somebody enables the feature flag.
    dryRun: flags.NABR_QRC_DRY_RUN !== "false",
    // Shadow mode must be explicitly enabled; it is not inferred from absence.
    shadowMode: flags.NABR_QRC_SHADOW_MODE === "true",
    ...(flags.NABR_QRC_HAFZ_LEVEL === undefined
      ? {}
      : { hafzLevel: Number(flags.NABR_QRC_HAFZ_LEVEL) }),
    ...(flags.NABR_QRC_TAJWEED_LEVEL === undefined
      ? {}
      : { tajweedLevel: Number(flags.NABR_QRC_TAJWEED_LEVEL) }),
  };
}

/** Never even read the secret while disabled or in dry-run mode. */
export function readNabrQrcCredential(
  environment: Record<string, string | undefined>,
  config: NabrQrcConfig,
): NabrQrcCredential {
  if (!config.enabled || config.dryRun) return {};
  return { apiKey: environment.NABR_QRC_API_KEY };
}

export interface NabrQrcCredential {
  /** Qurani.ai documents an API key; this value must be injected server-side. */
  apiKey?: string;
}

export interface NabrQrcStartInput {
  /** Must be derived from the authenticated, server-owned Tabyan session. */
  chapterIndex: number;
  verseIndex: number;
  wordIndex: number;
  /** QRC accepts 1–3; semantic mapping to Tabyan policy remains unresolved. */
  hafzLevel: number;
  /** QRC accepts 1–5 in the current guide; semantic mapping remains unresolved. */
  tajweedLevel: number;
}

export interface NabrQrcStartPayload {
  method: "START_TILAWA_SESSION";
  chapter_index: number;
  verse_index: number;
  word_index: number;
  hafz_level: number;
  tajweed_level: number;
}

export const NABR_QRC_WSS_URL = "wss://api.qurani.ai";

export function createNabrQrcStartPayload(input: NabrQrcStartInput): NabrQrcStartPayload {
  if (!Number.isSafeInteger(input.chapterIndex) || input.chapterIndex < 1 || input.chapterIndex > 114
    || !Number.isSafeInteger(input.verseIndex) || input.verseIndex < 1
    || !Number.isSafeInteger(input.wordIndex) || input.wordIndex < 1
    || !Number.isSafeInteger(input.hafzLevel) || input.hafzLevel < 1 || input.hafzLevel > 3
    || !Number.isSafeInteger(input.tajweedLevel) || input.tajweedLevel < 1 || input.tajweedLevel > 5) {
    throw new Error("NABR_QRC_START_POLICY_REQUIRED");
  }

  return {
    method: "START_TILAWA_SESSION",
    chapter_index: input.chapterIndex,
    verse_index: input.verseIndex,
    word_index: input.wordIndex,
    hafz_level: input.hafzLevel,
    tajweed_level: input.tajweedLevel,
  };
}

/**
 * The official QRC example documents `api_key` in the WebSocket query. Keep
 * this URL server-side and never log it: query strings can otherwise leak keys.
 */
export function createNabrQrcWebSocketUrl(apiKey: string): string {
  if (!apiKey.trim()) throw new Error("PROVIDER_NOT_CONFIGURED");
  const url = new URL(NABR_QRC_WSS_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("lang", "ar");
  url.searchParams.set("audio_format", "wav");
  return url.toString();
}
