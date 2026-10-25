import { createServer } from 'node:http';
import { describe, expect, it } from 'vitest';
import { attachNabrQrcGateway } from '../../apps/api/src/nabrQrcGateway';
import { NabrQrcProvider } from '../../apps/web/smart-mushaf-v3/src/providers/nabr/NabrQrcProvider';
import { NabrLiveAdapter, type NabrTranslationPolicy } from '../../apps/web/smart-mushaf-v3/src/live/providers/NabrLiveAdapter';
import { LiveRecitationController } from '../../apps/web/smart-mushaf-v3/src/live/LiveRecitationController';
import { WordPresentationStore, decodeVisual } from '../../apps/web/smart-mushaf-v3/src/live/store/WordPresentationStore';
import { MicrophonePipeline, type MicChunk, type MicSource } from '../../apps/web/smart-mushaf-v3/src/live/audio/MicrophonePipeline';
import { getCanonicalWordIndex } from '../../apps/web/smart-mushaf-v3/src/quran/canonical/CanonicalWordIndex';
import type { LiveRecitationEvent } from '../../apps/web/smart-mushaf-v3/src/live/contracts/events';

/** 20 ms frames on demand; never touches a real device. */
class SyntheticMic implements MicSource {
  readonly frameMs = 20;
  private emit: ((chunk: MicChunk) => void) | null = null;
  async start(onChunk: (chunk: MicChunk) => void) {
    this.emit = onChunk;
  }
  async suspend() {}
  async resume() {}
  stop() {
    this.emit = null;
  }
  speak(frames: number) {
    for (let i = 0; i < frames; i += 1) {
      this.emit?.({ pcm: new Int16Array(320), rms: 0.05, captureTimestamp: Date.now() });
    }
  }
}

async function withFakeGateway(run: (endpoint: string) => Promise<void>): Promise<void> {
  const server = createServer();
  attachNabrQrcGateway(server, {
    mode: 'fake',
    authenticate: async (token) => token === 'fake-test-token'
      ? { id: 'fake-pipeline-student', role: 'student' }
      : null,
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Fake QRC gateway did not bind a local port');
  try {
    await run(`ws://127.0.0.1:${address.port}/api/ws/nabr-qrc-gateway`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function runSession(endpoint: string, policy: NabrTranslationPolicy) {
  expect(typeof globalThis.WebSocket).toBe('function');
  const index = getCanonicalWordIndex();
  const store = new WordPresentationStore(index.totalWords);
  const mic = new SyntheticMic();
  const events: LiveRecitationEvent[] = [];
  const adapter = new NabrLiveAdapter(index, {
    policy,
    createGatewayClient: () => new NabrQrcProvider({ endpoint, tokenProvider: () => 'fake-test-token' }),
  });
  adapter.subscribeToEvents((event) => events.push(event));
  const controller = new LiveRecitationController({
    index,
    store,
    createProvider: () => adapter,
    createMicrophone: (pipelineEvents) => new MicrophonePipeline(mic, pipelineEvents),
    coalesce: (callback) => callback(),
  });
  try {
    await controller.start({
      anchor: { surah: 1, ayah: 1, wordIndex: 1 },
      scope: { from: { surah: 1, ayah: 1, wordIndex: 1 }, to: { surah: 1, ayah: 7, wordIndex: 9 } },
      startMode: 'anchor',
      useMicrophone: true,
    });
    expect(controller.getSnapshot().session).toMatchObject({ phase: 'LISTENING', providerReady: true });
    const observed = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('No canonical event came back through the gateway')), 5_000);
      adapter.subscribeToEvents((event) => {
        if (event.type === 'position.candidate') {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    mic.speak(10); // 200 ms → one WAV chunk to the gateway
    await observed;
    return { index, store, events, controller };
  } finally {
    await controller.stop();
  }
}

describe('Nabr server-gateway live pipeline (fake QRC upstream, no live calls)', () => {
  it('keeps QRC positions as candidates by default and flags skipped / mistaken words', async () => {
    await withFakeGateway(async (endpoint) => {
      const { index, store, events } = await runSession(endpoint, 'candidate-only');
      const types = events.map((event) => event.type);
      expect(types.slice(0, 2)).toEqual(['session.ready', 'connection.changed']);
      expect(events.find((event) => event.type === 'position.candidate')).toMatchObject({ wordKey: '1:1:1', status: 'candidate' });
      expect(types).not.toContain('position.confirmed');
      expect(types).not.toContain('word.confirmed');
      const flags = events.filter((event) => event.type === 'word.flagged');
      expect(flags).toEqual(expect.arrayContaining([
        expect.objectContaining({ wordKey: '1:1:2', flag: 'SKIPPED' }),
        expect.objectContaining({ wordKey: '1:1:1', flag: 'MISTAKE' }),
      ]));
      // No vendor text crosses the boundary.
      expect(JSON.stringify(events)).not.toContain('synthetic');
      expect(decodeVisual(store.visual(index.ordinalOf({ surah: 1, ayah: 1, wordIndex: 1 }))).mistake).toBe(true);
    });
  });

  it('confirms explicit correct-word claims when that policy is enabled', async () => {
    await withFakeGateway(async (endpoint) => {
      const { index, store, events } = await runSession(endpoint, 'confirm-correct-words');
      expect(events.find((event) => event.type === 'position.confirmed')).toMatchObject({ wordKey: '1:1:1' });
      const first = index.ordinalOf({ surah: 1, ayah: 1, wordIndex: 1 });
      expect(decodeVisual(store.visual(first)).base).toBe('confirmed');
    });
  });
});
