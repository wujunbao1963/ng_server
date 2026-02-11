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
exports.NgEvent = void 0;
const typeorm_1 = require("typeorm");
const ng_edge_device_entity_1 = require("../edge-devices/ng-edge-device.entity");
let NgEvent = class NgEvent {
};
exports.NgEvent = NgEvent;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'event_id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEvent.prototype, "eventId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'circle_id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEvent.prototype, "circleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'edge_device_id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEvent.prototype, "edgeDeviceId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ng_edge_device_entity_1.NgEdgeDevice),
    (0, typeorm_1.JoinColumn)({ name: 'edge_device_id' }),
    __metadata("design:type", ng_edge_device_entity_1.NgEdgeDevice)
], NgEvent.prototype, "edgeDevice", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'title', type: 'text' }),
    __metadata("design:type", String)
], NgEvent.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'description', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], NgEvent.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'event_type', type: 'text' }),
    __metadata("design:type", String)
], NgEvent.prototype, "eventType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'severity', type: 'text' }),
    __metadata("design:type", String)
], NgEvent.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'notification_level', type: 'text' }),
    __metadata("design:type", String)
], NgEvent.prototype, "notificationLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status', type: 'text' }),
    __metadata("design:type", String)
], NgEvent.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'occurred_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NgEvent.prototype, "occurredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'received_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NgEvent.prototype, "receivedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NgEvent.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'acked_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], NgEvent.prototype, "ackedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'resolved_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], NgEvent.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'explain_summary', type: 'jsonb' }),
    __metadata("design:type", Object)
], NgEvent.prototype, "explainSummary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'alarm_state', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], NgEvent.prototype, "alarmState", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'zones_visited', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], NgEvent.prototype, "zonesVisited", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'key_signals', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], NgEvent.prototype, "keySignals", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'raw_event', type: 'jsonb' }),
    __metadata("design:type", Object)
], NgEvent.prototype, "rawEvent", void 0);
exports.NgEvent = NgEvent = __decorate([
    (0, typeorm_1.Entity)({ name: 'ng_events' })
], NgEvent);
//# sourceMappingURL=ng-event.entity.js.map