import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accountStorageKey } from "@/lib/account-storage";
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
  const accountId = "user-a";

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
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("defaults interaction sounds to enabled and persists an explicit choice", () => {
    expect(getRecitationCuesEnabled(accountId)).toBe(true);

    setRecitationCuesEnabled(false, accountId);
    expect(storage.getItem(accountStorageKey(accountId, RECITATION_CUES_STORAGE_KEY))).toBe("false");
    expect(getRecitationCuesEnabled(accountId)).toBe(false);

    expect(getRecitationCuesEnabled("user-b")).toBe(true);
    setRecitationCuesEnabled(true, accountId);
    expect(getRecitationCuesEnabled(accountId)).toBe(true);
  });

  it("plays local lifecycle cues in start/pause/resume/end order only", async () => {
    setRecitationCuesEnabled(true, accountId);
    const player = new RecitationCuePlayer(accountId);

    player.prepare();
    await expect(player.playCue("start")).resolves.toBe(true);
    await expect(player.playCue("pause")).resolves.toBe(true);
    await expect(player.playCue("resume")).resolves.toBe(true);
    await expect(player.playCue("end")).resolves.toBe(true);
    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(FakeAudioContext.instances[0].oscillators).toHaveLength(7);
    expect(RECITATION_CUES).toEqual(["start", "pause", "resume", "end", "mistake", "correction", "ayah"]);

    player.dispose();
    expect(FakeAudioContext.instances[0].close).toHaveBeenCalledOnce();
  });

  it("does not create or play audio when interaction sounds are disabled", async () => {
    setRecitationCuesEnabled(false, accountId);
    const player = new RecitationCuePlayer(accountId);

    player.prepare();
    await expect(player.playCue("pause")).resolves.toBe(false);
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it("does not create an AudioContext from an asynchronous provider event", async () => {
    const player = new RecitationCuePlayer(accountId);
    await expect(player.playCue("start")).resolves.toBe(false);
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it("plays distinct local feedback tones only after user gesture initialization", async () => {
    const player = new RecitationCuePlayer(accountId);
    player.prepare();
    await expect(player.playCue("mistake")).resolves.toBe(true);
    await expect(player.playCue("correction")).resolves.toBe(true);
    await expect(player.playCue("ayah")).resolves.toBe(true);
    expect(FakeAudioContext.instances[0].oscillators).toHaveLength(4);
  });

  it("turning sounds off during recitation suppresses all feedback without errors", async () => {
    const player = new RecitationCuePlayer(accountId);
    player.prepare();
    setRecitationCuesEnabled(false, accountId);
    for (const cue of RECITATION_CUES) await expect(player.playCue(cue)).resolves.toBe(false);
    expect(FakeAudioContext.instances[0].oscillators).toHaveLength(0);
  });

  it("an autoplay resume that never resolves cannot stall the session", async () => {
    vi.useFakeTimers();
    const player = new RecitationCuePlayer(accountId);
    player.prepare();
    const context = FakeAudioContext.instances[0];
    context.state = "suspended";
    context.resume = vi.fn(() => new Promise<void>(() => {}));
    const sound = player.playCue("end");
    await vi.advanceTimersByTimeAsync(200);
    await expect(sound).resolves.toBe(false);
    expect(context.oscillators).toHaveLength(0);
    player.dispose();
  });
});