import { useEffect, useState } from "react";
import "./SplashScreen.css";

interface Props { onDone: () => void; }

export default function SplashScreen({ onDone }: Props) {
  const [hideAll,     setHideAll]     = useState(false);
  const [d1,          setD1]          = useState(false);
  const [d2,          setD2]          = useState(false);
  const [d3,          setD3]          = useState(false);
  const [verseActive, setVerseActive] = useState(false);
  const [verseExit,   setVerseExit]   = useState(false);
  const [homeActive,  setHomeActive]  = useState(false);

  useEffect(() => {
    // توقيتات مُسرَّعة — نفس العناصر والتسلسل البصري، لكن الإجمالي ~2.8 ثانية بدل 5.2
    // (الشعار فوراً، الآية ~0.7 ثانية، نص البيت يظهر عند 1.3s ويكتمل ظهوره ~2.0s،
    //  يبقى مرئياً بوضوح ثم تلاشي سلس 0.55 ثانية) — كل المؤقتات في مصفوفة واحدة تُنظَّف عند الفك
    const timers = [
      setTimeout(() => setD1(true), 120),
      setTimeout(() => { setVerseActive(true); setD2(true); }, 450),
      setTimeout(() => {
        // swap: إخفاء الآية ← ظهور نص البيت
        setVerseActive(false);
        setVerseExit(true);
        setD3(true);
      }, 1150),
      setTimeout(() => {
        setVerseExit(false);
        setHomeActive(true);
      }, 1300),
      setTimeout(() => setHideAll(true), 2250),
      setTimeout(() => onDone(), 2800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="splash-root" dir="rtl">
      <div className="splash-halo" />

      <div className={`splash-inner${hideAll ? " hide-all" : ""}`}>

        {/* اللوغو */}
        <div className="splash-logo-wrapper">
          <img src="/logo-splash.png" alt="تبيان" />
          <div className="splash-shine" />
        </div>

        {/* النصوص المتناوبة */}
        <div className="splash-text-stage">
          {/* الآية الكريمة */}
          <div className={`splash-text-item${verseActive ? " active" : ""}${verseExit ? " exit" : ""}`}>
            <div className="splash-verse-prefix">قال الله تعالى</div>
            <div className="splash-verse-text">
              ﴿ وَنَزَّلْنَا عَلَيْكَ الْكِتَابَ تِبْيَانًا لِّكُلِّ شَيْءٍ ﴾
            </div>
          </div>

          {/* نص البيت */}
          <div className={`splash-text-item splash-text-home${homeActive ? " active" : ""}`}>
            حلقتك أصبحت في <span>بيتك</span>
          </div>
        </div>

        {/* نقاط التقدم */}
        <div className="splash-dots">
          <div className={`splash-dot${d1 ? " on" : ""}`} />
          <div className={`splash-dot${d2 ? " on" : ""}`} />
          <div className={`splash-dot${d3 ? " on" : ""}`} />
        </div>

        {/* شريط التحميل */}
        <div className="splash-loader" />

        {/* تاغلاين */}
        <div className="splash-tagline">TIBYAN</div>
      </div>
    </div>
  );
}
