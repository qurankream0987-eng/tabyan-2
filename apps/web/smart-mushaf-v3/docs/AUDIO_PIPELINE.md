# Tabyan Smart Mushaf — Audio Architecture Pipeline
**Document Version:** 1.0.0  

---

## 1. Specifications

```
Microphone Hardware (44.1kHz / 48kHz Stereo)
         │
         ▼
[AudioCaptureService]
   - MediaStream Constraints (echoCancellation, noiseSuppression)
   - Downsampler / Resampler -> 16,000 Hz
   - Single-channel Mono Int16 PCM
         │
         ▼
[CanonicalAudioFrame]
   - { pcmData: Int16Array, sampleRate: 16000, channels: 1 }
         │
         ▼
[NabrAudioAdapter]
   - WAV Mode: Buffers 3,200 samples (200ms) + 44-byte RIFF header
   - Opus Mode: 320 samples (20ms raw frame, no container)
         │
         ▼
[ProviderTransport]
   - Mock Simulator OR wss://api.qurani.ai
```

## 2. Echo Safety
Audio playback (`AudioPlaybackService`) is completely isolated from audio capture (`AudioCaptureService`). In Quran Teacher Mode, the system strictly pauses or stops Qari playback before enabling microphone capture, guaranteeing that speaker output never loops into the recitation recognizer.
