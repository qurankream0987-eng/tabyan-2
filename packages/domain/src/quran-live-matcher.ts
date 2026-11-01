import { normalizeQuranText } from "./quran-normalizer";

/** كلمة قرآنية كنسية داخل corpus المطابقة (نص العرض + نصها المطبّع). */
export interface CanonicalQuranWord {
  surah: number;
  ayah: number;
  verseKey: string;
  position: number;
  page?: number;
  line?: number;
  displayText: string;
  normalizedText: string;
}

/** ما يحتاجه الـ matcher من حدث التعرف: نص الـ item المجمّع ونهائيته فقط. */
export interface LiveTranscriptInput {
  text: string;
  isFinal: boolean;
  itemId: string;
}

export interface LiveMatch<W extends CanonicalQuranWord = CanonicalQuranWord> {
  current: W | null;
  provisional: W | null;
  revealedWords: Map<string, number>;
  confidence: number;
  stability: number;
  stable: boolean;
  mode: "tracking" | "recovery";
  matcherMs: number;
  diagnostics: MatcherDiagnostics;
  /**
   * عمليات المحاذاة للمقطع الذي التُزم في هذا الحدث فقط (فارغة إن لم يُلتزم شيء).
   * تُستهلك في محرك حالات الكلمات؛ لا تحمل نصاً خاماً خارج كلمات ASR المطبّعة.
   */
  committedOps: AlignmentOp[];
  /**
   * كلمات خلف الموضع الملتزم أُعيدت قراءتها بثقة (تكرار أو تصحيح ذاتي).
   * لا تحرّك الموضع؛ تُستعمل لتحويل خطأ سابق إلى "مصحَّح".
   */
  revisitOps: AlignmentOp[];
  /** فهرس الموضع الملتزم (عدد الكلمات المنجزة) بعد هذا الحدث. */
  committedIndex: number;
  /** فهرس آخر كلمة مؤقتة داخل corpus، أو -1. */
  provisionalIndex: number;
}

export type AlignmentOp =
  /** كلمة قرآنية طابقها المسموع تماماً أو بفارق إملائي صغير. */
  | { kind: "match"; index: number; cost: number; open?: boolean }
  /** كلمة قرآنية قابلها لفظ مختلف. */
  | { kind: "substitution"; index: number; heard: string; cost: number }
  /** كلمة قرآنية لم يُسمع لها مقابل داخل المقطع. */
  | { kind: "skip"; index: number }
  /** لفظ مسموع زائد لا يقابل كلمة قرآنية. */
  | { kind: "extra"; heard: string; afterIndex: number };

export interface MatcherDiagnostics {
  matcherUpdateCount: number;
  matcherMatchCount: number;
  matcherNoMatchCount: number;
  provisionalRevealCount: number;
  committedRevealCount: number;
  provisionalRollbackCount: number;
  trackingModeMatches: number;
  recoveryModeEntries: number;
  recoverySuccesses: number;
  falseForwardJumps: number;
  backtracks: number;
}

export interface QuranLiveMatcherOptions {
  trackingForwardWindow?: number;
  trackingBackwardWindow?: number;
  recoveryMismatchLimit?: number;
  commitStability?: number;
  confidenceThreshold?: number;
  /** يوسّع recovery للأمام ضمن corpus المتحرك في GENERAL فقط. */
  generalPositionFollowing?: boolean;
  /** يتجاوز البسملة المنطوقة إن لم تكن ممثلة كسلسلة كلمات في canonical. */
  ignoreOptionalBasmala?: boolean;
  /**
   * false: الفرضيات الجزئية تحرّك المؤشر المؤقت فقط ولا يُلتزم إلا بحدث نهائي
   * (سياسة تطبيق الجوال). الافتراضي true كما في الويب.
   */
  commitPartials?: boolean;
}

interface Alignment {
  start: number;
  end: number;
  confidence: number;
  ops: AlignmentOp[];
  /** عدد كلمات ASR المستهلكة حتى آخر كلمة قرآنية مطابقة (لا الزائدة بعدها). */
  heardConsumedAt: Map<number, number>;
}

interface ItemState {
  /** كلمات مستهلكة (مُلتزمة) من بداية نص هذا الـ item. */
  consumed: number;
  /** كلمات بسملة اختيارية حُذفت من بداية هذا الـ item. */
  skip: number;
}

const BASMALA_TOKENS = ["بسم", "الله", "الرحمن", "الرحيم"];
/** سقف كلمات الذيل غير الملتزم؛ يمنع نمو كلفة المحاذاة مع طول المقطع. */
const MAX_TAIL_TOKENS = 24;
const INDEL_COST = 0.9;
const COMMIT_CONFIDENCE = 0.86;
const MAX_TRACKED_ITEMS = 32;
/** قفزة أمامية أكبر من هذا تحتاج دليلاً متعدد الكلمات قبل الالتزام (hysteresis). */
const LARGE_JUMP_WORDS = 12;
const LARGE_JUMP_MIN_MATCHES = 3;
/** عدد الكلمات الأحدث المستعملة لاستعادة الموضع حين يفشل الذيل كاملاً. */
const RECENT_SUFFIX_TOKENS = 6;

/** ترقيم مخرجات ASR فقط؛ النص القرآني الكنسي لا يمر من هنا إلا بعد تطبيعه. */
const ASR_PUNCTUATION = /[.,!?;:"'()[\]{}«»<>\-–—…،؛؟٪]/g;

/** ساعة عالية الدقة إن توفرت (متصفح/Node/Hermes)، وإلا Date.now. */
function clockNow() {
  const clock = (globalThis as { performance?: { now(): number } }).performance;
  return clock ? clock.now() : Date.now();
}

function tokens(text: string) {
  return normalizeQuranText(text.replace(ASR_PUNCTUATION, " ")).split(" ").filter(Boolean);
}

function charDistance(a: string, b: string) {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length] / Math.max(a.length, b.length, 1);
}

/**
 * كلفة إبدال لفظ مسموع بكلمة قرآنية. الإبدال يلين فقط للفروق الإملائية
 * القريبة؛ واللفظ الأخير غير النهائي قد يكون جزء كلمة ما زال يتكوّن.
 */
function tokenCost(heard: string, expected: string, cache: Map<string, number>, openPrefix: boolean) {
  if (heard === expected) return 0;
  if (openPrefix && heard.length >= 2 && expected.startsWith(heard)) return 0.1;
  const key = `${heard}\u0000${expected}`;
  let cost = cache.get(key);
  if (cost === undefined) {
    const distance = charDistance(heard, expected);
    cost = distance <= 0.25 ? 0.35 + distance : 1;
    if (cache.size > 4096) cache.clear();
    cache.set(key, cost);
  }
  return cost;
}

/**
 * مطابق التلاوة الحي — محاذاة متسلسلة مقيدة بالنص القرآني الكنسي.
 *
 * التصميم (V2):
 * - كل item من المزود يحمل مؤشراً للكلمات المستهلكة؛ لا يُعاد محاذاة المقطع كله
 *   مع كل delta، بل ذيله غير الملتزم فقط (بحد أقصى MAX_TAIL_TOKENS).
 * - محاذاة semi-global واحدة (DP) للذيل مقابل نافذة سياق حول الموضع الملتزم:
 *   بداية حرة مع عقوبة المسافة عن المرساة، وإبدال/تخطٍ/زيادة بكلف موزونة.
 * - الالتزام بكلمة يحتاج دليلاً زمنياً: ظهورها في فرضيتين متتاليتين، أو حدثاً
 *   نهائياً، أو كلمة مفردة مطابقة تماماً — فلا يثبت موضع من فرضية واحدة ضعيفة.
 */
export class QuranLiveMatcher<W extends CanonicalQuranWord = CanonicalQuranWord> {
  private committed = 0;
  private committedCurrent: W | null = null;
  private provisional: W | null = null;
  private provisionalIndex = -1;
  private stability = 0;
  private lastEvent = "";
  private mode: "tracking" | "recovery" = "tracking";
  private mismatchCount = 0;
  private readonly options: Required<QuranLiveMatcherOptions>;
  private readonly stats: MatcherDiagnostics = {
    matcherUpdateCount: 0,
    matcherMatchCount: 0,
    matcherNoMatchCount: 0,
    provisionalRevealCount: 0,
    committedRevealCount: 0,
    provisionalRollbackCount: 0,
    trackingModeMatches: 0,
    recoveryModeEntries: 0,
    recoverySuccesses: 0,
    falseForwardJumps: 0,
    backtracks: 0,
  };
  private readonly items = new Map<string, ItemState>();
  /** كم فرضية متتالية وضعت كل كلمة قرآنية غير ملتزمة داخل المحاذاة. */
  private readonly seen = new Map<number, number>();
  private readonly known = new Set<string>();
  private readonly revealed = new Map<string, number>();
  private readonly costCache = new Map<string, number>();

  constructor(
    private words: W[],
    options: QuranLiveMatcherOptions = {},
  ) {
    this.options = {
      trackingForwardWindow: options.trackingForwardWindow ?? 16,
      // نافذة خلفية تكفي لرؤية إعادة القارئ لكلمات قبل الخطأ (حلقة التصحيح).
      trackingBackwardWindow: options.trackingBackwardWindow ?? 8,
      recoveryMismatchLimit: options.recoveryMismatchLimit ?? 3,
      commitStability: options.commitStability ?? 2,
      confidenceThreshold: options.confidenceThreshold ?? 0.68,
      generalPositionFollowing: options.generalPositionFollowing ?? false,
      ignoreOptionalBasmala: options.ignoreOptionalBasmala ?? false,
      commitPartials: options.commitPartials ?? true,
    };
    for (const word of words) this.known.add(this.wordKey(word));
  }

  private wordKey(word: CanonicalQuranWord) {
    return `${word.verseKey}:${word.position}:${word.page}`;
  }

  /**
   * يوسّع corpus المطابقة دون إعادة تهيئة المؤشر أو سجل الأحداث.
   * هذا لا يغيّر خوارزمية المحاذاة أو حدودها؛ يضيف فقط كلمات الصفحة التالية
   * بعد أن تصبح جاهزة مسبقاً.
   */
  appendWords(nextWords: W[]) {
    for (const word of nextWords) {
      const key = this.wordKey(word);
      if (!this.known.has(key)) {
        this.words.push(word);
        this.known.add(key);
      }
    }
  }

  /**
   * يضع مؤشر المطابقة عند موضع بداية اختياري داخل الـ corpus الحالي.
   * لا يُعدّ هذا تخطياً أو تقدماً مسموعاً؛ الكلمات السابقة تصبح سياقاً
   * مُنجزاً فقط حتى لا تُجبر القراءة من منتصف الصفحة على المرور من أولها.
   */
  setStartPosition(position: { verseKey: string; wordPosition?: number }): boolean {
    const index = this.words.findIndex((word) =>
      word.verseKey === position.verseKey
      && (position.wordPosition === undefined || word.position >= position.wordPosition),
    );
    if (index < 0) return false;
    this.committed = index;
    this.committedCurrent = index > 0 ? this.words[index - 1] : null;
    this.provisional = null;
    this.provisionalIndex = -1;
    this.stability = 0;
    this.lastEvent = "";
    this.mode = "tracking";
    this.mismatchCount = 0;
    this.seen.clear();
    this.revealed.clear();
    for (let i = 0; i < index; i += 1) this.markRevealed(this.words[i]);
    return true;
  }

  /** حدود corpus الحالي للتشخيص التنموي فقط، بلا كشف للنص المسموع. */
  contextBounds() {
    const first = this.words[0] ?? null;
    const last = this.words.at(-1) ?? null;
    return {
      startVerseKey: first?.verseKey ?? null,
      endVerseKey: last?.verseKey ?? null,
      startPage: first?.page ?? null,
      endPage: last?.page ?? null,
    };
  }

  /** فهرس الموضع الملتزم الحالي (عدد الكلمات المنجزة) داخل corpus. */
  committedIndex() {
    return this.committed;
  }

  wordAt(index: number): W | null {
    return this.words[index] ?? null;
  }

  /** نسخة من خريطة الكشف الحالية (بعد rewind مثلاً). */
  revealedSnapshot(): Map<string, number> {
    return new Map(this.revealed);
  }

  /** فهرس كلمة قرآنية داخل corpus الحالي، أو -1. */
  indexOfWord(verseKey: string, position: number): number {
    return this.words.findIndex((word) => word.verseKey === verseKey && word.position === position);
  }

  /**
   * يعيد الموضع الملتزم إلى كلمة سابقة (وضع "لا تنتقل حتى أصحح").
   * الكلمات من هذا الفهرس فصاعداً تعود غير مكشوفة وتُنتظر من جديد.
   */
  rewindTo(index: number): boolean {
    if (index < 0 || index >= this.committed) return false;
    this.committed = index;
    this.committedCurrent = index > 0 ? this.words[index - 1] : null;
    this.provisional = null;
    this.provisionalIndex = -1;
    this.stability = 0;
    this.seen.clear();
    this.revealed.clear();
    for (let i = 0; i < index; i += 1) this.markRevealed(this.words[i]);
    return true;
  }

  private optionalBasmalaIsAhead() {
    if (!this.options.ignoreOptionalBasmala) return false;
    const anchor = Math.max(0, this.committed - 1);
    const last = Math.min(this.words.length, anchor + this.options.trackingForwardWindow + 5);
    for (let i = anchor; i < last; i += 1) {
      const word = this.words[i];
      if (word.ayah === 1 && word.position === 1 && word.surah !== 1 && word.surah !== 9 && word.normalizedText !== "بسم") {
        return true;
      }
    }
    return false;
  }

  private basmalaPrefixLength(heard: string[]) {
    if (!this.optionalBasmalaIsAhead()) return 0;
    let prefixLength = 0;
    while (
      prefixLength < heard.length
      && prefixLength < BASMALA_TOKENS.length
      && heard[prefixLength] === BASMALA_TOKENS[prefixLength]
    ) {
      prefixLength += 1;
    }
    return prefixLength;
  }

  private searchWindow(heardLength: number): [number, number] {
    const anchor = this.committed;
    const lastIndex = this.words.length - 1;
    const forward = Math.max(this.options.trackingForwardWindow, heardLength + 6);
    if (this.mode !== "recovery") {
      return [Math.max(0, anchor - this.options.trackingBackwardWindow), Math.min(lastIndex, anchor + forward)];
    }
    if (this.options.generalPositionFollowing) {
      // GENERAL لا يربط الاسترداد بالصفحة السابقة: يبحث داخل نافذة context
      // المتحركة الحالية، بما فيها أول كلمات الصفحة/السورة التالية.
      return [Math.max(0, anchor - this.options.trackingBackwardWindow), Math.min(lastIndex, anchor + Math.max(48, forward))];
    }
    const anchorWord = this.words[Math.min(anchor, lastIndex)];
    if (!anchorWord) return [0, lastIndex];
    const near = (word: CanonicalQuranWord) => word.page === anchorWord.page && Math.abs(word.ayah - anchorWord.ayah) <= 2;
    let first = Math.min(anchor, lastIndex);
    let last = first;
    while (first > 0 && near(this.words[first - 1])) first -= 1;
    while (last < lastIndex && near(this.words[last + 1])) last += 1;
    return [first, Math.min(lastIndex, Math.max(last, anchor + forward))];
  }

  /**
   * محاذاة semi-global: كل كلمات الذيل المسموع تُحاذى، والبداية داخل النافذة
   * حرة مع عقوبة المسافة عن المرساة. O(tail × window) بلا حلقات بداية/طول.
   */
  private findAlignment(heard: string[], openLast: boolean): Alignment | null {
    if (!heard.length || !this.words.length) return null;
    const [first, last] = this.searchWindow(heard.length);
    const width = last - first + 1;
    const h = heard.length;
    const cols = width + 1;
    const cost = new Float64Array((h + 1) * cols);
    // 0 = diag, 1 = heard extra (up), 2 = expected skipped (left), 3 = start
    const move = new Uint8Array((h + 1) * cols);
    const startOf = new Int32Array((h + 1) * cols);
    for (let j = 0; j <= width; j += 1) {
      cost[j] = Math.abs(first + j - this.committed) * 0.006;
      move[j] = 3;
      startOf[j] = first + j;
    }
    for (let i = 1; i <= h; i += 1) {
      const row = i * cols;
      const up = (i - 1) * cols;
      cost[row] = cost[up] + INDEL_COST;
      move[row] = 1;
      startOf[row] = startOf[up];
      const openPrefix = openLast && i === h;
      for (let j = 1; j <= width; j += 1) {
        const diag = cost[up + j - 1] + tokenCost(heard[i - 1], this.words[first + j - 1].normalizedText, this.costCache, openPrefix);
        const extra = cost[up + j] + INDEL_COST;
        const skip = cost[row + j - 1] + INDEL_COST;
        let best = diag;
        let bestMove = 0;
        let bestStart = startOf[up + j - 1];
        if (extra < best) { best = extra; bestMove = 1; bestStart = startOf[up + j]; }
        if (skip < best) { best = skip; bestMove = 2; bestStart = startOf[row + j - 1]; }
        cost[row + j] = best;
        move[row + j] = bestMove;
        startOf[row + j] = bestStart;
      }
    }
    const lastRow = h * cols;
    let bestEnd = -1;
    let bestConfidence = -Infinity;
    for (let j = 1; j <= width; j += 1) {
      const start = startOf[lastRow + j];
      const end = first + j;
      const span = Math.max(1, end - start);
      const confidence = 1 - cost[lastRow + j] / Math.max(h, span, 1);
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestEnd = j;
      }
    }
    if (bestEnd < 0) return null;

    const ops: AlignmentOp[] = [];
    const heardConsumedAt = new Map<number, number>();
    let i = h;
    let j = bestEnd;
    while (i > 0) {
      const m = move[i * cols + j];
      if (m === 0) {
        const index = first + j - 1;
        const open = openLast && i === h;
        const c = tokenCost(heard[i - 1], this.words[index].normalizedText, this.costCache, open);
        ops.push(c < 1
          ? { kind: "match", index, cost: c, ...(open ? { open: true } : {}) }
          : { kind: "substitution", index, heard: heard[i - 1], cost: c });
        heardConsumedAt.set(index, i);
        i -= 1;
        j -= 1;
      } else if (m === 1) {
        ops.push({ kind: "extra", heard: heard[i - 1], afterIndex: first + j - 1 });
        i -= 1;
      } else {
        const index = first + j - 1;
        ops.push({ kind: "skip", index });
        heardConsumedAt.set(index, i);
        j -= 1;
      }
    }
    ops.reverse();
    return {
      start: startOf[lastRow + bestEnd],
      end: first + bestEnd,
      confidence: bestConfidence,
      ops,
      heardConsumedAt,
    };
  }

  /**
   * هل يطابق المسموعُ بدايةَ آية المتابعة وبدايةَ آية أخرى أمامنا بالقدر نفسه؟
   * يُفحص فقط حين تبدأ المحاذاة عند الموضع الملتزم وهو أول كلمة في آية.
   */
  private ambiguousAyahStart(alignment: Alignment) {
    const start = this.committed;
    if (alignment.start !== start || this.words[start]?.position !== 1) return false;
    const matched = alignment.ops.filter((op): op is Extract<AlignmentOp, { kind: "match" }> => op.kind === "match" && op.cost === 0);
    if (!matched.length || matched.length !== alignment.ops.length) return false;
    const length = matched.length;
    const last = Math.min(this.words.length - length, start + this.options.trackingForwardWindow + length + 16);
    for (let other = start + 1; other <= last; other += 1) {
      if (this.words[other].position !== 1) continue;
      let same = true;
      for (let k = 0; k < length && same; k += 1) {
        same = this.words[other + k]?.normalizedText === this.words[start + k].normalizedText;
      }
      if (same) return true;
    }
    return false;
  }

  /**
   * إعادة بدء آية أم قفزة للأمام؟ عبارة قصيرة (≤ 4 كلمات) تطابق تماماً بداية آية
   * أمام الموضع الملتزم وتطابق أيضاً بداية آية عنده أو خلفه (مثل «الذي خلق» في
   * الملك 2 و3) لا تُلتزم حتى تميّز كلمة لاحقة الفرع الصحيح — فلا تُسجَّل قفزة وهمية.
   */
  private restartAmbiguity(alignment: Alignment) {
    if (alignment.start <= this.committed) return false;
    const matched: number[] = [];
    for (const op of alignment.ops) {
      if (op.kind === "match" && op.cost === 0 && !op.open) matched.push(op.index);
    }
    if (!matched.length || matched.length > 4) return false;
    for (let k = 1; k < matched.length; k += 1) if (matched[k] !== matched[k - 1] + 1) return false;
    const length = matched.length;
    const first = matched[0];
    // حالة إعادة البدء فقط: الفرعان كلاهما بداية آية. سقوط كلمة داخل آية لا يُمس.
    if (this.words[first]?.position !== 1) return false;
    const from = Math.max(0, this.committed - this.options.trackingBackwardWindow - length);
    for (let other = from; other <= this.committed; other += 1) {
      if (other === first || this.words[other]?.position !== 1) continue;
      let same = true;
      for (let k = 0; k < length && same; k += 1) {
        same = this.words[other + k]?.normalizedText === this.words[first + k].normalizedText;
      }
      if (same) return true;
    }
    return false;
  }

  private markRevealed(word: CanonicalQuranWord) {
    this.revealed.set(word.verseKey, Math.max(this.revealed.get(word.verseKey) ?? 0, word.position));
  }

  private itemState(itemId: string) {
    let state = this.items.get(itemId);
    if (!state) {
      state = { consumed: 0, skip: 0 };
      this.items.set(itemId, state);
      if (this.items.size > MAX_TRACKED_ITEMS) {
        const oldest = this.items.keys().next().value;
        if (oldest !== undefined) this.items.delete(oldest);
      }
    }
    return state;
  }

  feed(event: LiveTranscriptInput): LiveMatch<W> {
    const startedAt = clockNow();
    this.stats.matcherUpdateCount += 1;
    const eventKey = `${event.itemId}:${event.isFinal}:${event.text}`;
    if (eventKey === this.lastEvent) {
      return this.result(0, false, startedAt);
    }
    this.lastEvent = eventKey;

    const all = tokens(event.text);
    const item = this.itemState(event.itemId);
    if (item.consumed === 0 && item.skip === 0) {
      item.skip = this.basmalaPrefixLength(all);
    }
    const body = all.slice(item.skip);
    if (event.isFinal) this.items.delete(event.itemId);
    // ذيل محدود: ما لم يُطابق خلال MAX_TAIL_TOKENS كلمة لا يُعاد فحصه للأبد.
    // دون التزام جزئي لا يُستهلك رأس الـ item قبل نهايته، فلا يُقص.
    if (this.options.commitPartials && body.length - item.consumed > MAX_TAIL_TOKENS) item.consumed = body.length - MAX_TAIL_TOKENS;
    const heard = body.slice(Math.min(item.consumed, body.length));
    if (!heard.length) {
      return this.result(item.skip > 0 ? 1 : 0, false, startedAt);
    }

    let alignment = this.findAlignment(heard, !event.isFinal);
    let heardOffset = 0;
    if (alignment && alignment.confidence < COMMIT_CONFIDENCE && heard.length >= 2) {
      // بداية مترددة/خاطئة ثم متابعة صحيحة: نحاذي بدون أول لفظ أو لفظين، ونُبقي
      // المحذوف كألفاظ زائدة في مقدمة المحاذاة لتُقرن بفجوتها كإبدال.
      for (let trim = 1; trim <= Math.min(2, heard.length - 1); trim += 1) {
        const trimmed = this.findAlignment(heard.slice(trim), !event.isFinal);
        if (!trimmed || trimmed.confidence < COMMIT_CONFIDENCE) continue;
        const lead: AlignmentOp[] = heard.slice(0, trim).map((token) => ({ kind: "extra", heard: token, afterIndex: trimmed.start - 1 }));
        const consumed = new Map<number, number>();
        for (const [index, count] of trimmed.heardConsumedAt) consumed.set(index, count + trim);
        alignment = { ...trimmed, ops: [...lead, ...trimmed.ops], heardConsumedAt: consumed };
        break;
      }
    }
    if ((!alignment || alignment.confidence < this.options.confidenceThreshold) && heard.length > RECENT_SUFFIX_TOKENS) {
      // ذيل طويل يغلب عليه ضجيج/كلام خارجي: نبحث بالكلمات الأحدث وحدها حتى
      // لا يمنع ضجيج قديم استعادة الموضع. الضجيج المُسقط لا يُسجّل كخطأ.
      const suffix = this.findAlignment(heard.slice(-RECENT_SUFFIX_TOKENS), !event.isFinal);
      if (suffix && suffix.confidence >= this.options.confidenceThreshold) {
        alignment = suffix;
        heardOffset = heard.length - RECENT_SUFFIX_TOKENS;
      }
    }
    if (!alignment || alignment.confidence < this.options.confidenceThreshold) {
      this.stats.matcherNoMatchCount += 1;
      this.mismatchCount += 1;
      if (this.provisional) this.stats.provisionalRollbackCount += 1;
      this.provisional = null;
      this.provisionalIndex = -1;
      this.stability = 0;
      if (this.mode === "tracking" && this.mismatchCount >= this.options.recoveryMismatchLimit) {
        this.mode = "recovery";
        this.stats.recoveryModeEntries += 1;
      }
      return this.result(alignment?.confidence ?? 0, false, startedAt);
    }

    const wasRecovery = this.mode === "recovery";
    this.mismatchCount = 0;
    this.mode = "tracking";
    if (wasRecovery) this.stats.recoverySuccesses += 1;
    this.stats.matcherMatchCount += 1;
    this.stats.trackingModeMatches += 1;

    // دليل زمني: كم فرضية وضعت كل كلمة قرآنية في المحاذاة.
    let stableEnd = -1;
    let matchedCount = 0;
    for (const op of alignment.ops) {
      if (op.kind !== "match") continue;
      matchedCount += 1;
      // الكلمة الأخيرة في فرضية مفتوحة قد تكون جزء كلمة؛ لا تُحتسب دليلاً
      // إلا إن طابقت الكلمة القرآنية حرفياً.
      if (op.open && op.cost > 0) continue;
      const count = (this.seen.get(op.index) ?? 0) + 1;
      this.seen.set(op.index, count);
      if (count >= this.options.commitStability) stableEnd = Math.max(stableEnd, op.index + 1);
    }
    if (this.seen.size > 256) {
      for (const index of this.seen.keys()) if (index < this.committed) this.seen.delete(index);
    }
    let stability = 0;
    for (const op of alignment.ops) if (op.kind === "match") stability = Math.max(stability, this.seen.get(op.index) ?? 0);
    this.stability = stability;

    const exactSingle = alignment.confidence >= 0.99 && alignment.end - alignment.start === 1
      && alignment.ops.length === 1 && alignment.ops[0].kind === "match" && alignment.ops[0].cost === 0;
    let commitEnd = -1;
    if (event.isFinal) commitEnd = alignment.end;
    else if (!this.options.commitPartials) commitEnd = -1;
    else if (exactSingle) commitEnd = alignment.end;
    else if (alignment.confidence >= COMMIT_CONFIDENCE && stableEnd > 0) commitEnd = stableEnd;
    if (commitEnd > 0 && !event.isFinal && this.ambiguousAyahStart(alignment)) {
      // آيات متشابهة البداية (مثل «الذي خلق» في الملك 2 و3): لا التزام حتى
      // تميّز كلمة لاحقة الموضع الصحيح، فلا تُعلَّم كلمات في الفرع الخطأ.
      commitEnd = -1;
    }
    if (commitEnd > 0 && this.restartAmbiguity(alignment)) {
      commitEnd = -1;
    }
    const jump = alignment.start - this.committed;
    if (commitEnd > 0 && jump > LARGE_JUMP_WORDS
      && !(alignment.confidence >= COMMIT_CONFIDENCE && matchedCount >= LARGE_JUMP_MIN_MATCHES)) {
      // موضع بعيد من فرضية واحدة ضعيفة لا يحرّك الواجهة؛ يبقى مؤقتاً فقط.
      commitEnd = -1;
      this.stats.falseForwardJumps += 1;
    }
    const stable = commitEnd > 0;

    const previousProvisional = this.provisional;
    // لا مؤشر مؤقت بعيد من لفظ واحد: كلمة شائعة تتكرر أمامنا لا تُحرّك الواجهة.
    const farSingle = matchedCount < 2 && alignment.start > this.committed + 2;
    this.provisional = alignment.end > this.committed && !farSingle ? this.words[alignment.end - 1] ?? null : null;
    this.provisionalIndex = this.provisional ? alignment.end - 1 : -1;
    const committedBefore = this.committed;
    const confident = stable || alignment.confidence >= COMMIT_CONFIDENCE;
    const revisitOps = confident
      ? alignment.ops.filter((op) => op.kind === "match" && !op.open && op.index < committedBefore)
      : [];
    if (this.provisional && this.provisional !== previousProvisional) this.stats.provisionalRevealCount += 1;

    let committedOps: AlignmentOp[] = [];
    if (stable && commitEnd > this.committed) {
      const from = this.committed;
      committedOps = alignment.ops.filter((op) =>
        op.kind === "extra" ? op.afterIndex >= from - 1 && op.afterIndex < commitEnd - 1 : op.index >= from && op.index < commitEnd);
      if (alignment.start - from > 0) {
        // قفزة أمامية: الكلمات بين الموضع الملتزم وبداية المحاذاة لم تُقرأ.
        // ألفاظ زائدة في مقدمة المحاذاة تقابل هذه الفجوة = إبدال لا زيادة+تخطٍّ.
        const gap: AlignmentOp[] = [];
        let lead = 0;
        while (committedOps[lead]?.kind === "extra") lead += 1;
        for (let index = from; index < alignment.start; index += 1) {
          const extra = index - from < lead ? committedOps[index - from] : null;
          if (extra?.kind !== "extra") {
            gap.push({ kind: "skip", index });
            continue;
          }
          // لفظ قريب إملائياً من كلمة الفجوة (مثل ة/ه) مطابقة لا خطأ.
          const cost = tokenCost(extra.heard, this.words[index].normalizedText, this.costCache, false);
          gap.push(cost < 1
            ? { kind: "match", index, cost }
            : { kind: "substitution", index, heard: extra.heard, cost });
        }
        const paired = Math.min(lead, alignment.start - from);
        committedOps = [...gap, ...committedOps.slice(paired)];
      }
      this.stats.committedRevealCount += commitEnd - this.committed;
      for (let index = this.committed; index < commitEnd; index += 1) this.markRevealed(this.words[index]);
      this.committed = commitEnd;
      this.committedCurrent = this.words[this.committed - 1] ?? null;
      if (alignment.end <= this.committed) {
        this.provisional = null;
        this.provisionalIndex = -1;
      }
      if (!event.isFinal) {
        const consumedAt = alignment.heardConsumedAt.get(commitEnd - 1);
        if (consumedAt !== undefined) item.consumed += heardOffset + consumedAt;
      }
      for (const index of this.seen.keys()) if (index < this.committed) this.seen.delete(index);
    } else if (stable && alignment.end < this.committed) {
      this.stats.backtracks += 1;
    }
    return this.result(alignment.confidence, stable, startedAt, committedOps, revisitOps);
  }

  private result(
    confidence: number,
    stable: boolean,
    startedAt: number,
    committedOps: AlignmentOp[] = [],
    revisitOps: AlignmentOp[] = [],
  ): LiveMatch<W> {
    const endedAt = clockNow();
    return {
      current: this.provisional ?? this.committedCurrent,
      provisional: this.provisional,
      revealedWords: new Map(this.revealed),
      confidence,
      stability: this.stability,
      stable,
      mode: this.mode,
      matcherMs: Math.max(0, endedAt - startedAt),
      diagnostics: { ...this.stats },
      committedOps,
      revisitOps,
      committedIndex: this.committed,
      provisionalIndex: this.provisionalIndex,
    };
  }
}
