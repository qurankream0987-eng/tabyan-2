/**
 * @license
 * Tabyan Smart Mushaf — reader preferences
 * Small per-device conveniences. Storage may be unavailable (private mode,
 * blocked site data), so every access is guarded and defaults always work.
 */

export interface ReaderPreferences {
  readonly darkMode: boolean;
  /** Tint words the reader has already recited. */
  readonly showRecitedWords: boolean;
  /** Keep the recitation line in view automatically. */
  readonly autoFollow: boolean;
}

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = Object.freeze({
  darkMode: false,
  showRecitedWords: true,
  autoFollow: true,
});

const STORAGE_KEY = 'tabyan.smartMushaf.preferences.v1';

export function loadReaderPreferences(): ReaderPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_READER_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<ReaderPreferences>;
    return {
      darkMode: typeof parsed.darkMode === 'boolean' ? parsed.darkMode : DEFAULT_READER_PREFERENCES.darkMode,
      showRecitedWords: typeof parsed.showRecitedWords === 'boolean'
        ? parsed.showRecitedWords
        : DEFAULT_READER_PREFERENCES.showRecitedWords,
      autoFollow: typeof parsed.autoFollow === 'boolean' ? parsed.autoFollow : DEFAULT_READER_PREFERENCES.autoFollow,
    };
  } catch {
    return DEFAULT_READER_PREFERENCES;
  }
}

export function saveReaderPreferences(preferences: ReaderPreferences): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    /* preferences stay in memory for this visit */
  }
}

const LAST_PAGE_KEY = 'tabyan.smartMushaf.lastPage.v1';

export function loadLastPage(): number {
  try {
    const page = Number(window.localStorage.getItem(LAST_PAGE_KEY));
    return Number.isInteger(page) && page >= 1 && page <= 604 ? page : 1;
  } catch {
    return 1;
  }
}

export function saveLastPage(page: number): void {
  try {
    window.localStorage.setItem(LAST_PAGE_KEY, String(page));
  } catch {
    /* not persisted */
  }
}
