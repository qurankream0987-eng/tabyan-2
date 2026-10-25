import { memo, type ReactNode } from "react";

/** Decoration only: rules sit outside/over the paper edge with pointer-events none,
 * never changing QCF dimensions. Height follows the paper (short pages stay short). */
function MushafPageFrame({ width, mode, children }: {
  width: number;
  /** Full printed-page height; the paper inside may be shorter (short-page composition). */
  height: number;
  mode: "aspect" | "fill";
  children: ReactNode;
}) {
  return (
    <article className="tby-page-frame" data-frame={mode} style={{ width }}>
      {children}
      <span className="tby-page-frame-rule" aria-hidden="true" />
      <span className="tby-page-frame-corner" data-c="tr" aria-hidden="true" />
      <span className="tby-page-frame-corner" data-c="tl" aria-hidden="true" />
      <span className="tby-page-frame-corner" data-c="br" aria-hidden="true" />
      <span className="tby-page-frame-corner" data-c="bl" aria-hidden="true" />
    </article>
  );
}

export default memo(MushafPageFrame);
