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
exports.PushNotificationHandler = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const logger_service_1 = require("../infra/logger.service");
const push_provider_port_1 = require("../infra/push-provider.port");
const ng_push_device_entity_1 = require("../../notifications/ng-push-device.entity");
const ng_notification_entity_1 = require("../../notifications/ng-notification.entity");
let PushNotificationHandler = class PushNotificationHandler {
    constructor(pushDevicesRepo, notificationsRepo, pushProvider, logger) {
        this.pushDevicesRepo = pushDevicesRepo;
        this.notificationsRepo = notificationsRepo;
        this.pushProvider = pushProvider;
        this.messageType = 'PUSH_NOTIFICATION';
        this.logger = logger.setContext('PushNotificationHandler');
    }
    async handle(message) {
        const payload = message.payload;
        const logCtx = {
            messageId: message.id,
            notificationId: payload.notificationId,
            userId: payload.userId,
        };
        this.logger.log('Processing push notification', logCtx);
        const devices = await this.pushDevicesRepo.find({
            where: { userId: payload.userId },
        });
        if (devices.length === 0) {
            this.logger.log('No push devices found for user', logCtx);
            await this.updateNotificationDelivered(payload.notificationId);
            return { success: true };
        }
        const pushPayload = {
            title: payload.title,
            body: payload.body,
            data: payload.data,
            priority: payload.priority ?? 'normal',
        };
        const fcmDevices = devices.filter((d) => d.platform === 'android' || d.platform === 'fcm');
        const apnsDevices = devices.filter((d) => d.platform === 'ios' || d.platform === 'apns');
        const invalidTokens = [];
        let totalSuccess = 0;
        let totalFailure = 0;
        if (fcmDevices.length > 0) {
            try {
                const tokens = fcmDevices.map((d) => d.token);
                const result = await this.pushProvider.sendBatch(tokens, pushPayload, 'fcm');
                totalSuccess += result.successCount;
                totalFailure += result.failureCount;
                invalidTokens.push(...result.invalidTokens);
                this.logger.log('FCM batch sent', {
                    ...logCtx,
                    successCount: result.successCount,
                    failureCount: result.failureCount,
                });
            }
            catch (error) {
                this.logger.error('FCM batch failed', error.message, logCtx);
                totalFailure += fcmDevices.length;
            }
        }
        if (apnsDevices.length > 0) {
            try {
                const tokens = apnsDevices.map((d) => d.token);
                const result = await this.pushProvider.sendBatch(tokens, pushPayload, 'apns');
                totalSuccess += result.successCount;
                totalFailure += result.failureCount;
                invalidTokens.push(...result.invalidTokens);
                this.logger.log('APNs batch sent', {
                    ...logCtx,
                    successCount: result.successCount,
                    failureCount: result.failureCount,
                });
            }
            catch (error) {
                this.logger.error('APNs batch failed', error.message, logCtx);
                totalFailure += apnsDevices.length;
            }
        }
        if (invalidTokens.length > 0) {
            await this.cleanupInvalidTokens(payload.userId, invalidTokens);
        }
        if (totalSuccess > 0) {
            await this.updateNotificationDelivered(payload.notificationId);
        }
        if (totalSuccess > 0) {
            return { success: true };
        }
        else if (totalFailure > 0) {
            return {
                success: false,
                error: `All ${totalFailure} push attempts failed`,
                retryable: true,
            };
        }
        else {
            return { success: true };
        }
    }
    async cleanupInvalidTokens(userId, tokens) {
        if (tokens.length === 0)
            return;
        this.logger.log('Cleaning up invalid tokens', {
            userId,
            tokenCount: tokens.length,
        });
        for (const token of tokens) {
            await this.pushDevicesRepo.delete({ userId, token });
        }
    }
    async updateNotificationDelivered(notificationId) {
        await this.notificationsRepo.update({ id: notificationId }, { deliveredPush: true });
    }
};
exports.PushNotificationHandler = PushNotificationHandler;
exports.PushNotificationHandler = PushNotificationHandler = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_push_device_entity_1.NgPushDevice)),
    __param(1, (0, typeorm_1.InjectRepository)(ng_notification_entity_1.NgNotification)),
    __param(2, (0, common_1.Inject)(push_provider_port_1.PUSH_PROVIDER_PORT)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository, Object, logger_service_1.NgLoggerService])
], PushNotificationHandler);
//# sourceMappingURL=push-notification.handler.js.map