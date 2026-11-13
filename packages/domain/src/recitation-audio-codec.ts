/**
 * Compact audio for the live recitation socket. Raw PCM16 in base64 JSON costs about
 * 43 kB/s at 16 kHz; a reciter on a weak mobile uplink cannot keep that flowing and the
 * pointer falls behind. These codecs are pure arithmetic, so the app, the web client and
 * the gateway share one implementation and need no native encoder.
 */

/**
 * Codecs a client may offer in its `auth` message; the gateway names the one to use in `ready`,
 * the first of these the client offered unless the server is configured otherwise. mu-law (128 kbps)
 * comes first: the recognizer reads it as well as plain PCM, while ADPCM (64 kbps) costs a little accuracy.
 */
export const RECITATION_AUDIO_CODECS = ["mulaw", "adpcm"] as const;
export type RecitationAudioCodec = (typeof RECITATION_AUDIO_CODECS)[number];

export function isRecitationAudioCodec(value: unknown): value is RecitationAudioCodec {
  return typeof value === "string" && (RECITATION_AUDIO_CODECS as readonly string[]).includes(value);
}

function toPcm16(sample: number) {
  const clipped = sample > 1 ? 1 : sample < -1 ? -1 : sample;
  return Math.round(clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff);
}

const MULAW_BIAS = 0x84;
const MULAW_CLIP = 32635;

/** G.711 mu-law: one byte per sample. */
export function encodeMulaw(samples: Float32Array): Uint8Array {
  const out = new Uint8Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    let value = toPcm16(samples[i]);
    const sign = value < 0 ? 0x80 : 0;
    if (value < 0) value = -value;
    if (value > MULAW_CLIP) value = MULAW_CLIP;
    value += MULAW_BIAS;
    let exponent = 7;
    for (let mask = 0x4000; (value & mask) === 0 && exponent > 0; mask >>= 1) exponent -= 1;
    const mantissa = (value >> (exponent + 3)) & 0x0f;
    out[i] = ~(sign | (exponent << 4) | mantissa) & 0xff;
  }
  return out;
}

export function decodeMulaw(bytes: Uint8Array): Int16Array {
  const out = new Int16Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    const value = ~bytes[i] & 0xff;
    const exponent = (value >> 4) & 0x07;
    const magnitude = (((value & 0x0f) << 3) + MULAW_BIAS) << exponent;
    out[i] = value & 0x80 ? MULAW_BIAS - magnitude : magnitude - MULAW_BIAS;
  }
  return out;
}

const ADPCM_INDEX_STEP = [-1, -1, -1, -1, 2, 4, 6, 8];
const ADPCM_STEPS = [
  7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88, 97, 107,
  118, 130, 143, 157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963,
  1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894,
  6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794,
  32767,
];
/** Bytes in front of a frame's samples: the predictor (int16 LE) and the step index. */
export const ADPCM_HEADER_BYTES = 3;

/** The decoder's reconstruction of one 4-bit code; the encoder runs it too, so both stay in step. */
function adpcmStep(code: number, predictor: number, step: number) {
  let delta = step >> 3;
  if (code & 4) delta += step;
  if (code & 2) delta += step >> 1;
  if (code & 1) delta += step >> 2;
  const next = code & 8 ? predictor - delta : predictor + delta;
  return next > 32767 ? 32767 : next < -32768 ? -32768 : next;
}

/**
 * IMA ADPCM, four bits per sample. Every frame starts with the coder's state, so a frame
 * decodes on its own and a new socket needs nothing from the one before it.
 */
export class AdpcmEncoder {
  private predictor = 0;
  private index = 0;

  encode(samples: Float32Array): Uint8Array {
    const out = new Uint8Array(ADPCM_HEADER_BYTES + Math.ceil(samples.length / 2));
    out[0] = this.predictor & 0xff;
    out[1] = (this.predictor >> 8) & 0xff;
    out[2] = this.index;
    for (let i = 0; i < samples.length; i += 1) {
      const step = ADPCM_STEPS[this.index];
      let difference = toPcm16(samples[i]) - this.predictor;
      let code = 0;
      if (difference < 0) {
        code = 8;
        difference = -difference;
      }
      if (difference >= step) { code |= 4; difference -= step; }
      if (difference >= step >> 1) { code |= 2; difference -= step >> 1; }
      if (difference >= step >> 2) code |= 1;
      this.predictor = adpcmStep(code, this.predictor, step);
      this.index = Math.max(0, Math.min(ADPCM_STEPS.length - 1, this.index + ADPCM_INDEX_STEP[code & 7]));
      out[ADPCM_HEADER_BYTES + (i >> 1)] |= i & 1 ? code << 4 : code;
    }
    return out;
  }
}

/** Samples of one ADPCM frame. A frame of an odd sample count decodes one sample too many. */
export function decodeAdpcm(frame: Uint8Array): Int16Array {
  if (frame.length < ADPCM_HEADER_BYTES) return new Int16Array(0);
  let predictor = frame[0] | (frame[1] << 8);
  if (predictor & 0x8000) predictor -= 0x10000;
  let index = Math.min(ADPCM_STEPS.length - 1, frame[2]);
  const out = new Int16Array((frame.length - ADPCM_HEADER_BYTES) * 2);
  for (let i = 0; i < out.length; i += 1) {
    const byte = frame[ADPCM_HEADER_BYTES + (i >> 1)];
    const code = i & 1 ? byte >> 4 : byte & 0x0f;
    predictor = adpcmStep(code, predictor, ADPCM_STEPS[index]);
    index = Math.max(0, Math.min(ADPCM_STEPS.length - 1, index + ADPCM_INDEX_STEP[code & 7]));
    out[i] = predictor;
  }
  return out;
}
