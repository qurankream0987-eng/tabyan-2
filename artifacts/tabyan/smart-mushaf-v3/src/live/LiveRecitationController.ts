/**
 * @license
 * Tabyan Smart Mushaf — live recitation controller
 *
 * The single owner of a live session. Wires:
 *   microphone pipeline ─┐
 *                        ├─► provider ─► canonical events ─► PositionTracker
 *   session machine ◄────┘                                      │
 *                                                               ▼
 *                                               WordPresentationStore ─► glyphs
 *
 * Responsiveness rules:
 *   - the tap itself switches the UI to "preparing" synchronously;
 *   - microphone and provider start in parallel, never one after the other;
 *   - audio captured before the provider is ready waits in a bounded queue
 *     (oldest dropped), so the learner can start reciting immediately;
 *   - each event takes one synchronous path to the touched glyphs only.
 */

import type { WordKey } from '../quran/domain/types';
import type { CanonicalWordIndex } from '../quran/canonical/CanonicalWordIndex';
import { isPositionEvent, type LiveRecitationEvent } from './contracts/events';
import type {
  LiveAudioFrame,
  LiveRecitationProvider,
  LiveSessionConfig,
} from './contracts/provider';
import {
  INITIAL_LIVE_SESSION,
  isSessionActive,
  liveSessionReducer,
  type LiveSessionErrorReason,
  type LiveSessionInput,
  type LiveSessionState,
} from './session/sessionMachine';
import { DEFAULT_POSITION_GUARDS, PositionTracker, type PositionGuardConfig } from './position/PositionTracker';
import type { WordPresentationStore } from './store/WordPresentationStore';
import type { VisualLatencyMeter } from './metrics/VisualLatencyMeter';
import { BoundedFrameQueue } from './audio/BoundedFrameQueue';
import type { MicFailure, MicPipelineEvents, MicrophonePipeline } from './audio/MicrophonePipeline';

export interface LiveSessionRequest {
  readonly anchor: WordKey;
  readonly scope: { readonly from: WordKey; readonly to: WordKey };
  readonly startMode: 'anchor' | 'locate';
  readonly useMicrophone: boolean;
}

export interface ControllerSnapshot {
  readonly session: LiveSessionState;
  readonly cursor: WordKey | null;
  readonly recited: number;
  readonly skipped: number;
  readonly revealed: number;
  readonly currentAyah: { readonly surah: number; readonly ayah: number } | null;
  readonly preConnectFramesDropped: number;
}

export interface ControllerDependencies {
  readonly index: CanonicalWordIndex;
  readonly store: WordPresentationStore;
  readonly createProvider: () => LiveRecitationProvider;
  readonly createMicrophone?: (events: MicPipelineEvents) => MicrophonePipeline;
  readonly meter?: VisualLatencyMeter;
  readonly guards?: PositionGuardConfig;
  readonly now?: () => number;
  readonly schedule?: (callback: () => void, ms: number) => unknown;
  readonly cancel?: (handle: unknown) => void;
  /** Coalesces progress notifications (one per frame in the browser). */
  readonly coalesce?: (callback: () => void) => void;
  /** Provider not ready this long after the mic is: show the weak-connection state. */
  readonly slowConnectMs?: number;
}

const PRE_CONNECT_AUDIO_MS = 3000;
const FRAME_MS = 20;

let sessionCounter = 0;
function newSessionId(): string {
  sessionCounter += 1;
  return `live-${Date.now().toString(36)}-${sessionCounter}`;
}

function defaultCoalesce(callback: () => void): void {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(callback);
  else setTimeout(callback, 16);
}

export class LiveRecitationController {
  private session: LiveSessionState = INITIAL_LIVE_SESSION;
  private readonly tracker: PositionTracker;
  private provider: LiveRecitationProvider | null = null;
  private microphone: MicrophonePipeline | null = null;
  private unsubscribeProvider: (() => void) | null = null;
  private readonly preConnect = new BoundedFrameQueue<LiveAudioFrame>(PRE_CONNECT_AUDIO_MS / FRAME_MS);
  private providerReady = false;
  private slowConnectTimer: unknown = null;
  private snapshot: ControllerSnapshot;
  private readonly listeners = new Set<() => void>();
  private progressQueued = false;
  private currentAyah: { surah: number; ayah: number } | null = null;
  private readonly now: () => number;
  private readonly schedule: (callback: () => void, ms: number) => unknown;
  private readonly cancel: (handle: unknown) => void;
  private readonly coalesce: (callback: () => void) => void;

  constructor(private readonly deps: ControllerDependencies) {
    this.tracker = new PositionTracker(deps.index, deps.guards ?? DEFAULT_POSITION_GUARDS);
    this.now = deps.now ?? (() => performance.now());
    this.schedule = deps.schedule ?? ((callback, ms) => setTimeout(callback, ms));
    this.cancel = deps.cancel ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
    this.coalesce = deps.coalesce ?? defaultCoalesce;
    this.snapshot = this.buildSnapshot();
  }

  // ── UI subscription (useSyncExternalStore) ─────────────────────────────

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ControllerSnapshot => this.snapshot;

  getSessionId(): string | null {
    return this.session.sessionId;
  }

  // ── Commands ───────────────────────────────────────────────────────────

  /**
   * Starts a session. Returns once the request is under way; the UI has
   * already switched to "preparing" before the first await.
   */
  async start(request: LiveSessionRequest): Promise<void> {
    // Tear down any previous session without awaiting it: the tap must switch
    // the UI to "preparing" synchronously, before the first await.
    const previous = this.detach();
    const sessionId = newSessionId();
    this.dispatch({ type: 'START', sessionId, at: this.now() });
    if (previous) void previous.stop().catch(() => {});

    this.deps.store.reset();
    this.tracker.begin(sessionId, request.anchor, request.scope, request.startMode);
    // Anchored sessions show where the reader is expected to begin. Located
    // sessions place no cursor until the provider finds the reader.
    if (request.startMode === 'anchor') this.applyTracker(this.tracker.relocate(request.anchor), -1);
    this.currentAyah = { surah: request.anchor.surah, ayah: request.anchor.ayah };
    this.publish();

    let provider: LiveRecitationProvider;
    try {
      provider = this.deps.createProvider();
    } catch {
      this.fail('provider-unavailable');
      return;
    }
    this.provider = provider;
    this.providerReady = false;
    this.preConnect.clear();
    this.unsubscribeProvider = provider.subscribeToEvents((event) => this.onProviderEvent(sessionId, event));

    const config: LiveSessionConfig = {
      sessionId,
      anchor: request.anchor,
      scope: request.scope,
      startMode: request.startMode,
    };

    const wantsMic = request.useMicrophone && this.deps.createMicrophone !== undefined;
    const micStart = wantsMic ? this.startMicrophone(sessionId) : Promise.resolve(true);
    if (!wantsMic) this.dispatch({ type: 'MIC_READY', at: this.now() });

    const providerStart = provider.startSession(config).then(
      () => {
        if (this.session.sessionId !== sessionId) return;
        this.markProviderReady();
      },
      () => {
        if (this.session.sessionId !== sessionId) return;
        this.fail('provider-unavailable');
      },
    );

    await Promise.all([micStart, providerStart]);
  }

  pause(): void {
    if (!isSessionActive(this.session.phase) || this.session.phase === 'PAUSED') return;
    this.dispatch({ type: 'PAUSE' });
    this.provider?.pause();
    void this.microphone?.pause();
    this.preConnect.clear();
  }

  resume(): void {
    if (this.session.phase !== 'PAUSED') return;
    this.dispatch({ type: 'RESUME' });
    void this.microphone?.resume();
    this.provider?.resume();
  }

  async stop(): Promise<void> {
    const provider = this.detach();
    if (this.session.phase !== 'IDLE') this.dispatch({ type: 'STOP' });
    if (provider) await provider.stop().catch(() => {});
  }

  /** Synchronously disconnects the current provider and microphone; returns the provider to stop. */
  private detach(): LiveRecitationProvider | null {
    const provider = this.provider;
    const microphone = this.microphone;
    this.provider = null;
    this.microphone = null;
    this.unsubscribeProvider?.();
    this.unsubscribeProvider = null;
    this.clearSlowConnectTimer();
    this.preConnect.clear();
    this.providerReady = false;
    microphone?.stop();
    return provider;
  }

  /** "Start from here": an explicit, always-legitimate jump. */
  relocate(key: WordKey): void {
    if (!this.session.sessionId) return;
    this.applyTracker(this.tracker.relocate(key), -1);
  }

  /** Hint: shows a word without counting it as recited. */
  reveal(keys: readonly WordKey[]): void {
    const ordinals = keys.map((key) => this.deps.index.ordinalOf(key)).filter((ordinal) => ordinal >= 0);
    this.deps.store.reveal(ordinals);
    this.queueProgress();
  }

  nextExpectedWord(): WordKey | null {
    return this.session.sessionId ? this.tracker.nextExpected() : null;
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private async startMicrophone(sessionId: string): Promise<boolean> {
    const microphone = this.deps.createMicrophone!({
      onFrame: (frame) => this.onAudioFrame(sessionId, frame),
      onSpeech: (speaking) => {
        if (this.session.sessionId !== sessionId) return;
        // Session timings use the controller clock only, so intervals are comparable.
        this.dispatch({ type: speaking ? 'SPEECH_STARTED' : 'SPEECH_ENDED', at: this.now() });
      },
      onFailure: (failure: MicFailure) => {
        if (this.session.sessionId !== sessionId || failure === 'interrupted') return;
        this.fail(failure === 'denied' ? 'mic-denied' : 'mic-unavailable');
      },
    });
    this.microphone = microphone;
    try {
      await microphone.start();
    } catch {
      return false;
    }
    if (this.session.sessionId !== sessionId) {
      microphone.stop();
      return false;
    }
    this.dispatch({ type: 'MIC_READY', at: this.now() });
    if (!this.providerReady) this.armSlowConnectTimer(sessionId);
    return true;
  }

  private onAudioFrame(sessionId: string, frame: LiveAudioFrame): void {
    if (this.session.sessionId !== sessionId || this.session.phase === 'PAUSED') return;
    const provider = this.provider;
    if (!provider || !provider.capabilities.consumesAudio) return;
    if (this.providerReady) provider.pushAudioFrame(frame);
    else this.preConnect.push(frame);
  }

  private markProviderReady(): void {
    this.providerReady = true;
    this.clearSlowConnectTimer();
    this.dispatch({ type: 'PROVIDER_READY', at: this.now() });
    if (this.session.phase === 'RECOVERING') this.dispatch({ type: 'CONNECTION_RESTORED' });
    const provider = this.provider;
    if (provider) for (const frame of this.preConnect.drain()) provider.pushAudioFrame(frame);
  }

  private armSlowConnectTimer(sessionId: string): void {
    this.clearSlowConnectTimer();
    this.slowConnectTimer = this.schedule(() => {
      this.slowConnectTimer = null;
      if (this.session.sessionId === sessionId && !this.providerReady) this.dispatch({ type: 'CONNECTION_LOST' });
    }, this.deps.slowConnectMs ?? 2500);
  }

  private clearSlowConnectTimer(): void {
    if (this.slowConnectTimer !== null) {
      this.cancel(this.slowConnectTimer);
      this.slowConnectTimer = null;
    }
  }

  private onProviderEvent(sessionId: string, event: LiveRecitationEvent): void {
    if (this.session.sessionId !== sessionId) return;
    // Reconnected provider sessions are namespaced under ours; anything else is foreign.
    if (event.sessionId !== sessionId && !event.sessionId.startsWith(`${sessionId}~`)) return;

    switch (event.type) {
      case 'connection.changed':
        if (event.phase === 'connected') {
          if (event.sessionId !== this.tracker.getSessionId()) this.tracker.rebind(event.sessionId);
          this.tracker.process(event);
          if (!this.providerReady) this.markProviderReady();
          else if (this.session.phase === 'RECOVERING') this.dispatch({ type: 'CONNECTION_RESTORED' });
        } else if (event.phase === 'reconnecting' || event.phase === 'disconnected') {
          this.providerReady = false;
          this.dispatch({ type: 'CONNECTION_LOST' });
        }
        return;
      case 'provider.error':
        if (event.recoverable) {
          this.providerReady = false;
          this.dispatch({ type: 'CONNECTION_LOST' });
        } else {
          this.fail(event.code === 'AUTH' ? 'provider-auth' : 'provider-unavailable');
        }
        return;
      case 'session.ready':
        this.tracker.process(event);
        if (!this.providerReady) this.markProviderReady();
        return;
      case 'speech.started':
      case 'speech.ended':
        this.tracker.process(event);
        // The microphone VAD is authoritative when present.
        if (!this.microphone) {
          this.dispatch({ type: event.type === 'speech.started' ? 'SPEECH_STARTED' : 'SPEECH_ENDED', at: this.now() });
        }
        return;
      default:
        break;
    }

    if (this.session.phase === 'PAUSED' || !isSessionActive(this.session.phase)) return;

    const target = 'wordKey' in event ? this.deps.index.ordinalOf(event) : -1;
    const meter = this.deps.meter;
    if (meter && isPositionEvent(event)) meter.received(target);
    const update = this.tracker.process(event);
    if (!update.accepted) {
      meter?.discard(target);
      return;
    }
    this.applyTracker(update, isPositionEvent(event) ? target : -1);
    if (isPositionEvent(event) && (update.cursor !== undefined || update.candidate !== undefined)) {
      this.dispatch({ type: 'POSITION', at: this.now() });
    }
  }

  private applyTracker(update: ReturnType<PositionTracker['process']>, measuredOrdinal: number): void {
    const touched = this.deps.store.apply(update);
    const meter = this.deps.meter;
    if (meter && measuredOrdinal >= 0) {
      if (touched.includes(measuredOrdinal)) {
        meter.appliedTo(measuredOrdinal, this.deps.store.getElement(measuredOrdinal) !== null);
      } else {
        meter.discard(measuredOrdinal);
      }
    }
    if (update.ayahChanged) this.currentAyah = update.ayahChanged;
    if (touched.length > 0) this.queueProgress();
  }

  private fail(reason: LiveSessionErrorReason): void {
    this.dispatch({ type: 'FAIL', reason });
    void this.detach()?.stop().catch(() => {});
  }

  private dispatch(input: LiveSessionInput): void {
    const next = liveSessionReducer(this.session, input);
    if (next === this.session) return;
    this.session = next;
    this.publish();
  }

  /** Progress counters change per word; coalesce them to one UI update per frame. */
  private queueProgress(): void {
    if (this.progressQueued) return;
    this.progressQueued = true;
    this.coalesce(() => {
      this.progressQueued = false;
      this.publish();
    });
  }

  private publish(): void {
    const next = this.buildSnapshot();
    const previous = this.snapshot;
    if (
      previous.session === next.session
      && previous.recited === next.recited
      && previous.skipped === next.skipped
      && previous.revealed === next.revealed
      && previous.currentAyah === next.currentAyah
      && sameKey(previous.cursor, next.cursor)
      && previous.preConnectFramesDropped === next.preConnectFramesDropped
    ) {
      return;
    }
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }

  private buildSnapshot(): ControllerSnapshot {
    const counts = this.deps.store.counts();
    const cursor = this.deps.store.getCursor();
    return {
      session: this.session,
      cursor: cursor >= 0 ? this.deps.index.keyAt(cursor) : null,
      recited: counts.recited,
      skipped: counts.skipped,
      revealed: counts.revealed,
      currentAyah: this.currentAyah,
      preConnectFramesDropped: this.preConnect.dropped,
    };
  }
}

function sameKey(a: WordKey | null, b: WordKey | null): boolean {
  if (!a || !b) return a === b;
  return a.surah === b.surah && a.ayah === b.ayah && a.wordIndex === b.wordIndex;
}
