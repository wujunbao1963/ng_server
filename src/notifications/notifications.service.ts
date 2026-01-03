import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, EntityManager } from 'typeorm';
import { NgNotification, NotificationType } from './ng-notification.entity';
import { NgPushDevice } from './ng-push-device.entity';
import * as crypto from 'crypto';
import { NgLoggerService } from '../common/infra/logger.service';
import { CLOCK_PORT, ClockPort } from '../common/infra/clock.port';
import { OutboxService, PushNotificationPayload } from '../common/outbox';

@Injectable()
export class NotificationsService {
  private readonly logger: NgLoggerService;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(NgNotification)
    private readonly notificationsRepo: Repository<NgNotification>,
    @InjectRepository(NgPushDevice)
    private readonly pushDevicesRepo: Repository<NgPushDevice>,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    private readonly outboxService: OutboxService,
    logger: NgLoggerService,
  ) {
    this.logger = logger.setContext('NotificationsService');
  }

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
      // cursor 是上一页最后一条的 createdAt ISO 字符串
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
   * 创建快递到达通知
   * 
   * 使用 Outbox 模式确保：
   * 1. 通知和推送消息在同一事务中写入
   * 2. Worker 异步处理推送
   * 3. 失败自动重试
   * 
   * 去重规则：同一 (userId, eventId, type) 只创建一条
   */
  async createParcelNotification(args: {
    userId: string;
    circleId: string;
    eventId: string;
    edgeInstanceId?: string;
    entryPointId?: string;
  }): Promise<NgNotification | null> {
    const logCtx = {
      userId: args.userId,
      circleId: args.circleId,
      eventId: args.eventId,
    };

    // 检查是否已存在（去重）
    const existing = await this.notificationsRepo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId: args.userId })
      .andWhere('n.type = :type', { type: 'LOGISTICS_PARCEL_DELIVERED' })
      .andWhere("n.eventRef->>'eventId' = :eventId", { eventId: args.eventId })
      .getOne();

    if (existing) {
      this.logger.log('Skipping duplicate parcel notification', logCtx);
      return existing;
    }

    // 在事务中创建通知 + Outbox 消息
    const notification = await this.dataSource.transaction(async (manager) => {
      return this.createNotificationWithOutbox(manager, {
        userId: args.userId,
        circleId: args.circleId,
        type: 'LOGISTICS_PARCEL_DELIVERED' as NotificationType,
        severity: 'info',
        title: '📦 快递到达',
        body: args.entryPointId ? `在 ${args.entryPointId} 检测到快递` : '检测到快递到达',
        deeplinkRoute: 'event_detail',
        deeplinkParams: { eventId: args.eventId },
        eventRef: {
          eventId: args.eventId,
          workflowClass: 'LOGISTICS',
          deviceId: args.edgeInstanceId,
        },
      });
    });

    this.logger.log('Created parcel notification with outbox', {
      ...logCtx,
      notificationId: notification.id,
    });

    return notification;
  }

  /**
   * 在事务中创建通知并入队推送消息
   * 
   * 这是创建需要推送的通知的标准方法
   */
  async createNotificationWithOutbox(
    manager: EntityManager,
    args: {
      userId: string;
      circleId: string;
      type: NotificationType;
      severity: 'info' | 'warning' | 'critical';
      title: string;
      body: string;
      deeplinkRoute?: string;
      deeplinkParams?: Record<string, any>;
      eventRef?: Record<string, any>;
    },
  ): Promise<NgNotification> {
    const expiresAt = this.clock.after(7 * 24 * 60 * 60); // 7天后过期

    // 1. 创建通知
    const notificationRepo = manager.getRepository(NgNotification);
    const notification = notificationRepo.create({
      userId: args.userId,
      circleId: args.circleId,
      type: args.type,
      severity: args.severity,
      title: args.title,
      body: args.body,
      deeplinkRoute: args.deeplinkRoute,
      deeplinkParams: args.deeplinkParams,
      eventRef: args.eventRef,
      deliveredPush: false,
      deliveredInApp: true,
      expiresAt,
    });
    await notificationRepo.save(notification);

    // 2. 入队推送消息
    const pushPayload: PushNotificationPayload = {
      notificationId: notification.id,
      userId: args.userId,
      title: args.title,
      body: args.body,
      data: {
        notificationId: notification.id,
        type: args.type,
        circleId: args.circleId,
        deeplinkRoute: args.deeplinkRoute ?? '',
        deeplinkParams: JSON.stringify(args.deeplinkParams ?? {}),
      },
      priority: args.severity === 'critical' ? 'high' : 'normal',
    };

    await this.outboxService.enqueue(
      {
        messageType: 'PUSH_NOTIFICATION',
        payload: pushPayload,
        aggregateId: notification.id,
        aggregateType: 'Notification',
        idempotencyKey: `push:${notification.id}`,
      },
      manager,
    );

    return notification;
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
  }
}
