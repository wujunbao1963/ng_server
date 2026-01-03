import { Repository } from 'typeorm';
import { NgOutbox, OutboxMessageType } from './ng-outbox.entity';
import { OutboxHandler } from './outbox.worker';
import { ProcessResult } from './outbox.service';
import { NgLoggerService } from '../infra/logger.service';
import { PushProviderPort } from '../infra/push-provider.port';
import { NgPushDevice } from '../../notifications/ng-push-device.entity';
import { NgNotification } from '../../notifications/ng-notification.entity';
export interface PushNotificationPayload {
    notificationId: string;
    userId: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    priority?: 'normal' | 'high';
}
export declare class PushNotificationHandler implements OutboxHandler {
    private readonly pushDevicesRepo;
    private readonly notificationsRepo;
    private readonly pushProvider;
    readonly messageType: OutboxMessageType;
    private readonly logger;
    constructor(pushDevicesRepo: Repository<NgPushDevice>, notificationsRepo: Repository<NgNotification>, pushProvider: PushProviderPort, logger: NgLoggerService);
    handle(message: NgOutbox): Promise<ProcessResult>;
    private cleanupInvalidTokens;
    private updateNotificationDelivered;
}
