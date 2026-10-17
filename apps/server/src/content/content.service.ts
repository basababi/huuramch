import { CATEGORY_IDS, type CategoryId, type WordPair } from '@khuuramch/game-core';
import { playablePairs } from '@khuuramch/content';
import type { DataSource } from 'typeorm';
import { WordPackEntity, WordPairEntity } from '../database/entities';
import type { ContentProvider } from '../game/room.service';

/**
 * Word pairs for new games. PostgreSQL is the source when configured (§3: "Postgres for word
 * packs"); without a database — or with an empty one — the bundled @khuuramch/content pack is used,
 * so local development needs no setup.
 */
export class ContentService implements ContentProvider {
  private cache: WordPair[] = playablePairs();
  source: 'database' | 'bundled' = 'bundled';

  constructor(private readonly db: DataSource | null) {}

  async load(): Promise<void> {
    if (!this.db) return;
    const unlocked = await this.db.getRepository(WordPackEntity).find({ where: { locked: false } });
    if (unlocked.length === 0) {
      console.warn(
        '[content] database has no unlocked packs — using the bundled pack (run the seed script)',
      );
      return;
    }
    const rows = await this.db
      .getRepository(WordPairEntity)
      .find({ where: unlocked.map((p) => ({ packId: p.id })) });
    const pairs = rows
      .filter((r) => (CATEGORY_IDS as readonly string[]).includes(r.category))
      .map((r) => ({
        id: r.id,
        a: r.a,
        b: r.b,
        category: r.category as CategoryId,
        difficulty: r.difficulty as WordPair['difficulty'],
        packId: r.packId,
      }));
    if (pairs.length === 0) {
      console.warn('[content] database packs are empty — using the bundled pack');
      return;
    }
    this.cache = pairs;
    this.source = 'database';
  }

  pairs(): WordPair[] {
    return this.cache;
  }
}
