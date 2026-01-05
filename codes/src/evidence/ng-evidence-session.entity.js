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
exports.NgEvidenceSession = void 0;
const typeorm_1 = require("typeorm");
let NgEvidenceSession = class NgEvidenceSession {
};
exports.NgEvidenceSession = NgEvidenceSession;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEvidenceSession.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'circle_id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEvidenceSession.prototype, "circleId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'event_id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEvidenceSession.prototype, "eventId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'edge_device_id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEvidenceSession.prototype, "edgeDeviceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status', type: 'text' }),
    __metadata("design:type", String)
], NgEvidenceSession.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'manifest_hash', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], NgEvidenceSession.prototype, "manifestHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'evidence_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], NgEvidenceSession.prototype, "evidenceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NgEvidenceSession.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], NgEvidenceSession.prototype, "completedAt", void 0);
exports.NgEvidenceSession = NgEvidenceSession = __decorate([
    (0, typeorm_1.Entity)({ name: 'ng_evidence_sessions' })
], NgEvidenceSession);
//# sourceMappingURL=ng-evidence-session.entity.js.map