import { Repository, DataSource } from 'typeorm';
import { NgNotification, NgNotificationConfig, NgNotificationThrottle, NotificationType, NotificationPriority, NotificationSeverity, RoleContext, PreLevel } from './ng-notification.entity';
import { OutboxService } from '../common/outbox';
export interface EdgeEventInput {
    eventId: string;
    circleId: string;
    edgeInstanceId: string;
    threatState: string;
    triggerReason?: string;
    workflowClass?: string;
    mode?: string;
    entryPointId?: string;
    preLevel?: PreLevel;
    entryDelaySec?: number;
    confidence?: number;
    notificationEligible?: boolean;
    notificationHint?: {
        suppressReason?: 'MODE_HOME' | 'MODE_DISARM' | 'BELOW_THRESHOLD' | null;
        preLevel?: PreLevel;
    };
}
export interface NotificationEvaluation {
    shouldNotify: boolean;
    notificationType?: NotificationType;
    priority?: NotificationPriority;
    severity?: NotificationSeverity;
    preLevel?: PreLevel;
    recipients?: RecipientInfo[];
    throttled?: boolean;
    deferred?: boolean;
    deferredUntil?: Date;
    reason?: string;
    edgeDecided?: boolean;
}
export interface RecipientInfo {
    userId: string;
    role: RoleContext;
    delaySec?: number;
}
export interface NotificationContent {
    title: string;
    body: string;
    emoji: string;
}
export declare class NotificationEvaluator {
    private readonly notificationsRepo;
    private readonly configRepo;
    private readonly throttleRepo;
    private readonly outboxService;
    private readonly dataSource;
    private readonly logger;
    constructor(notificationsRepo: Repository<NgNotification>, configRepo: Repository<NgNotificationConfig>, throttleRepo: Repository<NgNotificationThrottle>, outboxService: OutboxService, dataSource: DataSource);
    evaluateEdgeEvent(input: EdgeEventInput): Promise<NotificationEvaluation>;
    private mapToNotificationType;
    private getPriority;
    private getSeverity;
    private isAllowedInHomeMode;
    private checkThrottle;
    private isThrottled;
    private checkQuietHours;
    private calculateDeferredUntil;
    private getOrCreateConfig;
    generateContent(type: NotificationType, input: EdgeEventInput): NotificationContent;
}
