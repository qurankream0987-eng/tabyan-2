/**
 * @license
 * Tabyan Smart Mushaf — RIFF WAV Chunk Encoder
 * Encodes 16 kHz Mono 16-bit PCM samples into a valid standalone WAV file per Nabr QRC spec.
 */

/**
 * Creates a complete 44-byte standard RIFF header prepended to the PCM16 audio bytes.
 */
export function encodePcmToWav(pcm16Data: Int16Array, sampleRate = 16000, numChannels = 1): ArrayBuffer {
  const byteRate = sampleRate * numChannels * 2; // 2 bytes per sample (16-bit)
  const blockAlign = numChannels * 2;
  const pcmByteLength = pcm16Data.length * 2;
  const totalLength = 44 + pcmByteLength;

  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);

  // 1. "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmByteLength, true); // Chunk size
  writeString(view, 8, 'WAVE');

  // 2. "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);          // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);           // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true);  // SampleRate (16000)
  view.setUint32(28, byteRate, true);    // ByteRate
  view.setUint16(32, blockAlign, true);  // BlockAlign
  view.setUint16(34, 16, true);          // BitsPerSample (16 bits)

  // 3. "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmByteLength, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < pcm16Data.length; i++) {
    view.setInt16(offset, pcm16Data[i], true);
    offset += 2;
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
