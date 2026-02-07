import { Repository, DataSource } from 'typeorm';
import { NgWitnessAlert, WitnessAlertType, WitnessAlertPriority } from './ng-witness-alert.entity';
import { OutboxService } from '../common/outbox';
export interface CreateWitnessAlertDto {
    userId: string;
    type: WitnessAlertType;
    title: string;
    body?: string;
    priority?: WitnessAlertPriority;
    circleId?: string;
    taskId?: string;
    eventId?: string;
    actorUserId?: string;
    actorRole?: string;
    data?: Record<string, any>;
    expiresAt?: Date;
    push?: boolean;
}
export interface WitnessAlertListOptions {
    unreadOnly?: boolean;
    types?: WitnessAlertType[];
    circleId?: string;
    limit?: number;
    offset?: number;
}
export declare class WitnessAlertsService {
    private readonly alertsRepo;
    private readonly outboxService;
    private readonly dataSource;
    private readonly logger;
    constructor(alertsRepo: Repository<NgWitnessAlert>, outboxService: OutboxService, dataSource: DataSource);
    create(dto: CreateWitnessAlertDto): Promise<NgWitnessAlert>;
    createBatch(userIds: string[], dto: Omit<CreateWitnessAlertDto, 'userId'>): Promise<NgWitnessAlert[]>;
    listForUser(userId: string, options?: WitnessAlertListOptions): Promise<{
        alerts: NgWitnessAlert[];
        total: number;
        unreadCount: number;
    }>;
    getUnreadCount(userId: string): Promise<number>;
    markAsRead(userId: string, alertId: string): Promise<void>;
    markAllAsRead(userId: string): Promise<number>;
    delete(userId: string, alertId: string): Promise<void>;
    cleanupExpired(): Promise<number>;
    notifyTaskOffered(witnessUserIds: string[], task: {
        id: string;
        circleId: string;
        eventId?: string | null;
        title: string;
    }, creatorUserId: string): Promise<NgWitnessAlert[]>;
    notifyTaskClaimed(creatorUserId: string, task: {
        id: string;
        circleId: string;
        eventId?: string | null;
        title: string;
    }, witnessUserId: string): Promise<NgWitnessAlert>;
    notifyTaskArrived(creatorUserId: string, task: {
        id: string;
        circleId: string;
        eventId?: string | null;
        title: string;
    }, witnessUserId: string): Promise<NgWitnessAlert>;
    notifyTaskSubmitted(creatorUserId: string, task: {
        id: string;
        circleId: string;
        eventId?: string | null;
        title: string;
    }, witnessUserId: string, conclusion?: string): Promise<NgWitnessAlert>;
    notifyTaskCanceled(witnessUserId: string, task: {
        id: string;
        circleId: string;
        eventId?: string | null;
        title: string;
    }, canceledByUserId: string, canceledByRole: string, reason?: string): Promise<NgWitnessAlert>;
    notifyTaskRiskAborted(creatorUserId: string, task: {
        id: string;
        circleId: string;
        eventId?: string | null;
        title: string;
    }, witnessUserId: string, reason: string): Promise<NgWitnessAlert>;
    notifyTaskExpired(creatorUserId: string, task: {
        id: string;
        circleId: string;
        eventId?: string | null;
        title: string;
    }): Promise<NgWitnessAlert>;
    notifyTaskAbandoned(creatorUserId: string, task: {
        id: string;
        circleId: string;
        eventId?: string | null;
        title: string;
    }, witnessUserId: string, reason: string): Promise<NgWitnessAlert>;
}
