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
exports.RolesController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const device_key_auth_guard_1 = require("../device-auth/device-key-auth.guard");
const ng_device_decorator_1 = require("../device-auth/ng-device.decorator");
const ng_edge_device_entity_1 = require("../edge-devices/ng-edge-device.entity");
const circles_service_1 = require("../circles/circles.service");
const roles_service_1 = require("./roles.service");
let RolesController = class RolesController {
    constructor(svc, circles) {
        this.svc = svc;
        this.circles = circles;
    }
    async listRoles(req, circleId) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        const roles = await this.svc.listRoles(circleId);
        return { roles, count: roles.length };
    }
    async createRole(req, circleId, body) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        const role = await this.svc.createRole(circleId, req.user.userId, body);
        return { role };
    }
    async getRole(req, circleId, roleId) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        const role = await this.svc.getRole(circleId, roleId);
        return { role };
    }
    async updateRole(req, circleId, roleId, body) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        const role = await this.svc.updateRole(circleId, roleId, req.user.userId, body);
        return { role };
    }
    async revokeRole(req, circleId, roleId) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        await this.svc.revokeRole(circleId, roleId, req.user.userId);
        return { ok: true };
    }
    async suspendRole(req, circleId, roleId) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        const role = await this.svc.suspendRole(circleId, roleId, req.user.userId);
        return { role };
    }
    async unsuspendRole(req, circleId, roleId) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        const role = await this.svc.unsuspendRole(circleId, roleId, req.user.userId);
        return { role };
    }
    async verifyPin(req, circleId, body) {
        await this.circles.mustBeMember(req.user.userId, circleId);
        const valid = await this.svc.verifyPin(circleId, body.userId, body.pin);
        return { valid };
    }
    async syncRoles(circleId, device, sinceVersionStr) {
        if (device.circleId !== circleId) {
            return { ok: false, error: 'Device not authorized for this circle' };
        }
        const sinceVersion = parseInt(sinceVersionStr ?? '0', 10) || 0;
        const result = await this.svc.getRolesForSync(circleId, sinceVersion);
        return {
            ok: true,
            ...result,
        };
    }
};
exports.RolesController = RolesController;
__decorate([
    (0, common_1.Get)('/api/circles/:circleId/roles'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "listRoles", null);
__decorate([
    (0, common_1.Post)('/api/circles/:circleId/roles'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "createRole", null);
__decorate([
    (0, common_1.Get)('/api/circles/:circleId/roles/:roleId'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Param)('roleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "getRole", null);
__decorate([
    (0, common_1.Put)('/api/circles/:circleId/roles/:roleId'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Param)('roleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "updateRole", null);
__decorate([
    (0, common_1.Delete)('/api/circles/:circleId/roles/:roleId'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Param)('roleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "revokeRole", null);
__decorate([
    (0, common_1.Post)('/api/circles/:circleId/roles/:roleId/suspend'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Param)('roleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "suspendRole", null);
__decorate([
    (0, common_1.Post)('/api/circles/:circleId/roles/:roleId/unsuspend'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Param)('roleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "unsuspendRole", null);
__decorate([
    (0, common_1.Post)('/api/circles/:circleId/roles/verify-pin'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "verifyPin", null);
__decorate([
    (0, common_1.Get)('/api/circles/:circleId/edge/roles/sync'),
    (0, common_1.UseGuards)(device_key_auth_guard_1.DeviceKeyAuthGuard),
    __param(0, (0, common_1.Param)('circleId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __param(1, (0, ng_device_decorator_1.NgDevice)()),
    __param(2, (0, common_1.Query)('sinceVersion')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ng_edge_device_entity_1.NgEdgeDevice, String]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "syncRoles", null);
exports.RolesController = RolesController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [roles_service_1.RolesService,
        circles_service_1.CirclesService])
], RolesController);
//# sourceMappingURL=roles.controller.js.map