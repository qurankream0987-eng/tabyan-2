import { afterEach, describe, expect, it } from "vitest";
import {
  beginAccountTransition,
  getAccountGeneration,
  isCurrentAccountGeneration,
  onAccountTransition,
} from "../lib/account-transition";

describe("account transitions", () => {
  afterEach(() => {
    // Clear test listeners even when an assertion fails.
    beginAccountTransition();
  });

  it("invalidates work captured under the previous account and notifies active operations", () => {
    const previousGeneration = getAccountGeneration();
    let cancelled = false;
    const unsubscribe = onAccountTransition(() => { cancelled = true; });

    beginAccountTransition();

    expect(cancelled).toBe(true);
    expect(isCurrentAccountGeneration(previousGeneration)).toBe(false);
    expect(isCurrentAccountGeneration(getAccountGeneration())).toBe(true);
    unsubscribe();
  });
});
