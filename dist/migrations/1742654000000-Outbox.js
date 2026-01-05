"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Outbox1742654000000 = void 0;
class Outbox1742654000000 {
    constructor() {
        this.name = 'Outbox1742654000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE ng_outbox (
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
        await queryRunner.query(`
      CREATE INDEX idx_outbox_status_scheduled ON ng_outbox (status, scheduled_at)
    `);
        await queryRunner.query(`
      CREATE INDEX idx_outbox_type_status ON ng_outbox (message_type, status)
    `);
        await queryRunner.query(`
      CREATE INDEX idx_outbox_aggregate ON ng_outbox (aggregate_type, aggregate_id)
    `);
        await queryRunner.query(`
      CREATE INDEX idx_outbox_next_retry ON ng_outbox (status, next_retry_at)
      WHERE status = 'FAILED'
    `);
        console.log('[Migration] Created ng_outbox table with indexes');
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS idx_outbox_next_retry`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_outbox_aggregate`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_outbox_type_status`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_outbox_status_scheduled`);
        await queryRunner.query(`DROP TABLE IF EXISTS ng_outbox`);
        console.log('[Migration] Dropped ng_outbox table');
    }
}
exports.Outbox1742654000000 = Outbox1742654000000;
//# sourceMappingURL=1742654000000-Outbox.js.map