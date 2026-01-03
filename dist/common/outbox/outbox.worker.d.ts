import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NgOutbox, OutboxMessageType } from './ng-outbox.entity';
import { OutboxService, ProcessResult } from './outbox.service';
import { NgLoggerService } from '../infra/logger.service';
import { ClockPort } from '../infra/clock.port';
export interface OutboxHandler {
    handle(message: NgOutbox): Promise<ProcessResult>;
    readonly messageType: OutboxMessageType;
}
export declare const OUTBOX_HANDLERS: unique symbol;
export declare class OutboxWorker implements OnModuleInit, OnModuleDestroy {
    private readonly outboxService;
    private readonly config;
    private readonly clock;
    private readonly logger;
    private readonly handlers;
    private pollTimer;
    private retryTimer;
    private cleanupTimer;
    private isRunning;
    private isShuttingDown;
    private readonly enabled;
    private readonly pollIntervalMs;
    private readonly batchSize;
    private readonly staleTimeoutMinutes;
    constructor(outboxService: OutboxService, config: ConfigService, clock: ClockPort, handlers: OutboxHandler[], logger: NgLoggerService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private startPolling;
    private poll;
    private pollRetryable;
    private runCleanup;
    private processMessage;
    triggerPoll(): Promise<void>;
    getStats(): Promise<{
        enabled: boolean;
        isRunning: boolean;
        handlersCount: number;
        messageStats: Record<string, number>;
    }>;
}
