import { describe, expect, it } from 'vitest';
import { isTvPath, parseThemeChoice, resolveTheme } from './theme';

const at = (hour: number) => new Date(2026, 9, 17, hour, 30);

describe('resolveTheme (D-004)', () => {
  it('lets an explicit choice win everywhere', () => {
    expect(resolveTheme('light', { pathname: '/room/1234', now: at(23), prefersDark: true })).toBe(
      'light',
    );
    expect(resolveTheme('dark', { pathname: '/tv/1234', now: at(12), prefersDark: false })).toBe(
      'dark',
    );
  });

  it('defaults phones to dark, day or night', () => {
    expect(resolveTheme('auto', { pathname: '/', now: at(12), prefersDark: false })).toBe('dark');
    expect(resolveTheme('auto', { pathname: '/room/1234', now: at(2), prefersDark: false })).toBe(
      'dark',
    );
  });

  it('makes the TV light by day unless the system asks for dark', () => {
    expect(resolveTheme('auto', { pathname: '/tv/1234', now: at(12), prefersDark: false })).toBe(
      'light',
    );
    expect(resolveTheme('auto', { pathname: '/tv/1234', now: at(12), prefersDark: true })).toBe(
      'dark',
    );
    expect(resolveTheme('auto', { pathname: '/tv/1234', now: at(21), prefersDark: false })).toBe(
      'dark',
    );
    expect(resolveTheme('auto', { pathname: '/tv/1234', now: at(6), prefersDark: false })).toBe(
      'dark',
    );
  });

  it('recognises TV paths only', () => {
    expect(isTvPath('/tv')).toBe(true);
    expect(isTvPath('/tv/0420')).toBe(true);
    expect(isTvPath('/tvx')).toBe(false);
  });

  it('treats anything unknown as auto', () => {
    expect(parseThemeChoice(null)).toBe('auto');
    expect(parseThemeChoice('purple')).toBe('auto');
    expect(parseThemeChoice('light')).toBe('light');
  });
});
