import type {
  ConfirmedTabyanRecitationEvent,
  NormalizedRecitationEvent,
  ProviderObservation,
} from "@workspace/tabyan-domain";

export interface NabrQrcCapturedProviderEvent {
  observedAt: number;
  rawProviderObservation: unknown;
  providerObservations: ProviderObservation[];
  normalizedEvents: NormalizedRecitationEvent[];
}

export interface NabrQrcAcceptanceTraceSnapshot {
  /** In-memory diagnostic data only. Audio is never accepted or stored here. */
  providerEvents: NabrQrcCapturedProviderEvent[];
  confirmedTabyanEvents: ConfirmedTabyanRecitationEvent[];
}

const MAX_PROVIDER_EVENTS = 512;
const MAX_CONFIRMED_EVENTS = 512;

/**
 * Bounded, in-memory comparison trace. The caller must not persist it without
 * a separately approved privacy/retention agreement.
 */
export class NabrQrcAcceptanceTrace {
  private readonly providerEvents: NabrQrcCapturedProviderEvent[] = [];
  private readonly confirmedTabyanEvents: ConfirmedTabyanRecitationEvent[] = [];

  captureProviderEvent(record: NabrQrcCapturedProviderEvent): void {
    this.providerEvents.push(record);
    if (this.providerEvents.length > MAX_PROVIDER_EVENTS) this.providerEvents.shift();
  }

  captureConfirmedTabyanEvent(event: ConfirmedTabyanRecitationEvent): void {
    this.confirmedTabyanEvents.push(event);
    if (this.confirmedTabyanEvents.length > MAX_CONFIRMED_EVENTS) {
      this.confirmedTabyanEvents.shift();
    }
  }

  snapshot(): NabrQrcAcceptanceTraceSnapshot {
    return {
      providerEvents: [...this.providerEvents],
      confirmedTabyanEvents: [...this.confirmedTabyanEvents],
    };
  }

  clear(): void {
    this.providerEvents.length = 0;
    this.confirmedTabyanEvents.length = 0;
  }
}
