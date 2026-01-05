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
var PushNotificationHandler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OUTBOX_HANDLERS = exports.PushNotificationHandler = exports.NonRetryableError = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ng_outbox_entity_1 = require("./ng-outbox.entity");
const ng_push_device_entity_1 = require("../../notifications/ng-push-device.entity");
const push_provider_port_1 = require("../../infra/ports/push-provider.port");
class NonRetryableError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NonRetryableError';
    }
}
exports.NonRetryableError = NonRetryableError;
let PushNotificationHandler = PushNotificationHandler_1 = class PushNotificationHandler {
    constructor(pushProvider, pushDevicesRepo) {
        this.pushProvider = pushProvider;
        this.pushDevicesRepo = pushDevicesRepo;
        this.messageType = ng_outbox_entity_1.OutboxMessageType.PUSH_NOTIFICATION;
        this.logger = new common_1.Logger(PushNotificationHandler_1.name);
    }
    async handle(message) {
        const { notificationId, userId, title, body, data } = message.payload;
        if (!userId || !title || !body) {
            throw new NonRetryableError('Missing required fields: userId, title, body');
        }
        const devices = await this.pushDevicesRepo.find({
            where: { userId },
        });
        if (devices.length === 0) {
            this.logger.debug(`No push devices for user ${userId}, skipping`);
            return;
        }
        const payload = {
            title,
            body,
            data: {
                notificationId: notificationId ?? '',
                ...data,
            },
        };
        const tokens = devices.map(d => d.token);
        const results = await this.pushProvider.sendBatch(tokens, payload);
        let successCount = 0;
        let failCount = 0;
        const tokensToRemove = [];
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const device = devices[i];
            if (result.success) {
                successCount++;
                this.logger.debug(`Push sent to device ${device.id}: messageId=${result.messageId}`);
            }
            else {
                failCount++;
                this.logger.warn(`Push failed to device ${device.id}: ${result.error}`);
                if (result.shouldRemoveToken) {
                    tokensToRemove.push(device.id);
                }
            }
        }
        if (tokensToRemove.length > 0) {
            await this.pushDevicesRepo.delete(tokensToRemove);
            this.logger.log(`Removed ${tokensToRemove.length} invalid push devices`);
        }
        if (successCount === 0 && failCount > 0) {
            throw new Error(`All ${failCount} push deliveries failed`);
        }
        this.logger.log(`Push notification sent: notificationId=${notificationId} ` +
            `success=${successCount} failed=${failCount}`);
    }
};
exports.PushNotificationHandler = PushNotificationHandler;
exports.PushNotificationHandler = PushNotificationHandler = PushNotificationHandler_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(push_provider_port_1.PUSH_PROVIDER_PORT)),
    __param(1, (0, typeorm_1.InjectRepository)(ng_push_device_entity_1.NgPushDevice)),
    __metadata("design:paramtypes", [Object, typeorm_2.Repository])
], PushNotificationHandler);
exports.OUTBOX_HANDLERS = Symbol('OUTBOX_HANDLERS');
//# sourceMappingURL=push-notification.handler.js.map