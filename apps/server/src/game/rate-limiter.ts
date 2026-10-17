/**
 * Token bucket per socket (§3.2): bursts of up to `capacity` actions, refilling at `perSecond`.
 * Generous for humans tapping buttons, tight enough to stop a script hammering the server.
 */
export class RateLimiter {
  private readonly buckets = new Map<string, { tokens: number; at: number }>();

  constructor(
    private readonly capacity = 10,
    private readonly perSecond = 3,
  ) {}

  take(key: string, now: number): boolean {
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, at: now };
    const refilled = Math.min(
      this.capacity,
      bucket.tokens + ((now - bucket.at) / 1000) * this.perSecond,
    );
    if (refilled < 1) {
      this.buckets.set(key, { tokens: refilled, at: now });
      return false;
    }
    this.buckets.set(key, { tokens: refilled - 1, at: now });
    return true;
  }

  forget(key: string): void {
    this.buckets.delete(key);
  }
}
