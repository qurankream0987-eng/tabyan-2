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

const BAND_VIEW_WIDTH = 760;
const BAND_CENTRE = BAND_VIEW_WIDTH / 2;

/**
 * An ornamental band from the surah banner's own parts, for the empty paper above and below
 * the two short opening pages: the two end panels, a large rosette medallion in place of the
 * cartouche, and fine ribbons joining them.
 */
export function OrnamentBand({ width, height }: { width: number; height: number }) {
  const id = useId().replace(/:/g, "");
  const gold = `obGold${id}`;
  const { rosette } = SIDE;
  const scale = 1.75;
  const medallion = `translate(${BAND_CENTRE - rosette.cx * scale} ${rosette.cy - rosette.cy * scale}) scale(${scale})`;
  const join = (from: number, to: number) => `M${from} 70C${from + (to - from) * 0.3} 44 ${from + (to - from) * 0.7} 44 ${to} 70M${from} 70C${from + (to - from) * 0.3} 96 ${from + (to - from) * 0.7} 96 ${to} 70`;
  const sideEnd = rosette.cx + rosette.r;
  const medallionStart = BAND_CENTRE - rosette.r * scale;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${BAND_VIEW_WIDTH} 140`} preserveAspectRatio="xMidYMid meet">
      <Defs>
        <LinearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.goldLight} />
          <Stop offset="0.5" stopColor={C.goldMid} />
          <Stop offset="1" stopColor={C.goldEdge} />
        </LinearGradient>
      </Defs>
      <Rect x={2} y={2} width={BAND_VIEW_WIDTH - 4} height={136} fill={C.ground} stroke={`url(#${gold})`} strokeWidth={4} />
      <Rect x={9} y={9} width={BAND_VIEW_WIDTH - 18} height={122} fill="none" stroke={C.gold} strokeWidth={1} />
      <Side gold={gold} />
      <G transform={`translate(${BAND_VIEW_WIDTH} 0) scale(-1 1)`}><Side gold={gold} /></G>
      <G fill="none" strokeLinecap="round">
        {[join(sideEnd, medallionStart), join(BAND_VIEW_WIDTH - medallionStart, BAND_VIEW_WIDTH - sideEnd)].map((d) => (
          <G key={d}>
            <Path d={d} stroke={C.ribbonShadow} strokeWidth={6} />
            <Path d={d} stroke={C.ribbonEdge} strokeWidth={4} />
          </G>
        ))}
      </G>
      <G transform={medallion}>
        <Circle cx={rosette.cx} cy={rosette.cy} r={rosette.r} fill={C.ivory} stroke={`url(#${gold})`} strokeWidth={2.4} />
        <Circle cx={rosette.cx} cy={rosette.cy} r={rosette.innerR} fill="none" stroke={C.gold} strokeWidth={0.6} />
        <G transform={`rotate(22.5 ${rosette.cx} ${rosette.cy})`}>
          <Path d={SURAH_BANNER_PETALS} fill={C.ribbon} stroke={C.gold} strokeWidth={0.6} />
        </G>
        <Path d={SURAH_BANNER_PETALS} fill={C.petal} stroke={C.gold} strokeWidth={0.6} transform={`translate(${rosette.cx * 0.2} ${rosette.cy * 0.2}) scale(0.8)`} />
        <Circle cx={rosette.cx} cy={rosette.cy} r={rosette.heartR * 1.2} fill={C.bud} stroke={C.budEdge} strokeWidth={0.6} />
      </G>
    </Svg>
  );
}
