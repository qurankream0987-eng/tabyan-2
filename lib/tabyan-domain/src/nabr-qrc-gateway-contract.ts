import type { NabrQrcIndices } from "./nabr-index-conversion";

export interface NabrQrcGatewayStart {
  readonly sessionId: string;
  /** The browser sends canonical 1-based coordinates; the server owns QRC setup. */
  readonly start: {
    readonly surah: number;
    readonly ayah: number;
    readonly wordIndex: number;
  };
}

export interface NabrQrcGatewayMistake {
  readonly position: NabrQrcIndices;
  readonly errorCode?: string;
  readonly description?: string;
  readonly heard?: string;
  /** Raw QRC letter coordinate; retained only as a provider observation. */
  readonly providerLetterIndex?: number;
  readonly ruleName?: string;
}

/** Whitelisted QRC result data. No raw MessagePack/provider packet crosses to the browser. */
export interface NabrQrcGatewayObservation {
  readonly currentPosition: NabrQrcIndices;
  readonly correctWords: readonly NabrQrcIndices[];
  readonly skippedWords: readonly NabrQrcIndices[];
  readonly letterMistakes: readonly NabrQrcGatewayMistake[];
  readonly tajweedMistakes: readonly NabrQrcGatewayMistake[];
  readonly observedAt: number;
  readonly providerTimestamp?: number;
  readonly providerEventId?: string;
  readonly confidence?: number;
}

export type NabrQrcGatewayClientMessage =
  | { readonly t: "auth"; readonly token: string }
  | ({ readonly t: "start" } & NabrQrcGatewayStart)
  | { readonly t: "reset" }
  | { readonly t: "close" };

export type NabrQrcGatewayServerMessage =
  | { readonly t: "authenticated" }
  | { readonly t: "ready"; readonly mode: "fake" | "live" }
  | { readonly t: "observation"; readonly observation: NabrQrcGatewayObservation }
  | { readonly t: "keep_alive"; readonly observedAt: number }
  | { readonly t: "stopped" }
  | { readonly t: "error"; readonly code: string; readonly message: string };
