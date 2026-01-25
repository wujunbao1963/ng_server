export type NotificationType = 'LOGISTICS_DELIVERY' | 'SECURITY_PRE_ALERT' | 'SECURITY_PENDING_ALERT' | 'SECURITY_TRIGGERED_ALARM' | 'LIFE_SAFETY_ALARM' | 'SECURITY_TAMPER_ALERT' | 'EDGE_HEALTH_DEGRADED' | 'EDGE_OFFLINE' | 'COLLAB_REQUEST' | 'COLLAB_UPDATE' | 'TASK_ACCEPTED' | 'TASK_ON_SITE_CONFIRMED' | 'TASK_FEEDBACK_SUBMITTED' | 'TASK_COMPLETED' | 'TASK_EXPIRED' | 'TASK_CANCELED' | 'TASK_RISK_ABORTED' | 'RESOLVER_TAKEN_OVER' | 'ACTING_OWNER_ACTION_NOTICE' | 'LOGISTICS_PARCEL_DELIVERED' | 'SECURITY_ALERT';
export type NotificationSeverity = 'info' | 'warning' | 'critical';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
export type DeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'DEFERRED' | 'FAILED_RETRYABLE' | 'FAILED_FINAL';
export type RoleContext = 'owner' | 'caretaker' | 'acting_owner' | 'witness';
export type PreLevel = 'L0' | 'L1' | 'L2';
export interface EventRef {
    eventId: string;
    workflowClass?: string;
    siteId?: string;
    deviceId?: string;
    alarmState?: string;
    threatState?: string;
    triggerReason?: string;
    preLevel?: PreLevel;
    entryDelaySec?: number;
}
export interface DeeplinkParams {
    eventId?: string;
    taskId?: string;
    caseId?: string;
    [key: string]: unknown;
}
export declare class NgNotification {
    id: string;
    userId: string;
    circleId: string;
    houseId: string | null;
    type: NotificationType;
    severity: NotificationSeverity;
    priority: NotificationPriority;
    roleContext: RoleContext | null;
    title: string;
    body: string | null;
    deeplinkRoute: string | null;
    deeplinkParams: DeeplinkParams | null;
    eventRef: EventRef | null;
    preLevel: PreLevel | null;
    threatState: string | null;
    triggerReason: string | null;
    caseId: string | null;
    taskId: string | null;
    deliveryStatus: DeliveryStatus;
    deliveredPush: boolean;
    deliveredInApp: boolean;
    sentAt: Date | null;
    deferredUntil: Date | null;
    retryCount: number;
    lastError: string | null;
    readAt: Date | null;
    ackedAt: Date | null;
    createdAt: Date;
    expiresAt: Date | null;
    toResponse(): {
        notificationId: string;
        userId: string;
        houseId: string;
        circleId: string;
        type: NotificationType;
        severity: NotificationSeverity;
        priority: NotificationPriority;
        roleContext: RoleContext | null;
        title: string;
        body: string | null;
        deeplink: {
            route: string;
            params: DeeplinkParams | null;
        } | null;
        eventRef: EventRef | null;
        preLevel: PreLevel | null;
        threatState: string | null;
        triggerReason: string | null;
        caseId: string | null;
        taskId: string | null;
        status: {
            deliveryStatus: DeliveryStatus;
            deliveredPush: boolean;
            deliveredInApp: boolean;
            sentAt: string | null;
            readAt: string | null;
            ackedAt: string | null;
        };
        createdAt: string;
        expiresAt: string | null;
    };
}
export declare class NgNotificationConfig {
    id: string;
    houseId: string;
    quietHoursEnabled: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    quietHoursTimezone: string;
    caretakerAlertMode: 'CONCURRENT' | 'DELAYED' | 'OWNER_UNREACHABLE';
    caretakerDelaySec: number;
    preThrottleWindowSec: number;
    preThrottleMax: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare class NgNotificationThrottle {
    id: string;
    houseId: string;
    throttleKey: string;
    notificationCount: number;
    windowStart: Date;
    lastNotificationAt: Date;
}
