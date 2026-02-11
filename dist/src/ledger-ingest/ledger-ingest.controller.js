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
exports.LedgerIngestController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const device_key_auth_guard_1 = require("../device-auth/device-key-auth.guard");
const ng_device_decorator_1 = require("../device-auth/ng-device.decorator");
const ng_edge_device_entity_1 = require("../edge-devices/ng-edge-device.entity");
const circles_service_1 = require("../circles/circles.service");
const ledger_ingest_service_1 = require("./ledger-ingest.service");
let LedgerIngestController = class LedgerIngestController {
    constructor(svc, circles) {
        this.svc = svc;
        this.circles = circles;
    }
    async uploadBatch(circleId, device, body) {
        if (device.circleId !== circleId) {
            return {
                ok: false,
                ackedSeq: 0,
                insertedCount: 0,
                skippedCount: 0,
                error: 'Device not authorized for this circle',
                retryable: false,
            };
        }
        return this.svc.ingestBatch(circleId, body);
    }
    async getAckSeq(circleId, device, edgeInstanceId) {
        if (device.circleId !== circleId) {
            return { ok: false, error: 'Device not authorized for this circle' };
        }
        const ackSeq = await this.svc.getAckSeq(circleId, edgeInstanceId);
        return {
            ok: true,
            edgeInstanceId,
            ackedSeq: ackSeq,
        };
    }
    async postAck(circleId, device, body) {
        return {
            ok: true,
            ackedSeq: body.ackedSeq,
        };
    }
    async queryLedger(req, circleId, eventId, entryType, edgeInstanceId, limitStr) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        const limit = Math.min(parseInt(limitStr ?? '50', 10) || 50, 200);
        if (eventId) {
            const entries = await this.svc.getEntriesForEvent(circleId, eventId, limit);
            return { entries, count: entries.length };
        }
        if (entryType) {
            const entries = await this.svc.getEntriesByType(circleId, entryType, limit);
            return { entries, count: entries.length };
        }
        if (edgeInstanceId) {
            const entries = await this.svc.getRecentEntries(circleId, edgeInstanceId, limit);
            return { entries, count: entries.length };
        }
        const entries = await this.svc.getRecentEntries(circleId, '', limit);
        return { entries, count: entries.length };
    }
};
exports.LedgerIngestController = LedgerIngestController;
__decorate([
    (0, common_1.Post)('/api/circles/:circleId/edge/ledger/batch'),
    (0, common_1.UseGuards)(device_key_auth_guard_1.DeviceKeyAuthGuard),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, ng_device_decorator_1.NgDevice)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ng_edge_device_entity_1.NgEdgeDevice, Object]),
    __metadata("design:returntype", Promise)
], LedgerIngestController.prototype, "uploadBatch", null);
__decorate([
    (0, common_1.Get)('/api/circles/:circleId/edge/ledger/ack'),
    (0, common_1.UseGuards)(device_key_auth_guard_1.DeviceKeyAuthGuard),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, ng_device_decorator_1.NgDevice)()),
    __param(2, (0, common_1.Query)('edgeInstanceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ng_edge_device_entity_1.NgEdgeDevice, String]),
    __metadata("design:returntype", Promise)
], LedgerIngestController.prototype, "getAckSeq", null);
__decorate([
    (0, common_1.Post)('/api/circles/:circleId/edge/ledger/ack'),
    (0, common_1.UseGuards)(device_key_auth_guard_1.DeviceKeyAuthGuard),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, ng_device_decorator_1.NgDevice)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ng_edge_device_entity_1.NgEdgeDevice, Object]),
    __metadata("design:returntype", Promise)
], LedgerIngestController.prototype, "postAck", null);
__decorate([
    (0, common_1.Get)('/api/circles/:circleId/ledger'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Query)('eventId')),
    __param(3, (0, common_1.Query)('entryType')),
    __param(4, (0, common_1.Query)('edgeInstanceId')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], LedgerIngestController.prototype, "queryLedger", null);
exports.LedgerIngestController = LedgerIngestController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [ledger_ingest_service_1.LedgerIngestService,
        circles_service_1.CirclesService])
], LedgerIngestController);
//# sourceMappingURL=ledger-ingest.controller.js.map