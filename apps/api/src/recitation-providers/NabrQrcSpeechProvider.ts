import {
  NormalizedTranscriptMatcherBridge,
  toQrcStructuredObservation,
  type NormalizedRecitationEvent,
} from "@workspace/tabyan-domain";
import {
  NabrQrcTransport,
  type NabrQrcTransportDependencies,
} from "./NabrQrcTransport";
import { createNabrQrcDiagnosticPacket } from "./nabr-qrc-diagnostics";
import type {
  NabrQrcConfig,
  NabrQrcCredential,
  NabrQrcStartInput,
} from "./nabr-qrc-config";
import type {
  CanonicalTranscriptEvent,
  SpeechRecognitionProvider,
  SpeechRecognitionProviderEvents,
} from "./types";

/**
 * QRC's current documented results are structured position/assessment
 * observations, not transcripts. Only a normalized transcript may cross the
 * existing Tabyan matcher boundary; all other QRC observations remain inert.
 */
export class NabrQrcTranscriptBridge {
  private readonly bridge = new NormalizedTranscriptMatcherBridge();

  toCanonicalTranscript(event: NormalizedRecitationEvent): CanonicalTranscriptEvent | null {
    const input = this.bridge.toMatcherInput(event);
    if (!input) return null;
    return {
      text: input.text,
      isFinal: input.isFinal,
      ...(input.confidence === undefined ? {} : { confidence: input.confidence }),
      itemId: input.itemId,
      ...(input.confirmationEligible === undefined
        ? {}
        : { confirmationEligible: input.confirmationEligible }),
    };
  }

  reset(): void {
    this.bridge.reset();
  }
}

export class NabrQrcSpeechProvider implements SpeechRecognitionProvider {
  readonly name = "nabr" as const;
  private readonly transcriptBridge = new NabrQrcTranscriptBridge();
  private readonly transport: NabrQrcTransport;
  private finalizeInFlight: Promise<void> | null = null;
  private finalizationReported = false;

  constructor(
    config: NabrQrcConfig,
    credential: NabrQrcCredential,
    startInput: NabrQrcStartInput | undefined,
    private readonly events: SpeechRecognitionProviderEvents,
    dependencies: NabrQrcTransportDependencies = {},
  ) {
    this.transport = new NabrQrcTransport(config, credential, startInput, {
      onReady: () => this.events.onReady(),
      onObservation: (capture) => {
        const providerEventId = capture.normalizedEvents.find((event) => event.providerEventId)?.providerEventId;
        this.events.onQrcDiagnostic?.(
          createNabrQrcDiagnosticPacket(
            capture.rawProviderObservation,
            capture.observedAt,
            providerEventId,
          ),
        );
        for (const event of capture.normalizedEvents) {
          this.events.onProviderEvent();
          const observation = toQrcStructuredObservation(event);
          if (observation) this.events.onStructuredObservation?.(observation);
          const transcript = this.transcriptBridge.toCanonicalTranscript(event);
          if (transcript) this.events.onTranscript(transcript);
        }
      },
      onError: (code) => {
        this.events.onQrcDiagnostic?.(createNabrQrcDiagnosticPacket({
          event: "TABYAN_TRANSPORT_ERROR",
          code,
        }, Date.now()));
        this.events.onError(`Nabr/QRC provider failure: ${code}`, 502);
      },
      onDryRun: () => this.events.onError("Nabr/QRC dry-run ended without a live connection", 503),
    }, dependencies);
  }

  connect(): void {
    this.transport.connect();
  }

  appendAudio(base64Audio: string): void {
    if (!this.transport.appendAudio(base64Audio)) return;
    this.events.onAudioForwarded?.(Buffer.byteLength(base64Audio, "base64"));
  }

  commit(finalize = false, commitId?: string): void {
    if (!finalize || this.transport.state !== "active" || this.finalizationReported) return;
    if (this.finalizeInFlight) return;

    this.finalizeInFlight = this.transport.stop();
    void this.finalizeInFlight.then(() => {
      if (this.transport.state !== "closed" || this.finalizationReported) return;
      this.finalizationReported = true;
      this.events.onCommitAccepted?.("provider_commit_ack");
      this.events.onFinalized?.(commitId);
    }).finally(() => {
      this.finalizeInFlight = null;
    });
  }

  close(reason?: string): void {
    this.transcriptBridge.reset();
    this.transport.close(reason);
  }

  isOpen(): boolean {
    return this.transport.state === "active";
  }
}
