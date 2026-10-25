import { describe, expect, it } from "vitest";
import { normalizeNationalPhoneInput, toE164 } from "./countries";

describe("national phone input normalization", () => {
  it("keeps Kuwait local input local", () => {
    expect(normalizeNationalPhoneInput("965", "50545678")).toBe("50545678");
  });

  it("removes a pasted Kuwait calling code, including Arabic digits", () => {
    expect(normalizeNationalPhoneInput("965", "+96550545678")).toBe("50545678");
    expect(normalizeNationalPhoneInput("965", "٩٦٥٥٠٥٤٥٦٧٨")).toBe("50545678");
    expect(normalizeNationalPhoneInput("965", "+٩٦٥٥٠٥٤٥٦٧٨")).toBe("50545678");
  });

  it("removes repeated calling codes before submission", () => {
    expect(toE164("965", "+965+96550545678")).toBe("+96550545678");
    expect(toE164("965", "96596550545678")).toBe("+96550545678");
    expect(toE164("965", "50545678")).toBe("+96550545678");
  });
});