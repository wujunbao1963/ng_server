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
exports.NgEvidenceItem = void 0;
const typeorm_1 = require("typeorm");
let NgEvidenceItem = class NgEvidenceItem {
};
exports.NgEvidenceItem = NgEvidenceItem;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEvidenceItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'session_id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEvidenceItem.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'circle_id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEvidenceItem.prototype, "circleId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'event_id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEvidenceItem.prototype, "eventId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'sha256', type: 'text' }),
    __metadata("design:type", String)
], NgEvidenceItem.prototype, "sha256", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'type', type: 'text' }),
    __metadata("design:type", String)
], NgEvidenceItem.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'content_type', type: 'text' }),
    __metadata("design:type", String)
], NgEvidenceItem.prototype, "contentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'size', type: 'bigint' }),
    __metadata("design:type", String)
], NgEvidenceItem.prototype, "size", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'time_range_start_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NgEvidenceItem.prototype, "timeRangeStartAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'time_range_end_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NgEvidenceItem.prototype, "timeRangeEndAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_ref_kind', type: 'text' }),
    __metadata("design:type", String)
], NgEvidenceItem.prototype, "deviceRefKind", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_ref_id', type: 'text' }),
    __metadata("design:type", String)
], NgEvidenceItem.prototype, "deviceRefId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_ref_display_name', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], NgEvidenceItem.prototype, "deviceRefDisplayName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'object_key', type: 'text' }),
    __metadata("design:type", String)
], NgEvidenceItem.prototype, "objectKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'time_range', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], NgEvidenceItem.prototype, "timeRange", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_ref', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], NgEvidenceItem.prototype, "deviceRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NgEvidenceItem.prototype, "createdAt", void 0);
exports.NgEvidenceItem = NgEvidenceItem = __decorate([
    (0, typeorm_1.Entity)({ name: 'ng_evidence_items' }),
    (0, typeorm_1.Unique)('uq_ng_evidence_items_session_sha256', ['sessionId', 'sha256'])
], NgEvidenceItem);
//# sourceMappingURL=ng-evidence-item.entity.js.map