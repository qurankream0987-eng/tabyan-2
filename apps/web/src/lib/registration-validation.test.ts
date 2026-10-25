import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getStudentRegistrationAge,
  getStudentRegistrationStepDecision,
  registrationEmailSchema,
  validateStudentBirthDate,
  validateStudentRegistration,
  validateStudentRegistrationEmail,
  validateStudentRegistrationStep,
  type StudentRegistrationValues,
} from "@workspace/tabyan-trpc/registration-validation";
import { normalizePhoneInput } from "@workspace/tabyan-domain/input-normalization";
import { isNonWhitespacePassword } from "@workspace/tabyan-domain/password-validation";
import { normalizeNationalPhoneInput, toE164, validatePhoneNumber } from "@workspace/tabyan-domain/countries";

const now = new Date("2026-05-20T23:55:00.000Z");

const validValues: StudentRegistrationValues = {
  fullName: "محمد أحمد علي",
  birthDate: "2000-01-01",
  phoneError: null,
  inSchool: false,
  schoolStage: null,
  schoolGrade: "",
  password: "١",
  confirmPassword: "١",
  email: "",
};

describe("shared student registration validation", () => {
  it("allows the minimum-age boundary and valid past calendar dates, but not a same-day birthdate", () => {
    expect(getStudentRegistrationAge("2022-05-20", now)).toBe(4);
    expect(validateStudentBirthDate("2022-05-20", now)).toBeNull();
    expect(validateStudentBirthDate("2000-01-01", now)).toBeNull();
    expect(validateStudentBirthDate("2026-05-20", now)).toBe("أدخل تاريخ ميلاد صحيحاً");
  });

  it("blocks tomorrow and future years with the Arabic future-date message", () => {
    expect(validateStudentBirthDate("2026-05-21", now)).toBe("تاريخ الميلاد لا يمكن أن يكون في المستقبل.");
    expect(validateStudentBirthDate("2030-01-01", now)).toBe("تاريخ الميلاد لا يمكن أن يكون في المستقبل.");
  });

  it("uses a consistent UTC calendar day across device timezone offsets", () => {
    const deviceTime = new Date("2026-05-20T23:55:00-03:00");
    expect(validateStudentBirthDate("2022-05-21", deviceTime)).toBeNull();
    expect(validateStudentBirthDate("2026-05-21", deviceTime)).toBe("أدخل تاريخ ميلاد صحيحاً");
    expect(validateStudentBirthDate("2026-05-22", deviceTime)).toBe("تاريخ الميلاد لا يمكن أن يكون في المستقبل.");
  });

  it("rejects missing, malformed, and impossible dates", () => {
    for (const value of ["", "2026/05/20", "26-05-20", "2026-2-01", "2026-02-30", "2025-13-01"]) {
      expect(validateStudentBirthDate(value, now)).toBe("أدخل تاريخ ميلاد صحيحاً");
    }
  });

  it("uses the same optional email format and maximum length as the server schema", () => {
    expect(registrationEmailSchema.safeParse(" valid@example.com ").success).toBe(true);
    expect(validateStudentRegistrationEmail("")).toBeNull();
    expect(validateStudentRegistrationEmail("abc")).toBe("أدخل بريداً إلكترونياً صحيحاً");
    for (const email of ["abc", "user@", "@test.com"]) {
      expect(validateStudentRegistrationEmail(email)).not.toBeNull();
    }
    expect(validateStudentRegistrationEmail(`${"a".repeat(142)}@test.com`)).not.toBeNull();
  });

  it("uses the existing worldwide phone normalization and country-specific UI rules", () => {
    const normalized = normalizePhoneInput("00965 5000-0000");
    expect(normalized).toBe("+96550000000");
    const national = normalizeNationalPhoneInput("965", normalized);
    expect(national).toBe("50000000");
    expect(validatePhoneNumber("965", national)).toBeNull();
    expect(toE164("965", national)).toBe(normalized);
    expect(validatePhoneNumber("965", "5000000")).not.toBeNull();
    expect(validatePhoneNumber("965", "50A00000")).not.toBeNull();
  });

  it("applies the current server password and full-name requirements", () => {
    expect(isNonWhitespacePassword("١")).toBe(true);
    expect(isNonWhitespacePassword(" \t ")).toBe(false);
    expect(validateStudentRegistrationStep("password", { ...validValues, password: " " }, now)?.field).toBe("password");
    expect(validateStudentRegistrationStep("password", { ...validValues, confirmPassword: "different" }, now)?.field).toBe("confirmPassword");
    expect(validateStudentRegistrationStep("name", { ...validValues, fullName: "   " }, now)?.field).toBe("fullName");
    expect(validateStudentRegistrationStep("name", { ...validValues, fullName: "محمد أحمد علي" }, now)).toBeNull();
  });

  it("keeps an invalid step on itself and advances only after its validation passes", () => {
    expect(getStudentRegistrationStepDecision("birthdate", { ...validValues, birthDate: "2030-01-01" }, now)).toEqual({
      nextStep: "birthdate",
      error: { field: "birthDate", message: "تاريخ الميلاد لا يمكن أن يكون في المستقبل." },
    });
    expect(getStudentRegistrationStepDecision("name", validValues, now)).toEqual({
      nextStep: "birthdate",
      error: null,
    });
    expect(getStudentRegistrationStepDecision("password", { ...validValues, password: " " }, now).nextStep).toBe("password");
  });

  it("revalidates the complete form and returns the offending field before submit", () => {
    expect(validateStudentRegistration(validValues, now)).toBeNull();
    expect(validateStudentRegistration({ ...validValues, email: "abc" }, now)).toEqual({
      field: "email",
      message: "أدخل بريداً إلكترونياً صحيحاً",
    });
    expect(validateStudentRegistration({ ...validValues, phoneError: "رقم الهاتف غير صحيح" }, now)?.field).toBe("phone");
  });

  it("routes both Web and Native keyboard actions through the same validated step handler", () => {
    const web = readFileSync(new URL("../components/app/StudentRegisterFlow.tsx", import.meta.url), "utf8");
    const native = readFileSync(new URL("../../../mobile/app/(auth)/register.tsx", import.meta.url), "utf8");
    expect(web).toMatch(/getStudentRegistrationStepDecision\(step, registrationValues\)/);
    expect(web).toMatch(/onKeyDown=\{\(e\) => e\.key === "Enter" && goNext\(\)\}/);
    expect(web).toMatch(/onEnter=\{goNext\}/);
    expect(native).toMatch(/getStudentRegistrationStepDecision\(step, registrationValues\)/);
    expect(native).toMatch(/onSubmitEditing=\{\(\) => void next\(\)\}/);
  });

  it("keeps complete-form validation ahead of account creation on both clients", () => {
    const web = readFileSync(new URL("../components/app/StudentRegisterFlow.tsx", import.meta.url), "utf8");
    const native = readFileSync(new URL("../../../mobile/app/(auth)/register.tsx", import.meta.url), "utf8");
    expect(web).toMatch(/const validationError = validateStudentRegistration\(registrationValues\);[\s\S]*?if \(validationError\) \{[\s\S]*?return;[\s\S]*?completeProfile\.mutateAsync/);
    expect(native).toMatch(/const validationError = validateStudentRegistration\(registrationValues\);[\s\S]*?if \(validationError\) \{[\s\S]*?return;[\s\S]*?completeProfile\.mutateAsync/);
  });
});
