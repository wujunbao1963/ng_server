export type OutboxStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DEAD';
export type OutboxMessageType = 'PUSH_NOTIFICATION' | 'EMAIL_NOTIFICATION' | 'WEBHOOK_CALL' | 'EVENT_SYNC';
export declare class NgOutbox {
    id: string;
    messageType: OutboxMessageType;
    status: OutboxStatus;
    payload: Record<string, any>;
    aggregateId: string | null;
    aggregateType: string | null;
    idempotencyKey: string | null;
    scheduledAt: Date;
    retryCount: number;
    maxRetries: number;
    nextRetryAt: Date | null;
    lastError: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    processingTimeMs: number | null;
    createdAt: Date;
    calculateNextRetry(): Date;
    canRetry(): boolean;
}
