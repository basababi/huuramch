/** When the first ballot slip lands, ms after the reveal starts (a short drumroll first). */
export const STACK_START_MS = 500;
/** All slips land within this span; fewer votes land slower, up to `MAX_SLIP_GAP_MS` apart. */
export const STACK_SPAN_MS = 1600;
export const MAX_SLIP_GAP_MS = 340;
/** Beat between the last slip and the verdict card, then between the card and the stamp. */
export const VERDICT_GAP_MS = 450;
export const STAMP_GAP_MS = 450;

export type RevealPlan = {
  /** Players with at least one vote, in seat order: their tiles never move during the count. */
  targets: string[];
  /** The target of each slip, in landing order. */
  sequence: string[];
  /** Landing time of each slip, then the verdict card, then the stamp (ms after the start). */
  times: number[];
  verdictStep: number;
  stampStep: number;
  /** Highest final tally: sizes the slip piles without saying whose it is. */
  maxVotes: number;
};

/**
 * Orders the slips for suspense (§5.8). Voters stay secret — only per-target counts exist — so the
 * slips are dealt round-robin from the smallest final pile to the largest: everyone keeps pace
 * early and the winner only pulls ahead with the last votes. Pure and deterministic, so every
 * screen in the room plays the same sequence.
 */
export function planReveal(
  tally: Readonly<Record<string, number>>,
  seatOrder: readonly string[],
): RevealPlan {
  const count = (id: string) => Math.max(0, Math.floor(tally[id] ?? 0));
  const targets = seatOrder.filter((id) => count(id) > 0);
  const ascending = [...targets].sort(
    (a, b) => count(a) - count(b) || seatOrder.indexOf(a) - seatOrder.indexOf(b),
  );
  const left = new Map(targets.map((id) => [id, count(id)]));
  const sequence: string[] = [];
  let dealt = true;
  while (dealt) {
    dealt = false;
    for (const id of ascending) {
      const remaining = left.get(id) ?? 0;
      if (remaining > 0) {
        sequence.push(id);
        left.set(id, remaining - 1);
        dealt = true;
      }
    }
  }
  const gap =
    sequence.length > 1 ? Math.min(MAX_SLIP_GAP_MS, STACK_SPAN_MS / (sequence.length - 1)) : 0;
  const slipTimes = sequence.map((_, i) => Math.round(STACK_START_MS + i * gap));
  const verdictAt = (slipTimes.at(-1) ?? STACK_START_MS) + VERDICT_GAP_MS;
  return {
    targets,
    sequence,
    times: [...slipTimes, verdictAt, verdictAt + STAMP_GAP_MS],
    verdictStep: sequence.length + 1,
    stampStep: sequence.length + 2,
    maxVotes: Math.max(0, ...targets.map(count)),
  };
}

/** Slips on `target`'s pile once `step` steps have passed. */
export function slipsLanded(plan: RevealPlan, target: string, step: number): number {
  let n = 0;
  const upTo = Math.min(step, plan.sequence.length);
  for (let i = 0; i < upTo; i++) if (plan.sequence[i] === target) n += 1;
  return n;
}
