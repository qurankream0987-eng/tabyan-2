import type { AlignmentOp, LiveMatch } from "./quran-live-matcher";

/**
 * محرك حالات الكلمات والأخطاء فوق مخرجات QuranLiveMatcher.
 *
 * مبادئ السلامة:
 * - لا يُعلَن خطأ مؤكَّد من فرضية واحدة: كل انحراف يبدأ "محتملاً" ولا يتأكد
 *   إلا بدليل لاحق عالي الثقة (تقدّم القارئ كلمتين بعده دون تصحيح).
 * - الثقة المنخفضة أو جودة الصوت غير الموثوقة لا تُنتج خطأً مؤكداً وحدها.
 * - التصحيح الذاتي يحوّل الخطأ إلى "مصحَّح" ويُبقي أثره التاريخي للتحليلات.
 * - الكلمات المتوقعة تأتي دائماً من corpus القرآني الكنسي عبر الـ matcher.
 */

export type RecitationWordState =
  | "UNREAD"
  | "EXPECTED"
  | "HEARD_PENDING"
  | "CORRECT"
  | "POSSIBLE_ERROR"
  | "CONFIRMED_ERROR"
  | "CORRECTED"
  | "SKIPPED"
  | "PEEKED";

export type RecitationMistakeKind =
  | "OMISSION"
  | "WRONG_WORD"
  | "EXTRA_WORD"
  | "REPETITION"
  | "SKIP"
  | "UNEXPECTED_JUMP";

export type ConfidenceTier = "HIGH" | "MEDIUM" | "LOW";

export interface WordRef {
  verseKey: string;
  position: number;
}

export interface RecitationEngineEvent {
  kind: RecitationMistakeKind | "CORRECTION" | "PEEK" | "DISMISSED";
  index: number;
  word: WordRef | null;
  /** اللفظ المسموع المطبّع (للإبدال/الزيادة فقط)، لا نص جلسة كامل. */
  heard?: string;
  tier: ConfidenceTier;
  at: number;
  /** حالة حدث الخطأ الحالية؛ لا يُحذف حدث بل يُعاد تصنيفه (قابل للتدقيق). */
  status?: "possible" | "confirmed" | "corrected" | "dismissed" | "unconfirmed";
  peekLevel?: 1 | 2 | 3;
}

export interface RecitationEngineOptions {
  /** "لا تنتقل حتى أصحح الخطأ": الخطأ المؤكد يوقف التقدم المنطقي. */
  strict?: boolean;
  /** كلمات مطابقة بعد الخطأ قبل تأكيده. */
  confirmAfterWords?: number;
  /** تخطٍّ أطول من هذا يُعد قفزة/تخطي مقطع لا سقوط كلمة. */
  jumpWords?: number;
  wordAt: (index: number) => (WordRef & { ayah: number; surah: number; normalizedText?: string }) | null;
  now?: () => number;
  /**
   * The recognizer's confidence from which a different word is a mistake; below it the word is
   * taken as the expected one, barely heard. Defaults to the high-confidence tier.
   */
  substitutionConfidence?: number;
}

export interface EngineUpdate {
  /** فهارس تغيرت حالتها (لإعادة رسم مستهدفة). */
  changed: number[];
  /** في الوضع الصارم: فهرس يجب إرجاع الـ matcher إليه. */
  rewindTo: number | null;
}

export interface RecitationSummary {
  wordsHeard: number;
  /** آيات قُرئت منها كلمة واحدة على الأقل (من الكلمات المقيَّمة فعلاً) */
  ayahsCovered: number;
  correctFirstTry: number;
  confirmedMistakes: number;
  correctedMistakes: number;
  /** انحرافات لم تتأكد (ثقة/صوت غير كافٍ) — لا تُحتسب أخطاء. */
  unconfirmed: number;
  dismissed: number;
  peeks: number;
  extras: number;
  repetitions: number;
  skippedWords: number;
  /** نسبة مئوية صحيحة؛ null عند عينة صغيرة لا تسمح بدقة ذات معنى. */
  accuracyPercent: number | null;
  mistakesByKind: Partial<Record<RecitationMistakeKind, number>>;
}

const HIGH_CONFIDENCE = 0.86;
const MEDIUM_CONFIDENCE = 0.68;
const MAX_EVENTS = 2_000;
const MIN_ACCURACY_SAMPLE = 20;

export function confidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= HIGH_CONFIDENCE) return "HIGH";
  if (confidence >= MEDIUM_CONFIDENCE) return "MEDIUM";
  return "LOW";
}

interface ErrorRecord {
  event: RecitationEngineEvent;
  index: number;
}

export class RecitationStateEngine {
  private readonly states = new Map<number, RecitationWordState>();
  private readonly errors = new Map<number, ErrorRecord>();
  private readonly firstTry = new Map<number, "correct" | "error">();
  private readonly events: RecitationEngineEvent[] = [];
  private committedIndex = 0;
  private provisionalIndex = -1;
  private holdAt: number | null = null;
  private extras = 0;
  private repetitions = 0;
  private strict: boolean;
  private readonly confirmAfterWords: number;
  private readonly jumpWords: number;
  private readonly now: () => number;

  constructor(private readonly options: RecitationEngineOptions) {
    this.strict = options.strict ?? false;
    this.confirmAfterWords = options.confirmAfterWords ?? 2;
    this.jumpWords = options.jumpWords ?? 4;
    this.now = options.now ?? (() => Date.now());
  }

  setStrict(strict: boolean) {
    this.strict = strict;
    if (!strict) this.holdAt = null;
  }

  /** موضع البداية (قراءة من منتصف الصفحة): ما قبله سياق لا تقييم. */
  setStart(index: number) {
    this.committedIndex = Math.max(this.committedIndex, index);
  }

  get strictHoldAt() {
    return this.holdAt;
  }

  stateAt(index: number): RecitationWordState {
    const state = this.states.get(index);
    if (state) return state;
    if (index >= this.committedIndex && index <= this.provisionalIndex) return "HEARD_PENDING";
    if (index === this.committedIndex) return "EXPECTED";
    return "UNREAD";
  }

  /**
   * حالات مرئية مفهرسة بـ "verseKey:position" للطبقة البصرية.
   * includeCorrect: في المتابعة مع إظهار الآيات تُصبغ الكلمات المقروءة صبغة خافتة.
   */
  visibleStates(includeCorrect = false): Map<string, RecitationWordState> {
    const visible = new Map<string, RecitationWordState>();
    for (const [index, state] of this.states) {
      if (state === "CORRECT" && !includeCorrect) continue;
      const word = this.options.wordAt(index);
      if (word) visible.set(`${word.verseKey}:${word.position}`, state);
    }
    for (let index = this.committedIndex; index <= this.provisionalIndex; index += 1) {
      if (this.states.has(index)) continue;
      const word = this.options.wordAt(index);
      if (word) visible.set(`${word.verseKey}:${word.position}`, "HEARD_PENDING");
    }
    return visible;
  }

  apply(match: LiveMatch, context: { audioReliable?: boolean; confirmationEligible?: boolean } = {}): EngineUpdate {
    const audioReliable = context.audioReliable ?? true;
    const tier = confidenceTier(match.confidence);
    const changed = new Set<number>();
    const previousProvisionalIndex = this.provisionalIndex;
    this.provisionalIndex = match.provisionalIndex;

    this.applyCommitted(match.committedOps, tier, audioReliable, changed);
    this.applyRevisits(match.revisitOps, tier, changed);
    this.committedIndex = match.committedIndex;
    if (previousProvisionalIndex >= this.committedIndex && previousProvisionalIndex !== this.provisionalIndex) {
      changed.add(previousProvisionalIndex);
    }
    if (this.provisionalIndex >= this.committedIndex) changed.add(this.provisionalIndex);

    let rewindTo: number | null = null;
    // التأكيد: القارئ تقدّم confirmAfterWords كلمة مطابقة بعد الانحراف،
    // بدليل عالي الثقة وصوت موثوق. غير ذلك يبقى الانحراف محتملاً.
    if (tier === "HIGH" && audioReliable && context.confirmationEligible !== false) {
      for (const record of this.errors.values()) {
        if (record.event.status !== "possible") continue;
        if (!this.matchedRunAfter(record.index)) continue;
        this.setState(record.index, "CONFIRMED_ERROR", changed);
        record.event.status = "confirmed";
        if (this.strict && this.holdAt === null) this.holdAt = record.index;
      }
    }
    // الوضع الصارم: لا تقدّم منطقي بعد خطأ مؤكد حتى تُقرأ كلمته صحيحة.
    if (this.strict && this.holdAt !== null && this.committedIndex > this.holdAt) {
      rewindTo = this.holdAt;
      this.committedIndex = this.holdAt;
    }
    return { changed: [...changed], rewindTo };
  }

  /**
   * تلميح متدرّج: 1 = الكلمة التالية، 2 = ثلاث كلمات، 3 = بقية الآية الحالية.
   * يُسجَّل PEEK منفصلاً عن الأخطاء، والكلمة المُلمَّح بها لا تُحتسب صحيحة.
   */
  peek(level: 1 | 2 | 3): number[] {
    const start = this.holdAt ?? this.committedIndex;
    const first = this.options.wordAt(start);
    if (!first) return [];
    const indices: number[] = [];
    const limit = level === 1 ? 1 : level === 2 ? 3 : Number.POSITIVE_INFINITY;
    for (let index = start; indices.length < limit; index += 1) {
      const word = this.options.wordAt(index);
      if (!word || (level === 3 && word.verseKey !== first.verseKey)) break;
      indices.push(index);
    }
    const changed = new Set<number>();
    for (const index of indices) {
      if (this.stateAt(index) === "CORRECT" || this.stateAt(index) === "CORRECTED") continue;
      this.setState(index, "PEEKED", changed);
    }
    this.record({ kind: "PEEK", index: start, word: this.ref(start), tier: "HIGH", at: this.now(), peekLevel: level });
    return indices;
  }

  /** Explicit test-card hints: no matcher advancement and no invented errors. */
  peekIndices(indices: readonly number[]): number[] {
    const changed = new Set<number>();
    for (const index of indices) {
      if (!this.options.wordAt(index) || index < this.committedIndex) continue;
      const state = this.stateAt(index);
      if (state === "PEEKED" || state === "CORRECT" || state === "CORRECTED") continue;
      this.setState(index, "PEEKED", changed);
    }
    const revealed = [...changed];
    if (revealed.length) {
      const first = revealed[0];
      this.record({ kind: "PEEK", index: first, word: this.ref(first), tier: "HIGH", at: this.now(), peekLevel: revealed.length === 1 ? 1 : 3 });
    }
    return revealed;
  }

  /**
   * "ليست خطأ": يعيد تصنيف خطأ سابق دون حذف أثره. الكلمة تصبح صحيحة للعرض،
   * ويبقى الحدث بحالة dismissed للتدقيق وتقييم معدل الإيجابيات الكاذبة.
   */
  dismissMistake(index: number): boolean {
    const record = this.errors.get(index);
    if (!record || record.event.status === "dismissed") return false;
    record.event.status = "dismissed";
    this.states.set(index, "CORRECT");
    this.firstTry.set(index, "correct");
    if (this.holdAt === index) this.holdAt = null;
    this.record({ kind: "DISMISSED", index, word: this.ref(index), tier: record.event.tier, at: this.now() });
    return true;
  }

  eventLog(): readonly RecitationEngineEvent[] {
    return this.events;
  }

  /** سجل الخطأ (غير المرفوض) عند فهرس كلمة، إن وُجد — لنافذة الكلمة. */
  mistakeAt(index: number): RecitationEngineEvent | null {
    const record = this.errors.get(index);
    return record && record.event.status !== "dismissed" ? record.event : null;
  }

  /**
   * نتائج كل آية في الجلسة للسجل المحلي: كلمات صحيحة من أول محاولة، أخطاء
   * مؤكدة/مصحَّحة، تلميحات. الانحرافات غير المؤكدة والمرفوضة لا تُحتسب.
   */
  ayahResults(): { verseKey: string; correctWords: number; confirmed: number; corrected: number; peeks: number }[] {
    const byAyah = new Map<string, { verseKey: string; correctWords: number; confirmed: number; corrected: number; peeks: number }>();
    const bucket = (index: number) => {
      const word = this.options.wordAt(index);
      if (!word) return null;
      let entry = byAyah.get(word.verseKey);
      if (!entry) { entry = { verseKey: word.verseKey, correctWords: 0, confirmed: 0, corrected: 0, peeks: 0 }; byAyah.set(word.verseKey, entry); }
      return entry;
    };
    for (const [index, result] of this.firstTry) if (result === "correct") { const e = bucket(index); if (e) e.correctWords += 1; }
    for (const record of this.errors.values()) {
      const e = bucket(record.index);
      if (!e) continue;
      if (record.event.status === "confirmed") e.confirmed += 1;
      else if (record.event.status === "corrected") e.corrected += 1;
    }
    for (const [index, state] of this.states) if (state === "PEEKED") { const e = bucket(index); if (e) e.peeks += 1; }
    return [...byAyah.values()];
  }

  /** أخطاء الجلسة النهائية للسجل (بلا اللفظ المسموع). */
  mistakeRecords(): { verseKey: string; position: number; kind: RecitationMistakeKind; status: "confirmed" | "corrected" | "dismissed" }[] {
    const out: { verseKey: string; position: number; kind: RecitationMistakeKind; status: "confirmed" | "corrected" | "dismissed" }[] = [];
    for (const record of this.errors.values()) {
      const status = record.event.status;
      if (!record.event.word || (status !== "confirmed" && status !== "corrected" && status !== "dismissed")) continue;
      out.push({ verseKey: record.event.word.verseKey, position: record.event.word.position, kind: record.event.kind as RecitationMistakeKind, status });
    }
    return out;
  }

  /**
   * أضعف المواضع في الجلسة: الآيات مرتبة بعدد الأخطاء المؤكدة ثم المصحَّحة ثم
   * التلميحات. حتمي وقابل للتفسير — لا نموذج ولا تقدير.
   */
  weakestAyahs(limit = 3): { verseKey: string; confirmed: number; corrected: number; peeks: number }[] {
    const byAyah = new Map<string, { verseKey: string; confirmed: number; corrected: number; peeks: number }>();
    const bucket = (verseKey: string) => {
      let entry = byAyah.get(verseKey);
      if (!entry) { entry = { verseKey, confirmed: 0, corrected: 0, peeks: 0 }; byAyah.set(verseKey, entry); }
      return entry;
    };
    for (const record of this.errors.values()) {
      const word = record.event.word;
      if (!word) continue;
      if (record.event.status === "confirmed") bucket(word.verseKey).confirmed += 1;
      else if (record.event.status === "corrected") bucket(word.verseKey).corrected += 1;
    }
    for (const [index, state] of this.states) {
      if (state !== "PEEKED") continue;
      const word = this.options.wordAt(index);
      if (word) bucket(word.verseKey).peeks += 1;
    }
    return [...byAyah.values()]
      .filter((entry) => entry.confirmed + entry.corrected + entry.peeks > 0)
      .sort((a, b) => b.confirmed - a.confirmed || b.corrected - a.corrected || b.peeks - a.peeks)
      .slice(0, limit);
  }

  /** ينهي الجلسة: كل انحراف لم يتأكد يُصنَّف unconfirmed ولا يُحتسب خطأ. */
  finalize() {
    for (const record of this.errors.values()) {
      if (record.event.status === "possible") record.event.status = "unconfirmed";
    }
  }

  summary(): RecitationSummary {
    let correctFirstTry = 0;
    let confirmed = 0;
    let corrected = 0;
    let unconfirmed = 0;
    let dismissed = 0;
    let skipped = 0;
    let peeks = 0;
    const byKind: Partial<Record<RecitationMistakeKind, number>> = {};
    for (const [, result] of this.firstTry) if (result === "correct") correctFirstTry += 1;
    for (const record of this.errors.values()) {
      const status = record.event.status;
      if (status === "dismissed") { dismissed += 1; continue; }
      if (status === "possible" || status === "unconfirmed") { unconfirmed += 1; continue; }
      if (status === "corrected") corrected += 1;
      else confirmed += 1;
      const kind = record.event.kind as RecitationMistakeKind;
      byKind[kind] = (byKind[kind] ?? 0) + 1;
    }
    for (const state of this.states.values()) {
      if (state === "SKIPPED") skipped += 1;
      if (state === "PEEKED") peeks += 1;
    }
    const assessed = correctFirstTry + confirmed + corrected;
    const ayahs = new Set<string>();
    for (const index of this.firstTry.keys()) {
      const word = this.options.wordAt(index);
      if (word) ayahs.add(word.verseKey);
    }
    return {
      wordsHeard: this.firstTry.size,
      ayahsCovered: ayahs.size,
      correctFirstTry,
      confirmedMistakes: confirmed,
      correctedMistakes: corrected,
      unconfirmed,
      dismissed,
      peeks,
      extras: this.extras,
      repetitions: this.repetitions,
      skippedWords: skipped,
      accuracyPercent: assessed >= MIN_ACCURACY_SAMPLE ? Math.round((correctFirstTry / assessed) * 100) : null,
      mistakesByKind: byKind,
    };
  }

  private applyCommitted(ops: AlignmentOp[], tier: ConfidenceTier, audioReliable: boolean, changed: Set<number>) {
    const skipRuns: number[][] = [];
    for (const op of ops) {
      if (op.kind === "skip") {
        const run = skipRuns.at(-1);
        if (run && run.at(-1) === op.index - 1) run.push(op.index);
        else skipRuns.push([op.index]);
      }
    }
    const longSkips = new Set(skipRuns.filter((run) => run.length > this.jumpWords).flat());
    const recordedRuns = new Set<number[]>();

    for (const op of ops) {
      // أثناء الإيقاف الصارم تُهمل الكلمات بعد موضع الخطأ؛ تُعاد قراءتها بعد تصحيحه.
      if (this.holdAt !== null && !(op.kind === "match" && op.index === this.holdAt)) continue;
      if (op.kind === "match") {
        this.resolveMatch(op.index, changed);
      } else if (op.kind === "substitution") {
        // A different word is a mistake only when the recognizer is sure of what it heard;
        // a word it barely made out (fast speech, a breath, noise) is taken as the expected one.
        if (op.confidence !== undefined && op.confidence < (this.options.substitutionConfidence ?? HIGH_CONFIDENCE)) this.resolveMatch(op.index, changed);
        else {
          this.openError(op.index, "WRONG_WORD", tier, changed, op.heard);
          if (this.strict) this.holdOn(op.index, changed);
        }
      } else if (op.kind === "skip" && this.strict) {
        // Strict: nothing is skipped. A word left out stops the reader there like a wrong one,
        // except a lone short word («في», «من») the recognizer often drops from a correct reading.
        if (this.isDroppedShortWord(op.index, ops)) this.resolveMatch(op.index, changed);
        else {
          this.openError(op.index, "OMISSION", tier, changed);
          this.holdOn(op.index, changed);
        }
      } else if (op.kind === "skip") {
        if (longSkips.has(op.index)) {
          this.setState(op.index, "SKIPPED", changed);
          const run = skipRuns.find((candidate) => candidate.includes(op.index))!;
          if (!recordedRuns.has(run)) {
            recordedRuns.add(run);
            // تخطي آية كاملة أو أكثر = SKIP؛ قفزة داخل آية دون إكمالها = UNEXPECTED_JUMP.
            const kind: RecitationMistakeKind = this.coversWholeAyah(run) ? "SKIP" : "UNEXPECTED_JUMP";
            this.openError(run[0], kind, tier, changed);
          }
        } else {
          this.openError(op.index, "OMISSION", tier, changed);
        }
      } else if (op.kind === "extra") {
        this.applyExtra(op, ops, op.confidence === undefined ? tier : confidenceTier(op.confidence), audioReliable, changed);
      }
    }
  }

  /**
   * لفظ زائد يليه مباشرة الصواب في الموضع نفسه = خطأ صُحّح فوراً؛ وإن كان
   * تكراراً للكلمة السابقة فهو تكرار لا خطأ. الزائد المعزول يُسجل بثقة عالية فقط.
   */
  private applyExtra(op: Extract<AlignmentOp, { kind: "extra" }>, ops: AlignmentOp[], tier: ConfidenceTier, audioReliable: boolean, changed: Set<number>) {
    const previous = this.options.wordAt(op.afterIndex);
    if (previous?.normalizedText && previous.normalizedText === op.heard) {
      if (tier !== "LOW") {
        this.repetitions += 1;
        this.record({ kind: "REPETITION", index: op.afterIndex, word: this.ref(op.afterIndex), tier, at: this.now() });
      }
      return;
    }
    const target = op.afterIndex + 1;
    const position = ops.indexOf(op);
    const following = ops.slice(position + 1).find((candidate) => candidate.kind !== "extra");
    if (following?.kind === "match" && following.index === target && tier !== "LOW" && audioReliable) {
      if (this.errors.has(target)) return;
      const event: RecitationEngineEvent = {
        kind: "WRONG_WORD", index: target, word: this.ref(target), heard: op.heard, tier, at: this.now(), status: "corrected",
      };
      this.errors.set(target, { event, index: target });
      this.record(event);
      if (!this.firstTry.has(target)) this.firstTry.set(target, "error");
      this.setState(target, "CORRECTED", changed);
      this.record({ kind: "CORRECTION", index: target, word: this.ref(target), tier, at: this.now() });
      return;
    }
    if (tier === "HIGH" && audioReliable) {
      this.extras += 1;
      this.record({ kind: "EXTRA_WORD", index: op.afterIndex, word: this.ref(op.afterIndex), heard: op.heard, tier, at: this.now() });
    }
  }

  private applyRevisits(ops: AlignmentOp[], tier: ConfidenceTier, changed: Set<number>) {
    let repeated = false;
    for (const op of ops) {
      if (op.kind !== "match") continue;
      const record = this.errors.get(op.index);
      if (record && (record.event.status === "possible" || record.event.status === "confirmed")) {
        this.markCorrected(op.index, record, changed);
      } else if (this.states.get(op.index) === "CORRECT") {
        repeated = true;
      }
    }
    if (repeated && tier !== "LOW") {
      this.repetitions += 1;
      const first = ops.find((op) => op.kind === "match");
      if (first && first.kind === "match") {
        this.record({ kind: "REPETITION", index: first.index, word: this.ref(first.index), tier, at: this.now() });
      }
    }
  }

  /**
   * Strict: a real mistake stops the reader at once, and the matcher is taken back to it
   * until that word is read right. A word only shown by a hint is not a new stop: revealing
   * the rest of an ayah must not freeze the reading that follows it.
   */
  private holdOn(index: number, changed: Set<number>) {
    const record = this.errors.get(index);
    if (!record || record.event.status === "corrected" || record.event.status === "dismissed") return;
    record.event.status = "confirmed";
    if (this.states.get(index) !== "PEEKED") this.setState(index, "CONFIRMED_ERROR", changed);
    if (this.holdAt === null) this.holdAt = index;
  }

  /** A single short word missing between words heard: more likely unheard than left out. */
  private isDroppedShortWord(index: number, ops: AlignmentOp[]) {
    const text = this.options.wordAt(index)?.normalizedText;
    if (!text || text.length > 2) return false;
    return !ops.some((op) => op.kind === "skip" && (op.index === index - 1 || op.index === index + 1));
  }

  private resolveMatch(index: number, changed: Set<number>) {
    // A word shown by a hint and then read: the hold ends, the word stays a hint.
    if (this.states.get(index) === "PEEKED") {
      if (this.holdAt === index) this.holdAt = null;
      return;
    }
    const record = this.errors.get(index);
    if (record && (record.event.status === "possible" || record.event.status === "confirmed")) {
      this.markCorrected(index, record, changed);
      return;
    }
    const state = this.states.get(index);
    if (state === "PEEKED" || state === "CORRECTED") return;
    if (!this.firstTry.has(index)) this.firstTry.set(index, "correct");
    this.setState(index, "CORRECT", changed);
  }

  private markCorrected(index: number, record: ErrorRecord, changed: Set<number>) {
    record.event.status = "corrected";
    this.setState(index, "CORRECTED", changed);
    this.record({ kind: "CORRECTION", index, word: this.ref(index), tier: record.event.tier, at: this.now() });
    if (this.holdAt === index) this.holdAt = null;
  }

  private openError(index: number, kind: RecitationMistakeKind, tier: ConfidenceTier, changed: Set<number>, heard?: string) {
    const existing = this.errors.get(index);
    if (existing && existing.event.status !== "corrected" && existing.event.status !== "dismissed") return;
    if (this.states.get(index) === "PEEKED") return;
    const event: RecitationEngineEvent = { kind, index, word: this.ref(index), heard, tier, at: this.now(), status: "possible" };
    this.errors.set(index, { event, index });
    if (!this.firstTry.has(index)) this.firstTry.set(index, "error");
    if (kind !== "SKIP" && kind !== "UNEXPECTED_JUMP") this.setState(index, "POSSIBLE_ERROR", changed);
    this.record(event);
  }

  private coversWholeAyah(run: number[]) {
    const set = new Set(run);
    for (const index of run) {
      const word = this.options.wordAt(index);
      if (!word || word.position !== 1) continue;
      let end = index;
      while (this.options.wordAt(end + 1)?.verseKey === word.verseKey) end += 1;
      let covered = true;
      for (let k = index; k <= end && covered; k += 1) covered = set.has(k);
      if (covered) return true;
    }
    return false;
  }

  /** هل تلا القارئ confirmAfterWords كلمة مطابقة بعد الانحراف؟ */
  private matchedRunAfter(index: number) {
    let run = 0;
    for (let next = index + 1; next < this.committedIndex; next += 1) {
      const state = this.states.get(next);
      if (state === "CORRECT" || state === "CORRECTED") {
        run += 1;
        if (run >= this.confirmAfterWords) return true;
      } else if (state === "POSSIBLE_ERROR" || state === "CONFIRMED_ERROR") {
        run = 0;
      }
    }
    return false;
  }

  private setState(index: number, state: RecitationWordState, changed: Set<number>) {
    if (this.states.get(index) === state) return;
    this.states.set(index, state);
    changed.add(index);
  }

  private ref(index: number): WordRef | null {
    const word = this.options.wordAt(index);
    return word ? { verseKey: word.verseKey, position: word.position } : null;
  }

  private record(event: RecitationEngineEvent) {
    this.events.push(event);
    if (this.events.length > MAX_EVENTS) this.events.splice(0, this.events.length - MAX_EVENTS);
  }
}
