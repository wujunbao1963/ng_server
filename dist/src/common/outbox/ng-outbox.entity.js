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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NgOutbox = exports.OutboxStatus = exports.OutboxMessageType = void 0;
const typeorm_1 = require("typeorm");
var OutboxMessageType;
(function (OutboxMessageType) {
    OutboxMessageType["PUSH_NOTIFICATION"] = "PUSH_NOTIFICATION";
    OutboxMessageType["EMAIL_NOTIFICATION"] = "EMAIL_NOTIFICATION";
    OutboxMessageType["WEBHOOK_DELIVERY"] = "WEBHOOK_DELIVERY";
})(OutboxMessageType || (exports.OutboxMessageType = OutboxMessageType = {}));
var OutboxStatus;
(function (OutboxStatus) {
    OutboxStatus["PENDING"] = "PENDING";
    OutboxStatus["PROCESSING"] = "PROCESSING";
    OutboxStatus["COMPLETED"] = "COMPLETED";
    OutboxStatus["FAILED"] = "FAILED";
    OutboxStatus["DEAD"] = "DEAD";
})(OutboxStatus || (exports.OutboxStatus = OutboxStatus = {}));
let NgOutbox = class NgOutbox {
    calculateNextRetryAt() {
        const baseDelayMs = 60 * 1000;
        const multiplier = Math.pow(5, this.retryCount);
        const delayMs = baseDelayMs * multiplier;
        return new Date(Date.now() + delayMs);
    }
    canRetry() {
        return this.retryCount < this.maxRetries;
    }
    toLogString() {
        return `Outbox[${this.id}] type=${this.messageType} status=${this.status} retry=${this.retryCount}/${this.maxRetries}`;
    }
};
exports.NgOutbox = NgOutbox;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], NgOutbox.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, name: 'message_type' }),
    __metadata("design:type", String)
], NgOutbox.prototype, "messageType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 20,
        default: OutboxStatus.PENDING,
    }),
    __metadata("design:type", String)
], NgOutbox.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], NgOutbox.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true, name: 'aggregate_id' }),
    __metadata("design:type", String)
], NgOutbox.prototype, "aggregateId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true, name: 'aggregate_type' }),
    __metadata("design:type", String)
], NgOutbox.prototype, "aggregateType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true, unique: true, name: 'idempotency_key' }),
    __metadata("design:type", String)
], NgOutbox.prototype, "idempotencyKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', default: () => 'NOW()', name: 'scheduled_at' }),
    __metadata("design:type", Date)
], NgOutbox.prototype, "scheduledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0, name: 'retry_count' }),
    __metadata("design:type", Number)
], NgOutbox.prototype, "retryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 5, name: 'max_retries' }),
    __metadata("design:type", Number)
], NgOutbox.prototype, "maxRetries", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true, name: 'next_retry_at' }),
    __metadata("design:type", Date)
], NgOutbox.prototype, "nextRetryAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'last_error' }),
    __metadata("design:type", String)
], NgOutbox.prototype, "lastError", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true, name: 'started_at' }),
    __metadata("design:type", Date)
], NgOutbox.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true, name: 'completed_at' }),
    __metadata("design:type", Date)
], NgOutbox.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true, name: 'processing_time_ms' }),
    __metadata("design:type", Number)
], NgOutbox.prototype, "processingTimeMs", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], NgOutbox.prototype, "createdAt", void 0);
exports.NgOutbox = NgOutbox = __decorate([
    (0, typeorm_1.Entity)('ng_outbox'),
    (0, typeorm_1.Index)('idx_outbox_status_scheduled', ['status', 'scheduledAt']),
    (0, typeorm_1.Index)('idx_outbox_type_status', ['messageType', 'status']),
    (0, typeorm_1.Index)('idx_outbox_aggregate', ['aggregateType', 'aggregateId'])
], NgOutbox);
//# sourceMappingURL=ng-outbox.entity.js.map