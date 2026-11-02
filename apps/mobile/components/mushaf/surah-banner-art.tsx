import { useId, useMemo } from "react";
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import {
  SURAH_BANNER_COLORS as C,
  SURAH_BANNER_PETALS,
  SURAH_BANNER_SIDE as SIDE,
  surahBannerLayout,
} from "@workspace/tabyan-domain/surah-banner";

/** The surah banner ornament, drawn like the web (packages/domain/surah-banner) at the banner's real proportions. */
export function SurahBannerArt({ width, height }: { width: number; height: number }) {
  const id = useId().replace(/:/g, "");
  const gold = `sbGold${id}`;
  const l = useMemo(() => surahBannerLayout(width / height), [width, height]);
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${l.viewWidth} 140`} preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0 }}>
      <Defs>
        <LinearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.goldLight} />
          <Stop offset="0.5" stopColor={C.goldMid} />
          <Stop offset="1" stopColor={C.goldEdge} />
        </LinearGradient>
      </Defs>
      <Rect {...l.frame} fill={C.ground} stroke={`url(#${gold})`} strokeWidth={4} />
      <Rect {...l.rule} fill="none" stroke={C.gold} strokeWidth={1} />
      <Side gold={gold} />
      <G transform={l.mirror}><Side gold={gold} /></G>
      <Rect {...l.cartouche} fill={C.ivory} stroke={`url(#${gold})`} strokeWidth={3.5} />
      <Rect {...l.cartoucheInner} fill="none" stroke={C.gold} strokeWidth={1} />
    </Svg>
  );
}

/** One end panel: the interlaced ribbons, leaf sprays and the rosette medallion. */
function Side({ gold }: { gold: string }) {
  const { rosette } = SIDE;
  return (
    <G>
      <G fill="none" strokeLinecap="round">
        <Path d={SIDE.knot} stroke={C.ribbonShadow} strokeWidth={11} />
        <Path d={SIDE.knot} stroke={C.ribbonEdge} strokeWidth={8.5} />
        <Path d={SIDE.knot} stroke={C.ribbon} strokeWidth={5.5} />
        <Path d={SIDE.knotFine} stroke={C.ribbonShadow} strokeWidth={6} />
        <Path d={SIDE.knotFine} stroke={C.ribbonEdge} strokeWidth={4} />
      </G>
      <G fill={C.leaf} stroke={C.gold} strokeWidth={0.8}>
        {SIDE.leaves.map((d) => <Path key={d} d={d} />)}
      </G>
      <Circle cx={rosette.cx} cy={rosette.cy} r={rosette.r} fill={C.ivory} stroke={`url(#${gold})`} strokeWidth={3} />
      <Circle cx={rosette.cx} cy={rosette.cy} r={rosette.innerR} fill="none" stroke={C.gold} strokeWidth={0.8} />
      <Path d={SURAH_BANNER_PETALS} fill={C.petal} stroke={C.gold} strokeWidth={0.8} />
      <Circle cx={rosette.cx} cy={rosette.cy} r={rosette.heartR} fill={C.bud} stroke={C.budEdge} strokeWidth={0.7} />
    </G>
  );
}
