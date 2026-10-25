/**
 * @license
 * Tabyan Smart Mushaf — live provider factory (production safety boundary)
 *
 * Production builds can only construct the Nabr adapter, which talks to the
 * authenticated Tabyan gateway. The fake stream is reachable only behind
 * `import.meta.env.DEV`: Vite replaces that constant at build time, so the
 * fake module is dead code and is not shipped in production bundles. There is
 * no silent fallback — asking for the fake stream in production throws.
 */

import type { CanonicalWordIndex } from '../../quran/canonical/CanonicalWordIndex';
import type { WordKey } from '../../quran/domain/types';
import type { LiveRecitationProvider } from '../contracts/provider';
import { NabrLiveAdapter } from './NabrLiveAdapter';
import type { FakeStreamScenario } from './FakeStreamProvider';

export type LiveProviderKind = 'nabr' | 'fake-stream';

export class ProviderNotAllowedError extends Error {
  constructor(kind: string) {
    super(`Live provider "${kind}" is not available in this build.`);
    this.name = 'ProviderNotAllowedError';
  }
}

/** True only in Vite dev servers and test runs; false in every production build. */
export function isDevelopmentBuild(): boolean {
  return import.meta.env.DEV === true;
}

export function defaultLiveProviderKind(): LiveProviderKind {
  return isDevelopmentBuild() ? 'fake-stream' : 'nabr';
}

export interface LiveProviderOptions {
  readonly resumeAnchor?: () => WordKey | null;
  readonly fakeScenario?: FakeStreamScenario;
}

type FakeModule = typeof import('./FakeStreamProvider');
let fakeModule: FakeModule | null = null;

/** Loads the dev-only fake module ahead of the tap, so starting stays synchronous. */
export async function preloadLiveProvider(kind: LiveProviderKind): Promise<void> {
  if (kind !== 'fake-stream') return;
  // The import lives inside the DEV branch so production builds omit the chunk entirely.
  if (import.meta.env.DEV) {
    fakeModule ??= await import('./FakeStreamProvider');
    return;
  }
  throw new ProviderNotAllowedError(kind);
}

export function createLiveProvider(
  kind: LiveProviderKind,
  index: CanonicalWordIndex,
  options: LiveProviderOptions = {},
): LiveRecitationProvider {
  if (kind === 'nabr') return new NabrLiveAdapter(index, { resumeAnchor: options.resumeAnchor });
  if (kind === 'fake-stream') {
    if (!import.meta.env.DEV) throw new ProviderNotAllowedError(kind);
    if (!fakeModule) throw new Error('preloadLiveProvider("fake-stream") must resolve first');
    return new fakeModule.FakeStreamProvider(index, options.fakeScenario);
  }
  throw new ProviderNotAllowedError(String(kind));
}
