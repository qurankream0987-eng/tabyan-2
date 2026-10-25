import { z } from "zod";
import { hasMinimumNameParts, isValidPersonName, normalizePersonName } from "@workspace/tabyan-domain/input-normalization";
import { isNonWhitespacePassword } from "@workspace/tabyan-domain/password-validation";

export const registrationEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("أدخل بريداً إلكترونياً صحيحاً")
  .max(150);

export type StudentRegistrationStep =
  | "name"
  | "birthdate"
  | "phone"
  | "school"
  | "level"
  | "grade"
  | "password"
  | "email";

export type StudentSchoolStage = "primary" | "middle" | "high";

export type StudentRegistrationValues = {
  fullName: string;
  birthDate: string;
  phoneError: string | null;
  inSchool: boolean | null;
  schoolStage: StudentSchoolStage | null;
  schoolGrade: string;
  password: string;
  confirmPassword: string;
  email: string;
};

export type StudentRegistrationField =
  | "fullName"
  | "birthDate"
  | "phone"
  | "inSchool"
  | "schoolStage"
  | "schoolGrade"
  | "password"
  | "confirmPassword"
  | "email";

export type StudentRegistrationError = {
  field: StudentRegistrationField;
  message: string;
};

const NAME_ERROR = "أدخل الاسم الثلاثي، على أن يتكوّن كل جزء من حرفين على الأقل";
const BIRTH_DATE_ERROR = "أدخل تاريخ ميلاد صحيحاً";
const FUTURE_BIRTH_DATE_ERROR = "تاريخ الميلاد لا يمكن أن يكون في المستقبل.";
/** Parse an ISO calendar date and return the age using UTC calendar days. */
export function getStudentRegistrationAge(birthDate: string, now = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() + 1 !== month
    || parsed.getUTCDate() !== day
  ) return null;

  let age = now.getUTCFullYear() - year;
  if (
    now.getUTCMonth() + 1 < month
    || (now.getUTCMonth() + 1 === month && now.getUTCDate() < day)
  ) age--;
  return age;
}

export function validateStudentBirthDate(birthDate: string, now = new Date()): string | null {
  if (!birthDate) return BIRTH_DATE_ERROR;
  const age = getStudentRegistrationAge(birthDate, now);
  if (age === null) return BIRTH_DATE_ERROR;

  const today = [
    String(now.getUTCFullYear()).padStart(4, "0"),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("-");
  if (birthDate > today) return FUTURE_BIRTH_DATE_ERROR;
  if (age < 4 || age > 100) return BIRTH_DATE_ERROR;
  return null;
}

export function validateStudentRegistrationEmail(email: string): string | null {
  if (!email.trim()) return null;
  return registrationEmailSchema.safeParse(email).success
    ? null
    : "أدخل بريداً إلكترونياً صحيحاً";
}

function validateName(fullName: string): string | null {
  const name = normalizePersonName(fullName);
  return isValidPersonName(name) && hasMinimumNameParts(name, 3, 2) ? null : NAME_ERROR;
}

export function validateStudentRegistrationStep(
  step: StudentRegistrationStep,
  values: StudentRegistrationValues,
  now = new Date(),
): StudentRegistrationError | null {
  switch (step) {
    case "name": {
      const message = validateName(values.fullName);
      return message ? { field: "fullName", message } : null;
    }
    case "birthdate": {
      const message = validateStudentBirthDate(values.birthDate, now);
      return message ? { field: "birthDate", message } : null;
    }
    case "phone":
      return values.phoneError ? { field: "phone", message: values.phoneError } : null;
    case "school":
      return values.inSchool === null
        ? { field: "inSchool", message: "الرجاء اختيار وضعك المدرسي" }
        : null;
    case "level":
      return values.schoolStage
        ? null
        : { field: "schoolStage", message: "الرجاء اختيار مرحلتك الدراسية" };
    case "grade":
      return values.schoolGrade.trim() && values.schoolGrade.length <= 20
        ? null
        : { field: "schoolGrade", message: "الرجاء اختيار صفك الدراسي" };
    case "password":
      if (!isNonWhitespacePassword(values.password)) {
        return { field: "password", message: "أدخل كلمة المرور" };
      }
      return values.password === values.confirmPassword
        ? null
        : { field: "confirmPassword", message: "كلمتا السر غير متطابقتين" };
    case "email": {
      const message = validateStudentRegistrationEmail(values.email);
      return message ? { field: "email", message } : null;
    }
  }
}

export function getStudentRegistrationStepDecision(
  step: StudentRegistrationStep,
  values: StudentRegistrationValues,
  now = new Date(),
): { nextStep: StudentRegistrationStep | null; error: StudentRegistrationError | null } {
  const error = validateStudentRegistrationStep(step, values, now);
  if (error) return { nextStep: step, error };

  const nextSteps: Partial<Record<StudentRegistrationStep, StudentRegistrationStep>> = {
    name: "birthdate",
    birthdate: "phone",
    school: values.inSchool ? "level" : "password",
    level: "grade",
    grade: "password",
    password: "email",
  };
  // Phone requires the existing server availability check. Email is the final step.
  return { nextStep: nextSteps[step] ?? null, error: null };
}

export function validateStudentRegistration(
  values: StudentRegistrationValues,
  now = new Date(),
): StudentRegistrationError | null {
  const steps: StudentRegistrationStep[] = [
    "name",
    "birthdate",
    "phone",
    "school",
    ...(values.inSchool ? ["level", "grade"] as StudentRegistrationStep[] : []),
    "password",
    "email",
  ];
  for (const step of steps) {
    const error = validateStudentRegistrationStep(step, values, now);
    if (error) return error;
  }
  return null;
}

export function registrationStepForField(field: StudentRegistrationField): StudentRegistrationStep {
  if (field === "fullName") return "name";
  if (field === "birthDate") return "birthdate";
  if (field === "phone") return "phone";
  if (field === "inSchool") return "school";
  if (field === "schoolStage") return "level";
  if (field === "schoolGrade") return "grade";
  if (field === "password" || field === "confirmPassword") return "password";
  return "email";
}

export function normalizedStudentRegistrationName(value: string): string {
  return normalizePersonName(value);
}

