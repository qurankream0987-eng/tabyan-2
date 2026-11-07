import { Fragment } from "react";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { SURAH_BANNER_COLORS as C } from "@workspace/tabyan-domain/surah-banner";

/** Printed paper inside the medallion, as on every other page. */
const PAPER = "#F5EFE0";

interface Box { x: number; y: number; w: number; h: number }

export interface OpeningFrame {
  outer: Box;
  /** Width of the outer patterned band. */
  band: number;
  /** Panel above the medallion that carries the surah banner. */
  top: Box;
  /** Panel below the medallion. */
  bottom: Box;
  /** Ground the medallion sits on, between the two panels. */
  field: Box;
  circle: { cx: number; cy: number; r: number; innerR: number };
}

/**
 * The frame of the two opening pages (Al-Fatiha, the start of Al-Baqara), drawn between the
 * printed margins: a patterned band, a panel above for the surah name, one below, and a
 * medallion in the middle that holds the text.
 */
export function openingFrame(width: number, paperH: number, marginH: number): OpeningFrame {
  const x0 = width * 0.025;
  const outer = { x: x0, y: marginH, w: width - x0 * 2, h: paperH - marginH * 2 };
  const band = width * 0.055;
  const gap = width * 0.018;
  const inset = band + gap;
  const inner = { x: outer.x + inset, y: outer.y + inset, w: outer.w - inset * 2, h: outer.h - inset * 2 };
  const topH = Math.min(inner.w * 0.17, inner.h * 0.12);
  const bottomH = topH * 0.6;
  const top = { x: inner.x, y: inner.y, w: inner.w, h: topH };
  const bottom = { x: inner.x, y: inner.y + inner.h - bottomH, w: inner.w, h: bottomH };
  const field = { x: inner.x, y: top.y + topH + gap, w: inner.w, h: inner.h - topH - bottomH - gap * 2 };
  // Room outside the ring for its petals.
  const r = Math.min(field.w, field.h) / 2 - width * 0.04;
  return {
    outer,
    band,
    top,
    bottom,
    field,
    circle: { cx: width / 2, cy: field.y + field.h / 2, r, innerR: r - width * 0.022 },
  };
}

/**
 * The largest glyph size at which every line fits inside the medallion: each line is held to
 * the chord of the circle at its height, so the lines narrow toward the top and bottom as in
 * the printed opening pages. `widths` are the lines' widths at `measureSize`, top to bottom.
 */
export function fitMedallion(widths: number[], radius: number, measureSize: number) {
  const n = widths.length;
  const fits = (size: number) => {
    const rowH = size * 1.75;
    if (n * rowH > radius * 2 * 0.9) return false;
    return widths.every((lineWidth, index) => {
      const fromCentre = Math.abs((index - (n - 1) / 2) * rowH) + rowH * 0.3;
      if (fromCentre >= radius) return false;
      const halfChord = Math.sqrt(radius * radius - fromCentre * fromCentre) * 0.94;
      return (lineWidth * size) / measureSize / 2 + 10 <= halfChord;
    });
  };
  let low = 4;
  let high = 200;
  for (let step = 0; step < 24; step += 1) {
    const mid = (low + high) / 2;
    if (fits(mid)) low = mid;
    else high = mid;
  }
  return { size: low, rowH: low * 1.75 };
}

/** The ornament behind the opening pages, in the surah banner's maroon and gold. */
export function OpeningPageArt({ frame, width, height }: { frame: OpeningFrame; width: number; height: number }) {
  const { outer, band, top, bottom, field, circle } = frame;
  return (
    <Svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }} pointerEvents="none">
      {/* Outer band with its running pattern and a star in each corner. */}
      <Rect x={outer.x} y={outer.y} width={outer.w} height={outer.h} fill={C.ground} stroke={C.goldEdge} strokeWidth={2.5} />
      <Rect x={outer.x + 3} y={outer.y + 3} width={outer.w - 6} height={outer.h - 6} fill="none" stroke={C.ribbon} strokeWidth={0.8} />
      <BandPattern outer={outer} band={band} />
      {[
        [outer.x + band / 2, outer.y + band / 2],
        [outer.x + outer.w - band / 2, outer.y + band / 2],
        [outer.x + band / 2, outer.y + outer.h - band / 2],
        [outer.x + outer.w - band / 2, outer.y + outer.h - band / 2],
      ].map(([x, y]) => <Star key={`${x}:${y}`} x={x} y={y} size={band * 0.62} />)}
      <Rect x={outer.x + band} y={outer.y + band} width={outer.w - band * 2} height={outer.h - band * 2} fill={PAPER} stroke={C.goldEdge} strokeWidth={2} />
      <Rect x={outer.x + band + 3} y={outer.y + band + 3} width={outer.w - band * 2 - 6} height={outer.h - band * 2 - 6} fill="none" stroke={C.ribbon} strokeWidth={0.8} />

      {/* The two panels; the surah banner is drawn over the upper one. */}
      <Panel box={top} />
      <Panel box={bottom} />
      <Cartouche box={bottom} />

      {/* The ground of the medallion, with a spray in each corner. */}
      <Panel box={field} />
      <Lattice field={field} circle={circle} clearance={width * 0.034} />
      <CornerSprays field={field} />
      <Pendants field={field} circle={circle} reach={width * 0.034} />

      {/* The medallion: a ring of petals, gold rings with a rope between them, the paper inside. */}
      <Petals cx={circle.cx} cy={circle.cy} r={circle.r} length={width * 0.034} />
      <Circle cx={circle.cx} cy={circle.cy} r={circle.r} fill={C.ivory} stroke={C.goldEdge} strokeWidth={3} />
      <Circle cx={circle.cx} cy={circle.cy} r={circle.r - 3.5} fill="none" stroke={C.ribbon} strokeWidth={1.2} />
      <Circle cx={circle.cx} cy={circle.cy} r={(circle.r + circle.innerR) / 2} fill="none" stroke={C.gold} strokeWidth={2} strokeDasharray="2.5 2.5" />
      <Circle cx={circle.cx} cy={circle.cy} r={circle.innerR} fill={PAPER} stroke={C.goldEdge} strokeWidth={1.5} />
    </Svg>
  );
}

function Panel({ box }: { box: Box }) {
  return (
    <>
      <Rect x={box.x} y={box.y} width={box.w} height={box.h} fill={C.ground} stroke={C.goldEdge} strokeWidth={2} />
      <Rect x={box.x + 3} y={box.y + 3} width={box.w - 6} height={box.h - 6} fill="none" stroke={C.gold} strokeWidth={0.8} />
    </>
  );
}

/** Lozenges and gold beads alternating along the four sides of the band. */
function BandPattern({ outer, band }: { outer: Box; band: number }) {
  const marks: { x: number; y: number; lozenge: boolean }[] = [];
  const along = (length: number, place: (offset: number) => [number, number]) => {
    const count = Math.max(2, Math.round(length / (band * 0.9)));
    const step = length / count;
    for (let index = 0; index < count; index += 1) {
      const [x, y] = place(band + step * (index + 0.5));
      marks.push({ x, y, lozenge: index % 2 === 0 });
    }
  };
  const spanX = outer.w - band * 2;
  const spanY = outer.h - band * 2;
  along(spanX, (offset) => [outer.x + offset, outer.y + band / 2]);
  along(spanX, (offset) => [outer.x + offset, outer.y + outer.h - band / 2]);
  along(spanY, (offset) => [outer.x + band / 2, outer.y + offset]);
  along(spanY, (offset) => [outer.x + outer.w - band / 2, outer.y + offset]);
  const d = band * 0.3;
  return (
    <G>
      {marks.map(({ x, y, lozenge }) => lozenge
        ? <Path key={`${x}:${y}`} d={`M${x} ${y - d}L${x + d * 0.75} ${y}L${x} ${y + d}L${x - d * 0.75} ${y}Z`} fill={C.ribbon} stroke={C.goldEdge} strokeWidth={0.9} />
        : <Circle key={`${x}:${y}`} cx={x} cy={y} r={band * 0.11} fill={C.bud} stroke={C.budEdge} strokeWidth={0.6} />)}
    </G>
  );
}

/** An eight-pointed star: two squares, one turned a quarter of a right angle. */
function Star({ x, y, size }: { x: number; y: number; size: number }) {
  const half = size / 2;
  return (
    <G>
      <Rect x={x - half} y={y - half} width={size} height={size} fill={C.ribbon} stroke={C.goldEdge} strokeWidth={1} />
      <Rect x={x - half} y={y - half} width={size} height={size} fill={C.ribbon} stroke={C.goldEdge} strokeWidth={1} transform={`rotate(45 ${x} ${y})`} />
      <Circle cx={x} cy={y} r={size * 0.2} fill={C.bud} stroke={C.budEdge} strokeWidth={0.6} />
    </G>
  );
}

/** A small cartouche in the lower panel between two lozenges. */
function Cartouche({ box }: { box: Box }) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const w = box.w * 0.46;
  const h = box.h * 0.52;
  const d = h * 0.42;
  return (
    <G>
      <Rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={h / 2} fill={C.ivory} stroke={C.goldEdge} strokeWidth={1.6} />
      <Rect x={cx - w / 2 + 3} y={cy - h / 2 + 3} width={w - 6} height={h - 6} rx={(h - 6) / 2} fill="none" stroke={C.gold} strokeWidth={0.7} />
      <Star x={cx} y={cy} size={h * 0.34} />
      {[cx - w / 2 - d * 1.6, cx + w / 2 + d * 1.6].map((x) => (
        <Path key={x} d={`M${x} ${cy - d}L${x + d * 0.8} ${cy}L${x} ${cy + d}L${x - d * 0.8} ${cy}Z`} fill={C.ribbon} stroke={C.goldEdge} strokeWidth={0.9} />
      ))}
    </G>
  );
}

/**
 * A light lattice of small gold quatrefoils over the ground, kept clear of the medallion, of
 * the corner sprays and of the pendants above and below the medallion.
 */
function Lattice({ field, circle, clearance }: { field: Box; circle: OpeningFrame["circle"]; clearance: number }) {
  const step = field.w / 7;
  const unit = Math.min(field.w, field.h);
  const marks: [number, number][] = [];
  const columns = Math.floor(field.w / step);
  const rows = Math.floor(field.h / step);
  const offsetX = field.x + (field.w - columns * step) / 2;
  const offsetY = field.y + (field.h - rows * step) / 2;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = offsetX + step * (column + 0.5);
      const y = offsetY + step * (row + 0.5);
      if (Math.hypot(x - circle.cx, y - circle.cy) < circle.r + clearance + step * 0.45) continue;
      if (Math.abs(x - circle.cx) < step * 0.6) continue;
      const nearCorner = [field.x, field.x + field.w].some((cx) => [field.y, field.y + field.h].some((cy) => Math.hypot(x - cx, y - cy) < unit * 0.26));
      if (nearCorner) continue;
      marks.push([x, y]);
    }
  }
  const r = step * 0.22;
  return (
    <G>
      {marks.map(([x, y]) => (
        <G key={`${x}:${y}`}>
          {[0, 90].map((turn) => (
            <Ellipse key={turn} cx={x} cy={y} rx={r} ry={r * 0.38} fill={C.goldLight} stroke={C.gold} strokeWidth={0.6} transform={`rotate(${turn + 45} ${x} ${y})`} />
          ))}
          <Circle cx={x} cy={y} r={r * 0.2} fill={C.ribbon} />
        </G>
      ))}
    </G>
  );
}

/** A chain of lozenges and beads hanging from the upper panel to the medallion, and again below it. */
function Pendants({ field, circle, reach }: { field: Box; circle: OpeningFrame["circle"]; reach: number }) {
  const x = circle.cx;
  const spans: [number, number][] = [
    [field.y + 6, circle.cy - circle.r - reach - 4],
    [circle.cy + circle.r + reach + 4, field.y + field.h - 6],
  ];
  return (
    <G>
      {spans.map(([from, to]) => {
        const length = to - from;
        if (length < reach * 2) return null;
        const count = Math.max(1, Math.floor(length / (reach * 1.6)));
        const step = length / count;
        const d = Math.min(step * 0.34, reach * 0.62);
        return (
          <G key={from}>
            <Path d={`M${x} ${from}L${x} ${to}`} stroke={C.goldEdge} strokeWidth={1.4} />
            {Array.from({ length: count }, (_, index) => {
              const y = from + step * (index + 0.5);
              return index % 2 === 0
                ? <Path key={index} d={`M${x} ${y - d}L${x + d * 0.62} ${y}L${x} ${y + d}L${x - d * 0.62} ${y}Z`} fill={C.ribbon} stroke={C.goldEdge} strokeWidth={1} />
                : <Rosette key={index} x={x} y={y} r={d * 0.9} />;
            })}
          </G>
        );
      })}
    </G>
  );
}

/** Quarter arcs and a rosette in each corner of the medallion's ground. */
function CornerSprays({ field }: { field: Box }) {
  const corners: [number, number, number, number][] = [
    [field.x, field.y, 1, 1],
    [field.x + field.w, field.y, -1, 1],
    [field.x, field.y + field.h, 1, -1],
    [field.x + field.w, field.y + field.h, -1, -1],
  ];
  const unit = Math.min(field.w, field.h);
  return (
    <G>
      {corners.map(([x, y, sx, sy]) => {
        const arc = (radius: number) => `M${x + sx * radius} ${y}A${radius} ${radius} 0 0 ${sx * sy > 0 ? 1 : 0} ${x} ${y + sy * radius}`;
        const rx = x + sx * unit * 0.075;
        const ry = y + sy * unit * 0.075;
        return (
          <Fragment key={`${x}:${y}`}>
            <Path d={arc(unit * 0.17)} fill="none" stroke={C.ribbon} strokeWidth={2.2} />
            <Path d={arc(unit * 0.2)} fill="none" stroke={C.goldEdge} strokeWidth={1.2} />
            <Rosette x={rx} y={ry} r={unit * 0.045} />
          </Fragment>
        );
      })}
    </G>
  );
}

function Rosette({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <G>
      {Array.from({ length: 8 }, (_, index) => (
        <Ellipse key={index} cx={x} cy={y - r * 0.55} rx={r * 0.22} ry={r * 0.5} fill={index % 2 ? C.petal : C.ribbon} stroke={C.gold} strokeWidth={0.6} transform={`rotate(${index * 45} ${x} ${y})`} />
      ))}
      <Circle cx={x} cy={y} r={r * 0.24} fill={C.bud} stroke={C.budEdge} strokeWidth={0.6} />
    </G>
  );
}

/** The petals round the medallion's ring, maroon in two shades with gold beads between them. */
function Petals({ cx, cy, r, length }: { cx: number; cy: number; r: number; length: number }) {
  const count = 36;
  return (
    <G>
      {Array.from({ length: count }, (_, index) => {
        const angle = (index * 360) / count;
        const between = angle + 180 / count;
        const rad = (between * Math.PI) / 180;
        return (
          <Fragment key={index}>
            <Ellipse cx={cx} cy={cy - r - length * 0.42} rx={length * 0.24} ry={length * 0.55} fill={index % 2 ? C.petal : C.ribbon} stroke={C.goldEdge} strokeWidth={0.8} transform={`rotate(${angle} ${cx} ${cy})`} />
            <Circle cx={cx + Math.sin(rad) * (r + length * 0.25)} cy={cy - Math.cos(rad) * (r + length * 0.25)} r={length * 0.1} fill={C.bud} />
          </Fragment>
        );
      })}
    </G>
  );
}
