/** One recognized word with its position in the decoded window, in model frames. */
export interface CtcWord {
  text: string;
  startFrame: number;
  /** Exclusive. */
  endFrame: number;
  /** Mean probability of the word's tokens at the frames where they were emitted, 0..1. */
  confidence: number;
  /**
   * Set for a word that is not one of the expected words: the log-likelihood of the audio
   * under this word less that under the best-fitting expected word, over the same frames.
   * Large when the reciter clearly said something else; near zero or negative when the
   * expected word fits about as well and the difference is the recognizer's doubt.
   */
  margin?: number;
}

/** SentencePiece marks the first piece of every word with U+2581. */
const WORD_START = "▁";
/**
 * The model sometimes adds harakat, tatweel and punctuation ("إياك."),
 * inconsistently between windows. Matching works on letters, so they are dropped here.
 */
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ.,!?،؛؟۔]/g;

interface WordInProgress extends CtcWord {
  probabilitySum: number;
  tokens: number;
}

interface TrieNode {
  children: Map<string, TrieNode>;
  terminal: boolean;
}

/** Letters the lexicon is keyed on: hamza seats and alef maqsura vary in the model's spelling. */
function foldLetter(letter: string): string {
  if (letter === "أ" || letter === "إ" || letter === "آ" || letter === "ٱ") return "ا";
  if (letter === "ى") return "ي";
  return letter;
}

/**
 * The words the decoder may spell: a prefix trie over the Quran's vocabulary.
 * A hypothesis extends a word only along the trie, so a smeared or clipped
 * word is decoded as the nearest Quran word it sounds like instead of a
 * spelling no reciter can have said.
 */
export class Lexicon {
  private readonly root: TrieNode = { children: new Map(), terminal: false };
  readonly size: number;

  constructor(words: Iterable<string>) {
    let size = 0;
    for (const word of words) {
      let node = this.root;
      for (const letter of word) {
        const folded = foldLetter(letter);
        let next = node.children.get(folded);
        if (!next) {
          next = { children: new Map(), terminal: false };
          node.children.set(folded, next);
        }
        node = next;
      }
      if (node !== this.root && !node.terminal) {
        node.terminal = true;
        size += 1;
      }
    }
    this.size = size;
  }

  /** The node reached by `letters` from `from` (the root when omitted), or null when no word starts so. */
  advance(letters: string, from: TrieNode | null = this.root): TrieNode | null {
    let node = from;
    for (const letter of letters) {
      node = node?.children.get(foldLetter(letter)) ?? null;
      if (!node) return null;
    }
    return node;
  }

  isWord(word: string): boolean {
    return this.advance(word)?.terminal ?? false;
  }
}

export interface ConstrainedDecodeOptions {
  lexicon: Lexicon;
  /** Hypotheses kept per frame. */
  beam?: number;
  /** Non-blank pieces tried per frame, among those within `pieceMargin` nats of the best. */
  topK?: number;
  pieceMargin?: number;
  /**
   * Log-probability cost of a word that leaves the lexicon (a word no Quran
   * word starts with, or ended while incomplete). Below it the recognizer's
   * own spelling wins, so a reciter who says something else is still heard
   * saying it; above it the nearest Quran spelling wins.
   */
  freeWordPenalty?: number;
  /**
   * Folded spellings of the words expected next, while the reader is being
   * followed. A Quran word that is not one of them, and not a prefix of one,
   * pays `offPathPenalty`. Absent means open search: anywhere, or tracking lost.
   */
  preferred?: ReadonlySet<string>;
  /**
   * Cost of a finished spelling that leaves every expected word. Below the
   * acoustic gap of a clearly different word, so a real mistake is still heard.
   */
  offPathPenalty?: number;
}

/** The spelling the lexicon and the preferred set share. */
export function foldWord(text: string): string {
  let folded = "";
  for (const letter of text) folded += foldLetter(letter);
  return folded.replace(/ة/g, "ه");
}

/** Expected words, folded, for `ConstrainedDecodeOptions.preferred`. */
export function preferredWordSet(words: readonly string[]): Set<string> {
  const set = new Set<string>();
  for (const word of words) {
    const folded = foldWord(word);
    if (folded) set.add(folded);
  }
  return set;
}

function onPreferredPath(text: string, preferred: ReadonlySet<string>): boolean {
  if (preferred.has(text)) return true;
  for (const word of preferred) if (word.startsWith(text)) return true;
  return false;
}

interface Hypothesis {
  /** Collapsed piece sequence, the identity of a CTC prefix. */
  key: string;
  last: number;
  /** Log probability of the prefix with the paths ending in blank / in its last piece. */
  blank: number;
  nonBlank: number;
  words: WordInProgress[];
  /** Trie node of the word being spelled; null once the word has left the lexicon. */
  node: TrieNode | null;
  penalty: number;
  /** Cost of the word being spelled when it is not an expected word. Replaced, not accumulated. */
  pathCost: number;
}

const NEG_INF = -Infinity;
/** Frames around a word within which an expected word is fitted in its place. */
const MARGIN_FRAMES = 3;
const MAX_MARGIN = 99;

function logAdd(a: number, b: number): number {
  if (a === NEG_INF) return b;
  if (b === NEG_INF) return a;
  const max = a > b ? a : b;
  return max + Math.log1p(Math.exp(-Math.abs(a - b)));
}

function finishWords(words: WordInProgress[]): CtcWord[] {
  return words.filter((word) => word.text).map(({ probabilitySum, tokens, ...word }) => ({
    ...word,
    confidence: probabilitySum / tokens,
  }));
}

/**
 * CTC decoding that keeps frame positions, so the streaming provider can tell
 * settled words from ones still being spoken at the window's edge. `decode`
 * is greedy; `decodeConstrained` is a prefix beam search over the lexicon.
 */
export class CtcDecoder {
  private readonly pieces: string[];
  readonly blankId: number;
  /** Pieces by the first folded letter they spell: those that start a word, and those inside one. */
  private readonly startPieces = new Map<string, { id: number; text: string }[]>();
  private readonly innerPieces = new Map<string, { id: number; text: string }[]>();

  constructor(vocab: Record<string, string>) {
    const ids = Object.keys(vocab).map(Number);
    this.pieces = [];
    for (const id of ids) this.pieces[id] = vocab[String(id)];
    const blank = ids.find((id) => vocab[String(id)] === "<blank>");
    this.blankId = blank ?? Math.max(...ids);
    for (const id of ids) {
      const raw = this.pieces[id]?.replace(MARKS, "") ?? "";
      const text = foldWord(raw.replace(WORD_START, ""));
      if (!text || raw === "<unk>" || id === this.blankId) continue;
      const index = raw.startsWith(WORD_START) ? this.startPieces : this.innerPieces;
      const list = index.get(text[0]);
      if (list) list.push({ id, text });
      else index.set(text[0], [{ id, text }]);
    }
  }

  /**
   * Log-probability of the best CTC path that spells `word` (folded) as one word over frames
   * [from, to), by any split into the model pieces. -Infinity when no split fits the frames.
   */
  wordScore(logprobs: Float32Array, vocabSize: number, from: number, to: number, word: string): number {
    const length = word.length;
    if (!length || to <= from) return NEG_INF;
    let score = new Float64Array(length + 1).fill(NEG_INF);
    let last = new Int32Array(length + 1).fill(-1);
    score[0] = 0;
    for (let t = from; t < to; t++) {
      const offset = t * vocabSize;
      const blank = logprobs[offset + this.blankId];
      const next = new Float64Array(length + 1).fill(NEG_INF);
      const nextLast = new Int32Array(length + 1).fill(-1);
      for (let position = 0; position <= length; position++) {
        const here = score[position];
        if (here === NEG_INF) continue;
        // Stay: a blank, or the last piece held for another frame.
        const held = last[position] >= 0 ? Math.max(blank, logprobs[offset + last[position]]) : blank;
        if (here + held > next[position]) {
          next[position] = here + held;
          nextLast[position] = last[position];
        }
        if (position === length) continue;
        for (const piece of (position === 0 ? this.startPieces : this.innerPieces).get(word[position]) ?? []) {
          if (!word.startsWith(piece.text, position)) continue;
          const end = position + piece.text.length;
          const value = here + logprobs[offset + piece.id];
          if (value > next[end]) {
            next[end] = value;
            nextLast[end] = piece.id;
          }
        }
      }
      score = next;
      last = nextLast;
    }
    return score[length];
  }

  /**
   * Sets `margin` on every word that is not an expected one: its fit to the audio against
   * the best-fitting expected word, over the frames of the word and a little around them.
   */
  scoreAgainstExpected(logprobs: Float32Array, timeSteps: number, vocabSize: number, words: CtcWord[], preferred: ReadonlySet<string>) {
    for (const [index, word] of words.entries()) {
      const heard = foldWord(word.text);
      if (!heard || preferred.has(heard)) continue;
      // Up to the neighbouring words: the expected word may be longer than what was heard.
      const from = Math.max(index > 0 ? words[index - 1].endFrame : 0, word.startFrame - MARGIN_FRAMES);
      const to = Math.min(index + 1 < words.length ? words[index + 1].startFrame : timeSteps, word.endFrame + MARGIN_FRAMES);
      const own = this.wordScore(logprobs, vocabSize, from, to, heard);
      let best = NEG_INF;
      for (const expected of preferred) best = Math.max(best, this.wordScore(logprobs, vocabSize, from, to, expected));
      word.margin = own === NEG_INF ? 0 : best === NEG_INF ? MAX_MARGIN : Math.min(MAX_MARGIN, own - best);
    }
  }

  /** `logprobs` is [timeSteps x vocabSize] log-softmax output. */
  decode(logprobs: Float32Array, timeSteps: number, vocabSize: number): CtcWord[] {
    const words: CtcWord[] = [];
    let current: WordInProgress | null = null;
    let previous = -1;
    const finish = () => {
      if (current?.text) {
        const { probabilitySum, tokens, ...word } = current;
        words.push({ ...word, confidence: probabilitySum / tokens });
      }
    };
    for (let t = 0; t < timeSteps; t++) {
      const offset = t * vocabSize;
      const id = argmax(logprobs, offset, vocabSize);
      if (id === previous) {
        if (current && id !== this.blankId) current.endFrame = t + 1;
        continue;
      }
      previous = id;
      if (id === this.blankId) continue;
      const piece = this.pieces[id]?.replace(MARKS, "");
      if (!piece || piece === "<unk>") continue;
      const probability = Math.exp(logprobs[offset + id]);
      if (piece.startsWith(WORD_START) || !current) {
        finish();
        current = {
          text: piece.replace(WORD_START, ""), startFrame: t, endFrame: t + 1,
          confidence: 0, probabilitySum: probability, tokens: 1,
        };
      } else {
        current.text += piece;
        current.endFrame = t + 1;
        current.probabilitySum += probability;
        current.tokens += 1;
      }
    }
    finish();
    return words;
  }

  /**
   * Prefix beam search in which a word may only grow along the lexicon trie.
   * A piece that takes the word off every Quran spelling, or a new word that
   * starts while the current one is incomplete, is still allowed but costs
   * `freeWordPenalty` once per word. The last word of the window is never
   * judged incomplete: it may still be being spoken at the edge.
   */
  decodeConstrained(logprobs: Float32Array, timeSteps: number, vocabSize: number, options: ConstrainedDecodeOptions): CtcWord[] {
    const { lexicon } = options;
    const beamWidth = options.beam ?? 8;
    const topK = options.topK ?? 12;
    const pieceMargin = options.pieceMargin ?? 10;
    const penalty = options.freeWordPenalty ?? 5;
    const preferred = options.preferred ?? null;
    const offPathPenalty = options.offPathPenalty ?? 3;
    const blankId = this.blankId;
    let beam: Hypothesis[] = [{ key: "", last: -1, blank: 0, nonBlank: NEG_INF, words: [], node: null, penalty: 0, pathCost: 0 }];
    const candidates: number[] = [];

    for (let t = 0; t < timeSteps; t++) {
      const offset = t * vocabSize;
      const blankLogProb = logprobs[offset + blankId];
      const bestLogProb = Math.max(blankLogProb, logprobs[offset + argmax(logprobs, offset, vocabSize)]);
      candidates.length = 0;
      for (let id = 0; id < vocabSize; id++) {
        if (id !== blankId && logprobs[offset + id] >= bestLogProb - pieceMargin) candidates.push(id);
      }
      if (candidates.length > topK) {
        candidates.sort((a, b) => logprobs[offset + b] - logprobs[offset + a]);
        candidates.length = topK;
      }

      const next = new Map<string, Hypothesis>();
      const merge = (hypothesis: Hypothesis) => {
        const existing = next.get(hypothesis.key);
        if (!existing) {
          next.set(hypothesis.key, hypothesis);
          return;
        }
        // Same prefix by two paths: the likelier path's word timings stand.
        if (logAdd(hypothesis.blank, hypothesis.nonBlank) > logAdd(existing.blank, existing.nonBlank)) existing.words = hypothesis.words;
        existing.blank = logAdd(existing.blank, hypothesis.blank);
        existing.nonBlank = logAdd(existing.nonBlank, hypothesis.nonBlank);
      };

      for (const hypothesis of beam) {
        const total = logAdd(hypothesis.blank, hypothesis.nonBlank);
        // Blank, or the last piece repeated: the prefix is unchanged.
        let repeated = NEG_INF;
        if (hypothesis.last >= 0 && logprobs[offset + hypothesis.last] >= bestLogProb - pieceMargin) {
          repeated = hypothesis.nonBlank + logprobs[offset + hypothesis.last];
        }
        let words = hypothesis.words;
        // The word spans the frames where its last piece beats blank, as in greedy decoding.
        if (repeated !== NEG_INF && logprobs[offset + hypothesis.last] > blankLogProb
          && words.length && words[words.length - 1].endFrame < t + 1) {
          words = words.slice();
          words[words.length - 1] = { ...words[words.length - 1], endFrame: t + 1 };
        }
        merge({ ...hypothesis, words, blank: total + blankLogProb, nonBlank: repeated });

        for (const id of candidates) {
          const logProb = logprobs[offset + id];
          // The same piece again only extends the prefix after a blank.
          const from = id === hypothesis.last ? hypothesis.blank : total;
          if (from === NEG_INF) continue;
          merge(this.extend(hypothesis, id, t, from + logProb, logProb, lexicon, penalty, preferred, offPathPenalty));
        }
      }

      beam = [...next.values()];
      if (beam.length > beamWidth) {
        beam.sort((a, b) => score(b) - score(a));
        beam.length = beamWidth;
      }
    }

    let best = beam[0];
    for (const hypothesis of beam) if (score(hypothesis) > score(best)) best = hypothesis;
    return finishWords(best.words);
  }

  private extend(
    hypothesis: Hypothesis, id: number, t: number, logProb: number, pieceLogProb: number,
    lexicon: Lexicon, penalty: number, preferred: ReadonlySet<string> | null, offPathPenalty: number,
  ): Hypothesis {
    const key = `${hypothesis.key},${id}`;
    const raw = this.pieces[id]?.replace(MARKS, "") ?? "";
    if (!raw || raw === "<unk>") {
      return { ...hypothesis, key, last: id, blank: NEG_INF, nonBlank: logProb };
    }
    const probability = Math.exp(pieceLogProb);
    const words = hypothesis.words.slice();
    const current = words[words.length - 1];
    let node = hypothesis.node;
    let extraPenalty = 0;
    let pathCost = hypothesis.pathCost;
    if (raw.startsWith(WORD_START) || !current) {
      // A new word: the one before it must be a whole Quran word.
      if (current && node && !node.terminal) extraPenalty += penalty;
      const text = raw.replace(WORD_START, "");
      node = lexicon.advance(text);
      if (!node && text) extraPenalty += penalty;
      words.push({ text, startFrame: t, endFrame: t + 1, confidence: 0, probabilitySum: probability, tokens: 1 });
    } else {
      if (node) {
        node = lexicon.advance(raw, node);
        if (!node) extraPenalty += penalty;
      }
      words[words.length - 1] = {
        ...current, text: current.text + raw, endFrame: t + 1,
        probabilitySum: current.probabilitySum + probability, tokens: current.tokens + 1,
      };
    }
    if (preferred) {
      const text = foldWord(words[words.length - 1]?.text ?? "");
      // A prefix of an expected word is still that word being spoken. Anything else pays once,
      // and the cost drops again if the word grows back onto an expected spelling.
      pathCost = text && !onPreferredPath(text, preferred) ? offPathPenalty : 0;
    }
    return {
      key, last: id, blank: NEG_INF, nonBlank: logProb, words, node,
      penalty: hypothesis.penalty + extraPenalty, pathCost,
    };
  }
}

function score(hypothesis: Hypothesis): number {
  return logAdd(hypothesis.blank, hypothesis.nonBlank) - hypothesis.penalty - hypothesis.pathCost;
}

function argmax(values: Float32Array, offset: number, length: number): number {
  let best = 0;
  let bestValue = values[offset];
  for (let i = 1; i < length; i++) {
    const value = values[offset + i];
    if (value > bestValue) {
      bestValue = value;
      best = i;
    }
  }
  return best;
}
