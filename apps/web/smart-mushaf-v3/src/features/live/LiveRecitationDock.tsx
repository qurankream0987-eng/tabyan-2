/**
 * @license
 * Tabyan Smart Mushaf — live recitation dock
 *
 * Thumb-reachable bottom control. Its height is identical in every state, so
 * the Mushaf never moves when the microphone state changes. It subscribes to
 * the controller snapshot itself; the page and the glyphs are unaffected.
 */

import { memo, useSyncExternalStore } from 'react';
import { Eye, Loader2, Mic, Pause, Play, RotateCcw, Square, WifiOff } from 'lucide-react';
import type { LiveRecitationController } from '../../live/LiveRecitationController';
import { sessionStatusCopy } from '../../live/session/messages';
import { isSessionActive } from '../../live/session/sessionMachine';
import { toArabicDigits } from '../../../../src/lib/mushaf/format';
import './live-dock.css';

export interface LiveRecitationDockProps {
  readonly controller: LiveRecitationController;
  readonly mode: 'TASMEE' | 'CORRECTION';
  readonly onStart: () => void;
  readonly onStop: () => void;
  readonly onRevealWord: () => void;
  readonly onRevealAyah: () => void;
  readonly followAway: boolean;
  readonly onReturnToPosition: () => void;
  readonly startHint: string;
}

export const LiveRecitationDock = memo(function LiveRecitationDock({
  controller,
  mode,
  onStart,
  onStop,
  onRevealWord,
  onRevealAyah,
  followAway,
  onReturnToPosition,
  startHint,
}: LiveRecitationDockProps) {
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const { phase, error } = snapshot.session;
  const copy = sessionStatusCopy(phase, error);
  const active = isSessionActive(phase);
  const live = phase === 'LISTENING' || phase === 'VOICE_ACTIVE' || phase === 'TRACKING';

  const onMain = () => {
    if (phase === 'IDLE' || phase === 'ERROR') onStart();
    else if (phase === 'PAUSED') controller.resume();
    else if (live || phase === 'RECOVERING') controller.pause();
  };

  const mainLabel = phase === 'IDLE'
    ? 'ابدأ التلاوة'
    : phase === 'ERROR'
      ? 'إعادة المحاولة'
      : phase === 'PAUSED'
        ? 'متابعة التلاوة'
        : 'إيقاف مؤقت';

  const ayah = snapshot.currentAyah;
  // Which status line is visible. All three stay laid out in one grid cell
  // and only their visibility toggles, so a phase change never moves text.
  const metaLine: 'start' | 'progress' | 'hint' = copy.hint ? 'hint' : active && ayah ? 'progress' : 'start';

  return (
    <div className="sm-dock" data-phase={phase} data-tone={copy.tone} dir="rtl">
      {followAway && (
        <button type="button" className="sm-return-pill" onClick={onReturnToPosition}>
          العودة إلى موضع التلاوة
        </button>
      )}
      <div className="sm-dock-inner">
        <div className="sm-dock-status" aria-live="polite">
          <span className="sm-dock-dot" aria-hidden="true" />
          <span className="sm-dock-title">{copy.title}</span>
          <span className="sm-dock-meta">
            <span data-visible={metaLine === 'start'}>{startHint}</span>
            <span data-visible={metaLine === 'progress'}>
              {/* Counters sit in fixed-width boxes so changing numbers never move the line. */}
              الآية <span className="sm-num">{toArabicDigits(ayah?.ayah ?? 1)}</span>
              {' · '}
              <span className="sm-num">{toArabicDigits(snapshot.recited)}</span> كلمة
            </span>
            <span data-visible={metaLine === 'hint'}>{copy.hint ?? ''}</span>
          </span>
        </div>
        <div className="sm-dock-controls">
          <div className="sm-dock-side">
            {/* Always laid out, hidden when idle, so the row never changes width. */}
            <button
              type="button"
              className="sm-dock-button"
              onClick={onStop}
              aria-label="إنهاء التلاوة"
              hidden={!active}
              data-reserve="true"
            >
              <Square aria-hidden="true" />
              <span>إنهاء</span>
            </button>
          </div>

          <button
            type="button"
            className="sm-mic"
            onClick={onMain}
            aria-label={mainLabel}
            aria-pressed={live}
            data-testid="smart-mushaf-mic"
          >
            <span className="sm-mic-ring" aria-hidden="true" />
            {phase === 'REQUESTING_MIC' ? (
              <Loader2 className="sm-spin" aria-hidden="true" />
            ) : phase === 'PAUSED' ? (
              <Play aria-hidden="true" />
            ) : phase === 'ERROR' ? (
              <RotateCcw aria-hidden="true" />
            ) : phase === 'RECOVERING' ? (
              <WifiOff aria-hidden="true" />
            ) : live ? (
              <Pause aria-hidden="true" />
            ) : (
              <Mic aria-hidden="true" />
            )}
          </button>

          <div className="sm-dock-side sm-dock-side-end">
            {mode === 'TASMEE' && active ? (
              <>
                <button type="button" className="sm-dock-button" onClick={onRevealWord} aria-label="كشف الكلمة التالية">
                  <Eye aria-hidden="true" />
                  <span>كلمة</span>
                </button>
                <button type="button" className="sm-dock-button" onClick={onRevealAyah} aria-label="كشف بقية الآية">
                  <Eye aria-hidden="true" />
                  <span>آية</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});
