import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type NotificationType = 'LOGISTICS_PARCEL_DELIVERED';
export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface EventRef {
  eventId: string;
  workflowClass?: string;
  siteId?: string;
  deviceId?: string;
}

export interface DeeplinkParams {
  eventId?: string;
  [key: string]: unknown;
}

@Entity('ng_notifications')
@Index('idx_ng_notifications_user', ['userId', 'createdAt'])
@Index('idx_ng_notifications_circle', ['circleId', 'createdAt'])
export class NgNotification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'uuid', name: 'circle_id' })
  circleId!: string;

  @Column({ type: 'text' })
  type!: NotificationType;

  @Column({ type: 'text', default: 'info' })
  severity!: NotificationSeverity;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  body!: string | null;

  @Column({ type: 'text', name: 'deeplink_route', nullable: true })
  deeplinkRoute!: string | null;

  @Column({ type: 'jsonb', name: 'deeplink_params', nullable: true })
  deeplinkParams!: DeeplinkParams | null;

  @Column({ type: 'jsonb', name: 'event_ref', nullable: true })
  eventRef!: EventRef | null;

  @Column({ type: 'boolean', name: 'delivered_push', default: false })
  deliveredPush!: boolean;

  @Column({ type: 'boolean', name: 'delivered_in_app', default: true })
  deliveredInApp!: boolean;

  @Column({ type: 'timestamptz', name: 'read_at', nullable: true })
  readAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'acked_at', nullable: true })
  ackedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt!: Date | null;

  /**
   * 转换为 API 响应格式
   */
  toResponse() {
    return {
      notificationId: this.id,
      userId: this.userId,
      circleId: this.circleId,  // householdId = circleId
      type: this.type,
      severity: this.severity,
      title: this.title,
      body: this.body,
      deeplink: this.deeplinkRoute ? {
        route: this.deeplinkRoute,
        params: this.deeplinkParams,
      } : null,
      eventRef: this.eventRef,
      status: {
        deliveredPush: this.deliveredPush,
        deliveredInApp: this.deliveredInApp,
        readAt: this.readAt?.toISOString() ?? null,
        ackedAt: this.ackedAt?.toISOString() ?? null,
      },
      createdAt: this.createdAt.toISOString(),
      expiresAt: this.expiresAt?.toISOString() ?? null,
    };
  }
}
