import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRecitationCuesEnabled,
  RECITATION_CUES,
  RECITATION_CUES_STORAGE_KEY,
  RecitationCuePlayer,
  setRecitationCuesEnabled,
} from "./recitation-cues";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  clear() {
    this.values.clear();
  }
}

class FakeOscillator {
  type: OscillatorType = "sine";
  frequency = { setValueAtTime: vi.fn() };
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  addEventListener = vi.fn();
}

class FakeGain {
  gain = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
  disconnect = vi.fn();
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: AudioContextState = "suspended";
  currentTime = 0;
  destination = {} as AudioDestinationNode;
  oscillators: FakeOscillator[] = [];
  resume = vi.fn(async () => { this.state = "running"; });
  close = vi.fn(async () => { this.state = "closed"; });

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createOscillator() {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator as unknown as OscillatorNode;
  }

  createGain() {
    return new FakeGain() as unknown as GainNode;
  }
}

describe("RecitationCuePlayer", () => {
  const storage = new MemoryStorage();

  beforeEach(() => {
    storage.clear();
    FakeAudioContext.instances = [];
    vi.stubGlobal("window", {
      localStorage: storage,
      AudioContext: FakeAudioContext,
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults interaction sounds to enabled and persists an explicit choice", () => {
    expect(getRecitationCuesEnabled()).toBe(true);

    setRecitationCuesEnabled(false);
    expect(storage.getItem(RECITATION_CUES_STORAGE_KEY)).toBe("false");
    expect(getRecitationCuesEnabled()).toBe(false);

    setRecitationCuesEnabled(true);
    expect(getRecitationCuesEnabled()).toBe(true);
  });

  it("plays local lifecycle cues in start/pause/resume/end order only", async () => {
    setRecitationCuesEnabled(true);
    const player = new RecitationCuePlayer();

    await expect(player.playCue("start")).resolves.toBe(true);
    await expect(player.playCue("pause")).resolves.toBe(true);
    await expect(player.playCue("resume")).resolves.toBe(true);
    await expect(player.playCue("end")).resolves.toBe(true);
    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(FakeAudioContext.instances[0].oscillators).toHaveLength(7);
    expect(RECITATION_CUES).toEqual(["start", "pause", "resume", "end"]);

    player.dispose();
    expect(FakeAudioContext.instances[0].close).toHaveBeenCalledOnce();
  });

  it("does not create or play audio when interaction sounds are disabled", async () => {
    setRecitationCuesEnabled(false);
    const player = new RecitationCuePlayer();

    player.prepare();
    await expect(player.playCue("pause")).resolves.toBe(false);
    expect(FakeAudioContext.instances).toHaveLength(0);
  });
});