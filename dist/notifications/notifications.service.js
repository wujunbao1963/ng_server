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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ng_notification_entity_1 = require("./ng-notification.entity");
const ng_push_device_entity_1 = require("./ng-push-device.entity");
const crypto = require("crypto");
const logger_service_1 = require("../common/infra/logger.service");
const clock_port_1 = require("../common/infra/clock.port");
const outbox_1 = require("../common/outbox");
let NotificationsService = class NotificationsService {
    constructor(dataSource, notificationsRepo, pushDevicesRepo, clock, outboxService, logger) {
        this.dataSource = dataSource;
        this.notificationsRepo = notificationsRepo;
        this.pushDevicesRepo = pushDevicesRepo;
        this.clock = clock;
        this.outboxService = outboxService;
        this.logger = logger.setContext('NotificationsService');
    }
    async registerPushDevice(args) {
        const tokenHash = this.hashToken(args.token);
        const existing = await this.pushDevicesRepo.findOne({
            where: { userId: args.userId, token: args.token },
        });
        if (existing) {
            existing.platform = args.platform;
            existing.deviceId = args.deviceId ?? null;
            existing.appVersion = args.appVersion ?? null;
            existing.locale = args.locale ?? null;
            existing.timezone = args.timezone ?? null;
            existing.updatedAt = new Date();
            await this.pushDevicesRepo.save(existing);
            return {
                pushDeviceId: existing.id,
                platform: existing.platform,
                tokenHash: `sha256:${tokenHash}`,
                updatedAt: existing.updatedAt.toISOString(),
            };
        }
        const device = this.pushDevicesRepo.create({
            userId: args.userId,
            platform: args.platform,
            token: args.token,
            deviceId: args.deviceId ?? null,
            appVersion: args.appVersion ?? null,
            locale: args.locale ?? null,
            timezone: args.timezone ?? null,
        });
        await this.pushDevicesRepo.save(device);
        return {
            pushDeviceId: device.id,
            platform: device.platform,
            tokenHash: `sha256:${tokenHash}`,
            updatedAt: device.createdAt.toISOString(),
        };
    }
    async unregisterPushDevice(userId, pushDeviceId) {
        const result = await this.pushDevicesRepo.delete({ id: pushDeviceId, userId });
        return (result.affected ?? 0) > 0;
    }
    async getUserPushDevices(userId) {
        return this.pushDevicesRepo.find({ where: { userId } });
    }
    async listNotifications(userId, limit = 20, cursor) {
        const qb = this.notificationsRepo
            .createQueryBuilder('n')
            .where('n.userId = :userId', { userId })
            .orderBy('n.createdAt', 'DESC')
            .take(limit + 1);
        if (cursor) {
            qb.andWhere('n.createdAt < :cursor', { cursor: new Date(cursor) });
        }
        const rows = await qb.getMany();
        const hasMore = rows.length > limit;
        const items = hasMore ? rows.slice(0, limit) : rows;
        const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;
        return {
            items: items.map((n) => n.toResponse()),
            nextCursor,
        };
    }
    async getNotification(userId, notificationId) {
        return this.notificationsRepo.findOne({
            where: { id: notificationId, userId },
        });
    }
    async markRead(userId, notificationId) {
        const notification = await this.notificationsRepo.findOne({
            where: { id: notificationId, userId },
        });
        if (!notification)
            return null;
        if (!notification.readAt) {
            notification.readAt = new Date();
            await this.notificationsRepo.save(notification);
        }
        return { readAt: notification.readAt.toISOString() };
    }
    async markAcked(userId, notificationId) {
        const notification = await this.notificationsRepo.findOne({
            where: { id: notificationId, userId },
        });
        if (!notification)
            return null;
        if (!notification.ackedAt) {
            notification.ackedAt = new Date();
            await this.notificationsRepo.save(notification);
        }
        return { ackedAt: notification.ackedAt.toISOString() };
    }
    async createParcelNotification(args) {
        const logCtx = {
            userId: args.userId,
            circleId: args.circleId,
            eventId: args.eventId,
        };
        const existing = await this.notificationsRepo
            .createQueryBuilder('n')
            .where('n.userId = :userId', { userId: args.userId })
            .andWhere('n.type = :type', { type: 'LOGISTICS_PARCEL_DELIVERED' })
            .andWhere("n.eventRef->>'eventId' = :eventId", { eventId: args.eventId })
            .getOne();
        if (existing) {
            this.logger.log('Skipping duplicate parcel notification', logCtx);
            return existing;
        }
        const notification = await this.dataSource.transaction(async (manager) => {
            return this.createNotificationWithOutbox(manager, {
                userId: args.userId,
                circleId: args.circleId,
                type: 'LOGISTICS_PARCEL_DELIVERED',
                severity: 'info',
                title: '📦 快递到达',
                body: args.entryPointId ? `在 ${args.entryPointId} 检测到快递` : '检测到快递到达',
                deeplinkRoute: 'event_detail',
                deeplinkParams: { eventId: args.eventId },
                eventRef: {
                    eventId: args.eventId,
                    workflowClass: 'LOGISTICS',
                    deviceId: args.edgeInstanceId,
                },
            });
        });
        this.logger.log('Created parcel notification with outbox', {
            ...logCtx,
            notificationId: notification.id,
        });
        return notification;
    }
    async createNotificationWithOutbox(manager, args) {
        const expiresAt = this.clock.after(7 * 24 * 60 * 60);
        const notificationRepo = manager.getRepository(ng_notification_entity_1.NgNotification);
        const notification = notificationRepo.create({
            userId: args.userId,
            circleId: args.circleId,
            type: args.type,
            severity: args.severity,
            title: args.title,
            body: args.body,
            deeplinkRoute: args.deeplinkRoute,
            deeplinkParams: args.deeplinkParams,
            eventRef: args.eventRef,
            deliveredPush: false,
            deliveredInApp: true,
            expiresAt,
        });
        await notificationRepo.save(notification);
        const pushPayload = {
            notificationId: notification.id,
            userId: args.userId,
            title: args.title,
            body: args.body,
            data: {
                notificationId: notification.id,
                type: args.type,
                circleId: args.circleId,
                deeplinkRoute: args.deeplinkRoute ?? '',
                deeplinkParams: JSON.stringify(args.deeplinkParams ?? {}),
            },
            priority: args.severity === 'critical' ? 'high' : 'normal',
        };
        await this.outboxService.enqueue({
            messageType: 'PUSH_NOTIFICATION',
            payload: pushPayload,
            aggregateId: notification.id,
            aggregateType: 'Notification',
            idempotencyKey: `push:${notification.id}`,
        }, manager);
        return notification;
    }
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(ng_notification_entity_1.NgNotification)),
    __param(2, (0, typeorm_1.InjectRepository)(ng_push_device_entity_1.NgPushDevice)),
    __param(3, (0, common_1.Inject)(clock_port_1.CLOCK_PORT)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        typeorm_2.Repository,
        typeorm_2.Repository, Object, outbox_1.OutboxService,
        logger_service_1.NgLoggerService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map