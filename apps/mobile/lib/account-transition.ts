type TransitionListener = () => void;

let accountGeneration = 0;
const listeners = new Set<TransitionListener>();

export function getAccountGeneration(): number {
  return accountGeneration;
}

export function isCurrentAccountGeneration(generation: number): boolean {
  return generation === accountGeneration;
}

export function onAccountTransition(listener: TransitionListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Invalidate account-bound work before changing or clearing the stored session. */
export function beginAccountTransition(): number {
  accountGeneration += 1;
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      // A cleanup listener must not prevent sign-out or account replacement.
    }
  }
  return accountGeneration;
}
