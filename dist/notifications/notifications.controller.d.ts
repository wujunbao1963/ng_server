import { ConfigService } from '@nestjs/config';
import { JwtUser } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';
import { CirclesService } from '../circles/circles.service';
export declare class NotificationsController {
    private readonly svc;
    private readonly config;
    private readonly circlesService;
    constructor(svc: NotificationsService, config: ConfigService, circlesService: CirclesService);
    getVapidPublicKey(): Promise<{
        vapidPublicKey: string;
        pushEnabled: boolean;
    }>;
    registerPushDevice(req: {
        user: JwtUser;
    }, body: any): Promise<{
        ok: boolean;
        device: {
            pushDeviceId: string;
            platform: string;
            tokenHash: string;
            updatedAt: string;
        };
    }>;
    unregisterPushDevice(req: {
        user: JwtUser;
    }, pushDeviceId: string): Promise<{
        ok: boolean;
    }>;
    sendTestPush(req: {
        user: JwtUser;
    }): Promise<{
        success: boolean;
        notificationId: string;
        message: string;
    }>;
    listNotifications(req: {
        user: JwtUser;
    }, cursor?: string, limitStr?: string): Promise<{
        items: any[];
        nextCursor: string | null;
    }>;
    getNotification(req: {
        user: JwtUser;
    }, notificationId: string): Promise<{
        notification: {
            notificationId: string;
            userId: string;
            houseId: string;
            circleId: string;
            type: import("./ng-notification.entity").NotificationType;
            severity: import("./ng-notification.entity").NotificationSeverity;
            priority: import("./ng-notification.entity").NotificationPriority;
            roleContext: import("./ng-notification.entity").RoleContext | null;
            title: string;
            body: string | null;
            deeplink: {
                route: string;
                params: import("./ng-notification.entity").DeeplinkParams | null;
            } | null;
            eventRef: import("./ng-notification.entity").EventRef | null;
            preLevel: import("./ng-notification.entity").PreLevel | null;
            threatState: string | null;
            triggerReason: string | null;
            caseId: string | null;
            taskId: string | null;
            status: {
                deliveryStatus: import("./ng-notification.entity").DeliveryStatus;
                deliveredPush: boolean;
                deliveredInApp: boolean;
                sentAt: string | null;
                readAt: string | null;
                ackedAt: string | null;
            };
            createdAt: string;
            expiresAt: string | null;
        };
    }>;
    markRead(req: {
        user: JwtUser;
    }, notificationId: string, body: {
        read?: boolean;
    }): Promise<{
        ok: boolean;
        status: {
            readAt: null;
        };
    } | {
        ok: boolean;
        status: {
            readAt: string;
        };
    }>;
    acknowledgeNotification(req: {
        user: JwtUser;
    }, notificationId: string, body: {
        ack?: boolean;
    }): Promise<{
        ok: boolean;
        status: {
            ackedAt: null;
        };
    } | {
        ok: boolean;
        status: {
            ackedAt: string;
        };
    }>;
}
