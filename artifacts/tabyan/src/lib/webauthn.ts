// ── الدخول بالبصمة / Face ID / Touch ID عبر WebAuthn بتحقق خادمي كامل ──
// المبادئ الأمنية:
// - التحقق التشفيري كله في الخادم: المفتاح العام مُسجَّل هناك، ولا يُصدر رمز جلسة إلا بعد نجاح التوقيع.
// - لا يُخزَّن على الجهاز أي رمز جلسة أو كلمة سر — علم تفعيل فقط (tabyan_bio_enabled) لإظهار الزر.
// - على iOS يستدعي WebAuthn مصادقة النظام (Face ID / Touch ID عبر LocalAuthentication) — لا يبني التطبيق أي نظام تعرّف خاص.
// - البصمة طريقة إضافية؛ الدخول برقم الجوال + رمز التحقق متاح دائماً كبديل آمن.

import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { trpcClient } from "@/lib/api";

const FLAG_KEY = "tabyan_bio_enabled";

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

/** هل فعّل المستخدم الدخول بالبصمة على هذا الجهاز؟ (علم محلي فقط — بلا أي بيانات جلسة) */
export function hasBiometricSession(): boolean {
  return localStorage.getItem(FLAG_KEY) === "1";
}

/**
 * تفعيل الدخول بالبصمة بعد تسجيل دخول ناجح.
 * يُنشئ مفتاح WebAuthn داخل Secure Enclave ويُسجِّل مفتاحه العام في الخادم — لا يُخزَّن شيء حساس على الجهاز.
 */
export async function enableBiometric(): Promise<boolean> {
  if (!(await isBiometricAvailable())) return false;
  try {
    const { challengeId, options } = await trpcClient.auth.webauthnRegisterOptions.mutate();
    const response = await startRegistration({ optionsJSON: options });
    await trpcClient.auth.webauthnRegisterVerify.mutate({ challengeId, response });
    localStorage.setItem(FLAG_KEY, "1");
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
export function clearBiometric() {
  localStorage.removeItem(FLAG_KEY);
}
