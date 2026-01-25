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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const admin_guard_1 = require("./admin.guard");
const admin_service_1 = require("./admin.service");
const evidence_tickets_service_1 = require("../evidence-tickets/evidence-tickets.service");
const outbox_service_1 = require("../common/outbox/outbox.service");
const outbox_worker_1 = require("../common/outbox/outbox.worker");
const ng_outbox_entity_1 = require("../common/outbox/ng-outbox.entity");
const web_push_provider_1 = require("../infra/ports/web-push-provider");
const ng_notification_entity_1 = require("../notifications/ng-notification.entity");
const ng_push_device_entity_1 = require("../notifications/ng-push-device.entity");
let AdminController = class AdminController {
    constructor(adminService, evidenceTickets, outboxService, outboxWorker, webPushProvider, outboxRepo, notificationsRepo, pushDevicesRepo) {
        this.adminService = adminService;
        this.evidenceTickets = evidenceTickets;
        this.outboxService = outboxService;
        this.outboxWorker = outboxWorker;
        this.webPushProvider = webPushProvider;
        this.outboxRepo = outboxRepo;
        this.notificationsRepo = notificationsRepo;
        this.pushDevicesRepo = pushDevicesRepo;
    }
    async getStats() {
        return this.adminService.getStats();
    }
    async listUsers(limit, offset) {
        return this.adminService.listUsers({
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
    }
    async getUser(id) {
        return this.adminService.getUser(id);
    }
    async createUser(dto) {
        const user = await this.adminService.createUser(dto);
        return { user };
    }
    async updateUser(id, dto) {
        const user = await this.adminService.updateUser(id, dto);
        return { user };
    }
    async deleteUser(id) {
        return this.adminService.deleteUser(id);
    }
    async grantOwner(id) {
        return this.adminService.grantOwner(id);
    }
    async revokeOwner(id) {
        return this.adminService.revokeOwner(id);
    }
    async listCircles(limit, offset) {
        return this.adminService.listCircles({
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
    }
    async getCircle(id) {
        return this.adminService.getCircle(id);
    }
    async cleanupExpiredTickets() {
        const result = await this.evidenceTickets.purgeExpired();
        return { message: 'Cleanup complete', ...result };
    }
    async diagnosePush() {
        const webPushConfigured = this.webPushProvider.isConfigured();
        const vapidPublicKey = this.webPushProvider.getVapidPublicKey();
        const outboxStats = await this.outboxService.getStats();
        const workerStats = this.outboxWorker.getStats();
        const recentFailures = await this.outboxRepo.find({
            where: { status: (0, typeorm_2.In)([ng_outbox_entity_1.OutboxStatus.FAILED, ng_outbox_entity_1.OutboxStatus.DEAD]) },
            order: { createdAt: 'DESC' },
            take: 10,
        });
        const recentNotifications = await this.notificationsRepo.find({
            order: { createdAt: 'DESC' },
            take: 5,
        });
        const pushDeviceCount = await this.pushDevicesRepo.count();
        const pushDevicesByPlatform = await this.pushDevicesRepo
            .createQueryBuilder('d')
            .select('d.platform', 'platform')
            .addSelect('COUNT(*)', 'count')
            .groupBy('d.platform')
            .getRawMany();
        return {
            timestamp: new Date().toISOString(),
            webPush: {
                configured: webPushConfigured,
                vapidPublicKeyPresent: !!vapidPublicKey,
                vapidPublicKeyPrefix: vapidPublicKey ? vapidPublicKey.slice(0, 20) + '...' : null,
            },
            outbox: outboxStats,
            worker: workerStats,
            pushDevices: {
                total: pushDeviceCount,
                byPlatform: pushDevicesByPlatform,
            },
            recentNotifications: recentNotifications.map(n => ({
                id: n.id,
                type: n.type,
                severity: n.severity,
                title: n.title,
                deliveredPush: n.deliveredPush,
                createdAt: n.createdAt,
            })),
            recentFailures: recentFailures.map(f => ({
                id: f.id,
                messageType: f.messageType,
                status: f.status,
                retryCount: f.retryCount,
                maxRetries: f.maxRetries,
                lastError: f.lastError,
                createdAt: f.createdAt,
                payload: {
                    notificationId: f.payload?.notificationId,
                    userId: f.payload?.userId,
                    title: f.payload?.title,
                },
            })),
        };
    }
    async triggerOutboxPoll() {
        await this.outboxWorker.triggerPoll();
        const stats = await this.outboxService.getStats();
        return {
            message: 'Poll triggered',
            outboxStats: stats,
        };
    }
    async resetFailedOutbox() {
        const count = await this.outboxService.resetFailedMessages();
        return {
            message: `Reset ${count} failed messages to PENDING`,
            resetCount: count,
        };
    }
    async getOutboxMessages(status, limitStr) {
        const limit = Math.min(parseInt(limitStr || '20', 10) || 20, 100);
        const where = {};
        if (status && Object.values(ng_outbox_entity_1.OutboxStatus).includes(status)) {
            where.status = status;
        }
        const messages = await this.outboxRepo.find({
            where,
            order: { createdAt: 'DESC' },
            take: limit,
        });
        return {
            count: messages.length,
            messages: messages.map(m => ({
                id: m.id,
                messageType: m.messageType,
                status: m.status,
                retryCount: m.retryCount,
                maxRetries: m.maxRetries,
                lastError: m.lastError,
                scheduledAt: m.scheduledAt,
                startedAt: m.startedAt,
                completedAt: m.completedAt,
                processingTimeMs: m.processingTimeMs,
                createdAt: m.createdAt,
                payload: m.payload,
            })),
        };
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Get)('users/:id'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUser", null);
__decorate([
    (0, common_1.Post)('users'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createUser", null);
__decorate([
    (0, common_1.Patch)('users/:id'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Delete)('users/:id'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Post)('users/:id/grant-owner'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "grantOwner", null);
__decorate([
    (0, common_1.Delete)('users/:id/grant-owner'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "revokeOwner", null);
__decorate([
    (0, common_1.Get)('circles'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listCircles", null);
__decorate([
    (0, common_1.Get)('circles/:id'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getCircle", null);
__decorate([
    (0, common_1.Post)('maintenance/evidence/cleanup'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "cleanupExpiredTickets", null);
__decorate([
    (0, common_1.Get)('diagnostics/push'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "diagnosePush", null);
__decorate([
    (0, common_1.Post)('diagnostics/push/trigger-poll'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "triggerOutboxPoll", null);
__decorate([
    (0, common_1.Post)('diagnostics/push/reset-failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "resetFailedOutbox", null);
__decorate([
    (0, common_1.Get)('diagnostics/push/outbox-messages'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getOutboxMessages", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('api/admin'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), admin_guard_1.AdminGuard),
    __param(5, (0, typeorm_1.InjectRepository)(ng_outbox_entity_1.NgOutbox)),
    __param(6, (0, typeorm_1.InjectRepository)(ng_notification_entity_1.NgNotification)),
    __param(7, (0, typeorm_1.InjectRepository)(ng_push_device_entity_1.NgPushDevice)),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        evidence_tickets_service_1.EvidenceTicketsService,
        outbox_service_1.OutboxService,
        outbox_worker_1.OutboxWorker,
        web_push_provider_1.WebPushProvider,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AdminController);
//# sourceMappingURL=admin.controller.js.map