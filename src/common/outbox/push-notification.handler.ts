import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NgOutbox, OutboxMessageType } from './ng-outbox.entity';
import { OutboxHandler } from './outbox.worker';
import { ProcessResult } from './outbox.service';
import { NgLoggerService } from '../infra/logger.service';
import {
  PUSH_PROVIDER_PORT,
  PushProviderPort,
  PushPayload,
} from '../infra/push-provider.port';
import { NgPushDevice } from '../../notifications/ng-push-device.entity';
import { NgNotification } from '../../notifications/ng-notification.entity';

/**
 * PushNotification 消息载荷
 */
export interface PushNotificationPayload {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  priority?: 'normal' | 'high';
}

/**
 * PushNotificationHandler - 推送通知处理器
 *
 * 处理 PUSH_NOTIFICATION 类型的 Outbox 消息
 *
 * 职责：
 * 1. 获取用户的推送设备
 * 2. 发送推送
 * 3. 清理无效 token
 * 4. 更新通知状态
 */
@Injectable()
export class PushNotificationHandler implements OutboxHandler {
  readonly messageType: OutboxMessageType = 'PUSH_NOTIFICATION';
  private readonly logger: NgLoggerService;

  constructor(
    @InjectRepository(NgPushDevice)
    private readonly pushDevicesRepo: Repository<NgPushDevice>,
    @InjectRepository(NgNotification)
    private readonly notificationsRepo: Repository<NgNotification>,
    @Inject(PUSH_PROVIDER_PORT) private readonly pushProvider: PushProviderPort,
    logger: NgLoggerService,
  ) {
    this.logger = logger.setContext('PushNotificationHandler');
  }

  async handle(message: NgOutbox): Promise<ProcessResult> {
    const payload = message.payload as PushNotificationPayload;
    const logCtx = {
      messageId: message.id,
      notificationId: payload.notificationId,
      userId: payload.userId,
    };

    this.logger.log('Processing push notification', logCtx);

    // 1. 获取用户的推送设备
    const devices = await this.pushDevicesRepo.find({
      where: { userId: payload.userId },
    });

    if (devices.length === 0) {
      this.logger.log('No push devices found for user', logCtx);
      // 标记通知已处理（虽然没有设备）
      await this.updateNotificationDelivered(payload.notificationId);
      return { success: true };
    }

    // 2. 构建推送载荷
    const pushPayload: PushPayload = {
      title: payload.title,
      body: payload.body,
      data: payload.data,
      priority: payload.priority ?? 'normal',
    };

    // 3. 按平台分组发送
    const fcmDevices = devices.filter((d) => d.platform === 'android' || d.platform === 'fcm');
    const apnsDevices = devices.filter((d) => d.platform === 'ios' || d.platform === 'apns');

    const invalidTokens: string[] = [];
    let totalSuccess = 0;
    let totalFailure = 0;

    // 发送 FCM
    if (fcmDevices.length > 0) {
      try {
        const tokens = fcmDevices.map((d) => d.token);
        const result = await this.pushProvider.sendBatch(tokens, pushPayload, 'fcm');
        totalSuccess += result.successCount;
        totalFailure += result.failureCount;
        invalidTokens.push(...result.invalidTokens);
        this.logger.log('FCM batch sent', {
          ...logCtx,
          successCount: result.successCount,
          failureCount: result.failureCount,
        });
      } catch (error: any) {
        this.logger.error('FCM batch failed', error.message, logCtx);
        totalFailure += fcmDevices.length;
      }
    }

    // 发送 APNs
    if (apnsDevices.length > 0) {
      try {
        const tokens = apnsDevices.map((d) => d.token);
        const result = await this.pushProvider.sendBatch(tokens, pushPayload, 'apns');
        totalSuccess += result.successCount;
        totalFailure += result.failureCount;
        invalidTokens.push(...result.invalidTokens);
        this.logger.log('APNs batch sent', {
          ...logCtx,
          successCount: result.successCount,
          failureCount: result.failureCount,
        });
      } catch (error: any) {
        this.logger.error('APNs batch failed', error.message, logCtx);
        totalFailure += apnsDevices.length;
      }
    }

    // 4. 清理无效 token
    if (invalidTokens.length > 0) {
      await this.cleanupInvalidTokens(payload.userId, invalidTokens);
    }

    // 5. 更新通知状态
    if (totalSuccess > 0) {
      await this.updateNotificationDelivered(payload.notificationId);
    }

    // 6. 决定结果
    if (totalSuccess > 0) {
      return { success: true };
    } else if (totalFailure > 0) {
      // 全部失败，可重试
      return {
        success: false,
        error: `All ${totalFailure} push attempts failed`,
        retryable: true,
      };
    } else {
      // 没有设备，视为成功
      return { success: true };
    }
  }

  /**
   * 清理无效 token
   */
  private async cleanupInvalidTokens(userId: string, tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;

    this.logger.log('Cleaning up invalid tokens', {
      userId,
      tokenCount: tokens.length,
    });

    for (const token of tokens) {
      await this.pushDevicesRepo.delete({ userId, token });
    }
  }

  /**
   * 更新通知已投递状态
   */
  private async updateNotificationDelivered(notificationId: string): Promise<void> {
    await this.notificationsRepo.update(
      { id: notificationId },
      { deliveredPush: true },
    );
  }
}
