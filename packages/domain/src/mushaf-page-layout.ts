/**
 * تركيب الصفحة عمودياً — هندسة الصفوف فقط، دون أي مساس بالنص أو ترتيب الأسطر.
 *
 * كل الصفحات تُرسم على الورقة المطبوعة نفسها (622/917) فيبقى إطار المصحف ثابتاً عند التقليب.
 * - "standard": الصفحات العادية على شبكة الـ15 سطراً المطبوعة، حتى إن انتهت عند السطر 14.
 * - "opening": صفحتا الافتتاح فقط في الطبعة المدنية (الفاتحة وأول البقرة).
 *   لا تُمطّ صفوفها على الورقة ولا يُكبَّر خطها لملء العرض: خطوة السطر هي خطوة الصفحات
 *   الكاملة، وتبدأ الكتلة (الترويسة + البسملة + الأسطر) عند هامش الورقة العلوي.
 */
export const LINE_COUNT = 15;
/** نسبة حجم الخط إلى خطوة السطر المقيسة على الصفحات الكاملة (0.50–0.545). */
export const DENSE_INK_RATIO = 0.53;
/** هامش الورقة العلوي/السفلي كنسبة من ارتفاعها. */
const PAGE_INSET = 0.015;

export type PageVariant = "standard" | "opening";

export interface LayoutRow {
  line: number;
  kind: "words" | "surah-header" | "basmalah";
}

export interface PageLayout {
  variant: PageVariant;
  paperH: number;
  /** خطوة صف الكلمات والبسملة. */
  wordRowH: number;
  /** موضع أعلى كل صف (بالبكسل) داخل الورقة، مفهرس برقم السطر. */
  tops: Map<number, number>;
  /** حدود كتلة النص (لزخرفة لوح الافتتاح) — من أعلى أول صف إلى أسفل آخر صف. */
  blockTop: number;
  blockBottom: number;
}

/** خطوة السطر في الصفحات الكاملة لارتفاع ورقة معيّن. */
export function standardRowHeight(fullH: number): number {
  return (fullH * (1 - PAGE_INSET * 2)) / LINE_COUNT;
}

/**
 * The v1 (1405 print) fonts of pages 1 and 2 draw their words this much smaller than the
 * full pages' fonts do (the basmala of 1:1 against the same words in 27:30 on page 379).
 */
const OPENING_GLYPH_SCALE = 1.35;

/**
 * سقف حجم خط QCF لصفحة: الصفحات الكاملة تُعاير بالعرض وحده؛ صفحتا الافتتاح أسطرهما
 * أقصر بطبيعتها في المطبوع، فتُحدّ بحجم خط الصفحات الكاملة — مصحَّحاً بصغر glyphs
 * خطَّيهما، فتظهر كلماتهما بحجم كلمات بقية المصحف.
 */
export function maxFontSizeFor(variant: PageVariant, fullH: number): number {
  return variant === "opening" ? standardRowHeight(fullH) * DENSE_INK_RATIO * OPENING_GLYPH_SCALE : Infinity;
}

/**
 * @param fullH ارتفاع الورقة المطبوعة للعرض الحالي.
 */
export function computePageLayout(
  rows: readonly LayoutRow[],
  rowCount: number,
  fullH: number,
  variant: PageVariant,
): PageLayout {
  const inset = fullH * PAGE_INSET;
  const tops = new Map<number, number>();

  if (variant === "standard" || rows.length === 0) {
    const rowH = standardRowHeight(fullH);
    for (const r of rows) tops.set(r.line, inset + (r.line - 1) * rowH);
    return { variant: "standard", paperH: fullH, wordRowH: rowH, tops, blockTop: inset, blockBottom: fullH - inset };
  }

  const wordRowH = standardRowHeight(fullH);
  const titleRowH = fullH / LINE_COUNT;
  /** مسافة تنفّس قصيرة تحت ترويسة السورة والبسملة. */
  const headerGap = wordRowH * 0.2;
  const kindByLine = new Map(rows.map((r) => [r.line, r.kind]));
  const firstLine = Math.min(...rows.map((r) => r.line));

  const offsets = new Map<number, number>();
  let y = 0;
  for (let line = firstLine; line <= rowCount; line++) {
    offsets.set(line, y);
    const kind = kindByLine.get(line);
    y += kind === "surah-header" ? titleRowH + headerGap : kind === "basmalah" ? wordRowH + headerGap : wordRowH;
  }
  // Reader-first opening pages: natural top inset, never vertical centering.
  // Keep row steps and the special opening composition unchanged.
  const blockTop = inset;
  for (const [line, offset] of offsets) tops.set(line, blockTop + offset);
  return { variant: "opening", paperH: fullH, wordRowH, tops, blockTop, blockBottom: blockTop + y };
}

/**
 * Word gap as a share of the QCF font's own space. The printed page sets its words tight;
 * a narrower gap lets the widest line fit at a larger size, so the glyphs grow and the
 * lines lose the airy gaps between words. Measuring and drawing must use the same gap.
 */
export const QCF_WORD_GAP = 0.45;

/**
 * The printed basmala above each surah: the four words of 1:1 as drawn by the page-1 QCF
 * font (the same calligraphy as the Madinah print), separated by the narrow word gap.
 * These are the QCF v1 (1405 print) codes U+FB51..U+FB54 from mushaf/v1/pages/1.json.
 */
export const BASMALA_FONT_PAGE = 1;
export const BASMALA_GLYPHS = ["ﭑ", "ﭒ", "ﭓ", "ﭔ"] as const;

/**
 * The v1 page-1 font draws its words smaller than the full pages do (the same basmala in
 * 27:30 on page 379 is about 1.35-1.4x taller), so on standard pages the basmala is set at
 * this multiple of the page's font size to match its lines. Opening pages share page 1's scale.
 */
export function basmalaScale(variant: PageVariant): number {
  return variant === "opening" ? 1 : 1.35;
}
