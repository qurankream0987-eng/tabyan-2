/** One recognized word with its position in the decoded window, in model frames. */
export interface CtcWord {
  text: string;
  startFrame: number;
  /** Exclusive. */
  endFrame: number;
  /** Mean probability of the word's tokens at the frames where they were emitted, 0..1. */
  confidence: number;
}

/** SentencePiece marks the first piece of every word with U+2581. */
const WORD_START = "\u2581";
/**
 * The model sometimes adds harakat, tatweel and punctuation ("إياك."),
 * inconsistently between windows. Matching works on letters, so they are dropped here.
 */
const MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640.,!?\u060C\u061B\u061F\u06D4]/g;

interface WordInProgress extends CtcWord {
  probabilitySum: number;
  tokens: number;
}

/**
 * Greedy CTC decoding that keeps frame positions, so the streaming provider
 * can tell settled words from ones still being spoken at the window's edge.
 */
export class CtcDecoder {
  private readonly pieces: string[];
  readonly blankId: number;

  constructor(vocab: Record<string, string>) {
    const ids = Object.keys(vocab).map(Number);
    this.pieces = [];
    for (const id of ids) this.pieces[id] = vocab[String(id)];
    const blank = ids.find((id) => vocab[String(id)] === "<blank>");
    this.blankId = blank ?? Math.max(...ids);
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
