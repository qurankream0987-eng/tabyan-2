/**
 * Automatic gain for microphone audio before it is streamed for recognition.
 *
 * Android records live recitation from the speech-recognition input, which has
 * no automatic gain, so a reciter at normal distance arrives too quiet for the
 * recognizer. This raises quiet speech towards TARGET_PEAK with a bounded,
 * slowly changing gain: loud speech is never boosted and is clipped only at full scale.
 */
const TARGET_PEAK = 0.5;
const MAX_GAIN = 6;
/** Peaks below this are background noise; they never raise the gain. */
const SPEECH_PEAK = 0.02;
/** Per-chunk decay of the tracked speech level (~2 s for 100 ms chunks). */
const LEVEL_RELEASE = 0.95;
/** Fraction of the distance to the target gain covered per chunk. */
const GAIN_SMOOTHING = 0.3;

export class AutoGain {
  // Start as if speech were quiet: phones record recitation quietly, and a loud
  // first word is still capped below full scale.
  private level = 0.1;
  private gain = 1;

  /** Scales `samples` in place and returns them. */
  apply(samples: Float32Array): Float32Array {
    let peak = 0;
    for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
    if (peak >= SPEECH_PEAK) {
      this.level = peak > this.level ? peak : this.level * LEVEL_RELEASE + peak * (1 - LEVEL_RELEASE);
    }
    const target = Math.min(MAX_GAIN, Math.max(1, TARGET_PEAK / this.level));
    this.gain += (target - this.gain) * GAIN_SMOOTHING;
    // A sudden loud peak must not clip because the gain was raised for quiet speech.
    const gain = Math.max(1, peak > 0 ? Math.min(this.gain, 1 / peak) : this.gain);
    if (gain === 1) return samples;
    for (let index = 0; index < samples.length; index += 1) samples[index] *= gain;
    return samples;
  }
}
