'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { readStorage, writeStorage } from './storage';

/*
 * Sound effects for the shared screens (§5): a tick in the last five seconds, a drumroll under the
 * vote count, a slip for every ballot and the rubber-stamp thump. All synthesised with Web Audio —
 * no files to download, nothing to license. The TV and the host's phone play them by default;
 * players' phones stay silent unless someone opts in. Browsers only allow audio after a tap, so
 * the context is unlocked on the first interaction (`useAudioUnlock`).
 */

const PREF_KEY = 'khuuramch:sound';
type Pref = 'on' | 'off' | null;

const listeners = new Set<() => void>();
let pref: Pref | undefined;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

function readPref(): Pref {
  const value = readStorage(PREF_KEY);
  return value === 'on' || value === 'off' ? value : null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((l) => l());
}

export function setSoundOn(on: boolean): void {
  pref = on ? 'on' : 'off';
  writeStorage(PREF_KEY, pref);
  if (on) unlockAudio();
  notify();
}

/** The device's choice; `defaultOn` applies until someone taps the toggle. */
export function useSoundOn(defaultOn: boolean): boolean {
  const value = useSyncExternalStore(
    subscribe,
    () => (pref ??= readPref()),
    () => null,
  );
  return value === null ? defaultOn : value === 'on';
}

function audio(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    ctx.addEventListener('statechange', notify);
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Resume the audio context; works only inside a user gesture. */
export function unlockAudio(): void {
  const context = audio();
  if (context && context.state === 'suspended') void context.resume().catch(() => undefined);
}

/** Whether the browser is letting this page play sound yet. */
export function useAudioRunning(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => ctx?.state === 'running',
    () => false,
  );
}

/** Unlocks audio on the first tap or key press anywhere on the page. */
export function useAudioUnlock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const unlock = () => unlockAudio();
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [enabled]);
}

function ready(): { context: AudioContext; out: GainNode } | null {
  const context = audio();
  if (!context || !master || context.state !== 'running') return null;
  return { context, out: master };
}

function noiseBuffer(context: AudioContext): AudioBuffer {
  if (noise) return noise;
  noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

/** A filtered noise burst starting at `at` (context time). */
function burst(
  context: AudioContext,
  out: AudioNode,
  at: number,
  opts: { type: BiquadFilterType; freq: number; q?: number; gain: number; length: number },
) {
  const source = context.createBufferSource();
  source.buffer = noiseBuffer(context);
  const filter = context.createBiquadFilter();
  filter.type = opts.type;
  filter.frequency.value = opts.freq;
  filter.Q.value = opts.q ?? 1;
  const env = context.createGain();
  env.gain.setValueAtTime(opts.gain, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + opts.length);
  source.connect(filter).connect(env).connect(out);
  source.start(at, Math.random() * 0.5, opts.length + 0.02);
}

export const sfx = {
  /** Last five seconds of a timer; the final three are brighter. */
  tick(urgent = false) {
    const a = ready();
    if (!a) return;
    const t = a.context.currentTime;
    const osc = a.context.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = urgent ? 1560 : 1120;
    const env = a.context.createGain();
    env.gain.setValueAtTime(urgent ? 0.32 : 0.22, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    osc.connect(env).connect(a.out);
    osc.start(t);
    osc.stop(t + 0.08);
  },

  /** A snare roll that swells for `ms` — under the vote count, up to the verdict. */
  drumroll(ms: number) {
    const a = ready();
    if (!a || ms <= 0) return;
    const t0 = a.context.currentTime;
    const hits = Math.floor(ms / 55);
    for (let i = 0; i < hits; i++) {
      const progress = hits > 1 ? i / (hits - 1) : 1;
      burst(a.context, a.out, t0 + i * 0.055, {
        type: 'bandpass',
        freq: 1900,
        q: 0.9,
        gain: 0.05 + progress * 0.2,
        length: 0.05,
      });
    }
  },

  /** One ballot slip landing on a pile. */
  slip() {
    const a = ready();
    if (!a) return;
    burst(a.context, a.out, a.context.currentTime, {
      type: 'highpass',
      freq: 2600,
      gain: 0.28,
      length: 0.035,
    });
  },

  /** The rubber stamp hitting the table: a low thump with a slap on top. */
  stamp() {
    const a = ready();
    if (!a) return;
    const t = a.context.currentTime;
    const osc = a.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    const env = a.context.createGain();
    env.gain.setValueAtTime(0.9, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(env).connect(a.out);
    osc.start(t);
    osc.stop(t + 0.32);
    burst(a.context, a.out, t, { type: 'lowpass', freq: 900, gain: 0.45, length: 0.12 });
  },
};

/**
 * Ticks once per second for the last five seconds of a countdown, in step with the timer ring
 * (both read the same shared clock).
 */
export function useCountdownTicks(seconds: number | null, enabled: boolean): void {
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (enabled && seconds !== null && seconds !== last.current && seconds >= 1 && seconds <= 5) {
      sfx.tick(seconds <= 3);
    }
    last.current = seconds;
  }, [enabled, seconds]);
}
