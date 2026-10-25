/**
 * @license
 * Tabyan Smart Mushaf — one printed Madani page (QCF v2)
 *
 * Fixed paper geometry (622:917) with every row at its printed line. The page
 * receives no recitation props at all: it renders once per mount, and only
 * its glyph-words react to recitation through the presentation store.
 */

import { memo, startTransition, useContext, useEffect, useMemo, useState } from 'react';
import SurahHeaderFrame from '../../../../src/components/mushaf/SurahHeaderFrame';
import { computePageLayout, LINE_COUNT } from '../../../../src/lib/mushaf/page-layout';
import { buildQcfPageModel, type QcfPageModel } from '../../quran/layout/qcfPageModel';
import { useMushafLive } from './MushafLiveContext';
import { QcfResourcesContext, pageVariant } from './qcfResources';
import { QcfWord } from './QcfWord';

const models = new Map<number, QcfPageModel>();

interface Ready {
  readonly model: QcfPageModel;
  readonly fontSize: number;
}

export interface QcfPageProps {
  readonly page: number;
  readonly width: number;
  readonly height: number;
}

export const QcfPage = memo(function QcfPage({ page, width, height }: QcfPageProps) {
  const { index, onPageRender } = useMushafLive();
  const resources = useContext(QcfResourcesContext);
  onPageRender?.(page);
  const [ready, setReady] = useState<Ready | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    (async () => {
      let model = models.get(page);
      if (!model) {
        model = buildQcfPageModel(await resources.loadPage(page), index);
        models.set(page, model);
      }
      await resources.ensureFont(page);
      const fontSize = await resources.fitFontSize(model, width, height);
      // Rendering ~150 glyphs is deferrable work; never block a live word update.
      if (!cancelled) startTransition(() => setReady({ model, fontSize }));
    })().catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [page, width, height, index, resources]);

  const variant = pageVariant(page);
  const layout = useMemo(
    () => (ready ? computePageLayout(ready.model.rows, ready.model.rowCount, height, variant) : null),
    [ready, height, variant],
  );
  const family = resources.fontFamily(page);
  const titleRowH = height / LINE_COUNT;

  return (
    <div
      dir="rtl"
      className="sm-paper tby-mushaf-paper"
      data-mushaf-page={page}
      data-ready={ready ? 'true' : undefined}
      style={{ width, height }}
    >
      {failed && <div className="sm-page-error">تعذر تحميل الصفحة {page}</div>}
      {ready && layout && ready.model.rows.map((row) => {
        const top = layout.tops.get(row.line) ?? 0;
        if (row.kind === 'surah-header') {
          return (
            <div key={`h${row.line}`} className="sm-row sm-row-center" style={{ top, height: titleRowH }}>
              <SurahHeaderFrame
                surahName={row.name}
                rowH={titleRowH}
                width={width}
                variant={variant}
                surahNumber={row.surah}
                ayahCount={row.ayahCount}
              />
            </div>
          );
        }
        if (row.kind === 'basmalah') {
          return (
            <div key={`b${row.line}`} className="sm-row sm-row-center" style={{ top, height: layout.wordRowH }}>
              <span
                className="sm-basmala font-quran"
                style={{ fontSize: Math.min(ready.fontSize * 1.1, titleRowH * 0.62) }}
              >
                {row.text}
              </span>
            </div>
          );
        }
        const centered = row.centered || variant === 'opening';
        return (
          <div key={`l${row.line}`} className="sm-row" style={{ top, height: layout.wordRowH }}>
            <div
              className={centered ? 'sm-line sm-line-centered' : 'sm-line'}
              style={{ fontFamily: `"${family}"`, fontSize: ready.fontSize }}
            >
              {row.glyphs.map((glyph, i) =>
                glyph.kind === 'word' ? (
                  <QcfWord key={i} first={glyph.first} second={glyph.second} code={glyph.code} />
                ) : (
                  <span key={i} className="sm-ayah-end tby-ayah-marker" data-verse={glyph.verseKey}>
                    {glyph.code}
                  </span>
                ),
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});
