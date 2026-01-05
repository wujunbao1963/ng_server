"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceItemsColumnCompat1734657300000 = void 0;
class EvidenceItemsColumnCompat1734657300000 {
    constructor() {
        this.name = 'EvidenceItemsColumnCompat1734657300000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'ng_evidence_items'
        ) THEN
          ALTER TABLE ng_evidence_items
            ADD COLUMN IF NOT EXISTS content_type text NULL,
            ADD COLUMN IF NOT EXISTS size bigint NULL,
            ADD COLUMN IF NOT EXISTS time_range jsonb NULL,
            ADD COLUMN IF NOT EXISTS device_ref jsonb NULL;
        END IF;
      END $$;
    `);
    }
    async down(_queryRunner) {
    }
}
exports.EvidenceItemsColumnCompat1734657300000 = EvidenceItemsColumnCompat1734657300000;
//# sourceMappingURL=1734657300000-EvidenceItemsColumnCompat.js.map