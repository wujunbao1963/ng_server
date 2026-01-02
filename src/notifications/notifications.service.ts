import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NgNotification, NotificationType } from './ng-notification.entity';
import { NgPushDevice } from './ng-push-device.entity';
import * as crypto from 'crypto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NgNotification)
    private readonly notificationsRepo: Repository<NgNotification>,
    @InjectRepository(NgPushDevice)
    private readonly pushDevicesRepo: Repository<NgPushDevice>,
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
   * 创建快递到达通知
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
    // 检查是否已存在（去重）
    // 注意：JSONB 查询需要使用数据库列名 event_ref，普通列使用 Entity 属性名
    const existing = await this.notificationsRepo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId: args.userId })
      .andWhere('n.type = :type', { type: 'LOGISTICS_PARCEL_DELIVERED' })
      .andWhere("n.eventRef->>'eventId' = :eventId", { eventId: args.eventId })
      .getOne();

    if (existing) {
      console.log(`[Notifications] Skipping duplicate parcel notification: eventId=${args.eventId}`);
      return existing;
    }

    // 创建新通知
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期

    const notification = this.notificationsRepo.create({
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

    await this.notificationsRepo.save(notification);
    console.log(`[Notifications] Created parcel notification: ${notification.id} for eventId=${args.eventId}`);

    // TODO: 触发推送（Phase 2）
    // await this.sendPushNotification(notification);

    return notification;
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
  }
}
