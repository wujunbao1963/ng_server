"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdgeEvents1735654000000 = void 0;
class EdgeEvents1735654000000 {
    constructor() {
        this.name = 'EdgeEvents1735654000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ng_edge_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        circle_id uuid NOT NULL,
        event_id text NOT NULL,
        edge_instance_id text NOT NULL,
        threat_state text NOT NULL,
        trigger_reason text NULL,
        edge_updated_at timestamptz NOT NULL,
        last_sequence bigint NOT NULL DEFAULT 0,
        summary_json jsonb NOT NULL,
        last_upsert_received_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_ng_edge_events_circle_event UNIQUE (circle_id, event_id)
      );
    `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ng_edge_events_circle_updated ON ng_edge_events (circle_id, edge_updated_at);`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ng_edge_events_circle_state_updated ON ng_edge_events (circle_id, threat_state, edge_updated_at);`);
    }
    async down(queryRunner) {
        await queryRunner.query('DROP TABLE IF EXISTS ng_edge_events');
    }
}
exports.EdgeEvents1735654000000 = EdgeEvents1735654000000;
//# sourceMappingURL=1735654000000-EdgeEvents.js.map