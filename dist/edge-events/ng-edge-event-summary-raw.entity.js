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
exports.NgEdgeEventSummaryRaw = void 0;
const typeorm_1 = require("typeorm");
let NgEdgeEventSummaryRaw = class NgEdgeEventSummaryRaw {
};
exports.NgEdgeEventSummaryRaw = NgEdgeEventSummaryRaw;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], NgEdgeEventSummaryRaw.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'circle_id' }),
    __metadata("design:type", String)
], NgEdgeEventSummaryRaw.prototype, "circleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'event_id' }),
    __metadata("design:type", String)
], NgEdgeEventSummaryRaw.prototype, "eventId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'edge_instance_id' }),
    __metadata("design:type", String)
], NgEdgeEventSummaryRaw.prototype, "edgeInstanceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'threat_state' }),
    __metadata("design:type", String)
], NgEdgeEventSummaryRaw.prototype, "threatState", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'edge_updated_at' }),
    __metadata("design:type", Date)
], NgEdgeEventSummaryRaw.prototype, "edgeUpdatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'payload' }),
    __metadata("design:type", Object)
], NgEdgeEventSummaryRaw.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'received_at' }),
    __metadata("design:type", Date)
], NgEdgeEventSummaryRaw.prototype, "receivedAt", void 0);
exports.NgEdgeEventSummaryRaw = NgEdgeEventSummaryRaw = __decorate([
    (0, typeorm_1.Entity)('ng_edge_event_summaries_raw')
], NgEdgeEventSummaryRaw);
//# sourceMappingURL=ng-edge-event-summary-raw.entity.js.map