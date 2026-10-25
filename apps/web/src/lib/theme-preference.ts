/**
 * تفضيل الوضع الليلي كمخزن واحد مشترك: مصدر الحقيقة هو class "dark" على
 * <html>، والمفتاح المحلي "tabyan.darkMode" يحفظه. كل مفتاح تبديل (الترويسة،
 * قارئ المصحف، لوحة الإدارة) يقرأ المخزن نفسه فلا تتعارض النسخ المتعددة.
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "tabyan.darkMode";

function readDark(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function setDarkMode(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try { localStorage.setItem(STORAGE_KEY, String(dark)); } catch { /* التخزين المحلي غير متاح */ }
}

/** يطبّق التفضيل المحفوظ إن وُجد (سلوك مفتاح الترويسة السابق عند التحميل). */
function applyStoredPreference() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) document.documentElement.classList.toggle("dark", stored === "true");
  } catch { /* التخزين المحلي غير متاح */ }
}

export function useDarkMode(): [boolean, (dark: boolean) => void, () => void] {
  const dark = useSyncExternalStore(subscribe, readDark, () => false);
  useEffect(applyStoredPreference, []);
  const toggle = useCallback(() => setDarkMode(!readDark()), []);
  return [dark, setDarkMode, toggle];
}
