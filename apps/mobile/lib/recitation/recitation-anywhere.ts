import { queryTokens, searchQuran, type QuranSearchIndex } from "@workspace/tabyan-domain/quran-search";
import type { NativeQuranLiveMatcher, NativeRecitationMatch } from "./native-recitation-matcher";

/** Where a reading that started anywhere in the Quran is: its first word. */
export interface RecitationLocation {
  verseKey: string;
  surah: number;
  ayah: number;
  /** 1-based position in the ayah of the first word heard. */
  position: number;
  page: number;
}

/** Fewer words fit too many places; more than this, older words are likely noise or another place. */
const MIN_WORDS = 3;
const MAX_WORDS = 10;
const MIN_SCORE = 0.8;
/** The best place must beat the next one by this much, or the words are said in several places. */
const LEAD = 0.1;

/**
 * The one place in the Quran these heard words are read from, or null while they fit several
 * places (or none). The longest run of recent words that points to one place wins.
 */
export function locateRecitation(index: QuranSearchIndex, heard: string, open: boolean): RecitationLocation | null {
  const tokens = withoutOpenings(queryTokens(heard));
  for (let count = Math.min(tokens.length, MAX_WORDS); count >= MIN_WORDS; count -= 1) {
    const query = tokens.slice(-count).join(" ");
    const results = searchQuran(index, query, { limit: 3, openLast: open, minScore: MIN_SCORE - LEAD });
    const [best, next] = results;
    if (!best || best.score < MIN_SCORE) continue;
    if (next && next.score > best.score - LEAD) return null;
    const [surah, ayah] = best.verseKey.split(":").map(Number);
    return { verseKey: best.verseKey, surah, ayah, position: best.startPosition, page: best.page };
  }
  return null;
}

/**
 * The isti'adha and the basmala said before reading are not where the reader is: «من الشيطان
 * الرجيم» alone would place him in An-Nahl 98, «بسم الله الرحمن الرحيم» at any surah's start.
 */
function withoutOpenings(tokens: string[]) {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i] === "اعوذ") {
      // «أعوذ بالله [السميع العليم] من الشيطان الرجيم», or as much of it as was said so far.
      const end = tokens.indexOf("الرجيم", i);
      if (end !== -1 && end - i <= 8) { i = end; continue; }
      if (end === -1 && tokens.length - i <= 8) break;
    }
    if (tokens[i] === "بسم" && tokens[i + 1] === "الله") {
      const said = ["بسم", "الله", "الرحمن", "الرحيم"].findIndex((word, k) => tokens[i + k] !== word);
      i += (said === -1 ? 4 : said) - 1;
      continue;
    }
    out.push(tokens[i]);
  }
  return out;
}

type FeedArgs = [text: string, itemId: string, isFinal: boolean, wordConfidences?: number[]];

/** Finals kept while a place is looked for, replayed to its matcher once it is found. */
const MAX_BUFFER = 12;
/** Finals in a row the matcher could not place before the reader is looked for elsewhere. */
const LOST_FINALS = 2;

/**
 * The recognizer's transcripts for a reading that may start, or move, anywhere: until a place is
 * known they are searched in the whole Quran; then a matcher for that place takes them (the
 * words that found it included). Reading far from it for a while looks for the place again.
 */
export class AnywhereRecitationMatcher {
  private matcher: NativeQuranLiveMatcher | null = null;
  /** A place was found and its matcher is being prepared. */
  private pending = false;
  private buffer: FeedArgs[] = [];
  private recent: string[] = [];
  private lost = 0;
  private relocations = 0;
  private lastResult: NativeRecitationMatch = emptyMatch();

  constructor(
    private readonly index: QuranSearchIndex,
    private readonly onLocated: (location: RecitationLocation) => void,
  ) {}

  /** Takes the matcher for the place last located (its start already set) and replays what led there. */
  attach(matcher: NativeQuranLiveMatcher): NativeRecitationMatch {
    this.matcher = matcher;
    this.pending = false;
    this.lost = 0;
    this.recent = [];
    const replay = this.buffer;
    this.buffer = [];
    for (const args of replay) this.lastResult = matcher.feed(...args);
    return this.lastResult;
  }

  feed(...args: FeedArgs): NativeRecitationMatch {
    const [text, , isFinal] = args;
    if (this.matcher) {
      const result = this.matcher.feed(...args);
      this.lastResult = result;
      if (!isFinal) return result;
      // Speech the matcher cannot place, again and again, is the reader somewhere else.
      if (result.diagnostics.unmatched) {
        this.lost += 1;
        this.recent = [...this.recent, text].slice(-3);
        if (this.lost >= LOST_FINALS) {
          const location = locateRecitation(this.index, this.recent.join(" "), false);
          if (location) {
            this.relocations += 1;
            this.buffer = this.recent.map((phrase, k): FeedArgs => [phrase, `moved-${this.relocations}-${k}`, true]);
            this.found(location);
            return this.lastResult;
          }
        }
      } else {
        this.lost = 0;
        this.recent = [];
      }
      return result;
    }
    if (isFinal) {
      this.buffer = [...this.buffer, args].slice(-MAX_BUFFER);
      this.recent = [...this.recent, text].slice(-4);
    }
    if (this.pending) return this.lastResult;
    // A partial may already name the place; its words reach the matcher once final.
    const heard = isFinal ? this.recent.join(" ") : [...this.recent, text].join(" ");
    const location = locateRecitation(this.index, heard, !isFinal);
    if (location) this.found(location);
    return this.lastResult;
  }

  private found(location: RecitationLocation) {
    this.matcher = null;
    // Nothing of the old place is shown while the new one is prepared.
    this.lastResult = emptyMatch();
    this.pending = true;
    this.lost = 0;
    this.onLocated(location);
  }
}

function emptyMatch(): NativeRecitationMatch {
  return {
    current: null,
    reading: null,
    readingWords: 0,
    revealedWords: new Map(),
    confirmedWordKeys: new Set(),
    wordFeedback: new Map(),
    changedWordStates: [],
    confidence: 0,
    stable: false,
    progressionWords: 0,
    totalWords: 0,
    diagnostics: { mode: "tracking", repeatedPosition: false, skippedRegionWords: 0, unmatchedTokenCount: 0, unmatched: false },
  };
}
