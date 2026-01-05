import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NgOutbox, OutboxMessageType } from './ng-outbox.entity';
import { NgPushDevice } from '../../notifications/ng-push-device.entity';
import {
  PushProviderPort,
  PUSH_PROVIDER_PORT,
  PushPayload,
} from '../../infra/ports/push-provider.port';

/**
 * Outbox 消息处理器接口
 */
export interface OutboxHandler {
  /** 支持的消息类型 */
  readonly messageType: OutboxMessageType;

  /**
   * 处理消息
   * 
   * @param message Outbox 消息
   * @throws 抛出错误表示处理失败
   */
  handle(message: NgOutbox): Promise<void>;
}

/**
 * 处理结果（用于区分可重试和不可重试错误）
 */
export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

/**
 * 推送通知处理器
 * 
 * 职责：
 * 1. 从 Outbox payload 提取推送信息
 * 2. 查询用户的推送设备
 * 3. 调用 PushProviderPort 发送推送
 * 4. 处理无效 token（移除设备）
 */
@Injectable()
export class PushNotificationHandler implements OutboxHandler {
  readonly messageType = OutboxMessageType.PUSH_NOTIFICATION;
  private readonly logger = new Logger(PushNotificationHandler.name);

  constructor(
    @Inject(PUSH_PROVIDER_PORT)
    private readonly pushProvider: PushProviderPort,
    @InjectRepository(NgPushDevice)
    private readonly pushDevicesRepo: Repository<NgPushDevice>,
  ) {}

  async handle(message: NgOutbox): Promise<void> {
    const { notificationId, userId, title, body, data } = message.payload;

    if (!userId || !title || !body) {
      throw new NonRetryableError('Missing required fields: userId, title, body');
    }

    // 获取用户的所有推送设备
    const devices = await this.pushDevicesRepo.find({
      where: { userId },
    });

    if (devices.length === 0) {
      this.logger.debug(`No push devices for user ${userId}, skipping`);
      return; // 无设备不算失败
    }

    const payload: PushPayload = {
      title,
      body,
      data: {
        notificationId: notificationId ?? '',
        ...data,
      },
    };

    // 发送到所有设备
    const tokens = devices.map(d => d.token);
    const results = await this.pushProvider.sendBatch(tokens, payload);

    // 处理结果
    let successCount = 0;
    let failCount = 0;
    const tokensToRemove: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const device = devices[i];

      if (result.success) {
        successCount++;
        this.logger.debug(`Push sent to device ${device.id}: messageId=${result.messageId}`);
      } else {
        failCount++;
        this.logger.warn(`Push failed to device ${device.id}: ${result.error}`);

        if (result.shouldRemoveToken) {
          tokensToRemove.push(device.id);
        }
      }
    }

    // 移除无效设备
    if (tokensToRemove.length > 0) {
      await this.pushDevicesRepo.delete(tokensToRemove);
      this.logger.log(`Removed ${tokensToRemove.length} invalid push devices`);
    }

    // 只要有一个成功就认为消息处理成功
    if (successCount === 0 && failCount > 0) {
      throw new Error(`All ${failCount} push deliveries failed`);
    }

    this.logger.log(
      `Push notification sent: notificationId=${notificationId} ` +
      `success=${successCount} failed=${failCount}`
    );
  }
}

/**
 * 所有 Handler 的注入 Token
 */
export const OUTBOX_HANDLERS = Symbol('OUTBOX_HANDLERS');
