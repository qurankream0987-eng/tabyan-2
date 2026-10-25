/**
 * @license
 * Tabyan Smart Mushaf — one QCF glyph-word
 *
 * The only component that re-renders when a word's recitation state changes.
 * It subscribes to its own canonical ordinal(s) in the presentation store and
 * registers its element for direct, search-free addressing. State is shown
 * with colour and a paint-only background — never size, weight, padding or
 * width — so QCF line geometry cannot shift.
 */

import { memo, useCallback, useLayoutEffect, useSyncExternalStore } from 'react';
import { combineVisuals, decodeVisual } from '../../live/store/WordPresentationStore';
import { useMushafLive } from './MushafLiveContext';

interface QcfWordProps {
  /** One ordinal, or two for a joined QDC glyph-word. */
  readonly first: number;
  readonly second: number;
  readonly code: string;
}

export const QcfWord = memo(function QcfWord({ first, second, code }: QcfWordProps) {
  const { store, meter, onGlyphRender } = useMushafLive();

  const subscribe = useCallback(
    (listener: () => void) => {
      const offFirst = store.subscribe(first, listener);
      const offSecond = second >= 0 ? store.subscribe(second, listener) : null;
      return () => {
        offFirst();
        offSecond?.();
      };
    },
    [store, first, second],
  );
  const getVisual = useCallback(
    () => (second >= 0 ? combineVisuals(store.visual(first), store.visual(second)) : store.visual(first)),
    [store, first, second],
  );
  const visual = useSyncExternalStore(subscribe, getVisual, getVisual);

  const ref = useCallback(
    (element: HTMLSpanElement | null) => {
      store.registerElement(first, element);
      if (second >= 0) store.registerElement(second, element);
    },
    [store, first, second],
  );

  useLayoutEffect(() => {
    if (!meter) return;
    meter.committedFor(first);
    if (second >= 0) meter.committedFor(second);
  }, [meter, visual, first, second]);

  onGlyphRender?.(first);
  const decoded = decodeVisual(visual);
  return (
    <span
      ref={ref}
      className="sm-word"
      data-o={first}
      data-s={decoded.state}
      data-b={decoded.base}
      data-mistake={decoded.mistake || undefined}
      data-tashkeel={decoded.tashkeelWarning || undefined}
      data-joined={second >= 0 || undefined}
    >
      {code}
    </span>
  );
});
