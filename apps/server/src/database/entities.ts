import { EntitySchema } from 'typeorm';

/*
 * TypeORM entities as EntitySchema (no decorators): plain data, easy to test, and the same
 * tables the migration below creates. Rooms are NOT stored here — they live in memory (§3).
 */

export type WordPackRow = {
  id: string;
  version: number;
  name: string;
  locked: boolean;
  updatedAt: Date;
};

export const WordPackEntity = new EntitySchema<WordPackRow>({
  name: 'WordPack',
  tableName: 'word_pack',
  columns: {
    id: { type: 'varchar', length: 32, primary: true },
    version: { type: 'int' },
    name: { type: 'varchar', length: 64 },
    locked: { type: 'boolean', default: false },
    updatedAt: { type: 'timestamptz', name: 'updated_at', updateDate: true },
  },
});

export type WordPairRow = {
  id: string;
  packId: string;
  a: string;
  b: string;
  category: string;
  difficulty: number;
};

export const WordPairEntity = new EntitySchema<WordPairRow>({
  name: 'WordPair',
  tableName: 'word_pair',
  columns: {
    id: { type: 'varchar', length: 96, primary: true },
    packId: { type: 'varchar', length: 32, name: 'pack_id' },
    a: { type: 'varchar', length: 32 },
    b: { type: 'varchar', length: 32 },
    category: { type: 'varchar', length: 16 },
    difficulty: { type: 'smallint' },
  },
});

/** Anonymous by construction (§8): an event type, a random room id and counts — never names or IPs. */
export type AnalyticsEventRow = {
  id?: string;
  type: string;
  roomId: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
};

export const AnalyticsEventEntity = new EntitySchema<AnalyticsEventRow>({
  name: 'AnalyticsEvent',
  tableName: 'analytics_event',
  columns: {
    id: { type: 'bigint', primary: true, generated: 'increment' },
    type: { type: 'varchar', length: 32 },
    roomId: { type: 'uuid', name: 'room_id', nullable: true },
    payload: { type: 'jsonb' },
    createdAt: { type: 'timestamptz', name: 'created_at' },
  },
});
