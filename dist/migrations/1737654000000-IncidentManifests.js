"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentManifests1737654000000 = void 0;
class IncidentManifests1737654000000 {
    constructor() {
        this.name = 'IncidentManifests1737654000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE ng_edge_ingest_audit ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'event_summary_upsert'`);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ng_incident_manifests_raw (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        circle_id uuid NOT NULL,
        event_id text NOT NULL,
        edge_instance_id text NOT NULL,
        edge_updated_at timestamptz NOT NULL,
        sequence bigint NOT NULL DEFAULT 0,
        payload jsonb NOT NULL,
        received_at timestamptz NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ng_incident_manifests_raw_circle_event_received ON ng_incident_manifests_raw (circle_id, event_id, received_at DESC)`);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ng_incident_manifests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        circle_id uuid NOT NULL,
        event_id text NOT NULL,
        edge_instance_id text NOT NULL,
        edge_updated_at timestamptz NOT NULL,
        last_sequence bigint NOT NULL DEFAULT 0,
        last_payload_hash text,
        manifest_json jsonb NOT NULL,
        last_upsert_received_at timestamptz NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uniq_ng_incident_manifests_circle_event ON ng_incident_manifests (circle_id, event_id)`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ng_incident_manifests_circle_updated ON ng_incident_manifests (circle_id, edge_updated_at DESC)`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS ng_incident_manifests_raw`);
        await queryRunner.query(`DROP TABLE IF EXISTS ng_incident_manifests`);
    }
}
exports.IncidentManifests1737654000000 = IncidentManifests1737654000000;
//# sourceMappingURL=1737654000000-IncidentManifests.js.map