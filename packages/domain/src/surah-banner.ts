// ── إطار عنوان السورة: رسم متجه واحد يستخدمه الموقع والتطبيق ─────────────
// شريطان متضفّران بالخمري والذهبي (ألوان المشروع) على كل جانب، ووردة في ميدالية بجوار الخرطوشة،
// وخرطوشة عاجية مستديرة الطرفين لاسم السورة. الإحداثيات في مساحة ارتفاعها 140،
// والجانب الأيمن مرآة الأيسر عند الطرف الآخر من الإطار.

export const SURAH_BANNER_HEIGHT = 140;

/** The surah-name calligraphy is drawn wider than its font, filling more of the cartouche. */
export const SURAH_TITLE_STRETCH = 1.35;

export const SURAH_BANNER_COLORS = {
  ground: "#EFE2BB",
  ivory: "#FFFCF5",
  ribbon: "#800020",
  ribbonEdge: "#D4AF37",
  ribbonShadow: "#4C091B",
  leaf: "#800020",
  petal: "#A02040",
  gold: "#B8860B",
  goldLight: "#F1D27A",
  goldMid: "#B8860B",
  goldEdge: "#D4AF37",
  bud: "#D4AF37",
  budEdge: "#806315",
} as const;

/** The left-hand panel; the right one is the same drawing mirrored at the far edge. */
export const SURAH_BANNER_SIDE = {
  /** Wide ribbon: two loops crossing at the centre of the panel. */
  knot: "M14 22C60 22 70 70 110 70S160 22 205 22M14 118C60 118 70 70 110 70S160 118 205 118M110 70C150 70 150 22 110 22S70 70 110 70ZM110 70C150 70 150 118 110 118S70 70 110 70Z",
  /** Fine ribbon weaving through it. */
  knotFine: "M14 70C40 40 70 40 110 70C150 100 180 100 205 70M14 70C40 100 70 100 110 70C150 40 180 40 205 70",
  leaves: [
    "M40 70C48 58 60 56 66 62C58 70 48 74 40 70Z",
    "M40 70C48 82 60 84 66 78C58 70 48 66 40 70Z",
    "M180 70C172 58 160 56 154 62C162 70 172 74 180 70Z",
    "M180 70C172 82 160 84 154 78C162 70 172 66 180 70Z",
  ],
  rosette: { cx: 236, cy: 70, r: 30, innerR: 25.5, heartR: 5 },
} as const;

/** Eight petals of the side rosette, as one path. */
export const SURAH_BANNER_PETALS = (() => {
  const { cx, cy } = SURAH_BANNER_SIDE.rosette;
  const pt = (r: number, a: number) => `${+(cx + r * Math.sin(a)).toFixed(1)} ${+(cy - r * Math.cos(a)).toFixed(1)}`;
  return Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return `M${pt(4, a)}Q${pt(14, a - 0.36)} ${pt(24, a)}Q${pt(14, a + 0.36)} ${pt(4, a)}Z`;
  }).join("");
})();

const CARTOUCHE_X = 275;
const CARTOUCHE = { y: 16, height: 108, innerInset: 7 } as const;

/**
 * The banner laid out for its real proportions (width ÷ height): the panels keep their size
 * at both ends and only the cartouche grows, so nothing is stretched.
 */
export function surahBannerLayout(aspect: number) {
  const height = SURAH_BANNER_HEIGHT;
  const viewWidth = Math.max(760, Math.round(height * aspect));
  const cartoucheWidth = viewWidth - 2 * CARTOUCHE_X;
  const inset = CARTOUCHE.innerInset;
  return {
    viewWidth,
    frame: { x: 2, y: 2, width: viewWidth - 4, height: height - 4 },
    rule: { x: 9, y: 9, width: viewWidth - 18, height: height - 18 },
    /** Transform that mirrors the left panel onto the right end. */
    mirror: `translate(${viewWidth} 0) scale(-1 1)`,
    cartouche: { x: CARTOUCHE_X, y: CARTOUCHE.y, width: cartoucheWidth, height: CARTOUCHE.height, rx: CARTOUCHE.height / 2 },
    cartoucheInner: {
      x: CARTOUCHE_X + inset, y: CARTOUCHE.y + inset,
      width: cartoucheWidth - 2 * inset, height: CARTOUCHE.height - 2 * inset, rx: CARTOUCHE.height / 2 - inset,
    },
    /** The title's box inside the cartouche, as shares of the banner. */
    title: {
      left: (CARTOUCHE_X + CARTOUCHE.height / 2) / viewWidth,
      width: (cartoucheWidth - CARTOUCHE.height) / viewWidth,
      top: (CARTOUCHE.y + inset) / height,
      height: (CARTOUCHE.height - 2 * inset) / height,
    },
  };
}

/**
 * The calligraphic surah-name font (the printed mushaf's header lettering) draws a whole
 * "سُورَةُ …" title as one glyph, reached by the surah number written with three digits.
 */
export const SURAH_NAME_FONT_FAMILY = "TabyanSurahNames";
export function surahNameGlyph(surahNumber: number): string {
  return String(surahNumber).padStart(3, "0");
}
