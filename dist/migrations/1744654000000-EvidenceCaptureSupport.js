"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceCaptureSupport1744654000000 = void 0;
class EvidenceCaptureSupport1744654000000 {
    constructor() {
        this.name = 'EvidenceCaptureSupport1744654000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE ng_edge_ingest_audit 
      ADD COLUMN IF NOT EXISTS notification_eligible boolean DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS notification_suppress_reason text DEFAULT NULL
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ng_presence_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        circle_id uuid NOT NULL,
        event_id text NOT NULL,
        session_id text NOT NULL,
        camera_id text NOT NULL,
        start_ts timestamptz NOT NULL,
        end_ts timestamptz,
        reentry_count int DEFAULT 0,
        roi_enter_count int DEFAULT 0,
        milestones_reached jsonb DEFAULT '{}',
        state text DEFAULT 'ACTIVE',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        
        UNIQUE(circle_id, event_id, session_id)
      )
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_presence_sessions_circle_event 
      ON ng_presence_sessions(circle_id, event_id)
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ng_evidence_clips (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        circle_id uuid NOT NULL,
        event_id text NOT NULL,
        clip_id text NOT NULL,
        camera_id text NOT NULL,
        session_id text,
        anchor_event_id text,
        start_ts timestamptz NOT NULL,
        end_ts timestamptz NOT NULL,
        duration_sec numeric(10, 2),
        kind text NOT NULL,
        reason text NOT NULL,
        evidence_state text DEFAULT 'BUFFER',
        file_path text,
        file_size bigint DEFAULT 0,
        created_at timestamptz DEFAULT now(),
        
        UNIQUE(circle_id, event_id, clip_id)
      )
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_evidence_clips_circle_event 
      ON ng_evidence_clips(circle_id, event_id)
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_evidence_clips_session 
      ON ng_evidence_clips(session_id) WHERE session_id IS NOT NULL
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ng_anchor_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        circle_id uuid NOT NULL,
        event_id text,
        anchor_event_id text NOT NULL,
        type text NOT NULL,
        entry_id text NOT NULL,
        ts timestamptz NOT NULL,
        correlation_status text DEFAULT 'ORPHAN',
        linked_session_id text,
        created_at timestamptz DEFAULT now(),
        
        UNIQUE(circle_id, anchor_event_id)
      )
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_anchor_events_circle_event 
      ON ng_anchor_events(circle_id, event_id) WHERE event_id IS NOT NULL
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS ng_anchor_events`);
        await queryRunner.query(`DROP TABLE IF EXISTS ng_evidence_clips`);
        await queryRunner.query(`DROP TABLE IF EXISTS ng_presence_sessions`);
        await queryRunner.query(`
      ALTER TABLE ng_edge_ingest_audit 
      DROP COLUMN IF EXISTS notification_eligible,
      DROP COLUMN IF EXISTS notification_suppress_reason
    `);
    }
}
exports.EvidenceCaptureSupport1744654000000 = EvidenceCaptureSupport1744654000000;
//# sourceMappingURL=1744654000000-EvidenceCaptureSupport.js.map