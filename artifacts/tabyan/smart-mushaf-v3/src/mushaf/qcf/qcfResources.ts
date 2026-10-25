/**
 * @license
 * Tabyan Smart Mushaf — QCF page resources
 * Reuses the Tabyan reader's QCF v2 loaders (per-page JSON with Cache API,
 * per-page woff2 FontFace) and its fitted-font measurement.
 */

import { createContext } from 'react';
import { loadPage, prefetchAround } from '../../../../src/lib/mushaf/pages';
import { ensurePageFont, pageFontFamily, retainPageFonts } from '../../../../src/lib/mushaf/fonts';
import { maxFontSizeFor, LINE_COUNT, type PageVariant } from '../../../../src/lib/mushaf/page-layout';
import type { QcfPageData, QcfPageModel } from '../../quran/layout/qcfPageModel';

export interface QcfResources {
  loadPage(page: number): Promise<QcfPageData>;
  /** Resolves once the page's font can render. */
  ensureFont(page: number): Promise<void>;
  /** Releases fonts of pages far from the visible window (never on-screen ones). */
  releaseFontsAround(centerPage: number, radius: number): void;
  fontFamily(page: number): string;
  /** Font size that makes the widest printed line fill the paper width. */
  fitFontSize(model: QcfPageModel, width: number, height: number): Promise<number>;
  prefetch(page: number): void;
}

export function pageVariant(page: number): PageVariant {
  return page === 1 || page === 2 ? 'opening' : 'standard';
}

const fittedSizes = new Map<string, number>();

async function measureFit(model: QcfPageModel, width: number, height: number): Promise<number> {
  const cacheKey = `${model.page}:${Math.round(width)}`;
  const cached = fittedSizes.get(cacheKey);
  if (cached) return cached;
  const family = pageFontFamily(model.page);
  try {
    await document.fonts.load(`100px "${family}"`);
  } catch {
    /* measure with whatever is available */
  }
  const ctx = document.createElement('canvas').getContext('2d');
  const titleRowH = height / LINE_COUNT;
  if (!ctx) return titleRowH * 0.5;
  ctx.font = `100px "${family}"`;
  const space = ctx.measureText(' ').width;
  let widest = 0;
  for (const row of model.rows) {
    if (row.kind !== 'words' || row.glyphs.length === 0) continue;
    const lineWidth = row.glyphs.reduce((sum, glyph) => sum + ctx.measureText(glyph.code).width, 0)
      + (row.glyphs.length - 1) * space;
    widest = Math.max(widest, lineWidth);
  }
  const fitted = widest > 0 ? (width * 0.94 * 100) / widest : titleRowH * 0.5;
  const size = Math.min(fitted, maxFontSizeFor(pageVariant(model.page), height));
  fittedSizes.set(cacheKey, size);
  return size;
}

export const browserQcfResources: QcfResources = {
  loadPage: (page) => loadPage(page) as Promise<QcfPageData>,
  ensureFont: ensurePageFont,
  releaseFontsAround: retainPageFonts,
  fontFamily: pageFontFamily,
  fitFontSize: measureFit,
  prefetch: prefetchAround,
};

export const QcfResourcesContext = createContext<QcfResources>(browserQcfResources);
