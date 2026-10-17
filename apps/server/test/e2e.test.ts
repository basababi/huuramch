/**
 * End-to-end over real sockets: boots the compiled server (dist/main.js) and plays whole games
 * with four Socket.IO clients, the way four phones would. Run `nest build` first (the package's
 * `test` script does).
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { join } from 'node:path';
import type { PlayerView, TvView } from '@khuuramch/game-core';
import type { Ack, StateSync } from '@khuuramch/protocol';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let server: ChildProcess;
let url = '';

async function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const probe = createServer().listen(0, () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => resolve(port));
    });
  });
}

beforeAll(async () => {
  const port = await freePort();
  url = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [join(__dirname, '..', 'dist', 'main.js')], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      DATABASE_URL: '',
      ADMIN_SECRET: 'e2e',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start')), 20_000);
    const onData = (chunk: Buffer) => {
      if (chunk.toString().includes('listening')) {
        clearTimeout(timer);
        resolve();
      }
    };
    server.stdout?.on('data', onData);
    server.stderr?.on('data', onData);
  });
});

afterAll(() => {
  server?.kill();
});

type Phone = { socket: Socket; view: PlayerView | null; views: Array<PlayerView | TvView> };

function connect(): Promise<Phone> {
  return new Promise((resolve) => {
    const socket = io(url, { transports: ['websocket'], forceNew: true, reconnection: false });
    const phone: Phone = { socket, view: null, views: [] };
    socket.on('state:sync', (sync: StateSync) => {
      phone.views.push(sync.view);
      if (sync.view.me) phone.view = sync.view as PlayerView;
    });
    socket.on('connect', () => resolve(phone));
  });
}

function emit<T = Record<string, unknown>>(
  phone: Phone,
  event: string,
  payload: unknown = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    phone.socket.emit(event, payload, (ack: Ack<T>) =>
      ack.ok ? resolve(ack.data) : reject(new Error(`${event}: ${ack.error.code}`)),
    );
  });
}

async function until(check: () => boolean, timeout = 15_000): Promise<void> {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > timeout) throw new Error('timed out waiting for state');
    await new Promise((r) => setTimeout(r, 25));
  }
}

const view = (phone: Phone) => phone.view as PlayerView;

async function table(
  mode: 'A' | 'B',
): Promise<{ phones: Phone[]; code: string; tokens: string[] }> {
  const phones = await Promise.all([connect(), connect(), connect(), connect()]);
  const host = phones[0] as Phone;
  const created = await emit<{ code: string; sessionToken: string }>(host, 'room:create', {
    nickname: 'Хөтлөгч',
    avatar: 'temee',
    settings: { mode, categories: ['food', 'animals'], timerPreset: 'fast' },
  });
  const tokens = [created.sessionToken];
  const animals = ['mori', 'khoni', 'irves'];
  for (let i = 1; i < 4; i++) {
    const joined = await emit<{ sessionToken: string }>(phones[i] as Phone, 'room:join', {
      code: created.code,
      nickname: `Тоглогч ${i}`,
      avatar: animals[i - 1],
    });
    tokens.push(joined.sessionToken);
  }
  await until(() => phones.every((p) => p.view?.players.length === 4));
  return { phones, code: created.code, tokens };
}

async function playTurnsAndDiscussion(phones: Phone[]) {
  const host = phones[0] as Phone;
  await until(() => view(host).phase === 'CLUE_TURNS');
  while (view(host).phase === 'CLUE_TURNS') {
    const speakerId = view(host).round?.currentSpeakerId;
    const speaker = phones.find((p) => view(p).me.id === speakerId) ?? host;
    const turn = view(host).round?.turnIndex;
    await emit(speaker, 'turn:done');
    await until(() => view(host).phase !== 'CLUE_TURNS' || view(host).round?.turnIndex !== turn);
  }
  await emit(host, 'discussion:skip');
  await until(() => phones.every((p) => view(p).phase === 'VOTING'));
}

describe('a real room with four phones', () => {
  it('plays Mode A end to end, with one phone reconnecting mid-game', async () => {
    const { phones, code, tokens } = await table('A');
    const [host] = phones as [Phone];
    const tv = await connect();
    await emit(tv, 'tv:watch', { code });

    await emit(host, 'game:start');
    await until(() => phones.every((p) => view(p).phase === 'ROLE_REVEAL'));
    const imposterId = (phones.find((p) => view(p).me.secret?.kind === 'imposter') as Phone).view
      ?.me.id;
    // Phones are looked up by player id: the reconnecting phone gets a new socket object.
    const imposter = () => phones.find((p) => view(p).me.id === imposterId) as Phone;
    const civilians = () => phones.filter((p) => view(p).me.id !== imposterId);
    const word = (view(civilians()[0] as Phone).me.secret as { word: string }).word;
    expect(civilians().every((p) => view(p).me.secret?.kind === 'word')).toBe(true);

    // Phone 2 drops and comes back on a brand-new socket with its session token (§2.5).
    const reconnecting = phones[2] as Phone;
    const before = view(reconnecting).me;
    reconnecting.socket.disconnect();
    await until(() => view(host).players.find((p) => p.id === before.id)?.connected === false);
    const fresh = await connect();
    await emit(fresh, 'room:rejoin', { code, sessionToken: tokens[2] });
    await until(() => fresh.view !== null);
    expect(view(fresh).me).toEqual(before);
    phones[2] = fresh;

    for (const p of phones) await emit(p, 'role:confirm');
    await playTurnsAndDiscussion(phones);

    for (const p of phones) {
      const me = view(p).me.id;
      const target =
        me === imposterId ? view(host).players.find((x) => x.id !== me)?.id : imposterId;
      await emit(p, 'vote:cast', { targetId: target });
    }
    await until(() => view(host).phase === 'VOTE_REVEAL');
    expect(view(host).round?.reveal).toMatchObject({
      eliminatedId: imposterId,
      eliminatedRole: 'imposter',
    });

    // The server's own timer ends the reveal; only the imposter gets the eight options.
    await until(() => view(imposter()).phase === 'IMPOSTER_GUESS');
    const options = view(imposter()).me.guessOptions as string[];
    expect(options).toHaveLength(8);
    expect(options).toContain(word);
    expect(civilians().every((p) => view(p).me.guessOptions === null)).toBe(true);
    await emit(imposter(), 'guess:submit', { optionIndex: options.indexOf(word) });

    await until(() => view(host).phase === 'ROUND_RESULT');
    expect(view(host).round?.result).toMatchObject({
      winner: 'imposters',
      reason: 'guessed-word',
      wordA: word,
    });

    // The TV never saw the word before the result.
    const beforeResult = tv.views.filter(
      (v) => v.phase !== 'ROUND_RESULT' && v.phase !== 'SCOREBOARD',
    );
    expect(JSON.stringify(beforeResult)).not.toContain(word);

    await emit(host, 'round:continue');
    await until(() => view(host).phase === 'SCOREBOARD');
    expect(view(host).titles).not.toBeNull();
    await emit(host, 'game:replay');
    await until(() => phones.every((p) => view(p).phase === 'LOBBY'));
    expect(view(host).players.find((p) => p.id === imposterId)?.score).toBe(2);

    for (const p of [...phones, tv]) p.socket.disconnect();
  });

  it('plays a Mode B elimination round with identical payloads for every role', async () => {
    const { phones } = await table('B');
    const [host] = phones as [Phone];
    await emit(host, 'game:start');
    await until(() => phones.every((p) => view(p).phase === 'ROLE_REVEAL'));
    // Nobody is told their role: everyone gets a word, same shape.
    for (const p of phones) {
      expect(view(p).me.secret).toEqual({ kind: 'word', word: expect.any(String), category: null });
    }
    const words = new Set(phones.map((p) => (view(p).me.secret as { word: string }).word));
    expect(words.size).toBe(2);

    for (const p of phones) await emit(p, 'role:confirm');
    await playTurnsAndDiscussion(phones);
    const target = view(phones[1] as Phone).me.id;
    for (const p of phones) {
      await emit(p, 'vote:cast', {
        targetId: view(p).me.id === target ? view(host).me.id : target,
      });
    }
    await until(() => view(host).phase === 'VOTE_REVEAL');
    const role = view(host).round?.reveal?.eliminatedRole;
    expect(role === 'civilian' || role === 'imposter').toBe(true);
    // Words stay hidden in the reveal; only the role is shown (§2.3.4).
    for (const w of words) expect(JSON.stringify(view(host).round)).not.toContain(w);

    for (const p of phones) p.socket.disconnect();
  });

  it('serves the admin stats with the secret only', async () => {
    const denied = await fetch(`${url}/admin/stats`);
    expect(denied.status).toBe(401);
    const response = await fetch(`${url}/admin/stats`, { headers: { 'x-admin-secret': 'e2e' } });
    const stats = (await response.json()) as { gamesStarted: number; replayRate: number | null };
    expect(stats.gamesStarted).toBeGreaterThanOrEqual(2);
    expect(stats.replayRate).not.toBeNull();
  });
});
