export type NotificationType = 'LOGISTICS_PARCEL_DELIVERED' | 'SECURITY_ALERT';
export type NotificationSeverity = 'info' | 'warning' | 'critical';
export interface EventRef {
    eventId: string;
    workflowClass?: string;
    siteId?: string;
    deviceId?: string;
    alarmState?: string;
}
export interface DeeplinkParams {
    eventId?: string;
    [key: string]: unknown;
}
export declare class NgNotification {
    id: string;
    userId: string;
    circleId: string;
    type: NotificationType;
    severity: NotificationSeverity;
    title: string;
    body: string | null;
    deeplinkRoute: string | null;
    deeplinkParams: DeeplinkParams | null;
    eventRef: EventRef | null;
    deliveredPush: boolean;
    deliveredInApp: boolean;
    readAt: Date | null;
    ackedAt: Date | null;
    createdAt: Date;
    expiresAt: Date | null;
    toResponse(): {
        notificationId: string;
        userId: string;
        circleId: string;
        type: NotificationType;
        severity: NotificationSeverity;
        title: string;
        body: string | null;
        deeplink: {
            route: string;
            params: DeeplinkParams | null;
        } | null;
        eventRef: EventRef | null;
        status: {
            deliveredPush: boolean;
            deliveredInApp: boolean;
            readAt: string | null;
            ackedAt: string | null;
        };
        createdAt: string;
        expiresAt: string | null;
    };
}
