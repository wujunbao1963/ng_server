"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdgeEventsStep3AuditAndHash1736654000000 = void 0;
class EdgeEventsStep3AuditAndHash1736654000000 {
    constructor() {
        this.name = 'EdgeEventsStep3AuditAndHash1736654000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE ng_edge_events ADD COLUMN IF NOT EXISTS last_payload_hash text`);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ng_edge_ingest_audit (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        circle_id uuid NOT NULL,
        event_id text NOT NULL,
        edge_instance_id text NOT NULL,
        sequence bigint NOT NULL DEFAULT 0,
        payload_hash text NOT NULL,
        applied boolean NOT NULL,
        reason text NOT NULL,
        schema_version text NOT NULL,
        received_at timestamptz NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ng_edge_ingest_audit_circle_event_received ON ng_edge_ingest_audit (circle_id, event_id, received_at DESC)`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ng_edge_ingest_audit_circle_edge_received ON ng_edge_ingest_audit (circle_id, edge_instance_id, received_at DESC)`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS ng_edge_ingest_audit`);
        await queryRunner.query(`ALTER TABLE ng_edge_events DROP COLUMN IF EXISTS last_payload_hash`);
    }
}
exports.EdgeEventsStep3AuditAndHash1736654000000 = EdgeEventsStep3AuditAndHash1736654000000;
//# sourceMappingURL=1736654000000-EdgeEventsStep3AuditAndHash.js.map