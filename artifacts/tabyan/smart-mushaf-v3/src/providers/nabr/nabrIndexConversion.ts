/**
 * @license
 * Tabyan Smart Mushaf — Nabr / Canonical Index Boundary
 *
 * Keep every 0-based Nabr index conversion in this module. Tabyan WordKeys
 * remain 1-based and are the only coordinates the Mushaf state uses.
 */

import type { WordKey } from '../../quran/domain/types';
import type { RecitationSessionConfig } from '../contracts/types';
import {
  canonicalWordIndicesToNabr,
  canonicalWordKeyToNabrIndices,
  nabrIndicesToCanonicalWordKey,
  nabrProviderIndicesToCanonicalWordKey,
  nabrWireIndicesToProviderObservation,
  nabrWireWordIndicesToProviderObservation,
  nabrWordIndicesToCanonical,
  type NabrQrcIndices,
} from '@workspace/tabyan-domain';

export {
  canonicalWordIndicesToNabr,
  canonicalWordKeyToNabrIndices,
  nabrIndicesToCanonicalWordKey,
  nabrProviderIndicesToCanonicalWordKey,
  nabrWireIndicesToProviderObservation,
  nabrWireWordIndicesToProviderObservation,
  nabrWordIndicesToCanonical,
  type NabrQrcIndices,
};

export function canonicalSessionStartToNabrIndices(
  config: Pick<RecitationSessionConfig, 'surahNumber' | 'startAyah' | 'startWordIndex'>,
): NabrQrcIndices {
  return canonicalWordKeyToNabrIndices({
    surah: config.surahNumber,
    ayah: config.startAyah,
    wordIndex: config.startWordIndex || 1,
  });
}
