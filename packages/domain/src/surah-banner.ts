// ── إطار عنوان السورة: رسم متجه واحد يستخدمه الموقع والتطبيق ─────────────
// لوحتان من الزخرفة النباتية بالأخضر والذهبي، وميدالية على كل جانب فوق نجمة ثمانية،
// وخرطوشة عاجية في الوسط لاسم السورة. الإحداثيات في مساحة 1000×140.

export const SURAH_BANNER_VIEWBOX = { width: 1000, height: 140 } as const;

export const SURAH_BANNER_COLORS = {
  ivory: "#FBF6E6",
  sage: "#B9C9A9",
  leaf: "#6F8D62",
  star: "#5E7C52",
  gold: "#B58F33",
  goldLight: "#E2C463",
  goldMid: "#B8912F",
  goldEdge: "#D8B652",
  bud: "#D9B44A",
  budEdge: "#8C6B1F",
  scroll: "#C9A646",
  pearl: "#F3E7C4",
  caption: "#6B5A2E",
} as const;

/** Outer frame and the patterned band inside it. */
export const SURAH_BANNER_FRAME = { x: 2, y: 2, width: 996, height: 136, strokeWidth: 4 } as const;
export const SURAH_BANNER_BAND = { x: 10, y: 10, width: 980, height: 120, strokeWidth: 1.2 } as const;

/** One 36×36 arabesque tile: four leaves round a gold bud, scrolls joining the tiles. */
export const SURAH_BANNER_TILE = {
  size: 36,
  offsetY: 16,
  leaves: [
    "M18 4C22 9 22 14 18 18C14 14 14 9 18 4Z",
    "M18 32C22 27 22 22 18 18C14 22 14 27 18 32Z",
    "M4 18C9 14 14 14 18 18C14 22 9 22 4 18Z",
    "M32 18C27 14 22 14 18 18C22 22 27 22 32 18Z",
  ],
  scrolls: "M0 0C6 6 6 12 0 18M36 0C30 6 30 12 36 18M0 36C6 30 6 24 0 18M36 36C30 30 30 24 36 18",
  pearls: [[0, 0], [36, 0], [0, 36], [36, 36]] as const,
} as const;

/** Medallion centres (x): the ayah count on the left, the surah order on the right, as in print. */
export const SURAH_BANNER_MEDALLION_X = { ayahs: 135, order: 865 } as const;
export const SURAH_BANNER_MEDALLION = { cy: 70, r: 47, innerR: 41.5 } as const;

/** Eight-point star behind a medallion centred at `cx`. */
export function surahBannerStar(cx: number): string {
  const base = [
    [0, 14], [14.6, 34.6], [35, 35], [35.4, 55.4], [56, 70], [35.4, 84.6], [35, 105], [14.6, 105.4],
    [0, 126], [-14.6, 105.4], [-35, 105], [-35.4, 84.6], [-56, 70], [-35.4, 55.4], [-35, 35], [-14.6, 34.6],
  ];
  return base.map(([dx, y]) => `${+(cx + dx).toFixed(1)},${y}`).join(" ");
}

/** The ivory cartouche for the surah name, its inner rule, and the gold finials at its tips. */
export const SURAH_BANNER_CARTOUCHE = "M308 16H692C715 16 724.6 34 741.9 44C761.1 55 770.7 63 778.4 70C770.7 77 761.1 85 741.9 96C724.6 106 715 124 692 124H308C285 124 275.4 106 258.1 96C238.9 85 229.3 77 221.6 70C229.3 63 238.9 55 258.1 44C275.4 34 285 16 308 16Z";
export const SURAH_BANNER_CARTOUCHE_INNER = "M311.8 23H688.2C707.4 23 717 38 732.3 47C747.7 56 756.3 63 762.1 70C756.3 77 747.7 84 732.3 93C717 102 707.4 117 688.2 117H311.8C292.6 117 283 102 267.7 93C252.3 84 243.7 77 237.9 70C243.7 63 252.3 56 267.7 47C283 38 292.6 23 311.8 23Z";
export const SURAH_BANNER_FINIALS = "M778.4 70l10-6 10 6-10 6ZM221.6 70l-10-6-10 6 10 6Z";

/** The cartouche's inner width as a share of the banner (for fitting the title). */
export const SURAH_BANNER_TITLE_SPAN = { left: 0.27, right: 0.73 } as const;

/** Moves every point of the right half (x > 500) to the right edge of a banner `viewWidth` wide. */
function stretchPath(d: string, dx: number): string {
  return d.replace(/([MHCL])([^MHCLZml]*)/g, (_, cmd: string, args: string) => {
    const nums = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    const moved = cmd === "H"
      ? nums.map((x) => (x > 500 ? x + dx : x))
      : nums.map((n, i) => (i % 2 === 0 && n > 500 ? n + dx : n));
    return cmd + moved.map((n) => +n.toFixed(1)).join(" ");
  });
}

/**
 * The banner laid out for its real proportions (width ÷ height), so the medallions stay round
 * and the pattern keeps its shape: only the cartouche grows, the two ends keep their size.
 */
export function surahBannerLayout(aspect: number) {
  const height = SURAH_BANNER_VIEWBOX.height;
  const viewWidth = Math.max(760, Math.round(height * aspect));
  const dx = viewWidth - SURAH_BANNER_VIEWBOX.width;
  const ayahsX = SURAH_BANNER_MEDALLION_X.ayahs;
  const orderX = SURAH_BANNER_MEDALLION_X.order + dx;
  return {
    viewWidth,
    frame: { ...SURAH_BANNER_FRAME, width: SURAH_BANNER_FRAME.width + dx },
    band: { ...SURAH_BANNER_BAND, width: SURAH_BANNER_BAND.width + dx },
    medallions: [ayahsX, orderX].map((cx) => ({ cx, star: surahBannerStar(cx) })),
    cartouche: stretchPath(SURAH_BANNER_CARTOUCHE, dx),
    cartoucheInner: stretchPath(SURAH_BANNER_CARTOUCHE_INNER, dx),
    finials: `M${+(778.4 + dx).toFixed(1)} 70l10-6 10 6-10 6ZM221.6 70l-10-6-10 6 10 6Z`,
    /** Medallion centres and the cartouche's inner span, as shares of the width. */
    ayahsFrac: ayahsX / viewWidth,
    orderFrac: orderX / viewWidth,
    titleLeft: 311.8 / viewWidth,
    titleRight: (688.2 + dx) / viewWidth,
  };
}
