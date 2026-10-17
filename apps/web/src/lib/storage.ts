/**
 * localStorage that never throws: private windows, blocked site data and in-app browsers
 * (Facebook/Instagram WebViews are common here) can all reject access.
 */
export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the app keeps working, the value just isn't remembered.
  }
}
