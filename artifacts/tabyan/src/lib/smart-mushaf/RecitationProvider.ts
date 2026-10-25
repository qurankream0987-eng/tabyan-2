import type { ObservationStatus, ProviderObservation, WordKey } from "./SmartMushafState";

export type ProviderObservationInput = {
  status: ObservationStatus;
  wordKey?: WordKey;
  stabilized?: boolean;
};

/** Renderer-neutral event stream; future providers must resolve to canonical WordKey first. */
export interface RecitationProvider {
  readonly id: string;
  subscribe(listener: (observation: ProviderObservation) => void): () => void;
}

/** Development-only event source; it does not capture audio or perform recognition. */
export class MockUiRecitationProvider implements RecitationProvider {
  readonly id = "MOCK_UI";
  private readonly listeners = new Set<(observation: ProviderObservation) => void>();

  subscribe(listener: (observation: ProviderObservation) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(input: ProviderObservationInput): void {
    const observation: ProviderObservation = { ...input, provider: this.id };
    for (const listener of this.listeners) listener(observation);
  }
}
