import { AudioContext } from "react-native-audio-api";
import type { NativeRecitationCue } from "./native-recitation-feedback";
import { storage } from "../storage";

/** Existing audio dependency; synthesized short tones, no downloaded assets. */
export class NativeRecitationCuePlayer {
  private context: AudioContext | null = null;

  constructor() {
    // Warm the cached preference so later tones can check it without waiting.
    void storage.getRecitationCuesEnabled();
  }

  async play(cue: NativeRecitationCue) {
    // The account settings toggle («أصوات التنبيه أثناء التسميع») silences every cue.
    if (!(await storage.getRecitationCuesEnabled())) return;
    try {
      const context = this.context ??= new AudioContext();
      if (context.state === "suspended") await context.resume();
      if (this.context !== context) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.frequency.value = { start: 660, mistake: 330, correction: 880, end: 550 }[cue];
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.035, now + 0.01);
      gain.gain.linearRampToValueAtTime(0, now + 0.12);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.onEnded = () => {
        try { oscillator.disconnect(); gain.disconnect(); } catch { /* Already released. */ }
      };
      oscillator.start(now);
      oscillator.stop(now + 0.13);
      await new Promise<void>((resolve) => setTimeout(resolve, 150));
    } catch { /* Audio failure must not affect recitation. */ }
  }

  dispose() {
    const context = this.context;
    this.context = null;
    try { if (context) void context.close().catch(() => {}); } catch { /* Optional audio. */ }
  }
}
