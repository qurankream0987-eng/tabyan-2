/**
 * @license
 * Tabyan Smart Mushaf — lightweight energy voice-activity detector
 *
 * Used for microphone UX, speech-start timing and silence handling only —
 * never for recognizing Quran. Tuned to avoid clipping recitation:
 *   - an adaptive noise floor follows the room, so quiet reciters still trip it;
 *   - hysteresis (lower release threshold) keeps soft madd tails "speaking";
 *   - a long hangover bridges the natural pauses inside an ayah;
 *   - detection never gates audio: frames always flow to the provider, so a
 *     late speech-start can not cut the first consonant.
 */

export interface EnergyVadConfig {
  /** Absolute floor for the speech threshold (RMS, 0..1). */
  readonly minThreshold: number;
  /** Speech starts above noiseFloor × this ratio. */
  readonly onsetRatio: number;
  /** Speech continues while above onset threshold × this ratio. */
  readonly releaseRatio: number;
  /** Sustained energy needed to declare speech. */
  readonly onsetMs: number;
  /** Silence needed to declare speech ended. */
  readonly hangoverMs: number;
  /** Noise-floor adaptation rate while silent (0..1 per frame). */
  readonly floorAdaptation: number;
}

export const DEFAULT_VAD_CONFIG: EnergyVadConfig = Object.freeze({
  minThreshold: 0.006,
  onsetRatio: 3,
  releaseRatio: 0.55,
  onsetMs: 60,
  hangoverMs: 900,
  floorAdaptation: 0.04,
});

export type VadTransition = 'speech-start' | 'speech-end' | null;

export class EnergyVad {
  private speaking = false;
  private noiseFloor: number;
  private aboveMs = 0;
  private belowMs = 0;

  constructor(private readonly config: EnergyVadConfig = DEFAULT_VAD_CONFIG) {
    this.noiseFloor = config.minThreshold / config.onsetRatio;
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  threshold(): number {
    return Math.max(this.config.minThreshold, this.noiseFloor * this.config.onsetRatio);
  }

  reset(): void {
    this.speaking = false;
    this.aboveMs = 0;
    this.belowMs = 0;
    this.noiseFloor = this.config.minThreshold / this.config.onsetRatio;
  }

  /** Feeds one frame's RMS; returns the transition it caused, if any. */
  push(rms: number, frameMs: number): VadTransition {
    const onset = this.threshold();
    if (!this.speaking) {
      if (rms >= onset) {
        this.aboveMs += frameMs;
        if (this.aboveMs >= this.config.onsetMs) {
          this.speaking = true;
          this.belowMs = 0;
          return 'speech-start';
        }
      } else {
        this.aboveMs = 0;
        // Track the room only while silent, so speech never raises its own bar.
        this.noiseFloor += (rms - this.noiseFloor) * this.config.floorAdaptation;
      }
      return null;
    }
    if (rms >= onset * this.config.releaseRatio) {
      this.belowMs = 0;
      return null;
    }
    this.belowMs += frameMs;
    if (this.belowMs >= this.config.hangoverMs) {
      this.speaking = false;
      this.aboveMs = 0;
      return 'speech-end';
    }
    return null;
  }
}
