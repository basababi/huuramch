import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

/**
 * §7 performance budget: the JS a phone downloads before the first screen works — every script in
 * the server HTML (legacy `nomodule` polyfills excluded) — stays ≤ 180 KB gzipped. Screens, the
 * socket layer and motion load right after hydration as separate chunks and are not counted.
 */
const BUDGET_KB = 180;
const ROUTES = ['/', '/create', '/rules', '/room/0000', '/tv/0000', '/admin'];

for (const route of ROUTES) {
  test(`initial JS on ${route} ≤ ${BUDGET_KB} KB gzipped`, async ({ request }) => {
    const html = await (await request.get(route)).text();
    const sources = new Set(
      [...html.matchAll(/<script([^>]*)>/g)]
        .filter((match) => !/nomodule/i.test(match[1] ?? ''))
        .map((match) => /src="([^"]+)"/.exec(match[1] ?? '')?.[1])
        .filter((src): src is string => Boolean(src)),
    );
    let bytes = 0;
    for (const src of sources) {
      const body = await (await request.get(src)).body();
      bytes += gzipSync(body, { level: 9 }).length;
    }
    const kb = bytes / 1024;
    test.info().annotations.push({ type: 'initial-js', description: `${kb.toFixed(1)} KB gz` });
    expect(kb, `${route}: ${kb.toFixed(1)} KB gz`).toBeLessThanOrEqual(BUDGET_KB);
  });
}
