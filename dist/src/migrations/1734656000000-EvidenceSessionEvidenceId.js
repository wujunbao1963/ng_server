"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceSessionEvidenceId1734656000000 = void 0;
class EvidenceSessionEvidenceId1734656000000 {
    constructor() {
        this.name = 'EvidenceSessionEvidenceId1734656000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE ng_evidence_sessions
      ADD COLUMN IF NOT EXISTS evidence_id uuid NULL;
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE ng_evidence_sessions
      DROP COLUMN IF EXISTS evidence_id;
    `);
    }
}
exports.EvidenceSessionEvidenceId1734656000000 = EvidenceSessionEvidenceId1734656000000;
//# sourceMappingURL=1734656000000-EvidenceSessionEvidenceId.js.map