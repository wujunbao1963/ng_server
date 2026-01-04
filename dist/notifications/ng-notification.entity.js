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
exports.NgNotification = void 0;
const typeorm_1 = require("typeorm");
let NgNotification = class NgNotification {
    toResponse() {
        return {
            notificationId: this.id,
            userId: this.userId,
            circleId: this.circleId,
            type: this.type,
            severity: this.severity,
            title: this.title,
            body: this.body,
            deeplink: this.deeplinkRoute ? {
                route: this.deeplinkRoute,
                params: this.deeplinkParams,
            } : null,
            eventRef: this.eventRef,
            status: {
                deliveredPush: this.deliveredPush,
                deliveredInApp: this.deliveredInApp,
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
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], NgNotification.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: 'info' }),
    __metadata("design:type", String)
], NgNotification.prototype, "severity", void 0);
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
    (0, typeorm_1.Column)({ type: 'boolean', name: 'delivered_push', default: false }),
    __metadata("design:type", Boolean)
], NgNotification.prototype, "deliveredPush", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', name: 'delivered_in_app', default: true }),
    __metadata("design:type", Boolean)
], NgNotification.prototype, "deliveredInApp", void 0);
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
    (0, typeorm_1.Index)('idx_ng_notifications_circle', ['circleId', 'createdAt'])
], NgNotification);
//# sourceMappingURL=ng-notification.entity.js.map