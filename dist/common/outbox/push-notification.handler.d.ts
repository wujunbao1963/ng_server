import { Repository } from 'typeorm';
import { NgOutbox, OutboxMessageType } from './ng-outbox.entity';
import { NgPushDevice } from '../../notifications/ng-push-device.entity';
import { WebPushProvider } from '../../infra/ports/web-push-provider';
import { ApnsPushProvider } from '../../infra/ports/apns-push-provider';
export interface OutboxHandler {
    readonly messageType: OutboxMessageType;
    handle(message: NgOutbox): Promise<void>;
}
export declare class NonRetryableError extends Error {
    constructor(message: string);
}
export declare class PushNotificationHandler implements OutboxHandler {
    private readonly webPushProvider;
    private readonly apnsPushProvider;
    private readonly pushDevicesRepo;
    readonly messageType = OutboxMessageType.PUSH_NOTIFICATION;
    private readonly logger;
    constructor(webPushProvider: WebPushProvider, apnsPushProvider: ApnsPushProvider, pushDevicesRepo: Repository<NgPushDevice>);
    handle(message: NgOutbox): Promise<void>;
}
export declare const OUTBOX_HANDLERS: unique symbol;
