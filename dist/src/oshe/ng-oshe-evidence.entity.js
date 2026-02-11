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
exports.NgOsheEvidence = void 0;
const typeorm_1 = require("typeorm");
let NgOsheEvidence = class NgOsheEvidence {
};
exports.NgOsheEvidence = NgOsheEvidence;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'uuid' }),
    __metadata("design:type", String)
], NgOsheEvidence.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', name: 'circle_id' }),
    __metadata("design:type", String)
], NgOsheEvidence.prototype, "circleId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', name: 'event_id' }),
    __metadata("design:type", String)
], NgOsheEvidence.prototype, "eventId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, name: 'evidence_class', default: 'ON_SCENE_HUMAN' }),
    __metadata("design:type", String)
], NgOsheEvidence.prototype, "evidenceClass", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, name: 'media_type' }),
    __metadata("design:type", String)
], NgOsheEvidence.prototype, "mediaType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'captured_at' }),
    __metadata("design:type", Date)
], NgOsheEvidence.prototype, "capturedAt", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', name: 'captured_by_user_id' }),
    __metadata("design:type", String)
], NgOsheEvidence.prototype, "capturedByUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, name: 'captured_by_role' }),
    __metadata("design:type", String)
], NgOsheEvidence.prototype, "capturedByRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, name: 'after_threat_state' }),
    __metadata("design:type", String)
], NgOsheEvidence.prototype, "afterThreatState", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, default: 'human_on_scene' }),
    __metadata("design:type", String)
], NgOsheEvidence.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'presence_verified', default: false }),
    __metadata("design:type", Boolean)
], NgOsheEvidence.prototype, "presenceVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision', name: 'presence_latitude', nullable: true }),
    __metadata("design:type", Object)
], NgOsheEvidence.prototype, "presenceLatitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision', name: 'presence_longitude', nullable: true }),
    __metadata("design:type", Object)
], NgOsheEvidence.prototype, "presenceLongitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision', name: 'presence_accuracy_m', nullable: true }),
    __metadata("design:type", Object)
], NgOsheEvidence.prototype, "presenceAccuracyM", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'presence_verification_degraded', default: false }),
    __metadata("design:type", Boolean)
], NgOsheEvidence.prototype, "presenceVerificationDegraded", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, name: 'file_url' }),
    __metadata("design:type", String)
], NgOsheEvidence.prototype, "fileUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, name: 'file_name', nullable: true }),
    __metadata("design:type", Object)
], NgOsheEvidence.prototype, "fileName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', name: 'file_size_bytes', nullable: true }),
    __metadata("design:type", Object)
], NgOsheEvidence.prototype, "fileSizeBytes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64, name: 'file_hash_sha256', nullable: true }),
    __metadata("design:type", Object)
], NgOsheEvidence.prototype, "fileHashSha256", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'server_received_at' }),
    __metadata("design:type", Date)
], NgOsheEvidence.prototype, "serverReceivedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'timestamp_discrepancy', default: false }),
    __metadata("design:type", Boolean)
], NgOsheEvidence.prototype, "timestampDiscrepancy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], NgOsheEvidence.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', name: 'witness_task_id', nullable: true }),
    __metadata("design:type", Object)
], NgOsheEvidence.prototype, "witnessTaskId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], NgOsheEvidence.prototype, "metadata", void 0);
exports.NgOsheEvidence = NgOsheEvidence = __decorate([
    (0, typeorm_1.Entity)({ name: 'ng_oshe_evidence' })
], NgOsheEvidence);
//# sourceMappingURL=ng-oshe-evidence.entity.js.map