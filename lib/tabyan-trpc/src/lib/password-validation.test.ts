import { describe, expect, it } from "vitest";
import { isNonWhitespacePassword } from "./password-validation";
import { masterPasswordSchema, passwordSchema } from "../routers/auth";

describe("password policy", () => {
  it("accepts one non-whitespace character in every supported script", () => {
    for (const password of ["1", "ا", "١", "A", "@", "محمد", "كلمة مرور", "١٢٣٤"]) {
      expect(isNonWhitespacePassword(password)).toBe(true);
    }
  });

  it("rejects empty and whitespace-only passwords", () => {
    for (const password of ["", " ", "     ", "\t\n"]) {
      expect(isNonWhitespacePassword(password)).toBe(false);
    }
  });

  it("does not normalize or mutate password values", () => {
    const password = "  ١  ";
    expect(isNonWhitespacePassword(password)).toBe(true);
    expect(password).toBe("  ١  ");
  });

  it("applies the same one-character policy at the server schema boundary", () => {
    for (const password of ["1", "١", "ا", "A", "@", "a".repeat(101)]) {
      expect(passwordSchema.safeParse(password).success).toBe(true);
    }
    for (const password of ["", " ", "     "]) {
      expect(passwordSchema.safeParse(password).success).toBe(false);
    }
  });

  it("keeps the master-password length cap unchanged", () => {
    expect(masterPasswordSchema.safeParse("١").success).toBe(true);
    expect(masterPasswordSchema.safeParse("a".repeat(101)).success).toBe(false);
  });
});
