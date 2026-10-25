export type WordKey = {
  surah: number;
  ayah: number;
  wordIndex: number;
};

export type SmartWordStatus =
  | "hidden"
  | "current"
  | "confirmed"
  | "incorrect"
  | "skipped"
  | "repeated";

export type ObservationStatus =
  | "current"
  | "confirmed"
  | "incorrect"
  | "skipped"
  | "repeated"
  | "unknown";

export type ProviderObservation = {
  status: ObservationStatus;
  wordKey?: WordKey;
  stabilized?: boolean;
  provider: string;
};

export type SmartMushafState = {
  words: Readonly<Record<string, SmartWordStatus>>;
  currentWordKey: string | null;
  notice: "unknown-position" | null;
};

export function wordKeyId(key: WordKey): string {
  return `${key.surah}:${key.ayah}:${key.wordIndex}`;
}

export function createSmartMushafState(): SmartMushafState {
  return { words: {}, currentWordKey: null, notice: null };
}

/** Provider claims are accepted only for a real canonical word and stable outcomes. */
export function applyProviderObservation(
  state: SmartMushafState,
  observation: ProviderObservation,
  validWordKeys: ReadonlySet<string>,
): SmartMushafState {
  if (observation.status === "unknown" || !observation.wordKey) {
    return { ...state, notice: "unknown-position" };
  }

  const key = wordKeyId(observation.wordKey);
  if (!validWordKeys.has(key)) {
    return { ...state, notice: "unknown-position" };
  }

  if (observation.status !== "current" && observation.stabilized !== true) {
    return { ...state, notice: null };
  }

  const nextWords = { ...state.words };
  if (state.currentWordKey && state.currentWordKey !== key) {
    if (nextWords[state.currentWordKey] === "current") {
      nextWords[state.currentWordKey] = "hidden";
    }
  }
  nextWords[key] = observation.status;
  return {
    words: nextWords,
    currentWordKey: observation.status === "current" ? key : null,
    notice: null,
  };
}

export function statusForWord(
  state: SmartMushafState,
  key: WordKey,
): SmartWordStatus {
  return state.words[wordKeyId(key)] ?? "hidden";
}
