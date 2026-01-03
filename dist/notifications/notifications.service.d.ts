import { DataSource, Repository, EntityManager } from 'typeorm';
import { NgNotification, NotificationType } from './ng-notification.entity';
import { NgPushDevice } from './ng-push-device.entity';
import { NgLoggerService } from '../common/infra/logger.service';
import { ClockPort } from '../common/infra/clock.port';
import { OutboxService } from '../common/outbox';
export declare class NotificationsService {
    private readonly dataSource;
    private readonly notificationsRepo;
    private readonly pushDevicesRepo;
    private readonly clock;
    private readonly outboxService;
    private readonly logger;
    constructor(dataSource: DataSource, notificationsRepo: Repository<NgNotification>, pushDevicesRepo: Repository<NgPushDevice>, clock: ClockPort, outboxService: OutboxService, logger: NgLoggerService);
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
    createParcelNotification(args: {
        userId: string;
        circleId: string;
        eventId: string;
        edgeInstanceId?: string;
        entryPointId?: string;
    }): Promise<NgNotification | null>;
    createNotificationWithOutbox(manager: EntityManager, args: {
        userId: string;
        circleId: string;
        type: NotificationType;
        severity: 'info' | 'warning' | 'critical';
        title: string;
        body: string;
        deeplinkRoute?: string;
        deeplinkParams?: Record<string, any>;
        eventRef?: Record<string, any>;
    }): Promise<NgNotification>;
    private hashToken;
}
