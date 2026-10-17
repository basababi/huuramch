import { expect, test } from '@playwright/test';
import { open } from './helpers';

test.describe('role card: press and hold (§5.4)', () => {
  test.beforeEach(async ({ page }) => {
    await open(page, '/dev/ui?freeze=1');
  });

  test('shows the word only while held, then unlocks "Ойлголоо"', async ({ page }) => {
    const section = page.locator('[data-section="role-card"]');
    const card = section.locator('button[data-role-card]');
    const confirm = section.getByRole('button', { name: 'Эхлээд картаа хар' });

    await expect(card).toHaveAttribute('aria-pressed', 'false');
    await expect(confirm).toBeDisabled();
    await expect(card.getByText('Бууз', { exact: true })).toBeHidden();

    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    if (!box) throw new Error('role card not laid out');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await expect(card.getByText('Бууз', { exact: true })).toBeVisible();

    await page.mouse.up();
    await expect(card).toHaveAttribute('aria-pressed', 'false');
    await expect(card.getByText('Бууз', { exact: true })).toBeHidden();
    await expect(section.getByRole('button', { name: 'Ойлголоо' })).toBeEnabled();
  });

  test('hides again when the pointer is cancelled (e.g. a scroll gesture)', async ({ page }) => {
    const card = page.locator('[data-section="role-card"] button[data-role-card]');
    await card.dispatchEvent('pointerdown', { button: 0, pointerId: 1, isPrimary: true });
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await card.dispatchEvent('pointercancel', { pointerId: 1 });
    await expect(card).toHaveAttribute('aria-pressed', 'false');
  });

  test('works from the keyboard: hold Space', async ({ page }) => {
    const card = page.locator('[data-section="role-card"] button[data-role-card]');
    await card.focus();
    await page.keyboard.down(' ');
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.up(' ');
    await expect(card).toHaveAttribute('aria-pressed', 'false');
  });

  test('Mode A imposter sees ЧИ ХУУРАМЧ with the category hint', async ({ page }) => {
    const section = page.locator('[data-section="role-card"]');
    await section.getByRole('button', { name: 'A · Хуурамч' }).click();
    const card = section.locator('button[data-role-card]');
    await card.focus();
    await page.keyboard.down('Enter');
    await expect(card.locator('p', { hasText: 'ХУУРАМЧ' })).toBeVisible();
    await expect(card.getByText('Монгол хоол')).toBeVisible();
    await page.keyboard.up('Enter');
  });
});
