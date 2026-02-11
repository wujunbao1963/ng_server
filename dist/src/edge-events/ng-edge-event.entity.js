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
exports.NgEdgeEvent = void 0;
const typeorm_1 = require("typeorm");
let NgEdgeEvent = class NgEdgeEvent {
};
exports.NgEdgeEvent = NgEdgeEvent;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], NgEdgeEvent.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'circle_id' }),
    __metadata("design:type", String)
], NgEdgeEvent.prototype, "circleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'event_id' }),
    __metadata("design:type", String)
], NgEdgeEvent.prototype, "eventId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'edge_instance_id' }),
    __metadata("design:type", String)
], NgEdgeEvent.prototype, "edgeInstanceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'threat_state' }),
    __metadata("design:type", String)
], NgEdgeEvent.prototype, "threatState", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'trigger_reason', nullable: true }),
    __metadata("design:type", Object)
], NgEdgeEvent.prototype, "triggerReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'edge_updated_at' }),
    __metadata("design:type", Date)
], NgEdgeEvent.prototype, "edgeUpdatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', name: 'last_sequence', default: 0 }),
    __metadata("design:type", String)
], NgEdgeEvent.prototype, "lastSequence", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'summary_json' }),
    __metadata("design:type", Object)
], NgEdgeEvent.prototype, "summaryJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'last_payload_hash', nullable: true }),
    __metadata("design:type", Object)
], NgEdgeEvent.prototype, "lastPayloadHash", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'last_upsert_received_at' }),
    __metadata("design:type", Date)
], NgEdgeEvent.prototype, "lastUpsertReceivedAt", void 0);
exports.NgEdgeEvent = NgEdgeEvent = __decorate([
    (0, typeorm_1.Entity)('ng_edge_events'),
    (0, typeorm_1.Unique)('uq_ng_edge_events_circle_event', ['circleId', 'eventId']),
    (0, typeorm_1.Index)('idx_ng_edge_events_circle_updated', ['circleId', 'edgeUpdatedAt'])
], NgEdgeEvent);
//# sourceMappingURL=ng-edge-event.entity.js.map