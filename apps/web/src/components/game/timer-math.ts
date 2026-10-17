/** The ring is made of chunky blocks that drop out one by one: opacity + transform only (§7). */
export const RING_SEGMENTS = 20;
export const URGENT_MS = 5000;

export type TimerState = {
  /** Whole seconds left, rounded up: "1" shows until the very end. */
  seconds: number;
  /** How many of the ring's blocks are still standing. */
  visible: number;
  urgent: boolean;
  done: boolean;
};

export function timerState(
  remainingMs: number,
  durationMs: number,
  segments = RING_SEGMENTS,
  urgentMs = URGENT_MS,
): TimerState {
  const remaining = Math.max(0, Math.min(remainingMs, durationMs));
  return {
    seconds: Math.ceil(remaining / 1000),
    visible: durationMs > 0 ? Math.ceil((remaining / durationMs) * segments) : 0,
    urgent: remaining > 0 && remaining <= urgentMs,
    done: remaining === 0,
  };
}

/** Annular sector path; angles in degrees, 0 = 12 o'clock, clockwise. */
export function annularSector(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  from: number,
  to: number,
): string {
  const point = (r: number, deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return `${round(cx + r * Math.sin(rad))} ${round(cy - r * Math.cos(rad))}`;
  };
  const large = to - from > 180 ? 1 : 0;
  return [
    `M${point(outer, from)}`,
    `A${outer} ${outer} 0 ${large} 1 ${point(outer, to)}`,
    `L${point(inner, to)}`,
    `A${inner} ${inner} 0 ${large} 0 ${point(inner, from)}`,
    'Z',
  ].join('');
}

/** Static geometry for the ring's blocks in a 100×100 viewBox. */
export function ringSegments(segments = RING_SEGMENTS, gapDeg = 4): string[] {
  const step = 360 / segments;
  return Array.from({ length: segments }, (_, i) =>
    annularSector(50, 50, 44.5, 33.5, i * step + gapDeg / 2, (i + 1) * step - gapDeg / 2),
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
