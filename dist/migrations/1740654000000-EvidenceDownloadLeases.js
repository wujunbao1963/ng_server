"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceDownloadLeases1740654000000 = void 0;
class EvidenceDownloadLeases1740654000000 {
    constructor() {
        this.name = 'EvidenceDownloadLeases1740654000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ng_evidence_download_leases (
        lease_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id uuid NOT NULL,
        requester_user_id uuid NOT NULL,
        lease_type text NOT NULL,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
        await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ng_evidence_download_leases_ticket_type
        ON ng_evidence_download_leases(ticket_id, lease_type);
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ng_evidence_download_leases_expires
        ON ng_evidence_download_leases(expires_at);
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS ng_evidence_download_leases;`);
    }
}
exports.EvidenceDownloadLeases1740654000000 = EvidenceDownloadLeases1740654000000;
//# sourceMappingURL=1740654000000-EvidenceDownloadLeases.js.map