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
exports.WitnessAlertsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto = require("crypto");
const ng_witness_alert_entity_1 = require("./ng-witness-alert.entity");
let WitnessAlertsService = class WitnessAlertsService {
    constructor(alertsRepo) {
        this.alertsRepo = alertsRepo;
    }
    async create(dto) {
        const alert = this.alertsRepo.create({
            id: crypto.randomUUID(),
            userId: dto.userId,
            type: dto.type,
            title: dto.title,
            body: dto.body ?? null,
            priority: dto.priority ?? ng_witness_alert_entity_1.WitnessAlertPriority.NORMAL,
            circleId: dto.circleId ?? null,
            taskId: dto.taskId ?? null,
            eventId: dto.eventId ?? null,
            actorUserId: dto.actorUserId ?? null,
            actorRole: dto.actorRole ?? null,
            data: dto.data ?? null,
            read: false,
            readAt: null,
            expiresAt: dto.expiresAt ?? null,
        });
        await this.alertsRepo.save(alert);
        console.log(`[WitnessAlert] Created: ${dto.type} for user ${dto.userId}`);
        return alert;
    }
    async createBatch(userIds, dto) {
        const alerts = userIds.map(userId => this.alertsRepo.create({
            id: crypto.randomUUID(),
            userId,
            type: dto.type,
            title: dto.title,
            body: dto.body ?? null,
            priority: dto.priority ?? ng_witness_alert_entity_1.WitnessAlertPriority.NORMAL,
            circleId: dto.circleId ?? null,
            taskId: dto.taskId ?? null,
            eventId: dto.eventId ?? null,
            actorUserId: dto.actorUserId ?? null,
            actorRole: dto.actorRole ?? null,
            data: dto.data ?? null,
            read: false,
            readAt: null,
            expiresAt: dto.expiresAt ?? null,
        }));
        await this.alertsRepo.save(alerts);
        console.log(`[WitnessAlert] Created batch: ${dto.type} for ${userIds.length} users`);
        return alerts;
    }
    async listForUser(userId, options) {
        const where = { userId };
        if (options?.unreadOnly) {
            where.read = false;
        }
        if (options?.types && options.types.length > 0) {
            where.type = options.types;
        }
        if (options?.circleId) {
            where.circleId = options.circleId;
        }
        const [alerts, total] = await this.alertsRepo.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            take: options?.limit ?? 50,
            skip: options?.offset ?? 0,
        });
        const unreadCount = await this.alertsRepo.count({
            where: { userId, read: false },
        });
        return { alerts, total, unreadCount };
    }
    async getUnreadCount(userId) {
        return this.alertsRepo.count({
            where: { userId, read: false },
        });
    }
    async markAsRead(userId, alertId) {
        await this.alertsRepo.update({ id: alertId, userId }, { read: true, readAt: new Date() });
    }
    async markAllAsRead(userId) {
        const result = await this.alertsRepo.update({ userId, read: false }, { read: true, readAt: new Date() });
        return result.affected ?? 0;
    }
    async delete(userId, alertId) {
        await this.alertsRepo.delete({ id: alertId, userId });
    }
    async cleanupExpired() {
        const result = await this.alertsRepo.delete({
            expiresAt: (0, typeorm_2.LessThan)(new Date()),
        });
        return result.affected ?? 0;
    }
    async notifyTaskClaimed(creatorUserId, task, witnessUserId) {
        return this.create({
            userId: creatorUserId,
            type: ng_witness_alert_entity_1.WitnessAlertType.TASK_CLAIMED,
            title: '协助任务已被领取',
            body: `您的任务「${task.title}」已被领取，协助者正在前往现场。`,
            priority: ng_witness_alert_entity_1.WitnessAlertPriority.NORMAL,
            circleId: task.circleId,
            taskId: task.id,
            eventId: task.eventId ?? undefined,
            actorUserId: witnessUserId,
            actorRole: 'witness',
        });
    }
    async notifyTaskArrived(creatorUserId, task, witnessUserId) {
        return this.create({
            userId: creatorUserId,
            type: ng_witness_alert_entity_1.WitnessAlertType.TASK_ARRIVED,
            title: '协助者已到达现场',
            body: `协助者已到达「${task.title}」的现场，正在查看情况。`,
            priority: ng_witness_alert_entity_1.WitnessAlertPriority.HIGH,
            circleId: task.circleId,
            taskId: task.id,
            eventId: task.eventId ?? undefined,
            actorUserId: witnessUserId,
            actorRole: 'witness',
        });
    }
    async notifyTaskSubmitted(creatorUserId, task, witnessUserId, conclusion) {
        const conclusionText = conclusion === 'SAFE' ? '现场安全'
            : conclusion === 'ABNORMAL' ? '发现异常'
                : conclusion === 'NEEDS_ACTION' ? '需要进一步行动'
                    : '已完成';
        return this.create({
            userId: creatorUserId,
            type: ng_witness_alert_entity_1.WitnessAlertType.TASK_SUBMITTED,
            title: '协助报告已提交',
            body: `「${task.title}」的协助报告已提交，结论: ${conclusionText}`,
            priority: ng_witness_alert_entity_1.WitnessAlertPriority.HIGH,
            circleId: task.circleId,
            taskId: task.id,
            eventId: task.eventId ?? undefined,
            actorUserId: witnessUserId,
            actorRole: 'witness',
            data: { conclusion },
        });
    }
    async notifyTaskCanceled(witnessUserId, task, canceledByUserId, canceledByRole, reason) {
        return this.create({
            userId: witnessUserId,
            type: ng_witness_alert_entity_1.WitnessAlertType.TASK_CANCELED,
            title: '协助任务已取消',
            body: reason
                ? `任务「${task.title}」已被取消，原因: ${reason}`
                : `任务「${task.title}」已被取消`,
            priority: ng_witness_alert_entity_1.WitnessAlertPriority.HIGH,
            circleId: task.circleId,
            taskId: task.id,
            eventId: task.eventId ?? undefined,
            actorUserId: canceledByUserId,
            actorRole: canceledByRole,
            data: { reason },
        });
    }
    async notifyTaskRiskAborted(creatorUserId, task, witnessUserId, reason) {
        return this.create({
            userId: creatorUserId,
            type: ng_witness_alert_entity_1.WitnessAlertType.TASK_RISK_ABORTED,
            title: '⚠️ 协助者风险退出',
            body: `协助者因现场风险退出任务「${task.title}」，原因: ${reason}`,
            priority: ng_witness_alert_entity_1.WitnessAlertPriority.URGENT,
            circleId: task.circleId,
            taskId: task.id,
            eventId: task.eventId ?? undefined,
            actorUserId: witnessUserId,
            actorRole: 'witness',
            data: { reason },
        });
    }
    async notifyTaskExpired(creatorUserId, task) {
        return this.create({
            userId: creatorUserId,
            type: ng_witness_alert_entity_1.WitnessAlertType.TASK_EXPIRED,
            title: '协助任务已过期',
            body: `任务「${task.title}」已过期，无人响应。`,
            priority: ng_witness_alert_entity_1.WitnessAlertPriority.NORMAL,
            circleId: task.circleId,
            taskId: task.id,
            eventId: task.eventId ?? undefined,
        });
    }
    async notifyTaskAbandoned(creatorUserId, task, witnessUserId, reason) {
        return this.create({
            userId: creatorUserId,
            type: ng_witness_alert_entity_1.WitnessAlertType.TASK_ABANDONED,
            title: '协助任务已放弃',
            body: `任务「${task.title}」被放弃，原因: ${reason}`,
            priority: ng_witness_alert_entity_1.WitnessAlertPriority.HIGH,
            circleId: task.circleId,
            taskId: task.id,
            eventId: task.eventId ?? undefined,
            actorUserId: witnessUserId,
            actorRole: 'witness',
            data: { reason },
        });
    }
};
exports.WitnessAlertsService = WitnessAlertsService;
exports.WitnessAlertsService = WitnessAlertsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_witness_alert_entity_1.NgWitnessAlert)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], WitnessAlertsService);
//# sourceMappingURL=witness-alerts.service.js.map