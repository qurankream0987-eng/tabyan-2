/**
 * @license
 * Tabyan Smart Mushaf — Server-Side WAV Audio Contract Validator
 * Validates 16 kHz Mono PCM16 standalone RIFF/WAV chunks before upstream forwarding.
 */

export interface WavValidationResult {
  readonly isValid: boolean;
  readonly sampleRate?: number;
  readonly channels?: number;
  readonly bitsPerSample?: number;
  readonly dataBytes?: number;
  readonly error?: string;
}

export function validateRiffWavChunk(buffer: Buffer | Uint8Array | ArrayBuffer): WavValidationResult {
  const bytes = buffer instanceof Buffer 
    ? buffer 
    : buffer instanceof Uint8Array 
      ? Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      : Buffer.from(buffer);

  if (bytes.length < 44) {
    return { isValid: false, error: `Buffer length ${bytes.length} is smaller than 44-byte RIFF header` };
  }

  // 1. "RIFF" signature
  const riffTag = bytes.toString('ascii', 0, 4);
  if (riffTag !== 'RIFF') {
    return { isValid: false, error: `Invalid header magic: expected 'RIFF', got '${riffTag}'` };
  }

  // 2. "WAVE" format
  const waveTag = bytes.toString('ascii', 8, 12);
  if (waveTag !== 'WAVE') {
    return { isValid: false, error: `Invalid format: expected 'WAVE', got '${waveTag}'` };
  }

  // 3. "fmt " subchunk
  const fmtTag = bytes.toString('ascii', 12, 16);
  if (fmtTag !== 'fmt ') {
    return { isValid: false, error: `Invalid subchunk: expected 'fmt ', got '${fmtTag}'` };
  }

  // 4. Audio format = 1 (PCM)
  const audioFormat = bytes.readUInt16LE(20);
  if (audioFormat !== 1) {
    return { isValid: false, error: `Invalid audio format: expected 1 (PCM), got ${audioFormat}` };
  }

  // 5. Channels = 1 (Mono)
  const channels = bytes.readUInt16LE(22);
  if (channels !== 1) {
    return { isValid: false, channels, error: `Invalid channel count: expected 1 (Mono), got ${channels}` };
  }

  // 6. Sample rate = 16000 Hz
  const sampleRate = bytes.readUInt32LE(24);
  if (sampleRate !== 16000) {
    return { isValid: false, sampleRate, error: `Invalid sample rate: expected 16000 Hz, got ${sampleRate}` };
  }

  // 7. Bits per sample = 16
  const bitsPerSample = bytes.readUInt16LE(34);
  if (bitsPerSample !== 16) {
    return { isValid: false, bitsPerSample, error: `Invalid bits per sample: expected 16, got ${bitsPerSample}` };
  }

  // 8. "data" subchunk
  const dataTag = bytes.toString('ascii', 36, 40);
  if (dataTag !== 'data') {
    return { isValid: false, error: `Invalid subchunk: expected 'data', got '${dataTag}'` };
  }

  // 9. Data size check
  const dataSize = bytes.readUInt32LE(40);
  const actualDataSize = bytes.length - 44;
  if (dataSize <= 0 || dataSize !== actualDataSize) {
    return {
      isValid: false,
      dataBytes: actualDataSize,
      error: `Data size mismatch: header declares ${dataSize} bytes, payload contains ${actualDataSize} bytes`,
    };
  }

  return {
    isValid: true,
    sampleRate,
    channels,
    bitsPerSample,
    dataBytes: actualDataSize,
  };
}
