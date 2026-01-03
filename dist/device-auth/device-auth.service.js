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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceAuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto = require("crypto");
const config_1 = require("@nestjs/config");
const ng_edge_device_entity_1 = require("../edge-devices/ng-edge-device.entity");
function hmacSha256Hex(pepper, value) {
    return crypto.createHmac('sha256', pepper).update(value).digest('hex');
}
let DeviceAuthService = class DeviceAuthService {
    constructor(repo, config) {
        this.repo = repo;
        this.config = config;
    }
    async validateDeviceKey(deviceKey) {
        const pepper = this.config.get('DEVICE_KEY_PEPPER') ?? 'dev-pepper';
        const deviceKeyHash = hmacSha256Hex(pepper, deviceKey);
        const device = await this.repo.findOne({
            where: {
                deviceKeyHash,
                revokedAt: (0, typeorm_2.IsNull)(),
            },
        });
        if (!device) {
            throw new common_1.UnauthorizedException('Invalid device key');
        }
        const now = new Date();
        device.lastSeenAt = now;
        await this.repo.update({ id: device.id }, { lastSeenAt: now });
        return device;
    }
};
exports.DeviceAuthService = DeviceAuthService;
exports.DeviceAuthService = DeviceAuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_edge_device_entity_1.NgEdgeDevice)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        config_1.ConfigService])
], DeviceAuthService);
//# sourceMappingURL=device-auth.service.js.map