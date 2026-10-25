/**
 * @license
 * Tabyan Smart Mushaf — live rendering context
 * Stable for the life of the reader: changing recitation state never changes
 * this value, so nothing above the glyphs re-renders on word updates.
 */

import { createContext, useContext } from 'react';
import type { CanonicalWordIndex } from '../../quran/canonical/CanonicalWordIndex';
import type { WordPresentationStore } from '../../live/store/WordPresentationStore';
import type { VisualLatencyMeter } from '../../live/metrics/VisualLatencyMeter';

export interface MushafLiveContextValue {
  readonly index: CanonicalWordIndex;
  readonly store: WordPresentationStore;
  readonly meter: VisualLatencyMeter | null;
  /** Test/diagnostic hooks: called on every glyph / page render. */
  readonly onGlyphRender?: (ordinal: number) => void;
  readonly onPageRender?: (page: number) => void;
}

export const MushafLiveContext = createContext<MushafLiveContextValue | null>(null);

export function useMushafLive(): MushafLiveContextValue {
  const value = useContext(MushafLiveContext);
  if (!value) throw new Error('MushafLiveContext is missing');
  return value;
}
