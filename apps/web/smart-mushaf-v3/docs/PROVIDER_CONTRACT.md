# Tabyan Smart Mushaf — Recitation Provider Abstraction Contract
**Document Version:** 1.0.0  

---

## 1. Interface Definition
```ts
export interface RecitationProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  startSession(config: RecitationSessionConfig): Promise<void>;
  pushAudio(frame: CanonicalAudioFrame): Promise<void>;
  resetSession(): Promise<void>;
  onObservation(listener: ObservationListener): () => void;
  onStateChange(listener: StateChangeListener): () => void;
  onError(listener: ErrorListener): () => void;
  getConnectionState(): ProviderConnectionState;
  getCapabilities(): ProviderCapabilities;
  getDevDiagnostics(): ProviderDiagnostics;
}
```

## 2. Implementations
1. `MockNabrProvider`: Deterministic simulator for offline testing, scenarios, and CI/CD.
2. `NabrQrcProvider`: Official Qurani.ai QRC WebSocket protocol skeleton.
3. Future Local/On-Device Provider: Ready for Zipformer / Sherpa-ONNX or whisper-quran without touching the UI.
