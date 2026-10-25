// ── الدخول بالبصمة / Face ID / Touch ID عبر WebAuthn بتحقق خادمي كامل ──
// المبادئ الأمنية:
// - التحقق التشفيري كله في الخادم: المفتاح العام مُسجَّل هناك، ولا يُصدر رمز جلسة إلا بعد نجاح التوقيع.
// - لا يُخزَّن على الجهاز أي رمز جلسة أو كلمة سر — علم تفعيل فقط (tabyan_bio_enabled) لإظهار الزر.
// - على iOS يستدعي WebAuthn مصادقة النظام (Face ID / Touch ID عبر LocalAuthentication) — لا يبني التطبيق أي نظام تعرّف خاص.
// - البصمة طريقة إضافية؛ الدخول برقم الجوال + رمز التحقق متاح دائماً كبديل آمن.

import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { trpcClient } from "@/lib/api";

const FLAG_KEY = "tabyan_bio_enabled";
const ACCOUNT_FLAG_PREFIX = `${FLAG_KEY}.`;

function accountFlagKey(accountId: string) {
  return `${ACCOUNT_FLAG_PREFIX}${encodeURIComponent(accountId)}`;
}

export interface BiometricSession { token: string; role: string; name: string; }

function isSupported(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined";
}

/** هل يدعم الجهاز مصادقة حيوية مدمجة (Face ID / Touch ID / بصمة)؟ */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!isSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Does this account have local WebAuthn UI enabled? With no account ID, this
 * answers whether any credential was enabled on this browser for the login UI.
 */
export function hasBiometricSession(accountId?: string | null): boolean {
  try {
    if (accountId) return localStorage.getItem(accountFlagKey(accountId)) === "1";
    if (localStorage.getItem(FLAG_KEY) === "1") return true; // legacy device-level indicator
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(ACCOUNT_FLAG_PREFIX) && localStorage.getItem(key) === "1") return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * تفعيل الدخول بالبصمة بعد تسجيل دخول ناجح.
 * يُنشئ مفتاح WebAuthn داخل Secure Enclave ويُسجِّل مفتاحه العام في الخادم — لا يُخزَّن شيء حساس على الجهاز.
 */
export async function enableBiometric(accountId?: string | null): Promise<boolean> {
  if (!(await isBiometricAvailable())) return false;
  try {
    // Registration flow calls this only after creating and storing the session.
    // Resolve the owner before server-side registration; never store a device-wide
    // flag that could make another account appear enrolled.
    const ownerId = accountId ?? (await trpcClient.auth.me.query()).id;
    const { challengeId, options } = await trpcClient.auth.webauthnRegisterOptions.mutate();
    const response = await startRegistration({ optionsJSON: options });
    await trpcClient.auth.webauthnRegisterVerify.mutate({ challengeId, response });
    localStorage.setItem(accountFlagKey(ownerId), "1");
    return true;
  } catch {
    // المستخدم ألغى أو تعذّر الإنشاء — التفعيل اختياري ولا يعطّل الدخول العادي
    return false;
  }
}

/**
 * الدخول بالبصمة: تحدٍّ من الخادم ← توقيع من مصادق النظام ← تحقق خادمي ← رمز جلسة.
 * يرمي خطأً إن فشلت البصمة أو ألغاها المستخدم — ليبقى البديل (رمز التحقق) متاحاً.
 */
export async function biometricLogin(): Promise<BiometricSession> {
  const { challengeId, options } = await trpcClient.auth.webauthnLoginOptions.mutate();
  const response = await startAuthentication({ optionsJSON: options });
  const res = await trpcClient.auth.webauthnLoginVerify.mutate({ challengeId, response });
  return { token: res.token, role: res.role, name: res.fullName };
}

/** إلغاء العلم المحلي (الخادم يبقى صاحب القرار في قبول أي توقيع) */
export function clearBiometric(accountId?: string | null) {
  try {
    if (accountId) {
      localStorage.removeItem(accountFlagKey(accountId));
      return;
    }
    localStorage.removeItem(FLAG_KEY);
    const accountKeys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(ACCOUNT_FLAG_PREFIX)) accountKeys.push(key);
    }
    for (const key of accountKeys) localStorage.removeItem(key);
  } catch { /* local enrollment indicator is optional */ }
}
