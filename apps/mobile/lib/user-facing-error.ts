export type UserFacingErrorField =
  | "fullName"
  | "birthDate"
  | "phone"
  | "schoolStage"
  | "schoolGrade"
  | "password"
  | "confirmPassword"
  | "email";

export type UserFacingErrorDetails = {
  message: string;
  fieldErrors: Partial<Record<UserFacingErrorField, string>>;
};

const FIELD_MESSAGES: Record<UserFacingErrorField, string> = {
  fullName: "الاسم يجب أن يكون ثلاثياً على الأقل.",
  birthDate: "أدخل تاريخ ميلاد صحيحاً.",
  phone: "رقم الهاتف غير صحيح، يرجى التأكد من الرقم وإعادة المحاولة.",
  schoolStage: "الرجاء اختيار المرحلة الدراسية.",
  schoolGrade: "الرجاء اختيار الصف الدراسي.",
  password: "أدخل كلمة المرور.",
  confirmPassword: "كلمتا السر غير متطابقتين.",
  email: "أدخل بريداً إلكترونياً صحيحاً.",
};

const FIELD_NAMES = new Set<UserFacingErrorField>(
  Object.keys(FIELD_MESSAGES) as UserFacingErrorField[],
);

const TECHNICAL_MARKERS =
  /(?:TRPC|Zod|stack|SQL|query failed|internal server|ECONN|ENOTFOUND|TypeError|ReferenceError|SyntaxError|node_modules|\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+|"(?:code|path|maximum|minimum|inclusive|exact)"\s*:)/i;

type Candidate = { message: string; field?: UserFacingErrorField };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function fieldFromPath(value: unknown): UserFacingErrorField | undefined {
  const first = Array.isArray(value) ? value[0] : undefined;
  return typeof first === "string" && FIELD_NAMES.has(first as UserFacingErrorField)
    ? (first as UserFacingErrorField)
    : undefined;
}

function parseJson(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function collectCandidates(
  value: unknown,
  output: Candidate[],
  inheritedField?: UserFacingErrorField,
  depth = 0,
) {
  if (depth > 6 || value === null || value === undefined) return;

  if (typeof value === "string") {
    const parsed = parseJson(value);
    if (parsed !== undefined) {
      collectCandidates(parsed, output, inheritedField, depth + 1);
      return;
    }
    output.push({ message: value, field: inheritedField });
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectCandidates(item, output, inheritedField, depth + 1);
    return;
  }

  const record = asRecord(value);
  if (!record) return;
  const field = fieldFromPath(record.path) ?? inheritedField;

  if (typeof record.message === "string") {
    collectCandidates(record.message, output, field, depth + 1);
  }

  for (const key of ["issues", "errors", "zodError", "fieldErrors", "formErrors", "data", "shape", "cause"]) {
    if (key in record) collectCandidates(record[key], output, field, depth + 1);
  }

  for (const [key, nested] of Object.entries(record)) {
    if (FIELD_NAMES.has(key as UserFacingErrorField)) {
      collectCandidates(nested, output, key as UserFacingErrorField, depth + 1);
    }
  }
}

function safeHumanMessage(value: string): string | null {
  const message = value.replace(/\s+/g, " ").trim();
  if (!message || message.length > 220) return null;
  if (TECHNICAL_MARKERS.test(message)) return null;
  if (!/[\u0600-\u06ff]/.test(message)) return null;
  return message;
}

function rawMessage(error: unknown): string {
  if (typeof error === "string") return error;
  const record = asRecord(error);
  return typeof record?.message === "string" ? record.message : "";
}

function isNetworkFailure(error: unknown): boolean {
  return /network request failed|failed to fetch|fetch failed|network error|timed? ?out|offline/i.test(
    rawMessage(error),
  );
}

export function userFacingErrorDetails(
  error: unknown,
  fallback = "حدث خطأ مؤقت. حاول مرة أخرى.",
): UserFacingErrorDetails {
  const candidates: Candidate[] = [];
  collectCandidates(error, candidates);

  const fieldErrors: Partial<Record<UserFacingErrorField, string>> = {};
  let firstMessage: string | null = null;

  for (const candidate of candidates) {
    const human = safeHumanMessage(candidate.message);
    if (!human) continue;
    firstMessage ??= human;
    if (candidate.field && !fieldErrors[candidate.field]) {
      fieldErrors[candidate.field] = human;
    }
  }

  if (firstMessage) return { message: firstMessage, fieldErrors };

  const firstField = candidates.find((candidate) => candidate.field)?.field;
  if (firstField) {
    return {
      message: FIELD_MESSAGES[firstField],
      fieldErrors: { [firstField]: FIELD_MESSAGES[firstField] },
    };
  }

  if (isNetworkFailure(error)) {
    return {
      message: "تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.",
      fieldErrors,
    };
  }

  return { message: fallback, fieldErrors };
}

export function userFacingErrorMessage(error: unknown, fallback?: string): string {
  return userFacingErrorDetails(error, fallback).message;
}