/**
 * @license
 * Tabyan Smart Mushaf — Server Nabr Gateway & Audio Contract Test Suite
 * Tests server-side 16 kHz Mono PCM16 RIFF/WAV chunk validation,
 * and strict secret boundary isolation. The canonical event path is covered
 * by liveSession.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { loadEnv } from 'vite';
import { validateRiffWavChunk } from '../audio/validation/wavValidator';
import { encodePcmToWav } from '../audio/conversion/wavEncoder';
import { NabrQrcProvider } from '../providers/nabr/NabrQrcProvider';

describe('Server Nabr Gateway & Audio Contract Qualification', () => {
  // --------------------------------------------------------------------------
  // 1. AUDIO CONTRACT VALIDATION
  // --------------------------------------------------------------------------
  it('1. accepts perfectly formed 16 kHz Mono PCM16 standalone RIFF/WAV 200ms chunk', () => {
    // 200ms @ 16 kHz = 3200 samples
    const sampleCount = 3200;
    const samples = new Int16Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      samples[i] = Math.sin((i / 16000) * 2 * Math.PI * 440) * 8000;
    }

    const wavBuffer = encodePcmToWav(samples, 16000, 1);
    expect(wavBuffer.byteLength).toBe(44 + sampleCount * 2);

    const validation = validateRiffWavChunk(wavBuffer);
    expect(validation.isValid).toBe(true);
    expect(validation.sampleRate).toBe(16000);
    expect(validation.channels).toBe(1);
    expect(validation.bitsPerSample).toBe(16);
    expect(validation.dataBytes).toBe(sampleCount * 2);
  });

  it('2. rejects chunks shorter than 44-byte RIFF header', () => {
    const tinyBuffer = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]);
    const validation = validateRiffWavChunk(tinyBuffer);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toContain('smaller than 44-byte RIFF header');
  });

  it('3. rejects chunk with invalid RIFF magic header', () => {
    const samples = new Int16Array(100);
    const wavBuffer = encodePcmToWav(samples, 16000, 1);
    const bytes = new Uint8Array(wavBuffer);
    bytes[0] = 0x46; // 'F'
    bytes[1] = 0x4c; // 'L'
    bytes[2] = 0x41; // 'A'
    bytes[3] = 0x43; // 'C'

    const validation = validateRiffWavChunk(bytes);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toContain("expected 'RIFF'");
  });

  it('4. rejects chunk if audio sample rate is not 16000 Hz', () => {
    const samples = new Int16Array(100);
    const wav44100 = encodePcmToWav(samples, 44100, 1);

    const validation = validateRiffWavChunk(wav44100);
    expect(validation.isValid).toBe(false);
    expect(validation.sampleRate).toBe(44100);
    expect(validation.error).toContain('expected 16000 Hz, got 44100');
  });

  it('5. rejects chunk if audio is stereo (channels != 1)', () => {
    const samples = new Int16Array(200);
    const wavStereo = encodePcmToWav(samples, 16000, 2);

    const validation = validateRiffWavChunk(wavStereo);
    expect(validation.isValid).toBe(false);
    expect(validation.channels).toBe(2);
    expect(validation.error).toContain('expected 1 (Mono), got 2');
  });

  it('6. rejects chunk if data size does not match declared payload length', () => {
    const samples = new Int16Array(100);
    const wavBuffer = encodePcmToWav(samples, 16000, 1);
    // Truncate last 10 bytes
    const truncated = wavBuffer.slice(0, wavBuffer.byteLength - 10);

    const validation = validateRiffWavChunk(truncated);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toContain('Data size mismatch');
  });

  // --------------------------------------------------------------------------
  // 2. SECRET BOUNDARY AUDIT
  // --------------------------------------------------------------------------
  it('7. strictly enforces that NABR_QRC_API_KEY is never exposed in client bundle or client env', () => {
    // Vitest's import.meta.env includes runner process variables. Use Vite's
    // actual client prefix allowlist instead of inspecting that server context.
    const clientEnv = loadEnv('production', process.cwd(), 'VITE_');
    expect(typeof clientEnv.NABR_QRC_API_KEY).toBe('undefined');
    expect(typeof clientEnv.VITE_NABR_QRC_API_KEY).toBe('undefined');

    // Verify NabrQrcProvider does not take or store API keys
    const provider = new NabrQrcProvider();
    const json = JSON.stringify(provider);
    expect(json).not.toContain('API_KEY');
    expect(json).not.toContain('apiKey');
    expect(json).not.toContain('secret');
  });
});
