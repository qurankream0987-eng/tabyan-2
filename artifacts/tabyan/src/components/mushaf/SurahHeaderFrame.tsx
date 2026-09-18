/**
 * SurahHeaderFrame — ترويسة السورة بهندسة المصحف المرجعي وهوية تبيان (P0).
 *
 * البنية (مطابقة لهندسة المرجع، بزخارف تبيان الأصلية):
 *   A) إطار «مفرّق» مثل المرجع: وحدات زخرفية منفصلة لا شريط واحد متصل
 *   B) ميدالية دائرية/بيضاوية بجانب الكبسولة، مع فواصل قصيرة
 *   C) كتلة زخرفة كثيفة عند الطرف البعيد
 *   D) كبسولة وسطية ممدودة (pill) بإطار رفيع تحتوي اسم السورة (~40% من العرض)
 *
 * ليست Card ولا زرًا: بلا ظل، بلا خلفية، حدود رفيعة (hairline). الألوان تتبع
 * الثيم فقط (خمري نهارًا، ذهبي ليلًا) ولا تمس النص القرآني. حادة مع Zoom/Retina.
 */

interface Props {
  /** اسم السورة من بيانات القرآن (بدون «سُورَةُ») */
  surahName: string;
  /** ارتفاع سطر الصفحة — الترويسة تملأ سطرها دون كسر line geometry */
  rowH: number;
}

/**
 * زخرفة جانبية واحدة من إطار المرجع: كتلة مشبكة + ميدالية + فواصل.
 * تُرسم لليسار وتُعكس لليمين (تناظر مرآتي). preserveAspectRatio="none"
 * يسمح لها بالتمدد أفقيًا دون التأثير في ارتفاع سطر الصفحة.
 */
function OrnamentSide({ flip }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 170 36"
      preserveAspectRatio="none"
      aria-hidden
      className="h-full flex-1 min-w-0"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      {/* فواصل الإطار العلوية والسفلية — لا تتصل بالميدالية */}
      <line x1="3" y1="5" x2="42" y2="5" stroke="currentColor" strokeWidth="0.8" opacity="0.72" vectorEffect="non-scaling-stroke" />
      <line x1="3" y1="31" x2="42" y2="31" stroke="currentColor" strokeWidth="0.8" opacity="0.72" vectorEffect="non-scaling-stroke" />
      <line x1="77" y1="5" x2="110" y2="5" stroke="currentColor" strokeWidth="0.8" opacity="0.72" vectorEffect="non-scaling-stroke" />
      <line x1="77" y1="31" x2="110" y2="31" stroke="currentColor" strokeWidth="0.8" opacity="0.72" vectorEffect="non-scaling-stroke" />
      <line x1="143" y1="5" x2="167" y2="5" stroke="currentColor" strokeWidth="0.8" opacity="0.72" vectorEffect="non-scaling-stroke" />
      <line x1="143" y1="31" x2="167" y2="31" stroke="currentColor" strokeWidth="0.8" opacity="0.72" vectorEffect="non-scaling-stroke" />

      {/* كتلة زخرفة طرفية كثيفة — نقوش متقاطعة شبيهة بالمخطوط المرجعي */}
      <rect x="3" y="8" width="39" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="0.85" opacity="0.9" vectorEffect="non-scaling-stroke" />
      <path d="M5 10l8 8-8 8M11 9l9 9-9 9M18 9l9 9-9 9M25 9l9 9-9 9M32 9l8 9-8 9
        M5 26l8-8 8 8M5 10l8 8 8-8M19 10l8 8 8-8M27 26l8-8 5 5"
        fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.78" vectorEffect="non-scaling-stroke" />
      <path d="M5 18h35M10 13l5 5-5 5M32 13l-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="0.65" opacity="0.65" vectorEffect="non-scaling-stroke" />

      {/* فاصل ماسي صغير بين الكتلة والميدالية */}
      <path d="M48 18l5-5 5 5-5 5zM61 18l4-4 4 4-4 4z" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.82" vectorEffect="non-scaling-stroke" />
      <line x1="42" y1="18" x2="48" y2="18" stroke="currentColor" strokeWidth="0.8" opacity="0.65" vectorEffect="non-scaling-stroke" />
      <line x1="69" y1="18" x2="77" y2="18" stroke="currentColor" strokeWidth="0.8" opacity="0.65" vectorEffect="non-scaling-stroke" />

      {/* الميدالية المنفصلة: بيضاوية مزدوجة مع عقدة مركزية */}
      <ellipse cx="91" cy="18" rx="14" ry="10" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.9" vectorEffect="non-scaling-stroke" />
      <ellipse cx="91" cy="18" rx="10" ry="7" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.7" vectorEffect="non-scaling-stroke" />
      <path d="M84 18c3-5 11-5 14 0-3 5-11 5-14 0z" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.75" vectorEffect="non-scaling-stroke" />
      <circle cx="91" cy="18" r="1.5" fill="currentColor" opacity="0.82" />

      {/* فاصل أخير قصير باتجاه الكبسولة */}
      <line x1="105" y1="18" x2="121" y2="18" stroke="currentColor" strokeWidth="0.8" opacity="0.65" vectorEffect="non-scaling-stroke" />
      <path d="M126 18l4-4 4 4-4 4z" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.82" vectorEffect="non-scaling-stroke" />
      <line x1="134" y1="18" x2="167" y2="18" stroke="currentColor" strokeWidth="0.8" opacity="0.45" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function SurahHeaderFrame({ surahName, rowH }: Props) {
  return (
    <div
      className="flex items-center text-burgundy dark:text-gold"
      style={{ width: "94%", height: rowH * 0.78, gap: rowH * 0.06 }}
      data-surah-frame={surahName}
      dir="rtl"
    >
      <OrnamentSide flip />
      {/* الكبسولة الوسطية: pill ممدودة بإطار رفيع — ليست زرًا ولا Card */}
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          minWidth: "38%",
          maxWidth: "46%",
          height: rowH * 0.62,
          paddingInline: rowH * 0.26,
          border: "1px solid currentColor",
          borderRadius: 9999, // كبسولة دائرية الطرفين تمامًا
          opacity: 0.95,
        }}
      >
        <span
          className="font-quran whitespace-nowrap"
          style={{ fontSize: rowH * 0.44, lineHeight: 1, paddingBottom: rowH * 0.04 }}
        >
          سُورَةُ {surahName}
        </span>
      </div>
      <OrnamentSide />
    </div>
  );
}
