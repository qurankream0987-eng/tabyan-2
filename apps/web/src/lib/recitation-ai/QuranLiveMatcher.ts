/** المطابق الحي مشترك بين الويب والجوال؛ التنفيذ في حزمة domain. */
import {
  QuranLiveMatcher as SharedQuranLiveMatcher,
  type LiveMatch as SharedLiveMatch,
} from "@workspace/tabyan-domain/quran-live-matcher";
import type { CanonicalQuranWord } from "./canonicalWords";

export type {
  AlignmentOp,
  LiveTranscriptInput,
  MatcherDiagnostics,
  QuranLiveMatcherOptions,
} from "@workspace/tabyan-domain/quran-live-matcher";

/** نسخة الويب: كلمات الـ corpus تحمل دائماً الصفحة والسطر. */
export class QuranLiveMatcher extends SharedQuranLiveMatcher<CanonicalQuranWord> {}
export type LiveMatch = SharedLiveMatch<CanonicalQuranWord>;
