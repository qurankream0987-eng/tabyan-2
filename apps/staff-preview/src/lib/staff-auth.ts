import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@workspace/tabyan-trpc";
import { normalizePhoneInput } from "@workspace/tabyan-domain/input-normalization";
import superjson from "superjson";

type StaffRole = "teacher" | "admin";
type IssuedSession = { token: string; role: string; name?: string };

const TOKEN_KEY = "tabyan_token";
const ROLE_KEY = "tabyan_role";
const NAME_KEY = "tabyan_name";
const TECHNICAL_ERROR_MARKERS = [
  "TRPC", "Zod", "SQL", "stack", "Error:", "undefined", "null",
  "constraint", "relation", "column", "clerk", "oidc", "oauth", "bcrypt", "JSON",
];

let authInFlight = false;
let authRevision = 0;

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === TOKEN_KEY) authRevision += 1;
  });
}

function createClient(token?: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
        // The shared proxy routes /api to the existing API service.
        url: "/api/trpc",
        transformer: superjson,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
      }),
    ],
  });
}

const api = createClient();

async function authenticate(
  operation: () => Promise<IssuedSession>,
  expectedRole: StaffRole,
  destination: string,
) {
  if (authInFlight) throw new Error("جارٍ تنفيذ محاولة أخرى — انتظر قليلاً");

  authInFlight = true;
  const attemptRevision = ++authRevision;
  try {
    const result = await operation();
    if (!result.token) throw new Error("تعذّر تأكيد الجلسة — حاول مرة أخرى");
    const identity = await createClient(result.token).auth.me.query();
    if (!identity.id || identity.role !== result.role || identity.role !== expectedRole) {
      throw new Error(expectedRole === "admin"
        ? "هذا الحساب ليس حساب مشرف"
        : "هذا الحساب ليس حساب معلم — ادخل من بوابة الإشراف");
    }
    if (attemptRevision !== authRevision) {
      throw new Error("أُلغيت محاولة الدخول — حاول مرة أخرى");
    }

    try {
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(ROLE_KEY, identity.role);
      localStorage.setItem(NAME_KEY, identity.fullName || result.name || "");
      localStorage.setItem("tabyan.splashSeen", "1");
      localStorage.setItem("tabyan.knownAccount", "1");
    } catch {
      try {
        if (localStorage.getItem(TOKEN_KEY) === result.token) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(ROLE_KEY);
          localStorage.removeItem(NAME_KEY);
        }
      } catch {
        // Preserve the localized storage error below; browsers can reject cleanup too.
      }
      throw new Error("تعذّر حفظ الجلسة على هذا الجهاز. فعّل التخزين ثم حاول مرة أخرى.");
    }
    return destination;
  } finally {
    authInFlight = false;
  }
}

export async function checkTeacherPhone(phone: string) {
  return api.auth.checkPhone.mutate({ phone });
}

export function validateTeacherPhone(dialInput: string, phoneInput: string) {
  const dial = normalizePhoneInput(dialInput).replace(/\D/g, "");
  const compact = normalizePhoneInput(phoneInput);
  let national = compact.replace(/\D/g, "");

  if (!/^\d{1,4}$/.test(dial)) {
    return { value: null, error: "أدخل رمز الدولة من رقم إلى أربعة أرقام." };
  }

  const rules: Record<string, { min: number; max: number }> = {
    "965": { min: 8, max: 8 }, "966": { min: 9, max: 10 }, "973": { min: 8, max: 8 },
    "974": { min: 8, max: 8 }, "971": { min: 9, max: 9 }, "968": { min: 8, max: 8 },
    "962": { min: 9, max: 9 }, "970": { min: 9, max: 9 }, "961": { min: 7, max: 8 },
    "963": { min: 9, max: 9 }, "964": { min: 10, max: 10 }, "967": { min: 9, max: 9 },
    "20": { min: 10, max: 10 }, "249": { min: 9, max: 9 }, "218": { min: 9, max: 9 },
    "216": { min: 8, max: 8 }, "213": { min: 9, max: 9 }, "212": { min: 9, max: 9 },
    "90": { min: 10, max: 10 }, "92": { min: 10, max: 10 },
  };

  const rule = rules[dial];
  const max = rule?.max ?? Math.min(14, 15 - dial.length);
  if (compact.startsWith("+")) {
    if (!national.startsWith(dial)) {
      return { value: null, error: "رقم الهاتف الدولي لا يطابق رمز الدولة المحدد." };
    }
    national = national.slice(dial.length);
  } else if (national.startsWith(dial) && national.length > max) {
    national = national.slice(dial.length);
  }

  const min = rule?.min ?? 4;
  if (national.length < min || national.length > max) {
    return {
      value: null,
      error: rule
        ? `رقم الهاتف غير صحيح، يجب أن يتكون من ${rule.min === rule.max ? rule.min : `${rule.min} إلى ${rule.max}`} أرقام.`
        : "رقم الهاتف غير صحيح، تأكد من عدد الأرقام ورمز الدولة.",
    };
  }

  const value = `+${dial}${national.replace(/^0+/, "")}`;
  if (!/^\+[1-9]\d{6,14}$/.test(value)) {
    return { value: null, error: "رقم الهاتف غير صحيح، تأكد من رمز الدولة والرقم." };
  }
  return { value, error: null };
}

export async function registerTeacher(input: {
  fullName: string;
  phone: string;
  password: string;
}) {
  return authenticate(
    () => api.auth.completeProfile.mutate({
      phone: input.phone,
      fullName: input.fullName.trim(),
      birthDate: "1990-01-01",
      role: "teacher",
      password: input.password,
      confirmPassword: input.password,
      rememberMe: true,
    }),
    "teacher",
    "/teacher",
  );
}

function loginIdentifierTarget(raw: string) {
  const value = raw.trim();
  const phone = normalizePhoneInput(value);
  if (/^\+|^05/.test(phone)) return { kind: "identifier" as const, value: phone };
  if (value.includes("@")) return { kind: "identifier" as const, value };
  return { kind: "username" as const, value };
}

export async function loginTeacher(identifier: string, password: string) {
  const target = loginIdentifierTarget(identifier);
  return authenticate(
    () => target.kind === "identifier"
      ? api.auth.studentPasswordLogin.mutate({ identifier: target.value, password })
      : api.auth.passwordLogin.mutate({ username: target.value, password }),
    "teacher",
    "/teacher",
  );
}

export async function loginSupervisor(username: string, password: string) {
  return authenticate(
    () => api.auth.passwordLogin.mutate({ username: username.trim(), password }),
    "admin",
    "/admin",
  );
}

export function staffAuthError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.trim() : "";
  if (message.includes("AUTH_RECOVERY_PENDING")) {
    return "هذا الحساب يحتاج إلى استرداد الوصول — تواصل مع دعم تبيان";
  }
  if (
    message &&
    message.length <= 220 &&
    /[\u0600-\u06ff]/u.test(message) &&
    !/^[\[{]/.test(message) &&
    !TECHNICAL_ERROR_MARKERS.some((marker) => message.toLowerCase().includes(marker.toLowerCase()))
  ) {
    return message;
  }
  return fallback;
}
