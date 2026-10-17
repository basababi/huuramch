/**
 * Loads the word packs from @khuuramch/content into PostgreSQL.
 * Usage: pnpm --filter @khuuramch/server build && pnpm --filter @khuuramch/server seed
 */
import { CORE_PACK, PREMIUM_PACKS, RUBIK_800_WIDTHS, validatePack } from '@khuuramch/content';
import { loadConfig } from '../config';
import { openDatabase } from './database';
import { WordPackEntity, WordPairEntity } from './entities';

async function seed(): Promise<void> {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: rely on the environment.
  }
  const { databaseUrl } = loadConfig();
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  const issues = validatePack(CORE_PACK, RUBIK_800_WIDTHS);
  if (issues.length) throw new Error(`core pack is invalid: ${issues[0]?.problem}`);

  const db = await openDatabase(databaseUrl);
  await db.transaction(async (manager) => {
    await manager
      .getRepository(WordPackEntity)
      .upsert(
        [
          { id: CORE_PACK.id, version: CORE_PACK.version, name: CORE_PACK.name, locked: false },
          ...PREMIUM_PACKS.map((p) => ({ id: p.id, version: 1, name: p.name, locked: true })),
        ],
        ['id'],
      );
    const pairs = manager.getRepository(WordPairEntity);
    await pairs.delete({ packId: CORE_PACK.id });
    await pairs.insert(
      CORE_PACK.pairs.map(({ id, a, b, category, difficulty, packId }) => ({
        id,
        a,
        b,
        category,
        difficulty,
        packId,
      })),
    );
  });
  console.warn(
    `seeded ${CORE_PACK.pairs.length} pairs (pack ${CORE_PACK.id} v${CORE_PACK.version})`,
  );
  await db.destroy();
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
