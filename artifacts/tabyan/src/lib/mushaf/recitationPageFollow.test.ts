import { describe, expect, it } from "vitest";
import { getGeneralRecitationFollowTarget } from "./recitationPageFollow";

describe("GENERAL recitation page following", () => {
  it("follows a stable next-page match without requiring the visible page to be nearly complete", () => {
    expect(getGeneralRecitationFollowTarget(42, 43)).toBe(43);
  });

  it("does not navigate when the stable match is on the current page", () => {
    expect(getGeneralRecitationFollowTarget(42, 42)).toBeNull();
  });

  it("does not skip beyond the next page already appended to the matcher", () => {
    expect(getGeneralRecitationFollowTarget(42, 44)).toBeNull();
  });
});
