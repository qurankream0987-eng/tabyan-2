// @vitest-environment happy-dom
/**
 * Gate B — rendering isolation on real QCF page data.
 * Pages render once; a live word update re-renders only the glyphs it touches;
 * every WordKey is addressable without searching; word-state styling is
 * paint-only so QCF line geometry cannot move.
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getCanonicalWordIndex } from '../quran/canonical/CanonicalWordIndex';
import { WordPresentationStore, decodeVisual } from '../live/store/WordPresentationStore';
import { VisualLatencyMeter } from '../live/metrics/VisualLatencyMeter';
import { LiveRecitationController } from '../live/LiveRecitationController';
import { FakeStreamProvider, type FakeStreamScenario } from '../live/providers/FakeStreamProvider';
import { MushafLiveContext } from '../mushaf/qcf/MushafLiveContext';
import { QcfResourcesContext, type QcfResources } from '../mushaf/qcf/qcfResources';
import { QcfPage } from '../mushaf/qcf/QcfPage';
import type { QcfPageData } from '../quran/layout/qcfPageModel';
import { firstWordOfPage } from '../quran/layout/pageWordIndex';
import { createManualClock } from './helpers/manualClock';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// happy-dom has no FontFaceSet; the surah header frame measures with it.
if (!('fonts' in document)) {
  Object.defineProperty(document, 'fonts', { value: { load: async () => [], ready: Promise.resolve() } });
}

const PAGES_DIR = join(import.meta.dirname, '../../../public/mushaf/v1/pages');
const index = getCanonicalWordIndex();
const resources: QcfResources = {
  loadPage: async (page) => JSON.parse(readFileSync(join(PAGES_DIR, `${page}.json`), 'utf8')) as QcfPageData,
  ensureFont: async () => {},
  releaseFontsAround: () => {},
  fontFamily: (page) => `QCF1_p${page}`,
  fitFontSize: async () => 22,
  prefetch: () => {},
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function mount(pages: number[], scenario: FakeStreamScenario) {
  const store = new WordPresentationStore(index.totalWords);
  const meter = new VisualLatencyMeter(() => performance.now(), (callback) => callback());
  const clock = createManualClock();
  const controller = new LiveRecitationController({
    index,
    store,
    meter,
    createProvider: () => new FakeStreamProvider(index, scenario, clock),
    now: () => performance.now(),
    coalesce: (callback) => callback(),
  });
  const glyphRenders = new Map<number, number>();
  const pageRenders = new Map<number, number>();
  const live = {
    index,
    store,
    meter,
    onGlyphRender: (ordinal: number) => glyphRenders.set(ordinal, (glyphRenders.get(ordinal) ?? 0) + 1),
    onPageRender: (page: number) => pageRenders.set(page, (pageRenders.get(page) ?? 0) + 1),
  };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <QcfResourcesContext.Provider value={resources}>
        <MushafLiveContext.Provider value={live}>
          <div className="sm-mushaf" data-mask="none" data-show-confirmed="true">
            {pages.map((page) => <QcfPage key={page} page={page} width={390} height={575} />)}
          </div>
        </MushafLiveContext.Provider>
      </QcfResourcesContext.Provider>,
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return { store, meter, clock, controller, glyphRenders, pageRenders };
}

const total = (map: Map<number, number>) => [...map.values()].reduce((a, b) => a + b, 0);

describe('render isolation on real QCF pages', () => {
  beforeAll(() => {
    expect(index.totalWords).toBe(77433);
  });

  it('re-renders only the touched glyphs while following across a page boundary', async () => {
    const lastOfPage2 = index.ordinalOf(firstWordOfPage(3)!) - 1;
    expect(firstWordOfPage(3)).toEqual({ surah: 2, ayah: 6, wordIndex: 1 });
    const scenario: FakeStreamScenario = { name: 'iso', wordIntervalMs: 100, candidateLeadMs: 40, words: 20 };
    const { store, clock, controller, glyphRenders, pageRenders } = await mount([2, 3], scenario);
    const mountedGlyphs = glyphRenders.size;
    expect(mountedGlyphs).toBeGreaterThan(150);
    expect([...pageRenders.keys()].sort()).toEqual([2, 3]);
    const pageRendersAfterMount = total(pageRenders);
    glyphRenders.clear();

    const anchor = index.keyAt(lastOfPage2 - 9)!;
    await act(async () => {
      await controller.start({ anchor, scope: { from: anchor, to: { surah: 2, ayah: 20, wordIndex: 1 } }, startMode: 'anchor', useMicrophone: false });
    });
    glyphRenders.clear();

    const steps: { touched: number; rendered: number }[] = [];
    for (let step = 0; step < 40; step += 1) {
      const before = new Map(glyphRenders);
      await act(async () => {
        clock.advance(50);
      });
      const rendered = [...glyphRenders.entries()].filter(([ordinal, count]) => count !== (before.get(ordinal) ?? 0));
      steps.push({ touched: rendered.length, rendered: rendered.reduce((sum, [o, c]) => sum + c - (before.get(o) ?? 0), 0) });
    }

    // The cursor crossed from page 2 to page 3 word by word.
    expect(index.keyAt(store.getCursor())!.ayah).toBeGreaterThanOrEqual(6);
    // Pages never re-rendered for recitation progress.
    expect(total(pageRenders)).toBe(pageRendersAfterMount);
    // Each 50 ms step touched at most a handful of glyphs (old cursor, new cursor, candidate).
    expect(Math.max(...steps.map((s) => s.touched))).toBeLessThanOrEqual(3);
    // Over the whole run, far fewer glyph renders than one page re-render would cost.
    expect(total(glyphRenders)).toBeLessThan(80);
    await controller.stop();
  });

  it('addresses every rendered word by WordKey through the registry, including joined glyph-words', async () => {
    const { store } = await mount([27], { name: 'none', wordIntervalMs: 1000, candidateLeadMs: 0, words: 0 });
    const page27 = JSON.parse(readFileSync(join(PAGES_DIR, '27.json'), 'utf8')) as QcfPageData;
    let checked = 0;
    for (const verse of page27.v) {
      const [surah, ayah] = verse.k.split(':').map(Number);
      for (let wordIndex = 1; wordIndex <= index.ayahWordCount(surah, ayah); wordIndex += 1) {
        const ordinal = index.ordinalOf({ surah, ayah, wordIndex });
        if (ordinal < 0) continue;
        const onThisPage = verse.w.length > 0;
        if (!onThisPage) continue;
        const element = store.getElement(ordinal);
        if (element) {
          expect(element.dataset.o).toBeDefined();
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
    // 2:181 «بعدما»: words 3 and 4 share one glyph element; word 5 is the next glyph.
    const w3 = store.getElement(index.ordinalOf({ surah: 2, ayah: 181, wordIndex: 3 }))!;
    const w4 = store.getElement(index.ordinalOf({ surah: 2, ayah: 181, wordIndex: 4 }))!;
    const w5 = store.getElement(index.ordinalOf({ surah: 2, ayah: 181, wordIndex: 5 }))!;
    expect(w3).toBe(w4);
    expect(w3.dataset.joined).toBe('true');
    expect(w5).not.toBe(w3);
    expect(w5.previousElementSibling ?? w5.nextElementSibling).toBeTruthy();
  });

  it('lights a joined glyph-word when either of its WordKeys is current', async () => {
    const { store } = await mount([27], { name: 'none', wordIntervalMs: 1000, candidateLeadMs: 0, words: 0 });
    const w3 = index.ordinalOf({ surah: 2, ayah: 181, wordIndex: 3 });
    const w4 = index.ordinalOf({ surah: 2, ayah: 181, wordIndex: 4 });
    const element = store.getElement(w3)!;
    for (const ordinal of [w3, w4]) {
      await act(async () => {
        store.apply({ accepted: true, cursor: ordinal, recited: [ordinal], skipped: [], wordCandidates: [], flags: [] });
      });
      expect(element.dataset.s).toBe('current');
    }
    await act(async () => {
      store.apply({ accepted: true, cursor: w4 + 1, recited: [w4 + 1], skipped: [], wordCandidates: [], flags: [] });
    });
    expect(element.dataset.s).toBe('confirmed');
    expect(decodeVisual(store.visual(w3)).base).toBe('confirmed');
  });

  it('measures client latency from event to committed glyph (happy-dom, no paint)', async () => {
    const scenario: FakeStreamScenario = { name: 'lat', wordIntervalMs: 80, candidateLeadMs: 30, words: 120 };
    const { meter, clock, controller } = await mount([2, 3, 4], scenario);
    await act(async () => {
      await controller.start({ anchor: { surah: 2, ayah: 1, wordIndex: 1 }, scope: { from: { surah: 2, ayah: 1, wordIndex: 1 }, to: { surah: 2, ayah: 40, wordIndex: 1 } }, startMode: 'anchor', useMicrophone: false });
    });
    meter.reset();
    for (let step = 0; step < 300; step += 1) {
      await act(async () => {
        clock.advance(20);
      });
    }
    const report = meter.report();
    expect(report.committed.count).toBeGreaterThan(100);
    expect(report.committed.p95!).toBeLessThan(50);
    await controller.stop();
  });
});

describe('word-state styling cannot move QCF geometry', () => {
  const css = readFileSync(join(import.meta.dirname, '../mushaf/qcf/smart-mushaf.css'), 'utf8');
  const ALLOWED = new Set([
    'color',
    'background-color',
    'box-shadow',
    'text-decoration',
    'text-underline-offset',
    'transition',
  ]);

  it('only paint properties appear in live word-state rules', () => {
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    const stateRules = rules.filter(([, selector]) => /\.sm-word\[|\[data-mask|\[data-show-confirmed/.test(selector));
    expect(stateRules.length).toBeGreaterThanOrEqual(8);
    for (const [, selector, body] of stateRules) {
      const properties = body
        .split(';')
        .map((declaration) => declaration.split(':')[0].trim())
        .filter(Boolean)
        .filter((property) => !property.startsWith('/*'));
      for (const property of properties) {
        expect(ALLOWED.has(property), `${selector.trim()} → ${property}`).toBe(true);
      }
    }
  });

  it('the base glyph rule adds no box-model or font changes', () => {
    const base = css.match(/\n\.sm-word \{([^}]*)\}/)?.[1] ?? '';
    expect(base).not.toMatch(/(^|;|\s)(padding|margin|border(?!-radius)|font|width|height|letter-spacing|display|line-height)\s*:/);
  });
});
