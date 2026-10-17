import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1760000000000 implements MigrationInterface {
  name = 'Init1760000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE word_pack (
        id varchar(32) PRIMARY KEY,
        version int NOT NULL,
        name varchar(64) NOT NULL,
        locked boolean NOT NULL DEFAULT false,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(`
      CREATE TABLE word_pair (
        id varchar(96) PRIMARY KEY,
        pack_id varchar(32) NOT NULL REFERENCES word_pack(id) ON DELETE CASCADE,
        a varchar(32) NOT NULL,
        b varchar(32) NOT NULL,
        category varchar(16) NOT NULL,
        difficulty smallint NOT NULL CHECK (difficulty BETWEEN 1 AND 3)
      )`);
    await queryRunner.query(
      `CREATE INDEX word_pair_pack_category ON word_pair (pack_id, category)`,
    );
    await queryRunner.query(`
      CREATE TABLE analytics_event (
        id bigserial PRIMARY KEY,
        type varchar(32) NOT NULL,
        room_id uuid NULL,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX analytics_event_type_created ON analytics_event (type, created_at)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE analytics_event`);
    await queryRunner.query(`DROP TABLE word_pair`);
    await queryRunner.query(`DROP TABLE word_pack`);
  }
}
