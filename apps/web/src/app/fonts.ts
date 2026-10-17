import { Onest, Rubik } from 'next/font/google';

/*
 * §6.3 asks for Unbounded (display) and Onest (UI). The mandatory glyph check failed for
 * Unbounded: it has no Ө ө Ү ү at any weight (verified with fontTools and on /dev/type), so
 * Mongolian words fell back mid-word. Display therefore uses Rubik, the spec's own fallback,
 * at 800–900 (DECISIONS.md D-006). Onest passes and stays the UI face.
 *
 * Both are variable fonts: one file per subset covers every weight. `cyrillic-ext` carries
 * Ө ө Ү ү (U+04E8/04E9, U+04AE/04AF).
 */
export const fontDisplay = Rubik({
  subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
  variable: '--font-rubik',
  display: 'swap',
});

export const fontBody = Onest({
  subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
  variable: '--font-onest',
  display: 'swap',
});
