import { Repository, EntityManager } from 'typeorm';
import { NgOutbox, OutboxMessageType, OutboxStatus } from './ng-outbox.entity';
import { NgLoggerService } from '../infra/logger.service';
import { ClockPort } from '../infra/clock.port';
export interface EnqueueOptions {
    messageType: OutboxMessageType;
    payload: Record<string, any>;
    aggregateId?: string;
    aggregateType?: string;
    idempotencyKey?: string;
    delaySeconds?: number;
    maxRetries?: number;
}
export interface ProcessResult {
    success: boolean;
    error?: string;
    retryable?: boolean;
}
export declare class OutboxService {
    private readonly outboxRepo;
    private readonly clock;
    private readonly logger;
    constructor(outboxRepo: Repository<NgOutbox>, clock: ClockPort, logger: NgLoggerService);
    enqueue(options: EnqueueOptions, manager?: EntityManager): Promise<NgOutbox>;
    enqueueBatch(optionsList: EnqueueOptions[], manager?: EntityManager): Promise<NgOutbox[]>;
    fetchPendingMessages(limit?: number, messageTypes?: OutboxMessageType[]): Promise<NgOutbox[]>;
    fetchRetryableMessages(limit?: number): Promise<NgOutbox[]>;
    markProcessing(message: NgOutbox): Promise<void>;
    markCompleted(message: NgOutbox): Promise<void>;
    markFailed(message: NgOutbox, error: string, retryable?: boolean): Promise<void>;
    resetStaleProcessingMessages(timeoutMinutes?: number): Promise<number>;
    cleanupCompletedMessages(retentionDays?: number): Promise<number>;
    getStats(): Promise<Record<OutboxStatus, number>>;
}
