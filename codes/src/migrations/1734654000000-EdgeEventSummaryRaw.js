"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdgeEventSummaryRaw1734654000000 = void 0;
class EdgeEventSummaryRaw1734654000000 {
    constructor() {
        this.name = 'EdgeEventSummaryRaw1734654000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ng_edge_event_summaries_raw (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        circle_id uuid NOT NULL,
        event_id text NOT NULL,
        edge_instance_id text NOT NULL,
        threat_state text NOT NULL,
        edge_updated_at timestamptz NOT NULL,
        payload jsonb NOT NULL,
        received_at timestamptz NOT NULL DEFAULT now()
      );
    `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ng_edge_event_summaries_raw_circle ON ng_edge_event_summaries_raw(circle_id);`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ng_edge_event_summaries_raw_event ON ng_edge_event_summaries_raw(circle_id, event_id);`);
    }
    async down(queryRunner) {
        await queryRunner.query('DROP TABLE IF EXISTS ng_edge_event_summaries_raw;');
    }
}
exports.EdgeEventSummaryRaw1734654000000 = EdgeEventSummaryRaw1734654000000;
//# sourceMappingURL=1734654000000-EdgeEventSummaryRaw.js.map