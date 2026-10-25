export interface InkMetrics {
  /** Measured at refSize: actualBoundingBox values and font-box values (px). */
  left: number; right: number; ascent: number; descent: number;
  fontAscent: number; fontDescent: number; refSize: number;
}
export interface FitResult { fontSize: number; dx: number; dy: number }

/** Largest size whose measured ink fits safeW x safeH, plus offsets centering the ink
 *  in a line-height:1 box (positive dx = right, dy = down). */
export function fitTitle(m: InkMetrics, safeW: number, safeH: number, maxSize: number): FitResult {
  if (!(safeW > 0) || !(safeH > 0) || !(maxSize > 0)) return { fontSize: 0, dx: 0, dy: 0 };
  const inkW = Math.max(0.001, m.left + m.right);
  const inkH = Math.max(0.001, m.ascent + m.descent);
  const k = Math.min(safeW / inkW, safeH / inkH, maxSize / m.refSize);
  const s = m.refSize * k;
  // canvas: left = distance from anchor(center) to ink left (positive = left of anchor)
  const dx = ((m.left - m.right) / 2) * k;
  const baseline = (m.refSize - (m.fontAscent + m.fontDescent)) / 2 + m.fontAscent;
  const inkCenterY = baseline - (m.ascent - m.descent) / 2;
  const dy = (m.refSize / 2 - inkCenterY) * k;
  return { fontSize: s, dx, dy };
}

/** Font hinting at small sizes is not a linear reduction of 100px ink.
 * Find the largest real-size fit, then center using those same real-size metrics. */
export function fitMeasuredTitle(
  measure: (size: number) => InkMetrics | null,
  safeW: number,
  safeH: number,
  maxSize: number,
): FitResult | null {
  if (!(safeW > 0) || !(safeH > 0) || !(maxSize > 0)) return { fontSize: 0, dx: 0, dy: 0 };
  let low = 0;
  let high = maxSize;
  for (let i = 0; i < 12; i++) {
    const size = (low + high) / 2;
    const m = measure(size);
    if (!m) return null;
    if (m.left + m.right <= safeW && m.ascent + m.descent <= safeH) low = size;
    else high = size;
  }
  const exact = measure(low);
  return exact ? fitTitle(exact, safeW, safeH, low) : null;
}

export function measureInk(text: string, family: string, weight: number, refSize = 100): InkMetrics | null {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.font = `${weight} ${refSize}px ${family}`;
  ctx.textAlign = "center";
  ctx.direction = "rtl";
  ctx.textBaseline = "alphabetic";
  const t = ctx.measureText(text);
  return {
    left: t.actualBoundingBoxLeft, right: t.actualBoundingBoxRight,
    ascent: t.actualBoundingBoxAscent, descent: t.actualBoundingBoxDescent,
    fontAscent: t.fontBoundingBoxAscent ?? refSize * 0.8,
    fontDescent: t.fontBoundingBoxDescent ?? refSize * 0.2, refSize,
  };
}
