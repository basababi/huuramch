'use client';

import { useSyncExternalStore } from 'react';
import { mn } from '@/i18n/mn';
import { writeStorage } from '@/lib/storage';
import { THEME_STORAGE_KEY, parseThemeChoice, resolveTheme, type ThemeChoice } from '@/lib/theme';
import { IconButton } from './icon-button';
import { circleHalf, moon, sun } from './icon-data';

const ORDER: ThemeChoice[] = ['auto', 'dark', 'light'];
const ICONS = { auto: circleHalf, dark: moon, light: sun } as const;

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ['data-theme-choice'] });
  return () => observer.disconnect();
}

function readChoice(): ThemeChoice {
  return parseThemeChoice(document.documentElement.getAttribute('data-theme-choice'));
}

export function applyThemeChoice(choice: ThemeChoice) {
  writeStorage(THEME_STORAGE_KEY, choice === 'auto' ? null : choice);
  let prefersDark = false;
  try {
    prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    // matchMedia missing in some embedded browsers: keep the default.
  }
  const theme = resolveTheme(choice, { pathname: location.pathname, now: new Date(), prefersDark });
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-theme-choice', choice);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#17171a' : '#fafaf7');
}

/** Cycles Авто → Харанхуй → Гэгээтэй. The choice is remembered per device. */
export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const choice = useSyncExternalStore(subscribe, readChoice, () => 'auto' as ThemeChoice);
  const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length] ?? 'auto';

  return (
    <div className="inline-flex items-center gap-3">
      {withLabel && (
        <span className="text-sm font-semibold text-fg-muted">
          {mn.theme.label}: <span className="text-fg">{mn.theme[choice]}</span>
        </span>
      )}
      <IconButton
        icon={ICONS[choice]}
        label={`${mn.theme.label}: ${mn.theme[choice]}`}
        onClick={() => applyThemeChoice(next)}
      />
    </div>
  );
}
