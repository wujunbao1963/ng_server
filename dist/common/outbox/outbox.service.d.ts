import { Repository, EntityManager } from 'typeorm';
import { NgOutbox, OutboxStatus, OutboxMessageType } from './ng-outbox.entity';
export interface EnqueueOptions {
    messageType: OutboxMessageType;
    payload: Record<string, any>;
    aggregateId?: string;
    aggregateType?: string;
    idempotencyKey?: string;
    scheduledAt?: Date;
    maxRetries?: number;
}
export interface OutboxStats {
    [OutboxStatus.PENDING]: number;
    [OutboxStatus.PROCESSING]: number;
    [OutboxStatus.COMPLETED]: number;
    [OutboxStatus.FAILED]: number;
    [OutboxStatus.DEAD]: number;
}
export declare class OutboxService {
    private readonly outboxRepo;
    private readonly logger;
    constructor(outboxRepo: Repository<NgOutbox>);
    enqueue(options: EnqueueOptions, manager?: EntityManager): Promise<NgOutbox>;
    fetchPendingMessages(batchSize?: number, messageTypes?: OutboxMessageType[]): Promise<NgOutbox[]>;
    markCompleted(message: NgOutbox): Promise<void>;
    markFailed(message: NgOutbox, error: string, nonRetryable?: boolean): Promise<void>;
    resetFailedMessages(): Promise<number>;
    resetStaleProcessingMessages(timeoutMinutes?: number): Promise<number>;
    cleanupCompletedMessages(retentionDays?: number): Promise<number>;
    getStats(): Promise<OutboxStats>;
    findByAggregate(aggregateType: string, aggregateId: string): Promise<NgOutbox[]>;
}
