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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxWorker = exports.OUTBOX_HANDLERS = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const outbox_service_1 = require("./outbox.service");
const logger_service_1 = require("../infra/logger.service");
const clock_port_1 = require("../infra/clock.port");
exports.OUTBOX_HANDLERS = Symbol('OUTBOX_HANDLERS');
let OutboxWorker = class OutboxWorker {
    constructor(outboxService, config, clock, handlers, logger) {
        this.outboxService = outboxService;
        this.config = config;
        this.clock = clock;
        this.handlers = new Map();
        this.pollTimer = null;
        this.retryTimer = null;
        this.cleanupTimer = null;
        this.isRunning = false;
        this.isShuttingDown = false;
        this.logger = logger.setContext('OutboxWorker');
        for (const handler of handlers) {
            this.handlers.set(handler.messageType, handler);
            this.logger.log('Registered handler', { messageType: handler.messageType });
        }
        this.enabled = this.config.get('OUTBOX_WORKER_ENABLED', 'true') === 'true';
        this.pollIntervalMs = parseInt(this.config.get('OUTBOX_POLL_INTERVAL_MS', '5000'), 10);
        this.batchSize = parseInt(this.config.get('OUTBOX_BATCH_SIZE', '10'), 10);
        this.staleTimeoutMinutes = parseInt(this.config.get('OUTBOX_STALE_TIMEOUT_MINUTES', '10'), 10);
    }
    async onModuleInit() {
        if (!this.enabled) {
            this.logger.log('Outbox worker is disabled');
            return;
        }
        this.logger.log('Starting outbox worker', {
            pollIntervalMs: this.pollIntervalMs,
            batchSize: this.batchSize,
            handlersCount: this.handlers.size,
        });
        this.startPolling();
        this.retryTimer = setInterval(() => this.pollRetryable(), 60 * 1000);
        this.cleanupTimer = setInterval(() => this.runCleanup(), 60 * 60 * 1000);
        await this.outboxService.resetStaleProcessingMessages(this.staleTimeoutMinutes);
    }
    async onModuleDestroy() {
        this.logger.log('Stopping outbox worker');
        this.isShuttingDown = true;
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }
        if (this.retryTimer) {
            clearInterval(this.retryTimer);
            this.retryTimer = null;
        }
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        let waitCount = 0;
        while (this.isRunning && waitCount < 30) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            waitCount++;
        }
        this.logger.log('Outbox worker stopped');
    }
    startPolling() {
        if (this.isShuttingDown)
            return;
        this.pollTimer = setTimeout(async () => {
            await this.poll();
            this.startPolling();
        }, this.pollIntervalMs);
    }
    async poll() {
        if (this.isRunning || this.isShuttingDown)
            return;
        this.isRunning = true;
        try {
            const messages = await this.outboxService.fetchPendingMessages(this.batchSize, Array.from(this.handlers.keys()));
            if (messages.length > 0) {
                this.logger.debug('Fetched messages', { count: messages.length });
            }
            await Promise.all(messages.map((msg) => this.processMessage(msg)));
        }
        catch (error) {
            this.logger.error('Poll failed', String(error));
        }
        finally {
            this.isRunning = false;
        }
    }
    async pollRetryable() {
        if (this.isShuttingDown)
            return;
        try {
            const messages = await this.outboxService.fetchRetryableMessages(this.batchSize);
            if (messages.length > 0) {
                this.logger.log('Fetched retryable messages', { count: messages.length });
                await Promise.all(messages.map((msg) => this.processMessage(msg)));
            }
        }
        catch (error) {
            this.logger.error('Retry poll failed', String(error));
        }
    }
    async runCleanup() {
        if (this.isShuttingDown)
            return;
        try {
            await this.outboxService.resetStaleProcessingMessages(this.staleTimeoutMinutes);
            await this.outboxService.cleanupCompletedMessages(7);
        }
        catch (error) {
            this.logger.error('Cleanup failed', String(error));
        }
    }
    async processMessage(message) {
        const handler = this.handlers.get(message.messageType);
        if (!handler) {
            this.logger.error('No handler found for message type', undefined, {
                messageId: message.id,
                messageType: message.messageType,
            });
            await this.outboxService.markFailed(message, 'No handler registered', false);
            return;
        }
        try {
            await this.outboxService.markProcessing(message);
            const result = await handler.handle(message);
            if (result.success) {
                await this.outboxService.markCompleted(message);
            }
            else {
                await this.outboxService.markFailed(message, result.error ?? 'Unknown error', result.retryable ?? true);
            }
        }
        catch (error) {
            this.logger.error('Message processing error', error.message, {
                messageId: message.id,
                messageType: message.messageType,
            });
            await this.outboxService.markFailed(message, error.message, true);
        }
    }
    async triggerPoll() {
        await this.poll();
    }
    async getStats() {
        const messageStats = await this.outboxService.getStats();
        return {
            enabled: this.enabled,
            isRunning: this.isRunning,
            handlersCount: this.handlers.size,
            messageStats,
        };
    }
};
exports.OutboxWorker = OutboxWorker;
exports.OutboxWorker = OutboxWorker = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(clock_port_1.CLOCK_PORT)),
    __param(3, (0, common_1.Inject)(exports.OUTBOX_HANDLERS)),
    __metadata("design:paramtypes", [outbox_service_1.OutboxService,
        config_1.ConfigService, Object, Array, logger_service_1.NgLoggerService])
], OutboxWorker);
//# sourceMappingURL=outbox.worker.js.map