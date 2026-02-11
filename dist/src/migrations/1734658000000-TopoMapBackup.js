"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopoMapBackup1734658000000 = void 0;
class TopoMapBackup1734658000000 {
    constructor() {
        this.name = 'TopoMapBackup1734658000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ng_topomaps" (
        "topo_map_id" uuid NOT NULL,
        "circle_id" uuid NOT NULL,
        "version" integer NOT NULL,
        "data" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ng_topomaps" PRIMARY KEY ("topo_map_id")
      )
    `);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ng_topomaps_circle_id" ON "ng_topomaps" ("circle_id")`);
    }
    async down(queryRunner) {
        await queryRunner.query('DROP TABLE IF EXISTS "ng_topomaps"');
    }
}
exports.TopoMapBackup1734658000000 = TopoMapBackup1734658000000;
//# sourceMappingURL=1734658000000-TopoMapBackup.js.map