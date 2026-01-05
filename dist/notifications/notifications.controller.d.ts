import { JwtUser } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly svc;
    constructor(svc: NotificationsService);
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
            circleId: string;
            type: import("./ng-notification.entity").NotificationType;
            severity: import("./ng-notification.entity").NotificationSeverity;
            title: string;
            body: string | null;
            deeplink: {
                route: string;
                params: import("./ng-notification.entity").DeeplinkParams | null;
            } | null;
            eventRef: import("./ng-notification.entity").EventRef | null;
            status: {
                deliveredPush: boolean;
                deliveredInApp: boolean;
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
