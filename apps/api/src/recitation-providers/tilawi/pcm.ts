/** The acoustic model's input rate. */
export const MODEL_SAMPLE_RATE_HZ = 16_000;

/**
 * Mono PCM16LE at `sourceRateHz` -> float32 [-1, 1] at 16 kHz.
 * Linear interpolation; recitation energy sits well below the 8 kHz Nyquist
 * limit, and the gateway's clients already capture through a low-pass mic path.
 */
export function pcm16ToModelInput(pcm: Buffer, sourceRateHz: number): Float32Array {
  const inputLength = pcm.length >> 1;
  if (sourceRateHz === MODEL_SAMPLE_RATE_HZ) {
    const out = new Float32Array(inputLength);
    for (let i = 0; i < inputLength; i++) out[i] = pcm.readInt16LE(i * 2) / 32768;
    return out;
  }
  const step = sourceRateHz / MODEL_SAMPLE_RATE_HZ;
  const outputLength = Math.floor(inputLength / step);
  const out = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const position = i * step;
    const index = Math.floor(position);
    const next = Math.min(index + 1, inputLength - 1);
    const fraction = position - index;
    const a = pcm.readInt16LE(index * 2);
    const b = pcm.readInt16LE(next * 2);
    out[i] = (a + (b - a) * fraction) / 32768;
  }
  return out;
}

/** Root-mean-square level of float samples, used to skip silent windows. */
export function rms(samples: Float32Array, start = 0, end = samples.length): number {
  if (end <= start) return 0;
  let sum = 0;
  for (let i = start; i < end; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / (end - start));
}
