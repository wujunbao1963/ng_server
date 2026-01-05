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
exports.EdgeDevicesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto = require("crypto");
const config_1 = require("@nestjs/config");
const ng_edge_device_entity_1 = require("./ng-edge-device.entity");
const circles_service_1 = require("../circles/circles.service");
function genDeviceKey() {
    const bytes = crypto.randomBytes(32);
    return bytes.toString('base64');
}
function hmacSha256Hex(pepper, value) {
    return crypto.createHmac('sha256', pepper).update(value).digest('hex');
}
let EdgeDevicesService = class EdgeDevicesService {
    constructor(repo, config, circles) {
        this.repo = repo;
        this.config = config;
        this.circles = circles;
    }
    async register(userId, circleId, dto) {
        await this.circles.mustHaveRole(userId, circleId, ['owner', 'household']);
        const deviceId = crypto.randomUUID();
        const deviceKey = genDeviceKey();
        const pepper = this.config.get('DEVICE_KEY_PEPPER') ?? 'dev-pepper';
        const deviceKeyHash = hmacSha256Hex(pepper, deviceKey);
        const caps = {
            fusion: dto.capabilities?.fusion ?? false,
            evidenceUpload: dto.capabilities?.evidenceUpload ?? false,
            topomap: dto.capabilities?.topomap ?? false,
        };
        const metadata = {
            platform: dto.platform ?? null,
            haInstanceId: dto.haInstanceId ?? null,
            softwareVersion: dto.softwareVersion ?? null,
            publicKey: dto.publicKey ?? null,
        };
        const entity = this.repo.create({
            id: deviceId,
            circleId,
            name: dto.deviceName ?? null,
            deviceKeyHash,
            capabilities: caps,
            metadata,
            revokedAt: null,
            lastSeenAt: null,
        });
        await this.repo.save(entity);
        return {
            deviceId,
            deviceKey,
            pairedAt: new Date().toISOString(),
            capabilities: caps,
        };
    }
    async list(userId, circleId) {
        await this.circles.mustHaveRole(userId, circleId, ['owner', 'household']);
        const rows = await this.repo.find({
            where: { circleId },
            order: { createdAt: 'ASC' },
        });
        return rows.map((d) => ({
            deviceId: d.id,
            name: d.name ?? null,
            enabled: d.revokedAt == null,
            pairedAt: d.createdAt.toISOString(),
            lastSeenAt: d.lastSeenAt ? d.lastSeenAt.toISOString() : null,
            capabilities: {
                fusion: !!d.capabilities?.fusion,
                evidenceUpload: !!d.capabilities?.evidenceUpload,
                topomap: !!d.capabilities?.topomap,
            },
            metadata: d.metadata ?? null,
        }));
    }
    async setEnabled(userId, circleId, deviceId, enabled) {
        await this.circles.mustHaveRole(userId, circleId, ['owner']);
        const device = await this.repo.findOne({ where: { id: deviceId, circleId } });
        if (!device) {
            throw new Error('DEVICE_NOT_FOUND');
        }
        const revokedAt = enabled ? null : new Date();
        await this.repo.update({ id: deviceId }, { revokedAt });
        return { deviceId, enabled };
    }
    async rotateKey(userId, circleId, deviceId) {
        await this.circles.mustHaveRole(userId, circleId, ['owner']);
        const device = await this.repo.findOne({ where: { id: deviceId, circleId } });
        if (!device) {
            throw new Error('DEVICE_NOT_FOUND');
        }
        const deviceKey = genDeviceKey();
        const pepper = this.config.get('DEVICE_KEY_PEPPER') ?? 'dev-pepper';
        const deviceKeyHash = hmacSha256Hex(pepper, deviceKey);
        await this.repo.update({ id: deviceId }, { deviceKeyHash, revokedAt: null });
        return { deviceId, deviceKey, rotatedAt: new Date().toISOString() };
    }
};
exports.EdgeDevicesService = EdgeDevicesService;
exports.EdgeDevicesService = EdgeDevicesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_edge_device_entity_1.NgEdgeDevice)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        config_1.ConfigService,
        circles_service_1.CirclesService])
], EdgeDevicesService);
//# sourceMappingURL=edge-devices.service.js.map