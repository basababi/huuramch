import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { contrastRatio, hueSaturation, mix } from '@/lib/contrast';
import { AVATAR_COLORS, COLORS, THEMES, avatarColor } from './tokens';

const css = readFileSync(fileURLToPath(new URL('../app/globals.css', import.meta.url)), 'utf8');

/** WCAG 2.x AA: 4.5 for body text, 3 for large text (≥ 24px, or ≥ 18.66px bold) and UI graphics. */
const AA_TEXT = 4.5;
const AA_LARGE = 3;

describe('tokens', () => {
  it('match the CSS @theme values exactly', () => {
    for (const [name, hex] of Object.entries(COLORS)) {
      const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, 'i'));
      expect(match?.[1]?.toLowerCase(), name).toBe(hex);
    }
  });

  it('keep the theme roles in sync with globals.css', () => {
    expect(css).toMatch(/--raised: #ffffff;/);
    expect(css).toMatch(new RegExp(`--fg-muted: ${THEMES.light.fgMuted};`));
    expect(css).toMatch(new RegExp(`--raised: ${THEMES.dark.raised};`));
    expect(css).toMatch(new RegExp(`--fg-muted: ${THEMES.dark.fgMuted};`));
    expect(mix(COLORS.paper, COLORS.night, 0.9)).toBe(THEMES.dark.line);
  });

  it('never include purple, violet or indigo (§6.7.1)', () => {
    for (const hex of [...Object.values(COLORS), ...AVATAR_COLORS]) {
      const { hue, saturation } = hueSaturation(hex);
      expect(saturation > 0.2 && hue >= 245 && hue <= 335, hex).toBe(false);
    }
  });
});

describe('WCAG AA contrast (§6.2)', () => {
  it.each([
    ['paper on tenger (buttons, card back)', COLORS.paper, COLORS.tenger, AA_TEXT],
    ['ink on alt', COLORS.ink, COLORS.alt, AA_TEXT],
    ['ink on nogoon', COLORS.ink, COLORS.nogoon, AA_TEXT],
    ['ink on tsenher', COLORS.ink, COLORS.tsenher, AA_TEXT],
    ['paper on ink', COLORS.paper, COLORS.ink, AA_TEXT],
    // Red only ever carries large text: ≥ 19px bold buttons, display-size stamps and labels.
    ['paper on al (large)', COLORS.paper, COLORS.al, AA_LARGE],
  ])('%s', (_label, fg, bg, min) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  for (const [theme, roles] of Object.entries(THEMES)) {
    describe(`${theme} theme`, () => {
      it.each([
        ['fg on surface', roles.fg, roles.surface, AA_TEXT],
        ['fg on raised', roles.fg, roles.raised, AA_TEXT],
        ['muted on surface', roles.fgMuted, roles.surface, AA_TEXT],
        ['muted on raised', roles.fgMuted, roles.raised, AA_TEXT],
        ['al display text on surface', COLORS.al, roles.surface, AA_LARGE],
        ['al display text on raised', COLORS.al, roles.raised, AA_LARGE],
        ['tenger stamp on surface', COLORS.tenger, roles.surface, AA_LARGE],
        ['outlines on surface', roles.line, roles.surface, AA_LARGE],
      ])('%s', (_label, fg, bg, min) => {
        expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
      });
    });
  }

  it('focus ring (alt) stands out against the dark surface and next to ink outlines', () => {
    expect(contrastRatio(COLORS.alt, COLORS.night)).toBeGreaterThanOrEqual(AA_LARGE);
    expect(contrastRatio(COLORS.alt, COLORS.ink)).toBeGreaterThanOrEqual(AA_LARGE);
  });
});

describe('avatar seat colours', () => {
  it('has 12 distinct colours', () => {
    expect(new Set(AVATAR_COLORS).size).toBe(12);
  });

  it('keeps ink-filled animal parts visible on every seat colour (≥ 3:1)', () => {
    for (const hex of AVATAR_COLORS) {
      expect(contrastRatio(COLORS.ink, hex), hex).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it('cycles by seat and tolerates any integer', () => {
    expect(avatarColor(0)).toBe(COLORS.tenger);
    expect(avatarColor(12)).toBe(COLORS.tenger);
    expect(avatarColor(-1)).toBe(AVATAR_COLORS[11]);
  });
});
