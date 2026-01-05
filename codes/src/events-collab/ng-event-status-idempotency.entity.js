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
exports.NgEventStatusIdempotency = void 0;
const typeorm_1 = require("typeorm");
let NgEventStatusIdempotency = class NgEventStatusIdempotency {
};
exports.NgEventStatusIdempotency = NgEventStatusIdempotency;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'id', type: 'bigint' }),
    __metadata("design:type", String)
], NgEventStatusIdempotency.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'event_id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEventStatusIdempotency.prototype, "eventId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'client_request_id', type: 'uuid' }),
    __metadata("design:type", String)
], NgEventStatusIdempotency.prototype, "clientRequestId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payload_hash', type: 'text' }),
    __metadata("design:type", String)
], NgEventStatusIdempotency.prototype, "payloadHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status', type: 'text' }),
    __metadata("design:type", String)
], NgEventStatusIdempotency.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NgEventStatusIdempotency.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NgEventStatusIdempotency.prototype, "createdAt", void 0);
exports.NgEventStatusIdempotency = NgEventStatusIdempotency = __decorate([
    (0, typeorm_1.Entity)({ name: 'ng_event_status_idempotency' })
], NgEventStatusIdempotency);
//# sourceMappingURL=ng-event-status-idempotency.entity.js.map