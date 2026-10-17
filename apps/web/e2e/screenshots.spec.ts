import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test, type Browser } from '@playwright/test';
import { open, type Theme } from './helpers';

/**
 * Milestone screenshots (§6.8): 360×740 dark + light, 1920×1080, saved to
 * screenshots/<milestone>/ at the repo root. Run with `pnpm screenshots` after `pnpm build`.
 */
const MILESTONE = process.env.MILESTONE ?? 'milestone-1';
const OUT = resolve(__dirname, '..', '..', '..', 'screenshots', MILESTONE);
mkdirSync(join(OUT, 'sections'), { recursive: true });

const PHONE = { width: 360, height: 740 };
const TV = { width: 1920, height: 1080 };

async function newPage(browser: Browser, size: 'phone' | 'tv', scale = size === 'phone' ? 2 : 1) {
  const context = await browser.newContext({
    viewport: size === 'phone' ? PHONE : TV,
    deviceScaleFactor: scale,
    isMobile: size === 'phone',
    hasTouch: size === 'phone',
    reducedMotion: 'reduce',
  });
  return context.newPage();
}

const PAGES = [
  { name: 'home', path: '/', fullPage: false },
  { name: 'create', path: '/create', fullPage: true },
  { name: 'rules', path: '/rules', fullPage: true },
  { name: 'dev-ui', path: '/dev/ui?freeze=1', fullPage: true },
  { name: 'dev-type', path: '/dev/type', fullPage: true },
];

for (const theme of ['dark', 'light'] as Theme[]) {
  for (const { name, path, fullPage } of PAGES) {
    test(`${name} · 360x740 · ${theme}`, async ({ browser }) => {
      // Long sandbox pages at DPR 1 keep the files reviewable; the home screen gets DPR 2.
      const page = await newPage(browser, 'phone', fullPage ? 1 : 2);
      await open(page, path, theme);
      await page.screenshot({ path: join(OUT, `${name}_360x740_${theme}.png`), fullPage });
    });

    test(`${name} · 1920x1080 · ${theme}`, async ({ browser }) => {
      const page = await newPage(browser, 'tv');
      await open(page, path, theme);
      await page.screenshot({ path: join(OUT, `${name}_1920x1080_${theme}.png`), fullPage });
    });
  }

  test(`sections · 360x740 · ${theme}`, async ({ browser }) => {
    const page = await newPage(browser, 'phone');
    await open(page, '/dev/ui?freeze=1', theme);
    for (const section of await page.locator('[data-section]').all()) {
      const id = await section.getAttribute('data-section');
      await section.screenshot({ path: join(OUT, 'sections', `${id}_${theme}.png`) });
    }
  });

  test(`role card held · 360x740 · ${theme}`, async ({ browser }) => {
    const page = await newPage(browser, 'phone');
    await open(page, '/dev/ui?freeze=1', theme);
    const section = page.locator('[data-section="role-card"]');
    const card = section.locator('button[data-role-card]');
    await card.scrollIntoViewIfNeeded();
    await card.focus();
    await page.keyboard.down(' ');
    await section.screenshot({ path: join(OUT, `role-card-held_360x740_${theme}.png`) });
    await page.keyboard.up(' ');
  });

  test(`home join open · 360x740 · ${theme}`, async ({ browser }) => {
    const page = await newPage(browser, 'phone');
    await open(page, '/', theme);
    await page.getByRole('button', { name: 'Нэгдэх' }).click();
    await page.getByLabel('Өрөөний код').fill('48');
    await page.screenshot({ path: join(OUT, `home-join_360x740_${theme}.png`) });
  });
}
