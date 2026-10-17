/**
 * Design tokens for code that needs raw values (SVG art, tests, canvas).
 * The CSS source of truth is `app/globals.css`; `tokens.test.ts` keeps both in sync.
 */
export const COLORS = {
  ink: '#141414',
  paper: '#fafaf7',
  tenger: '#1e5eff',
  al: '#e8322a',
  alt: '#ffc629',
  nogoon: '#19b36b',
  tsenher: '#8fd3ff',
  night: '#17171a',
} as const;

export type ColorToken = keyof typeof COLORS;

/** Theme roles as declared in globals.css (`--line` in dark mode is paper at 90 % over night). */
export const THEMES = {
  light: {
    surface: COLORS.paper,
    raised: '#ffffff',
    fg: COLORS.ink,
    fgMuted: '#555552',
    line: COLORS.ink,
  },
  dark: {
    surface: COLORS.night,
    raised: '#222227',
    fg: COLORS.paper,
    fgMuted: '#b0b0ab',
    line: '#e3e3e1', // rgb(250 250 247 / 0.9) composited over --night
  },
} as const;

/**
 * Player accent sequence (§6.2): the five saturated tokens, then tints/shades of them and paper.
 * Every colour keeps ≥ 3:1 against ink so the ink-filled parts of the animals (sheep face,
 * yak fur, wolf, eagle) never melt into the background. Assigned by seat order.
 */
export const AVATAR_COLORS = [
  COLORS.tenger,
  COLORS.al,
  COLORS.alt,
  COLORS.nogoon,
  COLORS.tsenher,
  '#ff8e80', // al tint (coral)
  '#128a54', // nogoon shade (forest)
  '#cc9a14', // alt shade (mustard)
  '#3e9fe6', // tenger tint (sky)
  '#c2372e', // al shade (brick)
  '#86e0b5', // nogoon tint (mint)
  COLORS.paper,
] as const;

export function avatarColor(seat: number): string {
  const index = ((seat % AVATAR_COLORS.length) + AVATAR_COLORS.length) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index] ?? COLORS.tenger;
}
