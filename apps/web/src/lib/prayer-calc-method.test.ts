import { describe, it, expect } from "vitest";
import { getCalcMethod, FALLBACK_METHOD } from "./prayer-calc-method";

describe("getCalcMethod — خريطة البلد إلى طريقة الحساب (معرفات Aladhan)", () => {
  const cases: [string, number][] = [
    ["SA", 4],  // السعودية — أم القرى
    ["KW", 9],  // الكويت
    ["QA", 10], // قطر
    ["AE", 16], // الإمارات — دبي
    ["BH", 8],  // الخليج
    ["OM", 8],
    ["YE", 8],
    ["EG", 5],  // مصر
    ["JO", 23], // الأردن
    ["MA", 21], // المغرب
    ["TN", 18], // تونس
    ["DZ", 19], // الجزائر
    ["TR", 13], // تركيا
    ["IR", 7],  // إيران
    ["PK", 1],  // شبه القارة — كراتشي
    ["IN", 1],
    ["BD", 1],
    ["SG", 11], // سنغافورة
    ["MY", 17], // ماليزيا — JAKIM
    ["ID", 20], // إندونيسيا — Kemenag
    ["US", 2],  // أمريكا الشمالية — ISNA
    ["CA", 2],
    ["FR", 12], // فرنسا
    ["PT", 22], // البرتغال
    ["RU", 14], // روسيا
    ["GB", 3],  // بريطانيا — رابطة العالم الإسلامي
  ];

  it.each(cases)("%s → method=%i", (cc, method) => {
    expect(getCalcMethod(cc).method).toBe(method);
  });

  it("يقبل الرموز الصغيرة والمسافات الزائدة", () => {
    expect(getCalcMethod("kw").method).toBe(9);
    expect(getCalcMethod(" sa ").method).toBe(4);
  });

  it("كل نتيجة تحمل اسمًا عربيًا غير فارغ", () => {
    for (const [cc] of cases) {
      expect(getCalcMethod(cc).label.length).toBeGreaterThan(0);
    }
  });

  it("الكويت تعرض اسم طريقتها لا رابطة العالم الإسلامي", () => {
    expect(getCalcMethod("KW").label).toBe("الكويت");
  });
});

describe("getCalcMethod — السلوك الاحتياطي", () => {
  it("بلد غير مدرج ⇒ الطريقة الاحتياطية 3 (رابطة العالم الإسلامي)", () => {
    expect(FALLBACK_METHOD).toBe(3);
    expect(getCalcMethod("XX").method).toBe(3);
    expect(getCalcMethod("XX").label).toBe("رابطة العالم الإسلامي");
  });

  it("بلد مفقود أو فارغ ⇒ الطريقة الاحتياطية", () => {
    expect(getCalcMethod(undefined).method).toBe(3);
    expect(getCalcMethod(null).method).toBe(3);
    expect(getCalcMethod("").method).toBe(3);
  });
});
