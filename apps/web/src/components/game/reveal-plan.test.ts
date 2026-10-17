import { describe, expect, it } from 'vitest';
import { passedSteps } from '@/lib/use-timeline';
import {
  MAX_SLIP_GAP_MS,
  STACK_SPAN_MS,
  STACK_START_MS,
  STAMP_GAP_MS,
  VERDICT_GAP_MS,
  planReveal,
  slipsLanded,
} from './reveal-plan';

const SEATS = ['a', 'b', 'c', 'd', 'e'];

describe('planReveal (§5.8 vote reveal)', () => {
  it('deals slips from the smallest final pile up, so the winner pulls ahead last', () => {
    const plan = planReveal({ a: 3, b: 1, c: 2 }, SEATS);
    expect(plan.sequence).toEqual(['b', 'c', 'a', 'c', 'a', 'a']);
    expect(plan.targets).toEqual(['a', 'b', 'c']);
    expect(plan.maxVotes).toBe(3);
  });

  it('keeps a tie level until the very end', () => {
    const plan = planReveal({ d: 2, b: 2 }, SEATS);
    expect(plan.sequence).toEqual(['b', 'd', 'b', 'd']);
    expect(slipsLanded(plan, 'b', 3)).toBe(2);
    expect(slipsLanded(plan, 'd', 3)).toBe(1);
  });

  it('lands every slip, then the verdict, then the stamp, inside the 5 s phase', () => {
    for (let votes = 1; votes <= 12; votes++) {
      const tally = Object.fromEntries(SEATS.map((id, i) => [id, i < votes % 5 ? 1 : 0]));
      tally.a = (tally.a ?? 0) + votes - Object.values(tally).reduce((n, v) => n + v, 0);
      const plan = planReveal(tally, SEATS);
      const slips = plan.times.slice(0, plan.sequence.length);
      expect(plan.sequence).toHaveLength(votes);
      expect(slips[0]).toBe(STACK_START_MS);
      expect(slips.at(-1)).toBeLessThanOrEqual(STACK_START_MS + STACK_SPAN_MS);
      for (let i = 1; i < slips.length; i++) {
        expect((slips[i] ?? 0) - (slips[i - 1] ?? 0)).toBeLessThanOrEqual(MAX_SLIP_GAP_MS + 1);
      }
      const last = slips.at(-1) ?? 0;
      expect(plan.times[plan.verdictStep - 1]).toBe(last + VERDICT_GAP_MS);
      expect(plan.times[plan.stampStep - 1]).toBe(last + VERDICT_GAP_MS + STAMP_GAP_MS);
      expect(plan.times.at(-1)).toBeLessThan(5_000);
    }
  });

  it('goes straight to the verdict when nobody voted', () => {
    const plan = planReveal({}, SEATS);
    expect(plan.sequence).toEqual([]);
    expect(plan.targets).toEqual([]);
    expect(plan.verdictStep).toBe(1);
    expect(plan.stampStep).toBe(2);
  });

  it('ignores players who are not seated and nonsense counts', () => {
    const plan = planReveal({ ghost: 4, a: 1.7, b: -2 }, SEATS);
    expect(plan.sequence).toEqual(['a']);
  });
});

describe('passedSteps (shared timeline)', () => {
  it('counts the steps whose time has come, relative to the phase start', () => {
    const times = [500, 900, 1350];
    expect(passedSteps(10_000, times, 10_000)).toBe(0);
    expect(passedSteps(10_000, times, 10_500)).toBe(1);
    expect(passedSteps(10_000, times, 11_000)).toBe(2);
    // A phone that opens late starts mid-sequence.
    expect(passedSteps(10_000, times, 20_000)).toBe(3);
  });
});
