export declare enum OutboxMessageType {
    PUSH_NOTIFICATION = "PUSH_NOTIFICATION",
    EMAIL_NOTIFICATION = "EMAIL_NOTIFICATION",
    WEBHOOK_DELIVERY = "WEBHOOK_DELIVERY"
}
export declare enum OutboxStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    DEAD = "DEAD"
}
export declare class NgOutbox {
    id: string;
    messageType: OutboxMessageType;
    status: OutboxStatus;
    payload: Record<string, any>;
    aggregateId?: string;
    aggregateType?: string;
    idempotencyKey?: string;
    scheduledAt: Date;
    retryCount: number;
    maxRetries: number;
    nextRetryAt?: Date;
    lastError?: string;
    startedAt?: Date;
    completedAt?: Date;
    processingTimeMs?: number;
    createdAt: Date;
    calculateNextRetryAt(): Date;
    canRetry(): boolean;
    toLogString(): string;
}
