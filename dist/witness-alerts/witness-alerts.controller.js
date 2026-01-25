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
exports.WitnessAlertsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const witness_alerts_service_1 = require("./witness-alerts.service");
let WitnessAlertsController = class WitnessAlertsController {
    constructor(witnessAlertsService) {
        this.witnessAlertsService = witnessAlertsService;
    }
    async listAlerts(req, unreadOnly, types, circleId, limit, offset) {
        const result = await this.witnessAlertsService.listForUser(req.user.userId, {
            unreadOnly: unreadOnly === 'true',
            types: types ? types.split(',') : undefined,
            circleId,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
        return {
            alerts: result.alerts.map(a => this.formatAlert(a)),
            total: result.total,
            unreadCount: result.unreadCount,
        };
    }
    async getUnreadCount(req) {
        const count = await this.witnessAlertsService.getUnreadCount(req.user.userId);
        return { unreadCount: count };
    }
    async markAsRead(alertId, req) {
        await this.witnessAlertsService.markAsRead(req.user.userId, alertId);
        return { success: true };
    }
    async markAllAsRead(req) {
        const count = await this.witnessAlertsService.markAllAsRead(req.user.userId);
        return { success: true, markedCount: count };
    }
    async deleteAlert(alertId, req) {
        await this.witnessAlertsService.delete(req.user.userId, alertId);
        return { success: true };
    }
    formatAlert(alert) {
        return {
            id: alert.id,
            type: alert.type,
            priority: alert.priority,
            title: alert.title,
            body: alert.body,
            circleId: alert.circleId,
            taskId: alert.taskId,
            eventId: alert.eventId,
            actorUserId: alert.actorUserId,
            actorRole: alert.actorRole,
            read: alert.read,
            readAt: alert.readAt?.toISOString?.() ?? alert.readAt,
            data: alert.data,
            createdAt: alert.createdAt?.toISOString?.() ?? alert.createdAt,
        };
    }
};
exports.WitnessAlertsController = WitnessAlertsController;
__decorate([
    (0, common_1.Get)('api/me/witness-alerts'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('unreadOnly')),
    __param(2, (0, common_1.Query)('types')),
    __param(3, (0, common_1.Query)('circleId')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], WitnessAlertsController.prototype, "listAlerts", null);
__decorate([
    (0, common_1.Get)('api/me/witness-alerts/unread-count'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WitnessAlertsController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Post)('api/me/witness-alerts/:alertId/read'),
    __param(0, (0, common_1.Param)('alertId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WitnessAlertsController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Post)('api/me/witness-alerts/read-all'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WitnessAlertsController.prototype, "markAllAsRead", null);
__decorate([
    (0, common_1.Delete)('api/me/witness-alerts/:alertId'),
    __param(0, (0, common_1.Param)('alertId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WitnessAlertsController.prototype, "deleteAlert", null);
exports.WitnessAlertsController = WitnessAlertsController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [witness_alerts_service_1.WitnessAlertsService])
], WitnessAlertsController);
//# sourceMappingURL=witness-alerts.controller.js.map