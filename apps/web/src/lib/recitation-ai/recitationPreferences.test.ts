import { afterEach, describe, expect, it } from "vitest";
import { loadRecitationAiOptions, saveRecitationAiOptions } from "./recitationPreferences";

const values = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
};

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { localStorage: localStorageMock },
});

afterEach(() => values.clear());

describe("account-scoped recitation preferences", () => {
  it("restores AI and memorization options only for their account", () => {
    saveRecitationAiOptions({ strict: true, hideVerses: true }, "student-a");
    saveRecitationAiOptions({ strict: false, tashkeel: true }, "student-b");

    expect(loadRecitationAiOptions("student-a")).toMatchObject({
      strict: true,
      hideVerses: true,
      tashkeel: false,
    });
    expect(loadRecitationAiOptions("student-b")).toMatchObject({
      strict: false,
      tashkeel: true,
      hideVerses: false,
    });
  });
});
