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
exports.NgUser = void 0;
const typeorm_1 = require("typeorm");
let NgUser = class NgUser {
};
exports.NgUser = NgUser;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'id', type: 'uuid' }),
    __metadata("design:type", String)
], NgUser.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'email', type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], NgUser.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_name', type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", Object)
], NgUser.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'password_hash', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], NgUser.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_admin', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], NgUser.prototype, "isAdmin", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'can_create_circle', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], NgUser.prototype, "canCreateCircle", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NgUser.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], NgUser.prototype, "updatedAt", void 0);
exports.NgUser = NgUser = __decorate([
    (0, typeorm_1.Entity)({ name: 'ng_users' })
], NgUser);
//# sourceMappingURL=ng-user.entity.js.map