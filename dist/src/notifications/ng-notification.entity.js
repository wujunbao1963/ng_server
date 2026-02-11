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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NgNotificationThrottle = exports.NgNotificationConfig = exports.NgNotification = void 0;
const typeorm_1 = require("typeorm");
let NgNotification = class NgNotification {
    toResponse() {
        return {
            notificationId: this.id,
            userId: this.userId,
            houseId: this.houseId || this.circleId,
            circleId: this.circleId,
            type: this.type,
            severity: this.severity,
            priority: this.priority,
            roleContext: this.roleContext,
            title: this.title,
            body: this.body,
            deeplink: this.deeplinkRoute ? {
                route: this.deeplinkRoute,
                params: this.deeplinkParams,
            } : null,
            eventRef: this.eventRef,
            preLevel: this.preLevel,
            threatState: this.threatState,
            triggerReason: this.triggerReason,
            caseId: this.caseId,
            taskId: this.taskId,
            status: {
                deliveryStatus: this.deliveryStatus,
                deliveredPush: this.deliveredPush,
                deliveredInApp: this.deliveredInApp,
                sentAt: this.sentAt?.toISOString() ?? null,
                readAt: this.readAt?.toISOString() ?? null,
                ackedAt: this.ackedAt?.toISOString() ?? null,
            },
            createdAt: this.createdAt.toISOString(),
            expiresAt: this.expiresAt?.toISOString() ?? null,
        };
    }
};
exports.NgNotification = NgNotification;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], NgNotification.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'user_id' }),
    __metadata("design:type", String)
], NgNotification.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'circle_id' }),
    __metadata("design:type", String)
], NgNotification.prototype, "circleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'house_id', nullable: true }),
    __metadata("design:type", Object)
], NgNotification.prototype, "houseId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], NgNotification.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: 'info' }),
    __metadata("design:type", String)
], NgNotification.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: 'NORMAL' }),
    __metadata("design:type", String)
], NgNotification.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'role_context', nullable: true }),
    __metadata("design:type", Object)
], NgNotification.prototype, "roleContext", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], NgNotification.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], NgNotification.prototype, "body", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'deeplink_route', nullable: true }),
    __metadata("design:type", Object)
], NgNotification.prototype, "deeplinkRoute", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'deeplink_params', nullable: true }),
    __metadata("design:type", Object)
], NgNotification.prototype, "deeplinkParams", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'event_ref', nullable: true }),
    __metadata("design:type", Object)
], NgNotification.prototype, "eventRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'pre_level', nullable: true }),
    __metadata("design:type", Object)
], NgNotification.prototype, "preLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'threat_state', nullable: true }),
    __metadata("design:type", Object)
], NgNotification.prototype, "threatState", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'trigger_reason', nullable: true }),
    __metadata("design:type", Object)
], NgNotification.prototype, "triggerReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'case_id', nullable: true }),
    __metadata("design:type", Object)
], NgNotification.prototype, "caseId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'task_id', nullable: true }),
    __metadata("design:type", Object)
], NgNotification.prototype, "taskId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'delivery_status', default: 'PENDING' }),
    __metadata("design:type", String)
], NgNotification.prototype, "deliveryStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'delivered_push', default: false }),
    __metadata("design:type", Boolean)
], NgNotification.prototype, "deliveredPush", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'delivered_in_app', default: true }),
    __metadata("design:type", Boolean)
], NgNotification.prototype, "deliveredInApp", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'sent_at', nullable: true }),
    __metadata("design:type", Object)
], NgNotification.prototype, "sentAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'deferred_until', nullable: true }),
    __metadata("design:type", Object)
], NgNotification.prototype, "deferredUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', name: 'retry_count', default: 0 }),
    __metadata("design:type", Number)
], NgNotification.prototype, "retryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'last_error', nullable: true }),
    __metadata("design:type", Object)
], NgNotification.prototype, "lastError", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'read_at', nullable: true }),
    __metadata("design:type", Object)
], NgNotification.prototype, "readAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'acked_at', nullable: true }),
    __metadata("design:type", Object)
], NgNotification.prototype, "ackedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], NgNotification.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'expires_at', nullable: true }),
    __metadata("design:type", Object)
], NgNotification.prototype, "expiresAt", void 0);
exports.NgNotification = NgNotification = __decorate([
    (0, typeorm_1.Entity)('ng_notifications'),
    (0, typeorm_1.Index)('idx_ng_notifications_user', ['userId', 'createdAt']),
    (0, typeorm_1.Index)('idx_ng_notifications_circle', ['circleId', 'createdAt']),
    (0, typeorm_1.Index)('idx_ng_notifications_house_type', ['houseId', 'type']),
    (0, typeorm_1.Index)('idx_ng_notifications_delivery_status', ['deliveryStatus'])
], NgNotification);
let NgNotificationConfig = class NgNotificationConfig {
};
exports.NgNotificationConfig = NgNotificationConfig;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], NgNotificationConfig.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'house_id', unique: true }),
    __metadata("design:type", String)
], NgNotificationConfig.prototype, "houseId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'quiet_hours_enabled', default: false }),
    __metadata("design:type", Boolean)
], NgNotificationConfig.prototype, "quietHoursEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'time', name: 'quiet_hours_start', nullable: true }),
    __metadata("design:type", Object)
], NgNotificationConfig.prototype, "quietHoursStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'time', name: 'quiet_hours_end', nullable: true }),
    __metadata("design:type", Object)
], NgNotificationConfig.prototype, "quietHoursEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'quiet_hours_timezone', default: 'UTC' }),
    __metadata("design:type", String)
], NgNotificationConfig.prototype, "quietHoursTimezone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'caretaker_alert_mode', default: 'CONCURRENT' }),
    __metadata("design:type", String)
], NgNotificationConfig.prototype, "caretakerAlertMode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', name: 'caretaker_delay_sec', default: 300 }),
    __metadata("design:type", Number)
], NgNotificationConfig.prototype, "caretakerDelaySec", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', name: 'pre_throttle_window_sec', default: 120 }),
    __metadata("design:type", Number)
], NgNotificationConfig.prototype, "preThrottleWindowSec", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', name: 'pre_throttle_max', default: 1 }),
    __metadata("design:type", Number)
], NgNotificationConfig.prototype, "preThrottleMax", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], NgNotificationConfig.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'updated_at', default: () => 'now()' }),
    __metadata("design:type", Date)
], NgNotificationConfig.prototype, "updatedAt", void 0);
exports.NgNotificationConfig = NgNotificationConfig = __decorate([
    (0, typeorm_1.Entity)('ng_notification_config')
], NgNotificationConfig);
let NgNotificationThrottle = class NgNotificationThrottle {
};
exports.NgNotificationThrottle = NgNotificationThrottle;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], NgNotificationThrottle.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'house_id' }),
    __metadata("design:type", String)
], NgNotificationThrottle.prototype, "houseId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'throttle_key' }),
    __metadata("design:type", String)
], NgNotificationThrottle.prototype, "throttleKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', name: 'notification_count', default: 1 }),
    __metadata("design:type", Number)
], NgNotificationThrottle.prototype, "notificationCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'window_start', default: () => 'now()' }),
    __metadata("design:type", Date)
], NgNotificationThrottle.prototype, "windowStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'last_notification_at', default: () => 'now()' }),
    __metadata("design:type", Date)
], NgNotificationThrottle.prototype, "lastNotificationAt", void 0);
exports.NgNotificationThrottle = NgNotificationThrottle = __decorate([
    (0, typeorm_1.Entity)('ng_notification_throttle'),
    (0, typeorm_1.Index)('idx_ng_notification_throttle_cleanup', ['windowStart'])
], NgNotificationThrottle);
//# sourceMappingURL=ng-notification.entity.js.map