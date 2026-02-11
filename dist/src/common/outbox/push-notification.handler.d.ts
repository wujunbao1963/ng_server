import { Repository } from 'typeorm';
import { NgOutbox, OutboxMessageType } from './ng-outbox.entity';
import { NgPushDevice } from '../../notifications/ng-push-device.entity';
import { PushProviderPort } from '../../infra/ports/push-provider.port';
export interface OutboxHandler {
    readonly messageType: OutboxMessageType;
    handle(message: NgOutbox): Promise<void>;
}
export declare class NonRetryableError extends Error {
    constructor(message: string);
}
export declare class PushNotificationHandler implements OutboxHandler {
    private readonly pushProvider;
    private readonly pushDevicesRepo;
    readonly messageType = OutboxMessageType.PUSH_NOTIFICATION;
    private readonly logger;
    constructor(pushProvider: PushProviderPort, pushDevicesRepo: Repository<NgPushDevice>);
    handle(message: NgOutbox): Promise<void>;
}
export declare const OUTBOX_HANDLERS: unique symbol;
