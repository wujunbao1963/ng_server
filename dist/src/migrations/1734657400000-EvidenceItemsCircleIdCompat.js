"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceItemsCircleIdCompat1734657400000 = void 0;
class EvidenceItemsCircleIdCompat1734657400000 {
    constructor() {
        this.name = 'EvidenceItemsCircleIdCompat1734657400000';
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
            ADD COLUMN IF NOT EXISTS circle_id uuid NULL;

          CREATE INDEX IF NOT EXISTS idx_ng_evidence_items_circle
          ON ng_evidence_items(circle_id);
        END IF;
      END $$;
    `);
    }
    async down(_queryRunner) {
    }
}
exports.EvidenceItemsCircleIdCompat1734657400000 = EvidenceItemsCircleIdCompat1734657400000;
//# sourceMappingURL=1734657400000-EvidenceItemsCircleIdCompat.js.map