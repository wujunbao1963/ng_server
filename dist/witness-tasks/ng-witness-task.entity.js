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
exports.NgWitnessTask = void 0;
const typeorm_1 = require("typeorm");
let NgWitnessTask = class NgWitnessTask {
};
exports.NgWitnessTask = NgWitnessTask;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'uuid' }),
    __metadata("design:type", String)
], NgWitnessTask.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', name: 'circle_id' }),
    __metadata("design:type", String)
], NgWitnessTask.prototype, "circleId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, name: 'event_id', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "eventId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], NgWitnessTask.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "purpose", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, name: 'target_entry', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "targetEntry", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'created' }),
    __metadata("design:type", String)
], NgWitnessTask.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'creator_user_id' }),
    __metadata("design:type", String)
], NgWitnessTask.prototype, "creatorUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, name: 'creator_role' }),
    __metadata("design:type", String)
], NgWitnessTask.prototype, "creatorRole", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', name: 'witness_user_id', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "witnessUserId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], NgWitnessTask.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'offered_at', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "offeredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'claimed_at', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "claimedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'arrived_at', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "arrivedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'submitted_at', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "submittedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'closed_at', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "closedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'canceled_at', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "canceledAt", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'expires_at', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', name: 'claim_ttl_sec', default: 600 }),
    __metadata("design:type", Number)
], NgWitnessTask.prototype, "claimTtlSec", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', name: 'arrive_ttl_sec', default: 1200 }),
    __metadata("design:type", Number)
], NgWitnessTask.prototype, "arriveTtlSec", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', name: 'submit_ttl_sec', default: 600 }),
    __metadata("design:type", Number)
], NgWitnessTask.prototype, "submitTtlSec", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', name: 'proximity_radius_m', default: 50 }),
    __metadata("design:type", Number)
], NgWitnessTask.prototype, "proximityRadiusM", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision', name: 'arrival_latitude', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "arrivalLatitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision', name: 'arrival_longitude', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "arrivalLongitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision', name: 'arrival_accuracy_m', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "arrivalAccuracyM", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'proximity_verified', default: false }),
    __metadata("design:type", Boolean)
], NgWitnessTask.prototype, "proximityVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, name: 'proximity_failure_reason', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "proximityFailureReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "conclusion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'conclusion_note', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "conclusionNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'submission_notes', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "submissionNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'submission_photos', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "submissionPhotos", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'canceled_by_user_id', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "canceledByUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200, name: 'cancel_reason', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "cancelReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'risk_abort_reason', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "riskAbortReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'risk_aborted_at', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "riskAbortedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessTask.prototype, "metadata", void 0);
exports.NgWitnessTask = NgWitnessTask = __decorate([
    (0, typeorm_1.Entity)({ name: 'ng_witness_tasks' })
], NgWitnessTask);
//# sourceMappingURL=ng-witness-task.entity.js.map