"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplainSummaryJsonb1734651000000 = void 0;
class ExplainSummaryJsonb1734651000000 {
    constructor() {
        this.name = 'ExplainSummaryJsonb1734651000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE ng_events
      ALTER COLUMN explain_summary TYPE jsonb
      USING to_jsonb(explain_summary);
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE ng_events
      ALTER COLUMN explain_summary TYPE text
      USING explain_summary::text;
    `);
    }
}
exports.ExplainSummaryJsonb1734651000000 = ExplainSummaryJsonb1734651000000;
//# sourceMappingURL=1734651000000-ExplainSummaryJsonb.js.map