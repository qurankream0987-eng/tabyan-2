/**
 * Band-limits microphone audio to the speech band before it is resampled for
 * recognition.
 *
 * The audio is resampled twice on its way to the recognizer (device rate to
 * 24 kHz here, then 24 kHz to 16 kHz on the server) by linear interpolation,
 * which has no anti-aliasing. Unfiltered, the hiss of س ش ص above 8 kHz folds
 * back over the speech band. A 4th-order Butterworth low-pass at 7 kHz removes
 * it, and a high-pass at 80 Hz removes rumble and DC offset, which would
 * otherwise also raise the level AutoGain measures.
 */
const HIGH_PASS_HZ = 80;
const LOW_PASS_HZ = 7_000;
/** Section Qs of a 4th-order Butterworth filter. */
const BUTTERWORTH_Q = [0.5412, 1.3066];

class Biquad {
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  private constructor(
    private readonly b0: number,
    private readonly b1: number,
    private readonly b2: number,
    private readonly a1: number,
    private readonly a2: number,
  ) {}

  /** RBJ audio EQ cookbook coefficients. */
  static create(kind: "lowpass" | "highpass", frequency: number, q: number, sampleRate: number) {
    const w0 = (2 * Math.PI * frequency) / sampleRate;
    const cos = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * q);
    const a0 = 1 + alpha;
    const b1 = kind === "lowpass" ? 1 - cos : -(1 + cos);
    const b0 = kind === "lowpass" ? b1 / 2 : -b1 / 2;
    return new Biquad(b0 / a0, b1 / a0, b0 / a0, (-2 * cos) / a0, (1 - alpha) / a0);
  }

  process(samples: Float32Array) {
    for (let index = 0; index < samples.length; index += 1) {
      const x = samples[index];
      const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
      this.x2 = this.x1;
      this.x1 = x;
      this.y2 = this.y1;
      this.y1 = y;
      samples[index] = y;
    }
  }
}

export class SpeechFilter {
  private sampleRate = 0;
  private sections: Biquad[] = [];

  /** Filters `samples` (mono, at `sampleRate`) in place and returns them; state carries across chunks. */
  apply(samples: Float32Array, sampleRate: number): Float32Array {
    if (sampleRate !== this.sampleRate) {
      this.sampleRate = sampleRate;
      const lowPass = Math.min(LOW_PASS_HZ, sampleRate * 0.45);
      this.sections = [
        Biquad.create("highpass", HIGH_PASS_HZ, Math.SQRT1_2, sampleRate),
        ...BUTTERWORTH_Q.map((q) => Biquad.create("lowpass", lowPass, q, sampleRate)),
      ];
    }
    for (const section of this.sections) section.process(samples);
    return samples;
  }
}
