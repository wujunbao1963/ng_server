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
exports.NgPushDevice = void 0;
const typeorm_1 = require("typeorm");
let NgPushDevice = class NgPushDevice {
};
exports.NgPushDevice = NgPushDevice;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], NgPushDevice.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'user_id' }),
    __metadata("design:type", String)
], NgPushDevice.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], NgPushDevice.prototype, "platform", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], NgPushDevice.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'device_id', nullable: true }),
    __metadata("design:type", Object)
], NgPushDevice.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'app_version', nullable: true }),
    __metadata("design:type", Object)
], NgPushDevice.prototype, "appVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], NgPushDevice.prototype, "locale", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], NgPushDevice.prototype, "timezone", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], NgPushDevice.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz', name: 'updated_at' }),
    __metadata("design:type", Date)
], NgPushDevice.prototype, "updatedAt", void 0);
exports.NgPushDevice = NgPushDevice = __decorate([
    (0, typeorm_1.Entity)('ng_push_devices'),
    (0, typeorm_1.Index)('idx_ng_push_devices_user', ['userId'])
], NgPushDevice);
//# sourceMappingURL=ng-push-device.entity.js.map