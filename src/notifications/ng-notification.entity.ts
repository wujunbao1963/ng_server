import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 通知类型枚举 - 根据 NG_NOTIFICATION_SUBSYSTEM_SPEC_v1.1
 */
export type NotificationType =
  // Logistics / Non-Security
  | 'LOGISTICS_DELIVERY'
  // Security (Edge-Authoritative)
  | 'SECURITY_PRE_ALERT'
  | 'SECURITY_PENDING_ALERT'
  | 'SECURITY_TRIGGERED_ALARM'
  | 'LIFE_SAFETY_ALARM'
  | 'SECURITY_TAMPER_ALERT'
  // System Health
  | 'EDGE_HEALTH_DEGRADED'
  | 'EDGE_OFFLINE'
  // Collaboration / L2 Community
  | 'COLLAB_REQUEST'
  | 'COLLAB_UPDATE'
  | 'TASK_ACCEPTED'
  | 'TASK_ON_SITE_CONFIRMED'
  | 'TASK_FEEDBACK_SUBMITTED'
  | 'TASK_COMPLETED'
  | 'TASK_EXPIRED'
  | 'TASK_CANCELED'
  | 'TASK_RISK_ABORTED'
  // Resolver & Delegated Authority
  | 'RESOLVER_TAKEN_OVER'
  | 'ACTING_OWNER_ACTION_NOTICE'
  // Legacy (for backward compatibility)
  | 'LOGISTICS_PARCEL_DELIVERED'
  | 'SECURITY_ALERT';

/**
 * 通知严重程度
 */
export type NotificationSeverity = 'info' | 'warning' | 'critical';

/**
 * 通知优先级 - 根据 NG_NOTIFICATION_SUBSYSTEM_SPEC_v1.1 §5.1
 */
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

/**
 * 投递状态
 */
export type DeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'DEFERRED' | 'FAILED_RETRYABLE' | 'FAILED_FINAL';

/**
 * 角色上下文
 */
export type RoleContext = 'owner' | 'caretaker' | 'acting_owner' | 'witness';

/**
 * PRE 级别
 */
export type PreLevel = 'L0' | 'L1' | 'L2';

/**
 * 事件引用
 */
export interface EventRef {
  eventId: string;
  workflowClass?: string;
  siteId?: string;
  deviceId?: string;
  alarmState?: string;
  threatState?: string;
  triggerReason?: string;
  preLevel?: PreLevel;
  entryDelaySec?: number;
}

/**
 * Deeplink 参数
 */
export interface DeeplinkParams {
  eventId?: string;
  taskId?: string;
  caseId?: string;
  [key: string]: unknown;
}

/**
 * 通知实体 - 扩展版本
 */
@Entity('ng_notifications')
@Index('idx_ng_notifications_user', ['userId', 'createdAt'])
@Index('idx_ng_notifications_circle', ['circleId', 'createdAt'])
@Index('idx_ng_notifications_house_type', ['houseId', 'type'])
@Index('idx_ng_notifications_delivery_status', ['deliveryStatus'])
export class NgNotification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'uuid', name: 'circle_id' })
  circleId!: string;

  @Column({ type: 'uuid', name: 'house_id', nullable: true })
  houseId!: string | null;

  @Column({ type: 'text' })
  type!: NotificationType;

  @Column({ type: 'text', default: 'info' })
  severity!: NotificationSeverity;

  @Column({ type: 'text', default: 'NORMAL' })
  priority!: NotificationPriority;

  @Column({ type: 'text', name: 'role_context', nullable: true })
  roleContext!: RoleContext | null;

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

  // PRE specific
  @Column({ type: 'text', name: 'pre_level', nullable: true })
  preLevel!: PreLevel | null;

  @Column({ type: 'text', name: 'threat_state', nullable: true })
  threatState!: string | null;

  @Column({ type: 'text', name: 'trigger_reason', nullable: true })
  triggerReason!: string | null;

  // Task specific
  @Column({ type: 'uuid', name: 'case_id', nullable: true })
  caseId!: string | null;

  @Column({ type: 'uuid', name: 'task_id', nullable: true })
  taskId!: string | null;

  // Delivery tracking
  @Column({ type: 'text', name: 'delivery_status', default: 'PENDING' })
  deliveryStatus!: DeliveryStatus;

  @Column({ type: 'boolean', name: 'delivered_push', default: false })
  deliveredPush!: boolean;

  @Column({ type: 'boolean', name: 'delivered_in_app', default: true })
  deliveredInApp!: boolean;

  @Column({ type: 'timestamptz', name: 'sent_at', nullable: true })
  sentAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'deferred_until', nullable: true })
  deferredUntil!: Date | null;

  @Column({ type: 'int', name: 'retry_count', default: 0 })
  retryCount!: number;

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError!: string | null;

  // User interaction
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
      houseId: this.houseId || this.circleId,
      circleId: this.circleId,
      type: this.type,
      severity: this.severity,
      priority: this.priority,
      roleContext: this.roleContext,
      title: this.title,
      body: this.body,
      deeplink: this.deeplinkRoute ? {
        route: this.deeplinkRoute,
        params: this.deeplinkParams,
      } : null,
      eventRef: this.eventRef,
      preLevel: this.preLevel,
      threatState: this.threatState,
      triggerReason: this.triggerReason,
      caseId: this.caseId,
      taskId: this.taskId,
      status: {
        deliveryStatus: this.deliveryStatus,
        deliveredPush: this.deliveredPush,
        deliveredInApp: this.deliveredInApp,
        sentAt: this.sentAt?.toISOString() ?? null,
        readAt: this.readAt?.toISOString() ?? null,
        ackedAt: this.ackedAt?.toISOString() ?? null,
      },
      createdAt: this.createdAt.toISOString(),
      expiresAt: this.expiresAt?.toISOString() ?? null,
    };
  }
}

/**
 * 通知配置 Entity
 */
@Entity('ng_notification_config')
export class NgNotificationConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'house_id', unique: true })
  houseId!: string;

  // Quiet Hours
  @Column({ type: 'boolean', name: 'quiet_hours_enabled', default: false })
  quietHoursEnabled!: boolean;

  @Column({ type: 'time', name: 'quiet_hours_start', nullable: true })
  quietHoursStart!: string | null;

  @Column({ type: 'time', name: 'quiet_hours_end', nullable: true })
  quietHoursEnd!: string | null;

  @Column({ type: 'text', name: 'quiet_hours_timezone', default: 'UTC' })
  quietHoursTimezone!: string;

  // Caretaker Alert Mode
  @Column({ type: 'text', name: 'caretaker_alert_mode', default: 'CONCURRENT' })
  caretakerAlertMode!: 'CONCURRENT' | 'DELAYED' | 'OWNER_UNREACHABLE';

  @Column({ type: 'int', name: 'caretaker_delay_sec', default: 300 })
  caretakerDelaySec!: number;

  // Throttling
  @Column({ type: 'int', name: 'pre_throttle_window_sec', default: 120 })
  preThrottleWindowSec!: number;

  @Column({ type: 'int', name: 'pre_throttle_max', default: 1 })
  preThrottleMax!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'updated_at', default: () => 'now()' })
  updatedAt!: Date;
}

/**
 * 通知节流 Entity
 */
@Entity('ng_notification_throttle')
@Index('idx_ng_notification_throttle_cleanup', ['windowStart'])
export class NgNotificationThrottle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'house_id' })
  houseId!: string;

  @Column({ type: 'text', name: 'throttle_key' })
  throttleKey!: string;

  @Column({ type: 'int', name: 'notification_count', default: 1 })
  notificationCount!: number;

  @Column({ type: 'timestamptz', name: 'window_start', default: () => 'now()' })
  windowStart!: Date;

  @Column({ type: 'timestamptz', name: 'last_notification_at', default: () => 'now()' })
  lastNotificationAt!: Date;
}
