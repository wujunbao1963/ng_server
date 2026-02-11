"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OutboxWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxWorker = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const outbox_service_1 = require("./outbox.service");
const push_notification_handler_1 = require("./push-notification.handler");
let OutboxWorker = OutboxWorker_1 = class OutboxWorker {
    constructor(outboxService, config, handlers) {
        this.outboxService = outboxService;
        this.config = config;
        this.logger = new common_1.Logger(OutboxWorker_1.name);
        this.handlers = new Map();
        this.pollTimer = null;
        this.maintenanceTimer = null;
        this.isRunning = false;
        this.processed = 0;
        this.succeeded = 0;
        this.failed = 0;
        this.deadLettered = 0;
        this.enabled = this.config.get('OUTBOX_WORKER_ENABLED', 'true') === 'true';
        this.pollIntervalMs = parseInt(this.config.get('OUTBOX_POLL_INTERVAL_MS', '5000'), 10);
        this.batchSize = parseInt(this.config.get('OUTBOX_BATCH_SIZE', '10'), 10);
        this.staleTimeoutMinutes = parseInt(this.config.get('OUTBOX_STALE_TIMEOUT_MINUTES', '10'), 10);
        for (const handler of handlers) {
            this.handlers.set(handler.messageType, handler);
            this.logger.log(`Registered handler: ${handler.messageType}`);
        }
    }
    async onModuleInit() {
        if (!this.enabled) {
            this.logger.warn('Outbox worker is DISABLED');
            return;
        }
        this.logger.log(`Starting outbox worker: pollInterval=${this.pollIntervalMs}ms ` +
            `batchSize=${this.batchSize} handlers=${this.handlers.size}`);
        this.schedulePoll();
        this.maintenanceTimer = setInterval(() => this.runMaintenance(), 5 * 60 * 1000);
        await this.runMaintenance();
    }
    onModuleDestroy() {
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }
        if (this.maintenanceTimer) {
            clearInterval(this.maintenanceTimer);
            this.maintenanceTimer = null;
        }
        this.logger.log('Outbox worker stopped');
    }
    schedulePoll() {
        this.pollTimer = setTimeout(async () => {
            await this.poll();
            this.schedulePoll();
        }, this.pollIntervalMs);
    }
    async poll() {
        this.logger.log('[POLL] poll() called');
        if (this.isRunning) {
            this.logger.log('[POLL] skipped - already running');
            return;
        }
        this.isRunning = true;
        try {
            await this.outboxService.resetFailedMessages();
            const messages = await this.outboxService.fetchPendingMessages(this.batchSize);
            this.logger.log(`[POLL] fetched ${messages.length} messages`);
            if (messages.length === 0) {
                return;
            }
            this.logger.debug(`Processing ${messages.length} messages`);
            for (const message of messages) {
                await this.processMessage(message);
            }
        }
        catch (error) {
            const err = error;
            this.logger.error(`Poll error: ${err.message}`, err.stack);
        }
        finally {
            this.isRunning = false;
        }
    }
    async processMessage(message) {
        this.processed++;
        const handler = this.handlers.get(message.messageType);
        if (!handler) {
            this.logger.error(`No handler for message type: ${message.messageType}`);
            await this.outboxService.markFailed(message, `No handler for type: ${message.messageType}`, true);
            this.deadLettered++;
            return;
        }
        try {
            await handler.handle(message);
            await this.outboxService.markCompleted(message);
            this.succeeded++;
        }
        catch (error) {
            const err = error;
            const isNonRetryable = error instanceof push_notification_handler_1.NonRetryableError;
            await this.outboxService.markFailed(message, err.message, isNonRetryable);
            if (isNonRetryable || !message.canRetry()) {
                this.deadLettered++;
            }
            this.failed++;
        }
    }
    async runMaintenance() {
        try {
            await this.outboxService.resetStaleProcessingMessages(this.staleTimeoutMinutes);
            await this.outboxService.cleanupCompletedMessages(7);
            const stats = await this.outboxService.getStats();
            this.logger.log(`Outbox stats: PENDING=${stats.PENDING} PROCESSING=${stats.PROCESSING} ` +
                `COMPLETED=${stats.COMPLETED} FAILED=${stats.FAILED} DEAD=${stats.DEAD}`);
        }
        catch (error) {
            const err = error;
            this.logger.error(`Maintenance error: ${err.message}`, err.stack);
        }
    }
    getStats() {
        return {
            enabled: this.enabled,
            isRunning: this.isRunning,
            handlersCount: this.handlers.size,
            messageStats: {
                processed: this.processed,
                succeeded: this.succeeded,
                failed: this.failed,
                deadLettered: this.deadLettered,
            },
        };
    }
    async triggerPoll() {
        await this.poll();
    }
};
exports.OutboxWorker = OutboxWorker;
exports.OutboxWorker = OutboxWorker = OutboxWorker_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(push_notification_handler_1.OUTBOX_HANDLERS)),
    __metadata("design:paramtypes", [outbox_service_1.OutboxService,
        config_1.ConfigService, Array])
], OutboxWorker);
//# sourceMappingURL=outbox.worker.js.map