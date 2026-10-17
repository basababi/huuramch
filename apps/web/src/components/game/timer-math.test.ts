import { describe, expect, it } from 'vitest';
import { RING_SEGMENTS, annularSector, ringSegments, timerState } from './timer-math';

describe('timerState', () => {
  it('starts full', () => {
    expect(timerState(20_000, 20_000)).toEqual({
      seconds: 20,
      visible: 20,
      urgent: false,
      done: false,
    });
  });

  it('rounds seconds up so "1" shows until the very end', () => {
    expect(timerState(1, 20_000).seconds).toBe(1);
    expect(timerState(12_001, 20_000).seconds).toBe(13);
  });

  it('drops one block per twentieth of the duration', () => {
    expect(timerState(13_000, 20_000).visible).toBe(13);
    expect(timerState(61_000, 90_000).visible).toBe(14);
  });

  it('turns urgent for the last five seconds only', () => {
    expect(timerState(5_001, 20_000).urgent).toBe(false);
    expect(timerState(5_000, 20_000).urgent).toBe(true);
    expect(timerState(0, 20_000)).toEqual({ seconds: 0, visible: 0, urgent: false, done: true });
  });

  it('clamps clock skew in both directions', () => {
    expect(timerState(-3_000, 20_000).done).toBe(true);
    expect(timerState(25_000, 20_000).seconds).toBe(20);
  });
});

describe('ring geometry', () => {
  it('builds one closed sector per block', () => {
    const paths = ringSegments();
    expect(paths).toHaveLength(RING_SEGMENTS);
    for (const d of paths) expect(d).toMatch(/^M.+A.+L.+A.+Z$/);
  });

  it('starts the first block just clockwise of 12 o’clock', () => {
    expect(annularSector(50, 50, 40, 30, 0, 90).startsWith('M50 10A40 40 0 0 1 90 50')).toBe(true);
  });
});
