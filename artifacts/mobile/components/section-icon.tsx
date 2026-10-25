import type { ReactNode } from "react";
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Path, Circle, Ellipse } from "react-native-svg";

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
      <Defs>
        <LinearGradient id="siQuranCover" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#A02040" />
          <Stop offset="1" stopColor="#4C091B" />
        </LinearGradient>
        <LinearGradient id="siQuranGold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F1D27A" />
          <Stop offset="1" stopColor="#B8860B" />
        </LinearGradient>
      </Defs>
      <Rect x="4.5" y="3.5" width="15" height="17" rx="2.6" fill="url(#siQuranCover)" stroke="url(#siQuranGold)" strokeWidth="0.9" />
      <Path d="M12 4.3v15.4" stroke="url(#siQuranGold)" strokeWidth="0.9" />
      <Path d="M7 8h3M7 10.5h3M7 13h3M14 8h3M14 10.5h3M14 13h3" stroke="#F1D27A" strokeWidth="0.75" strokeLinecap="round" opacity="0.9" />
      <Path d="M8 16.2h8" stroke="url(#siQuranGold)" strokeWidth="1" strokeLinecap="round" />
    </>
  ),

  /* دروس التجويد — موجات صوت هادئة بلمسات ذهبية */
  tajweed: (
    <>
      <Defs>
        <LinearGradient id="siTajWave" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#33604F" />
          <Stop offset="1" stopColor="#7FA997" />
        </LinearGradient>
        <LinearGradient id="siTajGold" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={GOLD_LO} />
          <Stop offset="1" stopColor={GOLD_HI} />
        </LinearGradient>
      </Defs>
      <Rect x="2.6" y="9.5" width="2.4" height="5" rx="1.2" fill="url(#siTajWave)" opacity="0.7" />
      <Rect x="6.8" y="6" width="2.4" height="12" rx="1.2" fill="url(#siTajGold)" />
      <Rect x="11" y="3" width="2.4" height="18" rx="1.2" fill="url(#siTajWave)" />
      <Rect x="15.2" y="7" width="2.4" height="10" rx="1.2" fill="url(#siTajGold)" opacity="0.9" />
      <Rect x="19.4" y="10" width="2.4" height="4" rx="1.2" fill="url(#siTajWave)" opacity="0.55" />
    </>
  ),

  /* الدروس الشرعية — كتاب جلدي بني طبيعي وقلم ذهبي */
  sharia: (
    <>
      <Defs>
        <LinearGradient id="siShariaBook" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#8A6540" />
          <Stop offset="1" stopColor="#5E4128" />
        </LinearGradient>
        <LinearGradient id="siShariaSpine" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#A87F52" />
          <Stop offset="1" stopColor="#77552F" />
        </LinearGradient>
        <LinearGradient id="siShariaGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={GOLD_HI} />
          <Stop offset="1" stopColor={GOLD_LO} />
        </LinearGradient>
      </Defs>
      <Path d="M5 4.2A2.2 2.2 0 0 1 7.2 2H15a1 1 0 0 1 1 1v14H7.2A2.2 2.2 0 0 0 5 19.2z" fill="url(#siShariaBook)" />
      <Path d="M5 19.2A2.2 2.2 0 0 1 7.2 17H16v3a1 1 0 0 1-1 1H7.2A2.2 2.2 0 0 1 5 19.2z" fill="url(#siShariaSpine)" />
      <Rect x="8" y="6" width="5.5" height="1.5" rx="0.75" fill="#F4E8CF" opacity="0.9" />
      <Rect x="8" y="9.2" width="5.5" height="1.5" rx="0.75" fill="#F4E8CF" opacity="0.65" />
      <Path d="M16.6 9.4l3.4-3.4a1.5 1.5 0 0 1 2.1 2.1l-3.4 3.4-2.9.8z" fill="url(#siShariaGold)" />
    </>
  ),

  /* حفظ القرآن — مصحف أخضر ونجمة هداية */
  hifz: (
    <>
      <Defs>
        <LinearGradient id="siHifzCover" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={GREEN_MID} />
          <Stop offset="1" stopColor={GREEN_DEEP} />
        </LinearGradient>
      </Defs>
      <Rect x="4" y="4" width="16" height="16" rx="2.2" fill="url(#siHifzCover)" />
      <Rect x="17.2" y="5" width="1.4" height="14" rx="0.7" fill={CREAM} opacity="0.9" />
      <Rect x="7.2" y="8" width="7" height="1.4" rx="0.7" fill={CREAM} opacity="0.85" />
      <Rect x="7.2" y="11" width="7" height="1.4" rx="0.7" fill={CREAM} opacity="0.6" />
      <Rect x="7.2" y="14" width="4.6" height="1.4" rx="0.7" fill={CREAM} opacity="0.45" />
    </>
  ),

  /* تصحيح التلاوة — مايك بتدرج دافئ وموجة ذهبية */
  tilawah: (
    <>
      <Defs>
        <LinearGradient id="siTilMic" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#9A2A44" />
          <Stop offset="1" stopColor="#5E1424" />
        </LinearGradient>
        <LinearGradient id="siTilGold" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={GOLD_LO} />
          <Stop offset="1" stopColor={GOLD_HI} />
        </LinearGradient>
      </Defs>
      <Rect x="9" y="2.2" width="6" height="11" rx="3" fill="url(#siTilMic)" />
      <Rect x="10.2" y="4" width="3.6" height="1" rx="0.5" fill={CREAM} opacity="0.35" />
      <Rect x="10.2" y="6" width="3.6" height="1" rx="0.5" fill={CREAM} opacity="0.25" />
      <Path d="M5.6 11.2a6.4 6.4 0 0 0 12.8 0" fill="none" stroke="url(#siTilGold)" strokeWidth="1.9" strokeLinecap="round" />
      <Rect x="11.2" y="17.4" width="1.6" height="3.2" rx="0.8" fill="url(#siTilMic)" />
      <Rect x="8.2" y="20.4" width="7.6" height="1.6" rx="0.8" fill="url(#siTilMic)" />
    </>
  ),

  /* القراءات — صفحات بيج متعددة بإطار ذهبي */
  qiraat: (
    <>
      <Defs>
        <LinearGradient id="siQirPage" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={CREAM} />
          <Stop offset="1" stopColor="#E2CDA4" />
        </LinearGradient>
        <LinearGradient id="siQirGold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={GOLD_HI} />
          <Stop offset="1" stopColor={GOLD_LO} />
        </LinearGradient>
        <LinearGradient id="siQirCover" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={GREEN_MID} />
          <Stop offset="1" stopColor={GREEN_DEEP} />
        </LinearGradient>
      </Defs>
      <Rect x="4.5" y="3.5" width="11.5" height="15.5" rx="2" fill="url(#siQirGold)" opacity="0.55" transform="rotate(7 10 11)" />
      <Rect x="7.5" y="4.5" width="12" height="16" rx="2" fill="url(#siQirCover)" transform="rotate(-3 13 12)" />
      <Rect x="10.3" y="8" width="6.4" height="1.4" rx="0.7" fill="url(#siQirPage)" transform="rotate(-3 13 12)" />
      <Rect x="10.6" y="11" width="6.4" height="1.4" rx="0.7" fill="url(#siQirPage)" opacity="0.75" transform="rotate(-3 13 12)" />
      <Rect x="10.9" y="14" width="4.2" height="1.4" rx="0.7" fill="url(#siQirPage)" opacity="0.55" transform="rotate(-3 13 12)" />
    </>
  ),

  /* اختبار القبول — كاميرا بتدرج عنبري */
  camera: (
    <>
      <Defs>
        <LinearGradient id="siCamBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#9A2A44" />
          <Stop offset="1" stopColor="#5E1424" />
        </LinearGradient>
        <LinearGradient id="siCamGold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={GOLD_HI} />
          <Stop offset="1" stopColor={GOLD_LO} />
        </LinearGradient>
      </Defs>
      <Rect x="2.5" y="7" width="14" height="10.5" rx="2.6" fill="url(#siCamBody)" />
      <Path d="M16.5 10.4l4.6-2.6a.7.7 0 0 1 1 .6v7.7a.7.7 0 0 1-1 .6l-4.6-2.6z" fill="url(#siCamGold)" />
      <Circle cx="9.5" cy="12.2" r="3" fill="#B84360" />
      <Circle cx="9.5" cy="12.2" r="1.5" fill={CREAM} />
      <Circle cx="14.3" cy="9.6" r="0.9" fill="url(#siCamGold)" />
    </>
  ),

  /* مسجد — حجر رملي طبيعي وقبة خضراء وهلال ذهبي */
  mosque: (
    <>
      <Defs>
        <LinearGradient id="siMosqueDome" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3E7A5E" />
          <Stop offset="1" stopColor={GREEN_DEEP} />
        </LinearGradient>
        <LinearGradient id="siMosqueWall" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#D9BE8E" />
          <Stop offset="1" stopColor="#B39456" />
        </LinearGradient>
        <LinearGradient id="siMosqueGold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={GOLD_HI} />
          <Stop offset="1" stopColor={GOLD_LO} />
        </LinearGradient>
      </Defs>
      <Path d="M12 5.2c2.6 1.6 4.2 3.4 4.2 5.6h-8.4c0-2.2 1.6-4 4.2-5.6z" fill="url(#siMosqueDome)" />
      <Rect x="6.4" y="10.8" width="11.2" height="8.2" rx="1.4" fill="url(#siMosqueWall)" />
      <Rect x="18.6" y="4.5" width="2.2" height="14.5" rx="1.1" fill="url(#siMosqueDome)" />
      <Path d="M17.9 4.5h3.6l-1.8-2z" fill="url(#siMosqueGold)" />
      <Path d="M10.4 19v-3.4a1.6 1.6 0 0 1 3.2 0V19z" fill="url(#siMosqueGold)" />
      <Path d="M12 4.6a1.5 1.5 0 1 1 1.1-2.5 1.1 1.1 0 1 0-1.1 2.5z" fill="url(#siMosqueGold)" />
    </>
  ),

  /* إنجاز — وسام ذهبي بشريط عنبري */
  achievement: (
    <>
      <Defs>
        <LinearGradient id="siAchMedal" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F2DC92" />
          <Stop offset="0.55" stopColor="#D9B44A" />
          <Stop offset="1" stopColor="#A87F22" />
        </LinearGradient>
        <LinearGradient id="siAchRibbon" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#9A2A44" />
          <Stop offset="1" stopColor="#5E1424" />
        </LinearGradient>
      </Defs>
      <Path d="M8.5 2.5h7l-1.4 6H9.9z" fill="url(#siAchRibbon)" />
      <Circle cx="12" cy="13.5" r="6.4" fill="url(#siAchMedal)" />
      <Circle cx="12" cy="13.5" r="4.6" fill="#CBA13C" />
      <Path d="M12 10.6l2.3 2.9-2.3 2.9-2.3-2.9z" fill={CREAM} />
    </>
  ),

  /* تقدم — أعمدة خضراء وذهبية صاعدة */
  progress: (
    <>
      <Defs>
        <LinearGradient id="siProgGreen" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={GREEN_DEEP} />
          <Stop offset="1" stopColor="#5E8F6E" />
        </LinearGradient>
        <LinearGradient id="siProgGold" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={GOLD_LO} />
          <Stop offset="1" stopColor={GOLD_HI} />
        </LinearGradient>
      </Defs>
      <Rect x="3.5" y="13" width="3.6" height="7.5" rx="1.4" fill="url(#siProgGreen)" />
      <Rect x="9.2" y="9.5" width="3.6" height="11" rx="1.4" fill="url(#siProgGold)" />
      <Rect x="14.9" y="6" width="3.6" height="14.5" rx="1.4" fill="url(#siProgGreen)" />
      <Path d="M3.5 8.5L11 4l4 2.2 5.5-3.2" fill="none" stroke="url(#siProgGold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20.5 3l.4 3-3-.4z" fill="url(#siProgGold)" />
    </>
  ),

  /* تخرج — قبعة خضراء داكنة بشرابة ذهبية */
  graduation: (
    <>
      <Defs>
        <LinearGradient id="siGradCap" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2F5D49" />
          <Stop offset="1" stopColor="#183328" />
        </LinearGradient>
        <LinearGradient id="siGradGold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={GOLD_HI} />
          <Stop offset="1" stopColor={GOLD_LO} />
        </LinearGradient>
      </Defs>
      <Path d="M12 4.2L2.8 8.4 12 12.6l9.2-4.2z" fill="url(#siGradCap)" />
      <Path d="M6.6 10.6v4.2c0 1.6 2.4 2.9 5.4 2.9s5.4-1.3 5.4-2.9v-4.2l-5.4 2.5z" fill="#24513F" />
      <Path d="M20 8.6v5.4" stroke="url(#siGradGold)" strokeWidth="1.4" strokeLinecap="round" />
      <Circle cx="20" cy="15.4" r="1.5" fill="url(#siGradGold)" />
    </>
  ),

  /* ── مستويات القرآن ─────────────────────────────────────────────── */

  /* الغرس — برعم يانع ينبت من تربة حقيقية بضوء صباحي */
  seed: (
    <>
      <Defs>
        <LinearGradient id="siSeedSoil" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8A6844" />
          <Stop offset="1" stopColor="#5D4229" />
        </LinearGradient>
        <LinearGradient id="siSeedLeaf" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#3E6B4F" />
          <Stop offset="1" stopColor="#7FA98A" />
        </LinearGradient>
        <LinearGradient id="siSeedLeaf2" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#4C7A5B" />
          <Stop offset="1" stopColor="#95BC9B" />
        </LinearGradient>
        <LinearGradient id="siSeedStem" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#4C7A5B" />
          <Stop offset="1" stopColor="#86B28C" />
        </LinearGradient>
        <RadialGradient id="siSeedGlow" cx="0.5" cy="0.35" r="0.65">
          <Stop offset="0" stopColor="#F2E3B3" stopOpacity="0.9" />
          <Stop offset="1" stopColor="#F2E3B3" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="12" cy="10" r="7.5" fill="url(#siSeedGlow)" />
      <Path d="M4 21c1.6-2.4 4.6-3.4 8-3.4s6.4 1 8 3.4z" fill="url(#siSeedSoil)" />
      <Path d="M12 18.5v-8" stroke="url(#siSeedStem)" strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M11.2 14.5c-1.2-2.6-4.8-3.2-6-1.8.8 2.6 3.8 3 6 2.6z" fill="url(#siSeedLeaf)" />
      <Path d="M12.8 12c1.2-2.6 4.8-3.2 6-1.8-.8 2.6-3.8 3-6 2.6z" fill="url(#siSeedLeaf2)" />
      <Circle cx="12" cy="8.4" r="1.5" fill="#E9CF8F" />
    </>
  ),

  /* السنبلة — سنبلة قمح ناضجة بتدرجات الحقول مع الشوكة */
  wheat: (
    <>
      <Defs>
        <LinearGradient id="siWheatGrain" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#EFD288" />
          <Stop offset="1" stopColor="#C1913A" />
        </LinearGradient>
        <LinearGradient id="siWheatGrain2" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#E0BA62" />
          <Stop offset="1" stopColor="#A87B2C" />
        </LinearGradient>
        <LinearGradient id="siWheatStem" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#7C6F38" />
          <Stop offset="1" stopColor="#A39451" />
        </LinearGradient>
      </Defs>
      <Path d="M12 21.5V9" stroke="url(#siWheatStem)" strokeWidth="1.9" strokeLinecap="round" />
      <Ellipse cx="9.1" cy="9.8" rx="2.5" ry="1.35" fill="url(#siWheatGrain)" transform="rotate(-35 9.1 9.8)" />
      <Ellipse cx="14.9" cy="9.8" rx="2.5" ry="1.35" fill="url(#siWheatGrain)" transform="rotate(35 14.9 9.8)" />
      <Ellipse cx="9.2" cy="13.2" rx="2.3" ry="1.25" fill="url(#siWheatGrain2)" transform="rotate(-25 9.2 13.2)" />
      <Ellipse cx="14.8" cy="13.2" rx="2.3" ry="1.25" fill="url(#siWheatGrain2)" transform="rotate(25 14.8 13.2)" />
      <Ellipse cx="9.5" cy="16.6" rx="2.1" ry="1.15" fill="url(#siWheatGrain)" opacity="0.8" transform="rotate(-18 9.5 16.6)" />
      <Ellipse cx="14.5" cy="16.6" rx="2.1" ry="1.15" fill="url(#siWheatGrain)" opacity="0.8" transform="rotate(18 14.5 16.6)" />
      <Ellipse cx="12" cy="6.4" rx="1.7" ry="2.4" fill="url(#siWheatGrain)" />
      <Path d="M10.4 4.6l-1-2M12 4.2V2M13.6 4.6l1-2" stroke="url(#siWheatStem)" strokeWidth="0.9" strokeLinecap="round" />
    </>
  ),

  /* النماء — شجرة بخضرة طبيعية متدرجة وجذع بني */
  tree: (
    <>
      <Defs>
        <LinearGradient id="siTreeLeaf" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#2F5B41" />
          <Stop offset="1" stopColor="#6E9A6B" />
        </LinearGradient>
        <LinearGradient id="siTreeLeaf2" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#3E6B4C" />
          <Stop offset="1" stopColor="#8BAF7D" />
        </LinearGradient>
        <LinearGradient id="siTreeTrunk" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#6B4A2E" />
          <Stop offset="1" stopColor="#8F6B42" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="12" cy="21.4" rx="5" ry="1" fill="#6B4A2E" opacity="0.3" />
      <Rect x="10.9" y="15" width="2.2" height="6.5" rx="1.1" fill="url(#siTreeTrunk)" />
      <Path d="M4.6 17l7.4-6.4 7.4 6.4z" fill="url(#siTreeLeaf)" />
      <Path d="M6.6 12.6l5.4-5.4 5.4 5.4z" fill="url(#siTreeLeaf2)" />
      <Path d="M8.6 8.2l3.4-4 3.4 4z" fill="url(#siTreeLeaf)" />
    </>
  ),

  /* الثمرة — رمانة ناضجة بتدرج أحمر دافئ وورقة طبيعية */
  fruit: (
    <>
      <Defs>
        <RadialGradient id="siFruitBody" cx="0.38" cy="0.3" r="0.9">
          <Stop offset="0" stopColor="#E98A5F" />
          <Stop offset="0.55" stopColor="#C94435" />
          <Stop offset="1" stopColor="#8C2B22" />
        </RadialGradient>
        <LinearGradient id="siFruitLeaf" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#3E6B4F" />
          <Stop offset="1" stopColor="#7FA98A" />
        </LinearGradient>
      </Defs>
      <Path d="M10.6 5.4l-1.2-2.1 1.9.6.7-1.6.7 1.6 1.9-.6-1.2 2.1z" fill="#8C2B22" />
      <Ellipse cx="12" cy="13.6" rx="6.4" ry="6.9" fill="url(#siFruitBody)" />
      <Ellipse cx="9.8" cy="11.2" rx="1.7" ry="1.1" fill="#F6D9C4" opacity="0.55" transform="rotate(-20 9.8 11.2)" />
      <Path d="M14.5 6.2c.8-1.3 2.7-1.6 3.6-.9-.8 1.3-2.7 1.6-3.6.9z" fill="url(#siFruitLeaf)" />
    </>
  ),

  /* الوارثون — تاج ذهبي فاخر بلمعة طبيعية */
  crown: (
    <>
      <Defs>
        <LinearGradient id="siCrownGold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F2DC92" />
          <Stop offset="0.55" stopColor="#D9B44A" />
          <Stop offset="1" stopColor="#A87F22" />
        </LinearGradient>
        <LinearGradient id="siCrownBase" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#CBA13C" />
          <Stop offset="1" stopColor="#96701D" />
        </LinearGradient>
      </Defs>
      <Path d="M3.5 16.8L6 8.3l4.5 5.4L12 6.8l1.5 6.9L18 8.3l2.5 8.5z" fill="url(#siCrownGold)" />
      <Rect x="3.5" y="16.8" width="17" height="3.4" rx="1.2" fill="url(#siCrownBase)" />
      <Circle cx="12" cy="5.4" r="1.7" fill="url(#siCrownGold)" />
      <Circle cx="5.2" cy="7.2" r="1.3" fill="url(#siCrownGold)" opacity="0.9" />
      <Circle cx="18.8" cy="7.2" r="1.3" fill="url(#siCrownGold)" opacity="0.9" />
      <Circle cx="12" cy="18.5" r="1" fill="#7A2E2E" opacity="0.85" />
    </>
  ),

  /* ── مستويات التجويد ────────────────────────────────────────────── */

  /* التجويد الأساسي — ثلاثة أعمدة متساوية هادئة */
  wave1: (
    <>
      <Defs>
        <LinearGradient id="siW1Green" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#33604F" />
          <Stop offset="1" stopColor="#7FA997" />
        </LinearGradient>
        <LinearGradient id="siW1Gold" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={GOLD_LO} />
          <Stop offset="1" stopColor={GOLD_HI} />
        </LinearGradient>
      </Defs>
      <Rect x="3.5" y="8" width="4.5" height="12" rx="2.2" fill="url(#siW1Green)" />
      <Rect x="9.8" y="8" width="4.5" height="12" rx="2.2" fill="url(#siW1Gold)" />
      <Rect x="16" y="8" width="4.5" height="12" rx="2.2" fill="url(#siW1Green)" />
    </>
  ),

  /* التجويد المتوسط — أعمدة متدرجة مع خط تصاعدي */
  wave2: (
    <>
      <Defs>
        <LinearGradient id="siW2Green" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#33604F" />
          <Stop offset="1" stopColor="#7FA997" />
        </LinearGradient>
        <LinearGradient id="siW2Gold" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={GOLD_LO} />
          <Stop offset="1" stopColor={GOLD_HI} />
        </LinearGradient>
      </Defs>
      <Rect x="3" y="12" width="4" height="9" rx="2" fill="url(#siW2Green)" />
      <Rect x="10" y="7.5" width="4" height="13.5" rx="2" fill="url(#siW2Gold)" />
      <Rect x="17" y="10" width="4" height="11" rx="2" fill="url(#siW2Green)" />
      <Path d="M5 11 L12 6 L19 8.5" fill="none" stroke="url(#siW2Gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  /* التجويد المتقدم — منحنى موجي متعقد مع أعمدة */
  wave3: (
    <>
      <Defs>
        <LinearGradient id="siW3Green" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#33604F" />
          <Stop offset="1" stopColor="#7FA997" />
        </LinearGradient>
        <LinearGradient id="siW3Gold" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={GOLD_LO} />
          <Stop offset="1" stopColor={GOLD_HI} />
        </LinearGradient>
      </Defs>
      <Rect x="1.5" y="14.5" width="3" height="7" rx="1.5" fill="url(#siW3Green)" />
      <Rect x="6.5" y="10" width="3" height="11.5" rx="1.5" fill="url(#siW3Gold)" />
      <Rect x="11.5" y="6" width="3" height="15.5" rx="1.5" fill="url(#siW3Green)" />
      <Rect x="16.5" y="9.5" width="3" height="12" rx="1.5" fill="url(#siW3Gold)" opacity="0.8" />
      <Rect x="21" y="13" width="2.8" height="8.5" rx="1.4" fill="url(#siW3Green)" opacity="0.6" />
      <Path d="M3 13.5 L8 8.5 L13 4.5 L18 8 L22.5 11.5" fill="none" stroke="url(#siW3Gold)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  /* إتقان التجويد — موجة مكتملة بعلامة إتقان */
  wave4: (
    <>
      <Defs>
        <LinearGradient id="siW4Green" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#33604F" />
          <Stop offset="1" stopColor="#7FA997" />
        </LinearGradient>
        <LinearGradient id="siW4Gold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F2DC92" />
          <Stop offset="1" stopColor="#A87F22" />
        </LinearGradient>
      </Defs>
      <Rect x="2.5" y="13" width="3" height="8" rx="1.5" fill="url(#siW4Green)" opacity="0.7" />
      <Rect x="7" y="9.5" width="3" height="11.5" rx="1.5" fill="url(#siW4Green)" />
      <Rect x="11.5" y="6.5" width="3" height="14.5" rx="1.5" fill="url(#siW4Green)" />
      <Path d="M15.9 12.2a4 4 0 1 1 8 0 4 4 0 0 1-8 0" fill="url(#siW4Gold)" />
      <Path d="M17.9 12.2l1.3 1.3 2.4-2.5" fill="none" stroke="#FFF8E6" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  /* ── مواد الدروس الشرعية ─────────────────────────────────────────── */

  /* الفقه — ميزان ذهبي متوازن */
  scale: (
    <>
      <Defs>
        <LinearGradient id="siScaleGold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={GOLD_HI} />
          <Stop offset="1" stopColor={GOLD_LO} />
        </LinearGradient>
        <LinearGradient id="siScalePan" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#E0BA62" />
          <Stop offset="1" stopColor="#A87B2C" />
        </LinearGradient>
      </Defs>
      <Circle cx="12" cy="3.6" r="1.1" fill="url(#siScaleGold)" />
      <Path d="M5 6.5h14M12 4.5v13.5M8.5 20.5h7" stroke="url(#siScaleGold)" strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M5 6.5l-2.2 5.5h4.4z" fill="url(#siScalePan)" />
      <Path d="M2.6 12a2.6 2.6 0 0 0 5.2 0z" fill="url(#siScalePan)" />
      <Path d="M19 6.5l-2.2 5.5h4.4z" fill="url(#siScalePan)" />
      <Path d="M16.6 12a2.6 2.6 0 0 0 5.2 0z" fill="url(#siScalePan)" />
    </>
  ),

  /* العقيدة — درع الإيمان بمعيّن هداية */
  shield: (
    <>
      <Defs>
        <LinearGradient id="siShieldBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#9A2A44" />
          <Stop offset="1" stopColor="#5E1424" />
        </LinearGradient>
        <LinearGradient id="siShieldGold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={GOLD_HI} />
          <Stop offset="1" stopColor={GOLD_LO} />
        </LinearGradient>
      </Defs>
      <Path d="M12 2.5l7.5 3v5.2c0 4.6-3.2 7.6-7.5 8.8-4.3-1.2-7.5-4.2-7.5-8.8V5.5z" fill="url(#siShieldBody)" />
      <Path d="M12 4.3l5.9 2.35v4c0 3.6-2.5 6-5.9 7z" fill="url(#siShieldGold)" opacity="0.25" />
      <Path d="M12 7.6l2.5 3.2-2.5 3.2-2.5-3.2z" fill="url(#siShieldGold)" />
    </>
  ),

  /* السيرة النبوية — هلال ومعيّن بلمعة فجرية */
  moon: (
    <>
      <Defs>
        <LinearGradient id="siMoonGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F2DC92" />
          <Stop offset="1" stopColor="#B98F2D" />
        </LinearGradient>
      </Defs>
      <Path d="M19.5 13.5A8 8 0 1 1 10.5 4.5a6.3 6.3 0 0 0 9 9z" fill="url(#siMoonGold)" />
      <Path d="M16.6 4.9l1.5 1.9-1.5 1.9-1.5-1.9z" fill="url(#siMoonGold)" />
    </>
  ),
};

const PLANT_ICONS: ReadonlySet<string> = new Set(["seed", "wheat", "tree", "fruit"]);
void PLANT_ICONS;

export default function SectionIcon({ name, size = 40 }: { name: SectionIconName; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {ART[name]}
    </Svg>
  );
}
