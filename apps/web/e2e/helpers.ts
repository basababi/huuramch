import type { Page } from '@playwright/test';

export type Theme = 'dark' | 'light';

export function withTheme(path: string, theme: Theme): string {
  return `${path}${path.includes('?') ? '&' : '?'}theme=${theme}`;
}

/** Navigate and wait until the page is hydrated and its web fonts are ready. */
export async function open(page: Page, path: string, theme: Theme = 'dark') {
  await page.goto(withTheme(path, theme));
  await page.waitForSelector('html[data-hydrated]');
  await page.evaluate(() => document.fonts.ready);
}

/** Collects console errors and uncaught exceptions ("no console errors", §7). */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/**
 * Runs inside the page: inspects computed styles of every element against CLAUDE.md §6.7.
 * Returns human-readable violations (empty = clean).
 */
export function auditComputedStyles(): string[] {
  const out = new Set<string>();
  const label = (el: Element) => {
    const cls = (el.getAttribute('class') ?? '').trim().split(/\s+/).slice(0, 4).join('.');
    return `<${el.tagName.toLowerCase()}${cls ? ` .${cls}` : ''}>`;
  };

  const parseColor = (value: string) => {
    const match = value.match(/rgba?\(([^)]+)\)/);
    if (!match?.[1]) return null;
    const [r = 0, g = 0, b = 0, a = 1] = match[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    return { r, g, b, a };
  };

  const isPurple = (c: { r: number; g: number; b: number; a: number }) => {
    if (c.a < 0.1) return false;
    const [r, g, b] = [c.r / 255, c.g / 255, c.b / 255];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) return false;
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
    return s > 0.25 && h >= 245 && h <= 335 && l > 0.12 && l < 0.92;
  };

  const blurRadii = (value: string) => {
    if (!value || value === 'none') return [];
    return value.split(/,(?![^(]*\))/).map((shadow) => {
      const lengths = shadow
        .replace(/[a-z]+\([^)]*\)/gi, '')
        .trim()
        .split(/\s+/)
        .filter((token) => /px$/.test(token))
        .map(parseFloat);
      return lengths[2] ?? 0;
    });
  };

  const fonts = ['rubik', 'onest', 'golos text', 'unbounded', 'ui-monospace', 'monospace'];

  for (const el of Array.from(document.querySelectorAll('body *'))) {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    const name = label(el);

    if (s.backgroundImage.includes('gradient')) out.add(`§6.7.2 gradient background ${name}`);
    if (s.backgroundClip === 'text' || s.getPropertyValue('-webkit-background-clip') === 'text') {
      out.add(`§6.7.2 gradient/clip text ${name}`);
    }
    if (s.backdropFilter && s.backdropFilter !== 'none') out.add(`§6.7.3 backdrop-filter ${name}`);
    if (/blur|drop-shadow/.test(s.filter)) out.add(`§6.7.3 blur filter ${name}`);
    if (blurRadii(s.boxShadow).some((b) => b > 0)) out.add(`§6.7.3 soft box-shadow ${name}`);
    if (blurRadii(s.textShadow).some((b) => b > 0)) out.add(`§6.7.3 soft text-shadow ${name}`);

    const colours = [s.color, s.backgroundColor, s.fill, s.stroke];
    if (s.outlineStyle !== 'none') colours.push(s.outlineColor);
    for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
      const width = parseFloat(s.getPropertyValue(`border-${side.toLowerCase()}-width`));
      const style = s.getPropertyValue(`border-${side.toLowerCase()}-style`);
      if (width > 0 && style !== 'none') {
        colours.push(s.getPropertyValue(`border-${side.toLowerCase()}-color`));
        if (width < 2) out.add(`§6.7.5 hairline ${width}px border ${name}`);
      }
    }
    for (const value of colours) {
      const colour = parseColor(value);
      if (colour && isPurple(colour)) out.add(`§6.7.1 purple-ish colour ${value} on ${name}`);
    }

    const radius = parseFloat(s.borderTopLeftRadius);
    if (radius > 12.5 && radius < 999) {
      const rect = el.getBoundingClientRect();
      if (radius < Math.min(rect.width, rect.height) / 2 - 0.5) {
        out.add(`§6.4 radius ${radius}px (12px or pill only) ${name}`);
      }
    }

    const ownText = Array.from(el.childNodes).some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    );
    if (ownText) {
      const first = s.fontFamily.split(',')[0]?.replace(/["']/g, '').trim().toLowerCase() ?? '';
      if (!fonts.includes(first)) out.add(`§6.7.7 font "${first}" ${name}`);
    }
  }

  const text = document.body.innerText;
  if (/\p{Extended_Pictographic}/u.test(text)) out.add('§6.7.8 emoji in visible text');
  if (/lorem|ipsum|welcome to|get started/i.test(text)) out.add('§6.7.9 placeholder copy');
  if (document.documentElement.scrollWidth > window.innerWidth) {
    out.add(
      `§5 horizontal overflow: ${document.documentElement.scrollWidth}px > ${window.innerWidth}px`,
    );
  }
  return Array.from(out);
}
