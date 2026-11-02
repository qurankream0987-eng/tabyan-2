import { useId, useMemo } from "react";
import {
  SURAH_BANNER_COLORS as C,
  SURAH_BANNER_MEDALLION as MED,
  SURAH_BANNER_TILE as TILE,
  surahBannerLayout,
} from "@workspace/tabyan-domain/surah-banner";

/**
 * إطار عنوان السورة: زخرفة نباتية بالأخضر والذهبي وخرطوشة عاجية — نفس رسم التطبيق
 * (packages/domain/surah-banner). يُرسم بنسبة الإطار الحقيقية فتبقى الميداليتان مستديرتين.
 */
export default function SurahHeaderOrnament({ aspect }: { aspect: number }) {
  // Several banners can share a page; ids stay unique per instance.
  const id = useId().replace(/:/g, "");
  const tile = `sb-tile-${id}`, gold = `sb-gold-${id}`;
  const l = useMemo(() => surahBannerLayout(aspect), [aspect]);
  return (
    <svg className="tby-surah-frame-border" viewBox={`0 0 ${l.viewWidth} 140`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={tile} width={TILE.size} height={TILE.size} patternUnits="userSpaceOnUse" y={TILE.offsetY}>
          <rect width={TILE.size} height={TILE.size} fill={C.sage} />
          <g fill={C.leaf} stroke={C.gold} strokeWidth={0.8}>
            {TILE.leaves.map((d) => <path key={d} d={d} />)}
          </g>
          <circle cx={18} cy={18} r={2.4} fill={C.bud} stroke={C.budEdge} strokeWidth={0.6} />
          <path d={TILE.scrolls} fill="none" stroke={C.scroll} strokeWidth={1} />
          <g fill={C.pearl} stroke={C.gold} strokeWidth={0.5}>
            {TILE.pearls.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={2} />)}
          </g>
        </pattern>
        <linearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.goldLight} />
          <stop offset="0.5" stopColor={C.goldMid} />
          <stop offset="1" stopColor={C.goldEdge} />
        </linearGradient>
      </defs>
      <rect {...l.frame} fill={C.ivory} stroke={`url(#${gold})`} />
      <rect {...l.band} fill={`url(#${tile})`} stroke={C.gold} />
      {l.medallions.map(({ cx, star }) => (
        <g key={cx}>
          <polygon points={star} fill={C.star} stroke={`url(#${gold})`} strokeWidth={2} />
          <circle cx={cx} cy={MED.cy} r={MED.r} fill={C.ivory} stroke={`url(#${gold})`} strokeWidth={3} />
          <circle cx={cx} cy={MED.cy} r={MED.innerR} fill="none" stroke={C.gold} strokeWidth={0.9} />
        </g>
      ))}
      <path d={l.cartouche} fill={C.ivory} stroke={`url(#${gold})`} strokeWidth={3.5} />
      <path d={l.cartoucheInner} fill="none" stroke={C.gold} strokeWidth={1} />
      <path d={l.finials} fill={`url(#${gold})`} stroke={C.budEdge} strokeWidth={0.6} />
    </svg>
  );
}
