import type { ConfirmedTabyanRecitationEvent } from "@workspace/tabyan-domain";
import type { CanonicalQuranWord } from "./canonicalWords";
import type { RecitationEngineEvent } from "./recitationStateEngine";

const MISTAKE_KINDS = new Set<RecitationEngineEvent["kind"]>([
  "OMISSION",
  "WRONG_WORD",
  "EXTRA_WORD",
  "REPETITION",
  "SKIP",
  "UNEXPECTED_JUMP",
]);

function isMistakeKind(
  kind: RecitationEngineEvent["kind"],
): kind is ConfirmedTabyanRecitationEvent["mistake"]["kind"] {
  return MISTAKE_KINDS.has(kind);
}

/**
 * Projects only Tabyan engine-confirmed mistake transitions. Provider events
 * and tentative engine states cannot be passed as learner feedback through it.
 */
export class ConfirmedTabyanEventProjector {
  private previousStatus = new WeakMap<RecitationEngineEvent, RecitationEngineEvent["status"]>();
  private eventIds = new WeakMap<RecitationEngineEvent, string>();
  private nextId = 1;

  reset(): void {
    this.previousStatus = new WeakMap();
    this.eventIds = new WeakMap();
    this.nextId = 1;
  }

  project(
    events: readonly RecitationEngineEvent[],
    canonicalWordAt: (index: number) => CanonicalQuranWord | null,
  ): ConfirmedTabyanRecitationEvent[] {
    const projected: ConfirmedTabyanRecitationEvent[] = [];
    for (const event of events) {
      if (!isMistakeKind(event.kind) || !event.word) continue;
      const previous = this.previousStatus.get(event);
      const status = event.status;
      this.previousStatus.set(event, status);

      const type = status === "confirmed" && previous !== "confirmed"
        ? "mistake_confirmed"
        : status === "corrected" && previous === "confirmed"
          ? "mistake_corrected"
          : null;
      if (!type) continue;

      const word = canonicalWordAt(event.index);
      if (!word
        || word.verseKey !== event.word.verseKey
        || word.position !== event.word.position
        || !Number.isSafeInteger(word.surah)
        || !Number.isSafeInteger(word.ayah)
        || word.surah < 1
        || word.surah > 114
        || word.ayah < 1
        || word.position < 1) continue;

      let eventId = this.eventIds.get(event);
      if (!eventId) {
        eventId = `tabyan-confirmed-${this.nextId++}`;
        this.eventIds.set(event, eventId);
      }
      projected.push({
        authority: "tabyan_state_engine",
        type,
        eventId,
        canonicalWord: {
          surah: word.surah,
          ayah: word.ayah,
          verseKey: word.verseKey,
          wordIndex: word.position,
        },
        mistake: {
          kind: event.kind,
          ...(event.heard === undefined ? {} : { heard: event.heard }),
        },
        occurredAt: event.at,
      });
    }
    return projected;
  }
}
