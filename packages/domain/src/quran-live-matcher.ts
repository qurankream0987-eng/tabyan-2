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
  /**
   * The recognizer's confidence (0..1) in each whitespace-separated word of `text`.
   * Ignored unless it has one value per word.
   */
  wordConfidences?: number[];
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
  | { kind: "match"; index: number; cost: number; open?: boolean; confidence?: number }
  /** كلمة قرآنية قابلها لفظ مختلف. `confidence`: ثقة المتعرّف في اللفظ المسموع إن عُرفت. */
  | { kind: "substitution"; index: number; heard: string; cost: number; confidence?: number }
  /** كلمة قرآنية لم يُسمع لها مقابل داخل المقطع. */
  | { kind: "skip"; index: number }
  /** لفظ مسموع زائد لا يقابل كلمة قرآنية. */
  | { kind: "extra"; heard: string; afterIndex: number; confidence?: number };

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
  /**
   * Whether a heard word is a word of the Quran (anywhere in it). A word heard close to the
   * expected one is taken as a mishearing of it, unless it is itself another Quran word
   * («الظالمين» for «الضالين»): that is a wrong word, however close.
   */
  isQuranWord?: (token: string) => boolean;
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
/**
 * Words matched in a row before the reader is taken to have moved ahead: two are not enough,
 * since a wrong ending often repeats a nearby one (Al-Nisa 16 read «عليما حكيما» for «توابا
 * رحيما», which closes the next ayah). Fewer wait, carried, for the next phrase to place them.
 */
const JUMP_MIN_MATCHES = 3;
/** عدد الكلمات الأحدث المستعملة لاستعادة الموضع حين يفشل الذيل كاملاً. */
const RECENT_SUFFIX_TOKENS = 6;

/** ترقيم مخرجات ASR فقط؛ النص القرآني الكنسي لا يمر من هنا إلا بعد تطبيعه. */
const ASR_PUNCTUATION = /[.,!?;:"'()[\]{}«»<>\-–—…،؛؟٪]/g;

/** ساعة عالية الدقة إن توفرت (متصفح/Node/Hermes)، وإلا Date.now. */
function clockNow() {
  const clock = (globalThis as { performance?: { now(): number } }).performance;
  return clock ? clock.now() : Date.now();
}

/** A doubled alef at a word's start («أأنذرتهم») is the Mushaf's «ءأ», already one alef when normalized. */
const DOUBLE_ALEF = /اا+/g;
function tokens(text: string) {
  return normalizeQuranText(text.replace(ASR_PUNCTUATION, " ")).split(" ").filter(Boolean).map((token) => token.replace(DOUBLE_ALEF, "ا"));
}

/** The confidence of each token of `text`, when the recognizer gave one per word; otherwise nothing. */
function tokenConfidences(text: string, confidences: number[] | undefined, count: number): number[] | undefined {
  if (!confidences) return undefined;
  const raw = text.replace(ASR_PUNCTUATION, " ").split(/\s+/).filter(Boolean);
  if (raw.length !== confidences.length) return undefined;
  const kept: number[] = [];
  raw.forEach((word, index) => { if (normalizeQuranText(word)) kept.push(confidences[index]); });
  return kept.length === count ? kept : undefined;
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

/** Whether every letter of `short` appears in `long`, in order. */
function isSubsequence(short: string, long: string) {
  let k = 0;
  for (let i = 0; i < long.length && k < short.length; i += 1) if (long[i] === short[k]) k += 1;
  return k === short.length;
}

/**
 * Whether `heard` is `expected` with its last vowel drawn out into a letter: a recognizer
 * writes the kasra of «رب» or the pronoun of «به», «له» as «ربي», «بهي», «لهو». A vowel
 * written inside the word is another word («قال» for «قل»).
 */
function isLengthened(heard: string, expected: string) {
  return heard.length === expected.length + 1 && heard.startsWith(expected) && (heard.endsWith("ي") || heard.endsWith("و"));
}

/**
 * Fast recitation reaches the recognizer with letters dropped ("الصاة"), a word
 * cut short ("ينفق"), or letters doubled ("وييقيميمون"). A word heard as its own
 * letters with some missing or repeated is the expected word misheard, not another word.
 */
const MISHEARD_COST = 0.62;
function misheard(heard: string, expected: string) {
  if (expected.startsWith(heard)) return true;
  if (heard.length < expected.length) return heard.length >= 2 && heard.length * 2 >= expected.length && isSubsequence(heard, expected);
  return heard.length * 5 <= expected.length * 8 && isSubsequence(expected, heard);
}

/**
 * Two words run together by fast recitation ("بالغيبيقيمون"): the cost of hearing
 * `first` and `second` as one token, or 1 when the token is not both of them.
 */
function joinedCost(heard: string, first: string, second: string, cache: Map<string, number>) {
  if (heard.length < first.length + 2) return 1;
  const key = `${heard} ${first} ${second}`;
  let cost = cache.get(key);
  if (cost === undefined) {
    const joined = first + second;
    const distance = charDistance(heard, joined);
    cost = distance <= 0.25 ? 0.35 + distance
      : heard.length * 4 >= joined.length * 3 && isSubsequence(heard, joined) ? MISHEARD_COST : 1;
    // Either word alone (a word and noise after it) is not a joined pair.
    if (tokenCost(heard, first, cache, false) < 1 || tokenCost(heard, second, cache, false) < 1) cost = 1;
    if (cache.size > 4096) cache.clear();
    cache.set(key, cost);
  }
  return cost;
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
    cost = distance <= 0.25 ? 0.35 + distance : misheard(heard, expected) ? MISHEARD_COST : 1;
    if (cache.size > 4096) cache.clear();
    cache.set(key, cost);
  }
  return cost;
}

const DAGGER_ALEF = /\u0670/g;
/** A waw carrying a dagger alef («الصلوٰة») is read as an alef, and written so by the recognizer. */
const WAW_DAGGER_ALEF = /\u0648\u0670/g;
/** A hamza written on the line («يسـٔلونك», «فسـٔل») is spelled with an alef by the recognizer. */
const HAMZA_ON_LINE = /\u0640\u0654/g;
/** Words whose everyday spelling adds a letter the Mushaf leaves out. */
const SPECIAL_SPELLINGS: Record<string, string> = { "بسم": "باسم", "ليكة": "الايكة" };
/**
 * The word as the recognizer spells it when the Mushaf's spelling differs: the dagger
 * alef of «ذٰلك» dropped, «الصلوٰة» as «الصلاة», «ءأنذرتهم» with one alef, «يسـٔلونك» as
 * «يسألونك», «بسم» as «باسم», «لـٔيكة» as «الأيكة».
 */
function alternateSpelling(word: CanonicalQuranWord): string | null {
  const special = SPECIAL_SPELLINGS[word.normalizedText];
  if (special) return special;
  const alternate = normalizeQuranText(word.displayText.replace(WAW_DAGGER_ALEF, "ا").replace(DAGGER_ALEF, "").replace(HAMZA_ON_LINE, "\u0623")).replace(DOUBLE_ALEF, "ا");
  return alternate !== word.normalizedText ? alternate : null;
}

/** Whether any of the first `count` heard tokens is matched in `alignment`. */
function leadingMatched(alignment: Alignment, count: number) {
  let heardIndex = 0;
  for (const op of alignment.ops) {
    if (heardIndex >= count) return false;
    if (op.kind === "skip") continue;
    if (op.kind === "match") return true;
    heardIndex += 1;
  }
  return false;
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
  /** Words of the basmala heard so far in items of their own (see basmalaPrefixLength). */
  private basmalaHeard = 0;
  private mode: "tracking" | "recovery" = "tracking";
  private mismatchCount = 0;
  private readonly options: Required<Omit<QuranLiveMatcherOptions, "isQuranWord">>;
  private readonly isAnyQuranWord?: (token: string) => boolean;
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
  /**
   * The dagger alef is a full alef in modern spelling for some words ("العالمين")
   * and silent for others ("ذلك", "على", "وكفى"); the recognizer writes the
   * modern form. Each word is matched against both readings, the cheaper wins.
   */
  private readonly alternates: (string | null)[] = [];
  /** Confidences of the carried tokens, parallel to `carry` (empty when unknown). */
  private carryConfidences: number[] = [];
  /**
   * Final speech since the last commit that matched nothing near the reader (another
   * ayah or surah). If the reader then resumes further on, it stood in for the skipped
   * words, so those are wrong words rather than omissions.
   */
  private unmatchedFinal: string[] = [];
  /** Confidences of `unmatchedFinal`, parallel to it; empty when any of them is unknown. */
  private unmatchedFinalConfidences: number[] = [];
  /**
   * A final phrase that aligned but could not be committed yet (it opens two ayahs
   * alike); it is read again in front of the next phrase, which tells the two apart.
   */
  private carry: string[] = [];

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
    this.isAnyQuranWord = options.isQuranWord;
    for (const word of words) {
      this.known.add(this.wordKey(word));
      this.alternates.push(alternateSpelling(word));
    }
  }

  /** Cost of hearing `heard` for the word at `index`, by either spelling. */
  private wordCost(heard: string, index: number, openPrefix: boolean) {
    const expected = this.words[index].normalizedText;
    const alternate = this.alternates[index];
    let cost = tokenCost(heard, expected, this.costCache, openPrefix);
    if (alternate && cost > 0) cost = Math.min(cost, tokenCost(heard, alternate, this.costCache, openPrefix));
    // Close in spelling but another word of the Quran with a letter changed: read wrong, not
    // misheard. Letters only dropped (a word cut short, «الله» for «والله») or the last vowel
    // drawn out («ربي» for «رب») stay a mishearing.
    const sameWord = (word: string) => isSubsequence(heard, word) || isLengthened(heard, word);
    if (cost > 0 && cost < 1 && !openPrefix && this.isAnyQuranWord?.(heard)
      && !sameWord(expected) && (!alternate || !sameWord(alternate))) return 1;
    return cost;
  }

  /**
   * Whether two heard tokens are the word at `index` written apart: the Mushaf joins the
   * vocative to its noun («يأيها», «يأهل», «يقوم») and a recognizer writes «يا أيها».
   */
  private isSplitWord(firstHeard: string, secondHeard: string, index: number) {
    // «لا انفضوا» for «لانفضوا»: the two alefs that meet at the seam are one in the word.
    const squeeze = (word: string) => word.replace(/ا+/g, "ا");
    const joined = squeeze(`${firstHeard}${secondHeard}`);
    const alternate = this.alternates[index];
    return joined === squeeze(this.words[index].normalizedText) || (!!alternate && joined === squeeze(alternate));
  }

  private pairCost(heard: string, first: number, second: number) {
    const cost = joinedCost(heard, this.words[first].normalizedText, this.words[second].normalizedText, this.costCache);
    const a = this.alternates[first];
    const b = this.alternates[second];
    if (cost === 0 || (!a && !b)) return cost;
    return Math.min(cost, joinedCost(heard, a ?? this.words[first].normalizedText, b ?? this.words[second].normalizedText, this.costCache));
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
        this.alternates.push(alternateSpelling(word));
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
    this.basmalaHeard = 0;
    this.mode = "tracking";
    this.mismatchCount = 0;
    this.unmatchedFinal = [];
    this.unmatchedFinalConfidences = [];
    this.carry = [];
    this.carryConfidences = [];
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

  /**
   * How many leading words of `heard` go on the basmala before a surah, from where the
   * previous items left it: a recognizer that sends one word per item says it over four items.
   */
  private basmalaPrefixLength(heard: string[]) {
    if (!this.optionalBasmalaIsAhead()) return 0;
    const done = this.basmalaHeard;
    let prefixLength = 0;
    while (
      prefixLength < heard.length
      && done + prefixLength < BASMALA_TOKENS.length
      && heard[prefixLength] === BASMALA_TOKENS[done + prefixLength]
    ) {
      prefixLength += 1;
    }
    return prefixLength;
  }

  private searchWindow(heardLength: number, extended = false): [number, number] {
    const anchor = this.committed;
    const lastIndex = this.words.length - 1;
    // Extended: the phrase may start anywhere in the forward window (a skipped ayah), so
    // the window reaches its whole length past that and a long ayah is not cut short.
    const forward = extended
      ? this.options.trackingForwardWindow + heardLength + 6
      : Math.max(this.options.trackingForwardWindow, heardLength + 6);
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
  private findAlignment(heard: string[], openLast: boolean, extended = false, confidences?: number[]): Alignment | null {
    if (!heard.length || !this.words.length) return null;
    const [first, last] = this.searchWindow(heard.length, extended);
    const width = last - first + 1;
    const h = heard.length;
    const cols = width + 1;
    const cost = new Float64Array((h + 1) * cols);
    // 0 = diag, 1 = heard extra (up), 2 = expected skipped (left), 3 = start, 4 = one heard token for two words,
    // 5 = two heard tokens for one word
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
        const diag = cost[up + j - 1] + this.wordCost(heard[i - 1], first + j - 1, openPrefix);
        const extra = cost[up + j] + INDEL_COST;
        const skip = cost[row + j - 1] + INDEL_COST;
        let best = diag;
        let bestMove = 0;
        let bestStart = startOf[up + j - 1];
        if (extra < best) { best = extra; bestMove = 1; bestStart = startOf[up + j]; }
        if (skip < best) { best = skip; bestMove = 2; bestStart = startOf[row + j - 1]; }
        if (j >= 2) {
          const joined = this.pairCost(heard[i - 1], first + j - 2, first + j - 1);
          if (joined < 1 && cost[up + j - 2] + 2 * joined < best) { best = cost[up + j - 2] + 2 * joined; bestMove = 4; bestStart = startOf[up + j - 2]; }
        }
        if (i >= 2 && this.isSplitWord(heard[i - 2], heard[i - 1], first + j - 1) && cost[up - cols + j - 1] < best) {
          best = cost[up - cols + j - 1];
          bestMove = 5;
          bestStart = startOf[up - cols + j - 1];
        }
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
        const c = this.wordCost(heard[i - 1], index, open);
        const confidence = confidences?.[i - 1];
        ops.push(c < 1
          ? { kind: "match", index, cost: c, ...(open ? { open: true } : {}), ...(confidence === undefined ? {} : { confidence }) }
          : { kind: "substitution", index, heard: heard[i - 1], cost: c, ...(confidence === undefined ? {} : { confidence }) });
        heardConsumedAt.set(index, i);
        i -= 1;
        j -= 1;
      } else if (m === 4) {
        const c = this.pairCost(heard[i - 1], first + j - 2, first + j - 1);
        for (const index of [first + j - 1, first + j - 2]) {
          ops.push({ kind: "match", index, cost: c });
          heardConsumedAt.set(index, i);
        }
        i -= 1;
        j -= 2;
      } else if (m === 5) {
        const index = first + j - 1;
        const confidence = confidences ? Math.min(confidences[i - 1], confidences[i - 2]) : undefined;
        ops.push({ kind: "match", index, cost: 0, ...(confidence === undefined ? {} : { confidence }) });
        heardConsumedAt.set(index, i);
        i -= 2;
        j -= 1;
      } else if (m === 1) {
        const confidence = confidences?.[i - 1];
        ops.push({ kind: "extra", heard: heard[i - 1], afterIndex: first + j - 1, ...(confidence === undefined ? {} : { confidence }) });
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

  /**
   * Global alignment of heard tokens with the words [from, to): matches,
   * substitutions, skipped words, and tokens left over as extras.
   */
  private alignGap(heard: string[], from: number, to: number, confidences?: number[]): AlignmentOp[] {
    const n = heard.length;
    const m = to - from;
    if (!n) return Array.from({ length: m }, (_, k): AlignmentOp => ({ kind: "skip", index: from + k }));
    const cols = m + 1;
    const cost = new Float64Array((n + 1) * cols);
    const move = new Uint8Array((n + 1) * cols);
    for (let j = 1; j <= m; j += 1) { cost[j] = j * INDEL_COST; move[j] = 2; }
    for (let i = 1; i <= n; i += 1) {
      cost[i * cols] = i * INDEL_COST;
      move[i * cols] = 1;
      for (let j = 1; j <= m; j += 1) {
        const diag = cost[(i - 1) * cols + j - 1] + this.wordCost(heard[i - 1], from + j - 1, false);
        const extra = cost[(i - 1) * cols + j] + INDEL_COST;
        const skip = cost[i * cols + j - 1] + INDEL_COST;
        let best = diag;
        let bestMove = 0;
        if (extra < best) { best = extra; bestMove = 1; }
        if (skip < best) { best = skip; bestMove = 2; }
        cost[i * cols + j] = best;
        move[i * cols + j] = bestMove;
      }
    }
    const ops: AlignmentOp[] = [];
    let i = n;
    let j = m;
    while (i > 0 || j > 0) {
      const step = move[i * cols + j];
      if (i > 0 && j > 0 && step === 0) {
        const index = from + j - 1;
        const c = this.wordCost(heard[i - 1], index, false);
        const confidence = confidences?.[i - 1];
        ops.push(c < 1
          ? { kind: "match", index, cost: c, ...(confidence === undefined ? {} : { confidence }) }
          : { kind: "substitution", index, heard: heard[i - 1], cost: c, ...(confidence === undefined ? {} : { confidence }) });
        i -= 1;
        j -= 1;
      } else if (i > 0 && (j === 0 || step === 1)) {
        const confidence = confidences?.[i - 1];
        ops.push({ kind: "extra", heard: heard[i - 1], afterIndex: from + j - 1, ...(confidence === undefined ? {} : { confidence }) });
        i -= 1;
      } else {
        ops.push({ kind: "skip", index: from + j - 1 });
        j -= 1;
      }
    }
    return ops.reverse();
  }

  private vocabulary = new Set<string>();
  private vocabularySize = 0;

  /** Whether a heard token is a word of the Quran: of the whole of it when known, else of the loaded pages. */
  private isQuranWord(token: string) {
    if (this.isAnyQuranWord?.(token)) return true;
    if (this.vocabularySize !== this.words.length) {
      for (let index = this.vocabularySize; index < this.words.length; index += 1) {
        this.vocabulary.add(this.words[index].normalizedText);
        const alternate = this.alternates[index];
        if (alternate) this.vocabulary.add(alternate);
      }
      this.vocabularySize = this.words.length;
    }
    return this.vocabulary.has(token);
  }

  /**
   * A final phrase of only one or two words, none of them placed: when they stand in for the
   * next words of the ayah being read, commit them as mistakes («يعلمون» said alone for
   * «يشعرون»). Returns the committed ops, or null when they do not fit there.
   */
  private commitWrongNext(heard: string[], confidences?: number[]): AlignmentOp[] | null {
    const trailing = heard.map((token, k): Extract<AlignmentOp, { kind: "extra" }> => ({
      kind: "extra", heard: token, afterIndex: this.committed - 1, ...(confidences ? { confidence: confidences[k] } : {}),
    }));
    const ops = this.committed > 0 ? this.wrongNextWords(trailing, this.committed) : [];
    if (!ops.length) return null;
    const end = this.committed + ops.length;
    this.stats.committedRevealCount += ops.length;
    for (let index = this.committed; index < end; index += 1) this.markRevealed(this.words[index]);
    this.committed = end;
    this.committedCurrent = this.words[end - 1] ?? null;
    this.provisional = null;
    this.provisionalIndex = -1;
    this.carry = [];
    this.carryConfidences = [];
    this.unmatchedFinal = [];
    this.unmatchedFinalConfidences = [];
    for (const index of this.seen.keys()) if (index < this.committed) this.seen.delete(index);
    return ops;
  }

  /**
   * One or two words heard at the end of a final phrase after its last matched word, when each
   * stands in for the next word of the same ayah: substitutions to commit now. Nothing when a
   * word repeats one just read (a reader repeating himself), fits loosely (a misheard right
   * word), or the next word starts another ayah (speech between ayahs is not a reading).
   */
  private wrongNextWords(trailing: Extract<AlignmentOp, { kind: "extra" }>[], commitEnd: number): AlignmentOp[] {
    if (!trailing.length || trailing.length > 2) return [];
    const end = commitEnd + trailing.length;
    const lastRead = this.words[commitEnd - 1];
    if (!lastRead || end > this.words.length) return [];
    for (let index = commitEnd; index < end; index += 1) if (this.words[index].verseKey !== lastRead.verseKey) return [];
    const recent = new Set(this.words.slice(Math.max(0, commitEnd - 3), commitEnd).map((word) => word.normalizedText));
    if (trailing.some((op) => recent.has(op.heard))) return [];
    // Only recitation counts as a wrong word: a word of the Quran (another ayah's ending), or
    // one close to the word expected. Talk or noise heard there is not a reading of it.
    if (trailing.some((op, k) => !this.isQuranWord(op.heard) && charDistance(op.heard, this.words[commitEnd + k].normalizedText) > 0.5)) return [];
    // The first word of an ayah a little ahead may be the reader moving on (the tail of an
    // ayah skipped, a new surah begun): leave that to the usual alignment.
    const first = trailing[0].heard;
    for (let index = commitEnd; index < Math.min(this.words.length, commitEnd + 40); index += 1) {
      if (this.words[index].position === 1 && (this.words[index].normalizedText === first || this.alternates[index] === first)) return [];
    }
    const ops = this.alignGap(trailing.map((op) => op.heard), commitEnd, end, trailing.every((op) => op.confidence !== undefined) ? trailing.map((op) => op.confidence as number) : undefined);
    return ops.length === trailing.length && ops.every((op) => op.kind === "substitution") ? ops : [];
  }

  /**
   * Index of the last word in the run of exact matches that starts at the
   * committed position (an open last word counts when it is the whole word), or -1.
   */
  private leadingRun(alignment: Alignment): number {
    let expected = this.committed;
    let last = -1;
    for (const op of alignment.ops) {
      if (op.kind !== "extra" && op.index < this.committed) continue;
      if (op.kind !== "match" || op.index !== expected || op.cost !== 0) break;
      last = op.index;
      expected += 1;
    }
    return last;
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

  /**
   * A recognizer that ends an item at every word sends «يا» alone and «أيها» after it, where
   * the Mushaf has one word. The first half waits for the next item, to be placed with it.
   */
  feed(event: LiveTranscriptInput): LiveMatch<W> {
    const raw = event.isFinal ? event.text.trim().split(/\s+/).filter(Boolean) : [];
    const lastTokens = raw.length ? tokens(raw[raw.length - 1]) : [];
    if (lastTokens.length !== 1 || !this.isSplitHead(lastTokens[0], raw.length)) return this.feedEvent(event);
    const confidences = event.wordConfidences?.length === raw.length ? event.wordConfidences : undefined;
    const match = this.feedEvent({ ...event, text: raw.slice(0, -1).join(" "), wordConfidences: confidences?.slice(0, -1) });
    const known = confidences && this.carryConfidences.length === this.carry.length;
    this.carry = [...this.carry, lastTokens[0]];
    this.carryConfidences = known ? [...this.carryConfidences, confidences[confidences.length - 1]] : [];
    return match;
  }

  /** Whether `token`, ending a phrase of `count` words, is the start of a word ahead and not a word itself. */
  private isSplitHead(token: string, count: number) {
    if (token.length < 2) return false;
    const squeeze = (word: string) => word.replace(/ا+/g, "ا");
    const end = Math.min(this.words.length, this.committed + count + 2);
    let head = false;
    for (let index = this.committed; index < end; index += 1) {
      for (const word of [this.words[index].normalizedText, this.alternates[index]]) {
        if (!word) continue;
        if (word === token) return false;
        const whole = squeeze(word);
        if (whole.length >= token.length + 2 && whole.startsWith(token)) head = true;
      }
    }
    return head;
  }

  private feedEvent(event: LiveTranscriptInput): LiveMatch<W> {
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
    if (event.isFinal) {
      this.items.delete(event.itemId);
      // An item that was all basmala leaves the rest of it for the next item; any other word ends it.
      this.basmalaHeard = item.skip > 0 && body.length === 0 ? (this.basmalaHeard + item.skip) % BASMALA_TOKENS.length : 0;
    }
    // ذيل محدود: ما لم يُطابق خلال MAX_TAIL_TOKENS كلمة لا يُعاد فحصه للأبد.
    // دون التزام جزئي لا يُستهلك رأس الـ item قبل نهايته، فلا يُقص.
    if (this.options.commitPartials && body.length - item.consumed > MAX_TAIL_TOKENS) item.consumed = body.length - MAX_TAIL_TOKENS;
    const carried = this.carry.length;
    const heard = [...this.carry, ...body.slice(Math.min(item.consumed, body.length))];
    if (heard.length === carried) {
      return this.result(item.skip > 0 ? 1 : 0, false, startedAt);
    }
    // One confidence per heard token, carried words included; none unless every token has one.
    const bodyConfidences = tokenConfidences(event.text, event.wordConfidences, all.length)?.slice(item.skip + Math.min(item.consumed, body.length));
    const confidences = bodyConfidences && this.carryConfidences.length === carried
      ? [...this.carryConfidences, ...bodyConfidences]
      : undefined;

    let alignment = this.findAlignment(heard, !event.isFinal, false, confidences);
    if (!alignment || alignment.confidence < COMMIT_CONFIDENCE) {
      // The reader may have skipped ahead (or read a later ayah first): search further,
      // but only when the phrase does not fit near the reader, so normal reading is unchanged.
      const far = this.findAlignment(heard, !event.isFinal, true, confidences);
      if (far && far.confidence >= COMMIT_CONFIDENCE && far.confidence > (alignment?.confidence ?? 0) + 0.1) alignment = far;
    }
    let heardOffset = 0;
    if (alignment && alignment.confidence < COMMIT_CONFIDENCE && heard.length >= 2) {
      // بداية مترددة/خاطئة ثم متابعة صحيحة: نحاذي بدون أول لفظ أو لفظين، ونُبقي
      // المحذوف كألفاظ زائدة في مقدمة المحاذاة لتُقرن بفجوتها كإبدال.
      for (let trim = 1; trim <= Math.min(2, heard.length - 1); trim += 1) {
        // Words the full alignment already matched are not a false start.
        if (leadingMatched(alignment, trim)) break;
        const trimmed = this.findAlignment(heard.slice(trim), !event.isFinal, false, confidences?.slice(trim));
        if (!trimmed || trimmed.confidence < COMMIT_CONFIDENCE) continue;
        const lead: AlignmentOp[] = heard.slice(0, trim).map((token, position) => ({
          kind: "extra", heard: token, afterIndex: trimmed.start - 1, ...(confidences ? { confidence: confidences[position] } : {}),
        }));
        const consumed = new Map<number, number>();
        for (const [index, count] of trimmed.heardConsumedAt) consumed.set(index, count + trim);
        alignment = { ...trimmed, ops: [...lead, ...trimmed.ops], heardConsumedAt: consumed };
        break;
      }
    }
    if ((!alignment || alignment.confidence < this.options.confidenceThreshold) && heard.length > RECENT_SUFFIX_TOKENS) {
      // ذيل طويل يغلب عليه ضجيج/كلام خارجي: نبحث بالكلمات الأحدث وحدها حتى
      // لا يمنع ضجيج قديم استعادة الموضع. الضجيج المُسقط لا يُسجّل كخطأ.
      const suffix = this.findAlignment(heard.slice(-RECENT_SUFFIX_TOKENS), !event.isFinal, false, confidences?.slice(-RECENT_SUFFIX_TOKENS));
      if (suffix && suffix.confidence >= this.options.confidenceThreshold) {
        alignment = suffix;
        heardOffset = heard.length - RECENT_SUFFIX_TOKENS;
      }
    }
    if (!alignment || alignment.confidence < this.options.confidenceThreshold) {
      // A partial whose first words are exactly the next words, followed by a token
      // still forming or noise: the pointer may follow the words heard whole.
      const lead = alignment && !event.isFinal ? this.leadingRun(alignment) : -1;
      if (alignment && lead >= 0) {
        this.provisional = this.words[lead];
        this.provisionalIndex = lead;
        this.mismatchCount = 0;
        return this.result(alignment.confidence, false, startedAt);
      }
      if (event.isFinal && carried === 0) {
        const wrong = this.commitWrongNext(heard, confidences);
        if (wrong) return this.result(alignment?.confidence ?? 0, true, startedAt, wrong);
      }
      if (event.isFinal) { this.carry = []; this.carryConfidences = []; }
      if (event.isFinal) {
        const known = confidences && this.unmatchedFinalConfidences.length === this.unmatchedFinal.length;
        this.unmatchedFinal = [...this.unmatchedFinal, ...heard].slice(-MAX_TAIL_TOKENS);
        this.unmatchedFinalConfidences = known ? [...this.unmatchedFinalConfidences, ...confidences].slice(-MAX_TAIL_TOKENS) : [];
      }
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
    // The word at the window's edge may still be forming: it is no evidence for a jump.
    let settledMatches = 0;
    for (const op of alignment.ops) {
      if (op.kind !== "match") continue;
      matchedCount += 1;
      if (!op.open) settledMatches += 1;
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
    if (commitEnd > 0 && jump >= 2 && settledMatches < JUMP_MIN_MATCHES) {
      // One matched word cannot carry the reader forward: a common word ("الله") fits
      // several places ahead, and misheard "والله" would otherwise skip the words between.
      // A final heard alone waits (carry) for the next phrase to place it.
      commitEnd = -1;
      this.stats.falseForwardJumps += 1;
    }
    const stable = commitEnd > 0;
    if (event.isFinal && !stable && carried === 0) {
      const wrong = this.commitWrongNext(heard, confidences);
      if (wrong) return this.result(alignment.confidence, true, startedAt, wrong);
    }
    if (event.isFinal) {
      this.carry = stable ? [] : heard.slice(-MAX_TAIL_TOKENS);
      this.carryConfidences = stable || !confidences ? [] : confidences.slice(-MAX_TAIL_TOKENS);
    }

    const previousProvisional = this.provisional;
    // لا مؤشر مؤقت بعيد من لفظ واحد: كلمة شائعة تتكرر أمامنا لا تُحرّك الواجهة.
    const farSingle = settledMatches < JUMP_MIN_MATCHES && alignment.start > this.committed + 2;
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
        // Speech that matched nothing before this phrase, and words heard in front of
        // it, came where the gap belongs: align them word by word with the gap, so a
        // dropped word does not shift every pairing after it.
        let lead = 0;
        while (committedOps[lead]?.kind === "extra") lead += 1;
        const leadTokens = committedOps.slice(0, lead).map((op) => (op.kind === "extra" ? op.heard : ""));
        const leadConfidences = committedOps.slice(0, lead).map((op) => (op.kind === "extra" ? op.confidence : undefined));
        const gapConfidences = this.unmatchedFinalConfidences.length === this.unmatchedFinal.length && leadConfidences.every((value) => value !== undefined)
          ? [...this.unmatchedFinalConfidences, ...(leadConfidences as number[])]
          : undefined;
        const gap = this.alignGap([...this.unmatchedFinal, ...leadTokens], from, alignment.start, gapConfidences);
        committedOps = [...gap, ...committedOps.slice(lead)];
      }
      this.unmatchedFinal = [];
      this.unmatchedFinalConfidences = [];
      if (event.isFinal) {
        // Words heard after the last matched one (a wrong ending: «عليما حكيما» for «توابا رحيما»)
        // are kept like unmatched speech: if the reader goes on further, they pair with the
        // words they stood in for instead of being lost.
        const trailing = alignment.ops.filter((op): op is Extract<AlignmentOp, { kind: "extra" }> => op.kind === "extra" && op.afterIndex >= commitEnd - 1);
        const wrongNext = this.wrongNextWords(trailing, commitEnd);
        if (wrongNext.length) {
          // The phrase ended on a word or two said in place of the next ones («لا يعلمون» for
          // «لا يشعرون»): mark them now, so the reader sees the mistake before going on.
          committedOps = [...committedOps.filter((op) => !(op.kind === "extra" && op.afterIndex >= commitEnd - 1)), ...wrongNext];
          commitEnd += wrongNext.length;
        } else {
          this.unmatchedFinal = trailing.map((op) => op.heard).slice(-MAX_TAIL_TOKENS);
          this.unmatchedFinalConfidences = trailing.every((op) => op.confidence !== undefined)
            ? trailing.map((op) => op.confidence as number).slice(-MAX_TAIL_TOKENS)
            : [];
        }
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
        if (consumedAt !== undefined) item.consumed += Math.max(0, heardOffset + consumedAt - carried);
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
