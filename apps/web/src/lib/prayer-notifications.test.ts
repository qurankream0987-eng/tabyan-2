import { afterEach, describe, expect, it } from "vitest";
import {
  clearPrayerCoords,
  loadPrayerNotifSettings,
  savePrayerNotifSettings,
} from "./prayer-notifications";
import { accountStorageKey } from "./account-storage";

const values = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); },
};

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { localStorage: localStorageMock },
});

afterEach(() => values.clear());

describe("account-scoped prayer reminders", () => {
  it("keeps reminder settings and saved location separate between accounts", () => {
    const accountA = loadPrayerNotifSettings("student-a");
    savePrayerNotifSettings({ ...accountA, enabled: true }, "student-a");

    expect(loadPrayerNotifSettings("student-a").enabled).toBe(true);
    expect(loadPrayerNotifSettings("student-b").enabled).toBe(false);

    values.set(accountStorageKey("student-a", "tabyan_prayer_coords_v1"), "coords-a");
    values.set(accountStorageKey("student-b", "tabyan_prayer_coords_v1"), "coords-b");
    clearPrayerCoords("student-a");

    expect(values.has(accountStorageKey("student-a", "tabyan_prayer_coords_v1"))).toBe(false);
    expect(values.get(accountStorageKey("student-b", "tabyan_prayer_coords_v1"))).toBe("coords-b");
  });

  it("does not import or remove the legacy device-wide settings", () => {
    const legacyKey = "tabyan_prayer_notif_v1";
    values.set(legacyKey, JSON.stringify({ enabled: true }));

    expect(loadPrayerNotifSettings("student-a").enabled).toBe(false);
    expect(values.has(legacyKey)).toBe(true);
  });
});
