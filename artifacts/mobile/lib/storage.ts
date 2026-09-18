import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "tabyan.native.token";
const ROLE_KEY = "tabyan.native.role";
const NAME_KEY = "tabyan.native.name";
const THEME_KEY = "tabyan.native.theme";
const LAST_PAGE_KEY = "tabyan.mushaf.lastPage";
const BOOKMARKS_KEY = "tabyan.mushaf.bookmarks";

const secure = Platform.OS !== "web";
const sessionInvalidationListeners = new Set<() => void>();

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
  async setTheme(value: "light" | "dark") { return set(THEME_KEY, value); },
  async getLastPage() { return get(LAST_PAGE_KEY); },
  async setLastPage(page: number) { return set(LAST_PAGE_KEY, String(page)); },
  async getBookmarks(): Promise<number[]> {
    try {
      const raw = await get(BOOKMARKS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((value) => Number.isInteger(value)) : [];
    } catch {
      return [];
    }
  },
  async setBookmarks(pages: number[]) { return set(BOOKMARKS_KEY, JSON.stringify(pages)); },
};
