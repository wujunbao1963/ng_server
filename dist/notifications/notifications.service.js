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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ng_notification_entity_1 = require("./ng-notification.entity");
const ng_push_device_entity_1 = require("./ng-push-device.entity");
const outbox_1 = require("../common/outbox");
const crypto = require("crypto");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(notificationsRepo, pushDevicesRepo, outboxService, dataSource) {
        this.notificationsRepo = notificationsRepo;
        this.pushDevicesRepo = pushDevicesRepo;
        this.outboxService = outboxService;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(NotificationsService_1.name);
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
    async createSecurityNotification(args) {
        const existing = await this.notificationsRepo
            .createQueryBuilder('n')
            .where('n.userId = :userId', { userId: args.userId })
            .andWhere('n.type = :type', { type: 'SECURITY_ALERT' })
            .andWhere("n.event_ref->>'eventId' = :eventId", { eventId: args.eventId })
            .getOne();
        if (existing) {
            this.logger.log(`Skipping duplicate security notification: eventId=${args.eventId}`);
            return existing;
        }
        return this.dataSource.transaction(async (manager) => {
            return this.createSecurityNotificationWithOutbox(manager, args);
        });
    }
    async createSecurityNotificationWithOutbox(manager, args) {
        const notificationsRepo = manager.getRepository(ng_notification_entity_1.NgNotification);
        const severityMap = {
            'TRIGGERED': { severity: 'critical', emoji: '🚨', label: '入侵警报' },
            'PENDING': { severity: 'warning', emoji: '⚠️', label: '安全警报' },
            'PRE_L3': { severity: 'warning', emoji: '⚠️', label: '高度可疑' },
            'PRE_L2': { severity: 'warning', emoji: '⚡', label: '可疑活动' },
            'PRE_L1': { severity: 'info', emoji: '👀', label: '轻微异常' },
            'PRE': { severity: 'warning', emoji: '⚡', label: '可疑活动' },
        };
        const info = severityMap[args.alarmState || 'PENDING'] || severityMap['PENDING'];
        const title = args.title || `${info.emoji} ${info.label}`;
        const body = args.entryPointId
            ? `在 ${args.entryPointId} 检测到异常活动`
            : '检测到安全事件，请立即查看';
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const notification = notificationsRepo.create({
            userId: args.userId,
            circleId: args.circleId,
            type: 'SECURITY_ALERT',
            severity: info.severity,
            title,
            body,
            deeplinkRoute: 'event_detail',
            deeplinkParams: { eventId: args.eventId },
            eventRef: {
                eventId: args.eventId,
                workflowClass: 'SECURITY',
                deviceId: args.edgeInstanceId,
                alarmState: args.alarmState,
            },
            deliveredPush: false,
            deliveredInApp: true,
            expiresAt,
        });
        await notificationsRepo.save(notification);
        await this.outboxService.enqueue({
            messageType: outbox_1.OutboxMessageType.PUSH_NOTIFICATION,
            payload: {
                notificationId: notification.id,
                userId: notification.userId,
                title: notification.title,
                body: notification.body,
                data: {
                    route: notification.deeplinkRoute,
                    eventId: args.eventId,
                    priority: 'high',
                },
            },
            aggregateId: notification.id,
            aggregateType: 'Notification',
            idempotencyKey: `push:${notification.id}`,
        }, manager);
        this.logger.log(`Created security notification with push: ${notification.id} for eventId=${args.eventId} alarmState=${args.alarmState}`);
        return notification;
    }
    async createParcelNotification(args) {
        const existing = await this.notificationsRepo
            .createQueryBuilder('n')
            .where('n.userId = :userId', { userId: args.userId })
            .andWhere('n.type = :type', { type: 'LOGISTICS_PARCEL_DELIVERED' })
            .andWhere("n.event_ref->>'eventId' = :eventId", { eventId: args.eventId })
            .getOne();
        if (existing) {
            this.logger.log(`Skipping duplicate parcel notification: eventId=${args.eventId}`);
            return existing;
        }
        return this.dataSource.transaction(async (manager) => {
            return this.createNotificationWithOutbox(manager, args);
        });
    }
    async createNotificationWithOutbox(manager, args) {
        const notificationsRepo = manager.getRepository(ng_notification_entity_1.NgNotification);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const notification = notificationsRepo.create({
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
            deliveredPush: false,
            deliveredInApp: true,
            expiresAt,
        });
        await notificationsRepo.save(notification);
        await this.outboxService.enqueue({
            messageType: outbox_1.OutboxMessageType.PUSH_NOTIFICATION,
            payload: {
                notificationId: notification.id,
                userId: notification.userId,
                title: notification.title,
                body: notification.body,
                data: {
                    route: notification.deeplinkRoute,
                    eventId: args.eventId,
                },
            },
            aggregateId: notification.id,
            aggregateType: 'Notification',
            idempotencyKey: `push:${notification.id}`,
        }, manager);
        this.logger.log(`Created parcel notification with push: ${notification.id} for eventId=${args.eventId}`);
        return notification;
    }
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_notification_entity_1.NgNotification)),
    __param(1, (0, typeorm_1.InjectRepository)(ng_push_device_entity_1.NgPushDevice)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        outbox_1.OutboxService,
        typeorm_2.DataSource])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map