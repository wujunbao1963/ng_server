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
exports.NgEdgeIngestAudit = void 0;
const typeorm_1 = require("typeorm");
let NgEdgeIngestAudit = class NgEdgeIngestAudit {
};
exports.NgEdgeIngestAudit = NgEdgeIngestAudit;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], NgEdgeIngestAudit.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'circle_id' }),
    __metadata("design:type", String)
], NgEdgeIngestAudit.prototype, "circleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'event_id' }),
    __metadata("design:type", String)
], NgEdgeIngestAudit.prototype, "eventId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'edge_instance_id' }),
    __metadata("design:type", String)
], NgEdgeIngestAudit.prototype, "edgeInstanceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', name: 'sequence', default: 0 }),
    __metadata("design:type", String)
], NgEdgeIngestAudit.prototype, "sequence", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'payload_hash' }),
    __metadata("design:type", String)
], NgEdgeIngestAudit.prototype, "payloadHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'applied' }),
    __metadata("design:type", Boolean)
], NgEdgeIngestAudit.prototype, "applied", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'reason' }),
    __metadata("design:type", String)
], NgEdgeIngestAudit.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'schema_version' }),
    __metadata("design:type", String)
], NgEdgeIngestAudit.prototype, "schemaVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'message_type', default: 'event_summary_upsert' }),
    __metadata("design:type", String)
], NgEdgeIngestAudit.prototype, "messageType", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'received_at' }),
    __metadata("design:type", Date)
], NgEdgeIngestAudit.prototype, "receivedAt", void 0);
exports.NgEdgeIngestAudit = NgEdgeIngestAudit = __decorate([
    (0, typeorm_1.Entity)('ng_edge_ingest_audit'),
    (0, typeorm_1.Index)('idx_ng_edge_ingest_audit_circle_event_received', ['circleId', 'eventId', 'receivedAt']),
    (0, typeorm_1.Index)('idx_ng_edge_ingest_audit_circle_edge_received', ['circleId', 'edgeInstanceId', 'receivedAt'])
], NgEdgeIngestAudit);
//# sourceMappingURL=ng-edge-ingest-audit.entity.js.map