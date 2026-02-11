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
exports.NgWitnessAlert = exports.WitnessAlertPriority = exports.WitnessAlertType = void 0;
const typeorm_1 = require("typeorm");
var WitnessAlertType;
(function (WitnessAlertType) {
    WitnessAlertType["TASK_CREATED"] = "task_created";
    WitnessAlertType["TASK_CLAIMED"] = "task_claimed";
    WitnessAlertType["TASK_ARRIVED"] = "task_arrived";
    WitnessAlertType["TASK_SUBMITTED"] = "task_submitted";
    WitnessAlertType["TASK_CLOSED"] = "task_closed";
    WitnessAlertType["TASK_CANCELED"] = "task_canceled";
    WitnessAlertType["TASK_EXPIRED"] = "task_expired";
    WitnessAlertType["TASK_ABANDONED"] = "task_abandoned";
    WitnessAlertType["TASK_RISK_ABORTED"] = "task_risk_aborted";
})(WitnessAlertType || (exports.WitnessAlertType = WitnessAlertType = {}));
var WitnessAlertPriority;
(function (WitnessAlertPriority) {
    WitnessAlertPriority["LOW"] = "low";
    WitnessAlertPriority["NORMAL"] = "normal";
    WitnessAlertPriority["HIGH"] = "high";
    WitnessAlertPriority["URGENT"] = "urgent";
})(WitnessAlertPriority || (exports.WitnessAlertPriority = WitnessAlertPriority = {}));
let NgWitnessAlert = class NgWitnessAlert {
};
exports.NgWitnessAlert = NgWitnessAlert;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'uuid' }),
    __metadata("design:type", String)
], NgWitnessAlert.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', name: 'user_id' }),
    __metadata("design:type", String)
], NgWitnessAlert.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, name: 'type' }),
    __metadata("design:type", String)
], NgWitnessAlert.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'normal' }),
    __metadata("design:type", String)
], NgWitnessAlert.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], NgWitnessAlert.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessAlert.prototype, "body", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', name: 'circle_id', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessAlert.prototype, "circleId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', name: 'task_id', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessAlert.prototype, "taskId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, name: 'event_id', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessAlert.prototype, "eventId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'actor_user_id', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessAlert.prototype, "actorUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, name: 'actor_role', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessAlert.prototype, "actorRole", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], NgWitnessAlert.prototype, "read", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'read_at', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessAlert.prototype, "readAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessAlert.prototype, "data", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], NgWitnessAlert.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'expires_at', nullable: true }),
    __metadata("design:type", Object)
], NgWitnessAlert.prototype, "expiresAt", void 0);
exports.NgWitnessAlert = NgWitnessAlert = __decorate([
    (0, typeorm_1.Entity)({ name: 'ng_witness_alerts' })
], NgWitnessAlert);
//# sourceMappingURL=ng-witness-alert.entity.js.map