/** Vibration patterns for the three moments CLAUDE.md §5 asks for. */
export const HAPTICS = {
  yourTurn: [40, 60, 40],
  voteLocked: [30],
  reveal: [20, 50, 90],
} as const satisfies Record<string, readonly number[]>;

/** Android only. iOS Safari has no Vibration API, so this quietly does nothing there. */
export function vibrate(pattern: readonly number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate([...pattern]);
  } catch {
    // Blocked without a user gesture or by a WebView: haptics are a bonus, never required.
  }
}
