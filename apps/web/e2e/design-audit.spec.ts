import { expect, test } from '@playwright/test';
import { mn } from '../src/i18n/mn';
import { auditComputedStyles, open, trackConsoleErrors, type Theme } from './helpers';

const PAGES = ['/', '/create', '/rules', '/admin', '/dev/ui?freeze=1', '/dev/type'];
const THEMES: Theme[] = ['dark', 'light'];

for (const theme of THEMES) {
  for (const path of PAGES) {
    test(`§6.7 computed-style audit: ${path} (${theme})`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      await open(page, path, theme);
      expect(await page.evaluate(auditComputedStyles)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}

for (const theme of THEMES) {
  test(`§6.7 computed-style audit: missing room and 404 (${theme})`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await open(page, '/room/0000', theme);
    await expect(page.getByRole('heading', { name: mn.room.notFoundTitle })).toBeVisible();
    expect(await page.evaluate(auditComputedStyles)).toEqual([]);
    expect(errors).toEqual([]);

    // The browser itself logs the 404 status of the document, so only the styles are checked.
    await open(page, '/no-such-page', theme);
    await expect(page.getByRole('heading', { name: mn.notFound.title })).toBeVisible();
    expect(await page.evaluate(auditComputedStyles)).toEqual([]);
  });
}

test('applies the requested theme before paint and keeps it', async ({ page }) => {
  await open(page, '/', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await open(page, '/', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('phones default to the dark theme', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme-choice', 'auto');
});

test('the theme toggle cycles and is remembered', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('html[data-hydrated]');
  const toggle = page.getByRole('button', { name: /Өнгөний горим/ });
  await toggle.click(); // auto → dark
  await toggle.click(); // dark → light
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('§6.7.10 every focusable element shows a thick focus indicator', async ({ page }) => {
  await open(page, '/dev/ui?freeze=1', 'light');
  const seen: string[] = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const result = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      if (el.hasAttribute('data-focus-proxy')) return { ok: true, label: 'proxy' };
      const s = getComputedStyle(el);
      const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 3;
      const highlighter = s.backgroundColor === 'rgb(255, 198, 41)';
      return {
        ok: outline || highlighter,
        label: `${el.tagName} ${el.textContent?.trim().slice(0, 30)}`,
      };
    });
    if (!result) continue;
    seen.push(result.label);
    expect(result.ok, `focus indicator missing on ${result.label}`).toBe(true);
  }
  expect(seen.length).toBeGreaterThan(10);
});
