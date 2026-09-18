import { z } from "zod";

export const RECITATION_POLICY_VERSION = 1;

export const recitationModeSchema = z.enum(["general", "educational"]);
export type RecitationMode = z.infer<typeof recitationModeSchema>;

const AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110,
  98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88,
  75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24,
  13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8,
  3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
] as const;

export const recitationPositionSchema = z.object({
  surahId: z.number().int().min(1).max(114),
  ayah: z.number().int().min(1),
  wordPosition: z.number().int().min(1).optional(),
}).strict();

export type RecitationPosition = z.infer<typeof recitationPositionSchema>;

function comparePositions(a: RecitationPosition, b: RecitationPosition) {
  if (a.surahId !== b.surahId) return a.surahId - b.surahId;
  if (a.ayah !== b.ayah) return a.ayah - b.ayah;
  return (a.wordPosition ?? 1) - (b.wordPosition ?? 1);
}

function validatePosition(position: RecitationPosition, ctx: z.RefinementCtx, path: ("start" | "end")[]) {
  const maxAyah = AYAH_COUNTS[position.surahId - 1];
  if (position.ayah > maxAyah) {
    ctx.addIssue({
      code: "custom",
      path: [...path, "ayah"],
      message: "رقم الآية خارج حدود السورة",
    });
  }
}

export const expectedRangeSchema = z.object({
  start: recitationPositionSchema,
  end: recitationPositionSchema,
}).strict().superRefine((range, ctx) => {
  validatePosition(range.start, ctx, ["start"]);
  validatePosition(range.end, ctx, ["end"]);
  if (comparePositions(range.start, range.end) > 0) {
    ctx.addIssue({
      code: "custom",
      path: ["end"],
      message: "نهاية النطاق يجب أن تأتي بعد بدايته أو تساويها",
    });
  }
});

export type ExpectedRecitationRange = z.infer<typeof expectedRangeSchema>;

export const generalStartContextSchema = z.object({
  startPage: z.number().int().min(1).max(604).optional(),
  startVerseKey: z.string().regex(/^\d{1,3}:\d{1,3}$/).optional(),
  startWordPosition: z.number().int().min(1).optional(),
}).strict();

export const hideModeSchema = z.enum([
  "full_hide",
  "first_word",
  "progressive_reveal",
  "visible_review",
]);

export const generalStartInputSchema = z.object({
  mode: z.literal("general"),
  startContext: generalStartContextSchema.optional(),
  hideMode: hideModeSchema,
}).strict();

export const educationalStartInputSchema = z.object({
  mode: z.literal("educational"),
  expectedRange: expectedRangeSchema,
  hideMode: hideModeSchema,
}).strict();

export const startRecitationInputSchema = z.discriminatedUnion("mode", [
  generalStartInputSchema,
  educationalStartInputSchema,
]);

export type StartRecitationInput = z.infer<typeof startRecitationInputSchema>;

export interface RecitationPolicy {
  mode: RecitationMode;
  requiresExpectedRange: boolean;
  expectedEndPosition: "none" | "range";
  allowsEducationalProgress: boolean;
  recoveryScope: "broad_local" | "constrained";
  rangeCompletionEnabled: boolean;
}

const RECITATION_POLICIES: Record<RecitationMode, RecitationPolicy> = {
  general: {
    mode: "general",
    requiresExpectedRange: false,
    expectedEndPosition: "none",
    allowsEducationalProgress: false,
    recoveryScope: "broad_local",
    rangeCompletionEnabled: false,
  },
  educational: {
    mode: "educational",
    requiresExpectedRange: true,
    expectedEndPosition: "range",
    allowsEducationalProgress: true,
    recoveryScope: "constrained",
    rangeCompletionEnabled: true,
  },
};

export function getRecitationPolicy(mode: RecitationMode): RecitationPolicy {
  return RECITATION_POLICIES[mode];
}

/** صفوف GENERAL القديمة التي كانت تحمل range تبقى مرئية بلا تحويل أو حذف. */
export function isLegacyRangedGeneral(session: {
  mode: string;
  expectedRange?: unknown;
  surahId?: number | null;
  startAyah?: number | null;
  endAyah?: number | null;
}): boolean {
  return session.mode === "general"
    && session.expectedRange == null
    && session.surahId != null
    && session.startAyah != null
    && session.endAyah != null;
}