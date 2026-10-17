import { expect, test, type Page } from '@playwright/test';
import { mn } from '../src/i18n/mn';
import { open } from './helpers';

/**
 * §7 "handle network loss gracefully": with the game server unreachable, a phone shows the inline
 * "Холболт тасарлаа…" banner and keeps retrying, and creating a room ends with a clear message
 * instead of a spinner that never stops.
 */
async function cutGameServer(page: Page) {
  await page.route(/:3001\//, (route) => route.abort());
  await page.routeWebSocket(/:3001\//, (ws) => ws.close());
}

test('a room page says it is reconnecting while the server is unreachable', async ({ page }) => {
  await cutGameServer(page);
  await open(page, '/room/1234');
  await expect(page.getByText(mn.connection.lost)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(mn.connection.connecting, { exact: true })).toBeVisible();
});

test('creating a room without a server ends with a message, not an endless spinner', async ({
  page,
}) => {
  test.setTimeout(40_000);
  await cutGameServer(page);
  await open(page, '/create');
  await page.getByRole('button', { name: mn.settings.start, exact: true }).click();
  await page.getByLabel(mn.profile.nickname, { exact: true }).fill('Бат');
  await page.getByRole('radio', { name: mn.animals.temee, exact: true }).click();
  await page.getByRole('button', { name: mn.create.title, exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: mn.connection.timeout })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('button', { name: mn.create.title, exact: true })).toBeEnabled();
});
