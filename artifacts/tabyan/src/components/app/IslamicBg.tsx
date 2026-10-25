/**
 * IslamicBg — طبقة العمق الضوئي الذهبية (بلا نجوم ولا زخارف)
 *
 * تُركّب مرة واحدة في App.tsx. تضيف:
 *   - تدفق ضوئي ذهبي ناعم (Light Flow)
 *   - وهج ذهبي في الزوايا (Corner Glow)
 */
export default function IslamicBg() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden select-none"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    >
      {/* طبقات الوضع الفاتح/الداكن محمولة مباشرة في body (index.css) لضمان تقدّمها على backdrop-filter */}

      {/* ── التدفق الضوئي الذهبي المتحرك ── */}
      <div
        className="absolute"
        style={{
          inset: '-15%',
          background:
            'radial-gradient(ellipse 60% 45% at 22% 20%, rgba(212,175,55,0.16) 0%, transparent 65%),' +
            'radial-gradient(ellipse 55% 40% at 82% 82%, rgba(212,175,55,0.13) 0%, transparent 65%)',
          animation: 'islamicLightFlow 14s ease-in-out infinite alternate',
        }}
      />

      {/* ── وهج الزاوية العلوية اليسرى (الزخارف الشرقية) ── */}
      <div
        className="absolute top-0 left-0"
        style={{
          width: 340,
          height: 340,
          background: 'radial-gradient(circle at top left, rgba(212,175,55,0.30) 0%, rgba(212,175,55,0.08) 40%, transparent 70%)',
          animation: 'islamicCornerGlow 7s ease-in-out infinite',
        }}
      />

      {/* ── وهج الزاوية السفلية اليمنى ── */}
      <div
        className="absolute bottom-0 right-0"
        style={{
          width: 340,
          height: 340,
          background: 'radial-gradient(circle at bottom right, rgba(212,175,55,0.30) 0%, rgba(212,175,55,0.08) 40%, transparent 70%)',
          animation: 'islamicCornerGlow 7s ease-in-out infinite',
          animationDelay: '3.5s',
        }}
      />

    </div>
  );
}
