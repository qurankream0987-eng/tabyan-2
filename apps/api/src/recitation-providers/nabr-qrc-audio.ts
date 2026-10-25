export const NABR_QRC_SAMPLE_RATE_HZ = 16_000;
export const NABR_QRC_CHANNELS = 1;
export const NABR_QRC_BITS_PER_SAMPLE = 16;
export const NABR_QRC_WAV_FRAME_SAMPLES = 3_200;
export const NABR_QRC_WAV_FRAME_MS = 200;
export const TABYAN_PCM_INPUT_RATE_HZ = 24_000;

export interface NabrQrcWavValidation {
  readonly isValid: boolean;
  readonly error?: string;
  readonly sampleRate?: number;
  readonly channels?: number;
  readonly bitsPerSample?: number;
  readonly dataBytes?: number;
  readonly durationMs?: number;
}

/**
 * Validate a complete standalone PCM16 WAV before it crosses the server/QRC
 * boundary. The usual chunk is 200 ms; a shorter final flush is also valid.
 */
export function validateNabrQrcWavChunk(input: Uint8Array): NabrQrcWavValidation {
  if (input.byteLength < 46) {
    return { isValid: false, error: "WAV chunk is smaller than its header and one sample" };
  }
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const ascii = (offset: number, length: number) => {
    let value = "";
    for (let index = 0; index < length; index += 1) value += String.fromCharCode(view.getUint8(offset + index));
    return value;
  };
  if (ascii(0, 4) !== "RIFF" || ascii(8, 4) !== "WAVE") {
    return { isValid: false, error: "WAV chunk must use RIFF/WAVE framing" };
  }
  if (view.getUint32(4, true) !== input.byteLength - 8) {
    return { isValid: false, error: "WAV RIFF size does not match the chunk length" };
  }
  if (ascii(12, 4) !== "fmt " || view.getUint32(16, true) !== 16) {
    return { isValid: false, error: "WAV format header is unsupported" };
  }

  const format = view.getUint16(20, true);
  const channels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const byteRate = view.getUint32(28, true);
  const blockAlign = view.getUint16(32, true);
  const bitsPerSample = view.getUint16(34, true);
  const dataBytes = view.getUint32(40, true);
  if (format !== 1 || channels !== NABR_QRC_CHANNELS || sampleRate !== NABR_QRC_SAMPLE_RATE_HZ
    || byteRate !== NABR_QRC_SAMPLE_RATE_HZ * 2 || blockAlign !== 2
    || bitsPerSample !== NABR_QRC_BITS_PER_SAMPLE) {
    return {
      isValid: false,
      error: "WAV must be 16 kHz mono PCM16",
      sampleRate,
      channels,
      bitsPerSample,
      dataBytes,
    };
  }
  if (ascii(36, 4) !== "data" || dataBytes !== input.byteLength - 44 || dataBytes % 2 !== 0) {
    return {
      isValid: false,
      error: "WAV data size does not match the chunk length",
      sampleRate,
      channels,
      bitsPerSample,
      dataBytes,
    };
  }
  const durationMs = dataBytes / (NABR_QRC_SAMPLE_RATE_HZ * 2) * 1_000;
  if (durationMs > NABR_QRC_WAV_FRAME_MS) {
    return {
      isValid: false,
      error: "WAV audio chunk exceeds the 200 ms frame limit",
      sampleRate,
      channels,
      bitsPerSample,
      dataBytes,
      durationMs,
    };
  }
  return { isValid: true, sampleRate, channels, bitsPerSample, dataBytes, durationMs };
}

/**
 * Streaming, stateful 24 kHz mono s16le → 16 kHz mono s16le conversion.
 * QRC gets complete WAV files, never the Tabyan PCM chunks or a container blob.
 */
export class NabrQrcWavChunker {
  private sourceSampleCount = 0;
  private nextOutputPosition = 0;
  private previousSample: number | null = null;
  private pending: number[] = [];

  push(input: Uint8Array): Uint8Array[] {
    if (input.byteLength % 2 !== 0) {
      throw new Error("NABR_QRC_INVALID_PCM16");
    }

    const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
    const frames: Uint8Array[] = [];
    for (let offset = 0; offset < input.byteLength; offset += 2) {
      const current = view.getInt16(offset, true);
      const currentPosition = this.sourceSampleCount;

      if (currentPosition === 0) {
        this.pending.push(current);
        this.nextOutputPosition = TABYAN_PCM_INPUT_RATE_HZ / NABR_QRC_SAMPLE_RATE_HZ;
      } else {
        const previous = this.previousSample!;
        while (this.nextOutputPosition <= currentPosition) {
          const fraction = this.nextOutputPosition - (currentPosition - 1);
          const interpolated = previous + (current - previous) * fraction;
          this.pending.push(Math.max(-32768, Math.min(32767, Math.round(interpolated))));
          this.nextOutputPosition += TABYAN_PCM_INPUT_RATE_HZ / NABR_QRC_SAMPLE_RATE_HZ;
        }
      }

      this.previousSample = current;
      this.sourceSampleCount += 1;
      while (this.pending.length >= NABR_QRC_WAV_FRAME_SAMPLES) {
        frames.push(encodeMonoPcm16Wav(this.pending.splice(0, NABR_QRC_WAV_FRAME_SAMPLES)));
      }
    }
    return frames;
  }

  finish(): Uint8Array[] {
    if (this.pending.length === 0) return [];
    const finalFrame = this.pending;
    this.pending = [];
    return [encodeMonoPcm16Wav(finalFrame)];
  }
}

export function encodeMonoPcm16Wav(samples: readonly number[]): Uint8Array {
  if (samples.length === 0) throw new Error("NABR_QRC_EMPTY_WAV");
  const dataBytes = samples.length * 2;
  const output = new Uint8Array(44 + dataBytes);
  const view = new DataView(output.buffer);
  const writeAscii = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, NABR_QRC_CHANNELS, true);
  view.setUint32(24, NABR_QRC_SAMPLE_RATE_HZ, true);
  view.setUint32(28, NABR_QRC_SAMPLE_RATE_HZ * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, NABR_QRC_BITS_PER_SAMPLE, true);
  writeAscii(36, "data");
  view.setUint32(40, dataBytes, true);
  samples.forEach((sample, index) => view.setInt16(44 + index * 2, sample, true));
  return output;
}
