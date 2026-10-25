/**
 * @license
 * Tabyan Smart Mushaf — live recitation session state machine
 *
 * Pure and provider-agnostic. It models the microphone / speech / provider
 * lifecycle only; Quran position lives in PositionTracker and word
 * presentation in WordPresentationStore.
 */

export type LiveSessionPhase =
  | 'IDLE'
  | 'REQUESTING_MIC'
  | 'LISTENING'
  | 'VOICE_ACTIVE'
  | 'TRACKING'
  | 'PAUSED'
  | 'RECOVERING'
  | 'ERROR';

export type LiveSessionErrorReason =
  | 'mic-denied'
  | 'mic-unavailable'
  | 'provider-unavailable'
  | 'provider-auth'
  | 'unknown';

export interface LiveSessionState {
  readonly phase: LiveSessionPhase;
  readonly sessionId: string | null;
  readonly micReady: boolean;
  readonly providerReady: boolean;
  readonly speaking: boolean;
  /** Phase to return to after PAUSED / RECOVERING. */
  readonly resumePhase: 'LISTENING' | 'VOICE_ACTIVE' | 'TRACKING';
  readonly error: LiveSessionErrorReason | null;
  readonly timings: {
    readonly tapAt: number | null;
    readonly micReadyAt: number | null;
    readonly providerReadyAt: number | null;
    readonly firstSpeechAt: number | null;
    readonly firstPositionAt: number | null;
  };
}

export type LiveSessionInput =
  | { readonly type: 'START'; readonly sessionId: string; readonly at: number }
  | { readonly type: 'MIC_READY'; readonly at: number }
  | { readonly type: 'PROVIDER_READY'; readonly at: number }
  | { readonly type: 'SPEECH_STARTED'; readonly at: number }
  | { readonly type: 'SPEECH_ENDED'; readonly at: number }
  | { readonly type: 'POSITION'; readonly at: number }
  | { readonly type: 'PAUSE' }
  | { readonly type: 'RESUME' }
  | { readonly type: 'CONNECTION_LOST' }
  | { readonly type: 'CONNECTION_RESTORED' }
  | { readonly type: 'FAIL'; readonly reason: LiveSessionErrorReason }
  | { readonly type: 'STOP' };

export const INITIAL_LIVE_SESSION: LiveSessionState = Object.freeze({
  phase: 'IDLE',
  sessionId: null,
  micReady: false,
  providerReady: false,
  speaking: false,
  resumePhase: 'LISTENING',
  error: null,
  timings: Object.freeze({
    tapAt: null,
    micReadyAt: null,
    providerReadyAt: null,
    firstSpeechAt: null,
    firstPositionAt: null,
  }),
});

const ACTIVE: ReadonlySet<LiveSessionPhase> = new Set(['LISTENING', 'VOICE_ACTIVE', 'TRACKING']);

export function isSessionActive(phase: LiveSessionPhase): boolean {
  return phase !== 'IDLE' && phase !== 'ERROR';
}

/** Listening, voice-active and tracking all mean the reciter can speak now. */
function listeningPhase(state: LiveSessionState): LiveSessionPhase {
  if (!state.micReady) return 'REQUESTING_MIC';
  return state.speaking ? 'VOICE_ACTIVE' : 'LISTENING';
}

export function liveSessionReducer(state: LiveSessionState, input: LiveSessionInput): LiveSessionState {
  if (input.type === 'START') {
    return {
      ...INITIAL_LIVE_SESSION,
      phase: 'REQUESTING_MIC',
      sessionId: input.sessionId,
      timings: { ...INITIAL_LIVE_SESSION.timings, tapAt: input.at },
    };
  }
  if (input.type === 'STOP') return INITIAL_LIVE_SESSION;
  if (state.phase === 'IDLE' || state.phase === 'ERROR') return state;

  switch (input.type) {
    case 'MIC_READY': {
      if (state.micReady) return state;
      const next = { ...state, micReady: true, timings: { ...state.timings, micReadyAt: input.at } };
      if (state.phase === 'REQUESTING_MIC') return { ...next, phase: listeningPhase(next) };
      return next;
    }
    case 'PROVIDER_READY':
      if (state.providerReady) return state;
      return { ...state, providerReady: true, timings: { ...state.timings, providerReadyAt: input.at } };
    case 'SPEECH_STARTED': {
      const timings = state.timings.firstSpeechAt === null
        ? { ...state.timings, firstSpeechAt: input.at }
        : state.timings;
      const next = { ...state, speaking: true, timings };
      return state.phase === 'LISTENING' ? { ...next, phase: 'VOICE_ACTIVE' } : next;
    }
    case 'SPEECH_ENDED': {
      const next = { ...state, speaking: false };
      return state.phase === 'VOICE_ACTIVE' ? { ...next, phase: 'LISTENING' } : next;
    }
    case 'POSITION': {
      // Hot path: once tracking, positions must not allocate new session state.
      if (state.phase === 'TRACKING' && state.providerReady && state.timings.firstPositionAt !== null) return state;
      const timings = state.timings.firstPositionAt === null
        ? { ...state.timings, firstPositionAt: input.at }
        : state.timings;
      if (state.phase === 'PAUSED') return { ...state, timings };
      // A position proves the provider round trip works again.
      return { ...state, phase: 'TRACKING', providerReady: true, timings };
    }
    case 'PAUSE':
      if (state.phase === 'PAUSED') return state;
      return {
        ...state,
        phase: 'PAUSED',
        resumePhase: ACTIVE.has(state.phase) ? (state.phase as LiveSessionState['resumePhase']) : state.resumePhase,
      };
    case 'RESUME':
      if (state.phase !== 'PAUSED') return state;
      return { ...state, phase: listeningPhase(state) };
    case 'CONNECTION_LOST':
      if (state.phase === 'PAUSED' || state.phase === 'RECOVERING') return { ...state, providerReady: false };
      return {
        ...state,
        phase: 'RECOVERING',
        providerReady: false,
        resumePhase: ACTIVE.has(state.phase) ? (state.phase as LiveSessionState['resumePhase']) : state.resumePhase,
      };
    case 'CONNECTION_RESTORED':
      if (state.phase !== 'RECOVERING') return { ...state, providerReady: true };
      return { ...state, providerReady: true, phase: listeningPhase(state) };
    case 'FAIL':
      return { ...state, phase: 'ERROR', error: input.reason, speaking: false };
    default:
      return state;
  }
}
