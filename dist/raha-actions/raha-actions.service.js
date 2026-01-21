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
var RahaActionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RahaActionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const crypto = require("crypto");
const ng_edge_device_entity_1 = require("../edge-devices/ng-edge-device.entity");
const circles_service_1 = require("../circles/circles.service");
let RahaActionsService = RahaActionsService_1 = class RahaActionsService {
    constructor(edgeDevicesRepo, circlesService, config) {
        this.edgeDevicesRepo = edgeDevicesRepo;
        this.circlesService = circlesService;
        this.config = config;
        this.logger = new common_1.Logger(RahaActionsService_1.name);
        this.defaultEdgeUrl = this.config.get('DEFAULT_EDGE_URL') || null;
        this.forwardTimeout = parseInt(this.config.get('RAHA_FORWARD_TIMEOUT_MS') || '10000', 10);
        this.logger.log(`Initialized with defaultEdgeUrl=${this.defaultEdgeUrl}, timeout=${this.forwardTimeout}ms`);
    }
    async executeAction(userId, circleId, dto) {
        this.logger.log(`Executing ${dto.action} for user=${userId} circle=${circleId}`);
        const userRole = await this.getUserRole(userId, circleId);
        if (!userRole) {
            throw new common_1.NotFoundException('User not found in circle');
        }
        const actorRole = this.mapToActorRole(userRole);
        if (!actorRole) {
            throw new common_1.BadRequestException(`Role ${userRole} cannot execute RAHA`);
        }
        const edgeDevice = await this.getEdgeDevice(circleId);
        if (!edgeDevice) {
            throw new common_1.NotFoundException('No Edge device found for circle');
        }
        if (!edgeDevice.enabled) {
            throw new common_1.BadRequestException('Edge device is disabled');
        }
        const edgeUrl = edgeDevice.edgeUrl || this.defaultEdgeUrl;
        if (!edgeUrl) {
            throw new common_1.ServiceUnavailableException('Edge URL not configured');
        }
        const requestId = crypto.randomUUID();
        const humanAction = {
            contractVersion: 'ng.edge.server/8.0',
            edgeSpecVersion: 'v7.7',
            edgeInstanceId: edgeDevice.edgeInstanceId || 'edge_001',
            requestId,
            idempotencyKey: `srv:${requestId}`,
            eventId: dto.eventId || null,
            actorId: userId,
            actorRole,
            action: dto.action,
            params: dto.params || {},
            deviceTime: new Date().toISOString(),
            monoTime: 0,
            timeQuality: 'SYNCED',
        };
        const result = await this.forwardToEdge(edgeUrl, humanAction);
        this.logger.log(`RAHA ${dto.action} result: accepted=${result.accepted}`);
        return result;
    }
    async getUserRole(userId, circleId) {
        try {
            const membership = await this.circlesService.mustBeMember(userId, circleId);
            return membership.role;
        }
        catch (err) {
            this.logger.warn(`User ${userId} not a member of circle ${circleId}`);
            return null;
        }
    }
    mapToActorRole(serverRole) {
        const roleMap = {
            'owner': 'owner',
            'household': 'caretaker',
            'caretaker': 'caretaker',
            'acting_owner': 'acting_owner',
            'guest': null,
            'witness': null,
        };
        return roleMap[serverRole.toLowerCase()] ?? null;
    }
    async getEdgeDevice(circleId) {
        const device = await this.edgeDevicesRepo.findOne({
            where: { circleId },
            order: { createdAt: 'ASC' },
        });
        if (!device) {
            return null;
        }
        const metadata = device.metadata || {};
        return {
            deviceId: device.id,
            circleId: device.circleId,
            edgeUrl: metadata.edgeUrl || null,
            edgeInstanceId: metadata.edgeInstanceId || device.id,
            enabled: device.revokedAt === null,
        };
    }
    async forwardToEdge(edgeUrl, humanAction) {
        const url = `${edgeUrl.replace(/\/$/, '')}/api/raha/execute`;
        this.logger.debug(`Forwarding RAHA to ${url}`);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.forwardTimeout);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(humanAction),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Edge returned ${response.status}: ${errorText}`);
                try {
                    const errorJson = JSON.parse(errorText);
                    return {
                        requestId: humanAction.requestId,
                        eventId: humanAction.eventId,
                        accepted: false,
                        rejectedCode: 'EDGE_ERROR',
                        rejectedReason: errorJson.detail || errorJson.message || `HTTP ${response.status}`,
                    };
                }
                catch {
                    return {
                        requestId: humanAction.requestId,
                        eventId: humanAction.eventId,
                        accepted: false,
                        rejectedCode: 'EDGE_ERROR',
                        rejectedReason: `Edge returned HTTP ${response.status}`,
                    };
                }
            }
            const result = await response.json();
            return {
                requestId: result.requestId || humanAction.requestId,
                eventId: result.eventId || humanAction.eventId,
                accepted: result.accepted ?? false,
                rejectedCode: result.rejectedCode,
                rejectedReason: result.rejectedReason,
                activeResolver: result.activeResolver,
                lockExpiresAt: result.lockExpiresAt,
                ledgerSeqCommitted: result.ledgerSeqCommitted,
                fromState: result.fromState,
                toState: result.toState,
            };
        }
        catch (err) {
            if (err.name === 'AbortError') {
                this.logger.error(`RAHA forward timeout after ${this.forwardTimeout}ms`);
                return {
                    requestId: humanAction.requestId,
                    eventId: humanAction.eventId,
                    accepted: false,
                    rejectedCode: 'TIMEOUT',
                    rejectedReason: `Edge did not respond within ${this.forwardTimeout}ms`,
                };
            }
            this.logger.error(`RAHA forward failed: ${err.message}`);
            return {
                requestId: humanAction.requestId,
                eventId: humanAction.eventId,
                accepted: false,
                rejectedCode: 'NETWORK_ERROR',
                rejectedReason: err.message || 'Failed to connect to Edge',
            };
        }
    }
    async updateEdgeUrl(userId, circleId, deviceId, edgeUrl) {
        await this.circlesService.mustHaveRole(userId, circleId, ['owner']);
        const device = await this.edgeDevicesRepo.findOne({
            where: { id: deviceId, circleId },
        });
        if (!device) {
            throw new common_1.NotFoundException('Device not found');
        }
        const metadata = device.metadata || {};
        metadata.edgeUrl = edgeUrl;
        await this.edgeDevicesRepo.update({ id: deviceId }, { metadata });
        this.logger.log(`Updated Edge URL for device ${deviceId}: ${edgeUrl}`);
        return { deviceId, edgeUrl };
    }
    async getEdgeUrl(userId, circleId, deviceId) {
        await this.circlesService.mustHaveRole(userId, circleId, ['owner', 'household']);
        const device = await this.edgeDevicesRepo.findOne({
            where: { id: deviceId, circleId },
        });
        if (!device) {
            throw new common_1.NotFoundException('Device not found');
        }
        const metadata = device.metadata || {};
        return {
            deviceId,
            edgeUrl: metadata.edgeUrl || this.defaultEdgeUrl || null,
        };
    }
};
exports.RahaActionsService = RahaActionsService;
exports.RahaActionsService = RahaActionsService = RahaActionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_edge_device_entity_1.NgEdgeDevice)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        circles_service_1.CirclesService,
        config_1.ConfigService])
], RahaActionsService);
//# sourceMappingURL=raha-actions.service.js.map