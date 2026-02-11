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
exports.NgEvidenceDownloadAudit = void 0;
const typeorm_1 = require("typeorm");
let NgEvidenceDownloadAudit = class NgEvidenceDownloadAudit {
};
exports.NgEvidenceDownloadAudit = NgEvidenceDownloadAudit;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], NgEvidenceDownloadAudit.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { name: 'ticket_id' }),
    __metadata("design:type", String)
], NgEvidenceDownloadAudit.prototype, "ticketId", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { name: 'circle_id' }),
    __metadata("design:type", String)
], NgEvidenceDownloadAudit.prototype, "circleId", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { name: 'event_id' }),
    __metadata("design:type", String)
], NgEvidenceDownloadAudit.prototype, "eventId", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { name: 'requester_user_id' }),
    __metadata("design:type", String)
], NgEvidenceDownloadAudit.prototype, "requesterUserId", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { name: 'evidence_key' }),
    __metadata("design:type", String)
], NgEvidenceDownloadAudit.prototype, "evidenceKey", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { name: 'requested_range', nullable: true }),
    __metadata("design:type", Object)
], NgEvidenceDownloadAudit.prototype, "requestedRange", void 0);
__decorate([
    (0, typeorm_1.Column)('int', { name: 'upstream_status' }),
    __metadata("design:type", Number)
], NgEvidenceDownloadAudit.prototype, "upstreamStatus", void 0);
__decorate([
    (0, typeorm_1.Column)('bigint', { name: 'bytes_sent', nullable: true }),
    __metadata("design:type", Object)
], NgEvidenceDownloadAudit.prototype, "bytesSent", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], NgEvidenceDownloadAudit.prototype, "createdAt", void 0);
exports.NgEvidenceDownloadAudit = NgEvidenceDownloadAudit = __decorate([
    (0, typeorm_1.Entity)('ng_evidence_download_audit')
], NgEvidenceDownloadAudit);
//# sourceMappingURL=ng-evidence-download-audit.entity.js.map