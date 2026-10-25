import { decode, encode } from "@msgpack/msgpack";
import type { NormalizedRecitationEvent } from "@workspace/tabyan-domain";
import { NabrProviderAdapter } from "./NabrProviderAdapter";
import { qrcContractFixtures } from "./fixtures/qrc-contract-fixtures";
import { NabrQrcWavChunker, TABYAN_PCM_INPUT_RATE_HZ } from "./nabr-qrc-audio";
import {
  createNabrQrcStartPayload,
  type NabrQrcStartInput,
} from "./nabr-qrc-config";

export interface NabrQrcDryRunReport {
  mode: "dry_run";
  isSynthetic: true;
  externalSocketOpened: false;
  networkRequestCount: 0;
  audioUploaded: false;
  requestMethods: ["START_TILAWA_SESSION", "CHECK_TILAWA_AUDIO", "RESET_TILAWA_SESSION"];
  simulatedStates: ["connected", "starting", "active", "stopping", "ended"];
  startPayloadRoundTripped: boolean;
  silentWavFrameCount: number;
  silentWavSampleRateHz: number;
  normalizedFixtureEvents: NormalizedRecitationEvent[];
}

/**
 * Exercises the documented request envelope, WAV conversion, and local QRC
 * fixtures. It has no socket dependency and can never make an HTTP/WebSocket call.
 */
export function runNabrQrcDryRun(
  start: NabrQrcStartInput,
): NabrQrcDryRunReport {
  const startPayload = createNabrQrcStartPayload(start);
  const packed = encode(startPayload);
  const roundTripped = decode(packed) as typeof startPayload;

  // Synthetic silence validates framing only; it is not a Quran/learner sample.
  const silentPcm = new Uint8Array((TABYAN_PCM_INPUT_RATE_HZ / 5) * 2);
  const chunker = new NabrQrcWavChunker();
  const silentFrames = [
    ...chunker.push(silentPcm),
    ...chunker.finish(),
  ];
  const sampleRateView = new DataView(
    silentFrames[0]!.buffer,
    silentFrames[0]!.byteOffset,
    silentFrames[0]!.byteLength,
  );

  const adapter = new NabrProviderAdapter();
  const normalizedFixtureEvents = [
    qrcContractFixtures.connected,
    qrcContractFixtures.started,
    qrcContractFixtures.result,
    qrcContractFixtures.ended,
  ].flatMap((fixture) => adapter.normalizeServerMessage(fixture, 0));

  return {
    mode: "dry_run",
    isSynthetic: true,
    externalSocketOpened: false,
    networkRequestCount: 0,
    audioUploaded: false,
    requestMethods: ["START_TILAWA_SESSION", "CHECK_TILAWA_AUDIO", "RESET_TILAWA_SESSION"],
    simulatedStates: ["connected", "starting", "active", "stopping", "ended"],
    startPayloadRoundTripped: JSON.stringify(roundTripped) === JSON.stringify(startPayload),
    silentWavFrameCount: silentFrames.length,
    silentWavSampleRateHz: sampleRateView.getUint32(24, true),
    normalizedFixtureEvents,
  };
}
