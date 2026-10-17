import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';
import { mn } from '../src/i18n/mn';
import { auditComputedStyles, open } from './helpers';

/**
 * Whole games in one room (§10 M6, §11): four phones and a TV, Mode A then Mode B with the same
 * players and cumulative scores, and one phone that sleeps mid-round and comes back. Roles are
 * random, so the test reads each card the way a player does — press and hold — and plays on that.
 *
 * `SHOTS=milestone-4 playwright test --project=game` also saves every phase as milestone
 * screenshots: phones at 360×740 (dark + light), the TV at 1920×1080.
 */

const SHOTS = process.env.SHOTS;
const OUT = SHOTS ? resolve(__dirname, '..', '..', '..', 'screenshots', SHOTS, 'game') : null;
if (OUT) mkdirSync(OUT, { recursive: true });

type Device = {
  name: string;
  animal: string;
  context: BrowserContext;
  page: Page;
  errors: string[];
};

const PLAYERS = [
  { name: 'Бат', animal: mn.animals.temee },
  { name: 'Сараа', animal: mn.animals.mori },
  { name: 'Дорж', animal: mn.animals.ukher },
  { name: 'Туяа', animal: mn.animals.irves },
] as const;

/** Console errors and uncaught exceptions ("no console errors", §7), kept across page reloads. */
function watchErrors(page: Page, errors: string[]) {
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
}

async function newDevice(
  browser: Browser,
  kind: 'phone' | 'tv',
  name = 'ТВ',
  animal = '',
): Promise<Device> {
  const context = await browser.newContext(
    kind === 'phone'
      ? {
          viewport: { width: 360, height: 740 },
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
          reducedMotion: 'reduce',
        }
      : { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: 'reduce' },
  );
  const page = await context.newPage();
  const errors: string[] = [];
  watchErrors(page, errors);
  return { name, animal, context, page, errors };
}

/**
 * Every phase is checked against the §6.7 bans in both themes (computed styles, fonts, overflow);
 * with SHOTS set it is also saved as a milestone screenshot.
 */
async function shot(device: Device, label: string, size: 'phone' | 'tv' = 'phone') {
  const dims = size === 'phone' ? '360x740' : '1920x1080';
  await device.page.waitForTimeout(OUT ? 450 : 150);
  for (const theme of ['dark', 'light'] as const) {
    await device.page.evaluate(
      (t) => document.documentElement.setAttribute('data-theme', t),
      theme,
    );
    expect(await device.page.evaluate(auditComputedStyles), `${label} (${theme})`).toEqual([]);
    if (OUT) await device.page.screenshot({ path: join(OUT, `${label}_${dims}_${theme}.png`) });
  }
  await device.page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
}

async function fillProfile(page: Page, name: string, animal: string, submit: string) {
  await page.getByLabel(mn.profile.nickname, { exact: true }).fill(name);
  await page.getByRole('radio', { name: animal, exact: true }).click();
  await page.getByRole('button', { name: submit, exact: true }).click();
}

/** Hold the card, read what it says, let go — exactly what a player does (§5.4). */
async function readCard(page: Page): Promise<string> {
  const card = page.locator('button[data-role-card]');
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  if (!box) throw new Error('role card not laid out');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  const text = (await page.locator('[data-role-card] + p').textContent())?.trim() ?? '';
  await page.mouse.up();
  await expect(card).toHaveAttribute('aria-pressed', 'false');
  return text;
}

/** Hold "Үгээ дахин харах" and read it. */
async function readPeek(page: Page): Promise<string> {
  const peek = page.locator('button[data-peek]');
  await expect(peek).toHaveText(mn.roleCard.peek);
  const box = await peek.boundingBox();
  if (!box) throw new Error('peek button not laid out');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(peek).toHaveAttribute('aria-pressed', 'true');
  const text = (await peek.textContent())?.trim() ?? '';
  await page.mouse.up();
  await expect(peek).toHaveText(mn.roleCard.peek);
  return text;
}

/** Polls until one of the locators is visible; returns its index. */
async function firstVisible(locators: Locator[], timeout = 15_000): Promise<number> {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    for (const [i, locator] of locators.entries()) {
      if (await locator.isVisible().catch(() => false)) return i;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('nothing became visible');
}

const doneButton = (d: Device) => d.page.getByRole('button', { name: mn.turn.done, exact: true });

/** Clue turns: whoever has "Дууслаа" speaks and taps it, until the discussion starts. */
async function playTurns(
  phones: Device[],
  turns: number,
  onFirstTurn?: (speaker: Device) => Promise<void>,
) {
  for (let turn = 0; turn < turns; turn++) {
    const speaker = phones[await firstVisible(phones.map(doneButton))] as Device;
    if (turn === 0 && onFirstTurn) await onFirstTurn(speaker);
    await doneButton(speaker).click();
    await expect(doneButton(speaker)).toBeHidden();
  }
  for (const phone of phones) {
    await expect(phone.page.getByRole('heading', { name: mn.discussion.prompt })).toBeVisible();
  }
}

async function castVote(voter: Device, target: string, last: boolean) {
  await voter.page.getByRole('button', { name: target }).click();
  await voter.page.getByRole('button', { name: mn.voting.cast }).click();
  if (!last) await expect(voter.page.getByText(mn.voting.locked)).toBeVisible();
}

function scoreRow(page: Page, name: string): Locator {
  return page.getByRole('listitem').filter({ hasText: name }).filter({ hasText: mn.result.points });
}

test('four phones and a TV play Mode A, then Mode B, with a reconnect', async ({ browser }) => {
  test.setTimeout(240_000);
  const phones = await Promise.all(
    PLAYERS.map((p) => newDevice(browser, 'phone', p.name, p.animal)),
  );
  const [host, ...guests] = phones as [Device, Device, Device, Device];

  // ── Room ─────────────────────────────────────────────────────────────────────────────────
  await open(host.page, '/create');
  await shot(host, '01-create');
  await host.page.getByRole('button', { name: mn.settings.start, exact: true }).click();
  await fillProfile(host.page, host.name, host.animal, mn.create.title);
  await host.page.waitForURL(/\/room\/\d{4}$/);
  const code = /\/room\/(\d{4})$/.exec(host.page.url())?.[1] ?? '';
  expect(code).toMatch(/^\d{4}$/);
  await expect(host.page.getByRole('button', { name: mn.lobby.start })).toBeDisabled();

  const tv = await newDevice(browser, 'tv');
  await open(tv.page, `/tv/${code}`);
  await expect(tv.page.getByText(mn.tv.scan)).toBeVisible();

  for (const [i, guest] of guests.entries()) {
    await open(guest.page, `/room/${code}`);
    if (i === 0) await shot(guest, '02-join');
    await fillProfile(guest.page, guest.name, guest.animal, mn.join.submit);
    // A player's first game opens the three-card rules sheet (§5.11); skip it.
    await guest.page.getByRole('button', { name: mn.rules.skip }).click();
    await expect(guest.page.getByText(mn.lobby.waitingForHost)).toBeVisible();
  }
  await expect(host.page.getByRole('heading', { name: mn.lobby.players(4) })).toBeVisible();
  await expect(tv.page.getByRole('heading', { name: mn.lobby.players(4) })).toBeVisible();
  await shot(host, '03-lobby-host');
  await shot(guests[0], '04-lobby-player');
  await shot(tv, 'tv-01-lobby', 'tv');

  // ── Mode A ───────────────────────────────────────────────────────────────────────────────
  await host.page.getByRole('button', { name: mn.lobby.start }).click();
  await shot(host, '05-role-card');

  const cards = new Map<string, string>();
  for (const phone of phones) {
    await expect(phone.page.getByRole('button', { name: mn.roleCard.lookFirst })).toBeDisabled();
    cards.set(phone.name, await readCard(phone.page));
    await phone.page.getByRole('button', { name: mn.roleCard.gotIt }).click();
    if (phone === host) {
      await expect(tv.page.getByText(mn.tv.confirmed(1, 4))).toBeVisible();
      await shot(host, '06-role-waiting');
      await shot(tv, 'tv-02-roles', 'tv');
    }
  }
  const imposterA = phones.find((p) => cards.get(p.name) === mn.roleCard.imposter);
  const civiliansA = phones.filter((p) => p !== imposterA);
  expect(imposterA, 'exactly one imposter with 4 players (§2.1)').toBeTruthy();
  const wordA = (cards.get(civiliansA[0]?.name ?? '') ?? '').replace(
    `${mn.roleCard.secretWord}: `,
    '',
  );
  for (const c of civiliansA) expect(cards.get(c.name)).toBe(`${mn.roleCard.secretWord}: ${wordA}`);
  const imposter = imposterA as Device;

  // The shared screen never shows a secret (§5.12).
  await expect(tv.page.locator('main')).not.toContainText(wordA);

  await playTurns(phones, 8, async (speaker) => {
    await shot(speaker, '07-your-turn');
    const listener = phones.find((p) => p !== speaker) as Device;
    await shot(listener, '08-turns');
    await shot(tv, 'tv-03-turns', 'tv');
    await expect(tv.page.locator('main')).not.toContainText(wordA);

    // One phone sleeps and comes back (§2.5, §11): same seat, same secret.
    const sleeper = phones.find((p) => p !== speaker && p !== host) as Device;
    const before = cards.get(sleeper.name) ?? '';
    await sleeper.page.close();
    sleeper.page = await sleeper.context.newPage();
    watchErrors(sleeper.page, sleeper.errors);
    await open(sleeper.page, `/room/${code}`);
    const peeked = await readPeek(sleeper.page);
    if (sleeper === imposter) expect(peeked).toContain(mn.roleCard.imposter);
    else expect(peeked).toContain(before.replace(`${mn.roleCard.secretWord}: `, ''));
  });
  await shot(host, '09-discussion');
  await shot(tv, 'tv-04-discussion', 'tv');
  await host.page.getByRole('button', { name: mn.discussion.toVoting }).click();

  // Civilians all vote for the imposter; the imposter votes for a civilian.
  const voters = [...civiliansA, imposter];
  for (const [i, voter] of voters.entries()) {
    const target = voter === imposter ? (civiliansA[0] as Device).name : imposter.name;
    if (i === 0) {
      await voter.page.getByRole('button', { name: target }).click();
      await shot(voter, '10-voting');
      await voter.page.getByRole('button', { name: mn.voting.cast }).click();
      await expect(voter.page.getByText(mn.voting.locked)).toBeVisible();
      await shot(voter, '11-voting-locked');
      await shot(tv, 'tv-05-voting', 'tv');
    } else {
      await castVote(voter, target, i === voters.length - 1);
    }
  }

  await expect(host.page.getByRole('img', { name: mn.reveal.imposter })).toBeVisible({
    timeout: 10_000,
  });
  await expect(tv.page.getByRole('img', { name: mn.reveal.imposter })).toBeVisible({
    timeout: 10_000,
  });
  await shot(host, '12-reveal');
  await shot(tv, 'tv-06-reveal', 'tv');

  // Caught: one last chance from eight words (§2.2.6). This imposter guesses wrong.
  await expect(imposter.page.getByRole('heading', { name: mn.guess.title })).toBeVisible({
    timeout: 10_000,
  });
  const options = imposter.page.locator('main ul button[aria-pressed]');
  await expect(options).toHaveCount(8);
  const words = await options.allTextContents();
  expect(words).toContain(wordA);
  const wrong = words.find((w) => w !== wordA) as string;
  await imposter.page.getByRole('button', { name: wrong, exact: true }).click();
  await shot(imposter, '13-guess');
  await shot(civiliansA[0] as Device, '14-guess-waiting');
  await imposter.page.getByRole('button', { name: mn.guess.submit }).click();
  await expect(imposter.page.getByText(mn.guess.wrong)).toBeVisible();
  await expect(
    (civiliansA[0] as Device).page.getByText(mn.guess.guesserWrong(imposter.name)),
  ).toBeVisible();

  for (const phone of phones) {
    await expect(phone.page.getByText(mn.result.civiliansWin)).toBeVisible({ timeout: 10_000 });
  }
  await expect(host.page.getByText(mn.result.reasons['missed-word'])).toBeVisible();
  await expect(tv.page.locator('main')).toContainText(wordA);
  await shot(host, '15-result-a');
  await shot(tv, 'tv-07-result-a', 'tv');

  await host.page.getByRole('button', { name: mn.result.showScores }).click();
  await expect(host.page.getByRole('heading', { name: mn.result.scoreboard })).toBeVisible();
  // §2.4: correct vote +1 and civilian team win +1 for each civilian; the caught imposter 0.
  for (const c of civiliansA)
    await expect(scoreRow(host.page, c.name)).toContainText(`2 ${mn.result.points}`);
  await expect(scoreRow(host.page, imposter.name)).toContainText(`0 ${mn.result.points}`);
  await shot(host, '16-scoreboard');
  await shot(tv, 'tv-08-scoreboard', 'tv');

  // ── Replay in Mode B ─────────────────────────────────────────────────────────────────────
  await host.page.getByRole('button', { name: mn.result.replay }).click();
  await expect(host.page.getByRole('button', { name: mn.lobby.start })).toBeEnabled();
  await host.page.getByRole('button', { name: mn.settings.title, exact: true }).click();
  await host.page.getByRole('radio', { name: mn.modes.B.title }).click();
  await host.page.getByRole('button', { name: mn.settings.save }).click();
  await expect(host.page.locator('dialog[open]')).toHaveCount(0);
  await host.page.getByRole('button', { name: mn.lobby.start }).click();

  const wordsB = new Map<string, string>();
  for (const phone of phones) {
    const text = await readCard(phone.page);
    // Mode B: nobody is told their role — every card says "Чиний үг" (§2.3.2).
    expect(text.startsWith(`${mn.roleCard.yourWord}: `)).toBe(true);
    wordsB.set(phone.name, text.replace(`${mn.roleCard.yourWord}: `, ''));
    await phone.page.getByRole('button', { name: mn.roleCard.gotIt }).click();
  }
  const counts = new Map<string, number>();
  for (const w of wordsB.values()) counts.set(w, (counts.get(w) ?? 0) + 1);
  const civilianWord = [...counts].find(([, n]) => n === 3)?.[0] as string;
  const imposterWord = [...counts].find(([, n]) => n === 1)?.[0] as string;
  expect(civilianWord && imposterWord).toBeTruthy();
  const imposterB = phones.find((p) => wordsB.get(p.name) === imposterWord) as Device;
  const civiliansB = phones.filter((p) => p !== imposterB);
  await expect(tv.page.locator('main')).not.toContainText(civilianWord);
  await expect(tv.page.locator('main')).not.toContainText(imposterWord);

  await playTurns(phones, 4);
  await host.page.getByRole('button', { name: mn.discussion.toVoting }).click();
  const votersB = [...civiliansB, imposterB];
  for (const [i, voter] of votersB.entries()) {
    await castVote(
      voter,
      voter === imposterB ? (civiliansB[0] as Device).name : imposterB.name,
      i === votersB.length - 1,
    );
  }
  await expect(host.page.getByRole('img', { name: mn.reveal.imposter })).toBeVisible({
    timeout: 10_000,
  });

  // This imposter knows the civilians' word: +2 (§2.4), and the civilians still win.
  await expect(imposterB.page.getByRole('heading', { name: mn.guess.title })).toBeVisible({
    timeout: 10_000,
  });
  await imposterB.page.getByRole('button', { name: civilianWord, exact: true }).click();
  await imposterB.page.getByRole('button', { name: mn.guess.submit }).click();
  await expect(imposterB.page.getByText(mn.guess.correct)).toBeVisible();
  // Mode B keeps the words hidden until the game ends.
  await expect(host.page.locator('main')).not.toContainText(imposterWord);

  for (const phone of phones) {
    await expect(phone.page.getByText(mn.result.civiliansWin)).toBeVisible({ timeout: 10_000 });
  }
  await expect(host.page.getByText(mn.result.civilianWord)).toBeVisible();
  await expect(host.page.getByText(mn.result.imposterWord)).toBeVisible();
  await expect(host.page.locator('main')).toContainText(civilianWord);
  await expect(host.page.locator('main')).toContainText(imposterWord);
  await shot(host, '17-result-b');
  await shot(tv, 'tv-09-result-b', 'tv');

  await host.page.getByRole('button', { name: mn.result.showScores }).click();
  await expect(host.page.getByRole('heading', { name: mn.result.scoreboard })).toBeVisible();
  // Scores add up across games in the same room (§2.4).
  // Game B: every civilian +1 vote +1 win, the caught imposter +2 for the right guess.
  const expected = (p: Device) => (civiliansA.includes(p) ? 2 : 0) + 2;
  for (const p of phones)
    await expect(scoreRow(host.page, p.name)).toContainText(`${expected(p)} ${mn.result.points}`);
  await expect(host.page.getByText(mn.result.gamesPlayed(2))).toBeVisible();
  await shot(host, '18-scoreboard-b');

  for (const device of [...phones, tv])
    expect(device.errors, `${device.name}: console errors`).toEqual([]);
});
