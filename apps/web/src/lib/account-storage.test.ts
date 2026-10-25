import { describe, expect, it } from "vitest";
import { accountStorageKey, readAccountStorage, writeAccountStorage } from "./account-storage";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("account-scoped local storage", () => {
  it("keeps account A's Mushaf state private while restoring it for A", () => {
    const storage = new MemoryStorage();
    writeAccountStorage("account-a", "tabyan.mushaf.bookmarks", "[4,12]", storage);
    writeAccountStorage("account-b", "tabyan.mushaf.bookmarks", "[9]", storage);

    expect(readAccountStorage("account-b", "tabyan.mushaf.bookmarks", storage)).toBe("[9]");
    expect(readAccountStorage("account-a", "tabyan.mushaf.bookmarks", storage)).toBe("[4,12]");
  });

  it("encodes account identifiers and does not persist anonymous state", () => {
    const storage = new MemoryStorage();
    expect(accountStorageKey("a/b", "mushaf.page")).toContain("a%2Fb");
    writeAccountStorage(null, "mushaf.page", "20", storage);
    expect(readAccountStorage(null, "mushaf.page", storage)).toBeNull();
  });
});
