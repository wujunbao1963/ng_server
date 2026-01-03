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
exports.OutboxService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ng_outbox_entity_1 = require("./ng-outbox.entity");
const logger_service_1 = require("../infra/logger.service");
const clock_port_1 = require("../infra/clock.port");
let OutboxService = class OutboxService {
    constructor(outboxRepo, clock, logger) {
        this.outboxRepo = outboxRepo;
        this.clock = clock;
        this.logger = logger.setContext('OutboxService');
    }
    async enqueue(options, manager) {
        const repo = manager ? manager.getRepository(ng_outbox_entity_1.NgOutbox) : this.outboxRepo;
        const now = this.clock.now();
        const scheduledAt = options.delaySeconds
            ? new Date(now.getTime() + options.delaySeconds * 1000)
            : now;
        const message = repo.create({
            messageType: options.messageType,
            status: 'PENDING',
            payload: options.payload,
            aggregateId: options.aggregateId ?? null,
            aggregateType: options.aggregateType ?? null,
            idempotencyKey: options.idempotencyKey ?? null,
            scheduledAt,
            maxRetries: options.maxRetries ?? 5,
            retryCount: 0,
        });
        await repo.save(message);
        this.logger.log('Message enqueued', {
            messageId: message.id,
            messageType: message.messageType,
            aggregateId: message.aggregateId,
        });
        return message;
    }
    async enqueueBatch(optionsList, manager) {
        const repo = manager ? manager.getRepository(ng_outbox_entity_1.NgOutbox) : this.outboxRepo;
        const now = this.clock.now();
        const messages = optionsList.map((options) => {
            const scheduledAt = options.delaySeconds
                ? new Date(now.getTime() + options.delaySeconds * 1000)
                : now;
            return repo.create({
                messageType: options.messageType,
                status: 'PENDING',
                payload: options.payload,
                aggregateId: options.aggregateId ?? null,
                aggregateType: options.aggregateType ?? null,
                idempotencyKey: options.idempotencyKey ?? null,
                scheduledAt,
                maxRetries: options.maxRetries ?? 5,
                retryCount: 0,
            });
        });
        await repo.save(messages);
        this.logger.log('Messages enqueued in batch', {
            count: messages.length,
        });
        return messages;
    }
    async fetchPendingMessages(limit = 10, messageTypes) {
        const now = this.clock.now();
        const qb = this.outboxRepo
            .createQueryBuilder('o')
            .where('o.status = :status', { status: 'PENDING' })
            .andWhere('o.scheduledAt <= :now', { now })
            .orderBy('o.scheduledAt', 'ASC')
            .limit(limit)
            .setLock('pessimistic_write_or_fail');
        if (messageTypes && messageTypes.length > 0) {
            qb.andWhere('o.messageType IN (:...types)', { types: messageTypes });
        }
        try {
            return await qb.getMany();
        }
        catch (error) {
            if (error.code === '55P03') {
                return [];
            }
            throw error;
        }
    }
    async fetchRetryableMessages(limit = 10) {
        const now = this.clock.now();
        return this.outboxRepo
            .createQueryBuilder('o')
            .where('o.status = :status', { status: 'FAILED' })
            .andWhere('o.retryCount < o.maxRetries')
            .andWhere('o.nextRetryAt <= :now', { now })
            .orderBy('o.nextRetryAt', 'ASC')
            .limit(limit)
            .setLock('pessimistic_write_or_fail')
            .getMany()
            .catch(() => []);
    }
    async markProcessing(message) {
        message.status = 'PROCESSING';
        message.startedAt = this.clock.now();
        await this.outboxRepo.save(message);
    }
    async markCompleted(message) {
        const now = this.clock.now();
        message.status = 'COMPLETED';
        message.completedAt = now;
        message.processingTimeMs = message.startedAt
            ? now.getTime() - message.startedAt.getTime()
            : null;
        await this.outboxRepo.save(message);
        this.logger.log('Message completed', {
            messageId: message.id,
            messageType: message.messageType,
            processingTimeMs: message.processingTimeMs,
        });
    }
    async markFailed(message, error, retryable = true) {
        message.lastError = error;
        message.retryCount += 1;
        if (!retryable || !message.canRetry()) {
            message.status = 'DEAD';
            this.logger.error('Message moved to dead letter', error, {
                messageId: message.id,
                messageType: message.messageType,
                retryCount: message.retryCount,
            });
        }
        else {
            message.status = 'FAILED';
            message.nextRetryAt = message.calculateNextRetry();
            this.logger.warn('Message failed, will retry', {
                messageId: message.id,
                messageType: message.messageType,
                retryCount: message.retryCount,
                nextRetryAt: message.nextRetryAt.toISOString(),
            });
        }
        await this.outboxRepo.save(message);
    }
    async resetStaleProcessingMessages(timeoutMinutes = 10) {
        const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
        const result = await this.outboxRepo.update({
            status: 'PROCESSING',
            startedAt: (0, typeorm_2.LessThanOrEqual)(cutoff),
        }, {
            status: 'PENDING',
            startedAt: null,
        });
        if (result.affected && result.affected > 0) {
            this.logger.warn('Reset stale processing messages', {
                count: result.affected,
                timeoutMinutes,
            });
        }
        return result.affected ?? 0;
    }
    async cleanupCompletedMessages(retentionDays = 7) {
        const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
        const result = await this.outboxRepo.delete({
            status: 'COMPLETED',
            completedAt: (0, typeorm_2.LessThanOrEqual)(cutoff),
        });
        if (result.affected && result.affected > 0) {
            this.logger.log('Cleaned up completed messages', {
                count: result.affected,
                retentionDays,
            });
        }
        return result.affected ?? 0;
    }
    async getStats() {
        const result = await this.outboxRepo
            .createQueryBuilder('o')
            .select('o.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('o.status')
            .getRawMany();
        const stats = {
            PENDING: 0,
            PROCESSING: 0,
            COMPLETED: 0,
            FAILED: 0,
            DEAD: 0,
        };
        for (const row of result) {
            stats[row.status] = parseInt(row.count, 10);
        }
        return stats;
    }
};
exports.OutboxService = OutboxService;
exports.OutboxService = OutboxService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_outbox_entity_1.NgOutbox)),
    __param(1, (0, common_1.Inject)(clock_port_1.CLOCK_PORT)),
    __metadata("design:paramtypes", [typeorm_2.Repository, Object, logger_service_1.NgLoggerService])
], OutboxService);
//# sourceMappingURL=outbox.service.js.map