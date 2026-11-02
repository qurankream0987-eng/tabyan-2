import { useId, useMemo } from "react";
import Svg, { Circle, Defs, G, LinearGradient, Path, Pattern, Polygon, Rect, Stop } from "react-native-svg";
import {
  SURAH_BANNER_COLORS as C,
  SURAH_BANNER_MEDALLION as MED,
  SURAH_BANNER_TILE as TILE,
  surahBannerLayout,
  surahBannerRosette,
} from "@workspace/tabyan-domain/surah-banner";

/** The surah banner ornament, drawn like the web (packages/domain/surah-banner) at the banner's real proportions. */
export function SurahBannerArt({ width, height }: { width: number; height: number }) {
  const id = useId().replace(/:/g, "");
  const tile = `sbTile${id}`, gold = `sbGold${id}`;
  const l = useMemo(() => surahBannerLayout(width / height), [width, height]);
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${l.viewWidth} 140`} preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0 }}>
      <Defs>
        <Pattern id={tile} width={TILE.size} height={TILE.size} patternUnits="userSpaceOnUse" y={TILE.offsetY}>
          <Rect width={TILE.size} height={TILE.size} fill={C.sage} />
          <G fill={C.leaf} stroke={C.gold} strokeWidth={0.8}>
            {TILE.leaves.map((d) => <Path key={d} d={d} />)}
          </G>
          <Circle cx={18} cy={18} r={2.4} fill={C.bud} stroke={C.budEdge} strokeWidth={0.6} />
          <Path d={TILE.scrolls} fill="none" stroke={C.scroll} strokeWidth={1} />
          <G fill={C.pearl} stroke={C.gold} strokeWidth={0.5}>
            {TILE.pearls.map(([x, y]) => <Circle key={`${x}-${y}`} cx={x} cy={y} r={2} />)}
          </G>
        </Pattern>
        <LinearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.goldLight} />
          <Stop offset="0.5" stopColor={C.goldMid} />
          <Stop offset="1" stopColor={C.goldEdge} />
        </LinearGradient>
      </Defs>
      <Rect {...l.frame} fill={C.ivory} stroke={`url(#${gold})`} />
      <Rect {...l.band} fill={`url(#${tile})`} stroke={C.gold} />
      {l.medallions.map(({ cx, star }) => (
        <G key={cx}>
          <Polygon points={star} fill={C.star} stroke={`url(#${gold})`} strokeWidth={2} />
          <Circle cx={cx} cy={MED.cy} r={MED.r} fill={C.ivory} stroke={`url(#${gold})`} strokeWidth={3} />
          <Circle cx={cx} cy={MED.cy} r={MED.innerR} fill="none" stroke={C.gold} strokeWidth={0.9} />
          <Path d={surahBannerRosette(cx).petals} fill={C.leaf} stroke={`url(#${gold})`} strokeWidth={1.2} />
          <Circle {...surahBannerRosette(cx).heart} fill={C.bud} stroke={C.budEdge} strokeWidth={0.8} />
        </G>
      ))}
      <Path d={l.cartouche} fill={C.ivory} stroke={`url(#${gold})`} strokeWidth={3.5} />
      <Path d={l.cartoucheInner} fill="none" stroke={C.gold} strokeWidth={1} />
      <Path d={l.finials} fill={`url(#${gold})`} stroke={C.budEdge} strokeWidth={0.6} />
    </Svg>
  );
}
