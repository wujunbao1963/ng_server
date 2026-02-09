import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { NgNotification, NotificationType, NotificationSeverity } from './ng-notification.entity';
import { NgPushDevice } from './ng-push-device.entity';
import { OutboxService, OutboxMessageType } from '../common/outbox';
import * as crypto from 'crypto';

/**
 * 通知优先级
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
 * 通知配置（简化版，存在内存中）
 */
interface NotificationConfig {
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  preThrottleWindowSec: number;
  preThrottleMax: number;
}

/**
 * 节流记录（简化版，存在内存中）
 */
const throttleCache = new Map<string, { count: number; windowStart: Date }>();

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NgNotification)
    private readonly notificationsRepo: Repository<NgNotification>,
    @InjectRepository(NgPushDevice)
    private readonly pushDevicesRepo: Repository<NgPushDevice>,
    private readonly outboxService: OutboxService,
    private readonly dataSource: DataSource,
  ) {}

  // =========================================================================
  // Push Device Management
  // =========================================================================

  async registerPushDevice(args: {
    userId: string;
    platform: string;
    token: string;
    deviceId?: string;
    appVersion?: string;
    locale?: string;
    timezone?: string;
  }): Promise<{ pushDeviceId: string; platform: string; tokenHash: string; updatedAt: string }> {
    const tokenHash = this.hashToken(args.token);

    // Upsert: 同一用户同一 token 更新，否则创建
    const existing = await this.pushDevicesRepo.findOne({
      where: { userId: args.userId, token: args.token },
    });

    if (existing) {
      existing.platform = args.platform;
      existing.deviceId = args.deviceId ?? null;
      existing.appVersion = args.appVersion ?? null;
      existing.locale = args.locale ?? null;
      existing.timezone = args.timezone ?? null;
      existing.updatedAt = new Date();
      await this.pushDevicesRepo.save(existing);
      return {
        pushDeviceId: existing.id,
        platform: existing.platform,
        tokenHash: `sha256:${tokenHash}`,
        updatedAt: existing.updatedAt.toISOString(),
      };
    }

    const device = this.pushDevicesRepo.create({
      userId: args.userId,
      platform: args.platform,
      token: args.token,
      deviceId: args.deviceId ?? null,
      appVersion: args.appVersion ?? null,
      locale: args.locale ?? null,
      timezone: args.timezone ?? null,
    });
    await this.pushDevicesRepo.save(device);

    return {
      pushDeviceId: device.id,
      platform: device.platform,
      tokenHash: `sha256:${tokenHash}`,
      updatedAt: device.createdAt.toISOString(),
    };
  }

  async unregisterPushDevice(userId: string, pushDeviceId: string): Promise<boolean> {
    const result = await this.pushDevicesRepo.delete({ id: pushDeviceId, userId });
    return (result.affected ?? 0) > 0;
  }

  async getUserPushDevices(userId: string): Promise<NgPushDevice[]> {
    return this.pushDevicesRepo.find({ where: { userId } });
  }

  // =========================================================================
  // Notifications CRUD
  // =========================================================================

  async listNotifications(
    userId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<{ items: any[]; nextCursor: string | null }> {
    const qb = this.notificationsRepo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .orderBy('n.createdAt', 'DESC')
      .take(limit + 1);

    if (cursor) {
      qb.andWhere('n.createdAt < :cursor', { cursor: new Date(cursor) });
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

    return {
      items: items.map((n) => n.toResponse()),
      nextCursor,
    };
  }

  async getNotification(userId: string, notificationId: string): Promise<NgNotification | null> {
    return this.notificationsRepo.findOne({
      where: { id: notificationId, userId },
    });
  }

  async markRead(userId: string, notificationId: string): Promise<{ readAt: string } | null> {
    const notification = await this.notificationsRepo.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) return null;

    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notificationsRepo.save(notification);
    }

    return { readAt: notification.readAt.toISOString() };
  }

  async markAcked(userId: string, notificationId: string): Promise<{ ackedAt: string } | null> {
    const notification = await this.notificationsRepo.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) return null;

    if (!notification.ackedAt) {
      notification.ackedAt = new Date();
      await this.notificationsRepo.save(notification);
    }

    return { ackedAt: notification.ackedAt.toISOString() };
  }

  // =========================================================================
  // Notification Creation (Server-side triggered)
  // =========================================================================

  /**
   * 创建安全警报通知（带推送）
   * 
   * 保持向后兼容 - edge-events.service.ts 调用此方法
   */
  async createSecurityNotification(args: {
    userId: string;
    circleId: string;
    eventId: string;
    edgeInstanceId?: string;
    entryPointId?: string;
    alarmState?: string;
    title?: string;
  }): Promise<NgNotification | null> {
    // 去重检查
    const existing = await this.notificationsRepo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId: args.userId })
      .andWhere('n.type = :type', { type: 'SECURITY_ALERT' })
      .andWhere("n.event_ref->>'eventId' = :eventId", { eventId: args.eventId })
      .getOne();

    if (existing) {
      this.logger.log(`Skipping duplicate security notification: eventId=${args.eventId}`);
      return existing;
    }

    return this.dataSource.transaction(async (manager) => {
      return this.createSecurityNotificationWithOutbox(manager, args);
    });
  }

  private async createSecurityNotificationWithOutbox(
    manager: EntityManager,
    args: {
      userId: string;
      circleId: string;
      eventId: string;
      edgeInstanceId?: string;
      entryPointId?: string;
      alarmState?: string;
      title?: string;
    },
  ): Promise<NgNotification> {
    const notificationsRepo = manager.getRepository(NgNotification);

    // 根据 alarmState 确定严重程度、优先级和标题
    const severityMap: Record<string, { 
      severity: NotificationSeverity; 
      priority: NotificationPriority;
      emoji: string; 
      label: string 
    }> = {
      'TRIGGERED': { severity: 'critical', priority: 'CRITICAL', emoji: '🚨', label: '入侵警报' },
      'PENDING': { severity: 'warning', priority: 'HIGH', emoji: '⚠️', label: '安全警报' },
      'PRE_L3': { severity: 'warning', priority: 'NORMAL', emoji: '⚠️', label: '高度可疑' },
      'PRE_L2': { severity: 'warning', priority: 'NORMAL', emoji: '⚡', label: '可疑活动' },
      'PRE_L1': { severity: 'info', priority: 'LOW', emoji: '👀', label: '轻微异常' },
      'PRE': { severity: 'warning', priority: 'NORMAL', emoji: '⚡', label: '可疑活动' },
    };

    const info = severityMap[args.alarmState || 'PENDING'] || severityMap['PENDING'];
    const title = args.title || `${info.emoji} ${info.label}`;
    const body = args.entryPointId 
      ? `在 ${args.entryPointId} 检测到异常活动` 
      : '检测到安全事件，请立即查看';

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const notification = notificationsRepo.create({
      userId: args.userId,
      circleId: args.circleId,
      type: 'SECURITY_ALERT' as NotificationType,
      severity: info.severity,
      title,
      body,
      deeplinkRoute: 'event_detail',
      deeplinkParams: { eventId: args.eventId },
      eventRef: {
        eventId: args.eventId,
        workflowClass: 'SECURITY',
        deviceId: args.edgeInstanceId,
        alarmState: args.alarmState,
      },
      deliveredPush: false,
      deliveredInApp: true,
      expiresAt,
    });

    await notificationsRepo.save(notification);

    // 入队推送消息
    await this.outboxService.enqueue(
      {
        messageType: OutboxMessageType.PUSH_NOTIFICATION,
        payload: {
          notificationId: notification.id,
          userId: notification.userId,
          title: notification.title,
          body: notification.body,
          data: {
            route: notification.deeplinkRoute,
            eventId: args.eventId,
            priority: info.priority,
          },
        },
        aggregateId: notification.id,
        aggregateType: 'Notification',
        idempotencyKey: `push:${notification.id}`,
      },
      manager,
    );

    this.logger.log(
      `Created security notification with push: ${notification.id} for eventId=${args.eventId} alarmState=${args.alarmState}`,
    );

    return notification;
  }

  /**
   * 创建快递到达通知（带推送）
   * 
   * 保持向后兼容 - edge-events.service.ts 调用此方法
   */
  async createParcelNotification(args: {
    userId: string;
    circleId: string;
    eventId: string;
    edgeInstanceId?: string;
    entryPointId?: string;
    confidence?: number;
  }): Promise<NgNotification | null> {
    const existing = await this.notificationsRepo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId: args.userId })
      .andWhere('n.type = :type', { type: 'LOGISTICS_PARCEL_DELIVERED' })
      .andWhere("n.event_ref->>'eventId' = :eventId", { eventId: args.eventId })
      .getOne();

    if (existing) {
      this.logger.log(`Skipping duplicate parcel notification: eventId=${args.eventId}`);
      return existing;
    }

    return this.dataSource.transaction(async (manager) => {
      return this.createParcelNotificationWithOutbox(manager, args);
    });
  }

  private async createParcelNotificationWithOutbox(
    manager: EntityManager,
    args: {
      userId: string;
      circleId: string;
      eventId: string;
      edgeInstanceId?: string;
      entryPointId?: string;
      confidence?: number;
    },
  ): Promise<NgNotification> {
    const notificationsRepo = manager.getRepository(NgNotification);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const isHighConfidence = (args.confidence ?? 1) >= 0.6;
    const title = isHighConfidence ? '📦 快递到达' : '📦 疑似快递';
    const body = args.entryPointId
      ? `在 ${args.entryPointId} ${isHighConfidence ? '检测到快递' : '检测到疑似快递活动'}`
      : (isHighConfidence ? '检测到快递到达' : '检测到疑似快递活动');

    const notification = notificationsRepo.create({
      userId: args.userId,
      circleId: args.circleId,
      type: 'LOGISTICS_PARCEL_DELIVERED' as NotificationType,
      severity: 'info' as NotificationSeverity,
      title,
      body,
      deeplinkRoute: 'event_detail',
      deeplinkParams: { eventId: args.eventId },
      eventRef: {
        eventId: args.eventId,
        workflowClass: 'LOGISTICS',
        deviceId: args.edgeInstanceId,
      },
      deliveredPush: false,
      deliveredInApp: true,
      expiresAt,
    });

    await notificationsRepo.save(notification);

    await this.outboxService.enqueue(
      {
        messageType: OutboxMessageType.PUSH_NOTIFICATION,
        payload: {
          notificationId: notification.id,
          userId: notification.userId,
          title: notification.title,
          body: notification.body,
          data: {
            route: notification.deeplinkRoute,
            eventId: args.eventId,
          },
        },
        aggregateId: notification.id,
        aggregateType: 'Notification',
        idempotencyKey: `push:${notification.id}`,
      },
      manager,
    );

    this.logger.log(
      `Created parcel notification with push: ${notification.id} for eventId=${args.eventId}`,
    );

    return notification;
  }

  // =========================================================================
  // 测试接口：发送测试通知
  // =========================================================================

  /**
   * 发送测试通知（用于调试 WebPush）
   */
  async sendTestNotification(userId: string, circleId: string): Promise<NgNotification> {
    const testEventId = `test-${Date.now()}`;
    
    const notification = await this.dataSource.transaction(async (manager) => {
      const notificationsRepo = manager.getRepository(NgNotification);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);

      const n = notificationsRepo.create({
        userId,
        circleId,
        type: 'SECURITY_ALERT' as NotificationType,
        severity: 'info' as NotificationSeverity,
        title: '🔔 测试通知',
        body: `这是一条测试推送 - ${new Date().toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
        deeplinkRoute: 'event_detail',
        deeplinkParams: { eventId: testEventId },
        eventRef: {
          eventId: testEventId,
          workflowClass: 'TEST',
        },
        deliveredPush: false,
        deliveredInApp: true,
        expiresAt,
      });

      await notificationsRepo.save(n);

      // 入队推送
      await this.outboxService.enqueue(
        {
          messageType: OutboxMessageType.PUSH_NOTIFICATION,
          payload: {
            notificationId: n.id,
            userId: n.userId,
            title: n.title,
            body: n.body,
            data: {
              route: n.deeplinkRoute,
              eventId: testEventId,
              isTest: true,
            },
          },
          aggregateId: n.id,
          aggregateType: 'Notification',
          idempotencyKey: `push:${n.id}`,
        },
        manager,
      );

      return n;
    });

    this.logger.log(`Created test notification: ${notification.id}`);
    return notification;
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
  }
}
