/**
 * @license
 * Tabyan Smart Mushaf — canonical live-recitation event contract
 *
 * The ONLY shape a recitation provider may hand to the Mushaf. Provider
 * adapters translate vendor payloads (Nabr/QRC or any other) into these
 * events; the renderer and state machine never see vendor shapes.
 *
 * Every positioning event carries a canonical WordKey, so the Mushaf updates
 * by identity — never by searching text.
 */

import type { WordKey, WordKeyString } from '../../quran/domain/types';

export type LiveEventType =
  | 'session.ready'
  | 'audio.started'
  | 'speech.started'
  | 'speech.ended'
  | 'position.candidate'
  | 'position.confirmed'
  | 'word.candidate'
  | 'word.confirmed'
  | 'word.flagged'
  | 'ayah.changed'
  | 'provider.partial'
  | 'provider.final'
  | 'provider.error'
  | 'connection.changed';

interface LiveEventBase {
  readonly type: LiveEventType;
  readonly sessionId: string;
  /** Strictly increasing per session; duplicates and stale events are dropped. */
  readonly seq: number;
  /** Wall-clock ms at which the provider produced the event. */
  readonly eventTimestamp: number;
}

export type PositionEventStatus = 'candidate' | 'confirmed';

export interface WordPositionFields {
  readonly wordKey: WordKeyString;
  readonly surah: number;
  readonly ayah: number;
  /** 1-based canonical word index within the ayah. */
  readonly wordIndex: number;
  /** 0..1 */
  readonly confidence: number;
  /** Capture-clock ms of the audio that produced this event, when known. */
  readonly audioTimestamp: number | null;
  readonly status: PositionEventStatus;
}

/** Where the reciter is now (the cursor). */
export interface PositionEvent extends LiveEventBase, WordPositionFields {
  readonly type: 'position.candidate' | 'position.confirmed';
}

/** A specific word was (tentatively or definitely) recited, without moving the cursor. */
export interface WordEvent extends LiveEventBase, WordPositionFields {
  readonly type: 'word.candidate' | 'word.confirmed';
}

export type WordFlag = 'MISTAKE' | 'TASHKEEL_WARNING' | 'SKIPPED' | 'RECOVERED';

export interface WordFlaggedEvent extends LiveEventBase {
  readonly type: 'word.flagged';
  readonly wordKey: WordKeyString;
  readonly surah: number;
  readonly ayah: number;
  readonly wordIndex: number;
  readonly flag: WordFlag;
  /** Short Arabic, learner-facing explanation; never a raw provider string. */
  readonly noteAr?: string;
}

export interface AyahChangedEvent extends LiveEventBase {
  readonly type: 'ayah.changed';
  readonly surah: number;
  readonly ayah: number;
}

export interface SimpleLiveEvent extends LiveEventBase {
  readonly type: 'session.ready' | 'audio.started' | 'speech.started' | 'speech.ended';
}

/** Optional transcript text; informational only, never used for positioning. */
export interface ProviderTextEvent extends LiveEventBase {
  readonly type: 'provider.partial' | 'provider.final';
  readonly text: string;
}

export type ProviderErrorCode = 'NETWORK' | 'AUTH' | 'UNAVAILABLE' | 'PROTOCOL' | 'RATE_LIMIT' | 'UNKNOWN';

export interface ProviderErrorEvent extends LiveEventBase {
  readonly type: 'provider.error';
  readonly code: ProviderErrorCode;
  /** Recoverable errors move the session to RECOVERING instead of ERROR. */
  readonly recoverable: boolean;
}

export type ConnectionPhase = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface ConnectionChangedEvent extends LiveEventBase {
  readonly type: 'connection.changed';
  readonly phase: ConnectionPhase;
}

export type LiveRecitationEvent =
  | PositionEvent
  | WordEvent
  | WordFlaggedEvent
  | AyahChangedEvent
  | SimpleLiveEvent
  | ProviderTextEvent
  | ProviderErrorEvent
  | ConnectionChangedEvent;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** An event as a provider builds it, before the session id and sequence are stamped. */
export type LiveEventBody = DistributiveOmit<LiveRecitationEvent, 'sessionId' | 'seq' | 'eventTimestamp'>;

export function isPositionEvent(event: LiveRecitationEvent): event is PositionEvent {
  return event.type === 'position.candidate' || event.type === 'position.confirmed';
}

export function isWordEvent(event: LiveRecitationEvent): event is WordEvent {
  return event.type === 'word.candidate' || event.type === 'word.confirmed';
}

/** Builds the identity fields of a positioning event from a canonical WordKey. */
export function wordPositionFields(
  key: WordKey,
  status: PositionEventStatus,
  confidence: number,
  audioTimestamp: number | null = null,
): WordPositionFields {
  return {
    wordKey: `${key.surah}:${key.ayah}:${key.wordIndex}`,
    surah: key.surah,
    ayah: key.ayah,
    wordIndex: key.wordIndex,
    confidence,
    audioTimestamp,
    status,
  };
}
