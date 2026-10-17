'use client';

import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

const loadFeatures = () => import('./motion-features').then((mod) => mod.default);

/**
 * Wrap only the routes that animate (game screens, sandbox) — Home ships without motion.
 * - LazyMotion + `m.*`: the ~5 KB core renders immediately, animation features load async.
 * - reducedMotion="user": transform animations become instant cuts for people who ask for less.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
