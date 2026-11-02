/**
 * خطوط المصحف QCF v1 (طبعة المدينة 1405) — خط woff2 مستقل لكل صفحة (604 خطاً) يُحمَّل كسولاً عبر FontFace API.
 * المسار مُصدَّر (mushaf/v1/) واسم العائلة QCF1_ كي لا تختلط رموز v2 المخزّنة بخطوط v1.
 * الخطوط مرسومة بتخطيط مجمع الملك فهد (الطبعة المدنية) — نص متجه (vector) لا يتبكسل مهما كبُر.
 */
const loaded = new Set<number>();
const inflight = new Map<number, Promise<void>>();
/** مراجع الخطوط المسجلة — تُدار بدورة حياة (تُحذف البعيدة عن الصفحة الحالية) */
const faces = new Map<number, FontFace>();

export function pageFontFamily(page: number): string {
  return `QCF1_p${page}`;
}

export function pageFontUrl(page: number): string {
  return `${import.meta.env.BASE_URL}mushaf/v1/fonts/p${page}.woff2`;
}

/** يحمّل خط صفحة ويسجّله في المستند — idempotent وآمن للتكرار */
export function ensurePageFont(page: number): Promise<void> {
  if (loaded.has(page)) return Promise.resolve();
  let p = inflight.get(page);
  if (!p) {
    const face = new FontFace(pageFontFamily(page), `url("${pageFontUrl(page)}") format("woff2")`, {
      display: "block",
    });
    p = face
      .load()
      .then((f) => {
        document.fonts.add(f);
        faces.set(page, f);
        loaded.add(page);
      })
      .finally(() => inflight.delete(page));
    inflight.set(page, p);
  }
  return p;
}

/**
 * يبقي خطوط الصفحة الحالية وجوارها فقط ويحذف البعيدة من document.fonts —
 * بلا هذا تنمو ذاكرة الخطوط بلا حد حتى 604 خطاً في جلسة قراءة طويلة.
 * العودة لصفحة محذوفة تعيد تحميل خطها (ذاكرة HTTP تجعله شبه فوري).
 */
export function retainPageFonts(current: number, radius = 3): void {
  for (const [page, face] of faces) {
    // Page 1's font also draws the basmala above every surah, so it stays.
    if (page !== 1 && Math.abs(page - current) > radius && !inflight.has(page)) {
      document.fonts.delete(face);
      faces.delete(page);
      loaded.delete(page);
    }
  }
}
