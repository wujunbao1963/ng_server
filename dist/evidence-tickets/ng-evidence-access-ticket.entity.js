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
exports.NgEvidenceAccessTicket = void 0;
const typeorm_1 = require("typeorm");
let NgEvidenceAccessTicket = class NgEvidenceAccessTicket {
};
exports.NgEvidenceAccessTicket = NgEvidenceAccessTicket;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid', { name: 'ticket_id' }),
    __metadata("design:type", String)
], NgEvidenceAccessTicket.prototype, "ticketId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'circle_id' }),
    __metadata("design:type", String)
], NgEvidenceAccessTicket.prototype, "circleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'event_id' }),
    __metadata("design:type", String)
], NgEvidenceAccessTicket.prototype, "eventId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'requester_user_id' }),
    __metadata("design:type", String)
], NgEvidenceAccessTicket.prototype, "requesterUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'evidence_key' }),
    __metadata("design:type", String)
], NgEvidenceAccessTicket.prototype, "evidenceKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'expires_at' }),
    __metadata("design:type", Date)
], NgEvidenceAccessTicket.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], NgEvidenceAccessTicket.prototype, "createdAt", void 0);
exports.NgEvidenceAccessTicket = NgEvidenceAccessTicket = __decorate([
    (0, typeorm_1.Entity)('ng_evidence_access_tickets'),
    (0, typeorm_1.Index)('idx_ng_evidence_access_tickets_circle_event', ['circleId', 'eventId']),
    (0, typeorm_1.Index)('idx_ng_evidence_access_tickets_expires', ['expiresAt'])
], NgEvidenceAccessTicket);
//# sourceMappingURL=ng-evidence-access-ticket.entity.js.map