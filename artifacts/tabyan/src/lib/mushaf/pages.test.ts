/**
 * اختبارات حساب ملاءمة صفحة المصحف للشاشة (P0 geometry).
 *
 * ★ السياسة المعتمدة رسمياً بقرار المستخدم (مهمة P0 STOP → التقرير المعماري
 *   → اعتماد القرار A — REPAIR CURRENT RENDERER مع MOBILE FILL MODE):
 *
 *   MOBILE PORTRAIT (< 768px):
 *     سطح قراءة QCF متجاوب يملأ عرض الشاشة (بهامش صغير) ويملأ مساحة القراءة
 *     الرأسية بين الشريطين العائمين. النسبة المطبوعة 622/917 لا تُفرض هنا —
 *     الـ15 سطراً تتوزع عمودياً وحجم الخط مشتق من العرض فقط (لا تشويه).
 *     ⚠ ممنوع إعادة فرض 622/917 على الهاتف العمودي — هذا ليس regression بل
 *     سياسة معتمدة؛ أي تعديل يعكسها يخالف قرار المستخدم.
 *
 *   DESKTOP / LANDSCAPE (≥ 768px):
 *     النسبة المطبوعة 622/917 محفوظة حرفياً مع سقف عرض 560px.
 */
import { describe, it, expect } from "vitest";
import {
  computeMushafPageFit,
  PAGE_ASPECT,
  PAGE_SIDE_MARGIN,
  DESKTOP_MAX_PAGE_W,
} from "./pages";

describe("computeMushafPageFit — MOBILE FILL MODE (هاتف عمودي)", () => {
  it("390×844: العرض ≥94% من الشاشة والارتفاع يملأ مساحة القراءة كاملة", () => {
    const fit = computeMushafPageFit(390, 828); // 844 − هوامش علوية/سفلية صغيرة
    expect(fit.mode).toBe("fill");
    expect(fit.w).toBe(390 - PAGE_SIDE_MARGIN * 2); // 370
    expect(fit.w / 390).toBeGreaterThan(0.94);
    expect(fit.h).toBe(828); // ملء رأسي كامل — لا هوامش داكنة ضخمة
    expect(fit.h / 828).toBeGreaterThan(0.98);
  });

  it("393×852 و430×932: نفس سياسة الملء", () => {
    const a = computeMushafPageFit(393, 836);
    expect(a.mode).toBe("fill");
    expect(a.w).toBe(373);
    expect(a.h).toBe(836);
    const b = computeMushafPageFit(430, 916);
    expect(b.mode).toBe("fill");
    expect(b.w).toBe(410);
    expect(b.h).toBe(916);
  });

  it("هاتف صغير 320×568: ملء أيضاً دون تجاوز الصندوق", () => {
    const fit = computeMushafPageFit(320, 560);
    expect(fit.mode).toBe("fill");
    expect(fit.w).toBe(300);
    expect(fit.h).toBe(560);
  });
});

describe("computeMushafPageFit — النسبة المطبوعة (مكتبي/أفقي ≥ 768px)", () => {
  it("مكتبي 1440×900: سقف العرض المكتبي والنسبة محفوظة", () => {
    const fit = computeMushafPageFit(1440, 900);
    expect(fit.mode).toBe("aspect");
    expect(fit.w).toBe(DESKTOP_MAX_PAGE_W);
    expect(fit.h).toBeCloseTo(DESKTOP_MAX_PAGE_W / PAGE_ASPECT, 5);
  });

  it("هاتف أفقي 844×390: مقيد بالارتفاع والنسبة محفوظة", () => {
    const fit = computeMushafPageFit(844, 390);
    expect(fit.mode).toBe("aspect");
    expect(fit.w).toBeCloseTo(390 * PAGE_ASPECT, 5);
    expect(fit.h).toBeLessThanOrEqual(390);
  });

  it("لوحي عمودي 768×1000: يُعامل مكتبياً (نسبة محفوظة)", () => {
    const fit = computeMushafPageFit(768, 1000);
    expect(fit.mode).toBe("aspect");
    expect(fit.w).toBe(Math.min(768 - PAGE_SIDE_MARGIN * 2, DESKTOP_MAX_PAGE_W));
    expect(fit.h).toBeCloseTo(fit.w / PAGE_ASPECT, 5);
  });

  it("لا يتجاوز الصندوق أبداً في وضع النسبة", () => {
    for (const [w, h] of [[768, 1000], [1024, 700], [1440, 900]] as const) {
      const fit = computeMushafPageFit(w, h);
      expect(fit.w).toBeLessThanOrEqual(w);
      expect(fit.h).toBeLessThanOrEqual(h + 0.001);
    }
  });
});

describe("computeMushafPageFit — أمان", () => {
  it("قيم صفرية أو سالبة آمنة", () => {
    expect(computeMushafPageFit(0, 800).w).toBe(0);
    expect(computeMushafPageFit(390, 0).h).toBe(0);
    expect(computeMushafPageFit(-10, -10).w).toBe(0);
  });
});
