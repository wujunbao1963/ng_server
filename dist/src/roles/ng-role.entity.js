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
exports.NgRoleAudit = exports.NgRole = void 0;
const typeorm_1 = require("typeorm");
let NgRole = class NgRole {
};
exports.NgRole = NgRole;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'uuid' }),
    __metadata("design:type", String)
], NgRole.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', name: 'circle_id' }),
    __metadata("design:type", String)
], NgRole.prototype, "circleId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', name: 'user_id' }),
    __metadata("design:type", String)
], NgRole.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], NgRole.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], NgRole.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'display_name', nullable: true }),
    __metadata("design:type", Object)
], NgRole.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'valid_from' }),
    __metadata("design:type", Date)
], NgRole.prototype, "validFrom", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'valid_until', nullable: true }),
    __metadata("design:type", Object)
], NgRole.prototype, "validUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], NgRole.prototype, "suspended", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'pin_hash', nullable: true }),
    __metadata("design:type", Object)
], NgRole.prototype, "pinHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], NgRole.prototype, "permissions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', name: 'sync_version', default: 1 }),
    __metadata("design:type", Number)
], NgRole.prototype, "syncVersion", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], NgRole.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz', name: 'updated_at' }),
    __metadata("design:type", Date)
], NgRole.prototype, "updatedAt", void 0);
exports.NgRole = NgRole = __decorate([
    (0, typeorm_1.Entity)({ name: 'ng_roles' }),
    (0, typeorm_1.Index)(['circleId', 'userId'], { unique: true })
], NgRole);
let NgRoleAudit = class NgRoleAudit {
};
exports.NgRoleAudit = NgRoleAudit;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'uuid' }),
    __metadata("design:type", String)
], NgRoleAudit.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', name: 'circle_id' }),
    __metadata("design:type", String)
], NgRoleAudit.prototype, "circleId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'uuid', name: 'role_id' }),
    __metadata("design:type", String)
], NgRoleAudit.prototype, "roleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'target_user_id' }),
    __metadata("design:type", String)
], NgRoleAudit.prototype, "targetUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'actor_user_id' }),
    __metadata("design:type", String)
], NgRoleAudit.prototype, "actorUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], NgRoleAudit.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'old_values', nullable: true }),
    __metadata("design:type", Object)
], NgRoleAudit.prototype, "oldValues", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', name: 'new_values', nullable: true }),
    __metadata("design:type", Object)
], NgRoleAudit.prototype, "newValues", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], NgRoleAudit.prototype, "createdAt", void 0);
exports.NgRoleAudit = NgRoleAudit = __decorate([
    (0, typeorm_1.Entity)({ name: 'ng_role_audit' })
], NgRoleAudit);
//# sourceMappingURL=ng-role.entity.js.map