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
exports.NgEventEvidence = void 0;
const typeorm_1 = require("typeorm");
let NgEventEvidence = class NgEventEvidence {
};
exports.NgEventEvidence = NgEventEvidence;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEventEvidence.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'circle_id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEventEvidence.prototype, "circleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'event_id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEventEvidence.prototype, "eventId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'session_id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEventEvidence.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status', type: 'text' }),
    __metadata("design:type", String)
], NgEventEvidence.prototype, "evidenceStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NgEventEvidence.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'archived_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], NgEventEvidence.prototype, "archivedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'manifest', type: 'jsonb' }),
    __metadata("design:type", Object)
], NgEventEvidence.prototype, "manifest", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'report_package', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], NgEventEvidence.prototype, "reportPackage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'warnings', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], NgEventEvidence.prototype, "warnings", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NgEventEvidence.prototype, "createdAt", void 0);
exports.NgEventEvidence = NgEventEvidence = __decorate([
    (0, typeorm_1.Entity)({ name: 'ng_event_evidence' }),
    (0, typeorm_1.Unique)('uq_ng_event_evidence_event', ['eventId']),
    (0, typeorm_1.Unique)('uq_ng_event_evidence_session', ['sessionId'])
], NgEventEvidence);
//# sourceMappingURL=ng-event-evidence.entity.js.map