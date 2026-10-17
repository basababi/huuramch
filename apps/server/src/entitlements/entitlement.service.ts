import type { LockedPackId } from '@khuuramch/game-core';

/**
 * Premium packs are owned per room host (§9): one purchase unlocks a pack for everyone in that
 * host's room. No payment provider yet — a QPay-backed implementation will replace the stub.
 */
export interface EntitlementService {
  /** Packs the given host may play. `hostKey` is a stable anonymous account id, never a nickname. */
  unlockedPacks(hostKey: string): Promise<LockedPackId[]>;
}

export const ENTITLEMENTS = Symbol('ENTITLEMENTS');

export class NoEntitlements implements EntitlementService {
  async unlockedPacks(): Promise<LockedPackId[]> {
    return [];
  }
}
