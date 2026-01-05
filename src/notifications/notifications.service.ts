import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { NgNotification, NotificationType } from './ng-notification.entity';
import { NgPushDevice } from './ng-push-device.entity';
import { OutboxService, OutboxMessageType } from '../common/outbox';
import * as crypto from 'crypto';

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
   * 创建快递到达通知（带推送）
   * 
   * 去重规则：同一 (userId, eventId, type) 只创建一条
   * 
   * 使用 Outbox 模式保证：
   * 1. 通知创建和推送入队的原子性
   * 2. 推送失败可重试
   */
  async createParcelNotification(args: {
    userId: string;
    circleId: string;
    eventId: string;
    edgeInstanceId?: string;
    entryPointId?: string;
  }): Promise<NgNotification | null> {
    // 检查是否已存在（去重）- 在事务外检查避免长事务
    const existing = await this.notificationsRepo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId: args.userId })
      .andWhere('n.type = :type', { type: 'LOGISTICS_PARCEL_DELIVERED' })
      .andWhere("n.eventRef->>'eventId' = :eventId", { eventId: args.eventId })
      .getOne();

    if (existing) {
      this.logger.log(`Skipping duplicate parcel notification: eventId=${args.eventId}`);
      return existing;
    }

    // 在事务中同时创建通知和入队推送消息
    return this.dataSource.transaction(async (manager) => {
      return this.createNotificationWithOutbox(manager, args);
    });
  }

  /**
   * 在事务内创建通知并入队推送
   */
  private async createNotificationWithOutbox(
    manager: EntityManager,
    args: {
      userId: string;
      circleId: string;
      eventId: string;
      edgeInstanceId?: string;
      entryPointId?: string;
    },
  ): Promise<NgNotification> {
    const notificationsRepo = manager.getRepository(NgNotification);

    // 创建通知
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const notification = notificationsRepo.create({
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
      deliveredPush: false,
      deliveredInApp: true,
      expiresAt,
    });

    await notificationsRepo.save(notification);

    // 入队推送消息（同一事务）
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
  // Helpers
  // =========================================================================

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
  }
}
