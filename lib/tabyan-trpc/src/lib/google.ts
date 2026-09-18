import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";

// ── التحقق الخادمي الكامل من Google ID Token — لا يُوثق أي حقل قادم من العميل إطلاقاً ──
// verifyIdToken تفحص: التوقيع عبر مفاتيح Google، وaudience مقابل GOOGLE_CLIENT_ID، وانتهاء الصلاحية.
// نفحص issuer صراحةً فوق ذلك.

const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

let oauthClient: OAuth2Client | null = null;

export interface VerifiedGoogleIdentity {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

/** يتحقق من ID Token خادمياً ويعيد الهوية — يرمي Error برسالة داخلية غير قابلة للعرض على العميل */
export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleIdentity> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("google_not_configured");
  oauthClient ??= new OAuth2Client(clientId);
  const ticket = await oauthClient.verifyIdToken({ idToken, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload || typeof payload.sub !== "string" || !payload.sub) throw new Error("invalid_google_token");
  if (!GOOGLE_ISSUERS.has(payload.iss)) throw new Error("invalid_google_issuer");
  return {
    sub: payload.sub,
    email: payload.email ? payload.email.toLowerCase() : null,
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name.slice(0, 100) : null,
  };
}

// ── حالة تسجيل/دخول مؤقتة موقّعة خادمياً (HMAC-SHA256 بمفتاح SESSION_SECRET) ──
// البديل الآمن عن إعادة إرسال googleIdToken من العميل: الهوية تُستخرج مرة واحدة خادمياً
// وتُختم هنا، وcompleteProfile يتحقق من الختم والانتهاء — العميل يحمل رمزاً معتماً فقط.

const STATE_TTL_MS = 15 * 60 * 1000; // 15 دقيقة — كافية لإكمال المعالج

// jti معرّف عشوائي لكل تذكرة — يُستهلك خادمياً عند أول استعمال فتصبح التذكرة أحادية الاستخدام (منع replay)
export type GoogleState =
  | { purpose: "login"; sub: string; jti: string; exp: number }
  | { purpose: "register"; sub: string; email: string | null; emailVerified: boolean; name: string | null; jti: string; exp: number };

/** Omit توزيعي — Omit العادي على الاتحادات يُسقط الحقول غير المشتركة */
export type GoogleStateInput = GoogleState extends infer T
  ? T extends GoogleState ? Omit<T, "jti"> : never
  : never;

function stateSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("session_secret_missing");
  return s;
}

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");

export function signGoogleState(data: GoogleStateInput): string {
  const body = b64url(JSON.stringify({ ...data, jti: crypto.randomUUID() }));
  const sig = crypto.createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** يتحقق من الختم والانتهاء — يرمي Error عند أي خلل */
export function verifyGoogleState(token: string, purpose: GoogleState["purpose"]): GoogleState {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) throw new Error("bad_state");
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", stateSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error("bad_state_signature");
  let data: GoogleState;
  try {
    data = JSON.parse(Buffer.from(body, "base64url").toString()) as GoogleState;
  } catch {
    throw new Error("bad_state_payload");
  }
  if (data.purpose !== purpose) throw new Error("bad_state_purpose");
  if (typeof data.exp !== "number" || data.exp < Date.now()) throw new Error("state_expired");
  if (typeof data.sub !== "string" || !data.sub) throw new Error("bad_state_sub");
  if (typeof data.jti !== "string" || !data.jti) throw new Error("bad_state_jti");
  return data;
}

export const googleStateExpiry = () => Date.now() + STATE_TTL_MS;
