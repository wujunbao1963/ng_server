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
exports.RahaActionsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const raha_actions_service_1 = require("./raha-actions.service");
const dto_1 = require("./dto");
let RahaActionsController = class RahaActionsController {
    constructor(rahaService) {
        this.rahaService = rahaService;
    }
    async executeAction(circleId, dto, req) {
        const userId = req.user?.sub || req.user?.id;
        if (!userId) {
            return {
                requestId: '',
                eventId: dto.eventId || null,
                accepted: false,
                rejectedCode: 'UNAUTHORIZED',
                rejectedReason: 'User not authenticated',
            };
        }
        return this.rahaService.executeAction(userId, circleId, dto);
    }
    async getEdgeUrl(circleId, deviceId, req) {
        const userId = req.user?.sub || req.user?.id;
        return this.rahaService.getEdgeUrl(userId, circleId, deviceId);
    }
    async setEdgeUrl(circleId, deviceId, body, req) {
        const userId = req.user?.sub || req.user?.id;
        return this.rahaService.updateEdgeUrl(userId, circleId, deviceId, body.edgeUrl);
    }
};
exports.RahaActionsController = RahaActionsController;
__decorate([
    (0, common_1.Post)('actions'),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.ExecuteActionDto, Object]),
    __metadata("design:returntype", Promise)
], RahaActionsController.prototype, "executeAction", null);
__decorate([
    (0, common_1.Get)('devices/:deviceId/edge-url'),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('deviceId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], RahaActionsController.prototype, "getEdgeUrl", null);
__decorate([
    (0, common_1.Put)('devices/:deviceId/edge-url'),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Param)('deviceId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], RahaActionsController.prototype, "setEdgeUrl", null);
exports.RahaActionsController = RahaActionsController = __decorate([
    (0, common_1.Controller)('/api/circles/:circleId'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [raha_actions_service_1.RahaActionsService])
], RahaActionsController);
//# sourceMappingURL=raha-actions.controller.js.map