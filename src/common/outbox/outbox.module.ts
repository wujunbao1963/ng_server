import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NgOutbox } from './ng-outbox.entity';
import { OutboxService } from './outbox.service';
import { OutboxWorker, OUTBOX_HANDLERS } from './outbox.worker';
import { PushNotificationHandler } from './push-notification.handler';
import { NgPushDevice } from '../../notifications/ng-push-device.entity';
import { NgNotification } from '../../notifications/ng-notification.entity';

/**
 * OutboxModule - Outbox 模式模块
 *
 * 提供：
 * - OutboxService: 消息入队和管理
 * - OutboxWorker: 消息消费者
 * - PushNotificationHandler: 推送通知处理器
 *
 * 使用方式：
 * 1. 在 AppModule 中导入
 * 2. 在业务事务中调用 outboxService.enqueue()
 * 3. Worker 自动处理消息
 *
 * 扩展 Handler：
 * ```typescript
 * @Injectable()
 * export class MyHandler implements OutboxHandler {
 *   readonly messageType = 'MY_TYPE';
 *   async handle(message: NgOutbox): Promise<ProcessResult> { ... }
 * }
 *
 * // 在 providers 中添加
 * {
 *   provide: OUTBOX_HANDLERS,
 *   useFactory: (h1, h2, myHandler) => [h1, h2, myHandler],
 *   inject: [PushNotificationHandler, ..., MyHandler],
 * }
 * ```
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([NgOutbox, NgPushDevice, NgNotification]),
  ],
  providers: [
    OutboxService,
    PushNotificationHandler,
    {
      provide: OUTBOX_HANDLERS,
      useFactory: (pushHandler: PushNotificationHandler) => [pushHandler],
      inject: [PushNotificationHandler],
    },
    OutboxWorker,
  ],
  exports: [OutboxService, OutboxWorker],
})
export class OutboxModule {}
