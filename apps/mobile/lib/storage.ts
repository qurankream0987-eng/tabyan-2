import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "tabyan.native.token";
const ROLE_KEY = "tabyan.native.role";
const NAME_KEY = "tabyan.native.name";
const THEME_KEY = "tabyan.native.theme";
/** Web `tabyan.mushaf.recitationInteractionSounds`: short UI tones during live recitation. */
const RECITATION_CUES_KEY = "tabyan.native.recitationCues";
const secure = Platform.OS !== "web";
const sessionInvalidationListeners = new Set<() => void>();
// Cached so the cue player can check it synchronously on every tone; loaded once.
let recitationCuesEnabled: boolean | null = null;
let recitationCuesLoad: Promise<boolean> | null = null;

async function get(key: string) {
  return secure ? SecureStore.getItemAsync(key) : AsyncStorage.getItem(key);
}

async function set(key: string, value: string) {
  if (secure) return SecureStore.setItemAsync(key, value);
  return AsyncStorage.setItem(key, value);
}

async function remove(key: string) {
  if (secure) return SecureStore.deleteItemAsync(key);
  return AsyncStorage.removeItem(key);
}

export const storage = {
  async getToken() { return get(TOKEN_KEY); },
  async getRole() { return get(ROLE_KEY); },
  async getName() { return get(NAME_KEY); },
  async setSession(token: string, role: string, name?: string) {
    await Promise.all([
      set(TOKEN_KEY, token),
      set(ROLE_KEY, role),
      name ? set(NAME_KEY, name) : remove(NAME_KEY),
    ]);
  },
  async clearSession() {
    await Promise.all([remove(TOKEN_KEY), remove(ROLE_KEY), remove(NAME_KEY)]);
  },
  async invalidateSession() {
    await Promise.all([remove(TOKEN_KEY), remove(ROLE_KEY), remove(NAME_KEY)]);
    for (const listener of sessionInvalidationListeners) listener();
  },
  onSessionInvalidated(listener: () => void) {
    sessionInvalidationListeners.add(listener);
    return () => { sessionInvalidationListeners.delete(listener); };
  },
  async getTheme() { return get(THEME_KEY); },
  async setTheme(value: "system" | "light" | "dark") { return set(THEME_KEY, value); },
  /** Recitation cue tones; on by default, like the web. Not a secret, so plain AsyncStorage. */
  async getRecitationCuesEnabled() {
    if (recitationCuesEnabled !== null) return recitationCuesEnabled;
    recitationCuesLoad ??= AsyncStorage.getItem(RECITATION_CUES_KEY)
      .then((value) => value !== "false", () => true)
      .then((value) => { recitationCuesEnabled = value; return value; });
    return recitationCuesLoad;
  },
  /** Last loaded value without waiting; `true` until the first read completes. */
  recitationCuesEnabledSync() { return recitationCuesEnabled ?? true; },
  async setRecitationCuesEnabled(value: boolean) {
    recitationCuesEnabled = value;
    try { await AsyncStorage.setItem(RECITATION_CUES_KEY, String(value)); } catch { /* Optional preference. */ }
  },
};

// ── Mushaf reading state: plain AsyncStorage, like the web's localStorage ──
const MUSHAF_LAST_PAGE_KEY = "tabyan.mushaf.lastPage";
const MUSHAF_BOOKMARKS_KEY = "tabyan.mushaf.bookmarks";
const MUSHAF_PAGES = 604;

const validPage = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 1 && (value as number) <= MUSHAF_PAGES;

export const mushafStorage = {
  /** The page the reader was last on, or null when the Mushaf was never opened. */
  async getLastPage(): Promise<number | null> {
    const raw = await AsyncStorage.getItem(MUSHAF_LAST_PAGE_KEY).catch(() => null);
    const page = Number(raw);
    return raw && validPage(page) ? page : null;
  },
  async setLastPage(page: number) {
    if (validPage(page)) await AsyncStorage.setItem(MUSHAF_LAST_PAGE_KEY, String(page)).catch(() => undefined);
  },
  /** Bookmarked page numbers, ascending. */
  async getBookmarks(): Promise<number[]> {
    try {
      const parsed: unknown = JSON.parse((await AsyncStorage.getItem(MUSHAF_BOOKMARKS_KEY)) ?? "[]");
      return Array.isArray(parsed) ? parsed.filter(validPage).sort((a, b) => a - b) : [];
    } catch { return []; }
  },
  async setBookmarks(pages: number[]) {
    await AsyncStorage.setItem(MUSHAF_BOOKMARKS_KEY, JSON.stringify(pages)).catch(() => undefined);
  },
  /** Adds or removes a page and returns the new list. */
  async toggleBookmark(page: number) {
    const current = await mushafStorage.getBookmarks();
    const next = current.includes(page) ? current.filter((p) => p !== page) : [...current, page].sort((a, b) => a - b);
    await mushafStorage.setBookmarks(next);
    return next;
  },
};
