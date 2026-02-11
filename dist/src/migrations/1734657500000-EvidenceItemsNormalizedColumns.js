"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceItemsNormalizedColumns1734657500000 = void 0;
class EvidenceItemsNormalizedColumns1734657500000 {
    constructor() {
        this.name = 'EvidenceItemsNormalizedColumns1734657500000';
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
            ADD COLUMN IF NOT EXISTS circle_id uuid NULL,
            ADD COLUMN IF NOT EXISTS event_id uuid NULL,
            ADD COLUMN IF NOT EXISTS time_range_start_at timestamptz NULL,
            ADD COLUMN IF NOT EXISTS time_range_end_at timestamptz NULL,
            ADD COLUMN IF NOT EXISTS device_ref_kind text NULL,
            ADD COLUMN IF NOT EXISTS device_ref_id text NULL,
            ADD COLUMN IF NOT EXISTS device_ref_display_name text NULL,
            ADD COLUMN IF NOT EXISTS object_key text NULL;
        END IF;
      END $$;
    `);
    }
    async down(_queryRunner) {
    }
}
exports.EvidenceItemsNormalizedColumns1734657500000 = EvidenceItemsNormalizedColumns1734657500000;
//# sourceMappingURL=1734657500000-EvidenceItemsNormalizedColumns.js.map