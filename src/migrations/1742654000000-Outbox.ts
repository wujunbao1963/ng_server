import { MigrationInterface, QueryRunner } from 'typeorm';

export class Outbox1742654000000 implements MigrationInterface {
  name = 'Outbox1742654000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建 ng_outbox 表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ng_outbox (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        payload JSONB NOT NULL,
        aggregate_id VARCHAR(100),
        aggregate_type VARCHAR(50),
        idempotency_key VARCHAR(255) UNIQUE,
        scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        retry_count INT NOT NULL DEFAULT 0,
        max_retries INT NOT NULL DEFAULT 5,
        next_retry_at TIMESTAMPTZ,
        last_error TEXT,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        processing_time_ms INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 创建索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_outbox_status_scheduled 
      ON ng_outbox (status, scheduled_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_outbox_type_status 
      ON ng_outbox (message_type, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_outbox_aggregate 
      ON ng_outbox (aggregate_type, aggregate_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_outbox_next_retry 
      ON ng_outbox (status, next_retry_at) 
      WHERE status = 'FAILED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_outbox_next_retry`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_outbox_aggregate`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_outbox_type_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_outbox_status_scheduled`);
    await queryRunner.query(`DROP TABLE IF EXISTS ng_outbox`);
  }
}
