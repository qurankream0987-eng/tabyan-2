/**
 * @license
 * Tabyan Smart Mushaf — development diagnostics (DEV BUILDS ONLY)
 * Loaded lazily behind `import.meta.env.DEV`; never part of a production bundle.
 */

import { useEffect, useState, useSyncExternalStore } from 'react';
import type { LiveRecitationController } from '../live/LiveRecitationController';
import type { VisualLatencyMeter, LatencyStats } from '../live/metrics/VisualLatencyMeter';
import type { LiveProviderKind } from '../live/providers/createLiveProvider';
import { FAKE_STREAM_SCENARIOS } from '../live/providers/FakeStreamProvider';

export interface LiveDiagnosticsPanelProps {
  readonly controller: LiveRecitationController;
  readonly meter: VisualLatencyMeter;
  readonly providerKind: LiveProviderKind;
  readonly onProviderKind: (kind: LiveProviderKind) => void;
  readonly scenario: string;
  readonly onScenario: (scenario: string) => void;
}

function stats(label: string, value: LatencyStats) {
  const fmt = (n: number | null) => (n === null ? '—' : n.toFixed(1));
  return (
    <tr>
      <td>{label}</td>
      <td>{value.count}</td>
      <td>{fmt(value.p50)}</td>
      <td>{fmt(value.p95)}</td>
      <td>{fmt(value.p99)}</td>
    </tr>
  );
}

export default function LiveDiagnosticsPanel({
  controller,
  meter,
  providerKind,
  onProviderKind,
  scenario,
  onScenario,
}: LiveDiagnosticsPanelProps) {
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState(meter.report());

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setReport(meter.report()), 500);
    return () => clearInterval(timer);
  }, [open, meter]);

  const t = snapshot.session.timings;
  const since = (a: number | null, b: number | null) => (a !== null && b !== null ? `${Math.round(b - a)} ms` : '—');

  return (
    <div className="fixed top-14 left-2 z-50 text-[11px] font-mono" dir="ltr">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="px-2 py-1 rounded bg-black/70 text-white"
      >
        DEV {open ? '▾' : '▸'} {snapshot.session.phase}
      </button>
      {open && (
        <div className="mt-1 p-2 rounded bg-black/80 text-white space-y-2 w-72">
          <div className="flex gap-2 items-center">
            <span>provider</span>
            <select
              value={providerKind}
              onChange={(event) => onProviderKind(event.target.value as LiveProviderKind)}
              className="bg-black text-white border border-white/30"
            >
              <option value="fake-stream">fake-stream (dev)</option>
              <option value="nabr">nabr gateway</option>
            </select>
          </div>
          {providerKind === 'fake-stream' && (
            <div className="flex gap-2 items-center">
              <span>scenario</span>
              <select
                value={scenario}
                onChange={(event) => onScenario(event.target.value)}
                className="bg-black text-white border border-white/30"
              >
                {Object.keys(FAKE_STREAM_SCENARIOS).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          )}
          <table className="w-full">
            <thead>
              <tr><th className="text-left">ms</th><th>n</th><th>p50</th><th>p95</th><th>p99</th></tr>
            </thead>
            <tbody>
              {stats('apply', report.applied)}
              {stats('commit', report.committed)}
              {stats('paint', report.painted)}
            </tbody>
          </table>
          <div>off-screen events: {report.notVisible}</div>
          <div>tap → mic ready: {since(t.tapAt, t.micReadyAt)}</div>
          <div>tap → provider ready: {since(t.tapAt, t.providerReadyAt)}</div>
          <div>mic ready → speech: {since(t.micReadyAt, t.firstSpeechAt)}</div>
          <div>tap → first position: {since(t.tapAt, t.firstPositionAt)}</div>
          <div>pre-connect frames dropped: {snapshot.preConnectFramesDropped}</div>
          <button type="button" className="px-2 py-0.5 rounded border border-white/30" onClick={() => { meter.reset(); setReport(meter.report()); }}>
            reset metrics
          </button>
        </div>
      )}
    </div>
  );
}
