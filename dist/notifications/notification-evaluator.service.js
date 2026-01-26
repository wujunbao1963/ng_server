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
var NotificationEvaluator_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationEvaluator = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ng_notification_entity_1 = require("./ng-notification.entity");
const outbox_1 = require("../common/outbox");
let NotificationEvaluator = NotificationEvaluator_1 = class NotificationEvaluator {
    constructor(notificationsRepo, configRepo, throttleRepo, outboxService, dataSource) {
        this.notificationsRepo = notificationsRepo;
        this.configRepo = configRepo;
        this.throttleRepo = throttleRepo;
        this.outboxService = outboxService;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(NotificationEvaluator_1.name);
    }
    async evaluateEdgeEvent(input) {
        const { threatState, workflowClass, triggerReason, mode, notificationEligible, notificationHint } = input;
        const houseId = input.circleId;
        this.logger.log(`Evaluating event: eventId=${input.eventId} threatState=${threatState} ` +
            `workflowClass=${workflowClass} mode=${mode} notificationEligible=${notificationEligible}`);
        if (notificationEligible === false) {
            this.logger.log(`Edge suppressed notification: eventId=${input.eventId} ` +
                `reason=${notificationHint?.suppressReason || 'EDGE_DECIDED'}`);
            return {
                shouldNotify: false,
                reason: `edge_suppressed:${notificationHint?.suppressReason || 'unspecified'}`,
                edgeDecided: true,
            };
        }
        if (notificationEligible === true) {
            this.logger.log(`Edge approved notification: eventId=${input.eventId}`);
            const notificationType = this.mapToNotificationType(input);
            if (!notificationType) {
                return { shouldNotify: false, reason: 'no_matching_type', edgeDecided: true };
            }
            const config = await this.getOrCreateConfig(houseId);
            const throttled = await this.checkThrottle(houseId, input.eventId, notificationType, config);
            if (throttled) {
                return { shouldNotify: false, throttled: true, reason: 'throttled', edgeDecided: true };
            }
            return {
                shouldNotify: true,
                notificationType,
                priority: this.getPriority(notificationType, threatState),
                severity: this.getSeverity(notificationType, threatState),
                preLevel: notificationHint?.preLevel || input.preLevel,
                reason: 'edge_approved',
                edgeDecided: true,
            };
        }
        this.logger.debug(`Fallback to server evaluation: eventId=${input.eventId} (Edge did not send notificationEligible)`);
        const notificationType = this.mapToNotificationType(input);
        if (!notificationType) {
            return { shouldNotify: false, reason: 'no_matching_type' };
        }
        if (mode?.toLowerCase() === 'home') {
            const isAllowed = this.isAllowedInHomeMode(threatState, triggerReason, workflowClass);
            if (!isAllowed) {
                return { shouldNotify: false, reason: 'home_mode_silent_fallback' };
            }
        }
        if (notificationType === 'SECURITY_PRE_ALERT' && input.preLevel === 'L0') {
            return { shouldNotify: false, reason: 'pre_l0_silent' };
        }
        const config = await this.getOrCreateConfig(houseId);
        const throttled = await this.checkThrottle(houseId, input.eventId, notificationType, config);
        if (throttled) {
            return { shouldNotify: false, throttled: true, reason: 'throttled' };
        }
        const quietHoursResult = this.checkQuietHours(config, notificationType);
        if (quietHoursResult.deferred) {
            return {
                shouldNotify: true,
                notificationType,
                priority: this.getPriority(notificationType, threatState),
                severity: this.getSeverity(notificationType, threatState),
                preLevel: input.preLevel,
                deferred: true,
                deferredUntil: quietHoursResult.deferredUntil,
                reason: 'quiet_hours_deferred',
            };
        }
        return {
            shouldNotify: true,
            notificationType,
            priority: this.getPriority(notificationType, threatState),
            severity: this.getSeverity(notificationType, threatState),
            preLevel: input.preLevel,
            reason: 'approved_fallback',
        };
    }
    mapToNotificationType(input) {
        const { threatState, workflowClass, triggerReason } = input;
        if (workflowClass === 'LOGISTICS' && triggerReason === 'delivery_detected') {
            return 'LOGISTICS_DELIVERY';
        }
        if (triggerReason === 'life_safety') {
            return 'LIFE_SAFETY_ALARM';
        }
        switch (threatState) {
            case 'TRIGGERED':
                return 'SECURITY_TRIGGERED_ALARM';
            case 'PENDING':
                return 'SECURITY_PENDING_ALERT';
            case 'PRE':
            case 'PRE_L1':
            case 'PRE_L2':
            case 'PRE_L3':
                return 'SECURITY_PRE_ALERT';
            default:
                break;
        }
        if (triggerReason?.includes('tamper')) {
            return 'SECURITY_TAMPER_ALERT';
        }
        return null;
    }
    getPriority(type, threatState) {
        switch (type) {
            case 'LIFE_SAFETY_ALARM':
                return 'CRITICAL';
            case 'SECURITY_TRIGGERED_ALARM':
                return 'CRITICAL';
            case 'SECURITY_PENDING_ALERT':
                return 'HIGH';
            case 'SECURITY_TAMPER_ALERT':
                return 'HIGH';
            case 'SECURITY_PRE_ALERT':
                return 'NORMAL';
            case 'LOGISTICS_DELIVERY':
                return 'LOW';
            default:
                return 'NORMAL';
        }
    }
    getSeverity(type, threatState) {
        switch (type) {
            case 'LIFE_SAFETY_ALARM':
            case 'SECURITY_TRIGGERED_ALARM':
                return 'critical';
            case 'SECURITY_PENDING_ALERT':
            case 'SECURITY_TAMPER_ALERT':
                return 'warning';
            default:
                return 'info';
        }
    }
    isAllowedInHomeMode(threatState, triggerReason, workflowClass) {
        if (threatState === 'TRIGGERED' || triggerReason === 'glass_break') {
            return true;
        }
        if (workflowClass === 'LOGISTICS' && triggerReason === 'delivery_detected') {
            return true;
        }
        return false;
    }
    async checkThrottle(houseId, eventId, type, config) {
        if (type === 'SECURITY_PRE_ALERT') {
            const throttleKey = `PRE:${eventId}`;
            const windowSec = config.preThrottleWindowSec;
            const maxCount = config.preThrottleMax;
            return this.isThrottled(houseId, throttleKey, windowSec, maxCount);
        }
        return false;
    }
    async isThrottled(houseId, throttleKey, windowSec, maxCount) {
        const windowStart = new Date(Date.now() - windowSec * 1000);
        const existing = await this.throttleRepo.findOne({
            where: { houseId, throttleKey },
        });
        if (!existing) {
            await this.throttleRepo.save({
                houseId,
                throttleKey,
                notificationCount: 1,
                windowStart: new Date(),
                lastNotificationAt: new Date(),
            });
            return false;
        }
        if (existing.windowStart < windowStart) {
            existing.notificationCount = 1;
            existing.windowStart = new Date();
            existing.lastNotificationAt = new Date();
            await this.throttleRepo.save(existing);
            return false;
        }
        if (existing.notificationCount >= maxCount) {
            this.logger.debug(`Throttled: ${throttleKey} count=${existing.notificationCount}/${maxCount}`);
            return true;
        }
        existing.notificationCount += 1;
        existing.lastNotificationAt = new Date();
        await this.throttleRepo.save(existing);
        return false;
    }
    checkQuietHours(config, type) {
        const priority = this.getPriority(type);
        if (priority === 'CRITICAL') {
            return { deferred: false };
        }
        if (!config.quietHoursEnabled || !config.quietHoursStart || !config.quietHoursEnd) {
            return { deferred: false };
        }
        const now = new Date();
        const tz = config.quietHoursTimezone || 'UTC';
        const currentTime = now.toISOString().slice(11, 16);
        const start = config.quietHoursStart.slice(0, 5);
        const end = config.quietHoursEnd.slice(0, 5);
        let inQuietHours = false;
        if (start <= end) {
            inQuietHours = currentTime >= start && currentTime <= end;
        }
        else {
            inQuietHours = currentTime >= start || currentTime <= end;
        }
        if (inQuietHours) {
            const deferredUntil = this.calculateDeferredUntil(end, tz);
            return { deferred: true, deferredUntil };
        }
        return { deferred: false };
    }
    calculateDeferredUntil(endTime, timezone) {
        const now = new Date();
        const [hours, minutes] = endTime.split(':').map(Number);
        const target = new Date(now);
        target.setHours(hours, minutes, 0, 0);
        if (target <= now) {
            target.setDate(target.getDate() + 1);
        }
        return target;
    }
    async getOrCreateConfig(houseId) {
        let config = await this.configRepo.findOne({ where: { houseId } });
        if (!config) {
            config = this.configRepo.create({
                houseId,
                quietHoursEnabled: false,
                caretakerAlertMode: 'CONCURRENT',
                caretakerDelaySec: 300,
                preThrottleWindowSec: 120,
                preThrottleMax: 1,
            });
            await this.configRepo.save(config);
        }
        return config;
    }
    generateContent(type, input) {
        const entryPoint = input.entryPointId || '未知区域';
        switch (type) {
            case 'LIFE_SAFETY_ALARM':
                return {
                    emoji: '🆘',
                    title: '紧急：生命安全警报',
                    body: `检测到烟雾/一氧化碳警报，请立即确认安全`,
                };
            case 'SECURITY_TRIGGERED_ALARM':
                return {
                    emoji: '🚨',
                    title: '入侵警报已触发',
                    body: `在 ${entryPoint} 触发入侵警报，请立即查看`,
                };
            case 'SECURITY_PENDING_ALERT':
                const delaySec = input.entryDelaySec || 30;
                return {
                    emoji: '⚠️',
                    title: '安全警报：等待验证',
                    body: `${entryPoint} 门已打开，${delaySec}秒后将触发警报`,
                };
            case 'SECURITY_PRE_ALERT':
                const levelEmoji = input.preLevel === 'L2' ? '⚡' : '👀';
                const levelLabel = input.preLevel === 'L2' ? '可疑活动' : '轻微异常';
                return {
                    emoji: levelEmoji,
                    title: levelLabel,
                    body: `在 ${entryPoint} 检测到${levelLabel}`,
                };
            case 'SECURITY_TAMPER_ALERT':
                return {
                    emoji: '🔧',
                    title: '设备异常警报',
                    body: `检测到设备可能被篡改，请检查`,
                };
            case 'LOGISTICS_DELIVERY':
                return {
                    emoji: '📦',
                    title: '快递到达',
                    body: `在 ${entryPoint} 检测到快递`,
                };
            default:
                return {
                    emoji: '🔔',
                    title: '安全通知',
                    body: '检测到安全事件，请查看',
                };
        }
    }
};
exports.NotificationEvaluator = NotificationEvaluator;
exports.NotificationEvaluator = NotificationEvaluator = NotificationEvaluator_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_notification_entity_1.NgNotification)),
    __param(1, (0, typeorm_1.InjectRepository)(ng_notification_entity_1.NgNotificationConfig)),
    __param(2, (0, typeorm_1.InjectRepository)(ng_notification_entity_1.NgNotificationThrottle)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        outbox_1.OutboxService,
        typeorm_2.DataSource])
], NotificationEvaluator);
//# sourceMappingURL=notification-evaluator.service.js.map