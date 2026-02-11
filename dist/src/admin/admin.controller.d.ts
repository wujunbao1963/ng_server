import { Repository } from 'typeorm';
import { AdminService, CreateUserDto, UpdateUserDto } from './admin.service';
import { EvidenceTicketsService } from '../evidence-tickets/evidence-tickets.service';
import { OutboxService } from '../common/outbox/outbox.service';
import { OutboxWorker } from '../common/outbox/outbox.worker';
import { NgOutbox, OutboxStatus } from '../common/outbox/ng-outbox.entity';
import { WebPushProvider } from '../infra/ports/web-push-provider';
import { NgNotification } from '../notifications/ng-notification.entity';
import { NgPushDevice } from '../notifications/ng-push-device.entity';
export declare class AdminController {
    private readonly adminService;
    private readonly evidenceTickets;
    private readonly outboxService;
    private readonly outboxWorker;
    private readonly webPushProvider;
    private readonly outboxRepo;
    private readonly notificationsRepo;
    private readonly pushDevicesRepo;
    constructor(adminService: AdminService, evidenceTickets: EvidenceTicketsService, outboxService: OutboxService, outboxWorker: OutboxWorker, webPushProvider: WebPushProvider, outboxRepo: Repository<NgOutbox>, notificationsRepo: Repository<NgNotification>, pushDevicesRepo: Repository<NgPushDevice>);
    getStats(): Promise<{
        users: {
            total: number;
            admins: number;
            owners: number;
        };
        circles: {
            total: number;
        };
        roles: {
            total: number;
        };
    }>;
    listUsers(limit?: string, offset?: string): Promise<{
        users: import("../auth/ng-user.entity").NgUser[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getUser(id: string): Promise<{
        user: import("../auth/ng-user.entity").NgUser;
        roles: {
            id: string;
            circleId: string;
            circleName: string;
            role: string;
            validFrom: Date;
            validUntil: Date | null;
            suspended: boolean;
        }[];
    }>;
    createUser(dto: CreateUserDto): Promise<{
        user: import("../auth/ng-user.entity").NgUser;
    }>;
    updateUser(id: string, dto: UpdateUserDto): Promise<{
        user: import("../auth/ng-user.entity").NgUser;
    }>;
    deleteUser(id: string): Promise<{
        deleted: boolean;
        userId: string;
    }>;
    grantOwner(id: string): Promise<{
        user: import("../auth/ng-user.entity").NgUser;
        changed: boolean;
        message: string;
    }>;
    revokeOwner(id: string): Promise<{
        user: import("../auth/ng-user.entity").NgUser;
        changed: boolean;
        message: string;
    }>;
    listCircles(limit?: string, offset?: string): Promise<{
        circles: {
            id: string;
            name: string;
            propertyType: string | null;
            address: string | null;
            city: string | null;
            createdAt: Date;
            memberCount: number;
            owner: {
                userId: string;
                email: string | null;
                displayName: string | null;
            } | null;
        }[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getCircle(id: string): Promise<{
        circle: import("../circles/ng-circle.entity").NgCircle;
        roles: {
            id: string;
            userId: string;
            email: string | null;
            displayName: string | null;
            role: string;
            validFrom: Date;
            validUntil: Date | null;
            suspended: boolean;
        }[];
    }>;
    cleanupExpiredTickets(): Promise<{
        deletedTickets: number;
        deletedLeases: number;
        message: string;
    }>;
    diagnosePush(): Promise<{
        timestamp: string;
        webPush: {
            configured: boolean;
            vapidPublicKeyPresent: boolean;
            vapidPublicKeyPrefix: string | null;
        };
        outbox: import("../common/outbox/outbox.service").OutboxStats;
        worker: import("../common/outbox/outbox.worker").WorkerStats;
        pushDevices: {
            total: number;
            byPlatform: any[];
        };
        recentNotifications: {
            id: string;
            type: import("../notifications/ng-notification.entity").NotificationType;
            severity: import("../notifications/ng-notification.entity").NotificationSeverity;
            title: string;
            deliveredPush: boolean;
            createdAt: Date;
        }[];
        recentFailures: {
            id: string;
            messageType: import("../common/outbox/ng-outbox.entity").OutboxMessageType;
            status: OutboxStatus;
            retryCount: number;
            maxRetries: number;
            lastError: string | undefined;
            createdAt: Date;
            payload: {
                notificationId: any;
                userId: any;
                title: any;
            };
        }[];
    }>;
    triggerOutboxPoll(): Promise<{
        message: string;
        outboxStats: import("../common/outbox/outbox.service").OutboxStats;
    }>;
    resetFailedOutbox(): Promise<{
        message: string;
        resetCount: number;
    }>;
    getOutboxMessages(status?: string, limitStr?: string): Promise<{
        count: number;
        messages: {
            id: string;
            messageType: import("../common/outbox/ng-outbox.entity").OutboxMessageType;
            status: OutboxStatus;
            retryCount: number;
            maxRetries: number;
            lastError: string | undefined;
            scheduledAt: Date;
            startedAt: Date | undefined;
            completedAt: Date | undefined;
            processingTimeMs: number | undefined;
            createdAt: Date;
            payload: Record<string, any>;
        }[];
    }>;
}
