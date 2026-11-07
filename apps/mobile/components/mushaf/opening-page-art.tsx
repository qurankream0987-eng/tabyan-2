import { memo } from "react";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

/**
 * The illumination of the two opening pages (Al-Fatiha, the start of Al-Baqara), after the
 * composition of the printed Madinah Mushaf: a crested outer border, ruled bands, a panel
 * above with a cartouche for the surah name, a panel below, and a medallion holding the text
 * on an arabesque ground. Drawn in the app's maroon, rose and gold.
 */
const K = {
  maroon: "#800020",
  dark: "#4C091B",
  rose: "#B5475F",
  roseLight: "#E3A3B0",
  gold: "#D4AF37",
  goldDark: "#B8860B",
  goldLight: "#F1D27A",
  ground: "#EFE2BB",
  ivory: "#FFFCF5",
  paper: "#F5EFE0",
} as const;

interface Box { x: number; y: number; w: number; h: number }

export interface OpeningFrame {
  width: number;
  height: number;
  /** Depth of the crested outer border. */
  border: number;
  /** The ruled bands between the border and the panels. */
  rules: number;
  content: Box;
  top: Box;
  /** Pointed cartouche in the upper panel; the surah name is written in it. */
  cartouche: Box;
  bottom: Box;
  middle: Box;
  /** `halo`: the outer reach of the wreath of palmettes round the medallion. */
  circle: { cx: number; cy: number; r: number; innerR: number; halo: number };
}

export function openingFrame(width: number, height: number): OpeningFrame {
  const border = width * 0.1;
  const rules = width * 0.034;
  const inset = border + rules;
  const content = { x: inset, y: inset, w: width - inset * 2, h: height - inset * 2 };
  const gap = width * 0.026;
  const top = { x: content.x, y: content.y, w: content.w, h: Math.min(content.w * 0.24, content.h * 0.14) };
  const bottom = { x: content.x, h: top.h * 0.72, y: 0, w: content.w };
  bottom.y = content.y + content.h - bottom.h;
  const middle = { x: content.x, y: top.y + top.h + gap, w: content.w, h: bottom.y - gap - (top.y + top.h + gap) };
  const cartouche = { w: top.w * 0.52, h: top.h * 0.56, x: 0, y: 0 };
  cartouche.x = top.x + (top.w - cartouche.w) / 2;
  cartouche.y = top.y + (top.h - cartouche.h) / 2;
  const r = Math.min(middle.w, middle.h) / 2 - width * 0.082;
  return {
    width,
    height,
    border,
    rules,
    content,
    top,
    cartouche,
    bottom,
    middle,
    circle: { cx: width / 2, cy: middle.y + middle.h / 2, r, innerR: r - width * 0.03, halo: r + width * 0.074 },
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

export const OpeningPageArt = memo(function OpeningPageArt({ frame }: { frame: OpeningFrame }) {
  const { width: W, height: H, border: B, rules: S, content, top, bottom, middle, cartouche, circle } = frame;
  const along = (length: number) => Math.max(3, Math.round((length - B * 2) / (B * 0.82)));
  return (
    <Svg width={W} height={H} style={{ position: "absolute", top: 0, left: 0 }} pointerEvents="none">
      {/* The crested border: a row of domes with palmettes on each side, rosettes at the corners. */}
      <Rect x={0} y={0} width={W} height={H} fill={K.ivory} />
      <Rect x={B * 0.62} y={B * 0.62} width={W - B * 1.24} height={H - B * 1.24} fill={K.maroon} />
      <DomeRow length={W} band={B} count={along(W)} />
      <G transform={`translate(0 ${H}) scale(1 -1)`}><DomeRow length={W} band={B} count={along(W)} /></G>
      <G transform={`translate(0 ${H}) rotate(-90)`}><DomeRow length={H} band={B} count={along(H)} /></G>
      <G transform={`translate(${W} 0) rotate(90)`}><DomeRow length={H} band={B} count={along(H)} /></G>
      {[[B / 2, B / 2], [W - B / 2, B / 2], [B / 2, H - B / 2], [W - B / 2, H - B / 2]].map(([x, y]) => (
        <G key={`${x}:${y}`}>
          <Circle cx={x} cy={y} r={B * 0.46} fill={K.maroon} stroke={K.gold} strokeWidth={1.4} />
          <Rosette x={x} y={y} r={B * 0.4} />
        </G>
      ))}

      {/* Ruled bands, outside in: gold, a dark band beaded in gold, rose, gold. */}
      <Rules x={B} y={B} w={W - B * 2} h={H - B * 2} depth={S} />
      <Rect x={content.x} y={content.y} width={content.w} height={content.h} fill={K.ground} />

      {/* Upper panel with the cartouche, lower panel, and the beaded bars between the panels. */}
      <Field box={top} seed={1} />
      <PanelEdge box={top} />
      <Cartouche box={cartouche} />
      <Field box={bottom} seed={2} />
      <PanelEdge box={bottom} />
      <SmallCartouche box={bottom} />
      <Bar x={content.x} y={top.y + top.h} w={content.w} h={middle.y - top.y - top.h} />
      <Bar x={content.x} y={middle.y + middle.h} w={content.w} h={bottom.y - middle.y - middle.h} />

      {/* The arabesque ground and the medallion on it. */}
      <Field box={middle} seed={3} circle={circle} />
      <PanelEdge box={middle} />
      <Medallion circle={circle} unit={W} />
    </Svg>
  );
});

/** Domes along one edge in local coordinates: x runs along the edge, y from the edge inward. */
function DomeRow({ length, band, count }: { length: number; band: number; count: number }) {
  const t = (length - band * 2) / count;
  return (
    <G>
      {Array.from({ length: count }, (_, index) => {
        const x = band + t * (index + 0.5);
        const base = band * 0.98;
        const apex = band * 0.2;
        const dome = `M${x - t / 2} ${base}C${x - t / 2} ${band * 0.55} ${x - t * 0.14} ${band * 0.52} ${x} ${apex}C${x + t * 0.14} ${band * 0.52} ${x + t / 2} ${band * 0.55} ${x + t / 2} ${base}Z`;
        return (
          <G key={index}>
            <Path d={dome} fill={K.ground} stroke={K.gold} strokeWidth={1.4} />
            <Path d={`M${x} ${apex}L${x} ${band * 0.05}`} stroke={K.goldDark} strokeWidth={1.2} />
            <Circle cx={x} cy={band * 0.06} r={band * 0.035} fill={K.rose} />
            <Palmette x={x} y={base - band * 0.04} size={band * 0.52} angle={0} />
            {/* The small arch between two domes. */}
            {index > 0 ? <Circle cx={x - t / 2} cy={band * 0.5} r={band * 0.07} fill={K.gold} stroke={K.ivory} strokeWidth={0.8} /> : null}
          </G>
        );
      })}
    </G>
  );
}

function Rules({ x, y, w, h, depth }: Box & { depth: number }) {
  const rect = (inset: number, stroke: string, strokeWidth: number, extra: Record<string, unknown> = {}) => (
    <Rect x={x + inset} y={y + inset} width={w - inset * 2} height={h - inset * 2} fill="none" stroke={stroke} strokeWidth={strokeWidth} {...extra} />
  );
  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} fill={K.ivory} />
      {rect(depth * 0.08, K.gold, depth * 0.16)}
      {rect(depth * 0.42, K.dark, depth * 0.38)}
      {rect(depth * 0.42, K.goldLight, depth * 0.12, { strokeDasharray: `0.1 ${depth * 0.32}`, strokeLinecap: "round" })}
      {rect(depth * 0.74, K.rose, depth * 0.12)}
      {rect(depth * 0.92, K.gold, depth * 0.12)}
    </G>
  );
}

function PanelEdge({ box }: { box: Box }) {
  return (
    <G>
      <Rect x={box.x} y={box.y} width={box.w} height={box.h} fill="none" stroke={K.maroon} strokeWidth={3} />
      <Rect x={box.x + 3.5} y={box.y + 3.5} width={box.w - 7} height={box.h - 7} fill="none" stroke={K.gold} strokeWidth={1.2} />
    </G>
  );
}

function Bar({ x, y, w, h }: Box) {
  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} fill={K.dark} />
      <Path d={`M${x} ${y + h / 2}L${x + w} ${y + h / 2}`} stroke={K.goldLight} strokeWidth={h * 0.22} strokeDasharray={`0.1 ${h * 0.7}`} strokeLinecap="round" />
    </G>
  );
}

/** A pointed oval with gold rules, as the surah-name cartouche of the printed page. */
function Cartouche({ box }: { box: Box }) {
  const { x, y, w, h } = box;
  const cy = y + h / 2;
  const shape = (pad: number) => {
    const l = x + pad;
    const r = x + w - pad;
    const t = y + pad;
    const b = y + h - pad;
    const k = (b - t) * 0.62;
    return `M${l} ${cy}C${l + k} ${t} ${l + k} ${t} ${l + k * 1.6} ${t}L${r - k * 1.6} ${t}C${r - k} ${t} ${r - k} ${t} ${r} ${cy}C${r - k} ${b} ${r - k} ${b} ${r - k * 1.6} ${b}L${l + k * 1.6} ${b}C${l + k} ${b} ${l + k} ${b} ${l} ${cy}Z`;
  };
  return (
    <G>
      <Path d={shape(-6)} fill={K.maroon} stroke={K.gold} strokeWidth={1.4} />
      <Path d={shape(0)} fill={K.ivory} stroke={K.gold} strokeWidth={2} />
      <Path d={shape(4)} fill="none" stroke={K.rose} strokeWidth={0.9} />
      {[x - 4, x + w + 4].map((px) => <Circle key={px} cx={px} cy={cy} r={h * 0.09} fill={K.gold} stroke={K.maroon} strokeWidth={1} />)}
    </G>
  );
}

function SmallCartouche({ box }: { box: Box }) {
  const w = box.w * 0.34;
  const h = box.h * 0.5;
  const x = box.x + (box.w - w) / 2;
  const y = box.y + (box.h - h) / 2;
  return (
    <G>
      <Cartouche box={{ x, y, w, h }} />
      <Rosette x={x + w / 2} y={y + h / 2} r={h * 0.36} />
    </G>
  );
}

/**
 * The arabesque: scrolling vines with curls, rosettes and palmettes on a regular grid, mirrored
 * about the panel's centre lines, and kept off the medallion when there is one.
 */
function Field({ box, seed, circle }: { box: Box; seed: number; circle?: OpeningFrame["circle"] }) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const step = Math.min(box.w / 9, box.h / 2.4);
  const pad = step * 0.4;
  const motifs: { x: number; y: number; kind: number; flipX: number; flipY: number }[] = [];
  const vines: string[] = [];
  const halfCols = Math.floor((box.w / 2 - pad) / step);
  const halfRows = Math.floor((box.h / 2 - pad) / step);
  const clear = (x: number, y: number) => !circle || Math.hypot(x - circle.cx, y - circle.cy) > circle.halo + step * 0.3;
  for (let row = -halfRows; row <= halfRows; row += 1) {
    // Every other row sits half a step over, as the lattice of an arabesque; both stay mirror-symmetric.
    const odd = Math.abs(row) % 2 === 1;
    const columns = odd
      ? Array.from({ length: halfCols * 2 }, (_, index) => index - halfCols + 0.5)
      : Array.from({ length: halfCols * 2 + 1 }, (_, index) => index - halfCols);
    for (const column of columns) {
      const x = cx + column * step;
      const y = cy + row * step * 0.86;
      if (x < box.x + pad || x > box.x + box.w - pad || y < box.y + pad || y > box.y + box.h - pad) continue;
      if (!clear(x, y)) continue;
      const kind = (Math.abs(row) + Math.round(Math.abs(column)) + seed) % 3;
      motifs.push({ x, y, kind, flipX: column < 0 ? -1 : 1, flipY: row < 0 ? -1 : 1 });
      const bend = (row + Math.round(column)) % 2 === 0 ? -1 : 1;
      const nx = x + step;
      if (nx <= box.x + box.w - pad && clear(nx, y) && clear((x + nx) / 2, y)) {
        vines.push(`M${x} ${y}C${x + step * 0.3} ${y + bend * step * 0.45} ${nx - step * 0.3} ${y - bend * step * 0.45} ${nx} ${y}`);
      }
      // Down to the two neighbours of the next row, so the vines weave a lattice.
      const ny = y + step * 0.86;
      for (const dx of [-step / 2, step / 2]) {
        const tx = x + dx;
        if (ny > box.y + box.h - pad || tx < box.x + pad || tx > box.x + box.w - pad) continue;
        if (!clear(tx, ny) || !clear(x + dx / 2, (y + ny) / 2)) continue;
        vines.push(`M${x} ${y}Q${x + dx / 2 + bend * step * 0.16} ${(y + ny) / 2} ${tx} ${ny}`);
      }
    }
  }
  return (
    <G>
      <Rect x={box.x} y={box.y} width={box.w} height={box.h} fill={K.ground} />
      {vines.map((d, index) => (
        <G key={index}>
          <Path d={d} fill="none" stroke={K.maroon} strokeWidth={step * 0.06} strokeLinecap="round" />
          <Path d={d} fill="none" stroke={K.goldLight} strokeWidth={step * 0.018} strokeLinecap="round" />
        </G>
      ))}
      {motifs.map(({ x, y, kind, flipX, flipY }) => (
        kind === 0 ? <Rosette key={`${x}:${y}`} x={x} y={y} r={step * 0.3} />
          : kind === 1 ? <Palmette key={`${x}:${y}`} x={x} y={y + flipY * step * 0.12} size={step * 0.5} angle={flipY < 0 ? 0 : 180} />
          : <Curl key={`${x}:${y}`} x={x} y={y} r={step * 0.26} flip={flipX} />
      ))}
    </G>
  );
}

/** The medallion: dotted gold rings, a maroon ring with a twisted gold rope, the paper inside. */
function Medallion({ circle, unit }: { circle: OpeningFrame["circle"]; unit: number }) {
  const { cx, cy, r, innerR } = circle;
  const ring = r - innerR;
  const rope = ring * 0.5;
  const ropeR = (r + innerR) / 2;
  const dash = (2 * Math.PI * ropeR) / Math.round((2 * Math.PI * ropeR) / (rope * 1.2));
  return (
    <G>
      <Wreath cx={cx} cy={cy} from={r + unit * 0.018} to={circle.halo} />
      <Circle cx={cx} cy={cy} r={r + unit * 0.02} fill={K.ivory} stroke={K.gold} strokeWidth={1.6} />
      <Circle cx={cx} cy={cy} r={r + unit * 0.01} fill="none" stroke={K.rose} strokeWidth={unit * 0.006} strokeDasharray={`0.1 ${unit * 0.014}`} strokeLinecap="round" />
      <Circle cx={cx} cy={cy} r={ropeR} fill="none" stroke={K.maroon} strokeWidth={ring} />
      <Circle cx={cx} cy={cy} r={ropeR} fill="none" stroke={K.gold} strokeWidth={rope} strokeDasharray={`${dash / 2} ${dash / 2}`} />
      <Circle cx={cx} cy={cy} r={ropeR} fill="none" stroke={K.goldLight} strokeWidth={rope * 0.45} strokeDasharray={`${dash / 2} ${dash / 2}`} strokeDashoffset={dash / 2} />
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={K.gold} strokeWidth={1.4} />
      <Circle cx={cx} cy={cy} r={innerR} fill={K.paper} stroke={K.gold} strokeWidth={1.6} />
      <Circle cx={cx} cy={cy} r={innerR - 4} fill="none" stroke={K.rose} strokeWidth={0.8} />
    </G>
  );
}

/** Palmettes fanning outward all round the medallion, with a rosette between each two. */
function Wreath({ cx, cy, from, to }: { cx: number; cy: number; from: number; to: number }) {
  const size = (to - from) * 0.95;
  const count = Math.max(16, Math.round((2 * Math.PI * from) / (size * 0.95)));
  return (
    <G>
      <Circle cx={cx} cy={cy} r={(from + to) / 2} fill="none" stroke={K.maroon} strokeWidth={size * 0.06} />
      {Array.from({ length: count }, (_, index) => {
        const turn = (index * 360) / count;
        const rad = (turn * Math.PI) / 180;
        const between = rad + Math.PI / count;
        const mid = from + size * 0.55;
        return (
          <G key={index}>
            <Palmette x={cx + Math.sin(rad) * from} y={cy - Math.cos(rad) * from} size={size} angle={turn} />
            <Rosette x={cx + Math.sin(between) * mid} y={cy - Math.cos(between) * mid} r={size * 0.26} />
          </G>
        );
      })}
    </G>
  );
}

function Rosette({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <G>
      {Array.from({ length: 8 }, (_, index) => (
        <Ellipse key={index} cx={x} cy={y - r * 0.55} rx={r * 0.26} ry={r * 0.48} fill={index % 2 ? K.rose : K.maroon} stroke={K.gold} strokeWidth={0.7} transform={`rotate(${index * 45 + 22.5} ${x} ${y})`} />
      ))}
      <Circle cx={x} cy={y} r={r * 0.3} fill={K.ivory} stroke={K.gold} strokeWidth={0.8} />
      <Circle cx={x} cy={y} r={r * 0.14} fill={K.goldDark} />
    </G>
  );
}

/** Five petals fanned from a gold bud; angle 0 points the fan up (toward smaller y). */
function Palmette({ x, y, size, angle }: { x: number; y: number; size: number; angle: number }) {
  const petal = (length: number, width: number) =>
    `M0 0C${width} ${-length * 0.3} ${width * 0.6} ${-length * 0.85} 0 ${-length}C${-width * 0.6} ${-length * 0.85} ${-width} ${-length * 0.3} 0 0Z`;
  return (
    <G transform={`translate(${x} ${y}) rotate(${angle})`}>
      {[-58, -29, 0, 29, 58].map((turn, index) => (
        <Path
          key={turn}
          d={petal(size * (index === 2 ? 0.95 : index % 2 ? 0.78 : 0.6), size * 0.2)}
          fill={index === 2 ? K.maroon : index % 2 ? K.rose : K.roseLight}
          stroke={K.gold}
          strokeWidth={0.7}
          transform={`rotate(${turn})`}
        />
      ))}
      <Circle cx={0} cy={0} r={size * 0.12} fill={K.gold} stroke={K.maroon} strokeWidth={0.7} />
    </G>
  );
}

/** A rumi curl: a tightening spiral ending in a leaf. */
function Curl({ x, y, r, flip }: { x: number; y: number; r: number; flip: number }) {
  const points: string[] = [];
  const turns = 2.2 * Math.PI;
  for (let index = 0; index <= 28; index += 1) {
    const theta = (index / 28) * turns;
    const radius = r * (1 - index / 32);
    points.push(`${(x + flip * Math.cos(theta) * radius).toFixed(1)} ${(y + Math.sin(theta) * radius).toFixed(1)}`);
  }
  return (
    <G>
      <Path d={`M${points.join("L")}`} fill="none" stroke={K.maroon} strokeWidth={r * 0.2} strokeLinecap="round" />
      <Path d={`M${points.join("L")}`} fill="none" stroke={K.goldLight} strokeWidth={r * 0.06} strokeLinecap="round" />
      <Ellipse cx={x + flip * r} cy={y - r * 0.2} rx={r * 0.22} ry={r * 0.45} fill={K.rose} stroke={K.gold} strokeWidth={0.6} transform={`rotate(${flip * 25} ${x + flip * r} ${y - r * 0.2})`} />
    </G>
  );
}
