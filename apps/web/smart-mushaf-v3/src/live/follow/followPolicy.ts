/**
 * @license
 * Tabyan Smart Mushaf — follow-mode scroll policy (pure)
 *
 * Keeps the recitation line inside a comfortable reading band without
 * chasing every word:
 *   - same line, or still inside the band → no scroll;
 *   - approaching the bottom edge → one conservative step that brings the
 *     line back to the top of the band (a "page turn" of several lines, not
 *     per-word centering, so it cannot oscillate);
 *   - off-screen (page change, backtrack, relocation) → bring the line to
 *     the band top; long distances jump instead of animating disorientingly;
 *   - user scrolled recently → never fight the finger; report that the
 *     cursor is out of view so the UI can offer "return to position".
 */

export interface FollowViewport {
  /** Visible height of the scroll viewport. */
  readonly height: number;
  /** Height covered by top chrome (nav bar, safe area). */
  readonly topInset: number;
  /** Height covered by bottom chrome (control bar, home indicator). */
  readonly bottomInset: number;
}

export interface TargetRect {
  /** Relative to the viewport top. */
  readonly top: number;
  readonly bottom: number;
}

export interface FollowConfig {
  /** Reading band within the usable area, as fractions from its top. */
  readonly bandTop: number;
  readonly bandBottom: number;
  /** Suspend auto-follow this long after the user scrolls or touches. */
  readonly userSuspendMs: number;
  /** Minimum gap between programmatic scrolls for in-view targets. */
  readonly minScrollIntervalMs: number;
  /** Beyond this many viewport heights, jump instead of animating. */
  readonly smoothMaxViewports: number;
}

export const DEFAULT_FOLLOW_CONFIG: FollowConfig = Object.freeze({
  bandTop: 0.16,
  bandBottom: 0.68,
  userSuspendMs: 4000,
  minScrollIntervalMs: 300,
  smoothMaxViewports: 1.5,
});

export interface FollowInput {
  readonly target: TargetRect;
  readonly previousTarget: TargetRect | null;
  readonly viewport: FollowViewport;
  readonly now: number;
  readonly lastUserScrollAt: number | null;
  readonly lastProgrammaticScrollAt: number | null;
}

export type FollowDecision =
  | { readonly action: 'none'; readonly reason: 'same-line' | 'in-band' | 'cooldown' }
  | { readonly action: 'suspended'; readonly targetVisible: boolean }
  | { readonly action: 'scroll'; readonly delta: number; readonly behavior: 'smooth' | 'auto' };

export function decideFollow(input: FollowInput, config: FollowConfig = DEFAULT_FOLLOW_CONFIG): FollowDecision {
  const { target, viewport } = input;
  const usableTop = viewport.topInset;
  const usableBottom = viewport.height - viewport.bottomInset;
  const usable = Math.max(1, usableBottom - usableTop);
  const bandTop = usableTop + usable * config.bandTop;
  const bandBottom = usableTop + usable * config.bandBottom;
  const visible = target.top >= usableTop && target.bottom <= usableBottom;

  if (input.lastUserScrollAt !== null && input.now - input.lastUserScrollAt < config.userSuspendMs) {
    return { action: 'suspended', targetVisible: visible };
  }

  const lineHeight = Math.max(1, target.bottom - target.top);
  if (
    input.previousTarget
    && Math.abs(input.previousTarget.top - target.top) < lineHeight / 2
    && visible
  ) {
    return { action: 'none', reason: 'same-line' };
  }

  if (target.top >= usableTop && target.bottom <= bandBottom) return { action: 'none', reason: 'in-band' };

  if (
    visible
    && input.lastProgrammaticScrollAt !== null
    && input.now - input.lastProgrammaticScrollAt < config.minScrollIntervalMs
  ) {
    return { action: 'none', reason: 'cooldown' };
  }

  const delta = target.top - bandTop;
  const behavior = Math.abs(delta) > viewport.height * config.smoothMaxViewports ? 'auto' : 'smooth';
  return { action: 'scroll', delta, behavior };
}
