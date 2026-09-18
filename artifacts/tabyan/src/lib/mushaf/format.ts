/** أرقام عربية هندية للعرض في واجهة المصحف (٢٥٠ / ٦٠٤) */
export function toArabicDigits(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}
