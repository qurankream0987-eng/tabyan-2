import { useId, useMemo } from "react";
import {
  SURAH_BANNER_COLORS as C,
  SURAH_BANNER_PETALS,
  SURAH_BANNER_SIDE as SIDE,
  surahBannerLayout,
} from "@workspace/tabyan-domain/surah-banner";

/**
 * إطار عنوان السورة: شريطان متضفّران بالأخضر والذهبي ووردة على كل جانب، وخرطوشة عاجية —
 * نفس رسم التطبيق (packages/domain/surah-banner). يُرسم بنسبة الإطار الحقيقية فلا يتمطط.
 */
export default function SurahHeaderOrnament({ aspect }: { aspect: number }) {
  // Several banners can share a page; ids stay unique per instance.
  const id = useId().replace(/:/g, "");
  const gold = `sb-gold-${id}`, side = `sb-side-${id}`;
  const l = useMemo(() => surahBannerLayout(aspect), [aspect]);
  const { rosette } = SIDE;
  return (
    <svg className="tby-surah-frame-border" viewBox={`0 0 ${l.viewWidth} 140`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.goldLight} />
          <stop offset="0.5" stopColor={C.goldMid} />
          <stop offset="1" stopColor={C.goldEdge} />
        </linearGradient>
        <g id={side}>
          <g fill="none" strokeLinecap="round">
            <path d={SIDE.knot} stroke={C.ribbonShadow} strokeWidth={11} />
            <path d={SIDE.knot} stroke={C.ribbonEdge} strokeWidth={8.5} />
            <path d={SIDE.knot} stroke={C.ribbon} strokeWidth={5.5} />
            <path d={SIDE.knotFine} stroke={C.ribbonShadow} strokeWidth={6} />
            <path d={SIDE.knotFine} stroke={C.ribbonEdge} strokeWidth={4} />
          </g>
          <g fill={C.leaf} stroke={C.gold} strokeWidth={0.8}>
            {SIDE.leaves.map((d) => <path key={d} d={d} />)}
          </g>
          <circle cx={rosette.cx} cy={rosette.cy} r={rosette.r} fill={C.ivory} stroke={`url(#${gold})`} strokeWidth={3} />
          <circle cx={rosette.cx} cy={rosette.cy} r={rosette.innerR} fill="none" stroke={C.gold} strokeWidth={0.8} />
          <path d={SURAH_BANNER_PETALS} fill={C.petal} stroke={C.gold} strokeWidth={0.8} />
          <circle cx={rosette.cx} cy={rosette.cy} r={rosette.heartR} fill={C.bud} stroke={C.budEdge} strokeWidth={0.7} />
        </g>
      </defs>
      <rect {...l.frame} fill={C.ground} stroke={`url(#${gold})`} strokeWidth={4} />
      <rect {...l.rule} fill="none" stroke={C.gold} strokeWidth={1} />
      <use href={`#${side}`} />
      <use href={`#${side}`} transform={l.mirror} />
      <rect {...l.cartouche} fill={C.ivory} stroke={`url(#${gold})`} strokeWidth={3.5} />
      <rect {...l.cartoucheInner} fill="none" stroke={C.gold} strokeWidth={1} />
    </svg>
  );
}
