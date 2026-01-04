"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceSessionManifestHash1734657000000 = void 0;
class EvidenceSessionManifestHash1734657000000 {
    constructor() {
        this.name = 'EvidenceSessionManifestHash1734657000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE ng_evidence_sessions
      ADD COLUMN IF NOT EXISTS manifest_hash text NULL;
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE ng_evidence_sessions
      DROP COLUMN IF EXISTS manifest_hash;
    `);
    }
}
exports.EvidenceSessionManifestHash1734657000000 = EvidenceSessionManifestHash1734657000000;
//# sourceMappingURL=1734657000000-EvidenceSessionManifestHash.js.map