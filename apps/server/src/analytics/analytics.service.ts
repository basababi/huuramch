import { MoreThanOrEqual, type DataSource } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { AnalyticsEventEntity, type AnalyticsEventRow } from '../database/entities';
import type { AnalyticsSink } from '../game/room.service';
import type { StoredEvent } from './stats';

const MEMORY_LIMIT = 20_000;

/**
 * Anonymous product analytics (§8). Writes go to PostgreSQL when configured, otherwise to a
 * bounded in-memory buffer (development). Writes never block or break a game.
 */
export class AnalyticsService implements AnalyticsSink {
  private readonly memory: StoredEvent[] = [];

  constructor(private readonly db: DataSource | null) {}

  record(type: string, payload: Record<string, unknown>, roomId: string | null): void {
    const event: StoredEvent = { type, roomId, payload, createdAt: new Date() };
    if (!this.db) {
      this.memory.push(event);
      if (this.memory.length > MEMORY_LIMIT)
        this.memory.splice(0, this.memory.length - MEMORY_LIMIT);
      return;
    }
    this.db
      .getRepository(AnalyticsEventEntity)
      // jsonb payloads are plain JSON; TypeORM's deep-partial type cannot express `unknown` values.
      .insert(event as QueryDeepPartialEntity<AnalyticsEventRow>)
      .catch((error: unknown) => console.error('[analytics] write failed', error));
  }

  async since(from: Date): Promise<StoredEvent[]> {
    if (!this.db) return this.memory.filter((e) => e.createdAt >= from);
    const rows = await this.db.getRepository(AnalyticsEventEntity).find({
      where: { createdAt: MoreThanOrEqual(from) },
      order: { createdAt: 'ASC' },
    });
    return rows.map(({ type, roomId, payload, createdAt }) => ({
      type,
      roomId,
      payload,
      createdAt,
    }));
  }
}
