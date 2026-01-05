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
exports.NgEvidenceDownloadLease = void 0;
const typeorm_1 = require("typeorm");
let NgEvidenceDownloadLease = class NgEvidenceDownloadLease {
};
exports.NgEvidenceDownloadLease = NgEvidenceDownloadLease;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid', { name: 'lease_id' }),
    __metadata("design:type", String)
], NgEvidenceDownloadLease.prototype, "leaseId", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { name: 'ticket_id' }),
    __metadata("design:type", String)
], NgEvidenceDownloadLease.prototype, "ticketId", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { name: 'requester_user_id' }),
    __metadata("design:type", String)
], NgEvidenceDownloadLease.prototype, "requesterUserId", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { name: 'lease_type' }),
    __metadata("design:type", String)
], NgEvidenceDownloadLease.prototype, "leaseType", void 0);
__decorate([
    (0, typeorm_1.Column)('timestamptz', { name: 'expires_at' }),
    __metadata("design:type", Date)
], NgEvidenceDownloadLease.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], NgEvidenceDownloadLease.prototype, "createdAt", void 0);
exports.NgEvidenceDownloadLease = NgEvidenceDownloadLease = __decorate([
    (0, typeorm_1.Entity)('ng_evidence_download_leases')
], NgEvidenceDownloadLease);
//# sourceMappingURL=ng-evidence-download-lease.entity.js.map