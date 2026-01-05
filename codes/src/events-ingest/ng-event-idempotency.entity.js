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
exports.NgEventIdempotency = void 0;
const typeorm_1 = require("typeorm");
const ng_edge_device_entity_1 = require("../edge-devices/ng-edge-device.entity");
const ng_event_entity_1 = require("./ng-event.entity");
let NgEventIdempotency = class NgEventIdempotency {
};
exports.NgEventIdempotency = NgEventIdempotency;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'id', type: 'bigint' }),
    __metadata("design:type", String)
], NgEventIdempotency.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'edge_device_id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEventIdempotency.prototype, "edgeDeviceId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ng_edge_device_entity_1.NgEdgeDevice, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'edge_device_id' }),
    __metadata("design:type", ng_edge_device_entity_1.NgEdgeDevice)
], NgEventIdempotency.prototype, "edgeDevice", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'idempotency_key', type: 'text' }),
    __metadata("design:type", String)
], NgEventIdempotency.prototype, "idempotencyKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'event_id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEventIdempotency.prototype, "eventId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ng_event_entity_1.NgEvent, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'event_id' }),
    __metadata("design:type", ng_event_entity_1.NgEvent)
], NgEventIdempotency.prototype, "event", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payload_hash', type: 'text' }),
    __metadata("design:type", String)
], NgEventIdempotency.prototype, "payloadHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NgEventIdempotency.prototype, "createdAt", void 0);
exports.NgEventIdempotency = NgEventIdempotency = __decorate([
    (0, typeorm_1.Entity)({ name: 'ng_event_idempotency' }),
    (0, typeorm_1.Index)(['edgeDeviceId', 'idempotencyKey'], { unique: true })
], NgEventIdempotency);
//# sourceMappingURL=ng-event-idempotency.entity.js.map