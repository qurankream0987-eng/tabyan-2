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
 * سقف حجم خط QCF لصفحة: الصفحات الكاملة تُعاير بالعرض وحده؛ صفحتا الافتتاح أسطرهما
 * أقصر بطبيعتها في المطبوع، فتُحدّ بحجم خط الصفحات الكاملة (لا تكبير للـ glyphs).
 */
export function maxFontSizeFor(variant: PageVariant, fullH: number): number {
  return variant === "opening" ? standardRowHeight(fullH) * DENSE_INK_RATIO : Infinity;
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

/** Printed paper proportions (width ÷ height) of the Madinah mushaf page. */
export const PRINTED_PAGE_ASPECT = 622 / 917;
/** How much airier than print the lines may be on a tall screen before the block stops growing. */
const MAX_LINE_SPREAD = 1.05;

/**
 * Height for the 15-line grid on a full-screen page: the screen's height when it is short,
 * but never more than the printed proportions (plus a little air) on a tall phone, so the
 * lines stay close together like the printed page instead of spreading over the screen.
 */
export function readerGridHeight(width: number, available: number): number {
  return Math.min(available, (width / PRINTED_PAGE_ASPECT) * MAX_LINE_SPREAD);
}
