# Tabyan Smart Mushaf — Replit Handoff & Integration Manual
**Release Candidate:** `TABYAN_SMART_MUSHAF_RC1`  
**Target Environment:** Replit (Tabyan Core Monorepo)  
**Status:** Export Ready & Frozen  

---

## ⚠️ MANDATORY RULE #1: DO NOT MERGE THIS INTO THE OLD MUSHAF
**DO NOT MERGE THIS INTO THE OLD MUSHAF.**  
Import it as a completely isolated, new subsystem first (e.g. `packages/smart-mushaf` or `client/src/modules/smart-mushaf`).  
Under NO circumstances should legacy QCF glyph parsers, old mushaf DOM hooks, or deprecated state variables be mixed with this new codebase.

---

## 1. Recommended 15-Step Replit Integration Sequence

1. **Import Source Unchanged:**  
   Transfer the complete `src/`, `docs/`, `package.json`, `index.html`, and `tsconfig.json` directly into your Replit project directory.
2. **Install Dependencies:**  
   Run `npm install` (pure standard dependencies: React 19, Vite, Tailwind CSS, Lucide React).
3. **Run Automated Test Suite:**  
   Run `npm test` — all 12 test suites (62 tests) must pass with code 0.
4. **Run Production Build:**  
   Run `npm run build` — confirm clean compilation with 0 TypeScript/Vite errors.
5. **Inspect Web UI in Preview:**  
   Open the full-stack server (`npm run dev`, running `server.ts`) at port 3000 and verify both desktop (1440px) and mobile (390x844) viewport presence.
6. **Compare Hashes & Manifest:**  
   Verify directory integrity against `HANDOFF_MANIFEST.md` to guarantee no required files were omitted.
7. **Connect Tabyan Auth Adapter:**  
   Wrap the root `<App />` with Tabyan's existing authentication hook (`useAuth()`) to provide student identity without modifying the internal `smartMushafReducer`.
8. **Connect Backend Adapters:**  
   Implement a lightweight persistence hook for bookmarks and session summary history pointing to Tabyan's database schema.
9. **Built-in Server-Side Nabr Gateway (`server.ts`):**  
   The project now includes an enterprise-grade `server.ts` Express + WebSocket gateway on `/api/qrc-ws` with a built-in RIFF/WAV audio contract validator (`src/audio/validation/wavValidator.ts`). In Replit, simply add `NABR_QRC_API_KEY` to your Replit Secrets. The backend automatically injects the authorization token upstream to `wss://api.qurani.ai`.
10. **Perform One Explicitly Approved Controlled Nabr Test:**  
    In your staging environment, run a single controlled live recitation test (e.g. Surah Al-Fatihah) to observe real network round-trip latency and acoustic payload responses.
11. **Validate Provider Semantics:**  
    Confirm that live observations pass cleanly through `ObservationNormalizer` and `CanonicalPositionResolver` without coordinate dislocation.
12. **Validate Web Experience:**  
    Confirm Tasmee progressive reveal, 1-tap hints, and layout-invariant masking on real mobile touch devices.
13. **Later Native Deployment:**  
    When building Capacitor / React Native wrappers, reuse the exact domain models, reducer, and audio pipeline, providing only native microphone permissions.
14. **Replace Old Live Route:**  
    Point the primary `/mushaf` route to this new component.
15. **Archive Old Mushaf:**  
    Decommission and archive the legacy mushaf code.

---

## 2. Command Reference
- **Install dependencies:** `npm install`
- **Start full-stack server (Vite + Gateway):** `npm run dev`
- **Run test suite:** `npm test`
- **Compile / Build production bundle:** `npm run build`
- **Type check / Lint:** `npm run lint`

---

## 3. Environment & Security Configuration
- **Browser Security Invariant:** Zero secrets or API keys are bundled into client assets.
- **Replit Environment Secrets:**
  - `NABR_QRC_API_KEY`: The production API key for Qurani.ai / Nabr, stored strictly as a server-side Replit Secret.
  - `NABR_QRC_ENDPOINT`: Upstream WebSocket endpoint (defaults to `wss://api.qurani.ai`).

---

## 4. Canonical WordKey Contract
Every word in the Quran is identified strictly by:
```ts
export interface WordKey {
  readonly surah: number;     // 1..114
  readonly ayah: number;      // 1..totalAyahs
  readonly wordIndex: number; // 1-based index within Ayah
}
```
Canonical progress must NEVER depend on DOM ids, font glyph numbers, or QCF glyph codepoints.

---

## 5. Official Nabr QRC Architecture & Audio Framing
- Protocol: WebSocket at `wss://api.qurani.ai` (proxied via Replit backend).
- Audio format: 16 kHz Mono PCM16.
- WAV mode: Complete 44-byte RIFF header per 200ms chunk (`encodePcmToWav`).
- Opus mode: Status is `NOT_IMPLEMENTED` in client prototype (requires libopus WebAssembly encoder, which should be handled either on the backend or via WASM when needed).
