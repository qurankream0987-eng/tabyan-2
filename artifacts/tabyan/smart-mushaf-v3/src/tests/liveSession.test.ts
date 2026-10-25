/**
 * Gates C / F / G / H — fake live following, audio readiness, provider
 * abstraction and production safety, exercised through the real controller,
 * tracker, store, fake stream, microphone pipeline and Nabr adapter.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { getCanonicalWordIndex } from '../quran/canonical/CanonicalWordIndex';
import { pageOfWord, firstWordOfPage } from '../quran/layout/pageWordIndex';
import type { WordKey } from '../quran/domain/types';
import { LiveRecitationController } from '../live/LiveRecitationController';
import { WordPresentationStore, decodeVisual } from '../live/store/WordPresentationStore';
import { FakeStreamProvider, FAKE_STREAM_SCENARIOS, buildFakeTimeline, type FakeStreamScenario } from '../live/providers/FakeStreamProvider';
import { translateNabrObservation, NabrLiveAdapter } from '../live/providers/NabrLiveAdapter';
import { createLiveProvider, preloadLiveProvider, ProviderNotAllowedError } from '../live/providers/createLiveProvider';
import { MicrophonePipeline, MicPipelineError, type MicChunk, type MicSource } from '../live/audio/MicrophonePipeline';
import { EnergyVad } from '../live/audio/EnergyVad';
import { BoundedFrameQueue } from '../live/audio/BoundedFrameQueue';
import { sessionStatusCopy } from '../live/session/messages';
import type { LiveAudioFrame, LiveRecitationProvider, LiveSessionConfig } from '../live/contracts/provider';
import type { LiveRecitationEvent } from '../live/contracts/events';
import { NabrGatewayError, NabrQrcProvider } from '../providers/nabr/NabrQrcProvider';
import { createManualClock } from './helpers/manualClock';

const index = getCanonicalWordIndex();
const key = (surah: number, ayah: number, wordIndex: number): WordKey => ({ surah, ayah, wordIndex });
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function harness(scenario: FakeStreamScenario, extra: Partial<ConstructorParameters<typeof LiveRecitationController>[0]> = {}) {
  const clock = createManualClock();
  const store = new WordPresentationStore(index.totalWords);
  const providers: FakeStreamProvider[] = [];
  const controller = new LiveRecitationController({
    index,
    store,
    createProvider: () => {
      const provider = new FakeStreamProvider(index, scenario, clock);
      providers.push(provider);
      return provider;
    },
    now: clock.now,
    schedule: clock.setTimeout,
    cancel: clock.clearTimeout,
    coalesce: (callback) => callback(),
    ...extra,
  });
  return { clock, store, controller, providers };
}

describe('fake live following through the real controller', () => {
  it('switches to the preparing state synchronously on the tap', () => {
    const pendingPermission: MicSource = {
      frameMs: 20,
      start: () => new Promise<void>(() => {}), // permission prompt still open
      suspend: async () => {},
      resume: async () => {},
      stop: () => {},
    };
    const { controller, store } = harness(FAKE_STREAM_SCENARIOS.continuous120, {
      createMicrophone: (events) => new MicrophonePipeline(pendingPermission, events),
    });
    void controller.start({ anchor: key(1, 1, 1), scope: { from: key(1, 1, 1), to: key(1, 7, 9) }, startMode: 'anchor', useMicrophone: true });
    // No await: the very next read already shows the preparing state and the start word.
    expect(controller.getSnapshot().session.phase).toBe('REQUESTING_MIC');
    expect(sessionStatusCopy('REQUESTING_MIC', null).title).toBe('جارٍ تجهيز الميكروفون');
    expect(store.getCursor()).toBe(index.ordinalOf(key(1, 1, 1)));
  });

  it('follows word by word: الحمد → لله → رب → العالمين, then across the ayah boundary', async () => {
    const { controller, store, clock } = harness(FAKE_STREAM_SCENARIOS.continuous120);
    await controller.start({ anchor: key(1, 2, 1), scope: { from: key(1, 2, 1), to: key(1, 7, 9) }, startMode: 'anchor', useMicrophone: false });
    expect(controller.getSnapshot().session.phase).toBe('LISTENING');
    // Before any speech, the cursor already marks where to begin.
    const describe = () => {
      const k = index.keyAt(store.getCursor())!;
      return `${k.surah}:${k.ayah}:${k.wordIndex}`;
    };
    const cursorKeys: string[] = [describe()];
    store.subscribeCursor(() => cursorKeys.push(describe()));
    clock.advance(120 * 6 + 10);
    expect(cursorKeys.slice(0, 6)).toEqual(['1:2:1', '1:2:2', '1:2:3', '1:2:4', '1:3:1', '1:3:2']);
    expect(controller.getSnapshot().session.phase).toBe('TRACKING');
    expect(decodeVisual(store.visual(index.ordinalOf(key(1, 2, 1)))).state).toBe('confirmed');
  });

  it('shows the candidate before each confirmation', async () => {
    const { controller, store, clock } = harness(FAKE_STREAM_SCENARIOS.continuous120);
    await controller.start({ anchor: key(1, 2, 1), scope: { from: key(1, 2, 1), to: key(1, 7, 9) }, startMode: 'anchor', useMicrophone: false });
    clock.advance(120 + 5); // 1:2:1 confirmed
    clock.advance(120 - 50 - 5 + 1); // candidate for 1:2:2 is out
    expect(store.getCandidate()).toBe(index.ordinalOf(key(1, 2, 2)));
    clock.advance(60);
    expect(store.getCursor()).toBe(index.ordinalOf(key(1, 2, 2)));
    expect(store.getCandidate()).toBe(-1);
  });

  it('crosses a page boundary', async () => {
    const lastWordOfPage1 = index.previous(firstWordOfPage(2)!)!;
    const { controller, store, clock } = harness({ ...FAKE_STREAM_SCENARIOS.continuous120, words: 4 });
    const anchor = index.keyAt(index.ordinalOf(lastWordOfPage1) - 1)!;
    await controller.start({ anchor, scope: { from: anchor, to: key(2, 5, 1) }, startMode: 'anchor', useMicrophone: false });
    clock.advance(120 * 4 + 10);
    const cursor = index.keyAt(store.getCursor())!;
    expect(pageOfWord(anchor)).toBe(1);
    expect(pageOfWord(cursor)).toBe(2);
  });

  it('pauses without losing position and resumes from the same word', async () => {
    const { controller, store, clock } = harness(FAKE_STREAM_SCENARIOS.continuous120);
    await controller.start({ anchor: key(2, 2, 1), scope: { from: key(2, 2, 1), to: key(2, 20, 1) }, startMode: 'anchor', useMicrophone: false });
    clock.advance(120 * 3 + 10);
    const before = store.getCursor();
    controller.pause();
    expect(controller.getSnapshot().session.phase).toBe('PAUSED');
    clock.advance(5000);
    expect(store.getCursor()).toBe(before);
    controller.resume();
    clock.advance(120 + 10);
    expect(store.getCursor()).toBe(before + 1);
  });

  it('recovers from a disconnect deterministically, without flagging words lost in the gap', async () => {
    const scenario: FakeStreamScenario = { name: 'drop', wordIntervalMs: 120, candidateLeadMs: 0, words: 20, disconnects: [{ afterWord: 5, ms: 480 }] };
    const { controller, store, clock } = harness(scenario);
    await controller.start({ anchor: key(2, 2, 1), scope: { from: key(2, 2, 1), to: key(2, 20, 1) }, startMode: 'anchor', useMicrophone: false });
    clock.advance(120 * 5 + 10);
    const atDrop = store.getCursor();
    clock.advance(130);
    expect(controller.getSnapshot().session.phase).toBe('RECOVERING');
    expect(sessionStatusCopy('RECOVERING', null).title).toBe('ضعف الاتصال');
    clock.advance(480);
    clock.advance(240);
    expect(controller.getSnapshot().session.phase).toBe('TRACKING');
    expect(store.getCursor()).toBeGreaterThan(atDrop);
    expect(controller.getSnapshot().skipped).toBe(0);
    // Recovery stays local: never far from where the drop happened.
    expect(store.getCursor() - atDrop).toBeLessThan(12);
  });

  it('handles a re-recitation (backtrack) without errors or skips', async () => {
    const scenario: FakeStreamScenario = { name: 'back', wordIntervalMs: 100, candidateLeadMs: 0, words: 12, backtracks: [{ afterWord: 6, back: 3 }] };
    const { controller, store, clock } = harness(scenario);
    await controller.start({ anchor: key(2, 2, 1), scope: { from: key(2, 2, 1), to: key(2, 20, 1) }, startMode: 'anchor', useMicrophone: false });
    const path: number[] = [store.getCursor()];
    store.subscribeCursor(() => path.push(store.getCursor()));
    clock.advance(100 * 16);
    const start = index.ordinalOf(key(2, 2, 1));
    expect(path.slice(0, 9).map((o) => o - start)).toEqual([0, 1, 2, 3, 4, 5, 3, 4, 5]);
    expect(controller.getSnapshot().skipped).toBe(0);
  });

  it('rejects events from a stopped session', async () => {
    const { controller, store, clock, providers } = harness(FAKE_STREAM_SCENARIOS.continuous120);
    await controller.start({ anchor: key(1, 1, 1), scope: { from: key(1, 1, 1), to: key(1, 7, 9) }, startMode: 'anchor', useMicrophone: false });
    clock.advance(130);
    await controller.stop();
    const after = store.getCursor();
    (providers[0] as unknown as { listeners: Set<(e: LiveRecitationEvent) => void> }).listeners.forEach((listener) =>
      listener({ type: 'position.confirmed', sessionId: 'whatever', seq: 99, eventTimestamp: 0, wordKey: '1:1:3', surah: 1, ayah: 1, wordIndex: 3, confidence: 1, audioTimestamp: null, status: 'confirmed' }),
    );
    expect(store.getCursor()).toBe(after);
    expect(controller.getSnapshot().session.phase).toBe('IDLE');
  });

  it('builds the 80 / 120 / 200 ms timelines deterministically', () => {
    for (const scenario of [FAKE_STREAM_SCENARIOS.continuous80, FAKE_STREAM_SCENARIOS.continuous120, FAKE_STREAM_SCENARIOS.continuous200]) {
      const a = buildFakeTimeline(scenario, 0, index.totalWords);
      const b = buildFakeTimeline(scenario, 0, index.totalWords);
      expect(a).toEqual(b);
      const confirms = a.filter((step) => step.kind === 'confirm');
      expect(confirms[1].at - confirms[0].at).toBe(scenario.wordIntervalMs);
    }
  });
});

class SyntheticMic implements MicSource {
  readonly frameMs = 20;
  emit: ((chunk: MicChunk) => void) | null = null;
  constructor(private readonly behaviour: 'ok' | 'denied' = 'ok') {}
  async start(onChunk: (chunk: MicChunk) => void) {
    if (this.behaviour === 'denied') throw new MicPipelineError('denied', 'denied');
    this.emit = onChunk;
  }
  async suspend() {}
  async resume() {}
  stop() {
    this.emit = null;
  }
  frame(rms: number) {
    this.emit?.({ pcm: new Int16Array(320), rms, captureTimestamp: Date.now() });
  }
}

class RecordingProvider implements LiveRecitationProvider {
  readonly kind = 'nabr' as const;
  readonly capabilities = { consumesAudio: true, incrementalWords: true, candidatePositions: false, mistakeFlags: false, locatesWithinScope: false };
  frames: LiveAudioFrame[] = [];
  release: (() => void) | null = null;
  startSession(_config: LiveSessionConfig) {
    return new Promise<void>((resolve) => {
      this.release = resolve;
    });
  }
  pushAudioFrame(frame: LiveAudioFrame) {
    this.frames.push(frame);
  }
  pause() {}
  resume() {}
  async stop() {}
  subscribeToEvents() {
    return () => {};
  }
  getConnectionState() {
    return 'connecting' as const;
  }
}

describe('microphone and audio readiness', () => {
  it('starts mic and provider in parallel, buffers early audio, and flushes it in order', async () => {
    const mic = new SyntheticMic();
    const provider = new RecordingProvider();
    const store = new WordPresentationStore(index.totalWords);
    const controller = new LiveRecitationController({
      index,
      store,
      createProvider: () => provider,
      createMicrophone: (events) => new MicrophonePipeline(mic, events),
      coalesce: (callback) => callback(),
    });
    const started = controller.start({ anchor: key(1, 1, 1), scope: { from: key(1, 1, 1), to: key(1, 7, 9) }, startMode: 'anchor', useMicrophone: true });
    await flush();
    // Mic is live while the provider is still connecting.
    expect(controller.getSnapshot().session.phase).toBe('LISTENING');
    for (let i = 0; i < 10; i += 1) mic.frame(0.2);
    expect(provider.frames).toHaveLength(0);
    provider.release!();
    await started;
    expect(provider.frames.map((frame) => frame.seq)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    mic.frame(0.2);
    expect(provider.frames).toHaveLength(11);
    expect(controller.getSnapshot().session.timings.firstSpeechAt).not.toBeNull();
  });

  it('bounds pre-connect audio to 3 seconds, dropping the oldest frames', async () => {
    const mic = new SyntheticMic();
    const provider = new RecordingProvider();
    const controller = new LiveRecitationController({
      index,
      store: new WordPresentationStore(index.totalWords),
      createProvider: () => provider,
      createMicrophone: (events) => new MicrophonePipeline(mic, events),
      coalesce: (callback) => callback(),
    });
    const started = controller.start({ anchor: key(1, 1, 1), scope: { from: key(1, 1, 1), to: key(1, 7, 9) }, startMode: 'anchor', useMicrophone: true });
    await flush();
    for (let i = 0; i < 400; i += 1) mic.frame(0.01);
    provider.release!();
    await started;
    expect(provider.frames).toHaveLength(150);
    expect(provider.frames[0].seq).toBe(251);
    expect(controller.getSnapshot().preConnectFramesDropped).toBe(250);
  });

  it('maps a denied microphone to a learner-facing Arabic error, never raw text', async () => {
    const controller = new LiveRecitationController({
      index,
      store: new WordPresentationStore(index.totalWords),
      createProvider: () => new RecordingProvider(),
      createMicrophone: (events) => new MicrophonePipeline(new SyntheticMic('denied'), events),
    });
    void controller.start({ anchor: key(1, 1, 1), scope: { from: key(1, 1, 1), to: key(1, 7, 9) }, startMode: 'anchor', useMicrophone: true });
    await flush();
    const { session } = controller.getSnapshot();
    expect(session).toMatchObject({ phase: 'ERROR', error: 'mic-denied' });
    expect(sessionStatusCopy(session.phase, session.error).title).toBe('تعذر الوصول للميكروفون');
  });

  it('VAD keeps quiet recitation and in-ayah pauses as speech, and adapts to room noise', () => {
    const vad = new EnergyVad();
    for (let i = 0; i < 50; i += 1) vad.push(0.002, 20); // quiet room
    const transitions: string[] = [];
    const feed = (rms: number, frames: number) => {
      for (let i = 0; i < frames; i += 1) {
        const t = vad.push(rms, 20);
        if (t) transitions.push(t);
      }
    };
    feed(0.012, 4); // quiet reciter: above the adaptive onset within 80 ms
    expect(transitions).toEqual(['speech-start']);
    feed(0.004, 30); // soft madd tail / 600 ms breath inside an ayah
    expect(vad.isSpeaking()).toBe(true);
    feed(0.0005, 50); // a real stop
    expect(transitions).toEqual(['speech-start', 'speech-end']);
  });

  it('bounded queue never grows past capacity', () => {
    const queue = new BoundedFrameQueue<number>(3);
    for (let i = 1; i <= 10; i += 1) queue.push(i);
    expect(queue.length).toBe(3);
    expect(queue.dropped).toBe(7);
    expect(queue.drain()).toEqual([8, 9, 10]);
  });
});

describe('Nabr adapter boundary', () => {
  const observation = (current: [number, number, number], correct: [number, number, number][] = []) => ({
    currentPosition: { chapter_index: current[0], verse_index: current[1], word_index: current[2] },
    correctWords: correct.map(([c, v, w]) => ({ chapter_index: c, verse_index: v, word_index: w })),
    skippedWords: [],
    letterMistakes: [],
    tajweedMistakes: [],
    observedAt: 1,
  });

  it('keeps QRC positions unconfirmed by default, per the documented live-capture decision', () => {
    const events = translateNabrObservation(observation([1, 1, 2], [[1, 1, 1]]), 'candidate-only', 'tanzil', index);
    expect(events.map((event) => event.type)).toEqual(['position.candidate']);
    expect(events[0]).toMatchObject({ wordKey: '1:1:2', status: 'candidate' });
  });

  it('can confirm explicit correct-word claims when that policy is enabled', () => {
    const events = translateNabrObservation(observation([1, 1, 3], [[1, 1, 1], [1, 1, 2]]), 'confirm-correct-words', 'tanzil', index);
    expect(events.map((event) => event.type)).toEqual(['word.confirmed', 'word.confirmed', 'position.confirmed', 'position.candidate']);
    expect(events[2]).toMatchObject({ wordKey: '1:1:2' });
  });

  it('maps QDC word indices through the explicit alignment (8:6 «بعدما»)', () => {
    const events = translateNabrObservation(observation([8, 6, 4], [[8, 6, 4]]), 'confirm-correct-words', 'qdc', index);
    expect(events.filter((event) => event.type === 'word.confirmed').map((event) => 'wordKey' in event && event.wordKey)).toEqual(['8:6:4', '8:6:5']);
    expect(events.find((event) => event.type === 'position.candidate')).toMatchObject({ wordKey: '8:6:4' });
    const after = translateNabrObservation(observation([8, 6, 5]), 'candidate-only', 'qdc', index);
    expect(after[0]).toMatchObject({ wordKey: '8:6:6' });
  });

  it('drops non-canonical coordinates instead of guessing', () => {
    expect(translateNabrObservation(observation([1, 1, 9]), 'candidate-only', 'tanzil', index)).toEqual([]);
    expect(translateNabrObservation(observation([115, 1, 1]), 'candidate-only', 'tanzil', index)).toEqual([]);
  });

  it('reports classified provider errors only — never the gateway message text', async () => {
    let onError: ((error: Error) => void) | null = null;
    const fakeClient = {
      onObservation: () => () => {},
      onError: (listener: (error: Error) => void) => {
        onError = listener;
        return () => {};
      },
      connect: async () => {},
      startSession: async () => {},
      resetSession: async () => {},
      disconnect: async () => {},
      pushAudio: async () => {},
    } as unknown as NabrQrcProvider;
    const adapter = new NabrLiveAdapter(index, { createGatewayClient: () => fakeClient, maxReconnectAttempts: 0 });
    const events: LiveRecitationEvent[] = [];
    adapter.subscribeToEvents((event) => events.push(event));
    await adapter.startSession({ sessionId: 'live-test-1', anchor: key(1, 1, 1), scope: { from: key(1, 1, 1), to: key(1, 7, 9) }, startMode: 'anchor' });
    onError!(new NabrGatewayError('AUTH', 'raw server detail that must not leak'));
    const error = events.find((event) => event.type === 'provider.error')!;
    expect(error).toMatchObject({ code: 'AUTH', recoverable: false });
    expect(JSON.stringify(events)).not.toContain('raw server detail');
    await adapter.stop();
  });
});

describe('production safety', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows the fake stream only in development builds', async () => {
    await preloadLiveProvider('fake-stream');
    expect(createLiveProvider('fake-stream', index).kind).toBe('fake-stream');
    vi.stubEnv('DEV', false);
    expect(() => createLiveProvider('fake-stream', index)).toThrow(ProviderNotAllowedError);
    await expect(preloadLiveProvider('fake-stream')).rejects.toThrow(ProviderNotAllowedError);
    expect(createLiveProvider('nabr', index).kind).toBe('nabr');
  });
});
