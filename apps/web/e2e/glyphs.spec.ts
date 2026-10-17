import { expect, test } from '@playwright/test';
import { open } from './helpers';

test('§6.3 Ө ө Ү ү render in every weight we use', async ({ page }) => {
  await open(page, '/dev/type');
  const summary = page.locator('[data-glyph-summary]');
  await expect(summary).not.toHaveAttribute('data-glyph-summary', 'pending', { timeout: 15_000 });
  await expect(summary).toHaveAttribute('data-glyph-summary', 'pass');

  const counted = page.locator('[data-glyph-row][data-glyph-counted="true"]');
  expect(await counted.count()).toBeGreaterThanOrEqual(7);
  for (const row of await counted.all()) {
    await expect(row).toHaveAttribute('data-glyph-result', 'pass');
  }
});

test('the rejected display face is shown failing, as evidence', async ({ page }) => {
  await open(page, '/dev/type');
  const unbounded = page.locator('[data-glyph-row^="Unbounded-"]');
  await expect(unbounded.first()).toHaveAttribute('data-glyph-result', 'fail', { timeout: 15_000 });
});
