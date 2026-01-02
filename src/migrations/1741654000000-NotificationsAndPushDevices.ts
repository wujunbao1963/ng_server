import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationsAndPushDevices1741654000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 推送设备注册表
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

    // 通知记录表
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

    // 去重约束：同一用户、同一事件、同一类型只能有一条通知
    await queryRunner.query(`
      CREATE UNIQUE INDEX uniq_ng_notifications_user_event_type 
      ON ng_notifications(user_id, type, (event_ref->>'eventId'))
      WHERE event_ref->>'eventId' IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ng_notifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS ng_push_devices`);
  }
}
