import type { JSX, ReactNode } from "react";

/**
 * أيقونات SVG لأقسام التعلم والمستويات — فن متدرّج مستوحى من ألوان الطبيعة:
 * تربة ونبتات حقيقية، سنابل ذهبية، ثمار ناضجة، مصحف أخضر هادئ، وكتب جلدية.
 * التدرجات خفيفة ونظيفة حفاظاً على الأداء، والهوية واحدة في كل البطاقات.
 */
export type SectionIconName =
  | "quran" | "tajweed" | "sharia" | "hifz" | "tilawah" | "qiraat"
  | "camera" | "mosque" | "achievement" | "progress" | "graduation"
  /** أيقونات مستويات القرآن */
  | "seed" | "wheat" | "tree" | "fruit" | "crown"
  /** أيقونات مستويات التجويد */
  | "wave1" | "wave2" | "wave3" | "wave4"
  /** مواد الدروس الشرعية */
  | "scale" | "shield" | "moon";

/* هوية مشتركة */
const GOLD_HI = "#EFD288";
const GOLD_LO = "#B98F2D";
const CREAM = "#F6ECD4";
const GREEN_DEEP = "#1F4435";
const GREEN_MID = "#2F5D49";

const ART: Record<SectionIconName, ReactNode> = {
  /* القرآن الكريم — مصحف خمري واضح بلمسات ذهبية */
  quran: (
    <>
      <defs>
        <linearGradient id="siQuranCover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A02040" />
          <stop offset="1" stopColor="#4C091B" />
        </linearGradient>
        <linearGradient id="siQuranGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F1D27A" />
          <stop offset="1" stopColor="#B8860B" />
        </linearGradient>
      </defs>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2.6" fill="url(#siQuranCover)" stroke="url(#siQuranGold)" strokeWidth="0.9" />
      <path d="M12 4.3v15.4" stroke="url(#siQuranGold)" strokeWidth="0.9" />
      <path d="M7 8h3M7 10.5h3M7 13h3M14 8h3M14 10.5h3M14 13h3" stroke="#F1D27A" strokeWidth="0.75" strokeLinecap="round" opacity="0.9" />
      <path d="M8 16.2h8" stroke="url(#siQuranGold)" strokeWidth="1" strokeLinecap="round" />
    </>
  ),

  /* دروس التجويد — موجات صوت هادئة بلمسات ذهبية */
  tajweed: (
    <>
      <defs>
        <linearGradient id="siTajWave" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#33604F" />
          <stop offset="1" stopColor="#7FA997" />
        </linearGradient>
        <linearGradient id="siTajGold" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={GOLD_LO} />
          <stop offset="1" stopColor={GOLD_HI} />
        </linearGradient>
      </defs>
      <rect x="2.6" y="9.5" width="2.4" height="5" rx="1.2" fill="url(#siTajWave)" opacity="0.7" />
      <rect x="6.8" y="6" width="2.4" height="12" rx="1.2" fill="url(#siTajGold)" />
      <rect x="11" y="3" width="2.4" height="18" rx="1.2" fill="url(#siTajWave)" />
      <rect x="15.2" y="7" width="2.4" height="10" rx="1.2" fill="url(#siTajGold)" opacity="0.9" />
      <rect x="19.4" y="10" width="2.4" height="4" rx="1.2" fill="url(#siTajWave)" opacity="0.55" />
    </>
  ),

  /* الدروس الشرعية — كتاب جلدي بني طبيعي وقلم ذهبي */
  sharia: (
    <>
      <defs>
        <linearGradient id="siShariaBook" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8A6540" />
          <stop offset="1" stopColor="#5E4128" />
        </linearGradient>
        <linearGradient id="siShariaSpine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A87F52" />
          <stop offset="1" stopColor="#77552F" />
        </linearGradient>
        <linearGradient id="siShariaGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={GOLD_HI} />
          <stop offset="1" stopColor={GOLD_LO} />
        </linearGradient>
      </defs>
      <path d="M5 4.2A2.2 2.2 0 0 1 7.2 2H15a1 1 0 0 1 1 1v14H7.2A2.2 2.2 0 0 0 5 19.2z" fill="url(#siShariaBook)" />
      <path d="M5 19.2A2.2 2.2 0 0 1 7.2 17H16v3a1 1 0 0 1-1 1H7.2A2.2 2.2 0 0 1 5 19.2z" fill="url(#siShariaSpine)" />
      <rect x="8" y="6" width="5.5" height="1.5" rx="0.75" fill="#F4E8CF" opacity="0.9" />
      <rect x="8" y="9.2" width="5.5" height="1.5" rx="0.75" fill="#F4E8CF" opacity="0.65" />
      <path d="M16.6 9.4l3.4-3.4a1.5 1.5 0 0 1 2.1 2.1l-3.4 3.4-2.9.8z" fill="url(#siShariaGold)" />
    </>
  ),

  /* حفظ القرآن — مصحف أخضر ونجمة هداية */
  hifz: (
    <>
      <defs>
        <linearGradient id="siHifzCover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={GREEN_MID} />
          <stop offset="1" stopColor={GREEN_DEEP} />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="16" height="16" rx="2.2" fill="url(#siHifzCover)" />
      <rect x="17.2" y="5" width="1.4" height="14" rx="0.7" fill={CREAM} opacity="0.9" />
      <rect x="7.2" y="8" width="7" height="1.4" rx="0.7" fill={CREAM} opacity="0.85" />
      <rect x="7.2" y="11" width="7" height="1.4" rx="0.7" fill={CREAM} opacity="0.6" />
      <rect x="7.2" y="14" width="4.6" height="1.4" rx="0.7" fill={CREAM} opacity="0.45" />
    </>
  ),

  /* تصحيح التلاوة — مايك بتدرج دافئ وموجة ذهبية */
  tilawah: (
    <>
      <defs>
        <linearGradient id="siTilMic" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9A2A44" />
          <stop offset="1" stopColor="#5E1424" />
        </linearGradient>
        <linearGradient id="siTilGold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={GOLD_LO} />
          <stop offset="1" stopColor={GOLD_HI} />
        </linearGradient>
      </defs>
      <rect x="9" y="2.2" width="6" height="11" rx="3" fill="url(#siTilMic)" />
      <rect x="10.2" y="4" width="3.6" height="1" rx="0.5" fill={CREAM} opacity="0.35" />
      <rect x="10.2" y="6" width="3.6" height="1" rx="0.5" fill={CREAM} opacity="0.25" />
      <path d="M5.6 11.2a6.4 6.4 0 0 0 12.8 0" fill="none" stroke="url(#siTilGold)" strokeWidth="1.9" strokeLinecap="round" />
      <rect x="11.2" y="17.4" width="1.6" height="3.2" rx="0.8" fill="url(#siTilMic)" />
      <rect x="8.2" y="20.4" width="7.6" height="1.6" rx="0.8" fill="url(#siTilMic)" />
    </>
  ),

  /* القراءات — صفحات بيج متعددة بإطار ذهبي */
  qiraat: (
    <>
      <defs>
        <linearGradient id="siQirPage" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={CREAM} />
          <stop offset="1" stopColor="#E2CDA4" />
        </linearGradient>
        <linearGradient id="siQirGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={GOLD_HI} />
          <stop offset="1" stopColor={GOLD_LO} />
        </linearGradient>
        <linearGradient id="siQirCover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={GREEN_MID} />
          <stop offset="1" stopColor={GREEN_DEEP} />
        </linearGradient>
      </defs>
      <rect x="4.5" y="3.5" width="11.5" height="15.5" rx="2" fill="url(#siQirGold)" opacity="0.55" transform="rotate(7 10 11)" />
      <rect x="7.5" y="4.5" width="12" height="16" rx="2" fill="url(#siQirCover)" transform="rotate(-3 13 12)" />
      <rect x="10.3" y="8" width="6.4" height="1.4" rx="0.7" fill="url(#siQirPage)" transform="rotate(-3 13 12)" />
      <rect x="10.6" y="11" width="6.4" height="1.4" rx="0.7" fill="url(#siQirPage)" opacity="0.75" transform="rotate(-3 13 12)" />
      <rect x="10.9" y="14" width="4.2" height="1.4" rx="0.7" fill="url(#siQirPage)" opacity="0.55" transform="rotate(-3 13 12)" />
    </>
  ),

  /* اختبار القبول — كاميرا بتدرج عنبري */
  camera: (
    <>
      <defs>
        <linearGradient id="siCamBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9A2A44" />
          <stop offset="1" stopColor="#5E1424" />
        </linearGradient>
        <linearGradient id="siCamGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={GOLD_HI} />
          <stop offset="1" stopColor={GOLD_LO} />
        </linearGradient>
      </defs>
      <rect x="2.5" y="7" width="14" height="10.5" rx="2.6" fill="url(#siCamBody)" />
      <path d="M16.5 10.4l4.6-2.6a.7.7 0 0 1 1 .6v7.7a.7.7 0 0 1-1 .6l-4.6-2.6z" fill="url(#siCamGold)" />
      <circle cx="9.5" cy="12.2" r="3" fill="#B84360" />
      <circle cx="9.5" cy="12.2" r="1.5" fill={CREAM} />
      <circle cx="14.3" cy="9.6" r="0.9" fill="url(#siCamGold)" />
    </>
  ),

  /* مسجد — حجر رملي طبيعي وقبة خضراء وهلال ذهبي */
  mosque: (
    <>
      <defs>
        <linearGradient id="siMosqueDome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3E7A5E" />
          <stop offset="1" stopColor={GREEN_DEEP} />
        </linearGradient>
        <linearGradient id="siMosqueWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D9BE8E" />
          <stop offset="1" stopColor="#B39456" />
        </linearGradient>
        <linearGradient id="siMosqueGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={GOLD_HI} />
          <stop offset="1" stopColor={GOLD_LO} />
        </linearGradient>
      </defs>
      <path d="M12 5.2c2.6 1.6 4.2 3.4 4.2 5.6h-8.4c0-2.2 1.6-4 4.2-5.6z" fill="url(#siMosqueDome)" />
      <rect x="6.4" y="10.8" width="11.2" height="8.2" rx="1.4" fill="url(#siMosqueWall)" />
      <rect x="18.6" y="4.5" width="2.2" height="14.5" rx="1.1" fill="url(#siMosqueDome)" />
      <path d="M17.9 4.5h3.6l-1.8-2z" fill="url(#siMosqueGold)" />
      <path d="M10.4 19v-3.4a1.6 1.6 0 0 1 3.2 0V19z" fill="url(#siMosqueGold)" />
      <path d="M12 4.6a1.5 1.5 0 1 1 1.1-2.5 1.1 1.1 0 1 0-1.1 2.5z" fill="url(#siMosqueGold)" />
    </>
  ),

  /* إنجاز — وسام ذهبي بشريط عنبري */
  achievement: (
    <>
      <defs>
        <linearGradient id="siAchMedal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2DC92" />
          <stop offset="0.55" stopColor="#D9B44A" />
          <stop offset="1" stopColor="#A87F22" />
        </linearGradient>
        <linearGradient id="siAchRibbon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9A2A44" />
          <stop offset="1" stopColor="#5E1424" />
        </linearGradient>
      </defs>
      <path d="M8.5 2.5h7l-1.4 6H9.9z" fill="url(#siAchRibbon)" />
      <circle cx="12" cy="13.5" r="6.4" fill="url(#siAchMedal)" />
      <circle cx="12" cy="13.5" r="4.6" fill="#CBA13C" />
      <path d="M12 10.6l2.3 2.9-2.3 2.9-2.3-2.9z" fill={CREAM} />
    </>
  ),

  /* تقدم — أعمدة خضراء وذهبية صاعدة */
  progress: (
    <>
      <defs>
        <linearGradient id="siProgGreen" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={GREEN_DEEP} />
          <stop offset="1" stopColor="#5E8F6E" />
        </linearGradient>
        <linearGradient id="siProgGold" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={GOLD_LO} />
          <stop offset="1" stopColor={GOLD_HI} />
        </linearGradient>
      </defs>
      <rect x="3.5" y="13" width="3.6" height="7.5" rx="1.4" fill="url(#siProgGreen)" />
      <rect x="9.2" y="9.5" width="3.6" height="11" rx="1.4" fill="url(#siProgGold)" />
      <rect x="14.9" y="6" width="3.6" height="14.5" rx="1.4" fill="url(#siProgGreen)" />
      <path d="M3.5 8.5L11 4l4 2.2 5.5-3.2" fill="none" stroke="url(#siProgGold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.5 3l.4 3-3-.4z" fill="url(#siProgGold)" />
    </>
  ),

  /* تخرج — قبعة خضراء داكنة بشرابة ذهبية */
  graduation: (
    <>
      <defs>
        <linearGradient id="siGradCap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2F5D49" />
          <stop offset="1" stopColor="#183328" />
        </linearGradient>
        <linearGradient id="siGradGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={GOLD_HI} />
          <stop offset="1" stopColor={GOLD_LO} />
        </linearGradient>
      </defs>
      <path d="M12 4.2L2.8 8.4 12 12.6l9.2-4.2z" fill="url(#siGradCap)" />
      <path d="M6.6 10.6v4.2c0 1.6 2.4 2.9 5.4 2.9s5.4-1.3 5.4-2.9v-4.2l-5.4 2.5z" fill="#24513F" />
      <path d="M20 8.6v5.4" stroke="url(#siGradGold)" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="20" cy="15.4" r="1.5" fill="url(#siGradGold)" />
    </>
  ),

  /* ── مستويات القرآن ─────────────────────────────────────────────── */

  /* الغرس — برعم يانع ينبت من تربة حقيقية بضوء صباحي */
  seed: (
    <>
      <defs>
        <linearGradient id="siSeedSoil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8A6844" />
          <stop offset="1" stopColor="#5D4229" />
        </linearGradient>
        <linearGradient id="siSeedLeaf" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#3E6B4F" />
          <stop offset="1" stopColor="#7FA98A" />
        </linearGradient>
        <linearGradient id="siSeedLeaf2" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#4C7A5B" />
          <stop offset="1" stopColor="#95BC9B" />
        </linearGradient>
        <linearGradient id="siSeedStem" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#4C7A5B" />
          <stop offset="1" stopColor="#86B28C" />
        </linearGradient>
        <radialGradient id="siSeedGlow" cx="0.5" cy="0.35" r="0.65">
          <stop offset="0" stopColor="#F2E3B3" stopOpacity="0.9" />
          <stop offset="1" stopColor="#F2E3B3" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="10" r="7.5" fill="url(#siSeedGlow)" />
      <path d="M4 21c1.6-2.4 4.6-3.4 8-3.4s6.4 1 8 3.4z" fill="url(#siSeedSoil)" />
      <path d="M12 18.5v-8" stroke="url(#siSeedStem)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11.2 14.5c-1.2-2.6-4.8-3.2-6-1.8.8 2.6 3.8 3 6 2.6z" fill="url(#siSeedLeaf)" />
      <path d="M12.8 12c1.2-2.6 4.8-3.2 6-1.8-.8 2.6-3.8 3-6 2.6z" fill="url(#siSeedLeaf2)" />
      <circle cx="12" cy="8.4" r="1.5" fill="#E9CF8F" />
    </>
  ),

  /* السنبلة — سنبلة قمح ناضجة بتدرجات الحقول مع الشوكة */
  wheat: (
    <>
      <defs>
        <linearGradient id="siWheatGrain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EFD288" />
          <stop offset="1" stopColor="#C1913A" />
        </linearGradient>
        <linearGradient id="siWheatGrain2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E0BA62" />
          <stop offset="1" stopColor="#A87B2C" />
        </linearGradient>
        <linearGradient id="siWheatStem" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#7C6F38" />
          <stop offset="1" stopColor="#A39451" />
        </linearGradient>
      </defs>
      <path d="M12 21.5V9" stroke="url(#siWheatStem)" strokeWidth="1.9" strokeLinecap="round" />
      <ellipse cx="9.1" cy="9.8" rx="2.5" ry="1.35" fill="url(#siWheatGrain)" transform="rotate(-35 9.1 9.8)" />
      <ellipse cx="14.9" cy="9.8" rx="2.5" ry="1.35" fill="url(#siWheatGrain)" transform="rotate(35 14.9 9.8)" />
      <ellipse cx="9.2" cy="13.2" rx="2.3" ry="1.25" fill="url(#siWheatGrain2)" transform="rotate(-25 9.2 13.2)" />
      <ellipse cx="14.8" cy="13.2" rx="2.3" ry="1.25" fill="url(#siWheatGrain2)" transform="rotate(25 14.8 13.2)" />
      <ellipse cx="9.5" cy="16.6" rx="2.1" ry="1.15" fill="url(#siWheatGrain)" opacity="0.8" transform="rotate(-18 9.5 16.6)" />
      <ellipse cx="14.5" cy="16.6" rx="2.1" ry="1.15" fill="url(#siWheatGrain)" opacity="0.8" transform="rotate(18 14.5 16.6)" />
      <ellipse cx="12" cy="6.4" rx="1.7" ry="2.4" fill="url(#siWheatGrain)" />
      <path d="M10.4 4.6l-1-2M12 4.2V2M13.6 4.6l1-2" stroke="url(#siWheatStem)" strokeWidth="0.9" strokeLinecap="round" />
    </>
  ),

  /* النماء — شجرة بخضرة طبيعية متدرجة وجذع بني */
  tree: (
    <>
      <defs>
        <linearGradient id="siTreeLeaf" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#2F5B41" />
          <stop offset="1" stopColor="#6E9A6B" />
        </linearGradient>
        <linearGradient id="siTreeLeaf2" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#3E6B4C" />
          <stop offset="1" stopColor="#8BAF7D" />
        </linearGradient>
        <linearGradient id="siTreeTrunk" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#6B4A2E" />
          <stop offset="1" stopColor="#8F6B42" />
        </linearGradient>
      </defs>
      <ellipse cx="12" cy="21.4" rx="5" ry="1" fill="#6B4A2E" opacity="0.3" />
      <rect x="10.9" y="15" width="2.2" height="6.5" rx="1.1" fill="url(#siTreeTrunk)" />
      <path d="M4.6 17l7.4-6.4 7.4 6.4z" fill="url(#siTreeLeaf)" />
      <path d="M6.6 12.6l5.4-5.4 5.4 5.4z" fill="url(#siTreeLeaf2)" />
      <path d="M8.6 8.2l3.4-4 3.4 4z" fill="url(#siTreeLeaf)" />
    </>
  ),

  /* الثمرة — رمانة ناضجة بتدرج أحمر دافئ وورقة طبيعية */
  fruit: (
    <>
      <defs>
        <radialGradient id="siFruitBody" cx="0.38" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#E98A5F" />
          <stop offset="0.55" stopColor="#C94435" />
          <stop offset="1" stopColor="#8C2B22" />
        </radialGradient>
        <linearGradient id="siFruitLeaf" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#3E6B4F" />
          <stop offset="1" stopColor="#7FA98A" />
        </linearGradient>
      </defs>
      <path d="M10.6 5.4l-1.2-2.1 1.9.6.7-1.6.7 1.6 1.9-.6-1.2 2.1z" fill="#8C2B22" />
      <ellipse cx="12" cy="13.6" rx="6.4" ry="6.9" fill="url(#siFruitBody)" />
      <ellipse cx="9.8" cy="11.2" rx="1.7" ry="1.1" fill="#F6D9C4" opacity="0.55" transform="rotate(-20 9.8 11.2)" />
      <path d="M14.5 6.2c.8-1.3 2.7-1.6 3.6-.9-.8 1.3-2.7 1.6-3.6.9z" fill="url(#siFruitLeaf)" />
    </>
  ),

  /* الوارثون — تاج ذهبي فاخر بلمعة طبيعية */
  crown: (
    <>
      <defs>
        <linearGradient id="siCrownGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2DC92" />
          <stop offset="0.55" stopColor="#D9B44A" />
          <stop offset="1" stopColor="#A87F22" />
        </linearGradient>
        <linearGradient id="siCrownBase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#CBA13C" />
          <stop offset="1" stopColor="#96701D" />
        </linearGradient>
      </defs>
      <path d="M3.5 16.8L6 8.3l4.5 5.4L12 6.8l1.5 6.9L18 8.3l2.5 8.5z" fill="url(#siCrownGold)" />
      <rect x="3.5" y="16.8" width="17" height="3.4" rx="1.2" fill="url(#siCrownBase)" />
      <circle cx="12" cy="5.4" r="1.7" fill="url(#siCrownGold)" />
      <circle cx="5.2" cy="7.2" r="1.3" fill="url(#siCrownGold)" opacity="0.9" />
      <circle cx="18.8" cy="7.2" r="1.3" fill="url(#siCrownGold)" opacity="0.9" />
      <circle cx="12" cy="18.5" r="1" fill="#7A2E2E" opacity="0.85" />
    </>
  ),

  /* ── مستويات التجويد ────────────────────────────────────────────── */

  /* التجويد الأساسي — ثلاثة أعمدة متساوية هادئة */
  wave1: (
    <>
      <defs>
        <linearGradient id="siW1Green" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#33604F" />
          <stop offset="1" stopColor="#7FA997" />
        </linearGradient>
        <linearGradient id="siW1Gold" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={GOLD_LO} />
          <stop offset="1" stopColor={GOLD_HI} />
        </linearGradient>
      </defs>
      <rect x="3.5" y="8" width="4.5" height="12" rx="2.2" fill="url(#siW1Green)" />
      <rect x="9.8" y="8" width="4.5" height="12" rx="2.2" fill="url(#siW1Gold)" />
      <rect x="16" y="8" width="4.5" height="12" rx="2.2" fill="url(#siW1Green)" />
    </>
  ),

  /* التجويد المتوسط — أعمدة متدرجة مع خط تصاعدي */
  wave2: (
    <>
      <defs>
        <linearGradient id="siW2Green" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#33604F" />
          <stop offset="1" stopColor="#7FA997" />
        </linearGradient>
        <linearGradient id="siW2Gold" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={GOLD_LO} />
          <stop offset="1" stopColor={GOLD_HI} />
        </linearGradient>
      </defs>
      <rect x="3" y="12" width="4" height="9" rx="2" fill="url(#siW2Green)" />
      <rect x="10" y="7.5" width="4" height="13.5" rx="2" fill="url(#siW2Gold)" />
      <rect x="17" y="10" width="4" height="11" rx="2" fill="url(#siW2Green)" />
      <path d="M5 11 L12 6 L19 8.5" fill="none" stroke="url(#siW2Gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  /* التجويد المتقدم — منحنى موجي متعقد مع أعمدة */
  wave3: (
    <>
      <defs>
        <linearGradient id="siW3Green" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#33604F" />
          <stop offset="1" stopColor="#7FA997" />
        </linearGradient>
        <linearGradient id="siW3Gold" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={GOLD_LO} />
          <stop offset="1" stopColor={GOLD_HI} />
        </linearGradient>
      </defs>
      <rect x="1.5" y="14.5" width="3" height="7" rx="1.5" fill="url(#siW3Green)" />
      <rect x="6.5" y="10" width="3" height="11.5" rx="1.5" fill="url(#siW3Gold)" />
      <rect x="11.5" y="6" width="3" height="15.5" rx="1.5" fill="url(#siW3Green)" />
      <rect x="16.5" y="9.5" width="3" height="12" rx="1.5" fill="url(#siW3Gold)" opacity="0.8" />
      <rect x="21" y="13" width="2.8" height="8.5" rx="1.4" fill="url(#siW3Green)" opacity="0.6" />
      <path d="M3 13.5 L8 8.5 L13 4.5 L18 8 L22.5 11.5" fill="none" stroke="url(#siW3Gold)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  /* إتقان التجويد — موجة مكتملة بعلامة إتقان */
  wave4: (
    <>
      <defs>
        <linearGradient id="siW4Green" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#33604F" />
          <stop offset="1" stopColor="#7FA997" />
        </linearGradient>
        <linearGradient id="siW4Gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2DC92" />
          <stop offset="1" stopColor="#A87F22" />
        </linearGradient>
      </defs>
      <rect x="2.5" y="13" width="3" height="8" rx="1.5" fill="url(#siW4Green)" opacity="0.7" />
      <rect x="7" y="9.5" width="3" height="11.5" rx="1.5" fill="url(#siW4Green)" />
      <rect x="11.5" y="6.5" width="3" height="14.5" rx="1.5" fill="url(#siW4Green)" />
      <path d="M15.9 12.2a4 4 0 1 1 8 0 4 4 0 0 1-8 0" fill="url(#siW4Gold)" />
      <path d="M17.9 12.2l1.3 1.3 2.4-2.5" fill="none" stroke="#FFF8E6" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  /* ── مواد الدروس الشرعية ─────────────────────────────────────────── */

  /* الفقه — ميزان ذهبي متوازن */
  scale: (
    <>
      <defs>
        <linearGradient id="siScaleGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={GOLD_HI} />
          <stop offset="1" stopColor={GOLD_LO} />
        </linearGradient>
        <linearGradient id="siScalePan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E0BA62" />
          <stop offset="1" stopColor="#A87B2C" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="3.6" r="1.1" fill="url(#siScaleGold)" />
      <path d="M5 6.5h14M12 4.5v13.5M8.5 20.5h7" stroke="url(#siScaleGold)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 6.5l-2.2 5.5h4.4z" fill="url(#siScalePan)" />
      <path d="M2.6 12a2.6 2.6 0 0 0 5.2 0z" fill="url(#siScalePan)" />
      <path d="M19 6.5l-2.2 5.5h4.4z" fill="url(#siScalePan)" />
      <path d="M16.6 12a2.6 2.6 0 0 0 5.2 0z" fill="url(#siScalePan)" />
    </>
  ),

  /* العقيدة — درع الإيمان بمعيّن هداية */
  shield: (
    <>
      <defs>
        <linearGradient id="siShieldBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9A2A44" />
          <stop offset="1" stopColor="#5E1424" />
        </linearGradient>
        <linearGradient id="siShieldGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={GOLD_HI} />
          <stop offset="1" stopColor={GOLD_LO} />
        </linearGradient>
      </defs>
      <path d="M12 2.5l7.5 3v5.2c0 4.6-3.2 7.6-7.5 8.8-4.3-1.2-7.5-4.2-7.5-8.8V5.5z" fill="url(#siShieldBody)" />
      <path d="M12 4.3l5.9 2.35v4c0 3.6-2.5 6-5.9 7z" fill="url(#siShieldGold)" opacity="0.25" />
      <path d="M12 7.6l2.5 3.2-2.5 3.2-2.5-3.2z" fill="url(#siShieldGold)" />
    </>
  ),

  /* السيرة النبوية — هلال ومعيّن بلمعة فجرية */
  moon: (
    <>
      <defs>
        <linearGradient id="siMoonGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2DC92" />
          <stop offset="1" stopColor="#B98F2D" />
        </linearGradient>
      </defs>
      <path d="M19.5 13.5A8 8 0 1 1 10.5 4.5a6.3 6.3 0 0 0 9 9z" fill="url(#siMoonGold)" />
      <path d="M16.6 4.9l1.5 1.9-1.5 1.9-1.5-1.9z" fill="url(#siMoonGold)" />
    </>
  ),
};

const PLANT_ICONS: ReadonlySet<string> = new Set(["seed", "wheat", "tree", "fruit"]);

export default function SectionIcon({ name, size = 40, className }: { name: SectionIconName; size?: number; className?: string }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={["section-icon", className].filter(Boolean).join(" ")} data-plant={PLANT_ICONS.has(name) || undefined} aria-hidden="true">
      {ART[name]}
    </svg>
  );
}
