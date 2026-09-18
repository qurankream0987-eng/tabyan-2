// Google Identity Services — وضع النافذة المنبثقة (popup) فلا يحدث أي تحويل للصفحة
// ولا يُفقد أي state من معالج التسجيل عند فتح نافذة Google أو إغلاقها.

export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "";

interface GoogleIdApi {
  initialize: (cfg: { client_id: string; callback: (r: { credential?: string }) => void }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
}
declare global {
  interface Window { google?: { accounts?: { id?: GoogleIdApi } } }
}

let loader: Promise<GoogleIdApi> | null = null;

/** يحمّل سكربت Google مرة واحدة — يرمي خطأً عند الفشل */
export function loadGoogleIdentity(): Promise<GoogleIdApi> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  loader ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => {
      const api = window.google?.accounts?.id;
      if (api) resolve(api);
      else reject(new Error("google_unavailable"));
    };
    s.onerror = () => reject(new Error("google_script_failed"));
    document.head.appendChild(s);
  });
  return loader;
}
