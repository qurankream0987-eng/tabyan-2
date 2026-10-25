/**
 * @license
 * Tabyan Smart Mushaf — reader mode and session summary models
 * Live word state lives in live/store/WordPresentationStore; these types only
 * describe reader modes and the end-of-session summary.
 */

import { WordKey } from '../../quran/domain/types';

export type MushafMode = 'READING' | 'TASMEE' | 'CORRECTION' | 'TEACHER';

export type MistakeSeverity = 'INFO' | 'WARNING' | 'ERROR';

export type MistakeCategory =
  | 'LETTER'     // Letter articulation / makhraj error
  | 'TAJWEED'    // Tajweed rule error (ghunnah, madd, qalqalah)
  | 'SKIPPED'    // Reciter missed a word
  | 'REPEATED'   // Reciter repeated a word or phrase
  | 'WRONG_WORD' // Reciter recited an erroneous word
  | 'HARAKAH';   // Short vowel / diacritic error

export interface ConfirmedMistake {
  readonly id: string;
  readonly key: WordKey;
  readonly category: MistakeCategory;
  readonly severity: MistakeSeverity;
  readonly messageAr: string;
  readonly messageEn: string;
  readonly detectedAt: number;
  readonly ruleName?: string;
}

export interface RecitationMetrics {
  readonly totalWordsInScope: number;
  readonly confirmedWordsCount: number;
  readonly skippedWordsCount: number;
  readonly repeatedWordsCount: number;
  readonly revealedWordsCount: number;
  readonly mistakeCount: number;
  readonly accuracyPercentage: number;
  readonly durationSeconds: number;
}

export interface SessionResultSummary {
  readonly sessionId: string;
  readonly mode: MushafMode;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly targetScope: {
    readonly surahNumber: number;
    readonly startAyah: number;
    readonly endAyah: number;
  };
  readonly metrics: RecitationMetrics;
  readonly mistakes: readonly ConfirmedMistake[];
}
