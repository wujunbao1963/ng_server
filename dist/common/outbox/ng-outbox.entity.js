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
exports.NgOutbox = void 0;
const typeorm_1 = require("typeorm");
let NgOutbox = class NgOutbox {
    calculateNextRetry() {
        const baseDelayMs = 60 * 1000;
        const multiplier = Math.pow(5, this.retryCount);
        const delayMs = Math.min(baseDelayMs * multiplier, 10 * 60 * 60 * 1000);
        return new Date(Date.now() + delayMs);
    }
    canRetry() {
        return this.retryCount < this.maxRetries;
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
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'PENDING' }),
    __metadata("design:type", String)
], NgOutbox.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], NgOutbox.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, name: 'aggregate_id', nullable: true }),
    __metadata("design:type", Object)
], NgOutbox.prototype, "aggregateId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, name: 'aggregate_type', nullable: true }),
    __metadata("design:type", Object)
], NgOutbox.prototype, "aggregateType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, name: 'idempotency_key', nullable: true, unique: true }),
    __metadata("design:type", Object)
], NgOutbox.prototype, "idempotencyKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'scheduled_at', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], NgOutbox.prototype, "scheduledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', name: 'retry_count', default: 0 }),
    __metadata("design:type", Number)
], NgOutbox.prototype, "retryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', name: 'max_retries', default: 5 }),
    __metadata("design:type", Number)
], NgOutbox.prototype, "maxRetries", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'next_retry_at', nullable: true }),
    __metadata("design:type", Object)
], NgOutbox.prototype, "nextRetryAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'last_error', nullable: true }),
    __metadata("design:type", Object)
], NgOutbox.prototype, "lastError", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'started_at', nullable: true }),
    __metadata("design:type", Object)
], NgOutbox.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'completed_at', nullable: true }),
    __metadata("design:type", Object)
], NgOutbox.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', name: 'processing_time_ms', nullable: true }),
    __metadata("design:type", Object)
], NgOutbox.prototype, "processingTimeMs", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], NgOutbox.prototype, "createdAt", void 0);
exports.NgOutbox = NgOutbox = __decorate([
    (0, typeorm_1.Entity)('ng_outbox'),
    (0, typeorm_1.Index)('idx_outbox_status_scheduled', ['status', 'scheduledAt']),
    (0, typeorm_1.Index)('idx_outbox_type_status', ['messageType', 'status'])
], NgOutbox);
//# sourceMappingURL=ng-outbox.entity.js.map