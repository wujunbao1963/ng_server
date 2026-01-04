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
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const ng_http_error_1 = require("../common/errors/ng-http-error");
const notifications_service_1 = require("./notifications.service");
let NotificationsController = class NotificationsController {
    constructor(svc) {
        this.svc = svc;
    }
    async registerPushDevice(req, body) {
        const { platform, token, deviceId, appVersion, locale, timezone } = body;
        if (!platform || !['ios', 'android', 'web'].includes(platform)) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 400,
                error: 'Bad Request',
                code: ng_http_error_1.NgErrorCodes.VALIDATION_ERROR,
                message: 'Invalid platform. Must be ios, android, or web.',
                timestamp: new Date().toISOString(),
            });
        }
        if (!token || typeof token !== 'string' || token.length < 10) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 400,
                error: 'Bad Request',
                code: ng_http_error_1.NgErrorCodes.VALIDATION_ERROR,
                message: 'Invalid token.',
                timestamp: new Date().toISOString(),
            });
        }
        const result = await this.svc.registerPushDevice({
            userId: req.user.userId,
            platform,
            token,
            deviceId,
            appVersion,
            locale,
            timezone,
        });
        return {
            ok: true,
            device: result,
        };
    }
    async unregisterPushDevice(req, pushDeviceId) {
        const deleted = await this.svc.unregisterPushDevice(req.user.userId, pushDeviceId);
        if (!deleted) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
                message: 'Push device not found.',
                timestamp: new Date().toISOString(),
            });
        }
        return { ok: true };
    }
    async listNotifications(req, cursor, limitStr) {
        const limit = Math.min(Math.max(parseInt(limitStr || '20', 10) || 20, 1), 50);
        const result = await this.svc.listNotifications(req.user.userId, limit, cursor);
        return result;
    }
    async getNotification(req, notificationId) {
        const notification = await this.svc.getNotification(req.user.userId, notificationId);
        if (!notification) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
                message: 'Notification not found.',
                timestamp: new Date().toISOString(),
            });
        }
        return { notification: notification.toResponse() };
    }
    async markRead(req, notificationId, body) {
        if (body.read === false) {
            return { ok: true, status: { readAt: null } };
        }
        const result = await this.svc.markRead(req.user.userId, notificationId);
        if (!result) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
                message: 'Notification not found.',
                timestamp: new Date().toISOString(),
            });
        }
        return { ok: true, status: result };
    }
    async acknowledgeNotification(req, notificationId, body) {
        if (body.ack === false) {
            return { ok: true, status: { ackedAt: null } };
        }
        const result = await this.svc.markAcked(req.user.userId, notificationId);
        if (!result) {
            throw new ng_http_error_1.NgHttpError({
                statusCode: 404,
                error: 'Not Found',
                code: ng_http_error_1.NgErrorCodes.NOT_FOUND,
                message: 'Notification not found.',
                timestamp: new Date().toISOString(),
            });
        }
        return { ok: true, status: result };
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Post)('push/devices'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "registerPushDevice", null);
__decorate([
    (0, common_1.Delete)('push/devices/:pushDeviceId'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('pushDeviceId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "unregisterPushDevice", null);
__decorate([
    (0, common_1.Get)('notifications'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('cursor')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "listNotifications", null);
__decorate([
    (0, common_1.Get)('notifications/:notificationId'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('notificationId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getNotification", null);
__decorate([
    (0, common_1.Patch)('notifications/:notificationId/read'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('notificationId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markRead", null);
__decorate([
    (0, common_1.Patch)('notifications/:notificationId/ack'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('notificationId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "acknowledgeNotification", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, common_1.Controller)('/v1'),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map