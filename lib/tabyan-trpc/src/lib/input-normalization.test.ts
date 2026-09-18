import { describe, expect, it } from "vitest";
import {
  isValidPersonName,
  isValidUsername,
  normalizeDigits,
  normalizePersonName,
  normalizePhoneInput,
  normalizeUsername,
} from "./input-normalization";

describe("input normalization", () => {
  it("maps Arabic-Indic and Persian digits without changing other text", () => {
    expect(normalizeDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
    expect(normalizeDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
    expect(normalizeDigits("هاتف ٠٥٠-۱۲۳")).toBe("هاتف 050-123");
  });

  it("normalizes international phone separators and 00 prefix", () => {
    expect(normalizePhoneInput("٠٠٩٦٥ ٥٥٥٥-٥٥٥٥")).toBe("+96555555555");
    expect(normalizePhoneInput("+٩٦٥ (٥٥٥٥) ٥٥٥٥")).toBe("+96555555555");
  });

  it("accepts Arabic multi-part names and rejects non-names", () => {
    expect(normalizePersonName("  جاسم   محمد رفيق غالية ")).toBe("جاسم محمد رفيق غالية");
    for (const name of [
      "جاسم محمد رفيق غالية",
      "حسن عبد الله العجمي",
      "عبد الرحمن",
      "محمد أحمد",
      "يحيى",
      "مصطفى",
      "هدى",
      "فاطمة الزهراء",
      "Ahmad محمد",
    ]) {
      expect(isValidPersonName(name)).toBe(true);
    }
    for (const invalidName of ["", "   ", "١٢٣٤٥", "!!!", "أحمد\u0000محمد"]) {
      expect(isValidPersonName(invalidName)).toBe(false);
    }
  });

  it("accepts Arabic/English usernames and preserves Arabic/Persian digits", () => {
    for (const username of ["علي", "محمد", "محمد_العجمي", "عبدالرحمن", "معلم1", "مشرف_٢", "ali", "ali_123", "teacher.demo"]) {
      expect(isValidUsername(username)).toBe(true);
    }
    expect(normalizeUsername("  ALI_123  ")).toBe("ali_123");
    expect(normalizeUsername(" معلم_١ ")).toBe("معلم_١");
    expect(isValidUsername("معلم١")).toBe(true);
  });

  it("rejects whitespace, controls, unsupported symbols, and empty usernames", () => {
    for (const username of ["", "   ", "علي محمد", "علي@", "علي/", "علي\u0000"]) {
      expect(isValidUsername(username)).toBe(false);
    }
  });
});