export const PCM_SAMPLE_RATE = 24_000;
export const PCM_CHUNK_SAMPLES = 2_400;
export const MAX_AUDIO_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_AUDIO_FILE_SECONDS = 180;

/**
 * Convert decoded browser audio to the same mono PCM16/24 kHz format used by
 * the microphone AudioWorklet. This is only for the development audio-file
 * harness; it does not store or upload the source file as a file.
 */
export function resampleToMonoPcm16(
  channels: readonly Float32Array[],
  sourceSampleRate: number,
): Int16Array {
  if (!channels.length || !Number.isFinite(sourceSampleRate) || sourceSampleRate <= 0) {
    throw new Error("ملف الصوت لا يحتوي على بيانات قابلة للقراءة");
  }
  const sourceFrames = Math.min(...channels.map((channel) => channel.length));
  if (sourceFrames === 0) throw new Error("ملف الصوت فارغ");

  const outputFrames = Math.ceil(sourceFrames * PCM_SAMPLE_RATE / sourceSampleRate);
  const output = new Int16Array(outputFrames);
  const sourceStep = sourceSampleRate / PCM_SAMPLE_RATE;

  for (let index = 0; index < outputFrames; index += 1) {
    const sourcePosition = Math.min(sourceFrames - 1, index * sourceStep);
    const left = Math.floor(sourcePosition);
    const right = Math.min(sourceFrames - 1, left + 1);
    const mix = sourcePosition - left;
    let sample = 0;
    for (const channel of channels) {
      sample += channel[left] + (channel[right] - channel[left]) * mix;
    }
    sample /= channels.length;
    const clipped = Math.max(-1, Math.min(1, sample));
    output[index] = clipped < 0 ? Math.round(clipped * 0x8000) : Math.round(clipped * 0x7fff);
  }

  return output;
}

/** Yield bounded 100 ms chunks without retaining a second copy of the file. */
export function* pcm16Chunks(samples: Int16Array): Generator<Int16Array> {
  for (let offset = 0; offset < samples.length; offset += PCM_CHUNK_SAMPLES) {
    yield samples.slice(offset, Math.min(samples.length, offset + PCM_CHUNK_SAMPLES));
  }
}
