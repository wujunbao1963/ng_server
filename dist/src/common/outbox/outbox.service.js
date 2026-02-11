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
var OutboxService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ng_outbox_entity_1 = require("./ng-outbox.entity");
let OutboxService = OutboxService_1 = class OutboxService {
    constructor(outboxRepo) {
        this.outboxRepo = outboxRepo;
        this.logger = new common_1.Logger(OutboxService_1.name);
    }
    async enqueue(options, manager) {
        const repo = manager ? manager.getRepository(ng_outbox_entity_1.NgOutbox) : this.outboxRepo;
        if (options.idempotencyKey) {
            const existing = await repo.findOne({
                where: { idempotencyKey: options.idempotencyKey },
            });
            if (existing) {
                this.logger.debug(`Duplicate message ignored: ${options.idempotencyKey}`);
                return existing;
            }
        }
        const message = repo.create({
            messageType: options.messageType,
            payload: options.payload,
            aggregateId: options.aggregateId,
            aggregateType: options.aggregateType,
            idempotencyKey: options.idempotencyKey,
            scheduledAt: options.scheduledAt ?? new Date(),
            maxRetries: options.maxRetries ?? 5,
            status: ng_outbox_entity_1.OutboxStatus.PENDING,
        });
        await repo.save(message);
        this.logger.debug(`Enqueued: ${message.toLogString()}`);
        return message;
    }
    async fetchPendingMessages(batchSize = 10, messageTypes) {
        const now = new Date();
        const qb = this.outboxRepo
            .createQueryBuilder('outbox')
            .where('outbox.status = :pendingStatus', { pendingStatus: ng_outbox_entity_1.OutboxStatus.PENDING })
            .andWhere('outbox.scheduledAt <= :now', { now })
            .orderBy('outbox.scheduledAt', 'ASC')
            .limit(batchSize);
        if (messageTypes && messageTypes.length > 0) {
            qb.andWhere('outbox.message_type IN (:...types)', { types: messageTypes });
        }
        try {
            const messages = await qb.getMany();
            if (messages.length > 0) {
                const ids = messages.map(m => m.id);
                await this.outboxRepo
                    .createQueryBuilder()
                    .update(ng_outbox_entity_1.NgOutbox)
                    .set({
                    status: ng_outbox_entity_1.OutboxStatus.PROCESSING,
                    startedAt: new Date(),
                })
                    .whereInIds(ids)
                    .execute();
                for (const msg of messages) {
                    msg.status = ng_outbox_entity_1.OutboxStatus.PROCESSING;
                    msg.startedAt = new Date();
                }
            }
            return messages;
        }
        catch (error) {
            this.logger.log('No pending messages available or lock conflict');
            return [];
        }
    }
    async markCompleted(message) {
        const now = new Date();
        const processingTimeMs = message.startedAt
            ? now.getTime() - message.startedAt.getTime()
            : 0;
        await this.outboxRepo.update(message.id, {
            status: ng_outbox_entity_1.OutboxStatus.COMPLETED,
            completedAt: now,
            processingTimeMs,
        });
        this.logger.debug(`Completed: ${message.toLogString()} in ${processingTimeMs}ms`);
    }
    async markFailed(message, error, nonRetryable = false) {
        const newRetryCount = message.retryCount + 1;
        const canRetry = !nonRetryable && newRetryCount < message.maxRetries;
        if (canRetry) {
            message.retryCount = newRetryCount;
            const nextRetryAt = message.calculateNextRetryAt();
            await this.outboxRepo.update(message.id, {
                status: ng_outbox_entity_1.OutboxStatus.FAILED,
                retryCount: newRetryCount,
                lastError: error,
                nextRetryAt,
            });
            this.logger.warn(`Failed (will retry): ${message.toLogString()} error=${error}`);
        }
        else {
            await this.outboxRepo.update(message.id, {
                status: ng_outbox_entity_1.OutboxStatus.DEAD,
                retryCount: newRetryCount,
                lastError: error,
                completedAt: new Date(),
            });
            this.logger.error(`Dead letter: ${message.toLogString()} error=${error}`);
        }
    }
    async resetFailedMessages() {
        const now = new Date();
        const result = await this.outboxRepo
            .createQueryBuilder()
            .update(ng_outbox_entity_1.NgOutbox)
            .set({ status: ng_outbox_entity_1.OutboxStatus.PENDING })
            .where('status = :failedStatus', { failedStatus: ng_outbox_entity_1.OutboxStatus.FAILED })
            .andWhere('next_retry_at <= :now', { now })
            .execute();
        const affected = result.affected ?? 0;
        if (affected > 0) {
            this.logger.log(`Reset ${affected} failed messages for retry`);
        }
        return affected;
    }
    async resetStaleProcessingMessages(timeoutMinutes = 10) {
        const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
        const result = await this.outboxRepo
            .createQueryBuilder()
            .update(ng_outbox_entity_1.NgOutbox)
            .set({ status: ng_outbox_entity_1.OutboxStatus.PENDING })
            .where('status = :processingStatus', { processingStatus: ng_outbox_entity_1.OutboxStatus.PROCESSING })
            .andWhere('started_at < :cutoff', { cutoff })
            .execute();
        const affected = result.affected ?? 0;
        if (affected > 0) {
            this.logger.warn(`Reset ${affected} stale PROCESSING messages (timeout=${timeoutMinutes}min)`);
        }
        return affected;
    }
    async cleanupCompletedMessages(retentionDays = 7) {
        const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
        const result = await this.outboxRepo.delete({
            status: ng_outbox_entity_1.OutboxStatus.COMPLETED,
            completedAt: (0, typeorm_2.LessThan)(cutoff),
        });
        const affected = result.affected ?? 0;
        if (affected > 0) {
            this.logger.log(`Cleaned up ${affected} completed messages older than ${retentionDays} days`);
        }
        return affected;
    }
    async getStats() {
        const results = await this.outboxRepo
            .createQueryBuilder('outbox')
            .select('outbox.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('outbox.status')
            .getRawMany();
        const stats = {
            [ng_outbox_entity_1.OutboxStatus.PENDING]: 0,
            [ng_outbox_entity_1.OutboxStatus.PROCESSING]: 0,
            [ng_outbox_entity_1.OutboxStatus.COMPLETED]: 0,
            [ng_outbox_entity_1.OutboxStatus.FAILED]: 0,
            [ng_outbox_entity_1.OutboxStatus.DEAD]: 0,
        };
        for (const row of results) {
            stats[row.status] = parseInt(row.count, 10);
        }
        return stats;
    }
    async findByAggregate(aggregateType, aggregateId) {
        return this.outboxRepo.find({
            where: { aggregateType, aggregateId },
            order: { createdAt: 'DESC' },
        });
    }
};
exports.OutboxService = OutboxService;
exports.OutboxService = OutboxService = OutboxService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_outbox_entity_1.NgOutbox)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], OutboxService);
//# sourceMappingURL=outbox.service.js.map