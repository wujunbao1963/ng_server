import { Repository, DataSource } from 'typeorm';
import { NgNotification } from './ng-notification.entity';
import { NgPushDevice } from './ng-push-device.entity';
import { OutboxService } from '../common/outbox';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
export type DeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'DEFERRED' | 'FAILED_RETRYABLE' | 'FAILED_FINAL';
export type RoleContext = 'owner' | 'caretaker' | 'acting_owner' | 'witness';
export type PreLevel = 'L0' | 'L1' | 'L2';
export declare class NotificationsService {
    private readonly notificationsRepo;
    private readonly pushDevicesRepo;
    private readonly outboxService;
    private readonly dataSource;
    private readonly logger;
    constructor(notificationsRepo: Repository<NgNotification>, pushDevicesRepo: Repository<NgPushDevice>, outboxService: OutboxService, dataSource: DataSource);
    registerPushDevice(args: {
        userId: string;
        platform: string;
        token: string;
        deviceId?: string;
        appVersion?: string;
        locale?: string;
        timezone?: string;
    }): Promise<{
        pushDeviceId: string;
        platform: string;
        tokenHash: string;
        updatedAt: string;
    }>;
    unregisterPushDevice(userId: string, pushDeviceId: string): Promise<boolean>;
    getUserPushDevices(userId: string): Promise<NgPushDevice[]>;
    listNotifications(userId: string, limit?: number, cursor?: string): Promise<{
        items: any[];
        nextCursor: string | null;
    }>;
    getNotification(userId: string, notificationId: string): Promise<NgNotification | null>;
    markRead(userId: string, notificationId: string): Promise<{
        readAt: string;
    } | null>;
    markAcked(userId: string, notificationId: string): Promise<{
        ackedAt: string;
    } | null>;
    createSecurityNotification(args: {
        userId: string;
        circleId: string;
        eventId: string;
        edgeInstanceId?: string;
        entryPointId?: string;
        alarmState?: string;
        title?: string;
    }): Promise<NgNotification | null>;
    private createSecurityNotificationWithOutbox;
    createParcelNotification(args: {
        userId: string;
        circleId: string;
        eventId: string;
        edgeInstanceId?: string;
        entryPointId?: string;
        confidence?: number;
    }): Promise<NgNotification | null>;
    private createParcelNotificationWithOutbox;
    sendTestNotification(userId: string, circleId: string): Promise<NgNotification>;
    private hashToken;
}
