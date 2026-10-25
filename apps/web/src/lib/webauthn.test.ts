import { afterEach, describe, expect, it } from "vitest";
import { hasBiometricSession } from "./webauthn";

const values = new Map<string, string>();
const localStorageMock = {
  get length() { return values.size; },
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); },
  key: (index: number) => [...values.keys()][index] ?? null,
};

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: localStorageMock,
});

afterEach(() => values.clear());

describe("account-bound biometric enrollment indicator", () => {
  it("does not treat one account's enrollment as another account's", () => {
    localStorageMock.setItem("tabyan_bio_enabled.account-a", "1");

    expect(hasBiometricSession("account-a")).toBe(true);
    expect(hasBiometricSession("account-b")).toBe(false);
    expect(hasBiometricSession()).toBe(true);
  });

  it("keeps the legacy device indicator generic instead of assigning it to an account", () => {
    localStorageMock.setItem("tabyan_bio_enabled", "1");

    expect(hasBiometricSession("account-a")).toBe(false);
    expect(hasBiometricSession()).toBe(true);
  });
});
