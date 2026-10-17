import { describe, expect, it } from 'vitest';
import { computeFit } from './fit-text';

const base = { refSize: 100, min: 44, max: 72 };

describe('computeFit (§6.3 secret words)', () => {
  it('caps short words at the maximum size', () => {
    expect(computeFit({ ...base, available: 280, lineWidth: 312, longestWordWidth: 312 })).toEqual({
      fontSize: 72,
      wrap: false,
    });
  });

  it('shrinks to fit one line while it stays at or above the minimum', () => {
    const fit = computeFit({ ...base, available: 280, lineWidth: 560, longestWordWidth: 560 });
    expect(fit.wrap).toBe(false);
    expect(fit.fontSize).toBe(50);
  });

  it('wraps a phrase at spaces instead of dropping below the minimum', () => {
    // "Сүүтэй цай": one line would need 34.8px; the longest word fits at 55.9px.
    const fit = computeFit({
      ...base,
      available: 256.1,
      lineWidth: 736.7,
      longestWordWidth: 457.7,
    });
    expect(fit).toEqual({ fontSize: 55.75, wrap: true });
  });

  it('only goes below the minimum for a single word too wide for the card', () => {
    const fit = computeFit({ ...base, available: 280, lineWidth: 800, longestWordWidth: 800 });
    expect(fit.wrap).toBe(false);
    expect(fit.fontSize).toBe(35);
  });

  it('never returns an ellipsis-style zero width result', () => {
    expect(computeFit({ ...base, available: 0, lineWidth: 300, longestWordWidth: 300 })).toEqual({
      fontSize: 72,
      wrap: false,
    });
  });
});
