'use client';

import { useEffect } from 'react';

/**
 * Tiny root-level client hook-up:
 * - an empty touchstart listener lets iOS Safari apply `:active`, which drives the pressed state;
 * - `html[data-hydrated]` tells E2E tests and screenshots that the page is interactive.
 */
export function ClientBoot() {
  useEffect(() => {
    const noop = () => {};
    document.addEventListener('touchstart', noop, { passive: true });
    document.documentElement.setAttribute('data-hydrated', 'true');
    return () => document.removeEventListener('touchstart', noop);
  }, []);
  return null;
}
