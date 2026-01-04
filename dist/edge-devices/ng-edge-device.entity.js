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
exports.NgEdgeDevice = void 0;
const typeorm_1 = require("typeorm");
let NgEdgeDevice = class NgEdgeDevice {
};
exports.NgEdgeDevice = NgEdgeDevice;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'uuid' }),
    __metadata("design:type", String)
], NgEdgeDevice.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', name: 'circle_id' }),
    __metadata("design:type", String)
], NgEdgeDevice.prototype, "circleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], NgEdgeDevice.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Index)({ unique: true }),
    (0, typeorm_1.Column)({ type: 'text', name: 'device_key_hash' }),
    __metadata("design:type", String)
], NgEdgeDevice.prototype, "deviceKeyHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: () => "'{}'::jsonb" }),
    __metadata("design:type", Object)
], NgEdgeDevice.prototype, "capabilities", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], NgEdgeDevice.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'created_at', default: () => 'now()' }),
    __metadata("design:type", Date)
], NgEdgeDevice.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'revoked_at', nullable: true }),
    __metadata("design:type", Object)
], NgEdgeDevice.prototype, "revokedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'last_seen_at', nullable: true }),
    __metadata("design:type", Object)
], NgEdgeDevice.prototype, "lastSeenAt", void 0);
exports.NgEdgeDevice = NgEdgeDevice = __decorate([
    (0, typeorm_1.Entity)({ name: 'ng_edge_devices' })
], NgEdgeDevice);
//# sourceMappingURL=ng-edge-device.entity.js.map