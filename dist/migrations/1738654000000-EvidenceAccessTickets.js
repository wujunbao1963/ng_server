"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceAccessTickets1738654000000 = void 0;
class EvidenceAccessTickets1738654000000 {
    constructor() {
        this.name = 'EvidenceAccessTickets1738654000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ng_evidence_access_tickets (
        ticket_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        circle_id uuid NOT NULL,
        event_id text NOT NULL,
        requester_user_id uuid NOT NULL,
        evidence_key text NOT NULL,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ng_evidence_access_tickets_circle_event
      ON ng_evidence_access_tickets(circle_id, event_id);
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ng_evidence_access_tickets_expires
      ON ng_evidence_access_tickets(expires_at);
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS ng_evidence_access_tickets;`);
    }
}
exports.EvidenceAccessTickets1738654000000 = EvidenceAccessTickets1738654000000;
//# sourceMappingURL=1738654000000-EvidenceAccessTickets.js.map