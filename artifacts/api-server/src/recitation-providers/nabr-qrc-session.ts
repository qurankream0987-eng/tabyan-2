import { canonicalWordKeyToNabrIndices } from "@workspace/tabyan-domain";
import {
  createNabrQrcStartPayload,
  type NabrQrcConfig,
  type NabrQrcStartInput,
} from "./nabr-qrc-config";

export interface NabrQrcSessionContext {
  mode: "general" | "educational";
  startVerseKey: string | null;
  startWordPosition: number | null;
  expectedRange: {
    start: {
      surahId: number;
      ayah: number;
      wordPosition?: number;
    };
  } | null;
}

/**
 * QRC coordinates come only from the authenticated database session. The
 * learner's optional general start is a display context; educational starts
 * come only from the server-assigned expected range.
 */
export function nabrQrcStartInputForSession(
  session: NabrQrcSessionContext,
  config: NabrQrcConfig,
): NabrQrcStartInput | null {
  if (config.hafzLevel === undefined || config.tajweedLevel === undefined) return null;

  let chapterIndex: number;
  let verseIndex: number;
  let wordIndex: number;

  if (session.mode === "general") {
    const match = session.startVerseKey?.match(/^([1-9]\d{0,2}):([1-9]\d{0,2})$/);
    if (!match) return null;
    chapterIndex = Number(match[1]);
    verseIndex = Number(match[2]);
    wordIndex = session.startWordPosition ?? 1;
  } else {
    const start = session.expectedRange?.start;
    if (!start) return null;
    chapterIndex = start.surahId;
    verseIndex = start.ayah;
    wordIndex = start.wordPosition ?? 1;
  }

  const qrcPosition = canonicalWordKeyToNabrIndices({
    surah: chapterIndex,
    ayah: verseIndex,
    wordIndex,
  });
  const input = {
    chapterIndex: qrcPosition.chapter_index,
    verseIndex: qrcPosition.verse_index,
    wordIndex: qrcPosition.word_index,
    hafzLevel: config.hafzLevel,
    tajweedLevel: config.tajweedLevel,
  };
  try {
    createNabrQrcStartPayload(input);
    return input;
  } catch {
    return null;
  }
}
