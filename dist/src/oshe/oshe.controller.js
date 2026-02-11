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
exports.OsheController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const oshe_service_1 = require("./oshe.service");
let OsheController = class OsheController {
    constructor(osheService) {
        this.osheService = osheService;
    }
    async createOshe(circleId, eventId, body, req) {
        const eventContext = {
            eventId,
            threatState: body.eventThreatState ?? body.afterThreatState,
            stateChangedAt: body.eventStateChangedAt ? new Date(body.eventStateChangedAt) : new Date(),
        };
        const oshe = await this.osheService.createOshe(req.user.userId, circleId, { ...body, eventId }, eventContext);
        return { oshe: this.formatOshe(oshe) };
    }
    async listOshe(circleId, eventId, req) {
        const items = await this.osheService.listByEvent(req.user.userId, circleId, eventId);
        return {
            osheItems: items.map(i => this.formatOshe(i)),
            total: items.length,
        };
    }
    async getManifest(circleId, eventId, req) {
        await this.osheService.listByEvent(req.user.userId, circleId, eventId);
        const items = await this.osheService.getManifestItems(circleId, eventId);
        return {
            eventId,
            osheItems: items,
            count: items.length,
            note: '⚠️ Human On-Scene Evidence - Supplemental only',
        };
    }
    async getOshe(circleId, eventId, osheId, req) {
        const oshe = await this.osheService.getOshe(req.user.userId, circleId, eventId, osheId);
        return { oshe: this.formatOshe(oshe) };
    }
    formatOshe(oshe) {
        return {
            id: oshe.id,
            circleId: oshe.circleId,
            eventId: oshe.eventId,
            evidenceClass: oshe.evidenceClass,
            mediaType: oshe.mediaType,
            capturedAt: oshe.capturedAt?.toISOString?.() ?? oshe.capturedAt,
            capturedByUserId: oshe.capturedByUserId,
            capturedByRole: oshe.capturedByRole,
            afterThreatState: oshe.afterThreatState,
            source: 'human_on_scene',
            auditWeight: 'supplemental',
            presenceVerified: oshe.presenceVerified,
            presenceVerificationDegraded: oshe.presenceVerificationDegraded,
            presenceLocation: oshe.presenceLatitude ? {
                latitude: oshe.presenceLatitude,
                longitude: oshe.presenceLongitude,
                accuracyM: oshe.presenceAccuracyM,
            } : null,
            file: {
                url: oshe.fileUrl,
                name: oshe.fileName,
                sizeBytes: oshe.fileSizeBytes,
                hashSha256: oshe.fileHashSha256,
            },
            serverReceivedAt: oshe.serverReceivedAt?.toISOString?.() ?? oshe.serverReceivedAt,
            timestampDiscrepancy: oshe.timestampDiscrepancy,
            notes: oshe.notes,
            witnessTaskId: oshe.witnessTaskId,
        };
    }
};
exports.OsheController = OsheController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('eventId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], OsheController.prototype, "createOshe", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('eventId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], OsheController.prototype, "listOshe", null);
__decorate([
    (0, common_1.Get)('manifest'),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('eventId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], OsheController.prototype, "getManifest", null);
__decorate([
    (0, common_1.Get)(':osheId'),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('eventId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Param)('osheId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], OsheController.prototype, "getOshe", null);
exports.OsheController = OsheController = __decorate([
    (0, common_1.Controller)('api/circles/:circleId/events/:eventId/oshe'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [oshe_service_1.OsheService])
], OsheController);
//# sourceMappingURL=oshe.controller.js.map