import { DataSource } from 'typeorm';
import { AnalyticsEventEntity, WordPackEntity, WordPairEntity } from './entities';
import { Init1760000000000 } from './migrations/1760000000000-init';

export const DATA_SOURCE = Symbol('DATA_SOURCE');

/** Opens PostgreSQL and applies pending migrations. */
export async function openDatabase(url: string): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'postgres',
    url,
    entities: [WordPackEntity, WordPairEntity, AnalyticsEventEntity],
    migrations: [Init1760000000000],
    migrationsRun: true,
    synchronize: false,
    logging: ['error'],
  });
  return dataSource.initialize();
}
