/**
 * @license
 * Tabyan Smart Mushaf — continuous Madani Mushaf view
 *
 * All 604 pages share one fixed slot height, so page positions are plain
 * arithmetic: no measurement, no layout jumps as pages load. Only the pages
 * around the viewport are mounted. Follow mode reads the cursor element from
 * the presentation store's registry (never a DOM/text search) once per
 * animation frame and applies the pure follow policy.
 */

import {
  forwardRef,
  memo,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  startTransition,
  type MouseEvent,
} from 'react';
import { computeMushafPageFit } from '../../../../src/lib/mushaf/pages';
import type { WordKey } from '../../quran/domain/types';
import { pageOfWord, TOTAL_MUSHAF_PAGES } from '../../quran/layout/pageWordIndex';
import { decideFollow, DEFAULT_FOLLOW_CONFIG, type FollowConfig, type TargetRect } from '../../live/follow/followPolicy';
import { useMushafLive } from './MushafLiveContext';
import { QcfResourcesContext } from './qcfResources';
import { QcfPage } from './QcfPage';
import { toArabicDigits } from '../../../../src/lib/mushaf/format';
import '../../../../src/components/mushaf/mushaf-reader.css';
import './smart-mushaf.css';

const PAGE_GAP = 14;
const MOUNT_RADIUS = 1;

export interface QcfMushafViewHandle {
  scrollToPage(page: number, behavior?: ScrollBehavior): void;
  scrollToWord(key: WordKey, behavior?: ScrollBehavior): void;
  /** Rejoins the recitation position after the user scrolled away. */
  resumeFollow(): void;
  getVisiblePage(): number;
}

export interface QcfMushafViewProps {
  readonly initialPage: number;
  readonly followEnabled: boolean;
  /** Chrome covering the top / bottom of the viewport (px, incl. safe areas). */
  readonly topInset: number;
  readonly bottomInset: number;
  readonly maskMode: 'none' | 'tasmee';
  readonly showConfirmed: boolean;
  readonly onVisiblePageChange?: (page: number) => void;
  /** True while the user has scrolled away from an out-of-view recitation cursor. */
  readonly onFollowAwayChange?: (away: boolean) => void;
  readonly onWordActivate?: (ordinal: number) => void;
  readonly followConfig?: FollowConfig;
}

function clampPage(page: number): number {
  return Math.min(TOTAL_MUSHAF_PAGES, Math.max(1, Math.round(page)));
}

export const QcfMushafView = memo(forwardRef<QcfMushafViewHandle, QcfMushafViewProps>(function QcfMushafView(
  {
    initialPage,
    followEnabled,
    topInset,
    bottomInset,
    maskMode,
    showConfirmed,
    onVisiblePageChange,
    onFollowAwayChange,
    onWordActivate,
    followConfig = DEFAULT_FOLLOW_CONFIG,
  },
  forwardedRef,
) {
  const { index, store } = useMushafLive();
  const resources = useContext(QcfResourcesContext);
  const rootRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [centerPage, setCenterPage] = useState(clampPage(initialPage));
  const [cursorPage, setCursorPage] = useState(0);

  const fit = computeMushafPageFit(box.width, box.height);
  const slotHeight = fit.h + PAGE_GAP;

  // Live values for event handlers, without re-subscribing.
  const live = useRef({ slotHeight, fit, centerPage, topInset, bottomInset, followEnabled, followConfig });
  live.current = { slotHeight, fit, centerPage, topInset, bottomInset, followEnabled, followConfig };
  const follow = useRef({
    lastUserScrollAt: null as number | null,
    lastProgrammaticScrollAt: null as number | null,
    previousTarget: null as TargetRect | null,
    away: false,
    framePending: false,
  });
  const pendingInitialPage = useRef<number | null>(clampPage(initialPage));
  const callbacks = useRef({ onVisiblePageChange, onFollowAwayChange, onWordActivate });
  callbacks.current = { onVisiblePageChange, onFollowAwayChange, onWordActivate };

  const rootTop = useCallback(() => {
    const root = rootRef.current;
    return root ? root.getBoundingClientRect().top + window.scrollY : 0;
  }, []);

  const scrollToY = useCallback((y: number, behavior: ScrollBehavior) => {
    follow.current.lastProgrammaticScrollAt = performance.now();
    window.scrollTo({ top: Math.max(0, y), behavior });
  }, []);

  const pageTop = useCallback((page: number) => rootTop() + (page - 1) * live.current.slotHeight, [rootTop]);

  const setAway = useCallback((away: boolean) => {
    if (follow.current.away === away) return;
    follow.current.away = away;
    callbacks.current.onFollowAwayChange?.(away);
  }, []);

  // ── Measure the reading column ─────────────────────────────────────────
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => setBox({ width: root.clientWidth, height: window.innerHeight });
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(root);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Keep the same page in view across width changes (rotation, zoom).
  const anchoredPage = useRef(centerPage);
  useLayoutEffect(() => {
    if (fit.h <= 0) return;
    const target = pendingInitialPage.current ?? anchoredPage.current;
    pendingInitialPage.current = null;
    window.scrollTo({ top: Math.max(0, pageTop(target) - live.current.topInset), behavior: 'auto' });
    // Re-anchor only when the slot height changes; scroll position owns the rest.
  }, [slotHeight]);

  // ── Visible page tracking ──────────────────────────────────────────────
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const { slotHeight: slot, topInset: inset } = live.current;
      if (slot <= PAGE_GAP) return;
      const viewportMid = window.scrollY + inset + (window.innerHeight - inset) * 0.35;
      const page = clampPage(Math.floor((viewportMid - rootTop()) / slot) + 1);
      anchoredPage.current = page;
      // Page mounts are interruptible: live word updates (sync lane) always win.
      startTransition(() => setCenterPage((previous) => (previous === page ? previous : page)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [rootTop]);

  useEffect(() => {
    callbacks.current.onVisiblePageChange?.(centerPage);
    resources.prefetch(centerPage);
    resources.releaseFontsAround(centerPage, MOUNT_RADIUS + 4);
  }, [centerPage, resources]);

  // ── User interaction suspends follow ───────────────────────────────────
  useEffect(() => {
    const markUser = () => {
      follow.current.lastUserScrollAt = performance.now();
    };
    const onKey = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) markUser();
    };
    window.addEventListener('wheel', markUser, { passive: true });
    window.addEventListener('touchstart', markUser, { passive: true });
    window.addEventListener('touchmove', markUser, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', markUser);
      window.removeEventListener('touchstart', markUser);
      window.removeEventListener('touchmove', markUser);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // ── Follow mode ────────────────────────────────────────────────────────
  const evaluateFollow = useCallback(() => {
    follow.current.framePending = false;
    const cursor = store.getCursor();
    if (cursor < 0) return;
    const key = index.keyAt(cursor);
    if (!key) return;
    const page = pageOfWord(key, index);
    startTransition(() => setCursorPage((previous) => (previous === page ? previous : page)));
    if (!live.current.followEnabled) return;

    const viewport = { height: window.innerHeight, topInset: live.current.topInset, bottomInset: live.current.bottomInset };
    const element = store.getElement(cursor);
    const now = performance.now();
    let target: TargetRect;
    if (element) {
      const rect = element.getBoundingClientRect();
      target = { top: rect.top, bottom: rect.bottom };
    } else {
      // Page not mounted yet: aim at the page top; the next event refines.
      const top = pageTop(page) - window.scrollY;
      target = { top, bottom: top + live.current.fit.h / 15 };
    }
    const decision = decideFollow(
      {
        target,
        previousTarget: follow.current.previousTarget,
        viewport,
        now,
        lastUserScrollAt: follow.current.lastUserScrollAt,
        lastProgrammaticScrollAt: follow.current.lastProgrammaticScrollAt,
      },
      live.current.followConfig,
    );
    if (decision.action === 'suspended') {
      setAway(!decision.targetVisible);
      follow.current.previousTarget = null;
      return;
    }
    setAway(false);
    follow.current.lastUserScrollAt = null;
    if (decision.action === 'scroll') {
      scrollToY(window.scrollY + decision.delta, decision.behavior);
      follow.current.previousTarget = null;
    } else {
      follow.current.previousTarget = target;
    }
  }, [store, index, pageTop, scrollToY, setAway]);

  useEffect(
    () =>
      store.subscribeCursor(() => {
        if (follow.current.framePending) return;
        follow.current.framePending = true;
        requestAnimationFrame(evaluateFollow);
      }),
    [store, evaluateFollow],
  );

  useImperativeHandle(
    forwardedRef,
    () => ({
      scrollToPage: (page, behavior = 'auto') => {
        follow.current.lastUserScrollAt = performance.now();
        scrollToY(pageTop(clampPage(page)) - live.current.topInset, behavior);
      },
      scrollToWord: (key, behavior = 'smooth') => {
        const ordinal = index.ordinalOf(key);
        const element = ordinal >= 0 ? store.getElement(ordinal) : null;
        const usable = window.innerHeight - live.current.topInset - live.current.bottomInset;
        if (element) {
          const rect = element.getBoundingClientRect();
          scrollToY(window.scrollY + rect.top - live.current.topInset - usable * live.current.followConfig.bandTop, behavior);
        } else {
          scrollToY(pageTop(pageOfWord(key, index)) - live.current.topInset, behavior);
        }
      },
      resumeFollow: () => {
        follow.current.lastUserScrollAt = null;
        follow.current.previousTarget = null;
        setAway(false);
        evaluateFollow();
      },
      getVisiblePage: () => live.current.centerPage,
    }),
    [index, store, pageTop, scrollToY, setAway, evaluateFollow],
  );

  const onClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-o]');
    const ordinal = target ? Number(target.dataset.o) : Number.NaN;
    if (Number.isInteger(ordinal)) callbacks.current.onWordActivate?.(ordinal);
  }, []);

  const mounted: number[] = [];
  for (let page = centerPage - MOUNT_RADIUS; page <= centerPage + MOUNT_RADIUS; page += 1) {
    if (page >= 1 && page <= TOTAL_MUSHAF_PAGES) mounted.push(page);
  }
  if (cursorPage > 0 && Math.abs(cursorPage - centerPage) === MOUNT_RADIUS + 1) mounted.push(cursorPage);

  return (
    <div
      ref={rootRef}
      className="sm-mushaf"
      data-mask={maskMode}
      data-show-confirmed={showConfirmed ? 'true' : 'false'}
      onClick={onClick}
      style={{ height: fit.h > 0 ? TOTAL_MUSHAF_PAGES * slotHeight : '100vh' }}
    >
      {fit.h > 0 && mounted.map((page) => (
        <div
          key={page}
          className="sm-slot"
          style={{ top: (page - 1) * slotHeight, height: slotHeight, width: fit.w }}
        >
          <QcfPage page={page} width={fit.w} height={fit.h} />
          <div className="sm-page-number" aria-label={`صفحة ${page}`}>{toArabicDigits(page)}</div>
        </div>
      ))}
    </div>
  );
}));
