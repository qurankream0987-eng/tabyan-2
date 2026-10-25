/**
 * Phase 6 — follow mode: no per-word centering, no oscillation, never fight
 * the user's finger, rejoin after inactivity, jump (not animate) far moves.
 */

import { describe, it, expect } from 'vitest';
import { decideFollow, DEFAULT_FOLLOW_CONFIG, type FollowInput } from '../live/follow/followPolicy';

// 844 px phone viewport, 56 px top chrome, 100 px dock. Usable band: 56..744.
const viewport = { height: 844, topInset: 56, bottomInset: 100 };
const line = (top: number) => ({ top, bottom: top + 38 });
const base = (target: { top: number; bottom: number }, extra: Partial<FollowInput> = {}): FollowInput => ({
  target,
  previousTarget: null,
  viewport,
  now: 10_000,
  lastUserScrollAt: null,
  lastProgrammaticScrollAt: null,
  ...extra,
});

describe('follow policy', () => {
  it('does not scroll while the reader stays on the same line', () => {
    expect(decideFollow(base(line(400), { previousTarget: line(402) }))).toEqual({ action: 'none', reason: 'same-line' });
  });

  it('lets natural progression to the next lines happen without scrolling', () => {
    expect(decideFollow(base(line(440), { previousTarget: line(400) }))).toEqual({ action: 'none', reason: 'in-band' });
  });

  it('near the bottom edge, moves the line back to the band top in one conservative step', () => {
    const decision = decideFollow(base(line(560), { previousTarget: line(520) }));
    expect(decision.action).toBe('scroll');
    if (decision.action !== 'scroll') return;
    const bandTop = 56 + (744 - 56) * DEFAULT_FOLLOW_CONFIG.bandTop;
    expect(decision.delta).toBeCloseTo(560 - bandTop, 5);
    expect(decision.behavior).toBe('smooth');
    // After the step the line sits at the band top: the next several lines need no scroll.
    const after = 560 - decision.delta;
    for (let k = 1; k <= 8; k += 1) {
      expect(decideFollow(base(line(after + k * 38), { previousTarget: line(after + (k - 1) * 38) })).action).toBe('none');
    }
  });

  it('never oscillates: an in-view target inside the cooldown is left alone', () => {
    const decision = decideFollow(base(line(600), { lastProgrammaticScrollAt: 9_900 }));
    expect(decision).toEqual({ action: 'none', reason: 'cooldown' });
  });

  it('suspends while the user is scrolling and reports whether the cursor is visible', () => {
    expect(decideFollow(base(line(1600), { lastUserScrollAt: 9_000 }))).toEqual({ action: 'suspended', targetVisible: false });
    expect(decideFollow(base(line(300), { lastUserScrollAt: 9_000 }))).toEqual({ action: 'suspended', targetVisible: true });
  });

  it('rejoins the recitation position once the user has been idle long enough', () => {
    const decision = decideFollow(base(line(1600), { lastUserScrollAt: 10_000 - DEFAULT_FOLLOW_CONFIG.userSuspendMs - 1 }));
    expect(decision.action).toBe('scroll');
  });

  it('jumps instead of animating across long distances (page changes, relocations)', () => {
    const far = decideFollow(base(line(5_000)));
    expect(far).toMatchObject({ action: 'scroll', behavior: 'auto' });
    const near = decideFollow(base(line(900)));
    expect(near).toMatchObject({ action: 'scroll', behavior: 'smooth' });
  });

  it('brings a cursor that went above the viewport (backtrack) back into view', () => {
    const decision = decideFollow(base(line(10), { previousTarget: line(200) }));
    expect(decision.action).toBe('scroll');
    if (decision.action === 'scroll') expect(decision.delta).toBeLessThan(0);
  });
});
