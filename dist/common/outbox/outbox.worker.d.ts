import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxService } from './outbox.service';
import { OutboxHandler } from './push-notification.handler';
export interface WorkerStats {
    enabled: boolean;
    isRunning: boolean;
    handlersCount: number;
    messageStats: {
        processed: number;
        succeeded: number;
        failed: number;
        deadLettered: number;
    };
}
export declare class OutboxWorker implements OnModuleInit, OnModuleDestroy {
    private readonly outboxService;
    private readonly config;
    private readonly logger;
    private readonly handlers;
    private pollTimer;
    private maintenanceTimer;
    private isRunning;
    private processed;
    private succeeded;
    private failed;
    private deadLettered;
    private readonly enabled;
    private readonly pollIntervalMs;
    private readonly batchSize;
    private readonly staleTimeoutMinutes;
    constructor(outboxService: OutboxService, config: ConfigService, handlers: OutboxHandler[]);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): void;
    private schedulePoll;
    private poll;
    private processMessage;
    private runMaintenance;
    getStats(): WorkerStats;
    triggerPoll(): Promise<void>;
}
