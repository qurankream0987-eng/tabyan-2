/**
 * @license
 * Tabyan Smart Mushaf — Nabr Audio Adapter
 * Aggregates audio frames into compliant 200ms WAV chunks with RIFF headers or 20ms Opus frames.
 */

import { CanonicalAudioFrame } from '../../providers/contracts/types';
import { encodePcmToWav } from '../conversion/wavEncoder';

export interface NabrAudioChunk {
  readonly data: ArrayBuffer;
  readonly format: 'WAV' | 'OPUS';
  readonly sampleCount: number;
  readonly timestamp: number;
}

export type NabrAudioChunkCallback = (chunk: NabrAudioChunk) => void;

export class NabrAudioAdapter {
  // 200 ms @ 16 kHz = 3200 samples
  private readonly targetChunkSamples = 3200;
  // Fixed-size accumulator: no per-sample JS arrays, no slicing garbage.
  private readonly pending = new Int16Array(this.targetChunkSamples);
  private pendingLength = 0;
  private chunkCallback: NabrAudioChunkCallback | null = null;
  private mode: 'WAV' | 'OPUS' = 'WAV';

  constructor(mode: 'WAV' | 'OPUS' = 'WAV') {
    this.mode = mode;
  }

  setMode(mode: 'WAV' | 'OPUS'): void {
    this.mode = mode;
  }

  onChunk(cb: NabrAudioChunkCallback): void {
    this.chunkCallback = cb;
  }

  /**
   * Accepts a CanonicalAudioFrame and produces compliant provider chunks.
   */
  processFrame(frame: CanonicalAudioFrame): void {
    const samples = frame.pcmData;
    let offset = 0;
    while (offset < samples.length) {
      const take = Math.min(this.targetChunkSamples - this.pendingLength, samples.length - offset);
      this.pending.set(samples.subarray(offset, offset + take), this.pendingLength);
      this.pendingLength += take;
      offset += take;
      if (this.pendingLength === this.targetChunkSamples) this.emit(this.pending);
    }
  }

  private emit(samples: Int16Array): void {
    const wavBuffer = encodePcmToWav(samples, 16000, 1);
    this.pendingLength = 0;
    this.chunkCallback?.({
      data: wavBuffer,
      format: 'WAV',
      sampleCount: samples.length,
      timestamp: Date.now(),
    });
  }

  /**
   * Flushes any remaining samples upon session stop.
   */
  flush(): void {
    if (this.pendingLength > 0) this.emit(this.pending.slice(0, this.pendingLength));
  }

  /** Drops buffered samples without sending (pause / reconnect). */
  discard(): void {
    this.pendingLength = 0;
  }
}
