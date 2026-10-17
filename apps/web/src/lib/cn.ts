/** Joins truthy class names. Components avoid conflicting utilities, so no merge step is needed. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
