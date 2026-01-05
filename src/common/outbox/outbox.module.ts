import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NgOutbox } from './ng-outbox.entity';
import { OutboxService } from './outbox.service';
import { OutboxWorker } from './outbox.worker';
import {
  PushNotificationHandler,
  OUTBOX_HANDLERS,
} from './push-notification.handler';
import { NgPushDevice } from '../../notifications/ng-push-device.entity';

/**
 * Outbox Module
 * 
 * 提供可靠消息投递的 Outbox 模式实现
 * 
 * 包含：
 * - OutboxService: 消息入队和管理
 * - OutboxWorker: 后台消息处理
 * - PushNotificationHandler: 推送通知处理器
 * 
 * 使用方式：
 * 1. 在业务 Service 中注入 OutboxService
 * 2. 在事务中调用 outboxService.enqueue(options, manager)
 * 3. Worker 自动处理消息
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([NgOutbox, NgPushDevice]),
  ],
  providers: [
    OutboxService,
    OutboxWorker,
    PushNotificationHandler,
    // 注入所有 handlers 到 Worker
    {
      provide: OUTBOX_HANDLERS,
      useFactory: (pushHandler: PushNotificationHandler) => [pushHandler],
      inject: [PushNotificationHandler],
    },
  ],
  exports: [OutboxService],
})
export class OutboxModule {}
