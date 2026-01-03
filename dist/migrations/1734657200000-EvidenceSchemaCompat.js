"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceSchemaCompat1734657200000 = void 0;
class EvidenceSchemaCompat1734657200000 {
    constructor() {
        this.name = 'EvidenceSchemaCompat1734657200000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'ng_evidence_items'
            AND column_name = 'item_type'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'ng_evidence_items'
            AND column_name = 'type'
        ) THEN
          ALTER TABLE ng_evidence_items RENAME COLUMN item_type TO type;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'ng_evidence_items'
            AND column_name = 'type'
        ) THEN
          ALTER TABLE ng_evidence_items ADD COLUMN type text NULL;
        END IF;
      END $$;
    `);
        await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'ng_event_evidence'
            AND column_name = 'evidence_status'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'ng_event_evidence'
            AND column_name = 'status'
        ) THEN
          ALTER TABLE ng_event_evidence RENAME COLUMN evidence_status TO status;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'ng_event_evidence'
            AND column_name = 'status'
        ) THEN
          ALTER TABLE ng_event_evidence ADD COLUMN status text NULL;
        END IF;
      END $$;
    `);
    }
    async down(queryRunner) {
    }
}
exports.EvidenceSchemaCompat1734657200000 = EvidenceSchemaCompat1734657200000;
//# sourceMappingURL=1734657200000-EvidenceSchemaCompat.js.map