export function recitationAudioSessionId(objectPath: string): string | null {
  return /^\/objects\/uploads\/recitation-audio\/([\w-]+)$/.exec(objectPath)?.[1] ?? null;
}

/**
 * A recording is kept while it is the submission of an assignment that is not
 * cancelled, or while its session is recent enough to still be submitted.
 * Replaced attempts, unsubmitted ones, cancelled assignments and deleted
 * sessions lose their audio.
 */
export function recitationAudioToDelete(
  sessionIds: string[],
  submitted: ReadonlySet<string>,
  recent: ReadonlySet<string>,
): string[] {
  return sessionIds.filter((id) => !submitted.has(id) && !recent.has(id));
}
