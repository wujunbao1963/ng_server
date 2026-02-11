"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsAndPushDevices1741654000000 = void 0;
class NotificationsAndPushDevices1741654000000 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ng_push_devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES ng_users(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        token TEXT NOT NULL,
        device_id TEXT,
        app_version TEXT,
        locale TEXT,
        timezone TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, token)
      )
    `);
        await queryRunner.query(`
      CREATE INDEX idx_ng_push_devices_user ON ng_push_devices(user_id)
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ng_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES ng_users(id) ON DELETE CASCADE,
        circle_id UUID NOT NULL,
        type TEXT NOT NULL,
        severity TEXT DEFAULT 'info',
        title TEXT NOT NULL,
        body TEXT,
        deeplink_route TEXT,
        deeplink_params JSONB,
        event_ref JSONB,
        delivered_push BOOLEAN DEFAULT FALSE,
        delivered_in_app BOOLEAN DEFAULT TRUE,
        read_at TIMESTAMPTZ,
        acked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ
      )
    `);
        await queryRunner.query(`
      CREATE INDEX idx_ng_notifications_user ON ng_notifications(user_id, created_at DESC)
    `);
        await queryRunner.query(`
      CREATE INDEX idx_ng_notifications_circle ON ng_notifications(circle_id, created_at DESC)
    `);
        await queryRunner.query(`
      CREATE UNIQUE INDEX uniq_ng_notifications_user_event_type 
      ON ng_notifications(user_id, type, (event_ref->>'eventId'))
      WHERE event_ref->>'eventId' IS NOT NULL
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS ng_notifications`);
        await queryRunner.query(`DROP TABLE IF EXISTS ng_push_devices`);
    }
}
exports.NotificationsAndPushDevices1741654000000 = NotificationsAndPushDevices1741654000000;
//# sourceMappingURL=1741654000000-NotificationsAndPushDevices.js.map