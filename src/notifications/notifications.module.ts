import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NgNotification, NgNotificationConfig, NgNotificationThrottle } from './ng-notification.entity';
import { NgPushDevice } from './ng-push-device.entity';
import { OutboxModule } from '../common/outbox';
import { CirclesModule } from '../circles/circles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NgNotification,
      NgPushDevice,
      NgNotificationConfig,
      NgNotificationThrottle,
    ]),
    OutboxModule,
    CirclesModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
